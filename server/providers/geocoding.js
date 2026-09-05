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

const INDIAN_STATE_CENTROIDS = {
  'karnataka': { lat: 15.3173, lon: 75.7139, displayName: 'Karnataka, India' },
  'maharashtra': { lat: 19.7515, lon: 75.7139, displayName: 'Maharashtra, India' },
  'gujarat': { lat: 22.2587, lon: 71.1924, displayName: 'Gujarat, India' },
  'delhi': { lat: 28.7041, lon: 77.1025, displayName: 'Delhi, India' },
  'rajasthan': { lat: 27.0238, lon: 74.2179, displayName: 'Rajasthan, India' },
  'tamil nadu': { lat: 11.1271, lon: 78.6569, displayName: 'Tamil Nadu, India' },
  'kerala': { lat: 10.8505, lon: 76.2711, displayName: 'Kerala, India' },
  'uttar pradesh': { lat: 26.8467, lon: 80.9462, displayName: 'Uttar Pradesh, India' },
  'madhya pradesh': { lat: 22.9734, lon: 78.6569, displayName: 'Madhya Pradesh, India' },
  'west bengal': { lat: 22.9868, lon: 87.8550, displayName: 'West Bengal, India' },
  'bihar': { lat: 25.0961, lon: 85.3131, displayName: 'Bihar, India' },
  'andhra pradesh': { lat: 15.9129, lon: 79.7400, displayName: 'Andhra Pradesh, India' },
  'telangana': { lat: 18.1124, lon: 79.0193, displayName: 'Telangana, India' },
  'punjab': { lat: 31.1471, lon: 75.3412, displayName: 'Punjab, India' },
  'haryana': { lat: 29.0588, lon: 76.0856, displayName: 'Haryana, India' },
  'odisha': { lat: 20.9517, lon: 85.0985, displayName: 'Odisha, India' },
  'orissa': { lat: 20.9517, lon: 85.0985, displayName: 'Odisha, India' },
  'jharkhand': { lat: 23.6102, lon: 85.2799, displayName: 'Jharkhand, India' },
  'assam': { lat: 26.2006, lon: 92.9376, displayName: 'Assam, India' },
  'goa': { lat: 15.2993, lon: 74.1240, displayName: 'Goa, India' },
  'chhattisgarh': { lat: 21.2787, lon: 81.8661, displayName: 'Chhattisgarh, India' },
  'uttarakhand': { lat: 30.0668, lon: 79.0193, displayName: 'Uttarakhand, India' },
  'himachal pradesh': { lat: 31.1048, lon: 77.1734, displayName: 'Himachal Pradesh, India' },
  'jammu and kashmir': { lat: 33.7782, lon: 76.5762, displayName: 'Jammu and Kashmir, India' },
  'puducherry': { lat: 11.9416, lon: 79.8083, displayName: 'Puducherry, India' },
  'pondicherry': { lat: 11.9416, lon: 79.8083, displayName: 'Puducherry, India' }
};

