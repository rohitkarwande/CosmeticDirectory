import axios from 'axios';

/**
 * Queries TomTom Search API for cosmetics wholesalers, distributors, and suppliers within a radius in India.
 */
export async function fetchSalonsFromTomTom(lat, lon, radiusMeters) {
  const apiKey = process.env.TOMTOM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('TomTom API key is not configured.');
  }

  if (isNaN(lat) || isNaN(lon) || isNaN(radiusMeters)) {
    throw new Error('Invalid coordinates or radius for TomTom Search');
  }

  // Keywords targeting B2B cosmetics trade, beauty collections, and cosmetics retail
  const keywords = [
    'cosmetics distributor',
    'cosmetics wholesaler',
    'beauty product supplier',
    'cosmetics shop',
    'beauty collection',
    'beauty store',
    'cosmetics dealer',
    'beauty product shop',
    'cosmetics stockist'
  ];

  try {
    const promises = keywords.map(async (kw) => {
      const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(kw)}.json`;
      const response = await axios.get(url, {
        params: {
          key: apiKey,
          lat,
          lon,
          radius: radiusMeters,
          countrySet: 'IN', // strictly limit to India
          limit: 50, // 50 items per query
        },
        timeout: 10000,
      });
      if (response.data && Array.isArray(response.data.results)) {
        return response.data.results.filter(item => item.type === 'POI' && item.poi);
      }
      return [];
    });

    const resultsArray = await Promise.all(promises);
    const combined = resultsArray.flat();

    // Deduplicate by item.id
    const seenIds = new Set();
    const poiResults = [];
    for (const item of combined) {
      if (item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        poiResults.push(item);
      }
    }

    console.log(`[TomTom] Success! Found ${poiResults.length} unique POI results for cosmetics trade queries.`);
    return poiResults;

  } catch (error) {
    if (error.response) {
      if (error.response.status === 403) {
        console.warn('[TomTom] API key is invalid or rate limit exceeded.');
        throw new Error('TomTom Search API key is invalid or has hit its daily limit.');
      }
      throw new Error(`TomTom API error: ${error.response.status} - ${error.response.statusText}`);
    }
    throw error;
  }
}
