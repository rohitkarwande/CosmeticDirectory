import dotenv from 'dotenv';
import { geocodeLocation } from './providers/geocoding.js';
import { fetchSalonsFromOverpass } from './providers/overpass.js';
import { fetchSalonsFromTomTom } from './providers/tomtom.js';
import { fetchFromGooglePlaces } from './providers/googlePlaces.js';
import { fetchFromNominatimSearch } from './providers/nominatimSearch.js';
import { normalizeSalon, normalizeTomTomSalon } from './utils/normalizer.js';
import { deduplicateSalons } from './utils/deduplicator.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environmental variables from server/.env and root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runTest() {
  const testLocations = ['Virar', 'Kaman', 'Sativali'];
  const tomtomKey = process.env.TOMTOM_API_KEY;
  const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API;

  console.log(`🔑 Google Places API Key: ${googleKey ? 'PRESENT' : 'NOT SET'}`);
  console.log(`🔑 TomTom API Key: ${tomtomKey ? 'PRESENT' : 'NOT SET'}`);

  for (const location of testLocations) {
    console.log(`\n==================================================`);
    console.log(`TESTING LOCATION: ${location}`);
    console.log(`==================================================`);
    
    try {
      console.log('1. Geocoding...');
      const geo = await geocodeLocation(location);
      console.log(`   - Display Name: ${geo.displayName}`);
      console.log(`   - Coordinates: (${geo.lat}, ${geo.lon})`);
      console.log(`   - Calculated Radius: ${geo.radiusKm} km (${geo.radiusMeters} m)`);

      console.log('2. Querying Providers...');
      
      // Query OSM
      console.log('   - Querying OpenStreetMap Overpass...');
      const osmPromise = fetchSalonsFromOverpass(geo.lat, geo.lon, geo.radiusMeters)
        .then(elements => {
          const normalized = elements.map(e => normalizeSalon(e)).filter(Boolean);
          console.log(`     ✓ Found ${elements.length} raw OSM elements (${normalized.length} cosmetics/beauty items).`);
          return normalized;
        })
        .catch(err => {
          console.warn(`     ❌ OSM query failed: ${err.message}`);
          return [];
        });

      // Query Nominatim Search
      console.log('   - Querying Nominatim Direct POI Search...');
      const nominatimPromise = fetchFromNominatimSearch(location, geo.lat, geo.lon, geo.radiusMeters)
        .then(items => {
          console.log(`     ✓ Found ${items.length} items from Nominatim search.`);
          return items;
        })
        .catch(err => {
          console.warn(`     ❌ Nominatim search failed: ${err.message}`);
          return [];
        });

      // Query TomTom (if key is set)
      const tomtomPromise = tomtomKey
        ? fetchSalonsFromTomTom(geo.lat, geo.lon, geo.radiusMeters)
            .then(results => {
              const normalized = results.map(r => normalizeTomTomSalon(r)).filter(Boolean);
              console.log(`     ✓ Found ${results.length} raw TomTom POIs (${normalized.length} cosmetics/beauty items).`);
              return normalized;
            })
            .catch(err => {
              console.warn(`     ❌ TomTom query failed: ${err.message}`);
              return [];
            })
        : Promise.resolve([]);

      // Query Google Places
      console.log('   - Querying Google Places API...');
      const googlePromise = googleKey
        ? fetchFromGooglePlaces(location, geo.lat, geo.lon, geo.radiusMeters)
            .then(places => {
              console.log(`     ✓ Found ${places.length} items from Google Places.`);
              return places;
            })
            .catch(err => {
              console.warn(`     ❌ Google Places failed: ${err.message}`);
              return [];
            })
        : Promise.resolve([]);

      const [googleNormalized, osmNormalized, nominatimNormalized, tomtomNormalized] = await Promise.all([
        googlePromise,
        osmPromise,
        nominatimPromise,
        tomtomPromise
      ]);
      const combined = [...googleNormalized, ...osmNormalized, ...nominatimNormalized, ...tomtomNormalized];
      
      console.log(`   - Combined total: ${combined.length} normalized items.`);

      if (combined.length === 0) {
        console.log('   - No elements found, skipping further tests for this location.');
        continue;
      }

      console.log('3. Deduplicating elements...');
      const deduplicated = deduplicateSalons(combined);
      console.log(`   - Deduplicated size: ${deduplicated.length} elements (removed ${combined.length - deduplicated.length} duplicates).`);

      if (deduplicated.length > 0) {
        // Find a merged result or just print the first one
        const mergedResult = deduplicated.find(s => s.source.includes(', ')) || deduplicated[0];
        
        console.log('\n--- Sample Result ---');
        console.log(JSON.stringify(mergedResult, null, 2));
        console.log('---------------------\n');
        
        const withPhone = deduplicated.filter(s => s.phone);
        const withAddress = deduplicated.filter(s => s.address && s.address !== 'Address not available');
        const fromOSM = deduplicated.filter(s => s.source.includes('OpenStreetMap')).length;
        const fromTomTom = deduplicated.filter(s => s.source.includes('TomTom')).length;
        const fromBoth = deduplicated.filter(s => s.source.includes('OpenStreetMap') && s.source.includes('TomTom')).length;

        console.log(`Location Stats:`);
        console.log(`   Total Salons Found:  ${deduplicated.length}`);
        console.log(`   Salons from OSM:     ${fromOSM}`);
        console.log(`   Salons from TomTom:  ${fromTomTom}`);
        console.log(`   Merged in both:      ${fromBoth}`);
        console.log(`   Salons with Phone:   ${withPhone.length}`);
        console.log(`   Salons with Address: ${withAddress.length}`);
      }
    } catch (error) {
      console.error(`❌ Test failed for location "${location}":`, error.message);
    }
  }
}

runTest();