const INDIAN_CITY_CENTROIDS = {
  'vijaypura': { lat: 16.8302, lon: 75.7100, displayName: 'Vijayapura, Karnataka, India' },
  'vijayapur': { lat: 16.8302, lon: 75.7100, displayName: 'Vijayapura, Karnataka, India' },
  'vijaypur': { lat: 16.8302, lon: 75.7100, displayName: 'Vijayapura, Karnataka, India' },
  'bijapur': { lat: 16.8302, lon: 75.7100, displayName: 'Vijayapura, Karnataka, India' },
  'vijaypur karnataka': { lat: 16.8302, lon: 75.7100, displayName: 'Vijayapura, Karnataka, India' },
  'vijayapura karnataka': { lat: 16.8302, lon: 75.7100, displayName: 'Vijayapura, Karnataka, India' },
  'vijayapur karnataka': { lat: 16.8302, lon: 75.7100, displayName: 'Vijayapura, Karnataka, India' },
  'bijapur karnataka': { lat: 16.8302, lon: 75.7100, displayName: 'Vijayapura, Karnataka, India' },
  'vijaypur mp': { lat: 26.0564, lon: 77.3662, displayName: 'Vijaypur, Sheopur, Madhya Pradesh, India' },
  'vijaypur madhya pradesh': { lat: 26.0564, lon: 77.3662, displayName: 'Vijaypur, Sheopur, Madhya Pradesh, India' },
  'vijaypura mp': { lat: 26.0564, lon: 77.3662, displayName: 'Vijaypur, Sheopur, Madhya Pradesh, India' },
  'vijaypura madhya pradesh': { lat: 26.0564, lon: 77.3662, displayName: 'Vijaypur, Sheopur, Madhya Pradesh, India' },
  'chalisgaon': { lat: 20.4626, lon: 75.0069, displayName: 'Chalisgaon, Jalgaon, Maharashtra, India' },
  'chalisgaon maharashtra': { lat: 20.4626, lon: 75.0069, displayName: 'Chalisgaon, Jalgaon, Maharashtra, India' },
  'chalishgaon': { lat: 20.4626, lon: 75.0069, displayName: 'Chalisgaon, Jalgaon, Maharashtra, India' },
  'chalishgaon maharashtra': { lat: 20.4626, lon: 75.0069, displayName: 'Chalisgaon, Jalgaon, Maharashtra, India' },
  'bhusawal': { lat: 21.0455, lon: 75.7894, displayName: 'Bhusawal, Jalgaon, Maharashtra, India' },
  'bhusawal maharashtra': { lat: 21.0455, lon: 75.7894, displayName: 'Bhusawal, Jalgaon, Maharashtra, India' },
  'bengaluru': { lat: 12.9716, lon: 77.5946, displayName: 'Bengaluru, Karnataka, India' },
  'bangalore': { lat: 12.9716, lon: 77.5946, displayName: 'Bengaluru, Karnataka, India' },
  'mumbai': { lat: 19.0760, lon: 72.8777, displayName: 'Mumbai, Maharashtra, India' },
  'pune': { lat: 18.5204, lon: 73.8567, displayName: 'Pune, Maharashtra, India' },
  'thane': { lat: 19.2183, lon: 72.9781, displayName: 'Thane, Maharashtra, India' },
  'virar': { lat: 19.4498, lon: 72.8121, displayName: 'Virar, Palghar, Maharashtra, India' },
  'surat': { lat: 21.1702, lon: 72.8311, displayName: 'Surat, Gujarat, India' },
  'ahmedabad': { lat: 23.0225, lon: 72.5714, displayName: 'Ahmedabad, Gujarat, India' },
  'hyderabad': { lat: 17.3850, lon: 78.4867, displayName: 'Hyderabad, Telangana, India' },
  'chennai': { lat: 13.0827, lon: 80.2707, displayName: 'Chennai, Tamil Nadu, India' },
  'kolkata': { lat: 22.5726, lon: 88.3639, displayName: 'Kolkata, West Bengal, India' },
  'jaipur': { lat: 26.9124, lon: 75.7873, displayName: 'Jaipur, Rajasthan, India' },
  'lucknow': { lat: 26.8467, lon: 80.9462, displayName: 'Lucknow, Uttar Pradesh, India' }
};

/**
 * Fallback geocoder when Nominatim returns 429 or is offline.
 * Tries TomTom Geocoding, Photon OSM, and static centroids.
 */
