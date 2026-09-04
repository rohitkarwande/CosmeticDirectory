import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  'Virar',
  'Chinchwad',
  'Kaman',
  'Sativali',
  'Vasai',
  'Surat',
  'Mumbai',
  '401303'
];

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    if (!isLoading) {
      setQuery(example);
      onSearch(example);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-1">
      <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row items-stretch shadow-md rounded-2xl overflow-hidden bg-white border border-slate-200 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition-all p-1.5 sm:p-0">
        <div className="flex items-center pl-3 sm:pl-4 text-slate-400 py-3 sm:py-0">
          <Search size={22} className="flex-shrink-0" />
          <input
            id="location-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City, area or pincode (e.g. Virar, Thane)..."
            disabled={isLoading}
            className="w-full pl-2 pr-3 py-1 sm:py-4 text-slate-700 bg-transparent placeholder-slate-400 focus:outline-none text-base md:text-lg"
            required
          />
        </div>
        <button
          id="search-distributors-btn"
          type="submit"
          disabled={isLoading || !query.trim()}
          className={`w-full sm:w-auto px-6 py-3.5 sm:py-4 font-bold text-sm sm:text-base text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 whitespace-nowrap rounded-xl sm:rounded-none ${
            isLoading || !query.trim() ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Search size={18} className="sm:hidden" />
              <span>SEARCH DISTRIBUTORS</span>
            </>
          )}
        </button>
      </form>
      
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs sm:text-sm text-slate-500">
        <span className="font-semibold text-slate-400 mr-1">Try searching:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            id={`example-${example.toLowerCase()}-btn`}
            type="button"
            onClick={() => handleExampleClick(example)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-white sm:bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition-colors border border-slate-200/80 shadow-xs text-xs font-medium"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
};
