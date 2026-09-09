import { useState, useMemo, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { ProgressIndicator } from './components/ProgressIndicator';
import { StatsCards } from './components/StatsCards';
import { FiltersSection } from './components/FiltersSection';
import { SalonsTable } from './components/SalonsTable';
import { Disclaimer } from './components/Disclaimer';
import { ClientManagementView } from './components/ClientManagementView';
import { matchSalonToClient } from './utils/clientMatcher';
import type { SearchResponse, Client } from './types';
import { ArrowLeft, Copy, RefreshCw, Sparkles, Check, Database, Eye, MapPin, Search } from 'lucide-react';


function App() {
  const [appTab, setAppTab] = useState<'search' | 'clients'>('search');
  const [view, setView] = useState<'home' | 'results'>('home');
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [phoneFilter, setPhoneFilter] = useState<'All' | 'Has Phone' | 'No Phone'>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'Google Places' | 'OpenStreetMap' | 'TomTom'>('All');
  const [verificationFilter, setVerificationFilter] = useState<'All' | 'Phone Available' | 'Address Available'>('All');
  const [clientFilter, setClientFilter] = useState<'All' | 'Existing Clients Only' | 'Potential Leads Only'>('All');

  // Helper to determine API URL
  const getApiBaseUrl = () => {
    const customBase = import.meta.env.VITE_API_BASE_URL;
    if (customBase) return customBase;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:5000' : '';
  };
  
  // Toast Alert State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch client list from backend
  const fetchClients = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error('Failed to fetch registered client list:', err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const getApiUrl = (location: string, refresh = false) => {
    const base = getApiBaseUrl();
    return `${base}/api/search?location=${encodeURIComponent(location)}${refresh ? '&refresh=true' : ''}`;
  };

  const handleSearch = async (locationQuery: string, forceRefresh = false) => {
    if (!locationQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setProgressStage(0);
    setQuery(locationQuery);

    // Refresh client list before performing search
    await fetchClients();

    // Progressive loader animation
    let currentStage = 0;
    const progressInterval = setInterval(() => {
      if (currentStage < 4) {
        currentStage++;
        setProgressStage(currentStage);
      }
    }, 400);

    try {
      const response = await fetch(getApiUrl(locationQuery, forceRefresh));
      const data = await response.json();

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch salons. Please try again.');
      }

      // Finish progress animation
      setProgressStage(5);
      
      // Delay slightly for the user to see the success checkmarks
      setTimeout(() => {
        setSearchResult(data);
        setView('results');
        setIsLoading(false);
        // Reset filters when a new search succeeds
        setSearchTerm('');
        setSelectedCategory('All');
        setPhoneFilter('All');
        setSourceFilter('All');
        setVerificationFilter('All');
        setClientFilter('All');
      }, 500);

    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || 'Live data source is temporarily offline. Please try again.');
      setIsLoading(false);
    }
  };

  // Process search results to attach isClient and matchedClient dynamically using fuzzy matching
  const processedResults = useMemo(() => {
    if (!searchResult) return [];
    return searchResult.results.map((salon) => {
      const matchResult = matchSalonToClient(salon, clients);
      return {
        ...salon,
        isClient: matchResult.isClient,
        matchedClient: matchResult.matchedClient
      };
    });
  }, [searchResult, clients]);

  // Get distinct categories present in the results to fill dropdown dynamically
  const availableCategories = useMemo(() => {
    if (!searchResult) return [];
    const cats = new Set<string>();
    processedResults.forEach(s => cats.add(s.category));
    return Array.from(cats).sort();
  }, [processedResults, searchResult]);

  // Reactively filter and sort results in memory (Existing clients & phone available first)
  const filteredSalons = useMemo(() => {
    if (!processedResults) return [];
    return processedResults.filter((salon) => {
      // 1. Text search filter
      if (searchTerm.trim()) {
        const queryLower = searchTerm.toLowerCase();
        const matchesName = salon.name.toLowerCase().includes(queryLower);
        const matchesAddress = salon.address.toLowerCase().includes(queryLower);
        const matchesCity = salon.city.toLowerCase().includes(queryLower);
        const matchesArea = salon.area.toLowerCase().includes(queryLower);
        const matchesPhone = salon.phone ? salon.phone.includes(queryLower) : false;
        const matchesClientName = salon.matchedClient ? salon.matchedClient.clientName.toLowerCase().includes(queryLower) : false;
        
        if (!matchesName && !matchesAddress && !matchesCity && !matchesArea && !matchesPhone && !matchesClientName) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'All' && salon.category !== selectedCategory) {
        return false;
      }

      // 3. Phone Filter
      if (phoneFilter === 'Has Phone' && !salon.phone) return false;
      if (phoneFilter === 'No Phone' && salon.phone) return false;

      // 4. Source Filter
      if (sourceFilter !== 'All' && salon.source !== sourceFilter) return false;

      // 5. Verification / Completeness Filter
      if (verificationFilter === 'Phone Available' && !salon.phone) return false;
      if (verificationFilter === 'Address Available' && (!salon.address || salon.address.length < 5)) return false;

      // 6. Client Status Filter
      if (clientFilter === 'Existing Clients Only' && !salon.isClient) return false;
      if (clientFilter === 'Potential Leads Only' && salon.isClient) return false;

      return true;
    }).sort((a, b) => {
      // Sort priority: Existing Client first, then Has phone first, then alphabetical by name
      if (a.isClient && !b.isClient) return -1;
      if (!a.isClient && b.isClient) return 1;

      const hasPhoneA = Boolean(a.phone);
      const hasPhoneB = Boolean(b.phone);
      if (hasPhoneA && !hasPhoneB) return -1;
      if (!hasPhoneA && hasPhoneB) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [processedResults, searchTerm, selectedCategory, phoneFilter, sourceFilter, verificationFilter, clientFilter]);

  // Copy phone numbers of filtered items
  const handleCopyPhoneNumbers = () => {
    const phones = filteredSalons
      .map(s => s.phone)
      .filter((p): p is string => !!p);

    if (phones.length === 0) {
      showToast('No phone numbers available to copy');
      return;
    }

    navigator.clipboard.writeText(phones.join('\n'))
      .then(() => {
        showToast(`${phones.length} phone numbers copied`);
      })
      .catch(() => {
        showToast('Clipboard copy failed');
      });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle client status (ON / OFF) and persist to disk via backend API
  const handleToggleClientStatus = async (salon: any) => {
    const baseUrl = getApiBaseUrl();
    
    if (salon.isClient) {
      // Find matching client record in clients list
      const targetClient = clients.find(c =>
        (salon.matchedClient && c.id === salon.matchedClient.id) ||
        c.id === salon.id.replace('saved-', '') ||
        c.shopName.toLowerCase() === salon.name.toLowerCase() ||
        c.clientName.toLowerCase() === salon.name.toLowerCase() ||
        (salon.phone && c.phone && c.phone.replace(/\D/g, '').slice(-10) === salon.phone.replace(/\D/g, '').slice(-10))
      );

      if (targetClient) {
        try {
          const res = await fetch(`${baseUrl}/api/clients/${targetClient.id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setClients(prev => prev.filter(c => c.id !== targetClient.id));
            showToast(`Client status toggled OFF for "${salon.name}"`);
          } else {
            showToast(`Failed to update client status for "${salon.name}"`);
          }
        } catch (err) {
          console.error('Failed to delete client:', err);
          showToast('Error persisting client status change.');
        }
      } else {
        showToast(`Could not locate client record for "${salon.name}"`);
      }
    } else {
      // Create new client record in database
      const newClientPayload = {
        clientName: salon.name,
        shopName: salon.name,
        phone: salon.phone || '',
        state: salon.state || 'Maharashtra',
        district: salon.district || salon.area || 'Unknown',
        cityArea: salon.area || salon.city || '',
        latitude: salon.latitude || 19.7515,
        longitude: salon.longitude || 75.7139,
      };

      try {
        const res = await fetch(`${baseUrl}/api/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newClientPayload),
        });
        if (res.ok) {
          const createdClient = await res.json();
          setClients(prev => [createdClient, ...prev]);
          showToast(`"${salon.name}" marked as Client!`);
        } else {
          showToast(`Failed to mark "${salon.name}" as Client`);
        }
      } catch (err) {
        console.error('Failed to create client:', err);
        showToast('Error persisting client status change.');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div id="toast-banner" className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 border border-slate-800 animate-slide-in">
          <Check size={16} className="text-emerald-400 stroke-[3]" />
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-white/90 border-b border-slate-200/80 py-3.5 px-4 sm:px-6 sticky top-0 z-40 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setAppTab('search'); setView('home'); }}>
            <span className="p-2 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl text-white shadow-sm">
              <Sparkles size={20} />
            </span>
            <div>
              <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                CosmeticSupply
              </span>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand-600 block -mt-1">
                Owner & Trade Portal
              </span>
            </div>
          </div>

          {/* Main App Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setAppTab('search')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                appTab === 'search'
                  ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>CosmeticShop B2B</span>
            </button>

            <button
              onClick={() => setAppTab('clients')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                appTab === 'clients'
                  ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Owner Client Map</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        
        {/* APP TAB 2: OWNER CLIENT MAP & DIRECTORY */}
        {appTab === 'clients' && (
          <ClientManagementView />
        )}

        {/* APP TAB 1: B2B COSMETIC SHOP & WHOLESALER SEARCH */}
        {appTab === 'search' && (
          <>
            {/* VIEW 1: HOME */}
            {view === 'home' && !isLoading && (
              <div className="py-6 sm:py-12 md:py-16 space-y-8 sm:space-y-12 md:space-y-16">
                
                {/* Hero Heading */}
                <div className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto px-2">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight sm:leading-none">
                    Find cosmetics wholesalers & distributors across India
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-2xl mx-auto">
                    Search verified trade leads by city, local area (e.g. Virar, Thane, Kaman, Sativali), suburb or pincode.
                  </p>
                </div>


            {/* Search Box */}
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />

            {/* Error Banner */}
            {error && (
              <div className="max-w-lg mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            {/* Features Info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 pt-4 sm:pt-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500 flex-shrink-0" />
                  Live B2B Data Search
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Queries public geospatial directories in real time for cosmetics wholesalers, distributors, and beauty product suppliers.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  Phone & Address Verification
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Normalizes phone numbers to standard Indian formats (+91) and formats full postal addresses for easy contact.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 sm:col-span-2 md:col-span-1">
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  Bulk Contact Copy
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Copy phone numbers in bulk with one click for easy client outreach and WhatsApp messaging.
                </p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-slate-100/60 rounded-2xl border border-slate-200/60 p-5 sm:p-8 space-y-6">
              <h2 className="text-center font-extrabold text-slate-800 text-xl sm:text-2xl tracking-tight">How it works</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center">
                <div className="space-y-1.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center font-bold text-sm sm:text-base mx-auto border border-brand-100">1</div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Enter Area / City</h4>
                  <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">Provide any area, suburb (Virar, Thane), pincode, or major city.</p>
                </div>
                <div className="space-y-1.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm sm:text-base mx-auto border border-indigo-100">2</div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Real-Time B2B Scan</h4>
                  <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">Geolocates the query and scans for cosmetics wholesalers & suppliers.</p>
                </div>
                <div className="space-y-1.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm sm:text-base mx-auto border border-emerald-100">3</div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Filter & Deduplicate</h4>
                  <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">Cleans data fields and merges duplicate listings across databases.</p>
                </div>
                <div className="space-y-1.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-50 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm sm:text-base mx-auto border border-slate-200">4</div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Connect & Outreach</h4>
                  <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">Copy telephone contacts instantly for WhatsApp campaigns or direct outreach.</p>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <Disclaimer />

          </div>
        )}

        {/* LOADING INDICATOR VIEW */}
        {isLoading && (
          <div className="py-12 md:py-24 space-y-6 text-center">
            <ProgressIndicator stage={progressStage} />
            <p className="text-slate-400 text-sm">Please do not close this window</p>
          </div>
        )}

        {/* VIEW 2: RESULTS DASHBOARD */}
        {view === 'results' && !isLoading && searchResult && (
          <div className="space-y-5 sm:space-y-6">
            
            {/* Navigation back and header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
              <div className="flex items-center gap-3">
                <button
                  id="back-home-btn"
                  onClick={() => setView('home')}
                  className="p-2 sm:p-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs active:scale-95 flex-shrink-0"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
                    {searchResult.query}
                  </h1>
                  <p className="text-slate-400 text-[11px] sm:text-xs mt-0.5 font-semibold flex items-center gap-1">
                    <Database size={12} />
                    Search radius: ~{searchResult.searchRadiusKm} km
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                {/* Cache Info Banner */}
                <div className="col-span-2 sm:col-span-1 text-[11px] font-bold text-slate-500 px-3 py-2 bg-slate-100/90 border border-slate-200/60 rounded-xl flex items-center justify-center sm:justify-start gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${searchResult.cached ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {searchResult.cached ? 'Data cached' : 'Live search'}
                </div>

                {/* Refresh Search */}
                <button
                  id="live-refresh-btn"
                  onClick={() => handleSearch(query, true)}
                  className="px-3 py-2 text-xs sm:text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
                  title="Force Live Update"
                >
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>

                {/* Copy Contacts */}
                <button
                  id="copy-phones-btn"
                  onClick={handleCopyPhoneNumbers}
                  className="px-3 py-2 text-xs sm:text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
                >
                  <Copy size={14} />
                  <span>Copy Phones</span>
                </button>

              </div>
            </div>

            {/* Error Banner in Results */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            {/* Statistics */}
            <StatsCards salons={filteredSalons} />

            {/* Filters panel */}
            <FiltersSection
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              category={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categories={availableCategories}
              phoneFilter={phoneFilter}
              onPhoneFilterChange={setPhoneFilter}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
              verificationFilter={verificationFilter}
              onVerificationFilterChange={setVerificationFilter}
              clientFilter={clientFilter}
              onClientFilterChange={setClientFilter}
            />

            {/* Results Grid / Table */}
            <SalonsTable salons={filteredSalons} onToggleClient={handleToggleClientStatus} />

            {/* Disclaimer */}
            <Disclaimer />

          </div>
        )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs md:text-sm text-slate-400 font-medium">
          <span>&copy; {new Date().getFullYear()} CosmeticSupply Lead Generator. All rights reserved.</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Eye size={14} className="text-slate-300" />
              Privacy Focused - No Trackers
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
