import React from 'react';
import { Check, Loader2 } from 'lucide-react';

interface ProgressIndicatorProps {
  stage: number; // 0 to 5
}

const STAGES = [
  { id: 0, label: 'Geocoding area location...', successLabel: 'Area location found' },
  { id: 1, label: 'Searching cosmetics wholesalers...', successLabel: 'Found cosmetics wholesalers' },
  { id: 2, label: 'Searching distributor agencies & suppliers...', successLabel: 'Found distributors & suppliers' },
  { id: 3, label: 'Removing duplicates...', successLabel: 'Removed duplicates' },
  { id: 4, label: 'Validating addresses & contact info...', successLabel: 'Validated business records' }
];

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ stage }) => {
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-8">
      <div className="text-center mb-6">
        <h3 className="text-slate-800 font-semibold text-lg">Retrieving Business Data</h3>
        <p className="text-slate-400 text-xs mt-1">Connecting to live open-data sources in real time</p>
      </div>

      <div className="space-y-4">
        {STAGES.map((s, index) => {
          const isPending = stage < index;
          const isActive = stage === index;
          const isCompleted = stage > index;

          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 transition-opacity duration-300 ${
                isPending ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {isCompleted ? (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                  <Check size={14} className="stroke-[3]" />
                </div>
              ) : isActive ? (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-50 text-brand-600">
                  <Loader2 size={14} className="animate-spin" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs font-semibold">
                  {index + 1}
                </div>
              )}
              
              <span
                className={`text-sm font-medium ${
                  isActive ? 'text-brand-600 font-semibold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {isCompleted ? `✓ ${s.successLabel}` : s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
