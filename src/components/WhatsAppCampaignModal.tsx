import React, { useState, useEffect } from 'react';
import { X, Send, Image as ImageIcon, CheckCircle2, ChevronRight, AlertCircle, Edit3, Copy } from 'lucide-react';
import type { Salon } from '../types';
import { copyProductBannerToClipboard } from '../utils/imageCopyHelper';

interface WhatsAppCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  salons: Salon[];
  areaName?: string;
  onUpdatePhone?: (salonId: string, phone: string) => void;
}

export const WhatsAppCampaignModal: React.FC<WhatsAppCampaignModalProps> = ({
  isOpen,
  onClose,
  salons,
  areaName,
  onUpdatePhone,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState('https://just-more-beauty.vercel.app/');
  const [templateText, setTemplateText] = useState(
    `Hello {ShopName}, we saw your cosmetics store in {Area}.\nWe offer premium beauty & cosmetics supplies for salons and retailers.\n\nBrowse our full catalog here: {WebsiteLink}\n\nWould you like to explore wholesale rates for your shop?`
  );
  
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    '/catalog.jpg'
  );

  const [sentStatus, setSentStatus] = useState<Record<string, 'sent' | 'skipped' | 'pending'>>({});
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [manualPhoneInput, setManualPhoneInput] = useState('');

  // Filter salons to those in current view/area
  const activeSalons = salons;
  const currentSalon = activeSalons[currentIndex];

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalCount = activeSalons.length;
  const sentCount = Object.values(sentStatus).filter(s => s === 'sent').length;

  const getFormattedMessage = (salon: Salon) => {
    let msg = templateText;
    msg = msg.replace(/\{ShopName\}/g, salon.name || 'Distributor');
    msg = msg.replace(/\{Area\}/g, salon.area || salon.city || 'your area');
    msg = msg.replace(/\{WebsiteLink\}/g, websiteUrl);
    msg = msg.replace(/\{ImageUrl\}/g, imagePreviewUrl || '');
    return encodeURIComponent(msg);
  };

  const handleCopyImageToClipboard = async (): Promise<boolean> => {
    const success = await copyProductBannerToClipboard(imagePreviewUrl || '/catalog.jpg');
    if (success) {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3500);
    }
    return success;
  };

  const handleLaunchWhatsApp = async (salon: Salon) => {
    if (!salon.phone) return;

    // Automatically copy demo product banner to system clipboard first
    await handleCopyImageToClipboard();

    // Clean phone number (strip + or formatting)
    const cleanPhone = salon.phone.replace(/\D/g, '');
    const formattedMessage = getFormattedMessage(salon);
    const waUrl = `https://wa.me/${cleanPhone}?text=${formattedMessage}`;

    // Open WhatsApp Web/App
    window.open(waUrl, '_blank');

    // Update status
    setSentStatus(prev => ({ ...prev, [salon.id]: 'sent' }));

    // Move to next distributor if available
    if (currentIndex < activeSalons.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSaveManualPhone = (salonId: string) => {
    if (!manualPhoneInput.trim()) return;
    let clean = manualPhoneInput.trim();
    if (!clean.startsWith('+')) {
      clean = `+91${clean.replace(/\D/g, '')}`;
    }
    if (onUpdatePhone) {
      onUpdatePhone(salonId, clean);
    }
    setEditingPhoneId(null);
    setManualPhoneInput('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setImagePreviewUrl(localUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-xs">
              <Send size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">WhatsApp Campaign Assistant</h3>
              <p className="text-slate-500 text-xs font-medium">
                {areaName ? `Targeting: ${areaName}` : 'Send 1-Click WhatsApp Messages to Distributors'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Progress Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Campaign Dispatch Progress</span>
              <span className="text-emerald-600">{sentCount} of {totalCount} Completed ({Math.round((sentCount / (totalCount || 1)) * 100)}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(sentCount / (totalCount || 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Template & Image Customization */}
            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Message Template</span>
                  <span className="text-slate-400 font-normal normal-case text-[11px]">Supports variables</span>
                </label>
                <textarea
                  rows={5}
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-sans text-slate-800 leading-relaxed"
                  placeholder="Enter message template..."
                />
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">{`{ShopName}`}</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">{`{Area}`}</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">{`{WebsiteLink}`}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Website Catalog URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Product Banner Photo</span>
                  <span className="text-emerald-600 font-medium normal-case text-[11px]">Direct Link & Clipboard Copy</span>
                </label>
                <div className="flex items-center gap-3">
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} alt="Product Banner" className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-2xs flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 flex-shrink-0">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">
                        <ImageIcon size={14} />
                        <span>Upload Custom Photo</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      <button
                        onClick={handleCopyImageToClipboard}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <Copy size={13} />
                        <span>Copy Image</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">Image URL is automatically included in the text so WhatsApp renders a rich image preview!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Queue & Dispatch Box */}
            <div className="lg:col-span-6 flex flex-col justify-between bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 space-y-4">
              {currentSalon ? (
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Distributor {currentIndex + 1} of {totalCount}
                    </span>
                    {sentStatus[currentSalon.id] === 'sent' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={13} />
                        Sent
                      </span>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
                    <h4 className="font-extrabold text-slate-800 text-base">{currentSalon.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span>Area:</span>
                      <span className="font-semibold text-slate-700">{currentSalon.area || currentSalon.city || 'N/A'}</span>
                      <span className="text-slate-300">|</span>
                      <span>Category:</span>
                      <span className="font-semibold text-slate-700">{currentSalon.category}</span>
                    </p>

                    {/* Phone Number Display / Edit / Fetch */}
                    <div className="pt-2">
                      {currentSalon.phone ? (
                        <div className="flex items-center justify-between text-xs bg-emerald-50/60 border border-emerald-200/80 px-3 py-2 rounded-lg">
                          <span className="text-slate-600 font-medium">WhatsApp Number:</span>
                          <span className="font-mono font-extrabold text-emerald-700">{currentSalon.phone}</span>
                        </div>
                      ) : editingPhoneId === currentSalon.id ? (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Enter 10-digit mobile (+91...)"
                            value={manualPhoneInput}
                            onChange={(e) => setManualPhoneInput(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
                          <button
                            onClick={() => handleSaveManualPhone(currentSalon.id)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                            <AlertCircle size={14} className="flex-shrink-0" />
                            <span>Phone number not available yet</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingPhoneId(currentSalon.id);
                                setManualPhoneInput('');
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
                            >
                              <Edit3 size={13} />
                              <span>Add Phone Manually</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Live Preview */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 space-y-1 text-xs text-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Pre-filled Message Preview</span>
                    <p className="whitespace-pre-line text-slate-600 font-sans italic text-[11px] leading-relaxed">
                      {decodeURIComponent(getFormattedMessage(currentSalon))}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                  <p className="font-bold text-slate-800">All WhatsApp messages sent!</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                {copiedNotification && (
                  <div className="text-[11px] font-bold text-emerald-700 text-center bg-emerald-100/80 border border-emerald-300 py-1 rounded-lg">
                    ✓ Product Banner Photo copied to clipboard! Press Ctrl+V in WhatsApp.
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    disabled={!currentSalon || !currentSalon.phone}
                    onClick={() => currentSalon && handleLaunchWhatsApp(currentSalon)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white font-extrabold text-sm rounded-xl hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                    <span>Launch WhatsApp & Copy Photo</span>
                  </button>

                  <button
                    disabled={currentIndex >= activeSalons.length - 1}
                    onClick={() => setCurrentIndex(prev => Math.min(prev + 1, activeSalons.length - 1))}
                    className="p-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 font-bold transition-colors disabled:opacity-40"
                    title="Skip to Next"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
