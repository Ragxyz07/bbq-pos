import React, { useState } from 'react';
import { Bill, AppSettings } from '../../types';
import {
  Search,
  Plus,
  X,
  AlertTriangle,
  Receipt,
  Ban,
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { sound } from '../../utils/sound';

interface OrderHistoryProps {
  bills: Bill[];
  onReprintBill: (bill: Bill) => void;
  onCancelBill: (billId: string, reason: string) => void;
  settings: AppSettings;
  soundEnabled?: boolean;
  onNewOrder?: () => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  bills,
  onReprintBill,
  onCancelBill,
  settings: _settings,
  soundEnabled = true,
  onNewOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDropdown, setFilterDropdown] = useState<string>('all');

  // Cancel Modal State
  const [cancellingBill, setCancellingBill] = useState<Bill | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Customer cancelled order');
  const [customReason, setCustomReason] = useState<string>('');

  const formatDateFriendly = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeFriendly = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const filteredBills = bills.filter((bill) => {
    if (filterDropdown === 'dine-in' && bill.orderType !== 'dine-in') return false;
    if (filterDropdown === 'parcel' && bill.orderType !== 'parcel') return false;
    if (filterDropdown === 'completed' && bill.status !== 'completed') return false;
    if (filterDropdown === 'cancelled' && bill.status !== 'cancelled') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = bill.id.toLowerCase().includes(q);
      const matchToken = String(bill.tokenNumber).includes(q);
      const matchRef = (bill.tableOrToken || '').toLowerCase().includes(q);
      const matchItem = bill.items.some((it) => it.name.toLowerCase().includes(q));
      if (!matchId && !matchToken && !matchRef && !matchItem) return false;
    }

    return true;
  });

  const handleConfirmCancel = () => {
    if (!cancellingBill) return;
    const finalReason = customReason.trim() ? customReason.trim() : cancelReason;
    sound.playCancel(soundEnabled);
    onCancelBill(cancellingBill.id, finalReason);
    setCancellingBill(null);
    setCustomReason('');
  };

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 pb-28 space-y-4 sm:space-y-5 bg-white text-black font-serif select-none">
      {/* Top Bar matching screenshot layout */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-black/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, order or etc"
            className="w-full bg-white border border-black/40 rounded-lg pl-10 pr-9 py-2.5 text-xs text-black placeholder-black/50 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 hover:text-black"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Middle & Right: Filter Dropdown & + New Order button */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={filterDropdown}
              onChange={(e) => setFilterDropdown(e.target.value)}
              className="w-full sm:w-36 appearance-none bg-white border border-black/40 rounded-lg px-3 py-2.5 pr-8 text-xs font-bold text-black focus:outline-none focus:border-red-600 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="dine-in">Dine-in</option>
              <option value="parcel">Parcel</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60 text-xs">
              ▼
            </span>
          </div>

          {onNewOrder && (
            <button
              type="button"
              onClick={onNewOrder}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white border border-red-600 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Order Cards matching screenshot */}
      {filteredBills.length === 0 ? (
        <div className="p-12 text-center bg-white border border-black/30 rounded-xl space-y-3">
          <Receipt className="w-12 h-12 text-black/40 mx-auto" />
          <h4 className="text-base font-bold text-black">No Orders Found</h4>
          <p className="text-xs text-black/60 max-w-sm mx-auto">
            {searchQuery
              ? `No bills matching "${searchQuery}". Clear your search to view all bills.`
              : 'Punch a new bill at the counter or start an order.'}
          </p>
          {onNewOrder && (
            <button
              type="button"
              onClick={onNewOrder}
              className="mt-2 px-5 py-2 bg-red-600 text-white font-bold text-xs rounded-lg hover:bg-red-700 border border-red-600"
            >
              + Create New Order
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {filteredBills.map((bill) => {
            const isCancelled = bill.status === 'cancelled';

            // Clean table/token badge identifier (e.g. "A4", "A3", "T1")
            const tokenIdentifier = bill.tableOrToken?.trim()
              ? bill.tableOrToken.length <= 4
                ? bill.tableOrToken.toUpperCase()
                : bill.tableOrToken.replace(/[^0-9a-zA-Z]/g, '').slice(0, 3).toUpperCase()
              : `T${bill.tokenNumber}`;

            const orderTitle = bill.tableOrToken
              ? bill.tableOrToken
              : `Customer Token #${bill.tokenNumber}`;

            return (
              <div
                key={bill.id}
                className="bg-white border-2 border-black/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:border-black transition-all"
              >
                <div>
                  {/* Card Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Square Token/Table Badge */}
                      <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 border border-red-300 font-bold flex items-center justify-center text-sm shrink-0 tracking-tight">
                        {tokenIdentifier}
                      </div>

                      {/* Customer / Order Info */}
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-black leading-tight">
                          {orderTitle}
                        </h4>
                        <span className="text-xs text-black/60 block mt-0.5">
                          Order #{bill.id}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Void Trigger on Top Right */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border tracking-wide uppercase ${
                          isCancelled
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}
                      >
                        {isCancelled ? 'Cancelled' : 'Completed'}
                      </span>
                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancellingBill(bill);
                            setCancelReason('Customer cancelled order');
                            setCustomReason('');
                          }}
                          title="Void / Cancel Bill"
                          className="p-1 text-red-600 hover:bg-red-50 border border-red-200 rounded-md transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Second Row: Date & Time */}
                  <div className="flex items-center justify-between text-xs text-black/60 pt-3">
                    <span>{formatDateFriendly(bill.timestamp)}</span>
                    <span className="font-medium">{formatTimeFriendly(bill.timestamp)}</span>
                  </div>

                  {/* Divider */}
                  <div className="border-b border-black/15 my-3" />

                  {/* 3-Column Table Header */}
                  <div className="grid grid-cols-12 text-xs text-black/50 font-semibold pb-1.5 px-0.5">
                    <span className="col-span-7">Items</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-3 text-right">Price</span>
                  </div>

                  {/* Itemized Rows */}
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {bill.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 text-xs text-black items-center py-0.5"
                      >
                        <span className="col-span-7 font-medium truncate pr-1">
                          {it.name}
                          {it.variantName ? ` (${it.variantName})` : ''}
                          {it.flavourName && it.flavourName !== 'Plain / Original' ? (
                            <span className="text-black/70 ml-1">[{it.flavourName}]</span>
                          ) : null}
                          {it.notes ? (
                            <span className="text-black/50 italic ml-1">- {it.notes}</span>
                          ) : null}
                        </span>
                        <span className="col-span-2 text-center text-black/70 tabular-nums font-medium">
                          {it.quantity}
                        </span>
                        <span className="col-span-3 text-right font-bold tabular-nums">
                          {formatCurrency(it.unitPrice * it.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Divider and Total */}
                  <div className="border-t border-black/15 pt-2.5 mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-black">Total</span>
                    <span className="text-base font-bold text-black tabular-nums">
                      {formatCurrency(bill.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Bottom 2 Action Buttons Row */}
                <div className="grid grid-cols-2 gap-2.5 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => onReprintBill(bill)}
                    className="py-2.5 px-3 bg-white text-black border border-black/60 hover:bg-black/5 hover:border-black text-xs sm:text-sm font-bold rounded-lg transition-colors text-center"
                  >
                    See Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onReprintBill(bill)}
                    className="py-2.5 px-3 bg-red-600 text-white border border-red-600 hover:bg-red-700 text-xs sm:text-sm font-bold rounded-lg transition-colors text-center shadow-xs"
                  >
                    {isCancelled ? 'View Void' : 'Pay Bills'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation / Refund Reason Modal */}
      {cancellingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-sm bg-white border-2 border-black p-4 space-y-3 rounded-xl shadow-2xl max-h-[82dvh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="text-base font-bold text-black uppercase">Void / Cancel Bill</h3>
                  <span className="text-xs text-black/70">
                    {cancellingBill.id} • {formatCurrency(cancellingBill.totalAmount)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCancellingBill(null)}
                className="text-black hover:opacity-70 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-black/80">
              Select reason for voiding this bill. The bill will be retained in audit logs with a cancelled status.
            </p>

            <div className="space-y-1.5">
              {[
                'Customer cancelled order',
                'Mistaken / accidental punch',
                'Item out of stock / kitchen shortage',
                'Payment failure / dispute',
                'Customer walked away',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2 p-2 text-xs cursor-pointer border rounded-md ${
                    cancelReason === reason
                      ? 'bg-red-50 text-red-700 font-bold border-red-500'
                      : 'bg-white text-black border-black/30 hover:border-black'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={cancelReason === reason}
                    onChange={() => setCancelReason(reason)}
                    className="accent-red-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-bold text-black/80 block mb-1 uppercase">
                Custom Note (Optional):
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specific cashier notes..."
                className="w-full bg-white border border-black/40 rounded-md px-3 py-1.5 text-xs text-black placeholder-black/40 focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingBill(null)}
                className="flex-1 py-2 bg-white text-black hover:bg-black/5 border border-black text-xs font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-2 bg-red-600 text-white hover:bg-red-700 border border-red-600 text-xs font-bold rounded-lg transition-colors"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
