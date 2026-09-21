import { STATES_AND_DISTRICTS } from '../data/statesAndDistricts';
import type { Salon } from '../types';

/**
 * Checks if a given district name is valid for a given state in the registry.
 */
export function isValidDistrict(stateName: string, districtName: string): boolean {
  if (!stateName || !districtName) return false;
  const stateConfig = STATES_AND_DISTRICTS[stateName];
  if (!stateConfig) return false;
  return stateConfig.districts.some(
    d => d.toLowerCase() === districtName.toLowerCase().trim()
  );
}

/**
 * Finds the exact matching district name from STATES_AND_DISTRICTS registry.
 */
export function findMatchingDistrict(stateName: string, districtInput: string): string | null {
  if (!stateName || !districtInput) return null;
  const stateConfig = STATES_AND_DISTRICTS[stateName];
  if (!stateConfig) return null;

  const targetLower = districtInput.toLowerCase().trim();
  
  // Exact match
  const exact = stateConfig.districts.find(d => d.toLowerCase() === targetLower);
  if (exact) return exact;

  // Partial match
  const partial = stateConfig.districts.find(
    d => d.toLowerCase().includes(targetLower) || targetLower.includes(d.toLowerCase())
  );
  return partial || null;
}

/**
 * Comprehensive dictionary of Indian towns, cities, suburbs, and localities mapped to State & District.
 */
