import axios from 'axios';
import { normalizeSalon } from '../utils/normalizer.js';

/**
 * Searches Nominatim directly for specific cosmetics, beauty collection, distributor, and supplier queries.
 * Restricts searches strictly to India.
 */
export async function fetchFromNominatimSearch(locationName, lat, lon, radiusMeters) {
  if (!locationName || typeof locationName !== 'string') return [];

  const searchQueries = [
    `cosmetics shop in ${locationName}`,
    `beauty collection in ${locationName}`,
    `cosmetics distributor in ${locationName}`,
    `beauty product shop in ${locationName}`,
    `cosmetics wholesaler in ${locationName}`,
    `beauty supply in ${locationName}`
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://github.com/example/salonfinder'
  };

  try {
    const promises = searchQueries.map(async (queryStr) => {
      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: queryStr,
            format: 'json',
            countrycodes: 'in',
            addressdetails: 1,
            limit: 25,
          },
          headers,
          timeout: 7000,
        });

        if (Array.isArray(response.data)) {
          return response.data;
        }
      } catch (err) {
        console.warn(`[Nominatim Search] Sub-query failed for "${queryStr}": ${err.message}`);
      }
      return [];
    });

    const resultsArrays = await Promise.all(promises);
    const rawItems = resultsArrays.flat();

    // Convert Nominatim raw search results to standard OSM format for normalizeSalon
    const normalized = rawItems
      .map(item => {
        if (!item || !item.display_name || !item.lat || !item.lon) return null;

        // Build mock tags object compatible with normalizeSalon
        const address = item.address || {};
        const mockTags = {
          name: item.name || item.display_name.split(',')[0],
          'addr:street': address.road || address.pedestrian || '',
          'addr:suburb': address.suburb || address.neighbourhood || address.residential || address.commercial || '',
          'addr:city': address.city || address.town || address.village || '',
          'addr:district': address.state_district || address.county || '',
          'addr:state': address.state || '',
          'addr:postcode': address.postcode || '',
          phone: address.phone || '',
          shop: item.type === 'cosmetics' ? 'cosmetics' : (item.class === 'shop' ? 'cosmetics' : ''),
        };

        const mockElement = {
          type: item.osm_type || 'node',
          id: item.osm_id || Math.floor(Math.random() * 1000000),
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          tags: mockTags,
        };

        return normalizeSalon(mockElement);
      })
      .filter(Boolean);

    console.log(`[Nominatim Search] Success! Retrieved ${normalized.length} normalized items for "${locationName}".`);
    return normalized;
  } catch (error) {
    console.warn(`[Nominatim Search] Failed for "${locationName}": ${error.message}`);
    return [];
  }
}
