import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizePhoneNumber, isCosmeticsRelated, isConsumerSalon } from '../utils/normalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usageFilePath = path.resolve(__dirname, '../data/google_usage.json');
const lockFilePath = path.resolve(__dirname, '../data/google_usage.lock');
const tmpFilePath = path.resolve(__dirname, '../data/google_usage.json.tmp');

/**
 * Returns current date string formatted in Indian Standard Time (IST - YYYY-MM-DD).
 * Ensures daily reset happens exactly at midnight IST (12:00 AM IST) rather than 5:30 AM IST (UTC).
 */
function getISTDateString() {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat('en-CA', options).format(new Date());
}

/**
 * Multi-SKU Persistent Usage Tracker & Strict Fail-Closed Circuit Breaker.
 * 1. Strict SKU key validation (rejects unregistered SKU keys).
 * 2. Ownership-safe lock files with PID & unique token verification + stale lock eviction.
 * 3. Fail-closed loadState verification (halts calls if disk state cannot be verified).
 * 4. Fail-closed saveState handling (returns false and blocks API calls if disk write fails).
 */
class MultiSkuUsageTracker {
  constructor() {
    this.limits = {
      sku_enterprise: 180,       // Places API (New) Enterprise SKU (Max 90 searches/day @ 2 calls/search)
      sku_text_search: 900,      // Places Legacy Text Search SKU
      sku_contact_details: 180,  // Places Legacy Place Details (Contact) SKU
    };
    this.inMemoryState = null;
  }

  /**
   * Acquires lock with unique process token and ownership-safe stale lock eviction (5000ms).
   * Returns unique ownership token string on success, or null on timeout/failure.
   */
  acquireLock() {
    const start = Date.now();
    const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;

    // Ownership-safe stale lock cleanup
    if (fs.existsSync(lockFilePath)) {
      try {
        const lockContent = fs.readFileSync(lockFilePath, 'utf8').trim();
        const parts = lockContent.split(':');
        const lockPid = parseInt(parts[0], 10);
        const lockTime = parseInt(parts[1], 10);

        const isStaleTime = Date.now() - lockTime > 5000;
        let isDeadProcess = false;

        if (lockPid && !isNaN(lockPid)) {
          try {
            process.kill(lockPid, 0); // Check if process is still running
          } catch (e) {
            isDeadProcess = true; // Process does not exist
          }
        }

        if (isStaleTime || isDeadProcess) {
          // Re-verify lock content before deleting to ensure ownership-safe eviction
          const currentContent = fs.readFileSync(lockFilePath, 'utf8').trim();
          if (currentContent === lockContent) {
            console.warn(`[Lock System] Ownership-safe eviction of stale lockfile (PID: ${lockPid}, Stale: ${isStaleTime}, Dead: ${isDeadProcess}).`);
            fs.unlinkSync(lockFilePath);
          }
        }
      } catch (e) {
        // Ignore concurrently removed or modified lock
      }
    }

    while (Date.now() - start < 2000) {
      try {
        const fd = fs.openSync(lockFilePath, 'wx');
        fs.writeSync(fd, token);
        fs.closeSync(fd);
        return token; // Returns unique ownership token on success
      } catch (e) {
        // Lock currently held by another process, wait 10ms
        const wait = Date.now() + 10;
        while (Date.now() < wait) {}
      }
    }

    console.error('[Lock System] Lock acquisition timed out after 2000ms.');
    return null; // Fail closed
  }

  /**
   * Releases lock only if the held lock content matches the provided ownership token.
   */
  releaseLock(token) {
    if (!token) return;
    try {
      if (fs.existsSync(lockFilePath)) {
        const lockContent = fs.readFileSync(lockFilePath, 'utf8').trim();
        if (lockContent === token) { // Verify ownership before deleting
          fs.unlinkSync(lockFilePath);
        }
      }
    } catch (e) {}
  }

