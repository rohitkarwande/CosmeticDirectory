/**
 * Normalizes an Indian phone number into +91XXXXXXXXXX format.
 * Returns null if no valid number is found.
 */
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;

  // Split multiple numbers in case they are separated by commas, semicolons, or slashes
  const parts = phone.split(/[,;\/\\]/);
  
  for (const part of parts) {
    // Keep only digits
    const digits = part.replace(/\D/g, '');

    // Validate length and format
    if (digits.length === 10) {
      // 10-digit mobile (e.g. 9876543210)
      if (/^[6-9]\d{9}$/.test(digits)) {
        return `+91${digits}`;
      }
    } else if (digits.length === 11 && digits.startsWith('0')) {
      // 11-digit mobile starting with 0 (e.g. 09876543210)
      const num = digits.substring(1);
      if (/^[6-9]\d{9}$/.test(num)) {
        return `+91${num}`;
      }
    } else if (digits.length === 12 && digits.startsWith('91')) {
      // 12-digit mobile starting with 91 (e.g. 919876543210)
      const num = digits.substring(2);
      if (/^[6-9]\d{9}$/.test(num)) {
        return `+91${num}`;
      }
    } else if (digits.length > 10) {
      // If it has landline or other formats, we still want to format if it ends in a 10 digit mobile
      const num = digits.slice(-10);
      if (/^[6-9]\d{9}$/.test(num)) {
        return `+91${num}`;
      }
    }
  }

  // Fallback: If we couldn't match a mobile regex, return digits in a readable format or null
  // Just in case it's a landline (e.g. +91 22 2345 6789)
  const allDigits = phone.replace(/\D/g, '');
  if (allDigits.length >= 8 && allDigits.length <= 12) {
    if (allDigits.startsWith('91')) {
      return `+${allDigits}`;
    } else if (allDigits.startsWith('0')) {
      return `+91${allDigits.substring(1)}`;
    } else {
      return `+91${allDigits}`;
    }
  }

  return null;
}

/**
 * Parses OSM tags to generate a clean, comma-separated address.
 * Falls back to locality/suburb/city if house number & street are missing.
 */
export function normalizeAddress(tags) {
  if (!tags) return '';

  const house = tags['addr:housenumber'] || tags['addr:house_number'] || '';
  const street = tags['addr:street'] || '';
  const fullStreet = [house, street].filter(Boolean).join(' ');

  const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:locality'] || tags['addr:quarter'] || '';
  const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '';
  const district = tags['addr:district'] || tags['addr:county'] || '';
  const state = tags['addr:state'] || '';
  const postcode = tags['addr:postcode'] || tags['addr:postal_code'] || '';

  const parts = [
    fullStreet,
    suburb,
    city,
    district,
    state,
    postcode
  ].map(p => p.trim()).filter(Boolean);

  return parts.join(', ');
}

/**
 * Strict validation: Returns true ONLY if a business is explicitly cosmetics & beauty related.
 * Excludes water distributors, food/meat/chicken/egg trade, hardware, electronics, etc.
 */
