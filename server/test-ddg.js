import axios from 'axios';

async function testDDGContent() {
  const query = 'Habibs Salon Virar phone number';
  console.log(`Searching for: "${query}"`);
  
  try {
    const response = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 8000,
    });

    const html = response.data;
    console.log(`HTML Response Length: ${html.length} bytes`);
    
    // Check if we got results page
    const hasResults = html.includes('class="result__snippet"');
    console.log(`Contains search result snippets: ${hasResults}`);
    
    if (html.includes('robot') || html.includes('captcha') || html.includes('ddg-litesearch')) {
      console.log('⚠️ Warning: May have hit anti-bot or redirect check!');
    }

    // Print first 500 characters of clean text
    const cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    console.log('\nSample text from page:');
    console.log(cleanText.substring(0, 800));

    // Let's run a phone regex check on the clean text
    const PHONE_REGEX = /(?:\+91|0)?[-\s]?[6-9]\d{9}\b/g;
    const matches = cleanText.match(PHONE_REGEX) || [];
    console.log('\nRegex matches found:', matches);

  } catch (e) {
    console.error('Request failed:', e.message);
  }
}

testDDGContent();
