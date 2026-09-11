import { createClient } from '@supabase/supabase-js';
import type { Client } from '../types';

const supabaseUrl =
  (import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  'https://phsjahowbgnwitoqrqxy.supabase.co';

const supabaseAnonKey =
  (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoc2phaG93Ymdud2l0b3FycXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMTI0NTksImV4cCI6MjEwNDY4ODQ1OX0.1Kff30jMesNUglbhoT8SkPCWGys8578uE27jCaKFGk0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Maps Supabase DB row (snake_case) to Client type (camelCase).
 */
export function mapRowToClient(row: any): Client {
  return {
    id: row.id,
    clientName: row.client_name || row.clientName || '',
    shopName: row.shop_name || row.shopName || '',
    phone: row.phone || '',
    state: row.state || 'Maharashtra',
    district: row.district || '',
    cityArea: row.city_area || row.cityArea || '',
    latitude: Number(row.latitude || 19.7515),
    longitude: Number(row.longitude || 75.7139),
    createdAt: row.created_at || row.createdAt || new Date().toISOString()
  };
}

/**
 * Maps Client type (camelCase) to Supabase DB payload (snake_case).
 */
export function mapClientToRow(client: Partial<Client>): any {
  return {
    id: client.id,
    client_name: client.clientName,
    shop_name: client.shopName,
    phone: client.phone || '',
    state: client.state || 'Maharashtra',
    district: client.district,
    city_area: client.cityArea || '',
    latitude: client.latitude ? Number(client.latitude) : 19.7515,
    longitude: client.longitude ? Number(client.longitude) : 75.7139,
    created_at: client.createdAt || new Date().toISOString()
  };
}

/**
 * Fetches all clients from Supabase database.
 */
export async function fetchClientsFromSupabase(): Promise<Client[] | null> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Error fetching clients:', error.message);
      return null;
    }

    if (!data) return [];
    return data.map(mapRowToClient);
  } catch (err: any) {
    console.warn('[Supabase] Exception fetching clients:', err.message);
    return null;
  }
}

/**
 * Saves (inserts or updates) a client in Supabase database.
 */
export async function saveClientToSupabase(client: Client): Promise<Client | null> {
  try {
    const row = mapClientToRow(client);
    const { data, error } = await supabase
      .from('clients')
      .upsert([row], { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('[Supabase] Error saving client:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return mapRowToClient(data[0]);
    }
    return client;
  } catch (err: any) {
    console.warn('[Supabase] Exception saving client:', err.message);
    return null;
  }
}

/**
 * Deletes a client from Supabase database.
 */
export async function deleteClientFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[Supabase] Error deleting client:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Exception deleting client:', err.message);
    return false;
  }
}