export function isCosmeticsRelated(tags = {}, name = '') {
  if (!name || typeof name !== 'string') return false;

  const nameLower = name.toLowerCase();
  const shopTag = (tags.shop || '').toLowerCase();
  const tradeTag = (tags.trade || '').toLowerCase();

  // Irrelevant category keywords that MUST NEVER be included unless name explicitly contains cosmetics or beauty collection
  const negativeKeywords = [
    'water', 'chicken', 'egg', 'eggs', 'meat', 'mutton', 'fish', 'poultry',
    'hardware', 'cement', 'steel', 'plywood', 'glass', 'sanitary', 'paint', 'electrical',
    'xerox', 'printout', 'printing', 'mobile', 'laptop', 'computer', 'repair',
    'auto', 'automobile', 'tyre', 'tire', 'garage', 'spare parts', 'motor', 'bike', 'car',
    'bakery', 'restaurant', 'hotel', 'food', 'sweets', 'snack', 'cafe', 'catering',
    'furniture', 'jeweller', 'jewellers', 'jewellery'
  ];

  const hasNegativeKeyword = negativeKeywords.some(kw => nameLower.includes(kw));
  
  // Strong cosmetics/beauty keywords for Indian trade and local markets
  const cosmeticsKeywords = [
    'cosmetic', 'cosmetics', 'beauty collection', 'beauty store', 'beauty world', 
    'beauty product', 'beauty supply', 'beauty supplies', 'beauty house', 'beauty corner', 
    'beauty hub', 'beauty center', 'beauty centre', 'makeup', 'make up', 'skincare', 
    'skin care', 'perfume', 'perfumery', 'attar', 'cosmetic store', 'cosmetics store',
    'bangles & cosmetics', 'imitation & cosmetics', 'novelty & cosmetics',
    'fancy store', 'fancy stores', 'novelty', 'novelties', 'bangle', 'bangles',
    'cutpiece', 'collection', 'collections', 'beauty', 'beauties', 'imitation', 'gift & cosmetics',
    'shringar', 'sringar', 'suhag', 'suhaag', 'oriflame', 'modicare', 'varities', 'varieties',
    'shopee', 'gift shop', 'novelty', 'fancy'
  ];

  const hasCosmeticsKeywordInName = cosmeticsKeywords.some(kw => nameLower.includes(kw));

  // Explicit OSM Tag verification
  const isCosmeticsShopTag = shopTag === 'cosmetics' || shopTag === 'beauty_supplier' || shopTag === 'perfumery' || tradeTag === 'cosmetics';

  // If it has a negative keyword (e.g. "Xerox Shop"), it MUST have an explicit cosmetics keyword in its name
  if (hasNegativeKeyword) {
    return hasCosmeticsKeywordInName;
  }

  // Explicit OSM tags
  if (isCosmeticsShopTag) return true;

  // Explicit name check
  if (hasCosmeticsKeywordInName) return true;

  // Check if name has trade terms (distributor/wholesaler/stockist/agency/traders/enterprise) COMBINED with beauty/cosmetic/novelty/collection
  const isTradeTerm = 
    nameLower.includes('distributor') || 
    nameLower.includes('wholesaler') || 
    nameLower.includes('stockist') || 
    nameLower.includes('supplier') || 
    nameLower.includes('agency') ||
    nameLower.includes('agencies') ||
    nameLower.includes('traders') ||
    nameLower.includes('trader') ||
    nameLower.includes('enterprise') ||
    nameLower.includes('enterprises');

  const isBeautyTerm = 
    nameLower.includes('beauty') || 
    nameLower.includes('cosmetic') || 
    nameLower.includes('collection') ||
    nameLower.includes('fancy') ||
    nameLower.includes('novelty');

  if (isTradeTerm && isBeautyTerm) return true;

  return false;
}

/**
 * Checks if a business is a consumer salon/barbershop/hairdresser/spa rather than a cosmetics dealer/distributor/shop.
 */
export function isConsumerSalon(tags = {}, name = '') {
  if (!name || typeof name !== 'string') return false;
  const nameLower = name.toLowerCase();
  const shopTag = (tags.shop || '').toLowerCase();
  const amenityTag = (tags.amenity || '').toLowerCase();
  const leisureTag = (tags.leisure || '').toLowerCase();

  // If tags explicitly mark it as hairdresser, barber, massage, spa, or salon
  if (shopTag === 'hairdresser' || shopTag === 'barber' || shopTag === 'massage' || amenityTag === 'spa' || leisureTag === 'spa' || shopTag === 'beauty') {
    const hasTradeOverride = 
      nameLower.includes('wholesale') || 
      nameLower.includes('wholesaler') || 
      nameLower.includes('distributor') || 
      nameLower.includes('supplier') ||
      nameLower.includes('stockist') ||
      nameLower.includes('imitation') ||
      nameLower.includes('bangles') ||
      nameLower.includes('novelty');
    if (!hasTradeOverride) return true;
  }

  // Strict list of consumer salon / spa / parlour / clinic terms
  const salonTerms = [
    'salon', 'salons', 'spa', 'spas', 'parlour', 'parlor', 'parlours', 'parlors',
    'barber', 'barbers', 'hairdresser', 'hairdressers', 'hair art', 'hair craft',
    'hair studio', 'hair cut', 'hair style', 'hairstyle', 'makeup artist',
    'make-up artist', 'make up artist', 'makeover', 'skin clinic', 'clinic',
    'derma', 'academy', 'classes', 'hair craft', 'beauty clinic'
  ];

  const hasSalonTerm = salonTerms.some(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    return regex.test(nameLower);
  });

  if (hasSalonTerm) {
    const hasTradeOverride = 
      nameLower.includes('wholesale') || 
      nameLower.includes('wholesaler') || 
      nameLower.includes('distributor') || 
      nameLower.includes('supplier') ||
      nameLower.includes('stockist') ||
      nameLower.includes('trader') ||
      nameLower.includes('traders') ||
      nameLower.includes('imitation') ||
      nameLower.includes('bangles') ||
      nameLower.includes('novelty');
    
    // If it contains a salon/spa/parlour/makeover term and has NO trade override, exclude it strictly!
    if (!hasTradeOverride) return true;
  }

  return false;
}

