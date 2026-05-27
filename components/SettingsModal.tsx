import React, { useState, useEffect } from 'react';
import { X, Globe, Ruler, Map, Save } from 'lucide-react';
import { AppSettings, TravelMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  currentSettings: AppSettings;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentSettings }) => {
  const [settings, setSettings] = useState<AppSettings>(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 border border-gray-100">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
          <h3 className="text-xl font-bold text-gray-900">User Settings</h3>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Default Travel Mode */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2 flex items-center gap-2">
              <Map className="w-3.5 h-3.5" /> Default Travel Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(TravelMode).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSettings({ ...settings, defaultTravelMode: mode })}
                  className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                    settings.defaultTravelMode === mode
                      ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Units */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2 flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5" /> Units
              </label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['imperial', 'metric'] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setSettings({ ...settings, units: unit })}
                    className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${
                      settings.units === unit
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Currency
              </label>
              <div className="relative">
                <select
                    value={settings.currency || 'USD'}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:border-gray-400 appearance-none"
                >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleSave}
            className="w-full py-3.5 bg-[#FF385C] text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-[#d9304e] transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};