import React from 'react';
import { Filter, Search } from 'lucide-react';

interface FiltersSectionProps {
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  
  category: string;
  onCategoryChange: (val: string) => void;
  categories: string[];

  phoneFilter: 'All' | 'Has Phone' | 'No Phone';
  onPhoneFilterChange: (val: 'All' | 'Has Phone' | 'No Phone') => void;

  sourceFilter: 'All' | 'Google Places' | 'OpenStreetMap' | 'TomTom';
  onSourceFilterChange: (val: 'All' | 'Google Places' | 'OpenStreetMap' | 'TomTom') => void;

  verificationFilter: 'All' | 'Phone Available' | 'Address Available';
  onVerificationFilterChange: (val: 'All' | 'Phone Available' | 'Address Available') => void;
}

export const FiltersSection: React.FC<FiltersSectionProps> = ({
  searchTerm,
  onSearchTermChange,
  category,
  onCategoryChange,
  categories,
  phoneFilter,
  onPhoneFilterChange,
  sourceFilter,
  onSourceFilterChange,
  verificationFilter,
  onVerificationFilterChange
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs sm:text-sm border-b border-slate-100 pb-3">
        <Filter size={16} className="text-brand-600" />
        Filter & Search Results
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Search within results */}
        <div className="space-y-1 sm:space-y-1.5">
          <label htmlFor="search-within-input" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search within results</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={15} />
            </span>
            <input
              id="search-within-input"
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder="Name, area, city..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-700 font-medium"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1 sm:space-y-1.5">
          <label htmlFor="category-select" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
          <select
            id="category-select"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-700 font-medium"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div className="space-y-1 sm:space-y-1.5">
          <label htmlFor="phone-filter" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone</label>
          <select
            id="phone-filter"
            value={phoneFilter}
            onChange={(e) => onPhoneFilterChange(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-700 font-medium"
          >
            <option value="All">All</option>
            <option value="Has Phone">Has Phone</option>
            <option value="No Phone">No Phone</option>
          </select>
        </div>

        {/* Source */}
        <div className="space-y-1 sm:space-y-1.5">
          <label htmlFor="source-filter" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Source</label>
          <select
            id="source-filter"
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-700 font-medium"
          >
            <option value="All">All Sources</option>
            <option value="Google Places">Google Places</option>
            <option value="OpenStreetMap">OpenStreetMap</option>
            <option value="TomTom">TomTom</option>
          </select>
        </div>

        {/* Verification */}
        <div className="space-y-1 sm:space-y-1.5 sm:col-span-2 lg:col-span-1">
          <label htmlFor="verification-filter" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verification</label>
          <select
            id="verification-filter"
            value={verificationFilter}
            onChange={(e) => onVerificationFilterChange(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-700 font-medium"
          >
            <option value="All">All</option>
            <option value="Phone Available">Phone Available</option>
            <option value="Address Available">Address Available</option>
          </select>
        </div>
      </div>
    </div>
  );
};