/**
 * Normalizes OSM tags and business names into standard cosmetics trade categories.
 * Standard categories: Cosmetics Wholesaler, Cosmetics Distributor, Beauty Product Supplier, Cosmetics Store & Dealer, Other Wholesale / Dealer
 */
export function normalizeCategory(tags = {}, name = '') {
  const nameLower = name.toLowerCase();

  // 1. Cosmetics Wholesaler
  const isWholesale = 
    tags.wholesale === 'yes' || 
    tags.office === 'wholesale' ||
    tags.trade === 'wholesale' ||
    nameLower.includes('wholesale') ||
    nameLower.includes('wholesaler') ||
    nameLower.includes('bulk') ||
    nameLower.includes('trader') ||
    nameLower.includes('trading');

  if (isWholesale) {
    return 'Cosmetics Wholesaler';
  }

  // 2. Cosmetics Distributor
  const isDistributor = 
    tags.office === 'distributor' || 
    nameLower.includes('distributor') || 
    nameLower.includes('distribution') || 
    nameLower.includes('agency') ||
    nameLower.includes('agencies') ||
    nameLower.includes('stockist') ||
    nameLower.includes('enterprise') ||
    nameLower.includes('enterprises');

  if (isDistributor) {
    return 'Cosmetics Distributor';
  }

  // 3. Beauty Product Supplier
  const isSupplier = 
    tags.shop === 'beauty_supplier' || 
    tags.trade === 'cosmetics' || 
    nameLower.includes('supplier') || 
    nameLower.includes('supplies') || 
    nameLower.includes('beauty supply') ||
    nameLower.includes('equipment') ||
    nameLower.includes('depot');

  if (isSupplier) {
    return 'Beauty Product Supplier';
  }

  // 4. Cosmetics Store & Dealer (including Beauty Collections, Beauty Stores, Beauty World)
  const isCosmeticsShop = 
    tags.shop === 'cosmetics' || 
    tags.shop === 'perfumery' ||
    tags.shop === 'chemist' ||
    nameLower.includes('cosmetic') || 
    nameLower.includes('beauty collection') ||
    nameLower.includes('collection') ||
    nameLower.includes('beauty shop') || 
    nameLower.includes('beauty store') ||
    nameLower.includes('beauty world') ||
    nameLower.includes('beauty center') ||
    nameLower.includes('beauty centre') ||
    nameLower.includes('beauty corner') ||
    nameLower.includes('beauty hub') ||
    nameLower.includes('dealer') || 
    nameLower.includes('store') ||
    nameLower.includes('mart');

  if (isCosmeticsShop) {
    return 'Cosmetics Store & Dealer';
  }

  return 'Other Wholesale / Dealer';
}

/**
 * Normalizes a raw OSM element into a clean business object.
 */
export function normalizeSalon(element) {
  const tags = element.tags || {};
  
  // Extract name (discard elements without names)
  const name = tags.name || tags.brand || tags.operator || '';
  if (!name.trim()) {
    return null; 
  }

  // Exclude non-cosmetics businesses and consumer salons/spas
  if (isConsumerSalon(tags, name) || !isCosmeticsRelated(tags, name)) {
    return null;
  }

  // Retrieve coordinates
  const lat = element.lat || (element.center ? element.center.lat : null);
  const lon = element.lon || (element.center ? element.center.lon : null);

  if (lat === null || lon === null) {
    return null;
  }

  // Phone number resolution
  const rawPhone = 
    tags.phone || 
    tags['contact:phone'] || 
    tags.mobile || 
    tags['contact:mobile'] || 
    tags['phone:mobile'] || 
    tags.telephone || 
    tags['contact:telephone'] || 
    '';
  const phone = normalizePhoneNumber(rawPhone);

  // Address and Locality
  const address = normalizeAddress(tags);
  const area = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:locality'] || tags['addr:quarter'] || tags['addr:city'] || '';

  // Category mapping
  const category = normalizeCategory(tags, name);

  // Website resolution
  const website = tags.website || tags['contact:website'] || tags.facebook || tags['contact:facebook'] || null;

  // Map URL
  const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

  return {
    id: `${element.type}-${element.id}`,
    name: name.trim(),
    phone,
    address: address || 'Address not available',
    area: area || 'Area not specified',
    city: tags['addr:city'] || tags['addr:town'] || '',
    district: tags['addr:district'] || tags['addr:county'] || '',
    state: tags['addr:state'] || '',
    pincode: tags['addr:postcode'] || tags['addr:postal_code'] || '',
    category,
    latitude: lat,
    longitude: lon,
    source: 'OpenStreetMap',
    mapUrl,
    website,
    rawTags: tags
  };
}

