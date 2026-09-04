/**
 * Calculates Haversine distance in meters between two coordinates.
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Stop words to remove during name similarity comparison
const STOPWORDS = new Set([
  'salon',
  'saloon',
  'parlour',
  'parlor',
  'hair',
  'beauty',
  'spa',
  'unisex',
  'mens',
  'men',
  'womens',
  'women',
  'ladies',
  'gents',
  'hairdresser',
  'style',
  'styles',
  'cut',
  'cuts',
  'and',
  'the',
  'lounge',
  'studio'
]);

/**
 * Tokenizes and cleans a business name for comparison.
 */
function cleanNameTokens(name) {
  if (!name) return [];
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove special characters
    .split(/\s+/)
    .filter(token => token.length > 0 && !STOPWORDS.has(token));
}

/**
 * Determines if two names are highly similar.
 */
function namesAreSimilar(name1, name2) {
  const n1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const n2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (n1 === n2) return true;
  if (n1.includes(n2) && n2.length > 4) return true;
  if (n2.includes(n1) && n1.length > 4) return true;

  const tokens1 = cleanNameTokens(name1);
  const tokens2 = cleanNameTokens(name2);

  if (tokens1.length === 0 || tokens2.length === 0) {
    // If they have no significant tokens, check if base names are identical after spaces removed
    return n1 === n2 && n1.length > 0;
  }

  // Count overlaps
  let overlapCount = 0;
  for (const t1 of tokens1) {
    if (tokens2.includes(t1)) {
      overlapCount++;
    }
  }

  // If there is significant overlap of non-stop words
  const minLength = Math.min(tokens1.length, tokens2.length);
  const ratio = overlapCount / minLength;

  return ratio >= 0.7; // 70% or more overlap of keyword tokens
}

/**
 * Merges two salon objects, preserving the maximum amount of detail.
 */
function mergeSalons(s1, s2) {
  // Prefer the name that has phone or is cleaner
  const name = s1.phone ? s1.name : s2.name;
  const phone = s1.phone || s2.phone || null;
  const address = s1.address !== 'Address not available' ? s1.address : s2.address;
  const area = s1.area !== 'Area not specified' ? s1.area : s2.area;
  const city = s1.city || s2.city || '';
  const district = s1.district || s2.district || '';
  const state = s1.state || s2.state || '';
  const pincode = s1.pincode || s2.pincode || '';
  const category = s1.category !== 'Other' ? s1.category : s2.category;
  const website = s1.website || s2.website || null;
  
  // Average the coordinates to center the location
  const latitude = (s1.latitude + s2.latitude) / 2;
  const longitude = (s1.longitude + s2.longitude) / 2;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;

  // Combine data sources uniquely
  const sources = new Set(
    [s1.source, s2.source]
      .flatMap(src => src.split(', '))
      .map(src => src.trim())
  );
  const source = Array.from(sources).join(', ');

  return {
    id: s1.id, // keep first ID
    name,
    phone,
    address,
    area,
    city,
    district,
    state,
    pincode,
    category,
    latitude,
    longitude,
    source,
    mapUrl,
    website
  };
}

/**
 * Deduplicates an array of normalized salons.
 */
export function deduplicateSalons(salons) {
  if (!Array.isArray(salons) || salons.length <= 1) {
    return salons;
  }

  const results = [];
  const mergedIndices = new Set();

  for (let i = 0; i < salons.length; i++) {
    if (mergedIndices.has(i)) continue;

    let current = salons[i];

    for (let j = i + 1; j < salons.length; j++) {
      if (mergedIndices.has(j)) continue;

      const other = salons[j];
      let isDuplicate = false;

      // 1. Phone number match = very strong duplicate signal
      if (current.phone && other.phone && current.phone === other.phone) {
        isDuplicate = true;
      }

      // 2. Same coordinates (dist < 25m) + similar name = strong duplicate signal
      if (!isDuplicate) {
        const dist = getDistance(
          current.latitude,
          current.longitude,
          other.latitude,
          other.longitude
        );

        if (dist <= 25 && namesAreSimilar(current.name, other.name)) {
          isDuplicate = true;
        }
      }

      // 3. Similar address + similar name = likely duplicate
      if (!isDuplicate && current.address !== 'Address not available' && other.address !== 'Address not available') {
        const dist = getDistance(
          current.latitude,
          current.longitude,
          other.latitude,
          other.longitude
        );

        // If close (dist < 100m) and names are similar and address street is likely similar
        if (dist <= 100 && namesAreSimilar(current.name, other.name)) {
          // Compare address strings (simplified street check)
          const street1 = current.address.split(',')[0].toLowerCase().trim();
          const street2 = other.address.split(',')[0].toLowerCase().trim();
          
          if (street1 === street2 || (street1.length > 5 && street2.includes(street1)) || (street2.length > 5 && street1.includes(street2))) {
            isDuplicate = true;
          }
        }
      }

      if (isDuplicate) {
        current = mergeSalons(current, other);
        mergedIndices.add(j);
      }
    }

    results.push(current);
  }

  return results;
}
