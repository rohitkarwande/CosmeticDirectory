import React from 'react';
import { Phone, MapPin, Building, Activity } from 'lucide-react';
import type { Salon } from '../types';

interface StatsCardsProps {
  salons: Salon[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ salons }) => {
  const total = salons.length;
  
  // Calculate phones & addresses
  const withPhone = salons.filter(s => s.phone).length;
  const withAddress = salons.filter(s => s.address && s.address !== 'Address not available').length;

  const phonePercent = total > 0 ? Math.round((withPhone / total) * 100) : 0;
  const addressPercent = total > 0 ? Math.round((withAddress / total) * 100) : 0;

  // Calculate category counts dynamically
  const categoryCounts: Record<string, number> = {};

  salons.forEach(s => {
    const cat = s.category || 'Other Wholesale / Dealer';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 3 Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        {/* Total Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex items-center gap-3.5 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-brand-50 text-brand-600 rounded-xl flex-shrink-0">
            <Building size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider block">Stores & Distributors</span>
            <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800">{total}</span>
          </div>
        </div>

        {/* Phone Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex items-center gap-3.5 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
            <Phone size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1">
            <span className="text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider block">Phone Numbers</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800">{withPhone}</span>
              <span className="text-[10px] sm:text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">
                {phonePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex items-center gap-3.5 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0">
            <MapPin size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1">
            <span className="text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider block">Addresses Available</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800">{withAddress}</span>
              <span className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                {addressPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown list */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <h4 className="text-slate-700 font-semibold text-xs sm:text-sm mb-3 flex items-center gap-2">
          <Activity size={16} className="text-brand-600" />
          Category Breakdown
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
          {Object.entries(categoryCounts).map(([cat, count]) => {
            if (count === 0) return null;
            return (
              <div key={cat} className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 sm:p-3 text-center">
                <span className="text-slate-500 text-[11px] sm:text-xs block truncate font-medium" title={cat}>{cat}</span>
                <span className="text-base sm:text-lg font-extrabold text-slate-800 block mt-0.5">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
