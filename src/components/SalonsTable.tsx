import React, { useState } from 'react';
import { Phone, MessageSquare, MapPin, Copy, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { Salon } from '../types';

interface SalonsTableProps {
  salons: Salon[];
}

export const SalonsTable: React.FC<SalonsTableProps> = ({ salons }) => {
  const [pageSize, setPageSize] = useState<20 | 50>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const total = salons.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  
  const currentItems = salons.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleCopy = (salon: Salon) => {
    const text = `${salon.name}\nCategory: ${salon.category}\nPhone: ${salon.phone || 'N/A'}\nAddress: ${salon.address}\nLocation: ${salon.mapUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedId(salon.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (total === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        <p className="text-slate-600 font-medium text-lg">No cosmetics wholesalers or distributors found for this location/area.</p>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Try searching for a nearby area (e.g., Virar, Chinchwad, Kaman, Surat, Mumbai), a broader locality, or check spelling.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200/80 px-5 py-3 rounded-xl">
        <span className="text-slate-500 text-sm font-medium">
          Showing <span className="font-bold text-slate-700">{startIndex + 1}</span>–
          <span className="font-bold text-slate-700">{endIndex}</span> of{' '}
          <span className="font-bold text-slate-700">{total}</span> results
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="pagesize-select" className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Results per page:</label>
          <select
            id="pagesize-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as any);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 font-medium"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Desktop Table view */}
      <div className="hidden lg:block bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-5">Business Name</th>
                <th className="py-4 px-5">Phone</th>
                <th className="py-4 px-5">Address</th>
                <th className="py-4 px-5">Area</th>
                <th className="py-4 px-5">Category</th>
                <th className="py-4 px-5">Source</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-5 font-semibold text-slate-800">{item.name}</td>
                  <td className="py-4 px-5 font-mono text-xs">
                    {item.phone ? (
                      <span className="text-slate-700 font-semibold">{item.phone}</span>
                    ) : (
                      <span className="text-slate-400 italic">Phone not available</span>
                    )}
                  </td>
                  <td className="py-4 px-5 max-w-xs truncate" title={item.address}>
                    {item.address}
                  </td>
                  <td className="py-4 px-5 text-slate-500">{item.area}</td>
                  <td className="py-4 px-5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-xs text-slate-500">{item.source}</span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center justify-end gap-2">
                      {item.phone ? (
                        <>
                          <a
                            id={`call-salon-${item.id}`}
                            href={`tel:${item.phone}`}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-brand-50 hover:text-brand-600 transition-colors"
                            title="Call Salon"
                          >
                            <Phone size={15} />
                          </a>
                          <a
                            id={`wa-salon-${item.id}`}
                            href={`https://wa.me/${item.phone.replace('+', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            title="WhatsApp Salon"
                          >
                            <MessageSquare size={15} />
                          </a>
                        </>
                      ) : (
                        <a
                          id={`google-search-${item.id}`}
                          href={`https://www.google.com/search?q=${encodeURIComponent('"' + item.name + '" "' + (item.city || item.area || 'Virar') + '" contact phone number')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Search phone on Google"
                        >
                          <Search size={15} />
                        </a>
                      )}
                      <a
                        id={`map-salon-${item.id}`}
                        href={item.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="View on Map"
                      >
                        <MapPin size={15} />
                      </a>
                      <button
                        id={`copy-salon-${item.id}`}
                        onClick={() => handleCopy(item)}
                        className={`p-1.5 rounded-md transition-colors ${
                          copiedId === item.id
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Copy Details"
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile & Tablet Cards view */}
      <div className="lg:hidden space-y-3.5">
        {currentItems.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-start justify-between gap-2.5">
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-base leading-snug">{item.name}</h4>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-100/60">
                    {item.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                    {item.source}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-slate-600 pt-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 text-slate-500 rounded-md flex-shrink-0">
                  <Phone size={13} />
                </div>
                {item.phone ? (
                  <a href={`tel:${item.phone}`} className="font-mono font-bold text-slate-800 hover:text-brand-600 transition-colors">
                    {item.phone}
                  </a>
                ) : (
                  <span className="text-slate-400 italic text-xs">Phone not available</span>
                )}
              </div>
              
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-slate-100 text-slate-500 rounded-md flex-shrink-0 mt-0.5">
                  <MapPin size={13} />
                </div>
                <span className="text-xs text-slate-600 leading-relaxed">{item.address}</span>
              </div>
            </div>

            {/* Touch Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-100">
              {item.phone ? (
                <>
                  <a
                    id={`mobile-call-salon-${item.id}`}
                    href={`tel:${item.phone}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all active:scale-95 text-slate-700 font-bold text-xs border border-slate-200/60"
                  >
                    <Phone size={14} className="text-brand-600" />
                    <span>CALL</span>
                  </a>
                  <a
                    id={`mobile-wa-salon-${item.id}`}
                    href={`https://wa.me/${item.phone.replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 text-slate-700 font-bold text-xs border border-slate-200/60"
                  >
                    <MessageSquare size={14} className="text-emerald-600" />
                    <span>WHATSAPP</span>
                  </a>
                </>
              ) : (
                <a
                  id={`mobile-google-search-${item.id}`}
                  href={`https://www.google.com/search?q=${encodeURIComponent('"' + item.name + '" "' + (item.city || item.area || 'Virar') + '" contact phone number')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-50/80 text-amber-800 border border-amber-200/60 rounded-xl hover:bg-amber-100 transition-all active:scale-95 text-xs font-bold"
                >
                  <Search size={14} className="text-amber-600" />
                  <span>FIND PHONE</span>
                </a>
              )}
              
              <a
                id={`mobile-map-salon-${item.id}`}
                href={item.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95 text-slate-700 font-bold text-xs border border-slate-200/60"
              >
                <MapPin size={14} className="text-indigo-600" />
                <span>MAP</span>
              </a>

              <button
                id={`mobile-copy-salon-${item.id}`}
                onClick={() => handleCopy(item)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all active:scale-95 font-bold text-xs border ${
                  copiedId === item.id
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/60'
                }`}
              >
                <Copy size={14} className={copiedId === item.id ? 'text-emerald-600' : 'text-slate-500'} />
                <span>{copiedId === item.id ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-4">
          <button
            id="prev-page-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 active:scale-95 transition-all ${
              currentPage === 1 ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Hide page numbers if too many, only show surrounding pages
              if (
                totalPages > 6 &&
                page !== 1 &&
                page !== totalPages &&
                Math.abs(page - currentPage) > 1
              ) {
                if (page === 2 || page === totalPages - 1) {
                  return <span key={page} className="text-slate-400 px-1 text-xs">...</span>;
                }
                return null;
              }

              return (
                <button
                  key={page}
                  id={`page-btn-${page}`}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all active:scale-95 ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white border-transparent shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            id="next-page-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 active:scale-95 transition-all ${
              currentPage === totalPages ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
