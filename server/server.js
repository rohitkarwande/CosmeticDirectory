import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { geocodeLocation } from './providers/geocoding.js';
import { fetchSalonsFromOverpass } from './providers/overpass.js';
import { fetchSalonsFromTomTom } from './providers/tomtom.js';
import { fetchFromGooglePlaces } from './providers/googlePlaces.js';
import { fetchFromNominatimSearch } from './providers/nominatimSearch.js';
import { normalizeSalon, normalizeTomTomSalon, isCosmeticsRelated } from './utils/normalizer.js';
import { deduplicateSalons } from './utils/deduplicator.js';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env and root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
const allowedOrigins = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: allowedOrigins,
}));

app.use(express.json());

// 1-hour memory cache for geocoding and search results to respect Overpass/Nominatim rate limits
class MemoryCache {
  constructor(ttlMs = 3600000) { // 1 hour TTL
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > this.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

const searchCache = new MemoryCache();

// Helper to calculate Haversine distance in meters
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Regex for extracting Indian mobile numbers
const PHONE_REGEX = /(?:\+91|0)?[-\s]?[6-9]\d{9}\b/g;

/**
 * Attempts to scrape an active business homepage for telephone listings.
 */
async function scrapeWebsitePhone(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 3500, // 3.5 seconds maximum timeout to keep API fast
    });

    const html = response.data;
    if (typeof html !== 'string') return null;

    // Clean html by stripping scripts, styles, comments, and markup
    const text = html
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<!--([\s\S]*?)-->/g, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ');

    const matches = text.match(PHONE_REGEX) || [];
    
    for (const match of matches) {
      const digits = match.replace(/\D/g, '');
      let cleanDigits = digits;
      
      if (digits.length === 11 && digits.startsWith('0')) {
        cleanDigits = digits.substring(1);
      } else if (digits.length === 12 && digits.startsWith('91')) {
        cleanDigits = digits.substring(2);
      }

      if (cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits)) {
        return `+91${cleanDigits}`;
      }
    }
  } catch (error) {
    // Fail silently to avoid breaking the core query response
    console.warn(`[Scraper] Phone scrape failed for ${url}:`, error.message);
  }
  return null;
}

// Global Rate Limiter: max 60 requests per minute
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use(globalLimiter);

// Specific Search Rate Limiter: max 20 searches per minute
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Search rate limit exceeded. Please wait a moment.' }
});

/**
 * GET /api/search
 * Queries cosmetics wholesalers, distributors, and suppliers for a given location or area in India.
 */