  /**
   * Reads and verifies state from disk.
   * Enforces fail-closed validation: if usage file exists but content is unreadable,
   * corrupted, missing required fields, or unverifiable, returns null.
   */
  loadState() {
    const today = getISTDateString();
    const defaultState = {
      day: today,
      skus: {
        sku_enterprise: 0,
        sku_text_search: 0,
        sku_contact_details: 0,
      },
    };

    try {
      if (fs.existsSync(usageFilePath)) {
        const raw = fs.readFileSync(usageFilePath, 'utf8');
        if (!raw || !raw.trim()) {
          console.error('[Usage Tracker] Usage file exists but is empty. Cannot verify state.');
          return null;
        }

        const parsed = JSON.parse(raw);
        // Fail-closed validation of schema
        if (!parsed || typeof parsed !== 'object' || typeof parsed.day !== 'string' || !parsed.skus || typeof parsed.skus !== 'object') {
          console.error('[Usage Tracker] Usage file schema is corrupted or malformed. Cannot verify state.');
          return null;
        }

        if (parsed.day === today) {
          // Ensure all known SKUs are initialized in state
          for (const key of Object.keys(this.limits)) {
            if (typeof parsed.skus[key] !== 'number' || isNaN(parsed.skus[key])) {
              parsed.skus[key] = 0;
            }
          }
          this.inMemoryState = parsed;
          return parsed;
        }

        // New day rollover: file was read & verified as valid state from a previous date
        this.inMemoryState = defaultState;
        return defaultState;
      }
    } catch (err) {
      console.error('[Usage Tracker] Read/JSON error on usage file:', err.message);
      // If file exists but is unreadable/corrupt, fail-closed by returning null
      return null;
    }

    // File does not exist yet (first initialization)
    this.inMemoryState = defaultState;
    return defaultState;
  }

