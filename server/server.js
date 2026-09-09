import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import { geocodeLocation, CITY_ALIASES } from './providers/geocoding.js';
import { fetchSalonsFromOverpass } from './providers/overpass.js';
import { fetchSalonsFromTomTom } from './providers/tomtom.js';
import { fetchFromGooglePlaces, googleUsageTracker } from './providers/googlePlaces.js';
import { fetchFromNominatimSearch } from './providers/nominatimSearch.js';
import { normalizeSalon, normalizeTomTomSalon, isCosmeticsRelated, normalizePhoneNumber } from './utils/normalizer.js';
import { deduplicateSalons } from './utils/deduplicator.js';
import { scrapePhoneFromWeb } from './utils/phoneScraper.js';

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
 * Core query function for searching a location string.
 */
export async function performSearchForLocation(targetLocation) {
  // Stage 1: Geocoding
  const geocodeResult = await geocodeLocation(targetLocation);

  // Stage 2: Querying Providers (Google Places, TomTom, Overpass, and Nominatim POI search in parallel)
  const tomtomKey = process.env.TOMTOM_API_KEY || 'd8KweCMWSUcLrpfSktQc9JMEFwcchbrp';
  const googleKey = (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API || 'AIzaSyDE-fjHSPSTjNayTukn0ENebcK_4ID9DNA')?.trim();

  const googlePromise = googleKey
    ? fetchFromGooglePlaces(
        targetLocation,
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
    targetLocation,
    geocodeResult.lat,
    geocodeResult.lon,
    geocodeResult.radiusMeters,
    geocodeResult.isState
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
  
  // Include saved client partners
  const savedClients = getClientsFromFile();
  const savedNormalized = savedClients.map(c => ({
    id: `saved-${c.id}`,
    name: c.shopName || c.clientName,
    phone: normalizePhoneNumber(c.phone) || c.phone || null,
    address: `${c.cityArea || ''}, ${c.district || ''}, ${c.state || ''}`.replace(/^, /, ''),
    area: c.cityArea || c.district || 'Area not specified',
    city: c.cityArea || '',
    district: c.district || '',
    state: c.state || '',
    pincode: '',
    category: 'Cosmetics Store & Dealer',
    latitude: Number(c.latitude),
    longitude: Number(c.longitude),
    source: 'Verified Partner',
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.shopName || c.clientName)}`,
    website: null,
    rawTags: c
  })).filter(s => !isNaN(s.latitude) && !isNaN(s.longitude));

  // Combine results
  const combinedNormalized = [...googleNormalized, ...osmNormalized, ...nominatimNormalized, ...tomtomNormalized, ...savedNormalized];

  if (combinedNormalized.length === 0) {
    return { geocodeResult, finalResults: [] };
  }

  // Stage 3: Deduplication
  const deduplicated = deduplicateSalons(combinedNormalized);

  // Stage 4: Location Validation & Proximity Calculation
  // Tight radius for city/town search (20km max) so neighboring towns (e.g. Pandharpur vs Tembhurni) are strictly isolated
  const maxRadiusForCity = geocodeResult.isState
    ? 250000
    : Math.min(Math.max(geocodeResult.radiusMeters * 1.5, 12000), 20000);
  
  const validated = deduplicated.filter(salon => {
    const distance = getHaversineDistance(
      geocodeResult.lat,
      geocodeResult.lon,
      salon.latitude,
      salon.longitude
    );
    salon.distanceMeters = Math.round(distance);
    salon.distanceKm = Math.round((distance / 1000) * 10) / 10;

    // For State searches, do not restrict by single centroid Haversine distance
    if (geocodeResult.isState) {
      return true;
    }
      
    return distance <= maxRadiusForCity;
  });

  // Stage 5: Website Phone Scraping
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

  // Sort final results ascending by distance from searched location (closest local shops first)
  finalResults.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));

  return { geocodeResult, finalResults };
}

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
    let { geocodeResult, finalResults } = await performSearchForLocation(location);

    // Automatic Disambiguation Fallback: if 0 results found, check CITY_ALIASES for alternative city spellings
    if (finalResults.length === 0 && CITY_ALIASES[cleanLocation]) {
      console.log(`[Search Fallback] 0 results for "${cleanLocation}". Trying city aliases:`, CITY_ALIASES[cleanLocation]);
      for (const alias of CITY_ALIASES[cleanLocation]) {
        try {
          const aliasSearchResult = await performSearchForLocation(alias);
          if (aliasSearchResult.finalResults.length > 0) {
            console.log(`[Search Fallback] Found ${aliasSearchResult.finalResults.length} results using alias "${alias}"!`);
            geocodeResult = aliasSearchResult.geocodeResult;
            finalResults = aliasSearchResult.finalResults;
            break;
          }
        } catch (err) {
          console.warn(`[Search Fallback] Alias "${alias}" search error:`, err.message);
        }
      }
    }

    if (finalResults.length === 0) {
      throw new Error(`No cosmetics distributors, stores, or beauty suppliers found for "${location}". Try broadening your search area.`);
    }

    const tomtomKey = process.env.TOMTOM_API_KEY;
    const googleKey = (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API)?.trim();

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
      query: location.trim(),
      count: finalResults.length,
      source: sourceString,
      cached: false,
      retrievedAt: Date.now(),
      searchArea: geocodeResult.displayName,
      searchRadiusKm: geocodeResult.radiusKm,
      results: finalResults,
    };

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

/**
 * GET /api/enrich-phone
 * Searches free web snippets for a missing business phone number (bypasses Google Places API to avoid cost).
 */
app.get('/api/enrich-phone', async (req, res) => {
  const { name, area } = req.query;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Business name parameter is required.' });
  }

  try {
    const phone = await scrapePhoneFromWeb(name.trim(), (area || '').trim());
    if (phone) {
      return res.json({ phone, source: 'free_web_search', success: true });
    }
    return res.status(404).json({ error: 'Phone number not found in free web snippets.', success: false });
  } catch (error) {
    return res.status(500).json({ error: error.message, success: false });
  }
});

/**
 * GET /api/google-usage
 * Returns current Google Places API daily usage stats and circuit-breaker status.
 */
app.get('/api/google-usage', (req, res) => {
  const stats = googleUsageTracker.getUsageStats();
  if (stats.status === 'UNAVAILABLE') {
    return res.status(503).json(stats);
  }
  return res.json(stats);
});

// --- CLIENT DATA PERSISTENCE & API ---
const clientsFilePath = path.resolve(__dirname, 'data/clients.json');

const ensureClientsFile = () => {
  const dir = path.dirname(clientsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(clientsFilePath)) {
    fs.writeFileSync(clientsFilePath, JSON.stringify([]), 'utf8');
  }
};

const getClientsFromFile = () => {
  ensureClientsFile();
  try {
    const data = fs.readFileSync(clientsFilePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading clients file:', err);
    return [];
  }
};

const saveClientsToFile = (clients) => {
  ensureClientsFile();
  fs.writeFileSync(clientsFilePath, JSON.stringify(clients, null, 2), 'utf8');
};

/**
 * GET /api/clients - Retrieve all saved clients
 */
app.get('/api/clients', (req, res) => {
  try {
    const clients = getClientsFromFile();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read clients data.' });
  }
});

/**
 * POST /api/clients - Add a new client
 */
app.post('/api/clients', (req, res) => {
  try {
    const { clientName, shopName, phone, state, district, cityArea, latitude, longitude } = req.body;
    
    if (!clientName || !shopName || !district) {
      return res.status(400).json({ error: 'Client Name, Shop Name, and District are required.' });
    }

    const clients = getClientsFromFile();
    const newClient = {
      id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      clientName: clientName.trim(),
      shopName: shopName.trim(),
      phone: phone ? phone.trim() : '',
      state: state || 'Maharashtra',
      district: district.trim(),
      cityArea: cityArea ? cityArea.trim() : '',
      latitude: latitude ? Number(latitude) : 19.7515,
      longitude: longitude ? Number(longitude) : 75.7139,
      createdAt: new Date().toISOString()
    };

    clients.unshift(newClient);
    saveClientsToFile(clients);
    res.status(201).json(newClient);
  } catch (err) {
    console.error('Error saving client:', err);
    res.status(500).json({ error: 'Failed to save client data.' });
  }
});

/**
 * PUT /api/clients/:id - Update an existing client
 */
app.put('/api/clients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const clients = getClientsFromFile();
    const index = clients.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    clients[index] = {
      ...clients[index],
      ...req.body,
      id // preserve original id
    };

    saveClientsToFile(clients);
    res.json(clients[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update client.' });
  }
});

/**
 * DELETE /api/clients/:id - Delete a client
 */
app.delete('/api/clients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const clients = getClientsFromFile();
    const filtered = clients.filter(c => c.id !== id);

    if (filtered.length === clients.length) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    saveClientsToFile(filtered);
    res.json({ success: true, message: 'Client deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete client.' });
  }
});

/**
 * GET /api/geocode-place
 * Resolves a place/city/area in a state (default: Maharashtra) to get the district name & lat/lng coordinates.
 */
app.get('/api/geocode-place', async (req, res) => {
  const { place, state = 'Maharashtra' } = req.query;
  if (!place || !place.trim()) {
    return res.status(400).json({ error: 'Place parameter is required.' });
  }

  const queryPlace = place.trim();

  // Known Place-to-District mapping for instantaneous response
  const LOCAL_PLACE_MAP = {
    // Goa Places
    'mapusa': { district: 'North Goa', state: 'Goa', lat: 15.5909, lng: 73.8102 },
    'mapuca': { district: 'North Goa', state: 'Goa', lat: 15.5909, lng: 73.8102 },
    'panaji': { district: 'North Goa', state: 'Goa', lat: 15.4909, lng: 73.8278 },
    'panjim': { district: 'North Goa', state: 'Goa', lat: 15.4909, lng: 73.8278 },
    'margao': { district: 'South Goa', state: 'Goa', lat: 15.2832, lng: 73.9862 },
    'madgaon': { district: 'South Goa', state: 'Goa', lat: 15.2832, lng: 73.9862 },
    'vasco': { district: 'South Goa', state: 'Goa', lat: 15.3959, lng: 73.8122 },
    'vasco da gama': { district: 'South Goa', state: 'Goa', lat: 15.3959, lng: 73.8122 },

    // Jalgaon District
    'chalisgaon': { district: 'Jalgaon', state: 'Maharashtra', lat: 20.4626, lng: 75.0069 },
    'bhusawal': { district: 'Jalgaon', state: 'Maharashtra', lat: 21.0455, lng: 75.7878 },
    'bhusaval': { district: 'Jalgaon', state: 'Maharashtra', lat: 21.0455, lng: 75.7878 },
    'pachora': { district: 'Jalgaon', state: 'Maharashtra', lat: 20.6622, lng: 75.3524 },
    'chopda': { district: 'Jalgaon', state: 'Maharashtra', lat: 21.2464, lng: 75.2974 },
    'amalner': { district: 'Jalgaon', state: 'Maharashtra', lat: 21.0469, lng: 75.0617 },
    'jamner': { district: 'Jalgaon', state: 'Maharashtra', lat: 20.8062, lng: 75.7844 },
    'yawal': { district: 'Jalgaon', state: 'Maharashtra', lat: 21.1685, lng: 75.6961 },
    'erandol': { district: 'Jalgaon', state: 'Maharashtra', lat: 20.9167, lng: 75.3333 },
    'parola': { district: 'Jalgaon', state: 'Maharashtra', lat: 20.8845, lng: 75.1189 },
    'raver': { district: 'Jalgaon', state: 'Maharashtra', lat: 21.2415, lng: 75.9818 },
    'jalgaon': { district: 'Jalgaon', state: 'Maharashtra', lat: 21.0077, lng: 75.5626 },

    // Pune District
    'kothrud': { district: 'Pune', state: 'Maharashtra', lat: 18.5074, lng: 73.8077 },
    'hinjawadi': { district: 'Pune', state: 'Maharashtra', lat: 18.5912, lng: 73.7389 },
    'baner': { district: 'Pune', state: 'Maharashtra', lat: 18.5590, lng: 73.7868 },
    'wakad': { district: 'Pune', state: 'Maharashtra', lat: 18.5987, lng: 73.7661 },
    'hadapsar': { district: 'Pune', state: 'Maharashtra', lat: 18.5089, lng: 73.9260 },
    'viman nagar': { district: 'Pune', state: 'Maharashtra', lat: 18.5679, lng: 73.9143 },
    'pune': { district: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
    'pimpri': { district: 'Pune', state: 'Maharashtra', lat: 18.6298, lng: 73.7997 },
    'chinchwad': { district: 'Pune', state: 'Maharashtra', lat: 18.6272, lng: 73.8009 },
    'baramati': { district: 'Pune', state: 'Maharashtra', lat: 18.1517, lng: 74.5772 },
    
    // Mumbai Suburban & City
    'andheri': { district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.1197, lng: 72.8464 },
    'bandra': { district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.0596, lng: 72.8295 },
    'borivali': { district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.2307, lng: 72.8567 },
    'juhu': { district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.1075, lng: 72.8263 },
    'malad': { district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.1874, lng: 72.8484 },
    'powai': { district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.1176, lng: 72.9060 },
    'kurla': { district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.0726, lng: 72.8845 },
    'ghatkopar': { district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.0860, lng: 72.9081 },
    'dadar': { district: 'Mumbai City', state: 'Maharashtra', lat: 19.0178, lng: 72.8478 },
    'colaba': { district: 'Mumbai City', state: 'Maharashtra', lat: 18.9067, lng: 72.8147 },
    'marine lines': { district: 'Mumbai City', state: 'Maharashtra', lat: 18.9447, lng: 72.8242 },
    'mumbai': { district: 'Mumbai City', state: 'Maharashtra', lat: 18.9388, lng: 72.8353 },

    // Thane & Palghar & Raigad
    'thane': { district: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781 },
    'kalyan': { district: 'Thane', state: 'Maharashtra', lat: 19.2403, lng: 73.1305 },
    'dombivli': { district: 'Thane', state: 'Maharashtra', lat: 19.2184, lng: 73.0867 },
    'navi mumbai': { district: 'Thane', state: 'Maharashtra', lat: 19.0330, lng: 73.0297 },
    'vashi': { district: 'Thane', state: 'Maharashtra', lat: 19.0771, lng: 72.9986 },
    'bhiwandi': { district: 'Thane', state: 'Maharashtra', lat: 19.2813, lng: 73.0483 },
    'panvel': { district: 'Raigad', state: 'Maharashtra', lat: 18.9894, lng: 73.1175 },
    'palghar': { district: 'Palghar', state: 'Maharashtra', lat: 19.6967, lng: 72.7699 },
    'vasai': { district: 'Palghar', state: 'Maharashtra', lat: 19.3649, lng: 72.8194 },
    'virar': { district: 'Palghar', state: 'Maharashtra', lat: 19.4559, lng: 72.8106 },

    // Nashik
    'nashik': { district: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898 },
    'panchavati': { district: 'Nashik', state: 'Maharashtra', lat: 20.0076, lng: 73.7947 },
    'malegaon': { district: 'Nashik', state: 'Maharashtra', lat: 20.5579, lng: 74.5283 },

    // Chhatrapati Sambhajinagar / Aurangabad
    'chhatrapati sambhajinagar': { district: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', lat: 19.8762, lng: 75.3433 },
    'aurangabad': { district: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', lat: 19.8762, lng: 75.3433 },

    // Ahilyanagar / Ahmednagar
    'ahmednagar': { district: 'Ahilyanagar', state: 'Maharashtra', lat: 19.0948, lng: 74.7480 },
    'ahilyanagar': { district: 'Ahilyanagar', state: 'Maharashtra', lat: 19.0948, lng: 74.7480 },
    'shrirampur': { district: 'Ahilyanagar', state: 'Maharashtra', lat: 19.6190, lng: 74.6560 },
    'sangamner': { district: 'Ahilyanagar', state: 'Maharashtra', lat: 19.5761, lng: 74.2070 },
    'shirdi': { district: 'Ahilyanagar', state: 'Maharashtra', lat: 19.7667, lng: 74.4766 },

    // Nagpur
    'nagpur': { district: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
    'dharampeth': { district: 'Nagpur', state: 'Maharashtra', lat: 21.1415, lng: 79.0620 },
    'sadar': { district: 'Nagpur', state: 'Maharashtra', lat: 21.1610, lng: 79.0819 },

    // Satara, Kolhapur, Solapur, Sangli
    'satara': { district: 'Satara', state: 'Maharashtra', lat: 17.6805, lng: 74.0183 },
    'karad': { district: 'Satara', state: 'Maharashtra', lat: 17.2889, lng: 74.1834 },
    'wai': { district: 'Satara', state: 'Maharashtra', lat: 17.9472, lng: 73.8967 },
    'phaltan': { district: 'Satara', state: 'Maharashtra', lat: 17.9867, lng: 74.4267 },
    'kolhapur': { district: 'Kolhapur', state: 'Maharashtra', lat: 16.7050, lng: 74.2433 },
    'ichalkaranji': { district: 'Kolhapur', state: 'Maharashtra', lat: 16.6970, lng: 74.4608 },
    'solapur': { district: 'Solapur', state: 'Maharashtra', lat: 17.6599, lng: 75.9064 },
    'pandharpur': { district: 'Solapur', state: 'Maharashtra', lat: 17.6778, lng: 75.3278 },
    'sangli': { district: 'Sangli', state: 'Maharashtra', lat: 16.8524, lng: 74.5815 },
    'ratnagiri': { district: 'Ratnagiri', state: 'Maharashtra', lat: 16.9902, lng: 73.3120 },
    'latur': { district: 'Latur', state: 'Maharashtra', lat: 18.4088, lng: 76.5604 },
    'nanded': { district: 'Nanded', state: 'Maharashtra', lat: 19.1383, lng: 77.3210 },
    'amravati': { district: 'Amravati', state: 'Maharashtra', lat: 20.9374, lng: 77.7796 },
    'akola': { district: 'Akola', state: 'Maharashtra', lat: 20.7002, lng: 77.0082 },
    'chandrapur': { district: 'Chandrapur', state: 'Maharashtra', lat: 19.9615, lng: 79.2961 }
  };

  const normalized = queryPlace.toLowerCase();
  if (LOCAL_PLACE_MAP[normalized]) {
    return res.json({
      query: queryPlace,
      district: LOCAL_PLACE_MAP[normalized].district,
      state: LOCAL_PLACE_MAP[normalized].state,
      latitude: LOCAL_PLACE_MAP[normalized].lat,
      longitude: LOCAL_PLACE_MAP[normalized].lng,
      source: 'local_lookup'
    });
  }

  // Check substring match in local map
  for (const [key, info] of Object.entries(LOCAL_PLACE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return res.json({
        query: queryPlace,
        district: info.district,
        state: info.state,
        latitude: info.lat,
        longitude: info.lng,
        source: 'local_lookup'
      });
    }
  }

  // Fall back to two-stage Nominatim API geocoding (First try with state filter, then general India search)
  try {
    const fetchNominatim = async (queryStr) => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&addressdetails=1&limit=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SalonFinder/1.0 (client-portal@salonfinder.com)'
        }
      });
      if (!response.ok) return null;
      return await response.json();
    };

    let data = await fetchNominatim(`${queryPlace}, ${state}, India`);
    
    // If state-specific query returns 0 results, retry with general India search
    if (!data || data.length === 0) {
      data = await fetchNominatim(`${queryPlace}, India`);
    }

    if (data && data.length > 0) {
      const item = data[0];
      const addr = item.address || {};
      
      const detectedState = addr.state || state;
      const detectedDistrict = addr.state_district || addr.county || addr.district || addr.city_district || addr.city || addr.town || addr.village || detectedState;
      // Clean up common suffix
      let cleanDistrict = detectedDistrict.replace(/ District/i, '').replace(/ Division/i, '').trim();
      
      return res.json({
        query: queryPlace,
        district: cleanDistrict,
        state: detectedState,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        displayName: item.display_name,
        source: 'nominatim'
      });
    }

    return res.status(404).json({ error: `Could not determine district for place "${queryPlace}". Please select district manually.` });
  } catch (err) {
    return res.status(500).json({ error: `Error geocoding place: ${err.message}` });
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
if (!process.env.VERCEL && process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].includes('server'))) {
  app.listen(PORT, () => {
    console.log(`SalonFinder server running on port ${PORT}`);
  });
}

export default app;
