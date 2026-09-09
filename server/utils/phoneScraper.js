import axios from 'axios';

// Indian phone regex: matches +91 or 0 prefix followed by 10-digit mobile starting with 6-9
const PHONE_REGEX = /(?:\+91|0)?[-\s]?[6-9]\d{4}[-\s]?\d{5}\b/g;
const LOOSE_PHONE_REGEX = /(?:\+91|0)?[-\s]?[6-9]\d{9}\b/g;

/**
 * Searches public search snippets (Bing & DDG Lite) for a business's contact phone number.
 * Bypasses Google Places API entirely to ensure zero cost.
 */
export async function scrapePhoneFromWeb(businessName, areaOrCity) {
  if (!businessName) return null;

  const cleanName = businessName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const cleanArea = (areaOrCity || '').replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const query = `${cleanName} ${cleanArea} phone contact mobile number`.trim();

  console.log(`[Free Phone Scraper] Searching web snippets for: "${query}"...`);

  // Engine 1: Bing Public Snippets
  try {
    const bingRes = await axios.get('https://www.bing.com/search', {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 5000,
    });

    const html = bingRes.data;
    if (typeof html === 'string') {
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
      const extracted = extractIndianMobile(text);
      if (extracted) {
        console.log(`[Free Phone Scraper] Found ${extracted} via Bing for "${businessName}"!`);
        return extracted;
      }
    }
  } catch (err) {
    console.warn(`[Free Phone Scraper] Bing search notice:`, err.message);
  }

  // Engine 2: DuckDuckGo Lite Form Search
  try {
    const ddgRes = await axios.post(
      'https://lite.duckduckgo.com/lite/',
      `q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        timeout: 5000,
      }
    );

    const html = ddgRes.data;
    if (typeof html === 'string') {
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
      const extracted = extractIndianMobile(text);
      if (extracted) {
        console.log(`[Free Phone Scraper] Found ${extracted} via DDG Lite for "${businessName}"!`);
        return extracted;
      }
    }
  } catch (err) {
    console.warn(`[Free Phone Scraper] DDG Lite notice:`, err.message);
  }

  return null;
}

function extractIndianMobile(text) {
  const matches = (text.match(PHONE_REGEX) || []).concat(text.match(LOOSE_PHONE_REGEX) || []);
  for (const match of matches) {
    const digits = match.replace(/\D/g, '');
    let cleanDigits = digits;

    if (digits.length === 11 && digits.startsWith('0')) {
      cleanDigits = digits.substring(1);
    } else if (digits.length === 12 && digits.startsWith('91')) {
      cleanDigits = digits.substring(2);
    }

    if (cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits)) {
      return `+91${cleanDigits}`;
    }
  }
  return null;
}