app.get('/api/search', searchLimiter, async (req, res) => {
  const { location, refresh } = req.query;

  if (!location || typeof location !== 'string' || !location.trim()) {
    return res.status(400).json({ error: 'Location query parameter is required.' });
  }

  const cleanLocation = location.trim().toLowerCase();
  const bypassCache = refresh === 'true';

  // Check cache unless bypass is requested
  if (!bypassCache) {
    const cachedEntry = searchCache.get(cleanLocation);
    if (cachedEntry) {
      return res.json({
        ...cachedEntry.data,
        cached: true,
        retrievedAt: cachedEntry.timestamp
      });
    }
  }

  try {
    // Stage 1: Geocoding
    const geocodeResult = await geocodeLocation(location);

    // Stage 2: Querying Providers (Google Places, TomTom, Overpass, and Nominatim POI search in parallel)
    const tomtomKey = process.env.TOMTOM_API_KEY;
    const googleKey = (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API)?.trim();

    const googlePromise = googleKey
      ? fetchFromGooglePlaces(
          location,
          geocodeResult.lat,
          geocodeResult.lon,
          geocodeResult.radiusMeters
        ).catch(err => {
          console.error('[Search] Google Places fetch failed:', err.message);
          return [];
        })
      : Promise.resolve([]);
    
    const osmPromise = fetchSalonsFromOverpass(
      geocodeResult.lat,
      geocodeResult.lon,
      geocodeResult.radiusMeters
    )
      .then(elements => elements.map(el => normalizeSalon(el)).filter(Boolean))
      .catch(err => {
        console.error('[Search] OpenStreetMap fetch failed:', err.message);
        return []; // Fallback to empty array
      });

    const nominatimSearchPromise = fetchFromNominatimSearch(
      location,
      geocodeResult.lat,
      geocodeResult.lon,
      geocodeResult.radiusMeters
    ).catch(err => {
      console.error('[Search] Nominatim search failed:', err.message);
      return [];
    });

    const tomtomPromise = tomtomKey
      ? fetchSalonsFromTomTom(
          geocodeResult.lat,
          geocodeResult.lon,
          geocodeResult.radiusMeters
        )
          .then(results => results.map(res => normalizeTomTomSalon(res)).filter(Boolean))
          .catch(err => {
            console.error('[Search] TomTom fetch failed:', err.message);
            return []; // Fallback to empty array
          })
      : Promise.resolve([]);

    // Wait for all queries to complete
    const [googleNormalized, osmNormalized, nominatimNormalized, tomtomNormalized] = await Promise.all([
      googlePromise,
      osmPromise,
      nominatimSearchPromise,
      tomtomPromise
    ]);
    
    // Combine results (Google Places first for highest quality priority)
    const combinedNormalized = [...googleNormalized, ...osmNormalized, ...nominatimNormalized, ...tomtomNormalized];

    // If all failed or found nothing, throw an error
    if (combinedNormalized.length === 0) {
      throw new Error(`No cosmetics distributors, stores, or beauty suppliers found for "${location}". Try broadening your search area.`);
    }

    // Stage 3: Deduplication
    const deduplicated = deduplicateSalons(combinedNormalized);

    // Stage 4: Location Validation
    // Filter results within target radius (expanded to 30km for city searches & Google Places text queries)
    const baseBufferRadius = geocodeResult.isCity ? Math.max(geocodeResult.radiusMeters * 1.5, 30000) : geocodeResult.radiusMeters * 1.25;
    
    const validated = deduplicated.filter(salon => {
      const distance = getHaversineDistance(
        geocodeResult.lat,
        geocodeResult.lon,
        salon.latitude,
        salon.longitude
      );
      
      // Google Places results already query Google's text engine for the location; allow up to 35km for metro areas
      const allowedRadius = salon.source.includes('Google Places') ? Math.max(baseBufferRadius, 35000) : baseBufferRadius;
      return distance <= allowedRadius;
    });

    // Stage 5: Website Phone Scraping (Run in parallel for entries with website but no phone)
    const scrapePromises = validated.map(async (salon) => {
      if (!salon.phone && salon.website) {
        const scrapedPhone = await scrapeWebsitePhone(salon.website);
        if (scrapedPhone) {
          console.log(`[Scraper] Found phone ${scrapedPhone} for ${salon.name} on site ${salon.website}`);
          salon.phone = scrapedPhone;
        }
      }
    });
    await Promise.all(scrapePromises);

    // Stage 6: Retain valid cosmetics listings with a name and valid location details
    const finalResults = validated.filter(salon => {
      const isCosmetic = isCosmeticsRelated(salon.rawTags || {}, salon.name);
      if (!isCosmetic) return false;

      const hasName = salon.name && salon.name.trim().length > 0;
      const hasPhone = !!salon.phone;
      const hasAddress = salon.address && salon.address !== 'Address not available' && salon.address.trim().length > 0;
      const hasArea = salon.area && salon.area !== 'Area not specified' && salon.area.trim().length > 0;
      
      return hasName && (hasPhone || hasAddress || hasArea);
    });

    // Compute active sources represented in results
    const uniqueSources = new Set(
      finalResults.flatMap(s => s.source.split(', ').map(src => src.trim()))
    );
    const sourceString =
      uniqueSources.size > 0
        ? Array.from(uniqueSources).sort().join(', ')
        : googleKey
        ? 'Google Places, OpenStreetMap, TomTom'
        : tomtomKey
        ? 'OpenStreetMap, TomTom'
        : 'OpenStreetMap';

    const responsePayload = {
      query: geocodeResult.query,
      count: finalResults.length,
      source: sourceString,
      cached: false,
      retrievedAt: Date.now(),
      searchArea: geocodeResult.displayName,
      searchRadiusKm: geocodeResult.radiusKm,
      results: finalResults,
    };

    // Store in cache
    searchCache.set(cleanLocation, responsePayload);

    return res.json(responsePayload);
  } catch (error) {
    console.error('Search route error:', error);
    
    // Provide user-friendly, safe error messages
    const message = error.message || 'An unexpected error occurred while searching.';
    
    // Check for common error signatures
    if (message.includes('Location not found')) {
      return res.status(404).json({ error: message });
    }
    
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/geocode
 * Simply geocodes a location. Useful for autocomplete checks.
 */
app.get('/api/geocode', async (req, res) => {
  const { location } = req.query;
  if (!location) {
    return res.status(400).json({ error: 'Location query parameter is required.' });
  }

  try {
    const result = await geocodeLocation(location);
    return res.json(result);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
});

// Serve built frontend static assets if available (Production single-server deployment)
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server if run directly / non-Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`SalonFinder server running on port ${PORT}`);
  });
}

export default app;