  /**
   * Atomic file save using temporary file + fs.renameSync to prevent corruption.
   * Updates inMemoryState ONLY after successful atomic disk write.
   * Returns boolean (true on successful save, false on failure).
   */
  saveState(state) {
    try {
      const dir = path.dirname(usageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const dataStr = JSON.stringify(state, null, 2);
      fs.writeFileSync(tmpFilePath, dataStr, 'utf8');
      fs.renameSync(tmpFilePath, usageFilePath); // Atomic swap
      this.inMemoryState = state; // Update memory state only after atomic rename succeeds
      return true;
    } catch (err) {
      console.error('[Usage Tracker] Critical error saving usage file:', err.message);
      return false;
    }
  }

  /**
   * Atomically checks & reserves calls for a specific SKU before executing HTTP request.
   * Enforces strict fail-closed guarantees:
   * 1. Rejects unknown/unregistered SKU keys (no default limit fallback).
   * 2. Halts if lock acquisition fails.
   * 3. Halts if loadState fails to verify disk usage (returns null).
   * 4. Halts if saveState fails to persist updated usage count to disk.
   */
  tryReserveSkuCalls(skuKey, callsCount = 1) {
    // Reject unknown SKU keys strictly (fail closed, no default limit)
    if (typeof skuKey !== 'string' || !Object.prototype.hasOwnProperty.call(this.limits, skuKey)) {
      console.error(`[Google SKU Circuit Breaker] Unknown or unregistered SKU key "${skuKey}". Halting API call (fail-closed).`);
      return false;
    }

    if (!Number.isInteger(callsCount) || callsCount <= 0) {
      console.error(`[Google SKU Circuit Breaker] Invalid calls count ${callsCount} for SKU "${skuKey}". Halting API call (fail-closed).`);
      return false;
    }

    const maxLimit = this.limits[skuKey];

    // Acquire lock with ownership token check
    const lockToken = this.acquireLock();
    if (!lockToken) {
      console.warn(`[Google SKU Circuit Breaker] Could not acquire lock for ${skuKey}. Halting API call (fail-closed).`);
      return false;
    }

    try {
      // Load & verify state (Fail-closed if state unverifiable)
      const state = this.loadState();
      if (!state) {
        console.error(`[Google SKU Circuit Breaker] Could not verify persisted usage state for ${skuKey}. Halting API call (fail-closed).`);
        return false;
      }

      const currentCount = state.skus[skuKey] || 0;
      if (currentCount + callsCount > maxLimit) {
        console.warn(`[Google SKU Circuit Breaker] Daily cap for ${skuKey} (${maxLimit} calls/day) reached (${currentCount}/${maxLimit}). Halting API call.`);
        return false;
      }

      state.skus[skuKey] = currentCount + callsCount;
      state.lastUpdated = new Date().toISOString();

      // Verify saveState succeeded before returning true
      const savedSuccessfully = this.saveState(state);
      if (!savedSuccessfully) {
        console.error(`[Google SKU Circuit Breaker] Failed to save updated usage count to disk for ${skuKey}. Halting API call (fail-closed).`);
        return false;
      }

      console.log(`[Google SKU Tracker] Reserved ${callsCount} call(s) for ${skuKey}. Today's Total (IST): ${state.skus[skuKey]}/${maxLimit}.`);
      return true;
    } catch (err) {
      console.error(`[Google SKU Circuit Breaker] Unexpected error reserving SKU calls for ${skuKey}:`, err.message);
      return false;
    } finally {
      this.releaseLock(lockToken);
    }
  }

  getUsageStats() {
    const state = this.loadState();
    if (!state) {
      return {
        status: 'UNAVAILABLE',
        error: 'Persisted usage state cannot be reliably verified (disk/state failure). All Google API calls are halted.',
        day: getISTDateString(),
        skus: null,
        limits: this.limits,
      };
    }
    return {
      status: 'OK',
      error: null,
      day: state.day,
      skus: state.skus,
      limits: this.limits,
    };
  }
}

export const googleUsageTracker = new MultiSkuUsageTracker();

/**
 * Queries Google Places API for cosmetics wholesalers, distributors, beauty collections, and suppliers.
 * Uses Consolidated High-Yield Queries & Multi-SKU Circuit Breaker.
 */
export async function fetchFromGooglePlaces(locationName, lat, lon, radiusMeters) {
  const apiKey = (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API)?.trim();
  if (!apiKey) {
    console.log('[Google Places] Skipped: API Key not set in environment.');
    return [];
  }

  console.log(`[Google Places] Querying for "${locationName}" (Consolidated High-Yield Queries)...`);

  const q1 = `cosmetics wholesaler distributor beauty supplier in ${locationName}`;
  const q2 = `cosmetics store beauty collection shop in ${locationName}`;
  const searchRadius = Math.min(Math.max(radiusMeters * 3, 25000), 40000);

  // 1. Google Places API (New) SearchText Endpoint
  const url = 'https://places.googleapis.com/v1/places:searchText';

  // Reserve 2 requests for SKU: sku_enterprise (2 calls per search = max 90 searches/day)
  if (googleUsageTracker.tryReserveSkuCalls('sku_enterprise', 2)) {
    try {
      const postPayload = (queryStr) => ({
        textQuery: queryStr,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lon },
            radius: searchRadius,
          },
        },
        maxResultCount: 20,
        languageCode: 'en',
      });

      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.location,places.primaryTypeDisplayName,places.types',
      };

      const [res1, res2] = await Promise.all([
        axios.post(url, postPayload(q1), { headers, timeout: 8000 }).catch(() => null),
        axios.post(url, postPayload(q2), { headers, timeout: 8000 }).catch(() => null),
      ]);

      const places1 = res1?.data?.places || [];
      const places2 = res2?.data?.places || [];
      const combinedNew = [...places1, ...places2];

      if (combinedNew.length > 0) {
        const seenIds = new Set();
        const uniquePlaces = [];
        for (const p of combinedNew) {
          if (p.id && !seenIds.has(p.id)) {
            seenIds.add(p.id);
            uniquePlaces.push(p);
          }
        }
        console.log(`[Google Places New API] Success! Retrieved ${uniquePlaces.length} unique listings for ${locationName}.`);
        return uniquePlaces.map(p => normalizeGooglePlace(p)).filter(Boolean);
      }
    } catch (error) {
      console.warn(`[Google Places New API] Notice (${error.response?.status || 'network'}):`, error.response?.data?.error?.message || error.message);
    }
  }

  // 2. Fallback: Google Places Legacy Text Search API + Automatic Details Phone Enrichment
  try {
    const legacyUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
    const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json';

    // Reserve 2 requests for SKU: sku_text_search
    if (!googleUsageTracker.tryReserveSkuCalls('sku_text_search', 2)) {
      console.log('[Google Places] Daily limit for sku_text_search reached. Using OpenStreetMap & Nominatim fallback.');
      return [];
    }

    const [res1, res2] = await Promise.all([
      axios.get(legacyUrl, { params: { query: q1, location: `${lat},${lon}`, radius: searchRadius, key: apiKey }, timeout: 8000 }).catch(() => null),
      axios.get(legacyUrl, { params: { query: q2, location: `${lat},${lon}`, radius: searchRadius, key: apiKey }, timeout: 8000 }).catch(() => null),
    ]);

    const results1 = res1?.data?.results || [];
    const results2 = res2?.data?.results || [];
    const combinedLegacy = [...results1, ...results2];

    if (combinedLegacy.length > 0) {
      const seenIds = new Set();
      const uniqueLegacy = [];
      for (const p of combinedLegacy) {
        if (p.place_id && !seenIds.has(p.place_id)) {
          seenIds.add(p.place_id);
          uniqueLegacy.push(p);
        }
      }

      // Reserve calls for SKU: sku_contact_details
      const neededDetailsCount = Math.min(uniqueLegacy.length, 12);
      if (!googleUsageTracker.tryReserveSkuCalls('sku_contact_details', neededDetailsCount)) {
        console.warn('[Google Places Safeguard] Daily limit for sku_contact_details reached. Returning basic legacy listings.');
        return uniqueLegacy.map(p => normalizeGooglePlaceLegacy(p, null)).filter(Boolean);
      }

      console.log(`[Google Places Legacy API] Success! Retrieved ${uniqueLegacy.length} unique listings for ${locationName}. Fetching phone details...`);

      // Fetch Place Details in parallel to retrieve phone numbers automatically
      const enrichedLegacy = await Promise.all(
        uniqueLegacy.map(async (p) => {
          try {
            const detailRes = await axios.get(detailsUrl, {
              params: {
                place_id: p.place_id,
                fields: 'formatted_phone_number,international_phone_number',
                key: apiKey,
              },
              timeout: 4000,
            });
            const phone = detailRes.data.result?.formatted_phone_number || detailRes.data.result?.international_phone_number || null;
            return normalizeGooglePlaceLegacy(p, phone);
          } catch (e) {
            return normalizeGooglePlaceLegacy(p, null);
          }
        })
      );

      const normalized = enrichedLegacy.filter(Boolean);
      const withPhone = normalized.filter(s => s.phone).length;
      console.log(`[Google Places Enriched] ${withPhone} out of ${normalized.length} listings have phone numbers automatically populated!`);
      return normalized;
    }
  } catch (error) {
    console.warn('[Google Places Legacy API] Error:', error.message);
  }

  return [];
}