/**
 * Normalizes a TomTom Search API POI result into our standard Salon schema.
 */
export function normalizeTomTomSalon(result) {
  if (!result || !result.poi || !result.position) return null;

  const poi = result.poi;
  const name = poi.name || '';
  if (!name.trim()) return null;

  // Exclude non-cosmetics businesses and consumer salons/spas
  if (isConsumerSalon(poi, name) || !isCosmeticsRelated(poi, name)) {
    return null;
  }

  const lat = result.position.lat;
  const lon = result.position.lon;

  // Phone number (strip/normalize)
  const phone = normalizePhoneNumber(poi.phone || '');

  // Address fields
  const addressObj = result.address || {};
  const address = addressObj.freeformAddress || '';
  
  // Locality/Area
  const area = addressObj.streetName || addressObj.municipalitySubdivision || 'Area not specified';

  // Category mapping
  const categoriesList = poi.categories || [];
  const nameLower = name.toLowerCase();
  const catsLower = categoriesList.map(c => c.toLowerCase());

  // Filter out clearly irrelevant POI categories (e.g. automotive dealer, gas station, bank, hotel, salon/spa)
  const isIrrelevantCategory = catsLower.some(c => 
    c.includes('automotive') || 
    c.includes('car dealer') || 
    c.includes('motorcycle') || 
    c.includes('gas station') || 
    c.includes('petrol') ||
    c.includes('bank') || 
    c.includes('atm') || 
    c.includes('hotel') || 
    c.includes('restaurant') ||
    c.includes('hair care') ||
    c.includes('beauty salon') ||
    c.includes('barber')
  );

  const hasCosmeticRelevance = 
    nameLower.includes('cosmetic') || 
    nameLower.includes('collection') ||
    nameLower.includes('distributor') || 
    nameLower.includes('wholesale') || 
    nameLower.includes('stockist') ||
    nameLower.includes('supplier') ||
    nameLower.includes('agency') ||
    catsLower.some(c => c.includes('cosmetic') || c.includes('wholesale') || c.includes('distributor') || c.includes('supplier'));

  if (isIrrelevantCategory && !hasCosmeticRelevance) {
    return null; // Exclude non-relevant POIs
  }

  let category = 'Other Wholesale / Dealer';

  if (
    catsLower.some(c => c.includes('wholesale')) || 
    nameLower.includes('wholesale') || 
    nameLower.includes('wholesaler') || 
    nameLower.includes('bulk') || 
    nameLower.includes('trader') ||
    nameLower.includes('trading')
  ) {
    category = 'Cosmetics Wholesaler';
  } else if (
    catsLower.some(c => c.includes('distributor')) || 
    nameLower.includes('distributor') || 
    nameLower.includes('distribution') || 
    nameLower.includes('agency') || 
    nameLower.includes('stockist') ||
    nameLower.includes('enterprise')
  ) {
    category = 'Cosmetics Distributor';
  } else if (
    catsLower.some(c => c.includes('supplier')) || 
    nameLower.includes('supplier') || 
    nameLower.includes('supplies') || 
    nameLower.includes('beauty supply') || 
    nameLower.includes('equipment')
  ) {
    category = 'Beauty Product Supplier';
  } else if (
    catsLower.some(c => c.includes('cosmetic') || c.includes('beauty')) || 
    nameLower.includes('cosmetic') || 
    nameLower.includes('collection') ||
    nameLower.includes('beauty shop') || 
    nameLower.includes('beauty store') ||
    nameLower.includes('dealer') || 
    nameLower.includes('store')
  ) {
    category = 'Cosmetics Store & Dealer';
  }

  const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

  // Website mapping
  const website = poi.url || null;

  return {
    id: `tomtom-${result.id}`,
    name: name.trim(),
    phone,
    address: address || 'Address not available',
    area: area,
    city: addressObj.municipality || '',
    district: addressObj.countrySecondarySubdivision || '',
    state: addressObj.countrySubdivision || '',
    pincode: addressObj.postalCode || '',
    category,
    latitude: lat,
    longitude: lon,
    source: 'TomTom',
    mapUrl,
    website,
    rawTags: poi
  };
}
