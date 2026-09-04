import axios from 'axios';

async function testNominatim() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'SalonFinderApp/1.0 (contact@salonfinder.example.com)',
    'SalonFinder-UserAgent-Testing-Divya',
  ];

  for (const ua of userAgents) {
    console.log(`Testing with User-Agent: "${ua}"`);
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: 'Virar',
          format: 'json',
          countrycodes: 'in',
          limit: 1,
        },
        headers: {
          'User-Agent': ua,
          'Referer': 'http://localhost:3000'
        },
        timeout: 5000,
      });
      console.log(`✅ Success! Response size: ${response.data.length}. Name: ${response.data[0]?.display_name}`);
      return;
    } catch (e) {
      console.log(`❌ Failed: ${e.response?.status} - ${e.response?.statusText || e.message}`);
    }
  }
}

testNominatim();
