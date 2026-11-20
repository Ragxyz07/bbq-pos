import React, { useState } from 'react';
import { AppSettings, OrderType } from '../../types';
import {
  Store,
  QrCode,
  Lock,
  Database,
  Upload,
  Download,
  AlertTriangle,
  Check,
  Bluetooth,
  Printer,
} from 'lucide-react';
import { storage } from '../../utils/storage';
import { sound } from '../../utils/sound';
import {
  connectBlePrinter,
  disconnectBlePrinter,
  getConnectedBlePrinterName,
  sendTestPrint,
} from '../../utils/thermalPrint';

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
  soundEnabled = true,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'stall' | 'payment' | 'pin' | 'backup'>('stall');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [blePrinterName, setBlePrinterName] = useState<string | null>(() => getConnectedBlePrinterName());
  const [printerFeedback, setPrinterFeedback] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playCashSuccess(formData.soundEnabled);
    onUpdateSettings(formData);
    storage.saveSettings(formData);
    showToast('Settings Saved!');
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
    showToast('Backup Downloaded!');
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
        showToast('Database Restored!');
        onRestoreAllData();
      } else {
        showToast('Invalid Backup JSON File!');
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllData = () => {
    localStorage.clear();
    sound.playCancel(formData.soundEnabled);
    setConfirmReset(false);
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 pb-28 space-y-5 select-none font-serif text-black bg-white">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-black p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
            STALL &amp; SYSTEM SETTINGS
          </h2>
          <p className="text-xs text-black/70 mt-1">
            Configure receipt branding, UPI payments, thermal printer size, security PIN, and backups.
          </p>
        </div>

        {saveToast && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white border border-red-600 text-xs font-bold shrink-0">
            <Check className="w-4 h-4" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-white border border-black text-xs">
        {[
          { id: 'stall' as const, label: 'Stall & Receipts', icon: Store },
          { id: 'payment' as const, label: 'UPI & Taxes', icon: QrCode },
          { id: 'pin' as const, label: 'Security PIN', icon: Lock },
          { id: 'backup' as const, label: 'Backup & Restore', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 font-bold uppercase transition-colors whitespace-nowrap flex items-center gap-1.5 min-h-[44px] border ${
                isActive
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-black border-transparent hover:border-black'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: STALL BRANDING & RECEIPTS */}
      {activeTab === 'stall' && (
        <form onSubmit={handleSave} className="p-4 sm:p-6 bg-white border border-black space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="font-bold block mb-1 uppercase text-black">Business Name</label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                className="w-full min-w-0 bg-white border border-black px-3 py-2.5 text-black text-xs focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="min-w-0">
              <label className="font-bold block mb-1 uppercase text-black">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="Premium Flavours in Every Bite"
                className="w-full min-w-0 bg-white border border-black px-3 py-2.5 text-black text-xs focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="font-bold block mb-1 uppercase text-black">Stall Address / Counter</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street food lane, counter 4..."
                className="w-full min-w-0 bg-white border border-black px-3 py-2.5 text-black text-xs focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="min-w-0">
              <label className="font-bold block mb-1 uppercase text-black">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full min-w-0 bg-white border border-black px-3 py-2.5 text-black text-xs focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-black/20">
            <div className="min-w-0">
              <label className="font-bold block mb-1 uppercase text-black">Default Order Type</label>
              <select
                value={formData.defaultOrderType}
                onChange={(e) => handleChange('defaultOrderType', e.target.value as OrderType)}
                className="w-full min-w-0 bg-white border border-black px-3 py-2.5 text-black focus:outline-none focus:border-red-600 uppercase min-h-[44px]"
              >
                <option value="dine-in">DINE-IN</option>
                <option value="parcel">PARCEL</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className="font-bold block mb-1 uppercase text-black">Thermal Printer Width</label>
              <select
                value={formData.thermalPrinterSize}
                onChange={(e) => handleChange('thermalPrinterSize', e.target.value as '58mm' | '80mm')}
                className="w-full min-w-0 bg-white border border-black px-3 py-2.5 text-black focus:outline-none focus:border-red-600 uppercase min-h-[44px]"
              >
                <option value="58mm">58mm (Pocket Thermal)</option>
                <option value="80mm">80mm (Standard Thermal)</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className="font-bold block mb-1 uppercase text-black">Halal Certification</label>
              <label className="flex items-center gap-2 p-2.5 bg-white border border-black cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={formData.isHalal}
                  onChange={(e) => handleChange('isHalal', e.target.checked)}
                  className="accent-red-600 w-4 h-4 shrink-0"
                />
                <span className="font-bold uppercase text-black">100% Halal Badge</span>
              </label>
            </div>
          </div>

          <div className="min-w-0">
            <label className="font-bold block mb-1 uppercase text-black">Receipt Footer Note</label>
            <input
              type="text"
              value={formData.receiptFooter}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              placeholder="Thank you for visiting! Follow us @thebbqboxx"
              className="w-full min-w-0 bg-white border border-black px-3 py-2.5 text-black text-xs focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="pt-2 border-t border-black/20">
            <label className="font-bold block mb-1.5 uppercase text-black">POS Theme Mode</label>
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              <button
                type="button"
                onClick={() => handleChange('twoColorTheme', 'red')}
                className={`py-2.5 px-3 text-xs font-bold uppercase border transition-colors min-h-[44px] ${
                  (formData.twoColorTheme || 'red') === 'red'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-black border-black hover:bg-black/5'
                }`}
              >
                White, Black &amp; Red
              </button>
              <button
                type="button"
                onClick={() => handleChange('twoColorTheme', 'bw')}
                className={`py-2.5 px-3 text-xs font-bold uppercase border transition-colors min-h-[44px] ${
                  formData.twoColorTheme === 'bw'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-black border-black hover:bg-black/5'
                }`}
              >
                Black &amp; White
              </button>
            </div>
          </div>

          {/* 58mm Bluetooth Mobile Thermal Printer Configuration */}
          <div className="pt-4 border-t border-black/20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold uppercase text-black flex items-center gap-1.5">
                  <Bluetooth className="w-4 h-4 text-red-600" />
                  <span>58mm Bluetooth Mobile Printer</span>
                </h3>
                <p className="text-[11px] text-black/70 mt-0.5">
                  Built for portable 58mm thermal printers (Posiflow / MTP-2 / PT-210).
                </p>
              </div>
              {blePrinterName && (
                <span className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase">
                  Connected: {blePrinterName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1 uppercase text-black">Preferred Print Method</label>
                <select
                  value={formData.printerMode || 'rawbt'}
                  onChange={(e) =>
                    handleChange('printerMode', e.target.value as 'rawbt' | 'bluetooth' | 'system')
                  }
                  className="w-full min-w-0 bg-white border border-black px-3 py-2.5 text-black focus:outline-none focus:border-red-600 min-h-[44px]"
                >
                  <option value="rawbt">Android RawBT (Recommended for 58mm BT)</option>
                  <option value="bluetooth">Direct Bluetooth (Chrome BLE)</option>
                  <option value="system">System Print / PDF</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="w-full flex items-center gap-2 p-2.5 bg-white border border-black cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.autoPrintOnBill)}
                    onChange={(e) => handleChange('autoPrintOnBill', e.target.checked)}
                    className="accent-red-600 w-4 h-4 shrink-0"
                  />
                  <span className="font-bold text-black text-xs">
                    Auto-Print straight on Cash / UPI checkout
                  </span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  sound.playTap(formData.soundEnabled);
                  const res = await connectBlePrinter();
                  setBlePrinterName(getConnectedBlePrinterName());
                  setPrinterFeedback(res.message);
                }}
                className="px-3 py-2 bg-white hover:bg-black hover:text-white text-black border border-black font-bold text-xs flex items-center gap-1.5 min-h-[40px]"
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>{blePrinterName ? 'Switch BLE Printer' : 'Pair Direct Bluetooth (BLE)'}</span>
              </button>

              {blePrinterName && (
                <button
                  type="button"
                  onClick={() => {
                    disconnectBlePrinter();
                    setBlePrinterName(null);
                    setPrinterFeedback('Disconnected BLE printer.');
                  }}
                  className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-600 font-bold text-xs min-h-[40px]"
                >
                  Disconnect
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  sound.playTap(formData.soundEnabled);
                  const mode = formData.printerMode === 'bluetooth' ? 'bluetooth' : 'rawbt';
                  const res = await sendTestPrint(formData, mode);
                  setBlePrinterName(getConnectedBlePrinterName());
                  setPrinterFeedback(res.message);
                }}
                className="px-3 py-2 bg-black hover:bg-black/90 text-white border border-black font-bold text-xs flex items-center gap-1.5 min-h-[40px]"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print 58mm Test Bill</span>
              </button>
            </div>

            {printerFeedback && (
              <div className="p-2.5 bg-white border border-black text-[11px] font-bold text-black">
                {printerFeedback}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer min-h-[40px]">
              <input
                type="checkbox"
                checked={formData.soundEnabled}
                onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                className="accent-red-600 w-4 h-4 shrink-0"
              />
              <span className="font-semibold text-black/80">Enable tactile sound feedback (taps, chime)</span>
            </label>

            <button
              type="submit"
              className="px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 font-bold text-xs border border-red-600 min-h-[44px] uppercase transition-colors"
            >
              Save Branding Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: UPI & TAXES */}
      {activeTab === 'payment' && (
        <form onSubmit={handleSave} className="p-4 sm:p-6 bg-white border border-black space-y-4 text-xs max-w-xl">
          <div>
            <h3 className="text-base font-bold uppercase text-black">UPI &amp; Tax Configuration</h3>
            <p className="text-xs text-black/70 mt-1">
              Set counter UPI ID so customers can scan dynamic QRs on your phone for exact amounts.
            </p>
          </div>

          <div className="space-y-3">
            <div className="min-w-0">
              <label className="font-bold block mb-1 uppercase text-black">UPI ID (VPA) *</label>
              <input
                type="text"
                required
                value={formData.upiId}
                onChange={(e) => handleChange('upiId', e.target.value)}
                placeholder="e.g. thebbqboxx@okaxis or 9876543210@paytm"
                className="w-full min-w-0 bg-white border border-black px-3 py-2.5 text-black focus:outline-none focus:border-red-600"
              />
              <span className="text-[11px] text-black/70 mt-1 block">
                QR code for exact bill amount will be generated directly using this UPI ID.
              </span>
            </div>

            <div className="min-w-0">
              <label className="font-bold block mb-1 uppercase text-black">GSTIN (Optional)</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => handleChange('gstin', e.target.value)}
                placeholder="e.g. 29AAAAA0000A1Z5"
                className="w-full min-w-0 bg-white border border-black px-3 py-2.5 text-black focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="p-3.5 bg-white border border-black space-y-2">
              <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  checked={formData.defaultGstEnabled}
                  onChange={(e) => handleChange('defaultGstEnabled', e.target.checked)}
                  className="accent-red-600 w-4 h-4 shrink-0"
                />
                <span className="font-bold uppercase text-black">Enable GST by Default on Bills</span>
              </label>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-black/80">Default GST Rate (%):</span>
                <input
                  type="number"
                  min="0"
                  max="28"
                  value={formData.defaultGstRate}
                  onChange={(e) => handleChange('defaultGstRate', Number(e.target.value) || 0)}
                  className="w-20 bg-white border border-black px-2.5 py-1.5 text-black font-bold focus:outline-none focus:border-red-600"
                />
                <span className="font-bold text-black">%</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-red-600 text-white hover:bg-red-700 font-bold text-xs border border-red-600 min-h-[44px] uppercase transition-colors"
          >
            Save Payment &amp; Tax Settings
          </button>
        </form>
      )}

      {/* TAB 3: SECURITY PIN */}
      {activeTab === 'pin' && (
        <form onSubmit={handleSave} className="p-4 sm:p-6 bg-white border border-black space-y-4 text-xs max-w-md">
          <div>
            <h3 className="text-base font-bold uppercase text-black">Admin &amp; Reports 4-Digit PIN</h3>
            <p className="text-xs text-black/70 mt-1">
              Protect sales reports and menu pricing from unauthorized staff modification.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 p-3.5 bg-white border border-black cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={formData.pinRequired}
                onChange={(e) => handleChange('pinRequired', e.target.checked)}
                className="accent-red-600 w-4 h-4 shrink-0"
              />
              <span className="font-bold uppercase text-black">Require 4-digit PIN for Admin &amp; Reports</span>
            </label>

            <div>
              <label className="font-bold block mb-1 uppercase text-black">Set 4-Digit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={formData.securityPin}
                onChange={(e) => handleChange('securityPin', e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                className="w-full bg-white border border-black px-3 py-2.5 text-black text-center tracking-widest text-lg font-bold focus:outline-none focus:border-red-600"
              />
              <span className="text-[11px] text-black/70 mt-1 block text-center">
                Default PIN is <strong>1234</strong>
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-red-600 text-white hover:bg-red-700 font-bold text-xs border border-red-600 min-h-[44px] uppercase transition-colors"
          >
            Save PIN Settings
          </button>
        </form>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 bg-white border border-black space-y-3 text-xs">
            <h3 className="text-base font-bold uppercase text-black">Full Database Backup</h3>
            <p className="text-black/70">
              Export all orders, bills, tokens, menu items, and settings as a single JSON file.
            </p>
            <button
              type="button"
              onClick={handleDownloadFullBackup}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 border border-red-600 transition-colors min-h-[44px] uppercase"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup (JSON)</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 bg-white border border-black space-y-3 text-xs">
            <h3 className="text-base font-bold uppercase text-black">Restore from Backup</h3>
            <p className="text-black/70">
              Restore an entire POS database backup from a previous backup file on your phone or computer.
            </p>
            <label className="w-full py-3 bg-white hover:bg-black hover:text-white text-black font-bold flex items-center justify-center gap-2 border border-black cursor-pointer transition-colors min-h-[44px] uppercase">
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
          <div className="sm:col-span-2 p-4 sm:p-5 bg-white border border-dashed border-black space-y-3 text-xs">
            <div className="flex items-center gap-2 text-black font-bold uppercase">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Factory Reset Clean Installation</span>
            </div>
            <p className="text-black/70">
              Clear all localStorage state and restore fresh defaults (including all Menu items &amp; Meal Boxes). Use with caution.
            </p>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2.5 bg-white hover:bg-red-600 hover:text-white hover:border-red-600 text-black font-bold border border-black transition-colors uppercase min-h-[44px]"
              >
                Reset All POS Data
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="font-bold text-red-600 uppercase">
                  Erase all bills &amp; settings?
                </span>
                <button
                  type="button"
                  onClick={handleResetAllData}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold border border-red-600 uppercase min-h-[44px]"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-4 py-2 bg-white hover:bg-black/5 text-black font-bold border border-black uppercase min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
