import { useState } from 'react';
import { X, MapPin, Sparkles, Loader2, Phone, Building2, User, Globe } from 'lucide-react';
import type { Client } from '../types';
import { STATES_AND_DISTRICTS } from '../data/statesAndDistricts';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Partial<Client>) => Promise<void>;
  initialClient?: Client | null;
}

export function ClientFormModal({ isOpen, onClose, onSave, initialClient }: ClientFormModalProps) {
  const [clientName, setClientName] = useState(initialClient?.clientName || '');
  const [shopName, setShopName] = useState(initialClient?.shopName || '');
  const [phone, setPhone] = useState(initialClient?.phone || '');
  const [selectedState, setSelectedState] = useState(initialClient?.state || 'Maharashtra');
  const [selectedDistrict, setSelectedDistrict] = useState(initialClient?.district || 'Pune');
  const [cityArea, setCityArea] = useState(initialClient?.cityArea || '');
  const [latitude, setLatitude] = useState<number | undefined>(initialClient?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(initialClient?.longitude);

  const [isDetectingDistrict, setIsDetectingDistrict] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDistricts = STATES_AND_DISTRICTS[selectedState]?.districts || STATES_AND_DISTRICTS['Maharashtra'].districts;

  // Auto-Detect District based on Place / City / Area
  const handleDetectDistrict = async (placeInput?: string) => {
    const targetPlace = placeInput !== undefined ? placeInput : cityArea;
    if (!targetPlace || !targetPlace.trim()) {
      setDetectionMessage({ text: 'Please type a Place / City / Area first.', isError: true });
      return;
    }

    setIsDetectingDistrict(true);
    setDetectionMessage(null);

    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const customBase = import.meta.env.VITE_API_BASE_URL;
      const apiBase = customBase || (isLocal ? 'http://localhost:5000' : '');

      const res = await fetch(`${apiBase}/api/geocode-place?place=${encodeURIComponent(targetPlace)}&state=${encodeURIComponent(selectedState)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Could not auto-detect district.');
      }

      if (data.district) {
        let activeDistricts = currentDistricts;
        if (data.state && STATES_AND_DISTRICTS[data.state]) {
          setSelectedState(data.state);
          activeDistricts = STATES_AND_DISTRICTS[data.state].districts;
        }

        // Find matching district in registry case-insensitively
        const matched = activeDistricts.find(
          d => d.toLowerCase() === data.district.toLowerCase() ||
               d.toLowerCase().includes(data.district.toLowerCase()) ||
               data.district.toLowerCase().includes(d.toLowerCase())
        );

        if (matched) {
          setSelectedDistrict(matched);
        } else {
          setSelectedDistrict(data.district);
        }

        if (data.latitude && data.longitude) {
          setLatitude(data.latitude);
          setLongitude(data.longitude);
        }

        setDetectionMessage({
          text: `Auto-detected: ${data.district}${data.state ? ` (${data.state})` : ''}`
        });
      }
    } catch (err: any) {
      setDetectionMessage({ text: err.message || 'Auto-detection failed. Please pick district manually.', isError: true });
    } finally {
      setIsDetectingDistrict(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientName.trim()) {
      setFormError('Client Name is required.');
      return;
    }
    if (!shopName.trim()) {
      setFormError('Shop Name is required.');
      return;
    }
    if (!selectedDistrict) {
      setFormError('Please select a District.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        clientName: clientName.trim(),
        shopName: shopName.trim(),
        phone: phone.trim(),
        state: selectedState,
        district: selectedDistrict,
        cityArea: cityArea.trim(),
        latitude,
        longitude
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save client details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {initialClient ? 'Edit Client Record' : 'Add New Client'}
              </h3>
              <p className="text-xs text-slate-400">Enter client details to show on the Maharashtra district map</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 text-xs font-semibold rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              {formError}
            </div>
          )}

          {/* Client Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Client Name <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Karwande"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Shop Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Shop / Business Name <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder="e.g. Royal Beauty & Cosmetics Shop"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Place / City / Area (with Auto-Detect Button) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                City / Area / Place
              </label>
              <button
                type="button"
                onClick={() => handleDetectDistrict()}
                disabled={isDetectingDistrict || !cityArea.trim()}
                className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors"
              >
                {isDetectingDistrict ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Auto-Detect District</span>
              </button>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. Kothrud, Andheri West, Baramati"
                value={cityArea}
                onChange={(e) => setCityArea(e.target.value)}
                onBlur={() => {
                  if (cityArea.trim() && !detectionMessage) {
                    handleDetectDistrict(cityArea);
                  }
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            {detectionMessage && (
              <p className={`mt-1.5 text-xs font-medium ${detectionMessage.isError ? 'text-amber-400' : 'text-emerald-400'}`}>
                {detectionMessage.text}
              </p>
            )}
          </div>

          {/* State & District Dropdowns Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* State Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                State <span className="text-cyan-400">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  value={selectedState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setSelectedState(newState);
                    const newDList = STATES_AND_DISTRICTS[newState]?.districts || [];
                    if (newDList.length > 0) {
                      setSelectedDistrict(newDList[0]);
                    }
                  }}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                >
                  {Object.keys(STATES_AND_DISTRICTS).map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* District Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                District <span className="text-cyan-400">*</span>
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {currentDistricts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Client Record</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
