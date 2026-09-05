import axios from 'axios';

// Verified public Overpass API interpreter endpoints
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter'
];

/**
 * Queries OpenStreetMap Overpass API for cosmetics wholesalers, distributors, beauty collections, and suppliers.
 * Iterates through available endpoints for high availability.
 */
export async function fetchSalonsFromOverpass(lat, lon, radiusMeters) {
  if (isNaN(lat) || isNaN(lon) || isNaN(radiusMeters)) {
    throw new Error('Invalid query parameters for Overpass API');
  }

  // Cap radius to max 25,000m to keep Overpass queries fast and avoid gateway 504 timeouts
  const effectiveRadius = Math.min(Math.round(radiusMeters), 25000);

  // Fast indexed Overpass QL query targeting cosmetics trade, stores, beauty collections, & distributors
  const query = `[out:json][timeout:10];
(
  node["shop"="cosmetics"](around:${effectiveRadius},${lat},${lon});
  way["shop"="cosmetics"](around:${effectiveRadius},${lat},${lon});
  
  node["shop"="beauty_supplier"](around:${effectiveRadius},${lat},${lon});
  way["shop"="beauty_supplier"](around:${effectiveRadius},${lat},${lon});

  node["shop"="perfumery"](around:${effectiveRadius},${lat},${lon});
  way["shop"="perfumery"](around:${effectiveRadius},${lat},${lon});

  node["trade"="cosmetics"](around:${effectiveRadius},${lat},${lon});
  way["trade"="cosmetics"](around:${effectiveRadius},${lat},${lon});

  node["office"="distributor"](around:${effectiveRadius},${lat},${lon});
  way["office"="distributor"](around:${effectiveRadius},${lat},${lon});

  node["office"="wholesale"](around:${effectiveRadius},${lat},${lon});
  way["office"="wholesale"](around:${effectiveRadius},${lat},${lon});

  node["shop"="chemist"](around:${effectiveRadius},${lat},${lon});
  way["shop"="chemist"](around:${effectiveRadius},${lat},${lon});

  node["shop"="general"](around:${effectiveRadius},${lat},${lon})["name"~"cosmetic|beauty|collection|fancy|novelty",i];
  way["shop"="general"](around:${effectiveRadius},${lat},${lon})["name"~"cosmetic|beauty|collection|fancy|novelty",i];

  node["shop"="variety_store"](around:${effectiveRadius},${lat},${lon})["name"~"cosmetic|beauty|collection|fancy|novelty",i];
  way["shop"="variety_store"](around:${effectiveRadius},${lat},${lon})["name"~"cosmetic|beauty|collection|fancy|novelty",i];
);
out center;`;

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
          timeout: 3000, // 3 seconds timeout per server
        }
      );

      if (response.data && Array.isArray(response.data.elements)) {
        console.log(`[Overpass] Success with endpoint ${endpoint}. Found ${response.data.elements.length} elements.`);
        return response.data.elements;
      }
    } catch (error) {
      console.warn(`[Overpass] Endpoint failed: ${endpoint}. Error: ${error.message}`);
    }
  }

  // Gracefully return empty array if all Overpass servers timed out
  console.warn('[Overpass] All endpoints failed or timed out. Falling back to primary providers.');
  return [];
}