const LOCAL_PLACE_TO_DISTRICT_MAP: Record<string, { state: string; district: string }> = {
  // Jalgaon District
  'chalisgaon': { state: 'Maharashtra', district: 'Jalgaon' },
  'chalishgaon': { state: 'Maharashtra', district: 'Jalgaon' },
  'bhusawal': { state: 'Maharashtra', district: 'Jalgaon' },
  'bhusaval': { state: 'Maharashtra', district: 'Jalgaon' },
  'pachora': { state: 'Maharashtra', district: 'Jalgaon' },
  'chopda': { state: 'Maharashtra', district: 'Jalgaon' },
  'amalner': { state: 'Maharashtra', district: 'Jalgaon' },
  'jamner': { state: 'Maharashtra', district: 'Jalgaon' },
  'yawal': { state: 'Maharashtra', district: 'Jalgaon' },
  'erandol': { state: 'Maharashtra', district: 'Jalgaon' },
  'parola': { state: 'Maharashtra', district: 'Jalgaon' },
  'raver': { state: 'Maharashtra', district: 'Jalgaon' },
  'jalgaon': { state: 'Maharashtra', district: 'Jalgaon' },

  // Solapur District
  'tembhurni': { state: 'Maharashtra', district: 'Solapur' },
  'pandharpur': { state: 'Maharashtra', district: 'Solapur' },
  'solapur': { state: 'Maharashtra', district: 'Solapur' },
  'sholapur': { state: 'Maharashtra', district: 'Solapur' },
  'barshi': { state: 'Maharashtra', district: 'Solapur' },
  'sangola': { state: 'Maharashtra', district: 'Solapur' },
  'kurduwadi': { state: 'Maharashtra', district: 'Solapur' },
  'karmala': { state: 'Maharashtra', district: 'Solapur' },
  'akkalkot': { state: 'Maharashtra', district: 'Solapur' },
  'mangalwedha': { state: 'Maharashtra', district: 'Solapur' },
  'mohol': { state: 'Maharashtra', district: 'Solapur' },

  // Palghar District
  'virar': { state: 'Maharashtra', district: 'Palghar' },
  'vasai': { state: 'Maharashtra', district: 'Palghar' },
  'palghar': { state: 'Maharashtra', district: 'Palghar' },
  'nalasopara': { state: 'Maharashtra', district: 'Palghar' },
  'nallasopara': { state: 'Maharashtra', district: 'Palghar' },
  'kaman': { state: 'Maharashtra', district: 'Palghar' },
  'sativali': { state: 'Maharashtra', district: 'Palghar' },
  'dahanu': { state: 'Maharashtra', district: 'Palghar' },
  'jawhar': { state: 'Maharashtra', district: 'Palghar' },
  'wada': { state: 'Maharashtra', district: 'Palghar' },
  'boisar': { state: 'Maharashtra', district: 'Palghar' },
  'manor': { state: 'Maharashtra', district: 'Palghar' },

  // Mumbai Suburban
  'andheri': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'bandra': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'borivali': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'malad': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'juhu': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'powai': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'kurla': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'ghatkopar': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'kandivali': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'goregaon': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'santacruz': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'vile parle': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'dahisar': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'chembur': { state: 'Maharashtra', district: 'Mumbai Suburban' },
  'mulund': { state: 'Maharashtra', district: 'Mumbai Suburban' },

  // Mumbai City
  'dadar': { state: 'Maharashtra', district: 'Mumbai City' },
  'colaba': { state: 'Maharashtra', district: 'Mumbai City' },
  'marine lines': { state: 'Maharashtra', district: 'Mumbai City' },
  'mumbai': { state: 'Maharashtra', district: 'Mumbai City' },
  'byculla': { state: 'Maharashtra', district: 'Mumbai City' },
  'parel': { state: 'Maharashtra', district: 'Mumbai City' },
  'worli': { state: 'Maharashtra', district: 'Mumbai City' },
  'girgaon': { state: 'Maharashtra', district: 'Mumbai City' },

  // Thane District
  'thane': { state: 'Maharashtra', district: 'Thane' },
  'kalyan': { state: 'Maharashtra', district: 'Thane' },
  'dombivli': { state: 'Maharashtra', district: 'Thane' },
  'navi mumbai': { state: 'Maharashtra', district: 'Thane' },
  'vashi': { state: 'Maharashtra', district: 'Thane' },
  'bhiwandi': { state: 'Maharashtra', district: 'Thane' },
  'mumbra': { state: 'Maharashtra', district: 'Thane' },
  'kalwa': { state: 'Maharashtra', district: 'Thane' },
  'ulhasnagar': { state: 'Maharashtra', district: 'Thane' },
  'ambernath': { state: 'Maharashtra', district: 'Thane' },
  'badlapur': { state: 'Maharashtra', district: 'Thane' },

  // Pune District
  'kothrud': { state: 'Maharashtra', district: 'Pune' },
  'hinjawadi': { state: 'Maharashtra', district: 'Pune' },
  'hinjewadi': { state: 'Maharashtra', district: 'Pune' },
  'baner': { state: 'Maharashtra', district: 'Pune' },
  'wakad': { state: 'Maharashtra', district: 'Pune' },
  'hadapsar': { state: 'Maharashtra', district: 'Pune' },
  'viman nagar': { state: 'Maharashtra', district: 'Pune' },
  'pune': { state: 'Maharashtra', district: 'Pune' },
  'pimpri': { state: 'Maharashtra', district: 'Pune' },
  'chinchwad': { state: 'Maharashtra', district: 'Pune' },
  'baramati': { state: 'Maharashtra', district: 'Pune' },
  'lonavala': { state: 'Maharashtra', district: 'Pune' },
  'chakan': { state: 'Maharashtra', district: 'Pune' },
  'shirur': { state: 'Maharashtra', district: 'Pune' },
  'daund': { state: 'Maharashtra', district: 'Pune' },
  'indapur': { state: 'Maharashtra', district: 'Pune' },
  'bhosari': { state: 'Maharashtra', district: 'Pune' },

  // Nashik District
  'nashik': { state: 'Maharashtra', district: 'Nashik' },
  'nasik': { state: 'Maharashtra', district: 'Nashik' },
  'panchavati': { state: 'Maharashtra', district: 'Nashik' },
  'malegaon': { state: 'Maharashtra', district: 'Nashik' },
  'sinnar': { state: 'Maharashtra', district: 'Nashik' },
  'igatpuri': { state: 'Maharashtra', district: 'Nashik' },
  'yeola': { state: 'Maharashtra', district: 'Nashik' },

  // Chhatrapati Sambhajinagar
  'chhatrapati sambhajinagar': { state: 'Maharashtra', district: 'Chhatrapati Sambhajinagar' },
  'aurangabad': { state: 'Maharashtra', district: 'Chhatrapati Sambhajinagar' },
  'paithan': { state: 'Maharashtra', district: 'Chhatrapati Sambhajinagar' },
  'sillod': { state: 'Maharashtra', district: 'Chhatrapati Sambhajinagar' },

  // Ahilyanagar
  'ahmednagar': { state: 'Maharashtra', district: 'Ahilyanagar' },
  'ahilyanagar': { state: 'Maharashtra', district: 'Ahilyanagar' },
  'shrirampur': { state: 'Maharashtra', district: 'Ahilyanagar' },
  'sangamner': { state: 'Maharashtra', district: 'Ahilyanagar' },
  'shirdi': { state: 'Maharashtra', district: 'Ahilyanagar' },

  // Satara, Kolhapur, Sangli, Ratnagiri
  'satara': { state: 'Maharashtra', district: 'Satara' },
  'karad': { state: 'Maharashtra', district: 'Satara' },
  'wai': { state: 'Maharashtra', district: 'Satara' },
  'phaltan': { state: 'Maharashtra', district: 'Satara' },
  'kolhapur': { state: 'Maharashtra', district: 'Kolhapur' },
  'ichalkaranji': { state: 'Maharashtra', district: 'Kolhapur' },
  'sangli': { state: 'Maharashtra', district: 'Sangli' },
  'miraj': { state: 'Maharashtra', district: 'Sangli' },
  'ratnagiri': { state: 'Maharashtra', district: 'Ratnagiri' },
  'chiplun': { state: 'Maharashtra', district: 'Ratnagiri' },

  // Latur, Nanded, Amravati, Akola, Nagpur
  'latur': { state: 'Maharashtra', district: 'Latur' },
  'nanded': { state: 'Maharashtra', district: 'Nanded' },
  'amravati': { state: 'Maharashtra', district: 'Amravati' },
  'akola': { state: 'Maharashtra', district: 'Akola' },
  'nagpur': { state: 'Maharashtra', district: 'Nagpur' },
  'dharampeth': { state: 'Maharashtra', district: 'Nagpur' },
  'sadar': { state: 'Maharashtra', district: 'Nagpur' },

  // Gujarat
  'surat': { state: 'Gujarat', district: 'Surat' },
  'ahmedabad': { state: 'Gujarat', district: 'Ahmedabad' },
  'vadodara': { state: 'Gujarat', district: 'Vadodara' },
  'baroda': { state: 'Gujarat', district: 'Vadodara' },
  'rajkot': { state: 'Gujarat', district: 'Rajkot' },
  'gandhinagar': { state: 'Gujarat', district: 'Gandhinagar' },

  // Karnataka
  'bengaluru': { state: 'Karnataka', district: 'Bengaluru Urban' },
  'bangalore': { state: 'Karnataka', district: 'Bengaluru Urban' },
  'vijayapura': { state: 'Karnataka', district: 'Vijayapura' },
  'vijaypur': { state: 'Karnataka', district: 'Vijayapura' },
  'bijapur': { state: 'Karnataka', district: 'Vijayapura' },
  'belagavi': { state: 'Karnataka', district: 'Belagavi' },
  'belgaum': { state: 'Karnataka', district: 'Belagavi' },
  'hubballi': { state: 'Karnataka', district: 'Dharwad' },
  'hubli': { state: 'Karnataka', district: 'Dharwad' },
  'mysuru': { state: 'Karnataka', district: 'Mysuru' },

  // Goa
  'mapusa': { state: 'Goa', district: 'North Goa' },
  'mapuca': { state: 'Goa', district: 'North Goa' },
  'panaji': { state: 'Goa', district: 'North Goa' },
  'panjim': { state: 'Goa', district: 'North Goa' },
  'margao': { state: 'Goa', district: 'South Goa' },
  'madgaon': { state: 'Goa', district: 'South Goa' },
  'vasco': { state: 'Goa', district: 'South Goa' },

  // Delhi
  'delhi': { state: 'Delhi', district: 'Central Delhi' },
  'new delhi': { state: 'Delhi', district: 'New Delhi' }
};

