import React, { useState } from 'react';
import { AppSettings, OrderType } from '../../types';
import {
  Store,
  QrCode,
  Lock,
  Database,
  Upload,
  Download,
  Globe,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { storage } from '../../utils/storage';
import { sound } from '../../utils/sound';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onRestoreAllData: () => void;
  soundEnabled?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRestoreAllData,
  soundEnabled: _soundEnabled = true,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'stall' | 'payment' | 'pin' | 'backup' | 'deploy'>('stall');
  const [saveToast, setSaveToast] = useState<boolean>(false);

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playCashSuccess(formData.soundEnabled);
    onUpdateSettings(formData);
    storage.saveSettings(formData);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleDownloadFullBackup = () => {
    sound.playTap(formData.soundEnabled);
    const json = storage.exportAllDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `The_BBQ_Boxx_Full_Database_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storage.restoreAllDataJson(content);
      if (success) {
        sound.playCashSuccess(formData.soundEnabled);
        alert('All database tables, menu, bills, and settings restored successfully! Reloading...');
        onRestoreAllData();
      } else {
        alert('Failed to restore database. Please verify backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllData = () => {
    if (
      window.confirm(
        '⚠️ DANGER: This will wipe ALL current orders, bills, and custom settings, and reset the menu to default. Are you completely sure?'
      )
    ) {
      localStorage.clear();
      sound.playCancel(formData.soundEnabled);
      alert('System reset to clean installation state. Reloading...');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 space-y-5 select-none font-serif text-white bg-black">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black border border-white p-4 sm:p-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            STALL &amp; SYSTEM SETTINGS
          </h2>
          <p className="text-xs text-white/70 mt-1">
            Configure receipt branding, UPI payments, thermal printer size, security PIN, and backups.
          </p>
        </div>

        {saveToast && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black border border-white text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-black border border-white text-xs">
        {[
          { id: 'stall' as const, label: 'Stall & Receipts', icon: Store },
          { id: 'payment' as const, label: 'UPI & Taxes', icon: QrCode },
          { id: 'pin' as const, label: 'Security PIN', icon: Lock },
          { id: 'backup' as const, label: 'Backup & Restore', icon: Database },
          { id: 'deploy' as const, label: 'Deployment Guide', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 font-bold uppercase transition-colors whitespace-nowrap flex items-center gap-1.5 min-h-[40px] ${
                isActive
                  ? 'bg-white text-black'
                  : 'bg-black text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: STALL BRANDING & RECEIPTS */}
      {activeTab === 'stall' && (
        <form onSubmit={handleSave} className="p-5 sm:p-6 bg-black border border-white space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold block mb-1 uppercase">Business Name</label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                className="w-full bg-black border border-white px-3 py-2.5 text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold block mb-1 uppercase">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="Premium Flavours in Every Bite"
                className="w-full bg-black border border-white px-3 py-2.5 text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold block mb-1 uppercase">Stall Address / Counter</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street food lane, counter 4..."
                className="w-full bg-black border border-white px-3 py-2.5 text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold block mb-1 uppercase">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-black border border-white px-3 py-2.5 text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/20">
            <div>
              <label className="font-bold block mb-1 uppercase">Default Order Type</label>
              <select
                value={formData.defaultOrderType}
                onChange={(e) => handleChange('defaultOrderType', e.target.value as OrderType)}
                className="w-full bg-black border border-white px-3 py-2.5 text-white focus:outline-none uppercase"
              >
                <option value="dine-in">DINE-IN</option>
                <option value="parcel">PARCEL</option>
              </select>
            </div>

            <div>
              <label className="font-bold block mb-1 uppercase">Thermal Printer Width</label>
              <select
                value={formData.thermalPrinterSize}
                onChange={(e) => handleChange('thermalPrinterSize', e.target.value as '58mm' | '80mm')}
                className="w-full bg-black border border-white px-3 py-2.5 text-white focus:outline-none uppercase"
              >
                <option value="58mm">58mm (Pocket Thermal)</option>
                <option value="80mm">80mm (Standard Thermal)</option>
              </select>
            </div>

            <div>
              <label className="font-bold block mb-1 uppercase">Halal Certification</label>
              <label className="flex items-center gap-2 p-2.5 bg-black border border-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isHalal}
                  onChange={(e) => handleChange('isHalal', e.target.checked)}
                  className="accent-white w-4 h-4"
                />
                <span className="font-bold uppercase">100% Halal Badge</span>
              </label>
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1 uppercase">Receipt Footer Note</label>
            <input
              type="text"
              value={formData.receiptFooter}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              placeholder="Thank you for visiting! Follow us @thebbqboxx"
              className="w-full bg-black border border-white px-3 py-2.5 text-white text-xs focus:outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.soundEnabled}
                onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                className="accent-white w-4 h-4"
              />
              <span className="font-semibold text-white/80">Enable tactile sound feedback (taps, chime)</span>
            </label>

            <button
              type="submit"
              className="px-5 py-2.5 bg-white text-black hover:bg-white/90 font-bold text-xs border border-white min-h-[44px] uppercase transition-colors"
            >
              Save Branding Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: UPI & TAXES */}
      {activeTab === 'payment' && (
        <form onSubmit={handleSave} className="p-5 sm:p-6 bg-black border border-white space-y-4 text-xs max-w-xl">
          <div>
            <h3 className="text-base font-bold uppercase">UPI &amp; Tax Configuration</h3>
            <p className="text-xs text-white/70 mt-1">
              Set counter UPI ID so customers can scan dynamic QRs on your phone for exact amounts.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-bold block mb-1 uppercase">UPI ID (VPA) *</label>
              <input
                type="text"
                required
                value={formData.upiId}
                onChange={(e) => handleChange('upiId', e.target.value)}
                placeholder="e.g. thebbqboxx@okaxis or 9876543210@paytm"
                className="w-full bg-black border border-white px-3 py-2.5 text-white focus:outline-none"
              />
              <span className="text-[11px] text-white/70 mt-1 block">
                QR code for exact bill amount will be generated directly using this UPI ID.
              </span>
            </div>

            <div>
              <label className="font-bold block mb-1 uppercase">GSTIN (Optional)</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => handleChange('gstin', e.target.value)}
                placeholder="e.g. 29AAAAA0000A1Z5"
                className="w-full bg-black border border-white px-3 py-2.5 text-white focus:outline-none"
              />
            </div>

            <div className="p-3.5 bg-black border border-white space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.defaultGstEnabled}
                  onChange={(e) => handleChange('defaultGstEnabled', e.target.checked)}
                  className="accent-white w-4 h-4"
                />
                <span className="font-bold uppercase">Enable GST by Default on Bills</span>
              </label>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-white/80">Default GST Rate (%):</span>
                <input
                  type="number"
                  min="0"
                  max="28"
                  value={formData.defaultGstRate}
                  onChange={(e) => handleChange('defaultGstRate', Number(e.target.value) || 0)}
                  className="w-20 bg-black border border-white px-2.5 py-1.5 text-white font-bold focus:outline-none"
                />
                <span className="font-bold">%</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-white text-black hover:bg-white/90 font-bold text-xs border border-white min-h-[44px] uppercase transition-colors"
          >
            Save Payment &amp; Tax Settings
          </button>
        </form>
      )}

      {/* TAB 3: SECURITY PIN */}
      {activeTab === 'pin' && (
        <form onSubmit={handleSave} className="p-5 sm:p-6 bg-black border border-white space-y-4 text-xs max-w-md">
          <div>
            <h3 className="text-base font-bold uppercase">Admin &amp; Reports 4-Digit PIN</h3>
            <p className="text-xs text-white/70 mt-1">
              Protect sales reports and menu pricing from unauthorized staff modification.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 p-3.5 bg-black border border-white cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pinRequired}
                onChange={(e) => handleChange('pinRequired', e.target.checked)}
                className="accent-white w-4 h-4"
              />
              <span className="font-bold uppercase">Require 4-digit PIN for Admin &amp; Reports</span>
            </label>

            <div>
              <label className="font-bold block mb-1 uppercase">Set 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={formData.securityPin}
                onChange={(e) => handleChange('securityPin', e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                className="w-full bg-black border border-white px-3 py-2.5 text-white text-center tracking-widest text-lg font-bold focus:outline-none"
              />
              <span className="text-[11px] text-white/70 mt-1 block text-center">
                Default PIN is <strong>1234</strong>
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-white text-black hover:bg-white/90 font-bold text-xs border border-white min-h-[44px] uppercase transition-colors"
          >
            Save PIN Settings
          </button>
        </form>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-black border border-white space-y-3 text-xs">
            <h3 className="text-base font-bold uppercase">Full Database Backup</h3>
            <p className="text-white/70">
              Export all orders, bills, tokens, menu items, and settings as a single JSON file.
            </p>
            <button
              type="button"
              onClick={handleDownloadFullBackup}
              className="w-full py-3 bg-black hover:bg-white hover:text-black text-white font-bold flex items-center justify-center gap-2 border border-white transition-colors min-h-[44px] uppercase"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup (JSON)</span>
            </button>
          </div>

          <div className="p-5 bg-black border border-white space-y-3 text-xs">
            <h3 className="text-base font-bold uppercase">Restore from Backup</h3>
            <p className="text-white/70">
              Restore an entire POS database backup from a previous backup file on your phone or computer.
            </p>
            <label className="w-full py-3 bg-black hover:bg-white hover:text-black text-white font-bold flex items-center justify-center gap-2 border border-white cursor-pointer transition-colors min-h-[44px] uppercase">
              <Upload className="w-4 h-4" />
              <span>Restore from JSON File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleUploadFullBackup}
                className="hidden"
              />
            </label>
          </div>

          {/* Danger Zone */}
          <div className="sm:col-span-2 p-5 bg-black border border-dashed border-white space-y-2 text-xs">
            <div className="flex items-center gap-2 text-white font-bold uppercase">
              <AlertTriangle className="w-4 h-4" />
              <span>Factory Reset Clean Installation</span>
            </div>
            <p className="text-white/70">
              Clear all localStorage state and restore fresh defaults. Use with caution.
            </p>
            <button
              type="button"
              onClick={handleResetAllData}
              className="px-4 py-2.5 bg-black hover:bg-white hover:text-black text-white font-bold border border-white transition-colors uppercase"
            >
              Reset All POS Data
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: DEPLOYMENT GUIDE */}
      {activeTab === 'deploy' && (
        <div className="p-5 sm:p-6 bg-black border border-white space-y-4 text-xs max-w-2xl leading-relaxed">
          <div>
            <h3 className="text-base font-bold uppercase">How to Deploy to Vercel / Netlify</h3>
            <p className="text-white/70 mt-1">
              Because "The BBQ Boxx" POS is built as a pure client-side PWA with localStorage persistence, it deploys in 30 seconds for free on any hosting platform.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 border border-white bg-black">
              <h4 className="font-bold mb-1.5 text-sm uppercase">Deploying to Vercel</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-white/80 pl-1">
                <li>Push this repository to your GitHub account.</li>
                <li>Go to <strong>vercel.com</strong> &rarr; Click <strong>"Add New Project"</strong>.</li>
                <li>Select the repository.</li>
                <li>Framework Preset: <strong>Vite</strong>.</li>
                <li>Build Command: <strong>npm run build</strong>.</li>
                <li>Output Directory: <strong>dist</strong>.</li>
                <li>Click <strong>Deploy</strong>. That's it!</li>
              </ol>
            </div>

            <div className="p-4 border border-white bg-black">
              <h4 className="font-bold mb-1.5 text-sm uppercase">Deploying to Netlify</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-white/80 pl-1">
                <li>Log in to <strong>netlify.com</strong> &rarr; Click <strong>"Add new site"</strong> &rarr; <strong>"Import an existing project"</strong>.</li>
                <li>Authorize GitHub and pick this repository.</li>
                <li>Build command: <strong>npm run build</strong>.</li>
                <li>Publish directory: <strong>dist</strong>.</li>
                <li>Click <strong>Deploy site</strong>.</li>
              </ol>
            </div>

            <div className="p-4 border border-white bg-black">
              <h4 className="font-bold mb-1 text-sm uppercase">Offline PWA Installation</h4>
              <p className="text-white/80 text-xs">
                Once deployed with HTTPS, open the URL on your counter Android or iPhone. Tap <strong>"Install App"</strong> in the top header or browser menu. The app installs as a standalone native app icon and continues working even during internet dropouts at the food stall!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
