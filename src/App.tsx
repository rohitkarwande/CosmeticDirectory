import { useState, useMemo } from 'react';
import { SearchBar } from './components/SearchBar';
import { ProgressIndicator } from './components/ProgressIndicator';
import { StatsCards } from './components/StatsCards';
import { FiltersSection } from './components/FiltersSection';
import { SalonsTable } from './components/SalonsTable';
import { Disclaimer } from './components/Disclaimer';
import { exportToExcel } from './utils/excel';
import type { SearchResponse } from './types';
import { ArrowLeft, Download, Copy, RefreshCw, Sparkles, Check, Database, Eye } from 'lucide-react';

function App() {
  const [view, setView] = useState<'home' | 'results'>('home');
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [phoneFilter, setPhoneFilter] = useState<'All' | 'Has Phone' | 'No Phone'>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'Google Places' | 'OpenStreetMap' | 'TomTom'>('All');
  const [verificationFilter, setVerificationFilter] = useState<'All' | 'Phone Available' | 'Address Available'>('All');
  
  // Toast Alert State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to determine API URL
  const getApiUrl = (location: string, refresh = false) => {
    const customBase = import.meta.env.VITE_API_BASE_URL;
    if (customBase) {
      return `${customBase}/api/search?location=${encodeURIComponent(location)}${refresh ? '&refresh=true' : ''}`;
    }
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const base = isLocal ? 'http://localhost:5000' : '';
    return `${base}/api/search?location=${encodeURIComponent(location)}${refresh ? '&refresh=true' : ''}`;
  };

  const handleSearch = async (locationQuery: string, forceRefresh = false) => {
    if (!locationQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setProgressStage(0);
    setQuery(locationQuery);

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
      }, 500);

    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || 'Live data source is temporarily offline. Please try again.');
      setIsLoading(false);
    }
  };

  // Get distinct categories present in the results to fill dropdown dynamically
  const availableCategories = useMemo(() => {
    if (!searchResult) return [];
    const cats = new Set<string>();
    searchResult.results.forEach(s => cats.add(s.category));
    return Array.from(cats).sort();
  }, [searchResult]);

  // Reactively filter and sort results in memory (phone available first)
  const filteredSalons = useMemo(() => {
    if (!searchResult) return [];
    const filtered = searchResult.results.filter((salon) => {
      // 1. Text Search
      if (searchTerm.trim()) {
        const keyword = searchTerm.toLowerCase();
        const nameMatch = salon.name.toLowerCase().includes(keyword);
        const addressMatch = salon.address.toLowerCase().includes(keyword);
        const areaMatch = salon.area.toLowerCase().includes(keyword);
        const cityMatch = salon.city.toLowerCase().includes(keyword);
        
        if (!nameMatch && !addressMatch && !areaMatch && !cityMatch) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== 'All' && salon.category !== selectedCategory) {
        return false;
      }

      // 3. Phone Filter
      if (phoneFilter === 'Has Phone' && !salon.phone) return false;
      if (phoneFilter === 'No Phone' && salon.phone) return false;

      // 4. Source
      if (sourceFilter !== 'All' && !salon.source.includes(sourceFilter)) return false;

      // 5. Verification Filter
      if (verificationFilter === 'Phone Available' && !salon.phone) return false;
      if (verificationFilter === 'Address Available' && (salon.address === 'Address not available' || !salon.address)) {
        return false;
      }

      // 6. Must have AT LEAST phone or valid address
      const hasPhone = !!salon.phone;
      const hasAddress = salon.address && salon.address !== 'Address not available' && salon.address.trim().length > 0;
      if (!hasPhone && !hasAddress) {
        return false;
      }

      return true;
    });

    // Sort: Salons with phone numbers first, then alphabetically by name
    return [...filtered].sort((a, b) => {
      const hasPhoneA = !!a.phone;
      const hasPhoneB = !!b.phone;

      if (hasPhoneA && !hasPhoneB) return -1;
      if (!hasPhoneA && hasPhoneB) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [searchResult, searchTerm, selectedCategory, phoneFilter, sourceFilter, verificationFilter]);

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

  const handleExport = () => {
    exportToExcel(filteredSalons, query);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div id="toast-banner" className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-2 border border-slate-700 animate-slide-in">
          <Check size={16} className="text-emerald-400 stroke-[3]" />
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <span className="p-1.5 sm:p-2 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl text-white shadow-xs">
              <Sparkles size={18} className="sm:w-5 sm:h-5" />
            </span>
            <span className="font-extrabold text-lg sm:text-xl bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600 tracking-tight">
              CosmeticSupply
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-600 bg-slate-100/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-slate-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Live B2B Search India</span>
            <span className="sm:hidden">India B2B</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        
        {/* VIEW 1: HOME */}
        {view === 'home' && !isLoading && (
          <div className="py-6 sm:py-12 md:py-16 space-y-8 sm:space-y-12 md:space-y-16">
            
            {/* Hero Heading */}
            <div className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto px-2">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-800 tracking-tight leading-tight sm:leading-none">
                Find cosmetics wholesalers & distributors across India
              </h1>
              <p className="text-slate-500 text-sm sm:text-base md:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
                Search verified trade leads by city, local area (e.g. Virar, Thane, Kaman, Sativali), suburb or pincode. Filter results and export to Excel.
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
                  Excel & Bulk Export
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Export currently filtered distributor records to structured Excel spreadsheets or copy phone numbers in bulk with one click.
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
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Export Results</h4>
                  <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">Download your Excel spreadsheet or copy telephone contacts instantly.</p>
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

                {/* Export excel */}
                <button
                  id="export-excel-btn"
                  onClick={handleExport}
                  className="col-span-2 sm:col-span-1 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
                >
                  <Download size={14} />
                  <span>Export Excel</span>
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
            />

            {/* Results Grid / Table */}
            <SalonsTable salons={filteredSalons} />

            {/* Disclaimer */}
            <Disclaimer />

          </div>
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
