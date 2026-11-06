import React, { useState } from 'react';
import { CartItem, OrderType, AppSettings, PaymentMethod } from '../../types';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Tag,
  Percent,
  Receipt,
  RotateCcw,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Banknote,
  QrCode,
  CreditCard,
  Split,
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { sound } from '../../utils/sound';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onUpdateItemNotes: (cartItemId: string, notes: string) => void;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  tableOrToken: string;
  setTableOrToken: (val: string) => void;
  discountType: 'flat' | 'percent';
  setDiscountType: (type: 'flat' | 'percent') => void;
  discountValue: number;
  setDiscountValue: (val: number) => void;
  gstEnabled: boolean;
  setGstEnabled: (enabled: boolean) => void;
  gstRate: number;
  settings: AppSettings;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (pm: PaymentMethod) => void;
  onProceedToPayment: (selectedMethod?: PaymentMethod) => void;
  soundEnabled?: boolean;
  isDesktopSidebar?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onUpdateItemNotes,
  orderType,
  setOrderType,
  tableOrToken,
  setTableOrToken,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  gstEnabled,
  setGstEnabled,
  gstRate,
  settings,
  paymentMethod,
  setPaymentMethod,
  onProceedToPayment,
  soundEnabled = true,
  isDesktopSidebar = false,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [showDiscountSheet, setShowDiscountSheet] = useState<boolean>(false);

  // Totals Calculation
  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const totalItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  let discountAmount = 0;
  if (discountType === 'flat') {
    discountAmount = Math.min(subtotal, Math.max(0, discountValue));
  } else {
    discountAmount = Math.round((subtotal * Math.min(100, Math.max(0, discountValue))) / 100);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = gstEnabled ? Math.round((taxableAmount * gstRate) / 100) : 0;
  const finalTotal = taxableAmount + gstAmount;

  if (!isOpen && !isDesktopSidebar) return null;

  const content = (
    <div className="flex flex-col h-full bg-black text-white select-none">
      {/* Drawer Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-white flex items-center justify-between shrink-0 bg-black">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border border-white bg-black flex items-center justify-center text-white">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold tracking-wide text-white">
              Current Bill
            </h3>
            <span className="text-[11px] text-white/70">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all items from the current bill?')) {
                  sound.playCancel(soundEnabled);
                  onClearCart();
                }
              }}
              className="px-2.5 py-1 text-[11px] font-bold text-white border border-white hover:bg-white hover:text-black transition-colors"
            >
              Clear
            </button>
          )}

          {!isDesktopSidebar && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 bg-black hover:bg-white hover:text-black border border-white flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Order Controls (Order Type & Table/Token) */}
      <div className="p-3 sm:p-4 bg-black border-b border-white/40 shrink-0 space-y-2.5">
        {/* Order Type Segmented Control (Only Dine-in and Parcel) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-black border border-white">
          {(['dine-in', 'parcel'] as OrderType[]).map((type) => {
            const isActive = orderType === type;
            const labels: Record<OrderType, string> = {
              'dine-in': 'Dine-in',
              parcel: 'Parcel',
            };
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  sound.playTap(soundEnabled);
                  setOrderType(type);
                }}
                className={`py-2 text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-white text-black'
                    : 'bg-black text-white hover:bg-white/10'
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>

        {/* Table or Token Input */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={tableOrToken}
              onChange={(e) => setTableOrToken(e.target.value)}
              placeholder="Table / Token # (e.g. Table 3, Token 5)"
              className="w-full bg-black border border-white px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none font-bold"
            />
          </div>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/60">
            <ShoppingBag className="w-12 h-12 stroke-1 mb-2 text-white/40" />
            <p className="text-sm font-bold text-white">Bill is empty</p>
            <p className="text-xs text-white/60 mt-1 max-w-[200px]">
              Tap items from the menu to build the order quickly.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.cartItemId}
              className="p-3 bg-black border border-white/50 flex flex-col gap-2"
            >
              {/* Item Top Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                      {item.name}
                    </span>
                    {item.variantName && (
                      <span className="text-[10px] font-bold text-white bg-black px-1.5 py-0.2 border border-white">
                        {item.variantName}
                      </span>
                    )}
                    {item.flavourName && item.flavourName !== 'Plain / Original' && (
                      <span className="text-[10px] font-bold text-white bg-black border border-white px-1.5 py-0.2">
                        {item.flavourName}
                      </span>
                    )}
                  </div>

                  {item.notes && (
                    <div className="text-[11px] text-white/80 italic mt-0.5">
                      ↳ Note: {item.notes}
                    </div>
                  )}

                  <div className="text-[11px] text-white/70 mt-0.5">
                    {formatCurrency(item.unitPrice)} each
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-white tabular-nums">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </div>
                </div>
              </div>

              {/* Quantity Stepper & Actions Row */}
              <div className="flex items-center justify-between pt-1 border-t border-white/30">
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(item.cartItemId);
                    setNoteText(item.notes || '');
                  }}
                  className="text-[10px] text-white underline hover:no-underline flex items-center gap-1 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>{item.notes ? 'Edit Note' : 'Add Note'}</span>
                </button>

                <div className="flex items-center gap-2 bg-black p-0.5 border border-white">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap(soundEnabled);
                      if (item.quantity === 1) {
                        onRemoveItem(item.cartItemId);
                      } else {
                        onUpdateQuantity(item.cartItemId, item.quantity - 1);
                      }
                    }}
                    className="w-7 h-7 bg-black hover:bg-white hover:text-black border border-white text-white flex items-center justify-center transition-colors min-h-[32px] min-w-[32px]"
                    aria-label="Decrease quantity"
                  >
                    {item.quantity === 1 ? (
                      <Trash2 className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <span className="text-xs font-bold text-white px-1.5 min-w-[20px] text-center tabular-nums">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap(soundEnabled);
                      onUpdateQuantity(item.cartItemId, item.quantity + 1);
                    }}
                    className="w-7 h-7 bg-white hover:bg-white/90 text-black border border-white flex items-center justify-center transition-colors min-h-[32px] min-w-[32px]"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Editing note inline */}
              {editingNoteId === item.cartItemId && (
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Note e.g. Spicy, extra crispy"
                    className="flex-1 bg-black border border-white px-2 py-1 text-xs text-white placeholder-white/40 focus:outline-none"
                    maxLength={50}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateItemNotes(item.cartItemId, noteText.trim());
                      setEditingNoteId(null);
                    }}
                    className="px-2.5 py-1 bg-white text-black border border-white text-xs font-bold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNoteId(null)}
                    className="px-2 py-1 text-white hover:underline text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom Summary & Settlement Box */}
      {cart.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-black border-t border-white shrink-0 space-y-2.5 pb-safe">
          {/* Discount & GST Controls */}
          <div className="space-y-1.5">
            {/* Quick Discount Trigger */}
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowDiscountSheet(!showDiscountSheet)}
                className="flex items-center gap-1 text-white underline hover:no-underline font-bold"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>
                  {discountAmount > 0
                    ? `Discount Applied (-${formatCurrency(discountAmount)})`
                    : '+ Add Discount'}
                </span>
              </button>

              {/* GST Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="border-white bg-black text-white focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-xs font-bold">GST ({gstRate}%)</span>
              </label>
            </div>

            {/* Expandable Discount Panel */}
            {showDiscountSheet && (
              <div className="p-2.5 bg-black border border-white space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Discount Mode</span>
                  <div className="flex border border-white">
                    <button
                      type="button"
                      onClick={() => setDiscountType('flat')}
                      className={`px-2 py-0.5 text-xs font-bold ${
                        discountType === 'flat'
                          ? 'bg-white text-black'
                          : 'bg-black text-white'
                      }`}
                    >
                      Flat ₹
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`px-2 py-0.5 text-xs font-bold ${
                        discountType === 'percent'
                          ? 'bg-white text-black'
                          : 'bg-black text-white'
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percent' ? 100 : subtotal}
                    value={discountValue === 0 ? '' : discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                    placeholder={discountType === 'flat' ? 'Amount in ₹' : 'Percentage %'}
                    className="flex-1 bg-black border border-white px-2.5 py-1 text-white"
                  />
                  {discountValue > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscountValue(0)}
                      className="text-xs text-white underline font-bold px-2"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {discountType === 'flat' ? (
                    <>
                      {[10, 20, 50, 100].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDiscountValue(amt)}
                          className="px-2 py-0.5 bg-black hover:bg-white hover:text-black border border-white text-white text-[10px] font-bold"
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {[5, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountValue(pct)}
                          className="px-2 py-0.5 bg-black hover:bg-white hover:text-black border border-white text-white text-[10px] font-bold"
                        >
                          {pct}%
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-1 text-xs pt-1.5 border-t border-white/40">
            <div className="flex items-center justify-between text-white/80 font-normal">
              <span>Subtotal</span>
              <span className="text-white font-bold">{formatCurrency(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-white font-bold">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            {gstEnabled && gstAmount > 0 && (
              <div className="flex items-center justify-between text-white/80 font-normal">
                <span>GST ({gstRate}%)</span>
                <span className="text-white font-bold">+{formatCurrency(gstAmount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-white font-bold text-sm sm:text-base pt-1.5 border-t border-white">
              <span>Grand Total</span>
              <span className="text-xl font-bold tabular-nums">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>

          {/* Method of Payment Selector */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold text-white tracking-wider block">
              Method of Payment:
            </span>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-black border border-white">
              {[
                { id: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote },
                { id: 'upi' as PaymentMethod, label: 'UPI QR', icon: QrCode },
                { id: 'card' as PaymentMethod, label: 'Card', icon: CreditCard },
                { id: 'split' as PaymentMethod, label: 'Split', icon: Split },
              ].map((pm) => {
                const Icon = pm.icon;
                const isSelected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => {
                      sound.playTap(soundEnabled);
                      setPaymentMethod(pm.id);
                    }}
                    className={`py-1.5 px-1 flex items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
                      isSelected
                        ? 'bg-white text-black'
                        : 'bg-black text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checkout CTA */}
          <button
            type="button"
            onClick={() => onProceedToPayment(paymentMethod)}
            className="w-full h-13 bg-white hover:bg-white/90 text-black border border-white font-bold text-sm sm:text-base flex items-center justify-between px-5 transition-colors min-h-[52px]"
          >
            <span>
              {paymentMethod === 'cash'
                ? 'Pay with Cash'
                : paymentMethod === 'upi'
                ? 'Scan UPI QR'
                : paymentMethod === 'card'
                ? 'Pay via Card'
                : 'Split Payment'}
            </span>
            <span className="text-xl font-bold tabular-nums">
              {formatCurrency(finalTotal)}
            </span>
          </button>
        </div>
      )}
    </div>
  );

  // If desktop sidebar, render inline. If mobile, render as bottom drawer.
  if (isDesktopSidebar) {
    return <aside className="w-80 lg:w-96 shrink-0 h-[calc(100vh-64px)] sticky top-16 border-l border-white bg-black hidden lg:block overflow-hidden">{content}</aside>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-sm lg:hidden animate-in fade-in duration-150">
      <div className="w-full max-w-lg h-[92vh] max-h-[800px] overflow-hidden shadow-2xl flex flex-col border-t border-white bg-black animate-in slide-in-from-bottom duration-200">
        {content}
      </div>
    </div>
  );
};
