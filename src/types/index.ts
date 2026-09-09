export type BusinessCategory = 
  | 'Cosmetics Wholesaler' 
  | 'Cosmetics Distributor' 
  | 'Beauty Product Supplier' 
  | 'Cosmetics Store & Dealer' 
  | 'Other Wholesale / Dealer';

export interface Salon {
  id: string;
  name: string;
  phone: string | null;
  address: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  category: BusinessCategory | string;
  latitude: number;
  longitude: number;
  source: string;
  mapUrl: string;
  website: string | null;
  isClient?: boolean;
  matchedClient?: Client;
}

export interface SearchResponse {
  query: string;
  count: number;
  source: string;
  cached: boolean;
  retrievedAt: number;
  searchArea: string;
  searchRadiusKm: number;
  results: Salon[];
}

export interface Client {
  id: string;
  clientName: string;
  shopName: string;
  phone: string;
  state: string;
  district: string;
  cityArea: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  title: string;
  messageText: string;
  websiteUrl: string;
  imageUrl?: string;
}


