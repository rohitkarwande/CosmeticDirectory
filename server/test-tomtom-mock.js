import { normalizeSalon, normalizeTomTomSalon } from './utils/normalizer.js';
import { deduplicateSalons } from './utils/deduplicator.js';

// Mock OSM raw element (Virar)
const mockOsmElement = {
  type: 'node',
  id: 4303204071,
  lat: 19.4422007,
  lon: 72.8094933,
  tags: {
    name: "Mansi Gent's Hair Parlor",
    shop: "hairdresser"
    // OSM has NO phone number or address mapped for this salon
  }
};

// Mock TomTom POI result matching the same salon (same coordinates, similar name)
const mockTomTomMatch = {
  id: 'IN/POI/p0/111111',
  poi: {
    name: "Mansi Gents Hair Salon",
    phone: "09876543210", // TomTom HAS a phone number!
    categories: ["hairdresser", "beauty salon"]
  },
  address: {
    freeformAddress: "Agashi Road, Virar West, Palghar, Maharashtra, 401303",
    streetName: "Agashi Road",
    municipality: "Vasai-Virar",
    countrySubdivision: "Maharashtra",
    postalCode: "401303"
  },
  position: {
    lat: 19.4422020, // 0.2 meters apart
    lon: 72.8094930
  }
};

// Mock TomTom POI result that only exists in TomTom
const mockTomTomUnique = {
  id: 'IN/POI/p0/222222',
  poi: {
    name: "Looks Unisex Salon",
    phone: "+91 99999 88888",
    categories: ["beauty salon"]
  },
  address: {
    freeformAddress: "Station Road, Virar East, Palghar, Maharashtra, 401303",
    streetName: "Station Road",
    municipality: "Vasai-Virar",
    countrySubdivision: "Maharashtra",
    postalCode: "401303"
  },
  position: {
    lat: 19.458921,
    lon: 72.815234
  }
};

async function testMockPipeline() {
  console.log('=== Running Mock Dual-Provider Integration Test ===\n');

  console.log('1. Normalizing OSM Element...');
  const osmNormalized = normalizeSalon(mockOsmElement);
  console.log('   OSM Normalized Result:', JSON.stringify(osmNormalized, null, 2));

  console.log('\n2. Normalizing TomTom Elements...');
  const tomtomNormalized1 = normalizeTomTomSalon(mockTomTomMatch);
  const tomtomNormalized2 = normalizeTomTomSalon(mockTomTomUnique);
  console.log('   TomTom Match Normalization:', JSON.stringify(tomtomNormalized1, null, 2));
  console.log('   TomTom Unique Normalization:', JSON.stringify(tomtomNormalized2, null, 2));

  console.log('\n3. Combining results...');
  const combined = [osmNormalized, tomtomNormalized1, tomtomNormalized2].filter(Boolean);
  console.log(`   Combined total count: ${combined.length} items.`);

  console.log('\n4. Running Deduplication...');
  const deduplicated = deduplicateSalons(combined);
  console.log(`   Deduplicated count: ${deduplicated.length} items (removed ${combined.length - deduplicated.length} duplicate).`);

  console.log('\n=== Deduplicated Results Output ===');
  console.log(JSON.stringify(deduplicated, null, 2));
  console.log('===================================\n');

  // Verify expectations
  const mansi = deduplicated.find(s => s.name.toLowerCase().includes('mansi'));
  const looks = deduplicated.find(s => s.name.toLowerCase().includes('looks'));

  console.log('Assertion Verifications:');
  if (mansi) {
    const isMerged = mansi.source === 'OpenStreetMap, TomTom';
    const hasPhone = mansi.phone === '+919876543210';
    const hasAddress = mansi.address.includes('Agashi Road');
    console.log(`   [Mansi Gent's Hair Parlor]:`);
    console.log(`     - Merged source ("OpenStreetMap, TomTom"): ${isMerged ? '✅ PASS' : '❌ FAIL'} (${mansi.source})`);
    console.log(`     - Phone merged from TomTom ("+919876543210"): ${hasPhone ? '✅ PASS' : '❌ FAIL'} (${mansi.phone})`);
    console.log(`     - Address merged from TomTom: ${hasAddress ? '✅ PASS' : '❌ FAIL'} (${mansi.address})`);
  } else {
    console.log('   ❌ Error: Mansi Gent\'s Hair Parlor not found after deduplication.');
  }

  if (looks) {
    const isUnique = looks.source === 'TomTom';
    const hasPhone = looks.phone === '+919999988888';
    console.log(`   [Looks Unisex Salon]:`);
    console.log(`     - Source is "TomTom": ${isUnique ? '✅ PASS' : '❌ FAIL'} (${looks.source})`);
    console.log(`     - Phone is "+919999988888": ${hasPhone ? '✅ PASS' : '❌ FAIL'} (${looks.phone})`);
  } else {
    console.log('   ❌ Error: Looks Unisex Salon not found after deduplication.');
  }
}

testMockPipeline();
