import axios from 'axios';
import { normalizePhoneNumber, isCosmeticsRelated, isConsumerSalon } from '../utils/normalizer.js';

/**
 * Queries Google Places API (New) for cosmetics wholesalers, distributors, beauty collections, and suppliers.
 * Strictly formatted to cost $0.005/request (essential fields only).
 * Uses FieldMask to request details efficiently in exactly 1 API call per search (no pagination loops).
 */
export async function fetchFromGooglePlaces(locationName, lat, lon, radiusMeters) {
  const apiKey = (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API)?.trim();
  if (!apiKey) {
    console.log('[Google Places] Skipped: API Key not set in environment.');
    return [];
  }

  console.log(`[Google Places] Querying for "${locationName}" (multi-intent trade, retail & direct queries)...`);

  // Google Places API (New) SearchText Endpoint
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const q1 = `cosmetics wholesaler distributor salon products in ${locationName}`;
  const q2 = `cosmetics store beauty collection in ${locationName}`;
  const q3 = `cosmetics in ${locationName}`;
  const q4 = locationName;
  const searchRadius = Math.min(Math.max(radiusMeters * 3, 25000), 40000);

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

    const [res1, res2, res3, res4] = await Promise.all([
      axios.post(url, postPayload(q1), { headers, timeout: 8000 }).catch(() => null),
      axios.post(url, postPayload(q2), { headers, timeout: 8000 }).catch(() => null),
      axios.post(url, postPayload(q3), { headers, timeout: 8000 }).catch(() => null),
      axios.post(url, postPayload(q4), { headers, timeout: 8000 }).catch(() => null),
    ]);

    const places1 = res1?.data?.places || [];
    const places2 = res2?.data?.places || [];
    const places3 = res3?.data?.places || [];
    const places4 = res4?.data?.places || [];
    const combinedNew = [...places1, ...places2, ...places3, ...places4];

    if (combinedNew.length > 0) {
      const seenIds = new Set();
      const uniquePlaces = [];
      for (const p of combinedNew) {
        if (p.id && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          uniquePlaces.push(p);
        }
      }
      console.log(`[Google Places] Success (New API)! Retrieved ${uniquePlaces.length} unique listings for ${locationName}.`);
      return uniquePlaces.map(p => normalizeGooglePlace(p)).filter(Boolean);
    }
  } catch (error) {
    console.warn(`[Google Places New API] Notice (${error.response?.status || 'network'}):`, error.response?.data?.error?.message || error.message);
  }

  // Fallback: Try Google Places Legacy Text Search API in case Legacy Places API is enabled on the key
  try {
    const legacyUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

    const [res1, res2, res3, res4] = await Promise.all([
      axios.get(legacyUrl, { params: { query: q1, location: `${lat},${lon}`, radius: searchRadius, key: apiKey }, timeout: 8000 }).catch(() => null),
      axios.get(legacyUrl, { params: { query: q2, location: `${lat},${lon}`, radius: searchRadius, key: apiKey }, timeout: 8000 }).catch(() => null),
      axios.get(legacyUrl, { params: { query: q3, location: `${lat},${lon}`, radius: searchRadius, key: apiKey }, timeout: 8000 }).catch(() => null),
      axios.get(legacyUrl, { params: { query: q4, location: `${lat},${lon}`, radius: searchRadius, key: apiKey }, timeout: 8000 }).catch(() => null),
    ]);

    const results1 = res1?.data?.results || [];
    const results2 = res2?.data?.results || [];
    const results3 = res3?.data?.results || [];
    const results4 = res4?.data?.results || [];
    const combinedLegacy = [...results1, ...results2, ...results3, ...results4];

    if (combinedLegacy.length > 0) {
      const seenIds = new Set();
      const uniqueLegacy = [];
      for (const p of combinedLegacy) {
        if (p.place_id && !seenIds.has(p.place_id)) {
          seenIds.add(p.place_id);
          uniqueLegacy.push(p);
        }
      }
      console.log(`[Google Places] Success (Legacy API)! Retrieved ${uniqueLegacy.length} unique listings for ${locationName}.`);
      return uniqueLegacy.map(p => normalizeGooglePlaceLegacy(p)).filter(Boolean);
    }
  } catch (error) {
    console.warn('[Google Places Legacy API] Error:', error.message);
  }

  return [];
}

/**
 * Normalizes a Google Place Legacy object into our standard schema.
 */
function normalizeGooglePlaceLegacy(place) {
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
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${place.place_id}`;

  return {
    id: `google-${place.place_id}`,
    name,
    phone: null,
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
