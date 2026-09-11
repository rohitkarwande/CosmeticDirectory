import type { Client } from '../types';
import {
  fetchClientsFromSupabase,
  saveClientToSupabase,
  deleteClientFromSupabase
} from './supabaseClient';

const LOCAL_STORAGE_CLIENTS_KEY = 'salonfinder_saved_clients';
const LOCAL_STORAGE_DELETED_KEY = 'salonfinder_deleted_client_ids';

/**
 * Retrieves clients saved in browser localStorage.
 */
export function getLocalClients(): Client[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to read clients from localStorage:', err);
    return [];
  }
}

/**
 * Saves clients list to browser localStorage.
 */
export function saveLocalClients(clients: Client[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(clients));
  } catch (err) {
    console.warn('Failed to save clients to localStorage:', err);
  }
}

/**
 * Tracks locally deleted client IDs.
 */
export function getDeletedClientIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return new Set(ids);
  } catch (err) {
    return new Set();
  }
}

/**
 * Adds a deleted client ID to local blacklist.
 */
export function recordDeletedClientId(id: string): void {
  try {
    const deletedSet = getDeletedClientIds();
    deletedSet.add(id);
    localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(deletedSet)));
  } catch (err) {
    console.warn('Failed to record deleted client ID:', err);
  }
}

/**
 * Main fetch function: Loads from Supabase Cloud DB, falls back to localStorage if offline.
 */
export async function loadClients(): Promise<Client[]> {
  const supabaseData = await fetchClientsFromSupabase();

  if (supabaseData !== null) {
    // Supabase query succeeded!
    saveLocalClients(supabaseData);
    return supabaseData;
  }

  // Fallback to local storage if network or Supabase is unavailable
  const local = getLocalClients();
  const deletedIds = getDeletedClientIds();
  return local.filter(c => !deletedIds.has(c.id));
}

/**
 * Synchronizes clients received from API with locally stored additions and deletions.
 */
export function syncClientsWithStorage(apiClients: Client[]): Client[] {
  const deletedIds = getDeletedClientIds();
  const localClients = getLocalClients();

  const validApiClients = apiClients.filter(c => !deletedIds.has(c.id));
  const apiIdSet = new Set(validApiClients.map(c => c.id));
  const uniqueLocalClients = localClients.filter(c => !apiIdSet.has(c.id) && !deletedIds.has(c.id));

  const combined = [...uniqueLocalClients, ...validApiClients];
  saveLocalClients(combined);
  return combined;
}

/**
 * Saves or updates a client record in Supabase Cloud DB and local storage.
 */
export async function addOrUpdateClient(client: Client): Promise<Client[]> {
  // Update local storage immediately for fast UI rendering
  const current = getLocalClients();
  const index = current.findIndex(c => c.id === client.id);
  let updated: Client[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = client;
  } else {
    updated = [client, ...current];
  }
  saveLocalClients(updated);

  // Sync to Supabase Cloud DB asynchronously
  saveClientToSupabase(client).catch(err => {
    console.warn('[Supabase Sync] Error saving client to cloud:', err);
  });

  return updated;
}

/**
 * Removes a client from Supabase Cloud DB and local storage.
 */
export async function removeClient(id: string): Promise<Client[]> {
  recordDeletedClientId(id);
  const current = getLocalClients();
  const filtered = current.filter(c => c.id !== id);
  saveLocalClients(filtered);

  // Sync to Supabase Cloud DB asynchronously
  deleteClientFromSupabase(id).catch(err => {
    console.warn('[Supabase Sync] Error deleting client from cloud:', err);
  });

  return filtered;
}

// Backward compatibility exports
export const addOrUpdateLocalClient = addOrUpdateClient;
export const removeLocalClient = removeClient;
