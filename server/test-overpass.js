import axios from 'axios';

async function testOverpassHeaders() {
  const query = `[out:json][timeout:30];(node["amenity"="hairdresser"](around:3000,19.4497996,72.8120613););out center;`;

  const combinations = [
    {
      name: 'No custom headers (default Axios)',
      headers: {}
    },
    {
      name: 'Polite OSM User-Agent only',
      headers: {
        'User-Agent': 'SalonFinderApp/1.0 (contact-salonfinder@example.com)'
      }
    },
    {
      name: 'Polite User-Agent + Accept application/json',
      headers: {
        'User-Agent': 'SalonFinderApp/1.0 (contact-salonfinder@example.com)',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Chrome User-Agent + Accept application/json',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    },
    {
      name: 'OSM User-Agent + Referer + Accept application/json',
      headers: {
        'User-Agent': 'SalonFinderApp/1.0 (contact-salonfinder@example.com)',
        'Referer': 'https://github.com/example/salonfinder',
        'Accept': 'application/json'
      }
    },
    {
      name: 'No User-Agent + Accept application/json',
      headers: {
        'Accept': 'application/json'
      }
    }
  ];

  for (const combo of combinations) {
    console.log(`\n--- Testing Combo: ${combo.name} ---`);
    try {
      const response = await axios.post(
        'https://overpass-api.de/api/interpreter',
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...combo.headers
          },
          timeout: 8000
        }
      );
      console.log(`✅ SUCCESS! Elements found: ${response.data.elements?.length}`);
      return; // Stop if we find a working one
    } catch (e) {
      console.log(`❌ FAILED: ${e.response?.status} - ${e.response?.statusText || e.message}`);
    }
  }
}

testOverpassHeaders();
