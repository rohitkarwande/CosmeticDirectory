import axios from 'axios';

// Verified public Overpass API interpreter endpoints
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter'
];

/**
 * Queries OpenStreetMap Overpass API for cosmetics wholesalers, distributors, beauty collections, and suppliers.
 * Iterates through available endpoints for high availability.
 */
export async function fetchSalonsFromOverpass(lat, lon, radiusMeters) {
  if (isNaN(lat) || isNaN(lon) || isNaN(radiusMeters)) {
    throw new Error('Invalid query parameters for Overpass API');
  }

  // Fast indexed Overpass QL query targeting cosmetics trade, stores, beauty collections, & distributors
  const query = `[out:json][timeout:20];
(
  node["shop"="cosmetics"](around:${radiusMeters},${lat},${lon});
  way["shop"="cosmetics"](around:${radiusMeters},${lat},${lon});
  
  node["shop"="beauty_supplier"](around:${radiusMeters},${lat},${lon});
  way["shop"="beauty_supplier"](around:${radiusMeters},${lat},${lon});

  node["shop"="perfumery"](around:${radiusMeters},${lat},${lon});
  way["shop"="perfumery"](around:${radiusMeters},${lat},${lon});

  node["trade"="cosmetics"](around:${radiusMeters},${lat},${lon});
  way["trade"="cosmetics"](around:${radiusMeters},${lat},${lon});

  node["office"="distributor"](around:${radiusMeters},${lat},${lon});
  way["office"="distributor"](around:${radiusMeters},${lat},${lon});

  node["office"="wholesale"](around:${radiusMeters},${lat},${lon});
  way["office"="wholesale"](around:${radiusMeters},${lat},${lon});

  node["shop"="chemist"](around:${radiusMeters},${lat},${lon});
  way["shop"="chemist"](around:${radiusMeters},${lat},${lon});

  node["shop"="general"](around:${radiusMeters},${lat},${lon})["name"~"cosmetic|beauty|collection",i];
  way["shop"="general"](around:${radiusMeters},${lat},${lon})["name"~"cosmetic|beauty|collection",i];

  node["shop"="variety_store"](around:${radiusMeters},${lat},${lon})["name"~"cosmetic|beauty|collection",i];
  way["shop"="variety_store"](around:${radiusMeters},${lat},${lon})["name"~"cosmetic|beauty|collection",i];
);
out center;`;

  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    console.log(`[Overpass] Trying endpoint: ${endpoint}`);
    try {
      const response = await axios.post(
        endpoint,
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://github.com/example/salonfinder'
          },
          timeout: 12000, // 12 seconds timeout per server
        }
      );

      if (response.data && Array.isArray(response.data.elements)) {
        console.log(`[Overpass] Success with endpoint ${endpoint}. Found ${response.data.elements.length} elements.`);
        return response.data.elements;
      }
    } catch (error) {
      console.warn(`[Overpass] Endpoint failed: ${endpoint}. Error: ${error.message}`);
      lastError = error;
    }
  }

  // If all endpoints failed
  if (lastError && lastError.response) {
    if (lastError.response.status === 429) {
      throw new Error('Live data source is currently busy. Please wait a moment and try again.');
    }
    throw new Error(`Live data source returned error: ${lastError.response.status} - ${lastError.response.statusText}`);
  }
  
  throw new Error('Live data source (Overpass API) is temporarily unavailable. Please try again.');
}
