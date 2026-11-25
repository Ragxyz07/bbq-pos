import React from 'react';
import { ActiveTab } from '../types';
import {
  UtensilsCrossed,
  Receipt,
  Package,
  Drumstick,
  BarChart3,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  cartCount: number;
  lowStockCount?: number;
  lowChickenCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  lowStockCount = 0,
  lowChickenCount = 0,
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
      label: 'Orders',
      icon: Receipt,
    },
    {
      id: 'chicken-inventory' as ActiveTab,
      label: 'Inventory',
      icon: Drumstick,
      badge: lowChickenCount > 0 ? lowChickenCount : undefined,
    },
    {
      id: 'inventory' as ActiveTab,
      label: 'Stock',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-black pb-safe md:hidden select-none">
      <div className="grid grid-cols-7 h-14 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center h-full min-h-[48px] transition-colors ${
                isActive ? 'text-red-600 font-bold' : 'text-black/60 hover:text-black'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110 text-red-600' : ''}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-600 text-white text-[9px] font-bold px-1 py-0.2 min-w-[14px] text-center border border-red-600">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[9.5px] tracking-tight mt-0.5 whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-red-600" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