/**
 * Normalizes a Google Place Legacy object into our standard schema.
 */
function normalizeGooglePlaceLegacy(place, rawPhone) {
  if (!place || !place.name) return null;

  const name = place.name.trim();
  const lat = place.geometry?.location?.lat;
  const lon = place.geometry?.location?.lng;

  if (lat === undefined || lon === undefined) return null;

  // Filter out non-cosmetics or consumer salons
  if (isConsumerSalon(place, name) || !isCosmeticsRelated(place, name)) {
    return null;
  }

  const address = place.formatted_address || 'Address not available';
  const phone = rawPhone ? normalizePhoneNumber(rawPhone) : null;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${place.place_id}`;

  return {
    id: `google-${place.place_id}`,
    name,
    phone,
    address,
    area: extractAreaFromAddress(address),
    city: '',
    district: '',
    state: '',
    pincode: extractPincode(address),
    category: 'Cosmetics Store & Dealer',
    latitude: lat,
    longitude: lon,
    source: 'Google Places',
    mapUrl,
    website: null,
    rawTags: place,
  };
}

/**
 * Normalizes a Google Place (New) object into our standard schema.
 */
function normalizeGooglePlace(place) {
  if (!place || !place.displayName || !place.displayName.text) return null;

  const name = place.displayName.text.trim();
  const lat = place.location?.latitude;
  const lon = place.location?.longitude;

  if (lat === undefined || lon === undefined) return null;

  // Filter out non-cosmetics or consumer salons
  if (isConsumerSalon(place, name) || !isCosmeticsRelated(place, name)) {
    return null;
  }

  // Raw phone
  const rawPhone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
  const phone = normalizePhoneNumber(rawPhone);

  const address = place.formattedAddress || 'Address not available';

  // Category determination
  const types = (place.types || []).map(t => t.toLowerCase());
  const nameLower = name.toLowerCase();

  let category = 'Other Wholesale / Dealer';
  if (nameLower.includes('wholesale') || nameLower.includes('wholesaler') || types.includes('wholesale')) {
    category = 'Cosmetics Wholesaler';
  } else if (nameLower.includes('distributor') || nameLower.includes('agency') || nameLower.includes('stockist')) {
    category = 'Cosmetics Distributor';
  } else if (nameLower.includes('supplier') || nameLower.includes('supplies') || nameLower.includes('beauty supply')) {
    category = 'Beauty Product Supplier';
  } else if (nameLower.includes('cosmetic') || nameLower.includes('beauty shop') || types.includes('cosmetics_store')) {
    category = 'Cosmetics Store & Dealer';
  }

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${place.id}`;

  return {
    id: `google-${place.id}`,
    name,
    phone,
    address,
    area: extractAreaFromAddress(address),
    city: '',
    district: '',
    state: '',
    pincode: extractPincode(address),
    category,
    latitude: lat,
    longitude: lon,
    source: 'Google Places',
    mapUrl,
    website: place.websiteUri || null,
    rawTags: place,
  };
}

function extractAreaFromAddress(address) {
  if (!address) return 'Area not specified';
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    return parts[parts.length - 3] || parts[0];
  }
  return parts[0] || 'Area not specified';
}

function extractPincode(address) {
  if (!address) return '';
  const match = address.match(/\b\d{6}\b/);
  return match ? match[0] : '';
}
