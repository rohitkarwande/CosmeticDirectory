import type { Client } from '../types';

const GENERIC_STOPWORDS = new Set([
  'cosmetic', 'cosmetics', 'beauty', 'store', 'stores', 'wholesaler', 'wholesalers',
  'agency', 'agencies', 'house', 'varieties', 'variety', 'centre', 'center',
  'shop', 'shops', 'parlour', 'parlor', 'traders', 'trader', 'emporium',
  'enterprise', 'enterprises', 'distributor', 'distributors', 'salons', 'salon',
  'and', 'the', 'of', '&', 'ltd', 'pvt', 'co', 'company', 'pvt.ltd.', 'mart', 'bazaar',
  'collection', 'collections', 'supplier', 'suppliers', 'trading', 'world', 'corner',
  'hub', 'depot', 'imitation', 'bangles', 'novelty', 'fancy'
]);

/**
 * Normalizes a shop name by lowercasing, removing punctuation, and trimming extra spaces.
 */
export function normalizeShopName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips generic trade stopwords to isolate the core unique brand/business name.
 * e.g. "Dhanshree cosmetic" -> "dhanshree"
 * e.g. "NANDADIP COSMETIC" -> "nandadip"
 * e.g. "Arihant cosmetic" -> "arihant"
 */
export function getCoreBrandName(name: string): string {
  const normalized = normalizeShopName(name);
  if (!normalized) return '';
  const tokens = normalized.split(' ');
  const filtered = tokens.filter(t => t.length > 1 && !GENERIC_STOPWORDS.has(t));
  return filtered.length > 0 ? filtered.join(' ') : normalized;
}

/**
 * Extracts non-generic core tokens from a shop name.
 */
export function getCoreTokens(name: string): string[] {
  const brandName = getCoreBrandName(name);
  if (!brandName) return [];
  return brandName.split(' ');
}

/**
 * Computes Levenshtein Distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Computes Levenshtein similarity ratio between 0 and 1.
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeShopName(str1);
  const s2 = normalizeShopName(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLength;
}

/**
 * Calculates Token Set Jaccard similarity between two token arrays.
 */
export function tokenSimilarity(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersectionCount = 0;
  set1.forEach(t => {
    if (set2.has(t)) {
      intersectionCount++;
    } else {
      // Check fuzzy match for individual tokens
      for (const t2 of set2) {
        if (stringSimilarity(t, t2) > 0.82) {
          intersectionCount += 0.9;
          break;
        }
      }
    }
  });

  const unionSize = set1.size + set2.size - intersectionCount;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

/**
 * Checks if a search result salon matches an existing client in the database.
 * Enforces strict scope:
 * 1. Phone match takes precedence (if phones exist and match -> 100%, if phones exist and mismatch -> NO match).
 * 2. Brand name similarity is calculated on CORE BRAND TOKENS ONLY (ignoring generic words like 'cosmetic').
 * 3. Requires strict >= 0.78 core similarity threshold.
 */
export function matchSalonToClient(
  salon: { name: string; address?: string; phone?: string | null; lat?: number; lng?: number },
  clients: Client[]
): { isClient: boolean; matchedClient?: Client; matchConfidence: number } {
  if (!salon || !salon.name || !clients || clients.length === 0) {
    return { isClient: false, matchConfidence: 0 };
  }

  const salonBrandName = getCoreBrandName(salon.name);
  const salonTokens = getCoreTokens(salon.name);
  const cleanSalonPhone = salon.phone ? salon.phone.replace(/\D/g, '').slice(-10) : '';

  let bestMatch: Client | undefined = undefined;
  let highestScore = 0;

  for (const client of clients) {
    const cleanClientPhone = client.phone ? client.phone.replace(/\D/g, '').slice(-10) : '';

    // 1. Phone number comparison
    if (cleanSalonPhone && cleanClientPhone) {
      if (cleanSalonPhone === cleanClientPhone) {
        return { isClient: true, matchedClient: client, matchConfidence: 1.0 };
      }
      // If both have phones and they differ, do not match across different phone numbers!
      continue;
    }

    // 2. Core Brand Name Similarity (Stripped of generic stopwords)
    const clientShopBrand = getCoreBrandName(client.shopName);
    const clientNameBrand = getCoreBrandName(client.clientName);

    // Exact core brand match (e.g. "dhanshree" === "dhanshree")
    if (salonBrandName && (salonBrandName === clientShopBrand || salonBrandName === clientNameBrand)) {
      return { isClient: true, matchedClient: client, matchConfidence: 1.0 };
    }

    const brandSimShop = stringSimilarity(salonBrandName, clientShopBrand);
    const brandSimClient = stringSimilarity(salonBrandName, clientNameBrand);

    const tokenSimShop = tokenSimilarity(salonTokens, getCoreTokens(client.shopName));
    const tokenSimClient = tokenSimilarity(salonTokens, getCoreTokens(client.clientName));

    let score = Math.max(brandSimShop, brandSimClient, tokenSimShop, tokenSimClient);

    // Location / City alignment boost ONLY if core brand similarity is already high (>= 0.75)
    if (score >= 0.75 && salon.address && (client.cityArea || client.district)) {
      const addrNorm = normalizeShopName(salon.address);
      const cityNorm = normalizeShopName(client.cityArea || '');
      if (cityNorm && addrNorm.includes(cityNorm)) {
        score += 0.05;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = client;
    }
  }

  // Strict threshold (0.78+)
  const isMatch = highestScore >= 0.78;

  return {
    isClient: isMatch,
    matchedClient: isMatch ? bestMatch : undefined,
    matchConfidence: highestScore
  };
}