async function geocodeLocationFallback(cleanQuery) {
  const googleKey = (process.env.GOOGLE_PLACES_API || process.env.GOOGLE_PLACES_API_KEY)?.trim();
  const tomtomKey = process.env.TOMTOM_API_KEY;

  // 1. Try Google Maps Geocoding API if key is set
  if (googleKey) {
    try {
      console.log(`[Geocoding Fallback] Querying Google Geocoder for "${cleanQuery}"...`);
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: `${cleanQuery}, India`, key: googleKey },
        timeout: 4000
      });

      if (response.data && response.data.status === 'OK' && response.data.results?.length > 0) {
        const item = response.data.results[0];
        const loc = item.geometry?.location;
        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          console.log(`[Geocoding Fallback] Google Geocoding success for "${cleanQuery}": (${loc.lat}, ${loc.lng})`);
          return {
            query: cleanQuery,
            displayName: item.formatted_address || `${cleanQuery}, India`,
            lat: loc.lat,
            lon: loc.lng,
            radiusMeters: 12000,
            radiusKm: 12,
            isCity: true,
            isState: false,
            address: { city: cleanQuery, country: 'India', country_code: 'in' },
          };
        }
      }
    } catch (err) {
      console.warn(`[Geocoding Fallback] Google Geocoding API failed: ${err.message}`);
    }
  }

  // 2. Try TomTom Geocoding API if key is set
  if (tomtomKey) {
    try {
      console.log(`[Geocoding Fallback] Querying TomTom Geocoder for "${cleanQuery}"...`);
      const response = await axios.get(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(cleanQuery)}.json`, {
        params: { key: tomtomKey, countrySet: 'IN', limit: 1 },
        timeout: 4000
      });

      if (response.data && Array.isArray(response.data.results) && response.data.results.length > 0) {
        const item = response.data.results[0];
        const pos = item.position;
        if (pos && typeof pos.lat === 'number' && typeof pos.lon === 'number') {
          console.log(`[Geocoding Fallback] TomTom success for "${cleanQuery}": (${pos.lat}, ${pos.lon})`);
          return {
            query: cleanQuery,
            displayName: item.address?.freeformAddress || `${cleanQuery}, India`,
            lat: pos.lat,
            lon: pos.lon,
            radiusMeters: 12000,
            radiusKm: 12,
            isCity: true,
            isState: false,
            address: { city: cleanQuery, country: 'India', country_code: 'in' },
          };
        }
      }
    } catch (err) {
      console.warn(`[Geocoding Fallback] TomTom geocoding failed: ${err.message}`);
    }
  }

  // 3. Try Photon OSM API
  try {
    console.log(`[Geocoding Fallback] Querying Photon OSM Geocoder for "${cleanQuery}"...`);
    const response = await axios.get('https://photon.komoot.io/api/', {
      params: { q: cleanQuery, countrycode: 'IN', limit: 1 },
      timeout: 4000
    });

    if (response.data && Array.isArray(response.data.features) && response.data.features.length > 0) {
      const feat = response.data.features[0];
      const coords = feat.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        const lon = coords[0];
        const lat = coords[1];
        const props = feat.properties || {};
        console.log(`[Geocoding Fallback] Photon success for "${cleanQuery}": (${lat}, ${lon})`);
        return {
          query: cleanQuery,
          displayName: [props.name, props.city || props.town, props.state, 'India'].filter(Boolean).join(', '),
          lat,
          lon,
          radiusMeters: 12000,
          radiusKm: 12,
          isCity: true,
          isState: false,
          address: { city: props.city || props.town || cleanQuery, state: props.state || '', country: 'India', country_code: 'in' },
        };
      }
    }
  } catch (err) {
    console.warn(`[Geocoding Fallback] Photon geocoding failed: ${err.message}`);
  }

  // 4. Static centroid fallback if available
  const queryLower = cleanQuery.toLowerCase();
  if (INDIAN_CITY_CENTROIDS[queryLower]) {
    const c = INDIAN_CITY_CENTROIDS[queryLower];
    console.warn(`[Geocoding Fallback] Using static city centroid for "${cleanQuery}".`);
    return {
      query: cleanQuery,
      displayName: c.displayName,
      lat: c.lat,
      lon: c.lon,
      radiusMeters: 15000,
      radiusKm: 15,
      isCity: true,
      isState: false,
      address: { city: cleanQuery, country: 'India', country_code: 'in' },
    };
  }

  throw new Error(`Location not found for: "${cleanQuery}". Please enter a valid location in India.`);
}

/**
 * Geocodes a location query using primary Nominatim OSM API with seamless TomTom/Photon failover.
 */
export async function geocodeLocation(query) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Invalid query string');
  }

  const cleanQuery = query.trim();
  const queryLower = cleanQuery.toLowerCase();

  // Instant static resolution for Indian State queries
  if (INDIAN_STATE_CENTROIDS[queryLower]) {
    const s = INDIAN_STATE_CENTROIDS[queryLower];
    return {
      query: cleanQuery,
      displayName: s.displayName,
      lat: s.lat,
      lon: s.lon,
      radiusMeters: 100000,
      radiusKm: 100,
      isCity: true,
      isState: true,
      address: { state: cleanQuery, country: 'India', country_code: 'in' },
    };
  }

  // Instant static resolution for pre-indexed city queries
  if (INDIAN_CITY_CENTROIDS[queryLower]) {
    const c = INDIAN_CITY_CENTROIDS[queryLower];
    return {
      query: cleanQuery,
      displayName: c.displayName,
      lat: c.lat,
      lon: c.lon,
      radiusMeters: 15000,
      radiusKm: 15,
      isCity: true,
      isState: false,
      address: { city: cleanQuery, country: 'India', country_code: 'in' },
    };
  }

  // Primary: Google Maps Geocoding API if key is available (best accuracy for misspellings & state-qualified queries)
  const googleKey = (process.env.GOOGLE_PLACES_API || process.env.GOOGLE_PLACES_API_KEY)?.trim();
  if (googleKey) {
    try {
      console.log(`[Geocoding Primary] Querying Google Geocoder for "${cleanQuery}"...`);
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: `${cleanQuery}, India`, key: googleKey },
        timeout: 4000
      });

      if (response.data && response.data.status === 'OK' && response.data.results?.length > 0) {
        const item = response.data.results[0];
        const loc = item.geometry?.location;
        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          console.log(`[Geocoding Primary] Google Geocoding success for "${cleanQuery}": (${loc.lat}, ${loc.lng})`);
          return {
            query: cleanQuery,
            displayName: item.formatted_address || `${cleanQuery}, India`,
            lat: loc.lat,
            lon: loc.lng,
            radiusMeters: 12000,
            radiusKm: 12,
            isCity: true,
            isState: false,
            address: { city: cleanQuery, country: 'India', country_code: 'in' },
          };
        }
      }
    } catch (err) {
      console.warn(`[Geocoding Primary] Google Geocoding failed: ${err.message}`);
    }
  }

  try {
    let response;
    let attempts = 0;
    while (attempts < 2) {
      try {
        response = await axios.get('https://nominatim.openstreetmap.org/search', {
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
          timeout: 4000,
        });
        break;
      } catch (err) {
        attempts++;
        if (err.response && err.response.status === 429 && attempts < 2) {
          console.warn(`[Geocoding] Nominatim rate limited (429). Fast failover engaged.`);
          break; // Switch immediately to TomTom/Photon failover
        } else {
          throw err;
        }
      }
    }

    if (!response || !response.data || response.data.length === 0) {
      return await geocodeLocationFallback(cleanQuery);
    }

    let result = response.data[0];
    if (response.data.length > 1) {
      const cityMatch = response.data.find(item => {
        const addr = item.address || {};
        const type = (item.type || '').toLowerCase();
        const display = (item.display_name || '').toLowerCase();
        return type === 'city' || type === 'town' || type === 'suburb' || 
               addr.city || addr.town || addr.municipality || 
               display.includes('subdistrict') || display.includes('city');
      });
      if (cityMatch) result = cityMatch;
    }

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return await geocodeLocationFallback(cleanQuery);
    }

    let searchRadiusMeters = 6000;
    let isCity = false;
    let isState = false;

    const typeLower = (result.type || '').toLowerCase();
    const addresstypeLower = (result.addresstype || '').toLowerCase();

    if (typeLower === 'state' || addresstypeLower === 'state') {
      isState = true;
      isCity = true;
      searchRadiusMeters = 100000;
    }

    if (!isState && result.boundingbox && result.boundingbox.length === 4) {
      const south = parseFloat(result.boundingbox[0]);
      const north = parseFloat(result.boundingbox[1]);
      const west = parseFloat(result.boundingbox[2]);
      const east = parseFloat(result.boundingbox[3]);

      if (!isNaN(south) && !isNaN(north) && !isNaN(west) && !isNaN(east)) {
        const cornerDist = getHaversineDistance(lat, lon, north, east);
        searchRadiusMeters = Math.max(4000, Math.min(15000, Math.round(cornerDist)));
      }
    }

    if (
      isState ||
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
      isState,
      address: result.address,
    };
  } catch (error) {
    console.warn(`[Geocoding] Nominatim failed (${error.message}). Invoking fallback geocoder...`);
    return await geocodeLocationFallback(cleanQuery);
  }
}

/**
 * City alias map for alternative spellings and common Indian regional city names
 */
export const CITY_ALIASES = {
  'vijaypur': ['Vijayapura', 'Bijapur', 'Vijaypur Karnataka', 'Vijayapura Karnataka'],
  'vijaypura': ['Vijaypur', 'Bijapur', 'Vijayapura Karnataka'],
  'bijapur': ['Vijayapura', 'Vijaypur', 'Bijapur Karnataka'],
  'bangalore': ['Bengaluru'],
  'bengaluru': ['Bangalore'],
  'gurgaon': ['Gurugram'],
  'gurugram': ['Gurgaon'],
  'baroda': ['Vadodara'],
  'vadodara': ['Baroda'],
  'belgaum': ['Belagavi'],
  'belagavi': ['Belgaum'],
  'gulbarga': ['Kalaburagi'],
  'kalaburagi': ['Gulbarga'],
  'mangalore': ['Mangaluru'],
  'mangaluru': ['Mangalore'],
  'hubli': ['Hubballi'],
  'hubballi': ['Hubli'],
  'bellary': ['Ballari'],
  'ballari': ['Bellary'],
  'shimoga': ['Shivamogga'],
  'shivamogga': ['Shimoga'],
  'calicut': ['Kozhikode'],
  'kozhikode': ['Calicut'],
  'trichy': ['Tiruchirappalli'],
  'tiruchirappalli': ['Trichy'],
  'trivandrum': ['Thiruvananthapuram'],
  'thiruvananthapuram': ['Trivandrum'],
  'pondicherry': ['Puducherry'],
  'puducherry': ['Pondicherry']
};
