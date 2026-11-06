import React, { useState, useEffect } from 'react';
import { ActiveTab, AppSettings } from '../types';
import { Flame, WifiOff, Download, Lock, CheckCircle2 } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: AppSettings;
  isUnlocked: boolean;
  onLock: () => void;
  cartCount: number;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  isUnlocked,
  onLock,
  cartCount,
  onToggleTheme,
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
      <header className="sticky top-0 z-30 w-full bg-black border-b border-white px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('billing')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-8 h-8 rounded-none border border-white bg-black flex items-center justify-center text-white">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-white uppercase whitespace-nowrap">
                    {settings.businessName}
                  </span>
                  {settings.isHalal && (
                    <span className="text-[10px] font-bold text-white border border-white px-1.5 py-0.2 leading-none uppercase">
                      HALAL
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-white/80 font-normal italic truncate max-w-[170px] sm:max-w-none">
                  {settings.tagline}
                </div>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Desktop/Tablet) */}
          <nav className="hidden md:flex items-center gap-2">
            {[
              { id: 'billing' as ActiveTab, label: `Billing${cartCount > 0 ? ` (${cartCount})` : ''}` },
              { id: 'orders' as ActiveTab, label: 'Order History' },
              { id: 'reports' as ActiveTab, label: 'Reports' },
              { id: 'admin' as ActiveTab, label: 'Menu Admin' },
              { id: 'settings' as ActiveTab, label: 'Settings' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-bold border transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-black border-white'
                      : 'bg-black text-white border-white/30 hover:border-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Status */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 2-Color Theme toggle */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                title="Toggle Two-Color Palette (Black & White / Black & Red)"
                className="px-2 py-1 text-[11px] font-bold border border-white/60 hover:border-white bg-black text-white"
              >
                {settings.twoColorTheme === 'red' ? '2-Colour: Red' : '2-Colour: B&W'}
              </button>
            )}

            {/* Offline Status indicator */}
            {!isOnline && (
              <div
                title="Working 100% offline. All sales saved locally."
                className="flex items-center gap-1.5 px-2.5 py-1 border border-white bg-black text-white text-xs font-bold"
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline Mode</span>
              </div>
            )}

            {/* PWA Install Button */}
            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black border border-white text-xs font-bold transition-all whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}

            {isIOS && !isInstallable && (
              <button
                onClick={() => setShowIosGuide(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-black border border-white text-white text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add to Home</span>
              </button>
            )}

            {/* Clock & Lock Badge */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white">
              <span className="text-xs font-bold text-white tabular-nums">
                {currentTime}
              </span>
              {settings.pinRequired && isUnlocked && (
                <button
                  onClick={onLock}
                  title="Lock Admin and Reports"
                  className="p-1 border border-white bg-black text-white hover:bg-white hover:text-black transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm bg-black border border-white p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 border border-white text-white flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Install The BBQ Boxx</h3>
            <p className="text-xs text-white leading-relaxed text-left mb-4">
              1. Tap the <strong>Share button</strong> in Safari toolbar.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
              3. Enjoy full-screen offline POS at the counter!
            </p>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-white text-black border border-white font-bold text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
