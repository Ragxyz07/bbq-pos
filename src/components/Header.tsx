import React, { useState, useEffect } from 'react';
import { ActiveTab, AppSettings } from '../types';
import { Flame, WifiOff, Download, Lock } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: AppSettings;
  isUnlocked: boolean;
  onLock: () => void;
  cartCount: number;
  lowStockCount?: number;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  isUnlocked,
  onLock,
  cartCount,
  lowStockCount = 0,
}) => {
  const isOnline = useOnlineStatus();
  const { isInstallable, install, isIOS } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white border-b-2 border-black px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial">
            <button
              onClick={() => setActiveTab('billing')}
              className="flex items-center gap-2 text-left group focus:outline-none min-w-0"
            >
              <div className="w-8 h-8 shrink-0 rounded-none border border-black bg-white flex items-center justify-center text-red-600">
                <Flame className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm sm:text-lg font-bold tracking-tight text-black uppercase whitespace-nowrap truncate">
                    {settings.businessName}
                  </span>
                  {settings.isHalal && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-red-600 border border-red-600 px-1 py-0.2 leading-none uppercase shrink-0">
                      HALAL
                    </span>
                  )}
                </div>
                <div className="text-[10px] sm:text-[11px] text-black/70 font-normal italic truncate">
                  {settings.tagline}
                </div>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Desktop/Tablet) */}
          <nav className="hidden md:flex items-center gap-2">
            {[
              { id: 'billing' as ActiveTab, label: `Billing${cartCount > 0 ? ` (${cartCount})` : ''}` },
              { id: 'orders' as ActiveTab, label: 'Orders' },
              {
                id: 'inventory' as ActiveTab,
                label: 'Inventory',
                alertCount: lowStockCount > 0 ? lowStockCount : undefined,
              },
              { id: 'reports' as ActiveTab, label: 'Reports' },
              { id: 'admin' as ActiveTab, label: 'Menu Admin' },
              { id: 'settings' as ActiveTab, label: 'Settings' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold border transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-black border-black hover:bg-black/5'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.alertCount !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-bold leading-tight border ${
                        isActive
                          ? 'bg-white text-red-600 border-white'
                          : 'bg-red-600 text-white border-red-600'
                      }`}
                    >
                      {tab.alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Status */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Offline Status indicator */}
            {!isOnline && (
              <div
                title="Working 100% offline. All sales saved locally."
                className="flex items-center gap-1.5 px-2.5 py-1 border border-black bg-white text-black text-xs font-bold"
              >
                <WifiOff className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden sm:inline">Offline Mode</span>
              </div>
            )}

            {/* PWA Install Button */}
            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white border border-red-600 text-xs font-bold transition-all whitespace-nowrap hover:bg-red-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}

            {isIOS && !isInstallable && (
              <button
                onClick={() => setShowIosGuide(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-black text-black text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden sm:inline">Add to Home</span>
              </button>
            )}

            {/* Clock & Lock Badge */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-black">
              <span className="text-xs font-bold text-black tabular-nums">
                {currentTime}
              </span>
              {settings.pinRequired && isUnlocked && (
                <button
                  onClick={onLock}
                  title="Lock Admin and Reports"
                  className="p-1 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* iOS Install Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-sm bg-white border-2 border-black p-4 sm:p-5 max-h-[82dvh] overflow-y-auto touch-scroll text-center shadow-2xl">
            <div className="w-10 h-10 mx-auto mb-2.5 border border-black text-red-600 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-black mb-2 uppercase">Install The BBQ Boxx</h3>
            <p className="text-xs text-black/80 leading-relaxed text-left mb-4">
              1. Tap the <strong>Share button</strong> in Safari toolbar.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
              3. Enjoy full-screen offline POS at the counter!
            </p>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-red-600 text-white border border-red-600 font-bold text-xs uppercase hover:bg-red-700 min-h-[42px]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
