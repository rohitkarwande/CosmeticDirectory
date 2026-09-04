import React from 'react';
import { Info } from 'lucide-react';

export const Disclaimer: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto mt-12 bg-slate-100 border border-slate-200/60 rounded-xl p-5 text-slate-500 text-xs md:text-sm text-left flex items-start gap-3.5 leading-relaxed">
      <Info size={20} className="text-slate-400 flex-shrink-0 mt-0.5" />
      <div className="space-y-1.5">
        <p className="font-semibold text-slate-600">Disclaimer & Data Source Transparency</p>
        <p>
          CosmeticSupply Lead Generator retrieves business information dynamically from open public geospatial databases (such as OpenStreetMap and TomTom POI services). Information such as phone numbers, trade classifications, addresses, and coordinates may evolve over time.
        </p>
        <p>
          <strong>Coverage extends across cities, towns, suburbs, and localized areas in India (such as Virar, Chinchwad, Kaman, Sativali, etc.).</strong> Live search availability depends on contributing community data and API uptime.
        </p>
      </div>
    </div>
  );
};
