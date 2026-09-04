import axios from 'axios';

async function testEndpoints() {
  const query = `[out:json][timeout:15];(node["amenity"="hairdresser"](around:2000,19.4497996,72.8120613););out center;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter'
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://github.com/example/salonfinder'
  };

  for (const endpoint of endpoints) {
    console.log(`\nTesting endpoint: ${endpoint}`);
    try {
      const response = await axios.post(
        endpoint,
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers
          },
          timeout: 10000
        }
      );
      console.log(`✅ SUCCESS! Status: ${response.status}. Elements: ${response.data.elements?.length}`);
    } catch (e) {
      console.log(`❌ FAILED: ${e.response?.status || 'No Status'} - ${e.response?.statusText || e.message}`);
    }
  }
}

testEndpoints();
