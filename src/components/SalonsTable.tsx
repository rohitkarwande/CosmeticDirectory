import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, MapPin, Copy, ChevronLeft, ChevronRight, CheckCircle2, Send, Edit3, AlertCircle } from 'lucide-react';
import type { Salon } from '../types';
import { WhatsAppCampaignModal } from './WhatsAppCampaignModal';

interface SalonsTableProps {
  salons: Salon[];
  onToggleClient?: (salon: Salon) => Promise<void>;
}

export const SalonsTable: React.FC<SalonsTableProps> = ({ salons, onToggleClient }) => {
  const [salonsList, setSalonsList] = useState<Salon[]>(salons);
  const [pageSize, setPageSize] = useState<20 | 50>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [showBulkChargeNotice, setShowBulkChargeNotice] = useState(false);
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [manualPhoneInput, setManualPhoneInput] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    setSalonsList(salons);
  }, [salons]);

  const handleToggleClient = async (salon: Salon) => {
    if (!onToggleClient) return;
    setTogglingId(salon.id);
    try {
      await onToggleClient(salon);
    } finally {
      setTogglingId(null);
    }
  };

  const total = salonsList.length;
  const clientCount = salonsList.filter(s => s.isClient).length;
  const leadCount = total - clientCount;
  
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  
  const currentItems = salonsList.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleCopy = (salon: Salon) => {
    const text = `${salon.name}\nClient Status: ${salon.isClient ? 'Existing Client (Catered)' : 'Potential Lead'}\nCategory: ${salon.category}\nPhone: ${salon.phone || 'N/A'}\nAddress: ${salon.address}\nLocation: ${salon.mapUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedId(salon.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdatePhone = (salonId: string, newPhone: string) => {
    setSalonsList(prev => prev.map(s => s.id === salonId ? { ...s, phone: newPhone } : s));
  };

  const handleSaveManualPhone = (salonId: string) => {
    if (!manualPhoneInput.trim()) return;
    let clean = manualPhoneInput.trim();
    if (!clean.startsWith('+')) {
      clean = `+91${clean.replace(/\D/g, '')}`;
    }
    handleUpdatePhone(salonId, clean);
    setEditingPhoneId(null);
    setManualPhoneInput('');
  };

  const handleSingleWhatsApp = (salon: Salon) => {
    if (!salon.phone) return;
    const cleanPhone = salon.phone.replace(/\D/g, '');
    const msg = `Hello ${salon.name}, we saw your store in ${salon.area || salon.city || 'your area'}.\nCheck out our beauty & cosmetics collection here: https://just-more-beauty.vercel.app/\nWould you like to explore wholesale rates for your shop?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
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
      {/* WhatsApp Bulk Forward Cost Warning Modal */}
      {showBulkChargeNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle size={30} className="stroke-[2.5]" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900">WhatsApp Automated Bulk Forward</h3>
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 text-xs space-y-1.5 text-amber-900">
                <p className="text-sm font-extrabold text-amber-800">
                  Each message will charge ₹0.80 paise
                </p>
                <p className="text-amber-700 font-bold">
                  (Not recommended) Use normal whatsapp message feature
                </p>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  setShowBulkChargeNotice(false);
                  setIsCampaignOpen(true);
                }}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Send size={14} />
                <span>Use Normal Free WhatsApp Feature</span>
              </button>

              <button
                onClick={() => setShowBulkChargeNotice(false)}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Area Campaign Modal */}
      <WhatsAppCampaignModal
        isOpen={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
        salons={salonsList}
        areaName={salonsList[0]?.area || salonsList[0]?.city}
        onUpdatePhone={handleUpdatePhone}
      />

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200/80 px-5 py-3 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-700">{startIndex + 1}</span>–
            <span className="font-bold text-slate-700">{endIndex}</span> of{' '}
            <span className="font-bold text-slate-700">{total}</span> results
          </span>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={12} className="text-emerald-600" />
              {clientCount} Client{clientCount === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {leadCount} Potential Lead{leadCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCampaignOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl hover:bg-emerald-700 shadow-sm transition-all active:scale-95"
          >
            <Send size={14} />
            <span>WhatsApp Area Campaign ({total})</span>
          </button>

          <button
            id="whatsapp-bulk-forward-btn"
            onClick={() => setShowBulkChargeNotice(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 text-white font-extrabold text-xs rounded-xl hover:bg-amber-600 shadow-sm transition-all active:scale-95"
            title="WhatsApp Bulk Forward API"
          >
            <Send size={14} />
            <span>WhatsApp Bulk Forward</span>
          </button>

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
      </div>

      {/* Desktop Table view */}
      <div className="hidden lg:block bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-5">isClient</th>
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
                <tr key={item.id} className={`transition-colors ${item.isClient ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-slate-50/50'}`}>
                  <td className="py-4 px-5">
                    <button
                      id={`toggle-client-${item.id}`}
                      onClick={() => handleToggleClient(item)}
                      disabled={togglingId === item.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 border ${
                        item.isClient
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 hover:border-emerald-400'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-800 hover:border-slate-300'
                      }`}
                      title={item.isClient ? 'Click to toggle Client status OFF' : 'Click to toggle Client status ON'}
                    >
                      {togglingId === item.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : item.isClient ? (
                        <CheckCircle2 size={14} className="text-emerald-600 stroke-[2.5]" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 bg-white" />
                      )}
                      <span>{item.isClient ? 'Client' : 'Potential Lead'}</span>
                    </button>
                  </td>
                  <td className="py-4 px-5 font-semibold text-slate-800">
                    {item.name}
                    {item.matchedClient && item.matchedClient.shopName.toLowerCase() !== item.name.toLowerCase() && (
                      <span className="block text-[11px] font-normal text-emerald-600 mt-0.5" title="Registered Database Name">
                        Matched: "{item.matchedClient.shopName}"
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 font-mono text-xs">
                    {item.phone ? (
                      <span className="text-slate-700 font-semibold">{item.phone}</span>
                    ) : editingPhoneId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="+91..."
                          value={manualPhoneInput}
                          onChange={(e) => setManualPhoneInput(e.target.value)}
                          className="w-28 px-2 py-0.5 text-xs border border-slate-300 rounded"
                        />
                        <button
                          onClick={() => handleSaveManualPhone(item.id)}
                          className="px-2 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 italic text-[11px]">No phone</span>
                        <button
                          onClick={() => {
                            setEditingPhoneId(item.id);
                            setManualPhoneInput('');
                          }}
                          className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                          title="Type Phone Manually"
                        >
                          <Edit3 size={11} />
                        </button>
                      </div>
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
                      {item.phone && (
                        <>
                          <a
                            id={`call-salon-${item.id}`}
                            href={`tel:${item.phone}`}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-brand-50 hover:text-brand-600 transition-colors"
                            title="Call Salon"
                          >
                            <Phone size={15} />
                          </a>
                          <button
                            id={`wa-salon-${item.id}`}
                            onClick={() => handleSingleWhatsApp(item)}
                            className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
                            title="WhatsApp Salon with Catalog Link"
                          >
                            <MessageSquare size={15} />
                          </button>
                        </>
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
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-800 text-base leading-snug">{item.name}</h4>
                  <button
                    id={`mobile-toggle-client-${item.id}`}
                    onClick={() => handleToggleClient(item)}
                    disabled={togglingId === item.id}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 cursor-pointer ${
                      item.isClient
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                    title={item.isClient ? 'Click to toggle Client status OFF' : 'Click to toggle Client status ON'}
                  >
                    {togglingId === item.id ? (
                      <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : item.isClient ? (
                      <CheckCircle2 size={12} className="text-emerald-600 stroke-[2.5]" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full border border-slate-400 bg-white" />
                    )}
                    <span>{item.isClient ? 'Client' : 'Mark Client'}</span>
                  </button>
                </div>
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
              {item.phone && (
                <>
                  <a
                    id={`mobile-call-salon-${item.id}`}
                    href={`tel:${item.phone}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all active:scale-95 text-slate-700 font-bold text-xs border border-slate-200/60"
                  >
                    <Phone size={14} className="text-brand-600" />
                    <span>CALL</span>
                  </a>
                  <button
                    id={`mobile-wa-salon-${item.id}`}
                    onClick={() => handleSingleWhatsApp(item)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all active:scale-95 font-bold text-xs border border-emerald-200"
                  >
                    <MessageSquare size={14} className="text-emerald-600" />
                    <span>WHATSAPP</span>
                  </button>
                </>
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