/**
 * Resolves the exact State and District for a salon, ensuring it is properly allocated
 * to an official district in STATES_AND_DISTRICTS.
 */
export async function resolveStateAndDistrict(
  salon: Partial<Salon>,
  searchQuery?: string,
  apiBaseUrl?: string
): Promise<{ state: string; district: string }> {
  // 1. Check if salon already has valid state & district in registry
  if (salon.state && salon.district) {
    const matchedState = Object.keys(STATES_AND_DISTRICTS).find(
      st => st.toLowerCase() === salon.state!.toLowerCase().trim()
    );
    if (matchedState) {
      const matchedDistrict = findMatchingDistrict(matchedState, salon.district);
      if (matchedDistrict) {
        return { state: matchedState, district: matchedDistrict };
      }
    }
  }

  // 2. Build list of potential location string tokens to check against local map
  const locationCandidates = [
    salon.district,
    salon.area,
    salon.city,
    searchQuery,
    salon.address
  ].filter((c): c is string => Boolean(c && c.trim().length > 0));

  for (const candidate of locationCandidates) {
    const norm = candidate.toLowerCase().trim();
    
    // Check exact key match
    if (LOCAL_PLACE_TO_DISTRICT_MAP[norm]) {
      return LOCAL_PLACE_TO_DISTRICT_MAP[norm];
    }

    // Check substring match
    for (const [key, mapping] of Object.entries(LOCAL_PLACE_TO_DISTRICT_MAP)) {
      if (norm.includes(key) || key.includes(norm)) {
        return mapping;
      }
    }
  }

  // 3. Fallback to API geocode resolution if candidates didn't match local dictionary
  const targetPlace = salon.area || salon.city || salon.district || searchQuery || salon.address;
  if (targetPlace) {
    try {
      const base = apiBaseUrl || (import.meta.env.VITE_API_BASE_URL || '');
      const res = await fetch(`${base}/api/geocode-place?place=${encodeURIComponent(targetPlace)}&state=${encodeURIComponent(salon.state || 'Maharashtra')}`);
      if (res.ok) {
        const data = await res.json();
        if (data.district) {
          const stateName = data.state && STATES_AND_DISTRICTS[data.state] ? data.state : (salon.state || 'Maharashtra');
          const matchedDistrict = findMatchingDistrict(stateName, data.district) || data.district;
          return { state: stateName, district: matchedDistrict };
        }
      }
    } catch (err) {
      console.warn('[DistrictResolver] Geocode API resolution failed:', err);
    }
  }

  // 4. Default fallback
  const defaultState = salon.state || 'Maharashtra';
  const defaultDistrict = (STATES_AND_DISTRICTS[defaultState]?.districts[0]) || 'Pune';
  return { state: defaultState, district: defaultDistrict };
}
