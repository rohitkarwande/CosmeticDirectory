import axios from 'axios';
import { normalizeSalon } from '../utils/normalizer.js';

/**
 * Searches Nominatim directly for specific cosmetics, beauty collection, distributor, and supplier queries.
 * Restricts searches strictly to India.
 */
export async function fetchFromNominatimSearch(locationName, lat, lon, radiusMeters, isState = false) {
  if (!locationName || typeof locationName !== 'string') return [];

  let searchQueries = [
    `cosmetics in ${locationName}`,
    `beauty collection in ${locationName}`,
    `cosmetics distributor wholesaler in ${locationName}`,
  ];

  // If state search, add major commercial hubs for that state to ensure nationwide/statewide coverage
  if (isState) {
    const stateLower = locationName.trim().toLowerCase();
    searchQueries = [`cosmetics in ${locationName}`];
    if (stateLower === 'karnataka') {
      searchQueries.push(
        `cosmetics in Bengaluru`, `cosmetics in Vijayapura`, `cosmetics in Mysuru`,
        `cosmetics in Hubballi`, `cosmetics in Mangaluru`
      );
    } else if (stateLower === 'maharashtra') {
      searchQueries.push(
        `cosmetics in Mumbai`, `cosmetics in Pune`, `cosmetics in Thane`, `cosmetics in Nagpur`
      );
    } else if (stateLower === 'gujarat') {
      searchQueries.push(
        `cosmetics in Ahmedabad`, `cosmetics in Surat`, `cosmetics in Vadodara`
      );
    } else if (stateLower === 'tamil nadu') {
      searchQueries.push(
        `cosmetics in Chennai`, `cosmetics in Coimbatore`, `cosmetics in Madurai`
      );
    } else if (stateLower === 'rajasthan') {
      searchQueries.push(
        `cosmetics in Jaipur`, `cosmetics in Jodhpur`, `cosmetics in Udaipur`
      );
    } else if (stateLower === 'uttar pradesh') {
      searchQueries.push(
        `cosmetics in Lucknow`, `cosmetics in Kanpur`, `cosmetics in Varanasi`
      );
    }
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://github.com/example/salonfinder'
  };

  try {
    const resultsArrays = [];
    for (const queryStr of searchQueries) {
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
          timeout: 4000,
        });

        if (Array.isArray(response.data)) {
          resultsArrays.push(response.data);
        }
      } catch (err) {
        if (err.response && err.response.status === 429) {
          console.warn(`[Nominatim Search] Rate limited (429) on "${queryStr}". Fast fallback engaged.`);
          break; // Stop querying Nominatim if rate limited
        } else {
          console.warn(`[Nominatim Search] Sub-query failed for "${queryStr}": ${err.message}`);
        }
      }
      await new Promise(r => setTimeout(r, 200));
    }

    const rawItems = resultsArrays.flat();

    // Convert Nominatim raw search results to standard OSM format for normalizeSalon
    const normalized = rawItems
      .map(item => {
        if (!item || !item.display_name || !item.lat || !item.lon) return null;

        // Build mock tags object compatible with normalizeSalon
        const address = item.address || {};
        const shopName = item.name || item.display_name.split(',')[0];
        
        const mockTags = {
          name: shopName,
          'addr:street': address.road || address.pedestrian || '',
          'addr:suburb': address.suburb || address.neighbourhood || address.residential || address.commercial || '',
          'addr:city': address.city || address.town || address.village || '',
          'addr:district': address.state_district || address.county || '',
          'addr:state': address.state || '',
          'addr:postcode': address.postcode || '',
          phone: address.phone || '',
          shop: 'cosmetics',
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
