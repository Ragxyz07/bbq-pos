import React, { useState } from 'react';
import { Bill, AppSettings } from '../../types';
import {
  Search,
  Receipt,
  Ban,
  X,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { sound } from '../../utils/sound';

interface OrderHistoryProps {
  bills: Bill[];
  onReprintBill: (bill: Bill) => void;
  onCancelBill: (billId: string, reason: string) => void;
  settings: AppSettings;
  soundEnabled?: boolean;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  bills,
  onReprintBill,
  onCancelBill,
  settings: _settings,
  soundEnabled = true,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDate, setFilterDate] = useState<'today' | 'yesterday' | 'all'>('today');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterOrderType, setFilterOrderType] = useState<'all' | 'dine-in' | 'parcel'>('all');

  // Cancel Modal State
  const [cancellingBill, setCancellingBill] = useState<Bill | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Customer cancelled order');
  const [customReason, setCustomReason] = useState<string>('');

  // Date Filtering
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const filteredBills = bills.filter((bill) => {
    const billDateStr = new Date(bill.timestamp).toISOString().split('T')[0];

    if (filterDate === 'today' && billDateStr !== todayStr) return false;
    if (filterDate === 'yesterday' && billDateStr !== yesterdayStr) return false;

    if (filterStatus !== 'all' && bill.status !== filterStatus) return false;
    if (filterPayment !== 'all' && bill.paymentMethod !== filterPayment) return false;
    if (filterOrderType !== 'all' && bill.orderType !== filterOrderType) return false;

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

  const totalSalesToday = bills
    .filter(
      (b) =>
        new Date(b.timestamp).toISOString().split('T')[0] === todayStr &&
        b.status === 'completed'
    )
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const completedCountToday = bills.filter(
    (b) =>
      new Date(b.timestamp).toISOString().split('T')[0] === todayStr &&
      b.status === 'completed'
  ).length;

  const handleConfirmCancel = () => {
    if (!cancellingBill) return;
    const finalReason = customReason.trim() ? customReason.trim() : cancelReason;
    sound.playCancel(soundEnabled);
    onCancelBill(cancellingBill.id, finalReason);
    setCancellingBill(null);
    setCustomReason('');
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24 space-y-4 font-serif text-white bg-black">
      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black border border-white p-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            ORDER HISTORY &amp; BILLS
          </h2>
          <p className="text-xs text-white/70 mt-1">
            Search, reprint receipts/KOT, issue refunds, or track counter activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-black border border-white px-3.5 py-2 text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/70 block">
              Today's Orders
            </span>
            <span className="text-base font-bold">
              {completedCountToday} Bills
            </span>
          </div>

          <div className="bg-white text-black border border-white px-3.5 py-2 text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest block text-black/80">
              Today's Sales
            </span>
            <span className="text-base font-bold">
              {formatCurrency(totalSalesToday)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Bill #, Token #, or Item name..."
            className="w-full bg-black border border-white pl-10 pr-10 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white"
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

        {/* Date & Filter Chips */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          {/* Date Range */}
          <div className="flex items-center gap-1 border border-white p-0.5">
            <button
              onClick={() => setFilterDate('today')}
              className={`px-3 py-1 font-bold text-xs uppercase transition-colors ${
                filterDate === 'today'
                  ? 'bg-white text-black'
                  : 'bg-black text-white hover:bg-white/10'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilterDate('yesterday')}
              className={`px-3 py-1 font-bold text-xs uppercase transition-colors ${
                filterDate === 'yesterday'
                  ? 'bg-white text-black'
                  : 'bg-black text-white hover:bg-white/10'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setFilterDate('all')}
              className={`px-3 py-1 font-bold text-xs uppercase transition-colors ${
                filterDate === 'all'
                  ? 'bg-white text-black'
                  : 'bg-black text-white hover:bg-white/10'
              }`}
            >
              All Bills
            </button>
          </div>

          {/* Status, Order Type & Payment Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterOrderType}
              onChange={(e) => setFilterOrderType(e.target.value as 'all' | 'dine-in' | 'parcel')}
              className="bg-black border border-white text-white px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">ALL TYPES</option>
              <option value="dine-in">DINE-IN</option>
              <option value="parcel">PARCEL</option>
            </select>

            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="bg-black border border-white text-white px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">ALL PAYMENTS</option>
              <option value="cash">HAND CASH</option>
              <option value="upi">GPAY / UPI</option>
              <option value="card">CARD</option>
              <option value="split">SPLIT</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'cancelled')}
              className="bg-black border border-white text-white px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">ALL STATUS</option>
              <option value="completed">COMPLETED</option>
              <option value="cancelled">CANCELLED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bill List */}
      <div className="space-y-3">
        {filteredBills.length === 0 ? (
          <div className="p-12 text-center bg-black border border-white">
            <Receipt className="w-10 h-10 text-white/50 mx-auto mb-2" />
            <h4 className="text-sm font-bold uppercase tracking-wider">No Orders Found</h4>
            <p className="text-xs text-white/70 mt-1">
              Try adjusting your search query or date filter.
            </p>
          </div>
        ) : (
          filteredBills.map((bill) => {
            const isCancelled = bill.status === 'cancelled';
            return (
              <div
                key={bill.id}
                className={`p-4 border transition-colors ${
                  isCancelled
                    ? 'bg-black border-dashed border-white/40 opacity-70'
                    : 'bg-black border-white hover:border-white'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">
                      {bill.id}
                    </span>
                    <span className="text-xs font-bold bg-white text-black px-2 py-0.5 border border-white">
                      TOKEN #{bill.tokenNumber}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-white">
                      {bill.orderType === 'dine-in' ? 'DINE-IN' : 'PARCEL'}
                    </span>
                    {bill.tableOrToken && (
                      <span className="text-[11px] text-white/80">
                        REF: {bill.tableOrToken}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold tabular-nums block">
                      {formatCurrency(bill.totalAmount)}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-white inline-block mt-0.5">
                      {bill.paymentMethod === 'cash'
                        ? 'HAND CASH'
                        : bill.paymentMethod === 'upi'
                        ? 'GPAY / UPI'
                        : bill.paymentMethod === 'card'
                        ? 'CARD'
                        : 'SPLIT'}
                    </span>
                    {bill.paymentMethod === 'cash' && bill.paymentSplit?.cashReceived ? (
                      <span className="block text-[10px] text-white/70 mt-0.5">
                        Rec: {formatCurrency(bill.paymentSplit.cashReceived)} · Chg: {formatCurrency(bill.paymentSplit.cashChange || 0)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Items Summary */}
                <div className="my-2.5 text-xs text-white/90 space-y-1 border-t border-b border-white/20 py-2">
                  {bill.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span>
                        <strong className="text-white">{it.quantity}x</strong> {it.name}
                        {it.variantName ? ` (${it.variantName})` : ''}
                        {it.flavourName && it.flavourName !== 'Plain / Original' ? (
                          <span className="font-bold underline ml-1">[{it.flavourName}]</span>
                        ) : null}
                        {it.notes ? <span className="text-white/60 italic ml-1">- {it.notes}</span> : null}
                      </span>
                      <span className="font-bold text-[11px] tabular-nums">
                        {formatCurrency(it.unitPrice * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Cancelled Alert Banner */}
                {isCancelled && (
                  <div className="p-2 mb-2 bg-black border border-white text-xs flex items-center justify-between">
                    <span>
                      <strong>[CANCELLED / VOIDED]:</strong> {bill.cancelReason || 'Order voided'}
                    </span>
                    <span className="text-[10px] text-white/70">
                      {bill.cancelledAt ? formatDateTime(new Date(bill.cancelledAt).getTime()) : ''}
                    </span>
                  </div>
                )}

                {/* Bottom Action Footer */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-white/70">
                    {formatDateTime(bill.timestamp)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onReprintBill(bill)}
                      className="px-3 py-1.5 bg-white text-black hover:bg-white/90 text-xs font-bold flex items-center gap-1.5 border border-white transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Receipt / KOT</span>
                    </button>

                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingBill(bill);
                          setCancelReason('Customer cancelled order');
                          setCustomReason('');
                        }}
                        className="px-2.5 py-1.5 text-white hover:bg-white hover:text-black border border-white text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Void Bill</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cancellation / Refund Reason Modal */}
      {cancellingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-sm bg-black border-2 border-white p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-base font-bold uppercase">Void / Cancel Bill</h3>
                  <span className="text-xs text-white/70">
                    {cancellingBill.id} • {formatCurrency(cancellingBill.totalAmount)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCancellingBill(null)}
                className="text-white hover:opacity-70 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/80">
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
                  className={`flex items-center gap-2 p-2 text-xs cursor-pointer border ${
                    cancelReason === reason
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-black text-white border-white/40 hover:border-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={cancelReason === reason}
                    onChange={() => setCancelReason(reason)}
                    className="accent-black"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/80 block mb-1 uppercase">
                Custom Note (Optional):
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specific cashier notes..."
                className="w-full bg-black border border-white px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingBill(null)}
                className="flex-1 py-2 bg-black text-white hover:bg-white hover:text-black border border-white text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-2 bg-white text-black hover:bg-white/90 border border-white text-xs font-bold transition-colors"
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
