import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  Category,
  MenuItem,
  ItemVariant,
  FlavourAddon,
  CartItem,
  Bill,
  AppSettings,
  OrderType,
  PaymentMethod,
} from './types';
import { storage } from './utils/storage';
import { sound } from './utils/sound';
import { formatCurrency } from './utils/format';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { PinModal } from './components/PinModal';
import { CategoryTabs } from './components/billing/CategoryTabs';
import { ItemCard } from './components/billing/ItemCard';
import { VariantPickerSheet } from './components/billing/VariantPickerSheet';
import { CartBar } from './components/billing/CartBar';
import { CartDrawer } from './components/billing/CartDrawer';
import { PaymentModal } from './components/billing/PaymentModal';
import { ReceiptModal } from './components/receipt/ReceiptModal';
import { OrderHistory } from './components/history/OrderHistory';
import { ReportsView } from './components/reports/ReportsView';
import { MenuManager } from './components/admin/MenuManager';
import { SettingsView } from './components/settings/SettingsView';
import { Search, X, RotateCcw, Flame } from 'lucide-react';

export default function App() {
  // Core Data States
  const [categories, setCategories] = useState<Category[]>(() => storage.getCategories());
  const [items, setItems] = useState<MenuItem[]>(() => storage.getMenuItems());
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [bills, setBills] = useState<Bill[]>(() => storage.getBills());

  // Navigation & Security
  const [activeTab, setActiveTab] = useState<ActiveTab>('billing');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!settings.pinRequired);
  const [pendingTabForPin, setPendingTabForPin] = useState<ActiveTab | null>(null);

  // Billing & Cart States
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>(() => storage.getSavedCart());
  const [orderType, setOrderType] = useState<OrderType>(
    settings.defaultOrderType === 'parcel' ? 'parcel' : 'dine-in'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    settings.defaultPaymentMethod || 'cash'
  );
  const [tableOrToken, setTableOrToken] = useState<string>('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [gstEnabled, setGstEnabled] = useState<boolean>(settings.defaultGstEnabled);

  // Modals & Sheets
  const [activePickerItem, setActivePickerItem] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [completedReceiptBill, setCompletedReceiptBill] = useState<Bill | null>(null);

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    item: CartItem;
    message: string;
  } | null>(null);

  // Save Cart to storage whenever changed
  useEffect(() => {
    storage.saveCart(cart);
  }, [cart]);

  // Tab switching with PIN protection for Reports & Admin
  const handleRequestTab = (tab: ActiveTab) => {
    if ((tab === 'reports' || tab === 'admin') && settings.pinRequired && !isUnlocked) {
      setPendingTabForPin(tab);
    } else {
      setActiveTab(tab);
    }
  };

  const handlePinSuccess = () => {
    setIsUnlocked(true);
    if (pendingTabForPin) {
      setActiveTab(pendingTabForPin);
      setPendingTabForPin(null);
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    if (activeTab === 'reports' || activeTab === 'admin') {
      setActiveTab('billing');
    }
  };

  // Add Item to Cart (1-tap or custom variant/flavour)
  const handleAddToCart = ({
    item,
    variant,
    flavour,
    quantity,
    notes,
  }: {
    item: MenuItem;
    variant?: ItemVariant;
    flavour?: FlavourAddon;
    quantity: number;
    notes?: string;
  }) => {
    sound.playTap(settings.soundEnabled);

    const variantPrice = variant ? variant.price : item.basePrice;
    const flavourSurcharge = flavour ? flavour.surcharge : 0;
    const unitPrice = variantPrice + flavourSurcharge;

    const cartItemId = `${item.id}-${variant?.id || 'base'}-${flavour?.id || 'plain'}-${notes || ''}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((ci) => ci.cartItemId === cartItemId);
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += quantity;
        return copy;
      }
      const newItem: CartItem = {
        cartItemId,
        itemId: item.id,
        name: item.name,
        variantId: variant?.id,
        variantName: variant?.name,
        variantPrice,
        flavourId: flavour?.id,
        flavourName: flavour?.name,
        flavourSurcharge,
        unitPrice,
        quantity,
        notes,
        isCombo: item.isCombo,
        comboDetails: item.comboDetails,
      };
      return [...prev, newItem];
    });
  };

  // Quick 1-tap add for simple items
  const handleQuickAdd = (item: MenuItem) => {
    handleAddToCart({
      item,
      quantity: 1,
    });
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((it) => (it.cartItemId === cartItemId ? { ...it, quantity: newQty } : it))
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    const itemToRemove = cart.find((it) => it.cartItemId === cartItemId);
    if (!itemToRemove) return;

    sound.playCancel(settings.soundEnabled);
    setCart((prev) => prev.filter((it) => it.cartItemId !== cartItemId));

    // Show Undo Toast
    setUndoToast({
      item: itemToRemove,
      message: `Removed ${itemToRemove.name}`,
    });
  };

  const handleUndoRemove = () => {
    if (!undoToast) return;
    sound.playTap(settings.soundEnabled);
    setCart((prev) => [...prev, undoToast.item]);
    setUndoToast(null);
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setTableOrToken('');
  };

  const handleUpdateItemNotes = (cartItemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((it) => (it.cartItemId === cartItemId ? { ...it, notes } : it))
    );
  };

  // Billing Totals
  const subtotal = cart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  const totalItemCount = cart.reduce((acc, it) => acc + it.quantity, 0);

  let discountAmount = 0;
  if (discountType === 'flat') {
    discountAmount = Math.min(subtotal, Math.max(0, discountValue));
  } else {
    discountAmount = Math.round((subtotal * Math.min(100, Math.max(0, discountValue))) / 100);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = gstEnabled ? Math.round((taxableAmount * settings.defaultGstRate) / 100) : 0;
  const finalTotal = taxableAmount + gstAmount;

  // Complete Sale
  const handleCompleteSale = (newBill: Bill) => {
    // Save to storage
    const updatedBills = storage.addBill(newBill);
    setBills(updatedBills);

    // Open Receipt & clear cart
    setCompletedReceiptBill(newBill);
    setIsPaymentOpen(false);
    setIsCartOpen(false);
    handleClearCart();
  };

  // Cancel / Refund Bill
  const handleCancelBill = (billId: string, reason: string) => {
    const updated = storage.cancelBill(billId, reason);
    setBills(updated);
  };

  // Category counts
  const categoryItemCounts: Record<string, number> = {};
  items.forEach((it) => {
    if (!it.isHidden) {
      categoryItemCounts[it.categoryId] = (categoryItemCounts[it.categoryId] || 0) + 1;
    }
  });

  // Filtered menu items for billing
  const displayedItems = items.filter((it) => {
    if (it.isHidden) return false;
    if (selectedCategoryId !== 'all' && it.categoryId !== selectedCategoryId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = it.name.toLowerCase().includes(q);
      const matchDesc = (it.description || '').toLowerCase().includes(q);
      const matchVariant = it.variants.some((v) => v.name.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchVariant) return false;
    }
    return true;
  });

  // Next bill ID preview
  const nextBillInfo = React.useMemo(() => {
    if (!isPaymentOpen) return { billId: 'BBQ-0', billNumber: 0, tokenNumber: 0 };
    return storage.getNextBillAndToken();
  }, [isPaymentOpen]);

  // Current qty map in cart for badge on cards
  const cartQtyByItemId: Record<string, number> = {};
  cart.forEach((ci) => {
    cartQtyByItemId[ci.itemId] = (cartQtyByItemId[ci.itemId] || 0) + ci.quantity;
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-serif antialiased">
      {/* 1. Header (Desktop & Mobile Top App Bar) */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleRequestTab}
        settings={settings}
        isUnlocked={isUnlocked}
        onLock={handleLock}
        cartCount={totalItemCount}
      />

      {/* 2. Main Content Body */}
      <main className="flex-1 flex overflow-hidden">
        {/* ================= BILLING SCREEN ================= */}
        {activeTab === 'billing' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Column: Menu Items & Categories */}
            <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-5 lg:p-6 pb-28 lg:pb-8">
              <div className="max-w-4xl w-full mx-auto space-y-3">
                {/* Search & Counter Search Header */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Fast search items (e.g. wings, combo, peri peri)..."
                      className="w-full bg-black border border-white pl-10 pr-9 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Horizontal Category Tabs */}
                <CategoryTabs
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={setSelectedCategoryId}
                  categoryItemCounts={categoryItemCounts}
                />

                {/* Items Grid */}
                <div className="pt-1">
                  {displayedItems.length === 0 ? (
                    <div className="p-12 text-center bg-black border border-white">
                      <Flame className="w-10 h-10 text-white/50 mx-auto mb-2" />
                      <h4 className="text-sm font-bold uppercase tracking-wider">No items match your search</h4>
                      <p className="text-xs text-white/70 mt-1">
                        Try clearing the search query or pick another category.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5">
                      {displayedItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onSelectItem={(selected) => setActivePickerItem(selected)}
                          onQuickAdd={handleQuickAdd}
                          currentCartQty={cartQtyByItemId[item.id] || 0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Permanent Right Sidebar Cart */}
            <CartDrawer
              isOpen={true}
              onClose={() => setIsCartOpen(false)}
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onUpdateItemNotes={handleUpdateItemNotes}
              orderType={orderType}
              setOrderType={setOrderType}
              tableOrToken={tableOrToken}
              setTableOrToken={setTableOrToken}
              discountType={discountType}
              setDiscountType={setDiscountType}
              discountValue={discountValue}
              setDiscountValue={setDiscountValue}
              gstEnabled={gstEnabled}
              setGstEnabled={setGstEnabled}
              gstRate={settings.defaultGstRate}
              settings={settings}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              onProceedToPayment={(chosen) => {
                if (chosen) setPaymentMethod(chosen);
                setIsPaymentOpen(true);
              }}
              soundEnabled={settings.soundEnabled}
              isDesktopSidebar={true}
            />
          </div>
        )}

        {/* ================= ORDER HISTORY SCREEN ================= */}
        {activeTab === 'orders' && (
          <div className="flex-1 overflow-y-auto">
            <OrderHistory
              bills={bills}
              onReprintBill={(bill) => setCompletedReceiptBill(bill)}
              onCancelBill={handleCancelBill}
              settings={settings}
              soundEnabled={settings.soundEnabled}
            />
          </div>
        )}

        {/* ================= REPORTS SCREEN ================= */}
        {activeTab === 'reports' && (
          <div className="flex-1 overflow-y-auto">
            <ReportsView bills={bills} settings={settings} soundEnabled={settings.soundEnabled} />
          </div>
        )}

        {/* ================= MENU ADMIN SCREEN ================= */}
        {activeTab === 'admin' && (
          <div className="flex-1 overflow-y-auto">
            <MenuManager
              categories={categories}
              setCategories={setCategories}
              items={items}
              setItems={setItems}
              soundEnabled={settings.soundEnabled}
            />
          </div>
        )}

        {/* ================= SETTINGS SCREEN ================= */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto">
            <SettingsView
              settings={settings}
              onUpdateSettings={setSettings}
              onRestoreAllData={() => {
                setCategories(storage.getCategories());
                setItems(storage.getMenuItems());
                setSettings(storage.getSettings());
                setBills(storage.getBills());
              }}
              soundEnabled={settings.soundEnabled}
            />
          </div>
        )}
      </main>

      {/* 3. Mobile Sticky Bottom Cart Summary Bar (When on billing tab and cart has items) */}
      {activeTab === 'billing' && (
        <CartBar
          itemCount={totalItemCount}
          totalAmount={finalTotal}
          onOpenCart={() => setIsCartOpen(true)}
        />
      )}

      {/* 4. Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleRequestTab}
        cartCount={totalItemCount}
      />

      {/* 5. Mobile Slide-up Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onUpdateItemNotes={handleUpdateItemNotes}
        orderType={orderType}
        setOrderType={setOrderType}
        tableOrToken={tableOrToken}
        setTableOrToken={setTableOrToken}
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
        gstEnabled={gstEnabled}
        setGstEnabled={setGstEnabled}
        gstRate={settings.defaultGstRate}
        settings={settings}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onProceedToPayment={(chosen) => {
          if (chosen) setPaymentMethod(chosen);
          setIsCartOpen(false);
          setIsPaymentOpen(true);
        }}
        soundEnabled={settings.soundEnabled}
        isDesktopSidebar={false}
      />

      {/* 6. Variant & Flavour Picker Bottom Sheet */}
      <VariantPickerSheet
        item={activePickerItem}
        isOpen={!!activePickerItem}
        onClose={() => setActivePickerItem(null)}
        onAddToCart={handleAddToCart}
        soundEnabled={settings.soundEnabled}
      />

      {/* 7. Payment Settlement Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        cart={cart}
        orderType={orderType}
        tableOrToken={tableOrToken}
        subtotal={subtotal}
        discountType={discountType}
        discountValue={discountValue}
        discountAmount={discountAmount}
        gstEnabled={gstEnabled}
        gstRate={settings.defaultGstRate}
        gstAmount={gstAmount}
        totalAmount={finalTotal}
        settings={settings}
        onCompleteSale={handleCompleteSale}
        nextBillInfo={nextBillInfo}
        initialMethod={paymentMethod}
        soundEnabled={settings.soundEnabled}
      />

      {/* 8. Receipt & Kitchen Token Modal */}
      <ReceiptModal
        bill={completedReceiptBill}
        isOpen={!!completedReceiptBill}
        onClose={() => setCompletedReceiptBill(null)}
        settings={settings}
        soundEnabled={settings.soundEnabled}
      />

      {/* 9. Security PIN Modal */}
      <PinModal
        isOpen={!!pendingTabForPin}
        targetTitle={pendingTabForPin === 'admin' ? 'Menu Admin' : 'Reports'}
        correctPin={settings.securityPin || '1234'}
        onSuccess={handlePinSuccess}
        onClose={() => setPendingTabForPin(null)}
        soundEnabled={settings.soundEnabled}
      />

      {/* 10. Undo Toast for Deleted Cart Item */}
      {undoToast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black border-2 border-white text-white px-4 py-2.5 flex items-center gap-3">
          <span className="text-xs font-bold uppercase">{undoToast.message}</span>
          <button
            type="button"
            onClick={handleUndoRemove}
            className="flex items-center gap-1 px-2.5 py-1 bg-white text-black hover:bg-white/90 text-xs font-bold border border-white transition-colors uppercase"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setUndoToast(null)}
            className="text-white hover:opacity-70 ml-1 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
