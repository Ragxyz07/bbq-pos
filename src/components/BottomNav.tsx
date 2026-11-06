import React from 'react';
import { ActiveTab } from '../types';
import { UtensilsCrossed, Receipt, BarChart3, Settings2, SlidersHorizontal } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  cartCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
}) => {
  const tabs = [
    {
      id: 'billing' as ActiveTab,
      label: 'Billing',
      icon: UtensilsCrossed,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      id: 'orders' as ActiveTab,
      label: 'History',
      icon: Receipt,
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Reports',
      icon: BarChart3,
    },
    {
      id: 'admin' as ActiveTab,
      label: 'Menu',
      icon: SlidersHorizontal,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      icon: Settings2,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-white pb-safe md:hidden select-none">
      <div className="grid grid-cols-5 h-14 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center h-full min-h-[48px] transition-colors ${
                isActive ? 'text-white font-bold' : 'text-white/60 hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-white' : ''}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-3 bg-white text-black text-[10px] font-bold px-1 py-0.2 min-w-[16px] text-center border border-black">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
