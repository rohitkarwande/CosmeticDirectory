import { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  MapPin,
  Search,
  Phone,
  Trash2,
  Edit2,
  Building2,
  Map as MapIcon,
  List,
  Sparkles,
  RefreshCw,
  Users,
  CheckCircle2
} from 'lucide-react';
import type { Client } from '../types';
import { ClientMap } from './ClientMap';
import { ClientFormModal } from './ClientFormModal';
import { STATES_AND_DISTRICTS } from '../data/statesAndDistricts';

export function ClientManagementView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);


  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to determine API URL
  const getApiBaseUrl = () => {
    const customBase = import.meta.env.VITE_API_BASE_URL;
    if (customBase) return customBase;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:5000' : '';
  };

  // Fetch all clients from backend API
  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients`);
      if (!res.ok) throw new Error('Failed to fetch client database.');
      const data = await res.json();
      setClients(data);
    } catch (err: any) {
      console.error('Fetch clients error:', err);
      setError(err.message || 'Error connecting to client database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Filter clients based on district & search term
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesDistrict = selectedDistrict === 'All' || client.district === selectedDistrict;
      const matchesState = !selectedState || client.state === selectedState;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        client.clientName.toLowerCase().includes(q) ||
        client.shopName.toLowerCase().includes(q) ||
        client.district.toLowerCase().includes(q) ||
        (client.cityArea && client.cityArea.toLowerCase().includes(q)) ||
        (client.phone && client.phone.includes(q));

      return matchesDistrict && matchesState && matchesSearch;
    });
  }, [clients, selectedDistrict, selectedState, searchTerm]);

  // Active district metrics
  const activeDistrictsCount = useMemo(() => {
    const districtsSet = new Set<string>();
    clients.forEach(c => {
      if (c.district) districtsSet.add(c.district);
    });
    return districtsSet.size;
  }, [clients]);

  // Handle Save Client (Add / Edit)
  const handleSaveClient = async (clientData: Partial<Client>) => {
    const apiBase = getApiBaseUrl();
    if (editingClient) {
      // Update existing
      const res = await fetch(`${apiBase}/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      if (!res.ok) throw new Error('Failed to update client.');
      const updated = await res.json();
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
      showToast(`Updated "${updated.shopName}" client record.`);
    } else {
      // Create new
      const res = await fetch(`${apiBase}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      if (!res.ok) throw new Error('Failed to create client.');
      const newClient = await res.json();
      setClients(prev => [newClient, ...prev]);
      showToast(`Added client "${newClient.shopName}" to ${newClient.district} district!`);
    }
  };

  // Handle Delete Client
  const handleDeleteClient = async (id: string, shopName: string) => {
    if (!window.confirm(`Are you sure you want to delete client record for "${shopName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete client.');
      setClients(prev => prev.filter(c => c.id !== id));
      showToast(`Client record for "${shopName}" removed.`);
    } catch (err: any) {
      alert(err.message || 'Error deleting client record.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[1000] flex items-center gap-2 px-4 py-3 bg-cyan-900/90 text-cyan-100 border border-cyan-500/50 rounded-xl shadow-2xl backdrop-blur-md animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Banner & Stats */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Owner Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Maharashtra Map
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Client Network Directory & Map
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Add your clients and visualize their exact shop locations across Maharashtra's 36 districts.
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Quick Stats Cards */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">{clients.length}</div>
                <div className="text-[11px] font-medium text-slate-500">Total Clients</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">
                  {activeDistrictsCount} / {selectedState !== 'All' && STATES_AND_DISTRICTS[selectedState] ? STATES_AND_DISTRICTS[selectedState].districts.length : Object.values(STATES_AND_DISTRICTS).reduce((acc, s) => acc + s.districts.length, 0)}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {selectedState === 'All' ? 'Districts Covered' : `${selectedState} Districts`}
                </div>
              </div>
            </div>

            {/* Add Client Action Button */}
            <button
              onClick={() => {
                setEditingClient(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-xs hover:scale-[1.02] transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Client</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search client, shop, place, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 font-medium"
          />
        </div>

        {/* State & District Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* State Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">State:</span>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('All');
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 font-medium cursor-pointer"
            >
              <option value="All">All States</option>
              {Object.keys(STATES_AND_DISTRICTS).map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 font-medium cursor-pointer"
            >
              <option value="All">All Districts</option>
              {(STATES_AND_DISTRICTS[selectedState]?.districts || Object.values(STATES_AND_DISTRICTS).flatMap(s => s.districts)).map(d => {
                const count = clients.filter(c => c.district === d).length;
                return (
                  <option key={d} value={d}>
                    {d} {count > 0 ? `(${count})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Reset Filters */}
          {(selectedDistrict !== 'All' || selectedState !== 'Maharashtra' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedState('Maharashtra');
                setSelectedDistrict('All');
                setSearchTerm('');
              }}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              title="Reset Filters"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area: Map + Client List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Leaflet Maharashtra District Map (7 Columns on LG) */}
        <div className="lg:col-span-7 w-full h-[540px] flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-brand-600" />
              <span>{selectedState === 'All' ? 'India' : selectedState} District Map</span>
            </h3>
            {selectedDistrict !== 'All' && (
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                Viewing: {selectedDistrict} District
              </span>
            )}
          </div>
          <ClientMap
            clients={filteredClients}
            selectedDistrict={selectedDistrict}
            selectedState={selectedState}
            onSelectDistrict={(dName) => {
              setSelectedDistrict(dName);
              setSelectedClientId(null);
            }}
            onSelectClient={(client) => {
              setSelectedDistrict(client.district);
              setSelectedClientId(client.id);
            }}
          />
        </div>

        {/* Right Column: Client List Cards (5 Columns on LG) */}
        <div className="lg:col-span-5 w-full h-[540px] flex flex-col bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <List className="w-4 h-4 text-indigo-600" />
              <span>Clients ({filteredClients.length})</span>
            </h3>
            {selectedDistrict !== 'All' && (
              <button
                onClick={() => {
                  setSelectedDistrict('All');
                  setSelectedClientId(null);
                }}
                className="text-xs text-brand-600 hover:underline font-semibold"
              >
                Show All Districts
              </button>
            )}
          </div>

          {/* Client List Container */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
                <span className="text-xs font-medium">Loading clients...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 border border-dashed border-slate-200 rounded-xl">
                <Building2 className="w-10 h-10 text-slate-400 mb-3" />
                <h4 className="text-base font-bold text-slate-700 mb-1">No Clients Found</h4>
                <p className="text-xs text-slate-400 mb-4 max-w-xs">
                  {searchTerm || selectedDistrict !== 'All'
                    ? 'No clients match your search or selected district.'
                    : 'You haven\'t added any clients yet.'}
                </p>
                <button
                  onClick={() => {
                    setEditingClient(null);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-all"
                >
                  + Add First Client
                </button>
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelectedPin = client.id === selectedClientId;
                return (
                  <div
                    key={client.id}
                    className={`group relative p-3.5 rounded-xl transition-all shadow-2xs ${
                      isSelectedPin
                        ? 'bg-slate-50 border-2 border-brand-500 shadow-xs'
                        : 'bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-brand-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-800 group-hover:text-brand-600 transition-colors flex items-center gap-2">
                          <span>{client.shopName}</span>
                          {isSelectedPin && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase rounded bg-brand-500 text-white">
                              Selected Pin
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{client.clientName}</span>
                        </div>
                      </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingClient(client);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Client"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id, client.shopName)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Location & Contact Info */}
                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      <span className="font-semibold text-slate-700 shrink-0">{client.district}</span>
                      {client.cityArea && (
                        <>
                          <span>•</span>
                          <span className="truncate">{client.cityArea}</span>
                        </>
                      )}
                    </div>

                    {client.phone && (
                      <a
                        href={`tel:${client.phone}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{client.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClient}
        initialClient={editingClient}
      />
    </div>
  );
}
