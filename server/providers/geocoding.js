import axios from 'axios';

/**
 * Calculates the Haversine distance in meters between two points.
 */
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

/**
 * Geocodes a location query using Nominatim OSM API.
 * Restricts searches to India.
 */
export async function geocodeLocation(query) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Invalid query string');
  }

  const cleanQuery = query.trim();

  try {
    // Call Nominatim API.
    // countrycodes=in limits the geocoding strictly to India.
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: cleanQuery,
        format: 'json',
        countrycodes: 'in',
        addressdetails: 1,
        limit: 5,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://github.com/example/salonfinder'
      },
      timeout: 10000, // 10s timeout
    });

    if (!response.data || response.data.length === 0) {
      throw new Error(`Location not found for: "${cleanQuery}"`);
    }

    // Smart result selection: prefer city/town/subdistrict matches over broad district boundaries
    let result = response.data[0];
    
    if (response.data.length > 1) {
      const cityMatch = response.data.find(item => {
        const addr = item.address || {};
        const type = (item.type || '').toLowerCase();
        const display = (item.display_name || '').toLowerCase();
        
        // Prefer explicit city, town, municipality, or subdistrict matches
        return type === 'city' || type === 'town' || type === 'suburb' || 
               addr.city || addr.town || addr.municipality || 
               display.includes('subdistrict') || display.includes('city');
      });
      
      if (cityMatch) {
        result = cityMatch;
      }
    }

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error('Invalid coordinates returned from geocoder');
    }

    let searchRadiusMeters = 6000; // default 6km to cover local area and nearby market hubs
    let isCity = false;

    // Determine type and calculate bounding box radius if available
    if (result.boundingbox && result.boundingbox.length === 4) {
      const south = parseFloat(result.boundingbox[0]);
      const north = parseFloat(result.boundingbox[1]);
      const west = parseFloat(result.boundingbox[2]);
      const east = parseFloat(result.boundingbox[3]);

      if (!isNaN(south) && !isNaN(north) && !isNaN(west) && !isNaN(east)) {
        // Distance from center to north-east corner
        const cornerDist = getHaversineDistance(lat, lon, north, east);
        
        // Ensure radius between 4km and 15km to reliably capture nearby wholesale distributors
        searchRadiusMeters = Math.max(4000, Math.min(15000, Math.round(cornerDist)));
      }
    }

    // Check if it looks like a city/administrative boundary
    if (
      result.class === 'boundary' ||
      result.type === 'city' ||
      result.type === 'administrative' ||
      result.type === 'town'
    ) {
      isCity = true;
    }

    return {
      query: cleanQuery,
      displayName: result.display_name,
      lat,
      lon,
      radiusMeters: searchRadiusMeters,
      radiusKm: Math.round((searchRadiusMeters / 1000) * 10) / 10,
      isCity,
      address: result.address,
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`Geocoding API error: ${error.response.status} - ${error.response.statusText}`);
    }
    throw error;
  }
}
