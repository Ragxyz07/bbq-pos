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
  InventoryItem,
  InventoryLogEntry,
  ChickenItem,
  ChickenLogEntry,
  ChickenDeductionRule,
  StaffMember,
  StaffAttendanceRecord,
  StaffPayoutRecord,
} from './types';
import { storage } from './utils/storage';
import { sound } from './utils/sound';
import { getEffectiveFlavourSurcharge } from './utils/format';
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
import { InventoryView } from './components/inventory/InventoryView';
import { ChickenInventoryView } from './components/inventory/ChickenInventoryView';
import { ReportsView } from './components/reports/ReportsView';
import { StaffView } from './components/staff/StaffView';
import { MenuManager } from './components/admin/MenuManager';
import { SettingsView } from './components/settings/SettingsView';
import { Search, X, RotateCcw, Flame } from 'lucide-react';

export default function App() {
  // Core Data States
  const [categories, setCategories] = useState<Category[]>(() => storage.getCategories());
  const [items, setItems] = useState<MenuItem[]>(() => storage.getMenuItems());
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [bills, setBills] = useState<Bill[]>(() => storage.getBills());
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() =>
    storage.getInventoryItems()
  );
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLogEntry[]>(() =>
    storage.getInventoryLogs()
  );
  const [chickenItems, setChickenItems] = useState<ChickenItem[]>(() =>
    storage.getChickenItems()
  );
  const [chickenLogs, setChickenLogs] = useState<ChickenLogEntry[]>(() =>
    storage.getChickenLogs()
  );
  const [chickenRules, setChickenRules] = useState<ChickenDeductionRule[]>(() =>
    storage.getChickenRules()
  );
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() =>
    storage.getStaffMembers()
  );
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendanceRecord[]>(() =>
    storage.getStaffAttendance()
  );
  const [staffPayouts, setStaffPayouts] = useState<StaffPayoutRecord[]>(() =>
    storage.getStaffPayouts()
  );

  // Navigation & Security
  const [activeTab, setActiveTab] = useState<ActiveTab>('billing');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!settings.pinRequired);
  const [pendingTabForPin, setPendingTabForPin] = useState<ActiveTab | null>(null);

  // Billing & Cart States
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>(() => storage.getSavedCart());
  const [orderType, setOrderType] = useState<OrderType>(settings.defaultOrderType || 'dine-in');
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
  const [shouldAutoPrintReceipt, setShouldAutoPrintReceipt] = useState<boolean>(false);

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    item: CartItem;
    message: string;
  } | null>(null);

  // Save Cart to storage whenever changed
  useEffect(() => {
    storage.saveCart(cart);
  }, [cart]);

  // Tab switching with PIN protection
  const handleRequestTab = (tab: ActiveTab) => {
    if (
      (tab === 'reports' ||
        tab === 'staff' ||
        tab === 'admin' ||
        tab === 'inventory' ||
        tab === 'chicken-inventory') &&
      settings.pinRequired &&
      !isUnlocked
    ) {
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
    if (
      activeTab === 'reports' ||
      activeTab === 'staff' ||
      activeTab === 'admin' ||
      activeTab === 'inventory' ||
      activeTab === 'chicken-inventory'
    ) {
      setActiveTab('billing');
    }
  };

  // Add Item to Cart
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
    const flavourSurcharge = flavour
      ? getEffectiveFlavourSurcharge(flavour.surcharge, variant?.name)
      : 0;
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

    setUndoToast({
      item: itemToRemove,
      message: `Removed ${itemToRemove.name}`,
    });
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

  // Complete Sale & auto-deduct chicken inventory
  const handleCompleteSale = (newBill: Bill) => {
    const updatedBills = storage.addBill(newBill);
    setBills(updatedBills);

    const chickenRes = storage.deductChickenForBill(newBill);
    setChickenItems(chickenRes.items);
    setChickenLogs(chickenRes.logs);

    setShouldAutoPrintReceipt(Boolean(settings.autoPrintOnBill));
    setCompletedReceiptBill(newBill);
    setIsPaymentOpen(false);
    setIsCartOpen(false);
    handleClearCart();
  };

  // Direct Cash / UPI checkout vs PaymentModal for Split
  const handleProceedToCheckout = (chosen?: PaymentMethod) => {
    if (cart.length === 0) return;

    const methodToUse: PaymentMethod = chosen || paymentMethod || 'cash';
    setPaymentMethod(methodToUse);

    if (methodToUse === 'cash' || methodToUse === 'upi') {
      sound.playCashSuccess(settings.soundEnabled);
      const billInfo = storage.getNextBillAndToken();

      const finalSplit =
        methodToUse === 'cash'
          ? {
              cash: finalTotal,
              upi: 0,
              card: 0,
              cashReceived: finalTotal,
              cashChange: 0,
            }
          : {
              cash: 0,
              upi: finalTotal,
              card: 0,
            };

      const newBill: Bill = {
        id: billInfo.billId,
        billNumber: billInfo.billNumber,
        tokenNumber: billInfo.tokenNumber,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        items: cart,
        itemCount: totalItemCount,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        gstEnabled,
        gstRate: settings.defaultGstRate,
        gstAmount,
        totalAmount: finalTotal,
        orderType,
        tableOrToken,
        paymentMethod: methodToUse,
        paymentSplit: finalSplit,
        status: 'completed',
      };

      handleCompleteSale(newBill);
      return;
    }

    setIsCartOpen(false);
    setIsPaymentOpen(true);
  };

  // Cancel / Void Bill & return chicken pcs back to Inventory
  const handleCancelBill = (billId: string, reason: string) => {
    const targetBill = bills.find((b) => b.id === billId);
    const updated = storage.cancelBill(billId, reason);
    setBills(updated);

    if (targetBill && targetBill.status === 'completed') {
      const chickenRes = storage.returnChickenForVoidBill(targetBill);
      setChickenItems(chickenRes.items);
      setChickenLogs(chickenRes.logs);
    }
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

  const nextBillInfo = React.useMemo(() => {
    if (!isPaymentOpen) return { billId: 'BBQ-0', billNumber: 0, tokenNumber: 0 };
    return storage.getNextBillAndToken();
  }, [isPaymentOpen]);

  const cartQtyByItemId: Record<string, number> = {};
  cart.forEach((ci) => {
    cartQtyByItemId[ci.itemId] = (cartQtyByItemId[ci.itemId] || 0) + ci.quantity;
  });

  const handleToggleTheme = () => {
    sound.playTap(settings.soundEnabled);
    const nextTheme = settings.twoColorTheme === 'red' ? 'bw' : 'red';
    const updated: AppSettings = { ...settings, twoColorTheme: nextTheme };
    setSettings(updated);
    storage.saveSettings(updated);
  };

  const lowStockCount = inventoryItems.filter((it) => it.currentStock <= it.minStock).length;
  const lowChickenCount = chickenItems.filter((it) => it.currentCount <= it.minCount).length;

  return (
    <div className="min-h-dvh bg-white text-black flex flex-col font-serif antialiased">
      {/* 1. Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleRequestTab}
        settings={settings}
        isUnlocked={isUnlocked}
        onLock={handleLock}
        cartCount={totalItemCount}
        lowStockCount={lowStockCount}
        lowChickenCount={lowChickenCount}
        onToggleTheme={handleToggleTheme}
      />

      {/* 2. Main Content Body */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* ================= BILLING SCREEN ================= */}
        {activeTab === 'billing' && (
          <div className="flex-1 flex flex-col lg:flex-row min-w-0">
            <div className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 pb-36 lg:pb-8">
              <div className="max-w-4xl w-full mx-auto space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-black/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search BBQ items, combos, flavours..."
                      className="w-full bg-white border border-black pl-10 pr-9 py-2.5 text-xs text-black placeholder-black/50 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-black/60 hover:text-black"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <CategoryTabs
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={setSelectedCategoryId}
                  categoryItemCounts={categoryItemCounts}
                />

                <div className="pt-1">
                  {displayedItems.length === 0 ? (
                    <div className="p-12 text-center bg-white border border-black">
                      <Flame className="w-10 h-10 text-red-600 mx-auto mb-2" />
                      <h4 className="text-sm font-bold uppercase tracking-wider">No items match your search</h4>
                      <p className="text-xs text-black/70 mt-1">
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
              onProceedToPayment={handleProceedToCheckout}
              soundEnabled={settings.soundEnabled}
              isDesktopSidebar={true}
            />
          </div>
        )}

        {/* ================= ORDER HISTORY SCREEN ================= */}
        {activeTab === 'orders' && (
          <div className="flex-1 min-w-0">
            <OrderHistory
              bills={bills}
              onReprintBill={(bill) => {
                setShouldAutoPrintReceipt(false);
                setCompletedReceiptBill(bill);
              }}
              onCancelBill={handleCancelBill}
              settings={settings}
              soundEnabled={settings.soundEnabled}
              onNewOrder={() => setActiveTab('billing')}
            />
          </div>
        )}

        {/* ================= CHICKEN INVENTORY SCREEN ================= */}
        {activeTab === 'chicken-inventory' && (
          <div className="flex-1 min-w-0">
            <ChickenInventoryView
              items={chickenItems}
              setItems={setChickenItems}
              logs={chickenLogs}
              setLogs={setChickenLogs}
              rules={chickenRules}
              setRules={setChickenRules}
              menuItems={items}
              soundEnabled={settings.soundEnabled}
            />
          </div>
        )}

        {/* ================= STOCK SCREEN ================= */}
        {activeTab === 'inventory' && (
          <div className="flex-1 min-w-0">
            <InventoryView
              items={inventoryItems}
              setItems={setInventoryItems}
              logs={inventoryLogs}
              setLogs={setInventoryLogs}
              soundEnabled={settings.soundEnabled}
            />
          </div>
        )}

        {/* ================= REPORTS SCREEN ================= */}
        {activeTab === 'reports' && (
          <div className="flex-1 min-w-0">
            <ReportsView
              bills={bills}
              settings={settings}
              soundEnabled={settings.soundEnabled}
            />
          </div>
        )}

        {/* ================= STAFF SCREEN ================= */}
        {activeTab === 'staff' && (
          <div className="flex-1 min-w-0">
            <StaffView
              staffMembers={staffMembers}
              setStaffMembers={setStaffMembers}
              attendanceRecords={staffAttendance}
              setAttendanceRecords={setStaffAttendance}
              payoutRecords={staffPayouts}
              setPayoutRecords={setStaffPayouts}
              soundEnabled={settings.soundEnabled}
            />
          </div>
        )}

        {/* ================= MENU ADMIN SCREEN ================= */}
        {activeTab === 'admin' && (
          <div className="flex-1 min-w-0">
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
          <div className="flex-1 min-w-0">
            <SettingsView
              settings={settings}
              onUpdateSettings={setSettings}
              onRestoreAllData={() => {
                setCategories(storage.getCategories());
                setItems(storage.getMenuItems());
                setSettings(storage.getSettings());
                setBills(storage.getBills());
                setInventoryItems(storage.getInventoryItems());
                setInventoryLogs(storage.getInventoryLogs());
                setChickenItems(storage.getChickenItems());
                setChickenLogs(storage.getChickenLogs());
                setChickenRules(storage.getChickenRules());
                setStaffMembers(storage.getStaffMembers());
                setStaffAttendance(storage.getStaffAttendance());
                setStaffPayouts(storage.getStaffPayouts());
              }}
              soundEnabled={settings.soundEnabled}
            />
          </div>
        )}
      </main>

      {/* 3. Mobile Sticky Bottom Cart Summary Bar */}
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
        lowStockCount={lowStockCount}
        lowChickenCount={lowChickenCount}
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
        onProceedToPayment={handleProceedToCheckout}
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
        onClose={() => {
          setCompletedReceiptBill(null);
          setShouldAutoPrintReceipt(false);
        }}
        settings={settings}
        autoPrintOnOpen={shouldAutoPrintReceipt}
        soundEnabled={settings.soundEnabled}
      />

      {/* 9. Security PIN Modal */}
      <PinModal
        isOpen={!!pendingTabForPin}
        targetTitle={
          pendingTabForPin === 'admin'
            ? 'Menu Admin'
            : pendingTabForPin === 'staff'
            ? 'Staff'
            : pendingTabForPin === 'chicken-inventory'
            ? 'Inventory'
            : pendingTabForPin === 'inventory'
            ? 'Stock'
            : 'Reports'
        }
        correctPin={settings.securityPin || '1234'}
        onSuccess={handlePinSuccess}
        onClose={() => setPendingTabForPin(null)}
        soundEnabled={settings.soundEnabled}
      />

      {/* 10. Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-32 md:bottom-6 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 bg-white border-2 border-black text-black px-3.5 py-2.5 shadow-2xl flex items-center justify-between sm:justify-start gap-3 max-w-md mx-auto">
          <span className="text-xs font-bold uppercase truncate">{undoToast.message}</span>
          <button
            type="button"
            onClick={() => {
              sound.playTap(settings.soundEnabled);
              setCart((prev) => [...prev, undoToast.item]);
              setUndoToast(null);
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white hover:bg-red-700 text-xs font-bold border border-red-600 transition-colors uppercase"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setUndoToast(null)}
            className="text-black hover:opacity-70 ml-1 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
