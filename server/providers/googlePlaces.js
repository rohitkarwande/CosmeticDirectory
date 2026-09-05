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

  console.log(`[Google Places] Querying for "${locationName}" (1 single API request)...`);

  // Google Places API (New) SearchText Endpoint
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const searchQuery = `cosmetics in ${locationName}`;

  try {
    const response = await axios.post(
      url,
      {
        textQuery: searchQuery,
        locationBias: {
          circle: {
            center: {
              latitude: lat,
              longitude: lon,
            },
            radius: Math.min(Math.max(radiusMeters * 3, 25000), 40000),
          },
        },
        maxResultCount: 20, // Strict maximum of 20 results in 1 single HTTP call
        languageCode: 'en',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          // FieldMask restricted ONLY to Essential basic fields (lowest price tier)
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.location,places.primaryTypeDisplayName,places.types',
        },
        timeout: 8000,
      }
    );

    if (response.data && Array.isArray(response.data.places)) {
      console.log(`[Google Places] Success (New API)! Retrieved ${response.data.places.length} listings for ${locationName}.`);
      return response.data.places
        .map((place) => normalizeGooglePlace(place))
        .filter(Boolean);
    }
  } catch (error) {
    console.warn(`[Google Places New API] Notice (${error.response?.status || 'network'}):`, error.response?.data?.error?.message || error.message);
  }

  // Fallback: Try Google Places Legacy Text Search API in case Legacy Places API is enabled on the key
  try {
    const legacyUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
    const response = await axios.get(legacyUrl, {
      params: {
        query: searchQuery,
        location: `${lat},${lon}`,
        radius: Math.min(Math.max(radiusMeters * 3, 25000), 40000),
        key: apiKey,
      },
      timeout: 8000,
    });

    if (response.data && Array.isArray(response.data.results)) {
      console.log(`[Google Places] Success (Legacy API)! Retrieved ${response.data.results.length} listings for ${locationName}.`);
      return response.data.results
        .map((place) => normalizeGooglePlaceLegacy(place))
        .filter(Boolean);
    } else if (response.data && response.data.error_message) {
      console.warn('[Google Places Legacy API] Warning:', response.data.error_message);
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
