import React, { useState } from 'react';
import { Bill, DrawerClosing, CashDenominationCount, AppSettings } from '../../types';
import {
  Download,
  Calendar,
  Calculator,
  Share2,
  Send,
  Image as ImageIcon,
  Copy,
  Check,
} from 'lucide-react';
import {
  formatCurrency,
  formatDateTime,
  DayClosingSummary,
  generateDayClosingWhatsAppMessage,
} from '../../utils/format';
import {
  shareDayClosingAsImageToWhatsApp,
  downloadDayClosingImage,
} from '../../utils/billImage';
import { storage } from '../../utils/storage';
import { sound } from '../../utils/sound';

interface ReportsViewProps {
  bills: Bill[];
  settings?: AppSettings;
  soundEnabled?: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  bills,
  settings = storage.getSettings(),
  soundEnabled = true,
}) => {
  const [timeRange, setTimeRange] = useState<'today' | 'weekly' | 'monthly' | 'all'>('today');
  const [showDrawerModal, setShowDrawerModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [ownerPhone, setOwnerPhone] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isSharingImage, setIsSharingImage] = useState<boolean>(false);
  const [closings, setClosings] = useState<DrawerClosing[]>(() => storage.getDrawerClosings());

  // Cash Count state for End of Day closing
  const [openingFloat, setOpeningFloat] = useState<number>(500);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [denominations, setDenominations] = useState<CashDenominationCount>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });
  const [coinsAmount, setCoinsAmount] = useState<number>(0);

  // Filter bills based on range
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const filteredBills = bills.filter((b) => {
    const billDate = new Date(b.timestamp);
    if (timeRange === 'today') {
      return billDate.toISOString().split('T')[0] === todayStr;
    }
    if (timeRange === 'weekly') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return billDate >= sevenDaysAgo;
    }
    if (timeRange === 'monthly') {
      return (
        billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  const completedBills = filteredBills.filter((b) => b.status === 'completed');

  // KPI Calculations
  const totalRevenue = completedBills.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalOrders = completedBills.length;
  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Payment Breakdown
  let cashSales = 0;
  let upiSales = 0;
  let cardSales = 0;

  completedBills.forEach((b) => {
    if (b.paymentMethod === 'cash') cashSales += b.totalAmount;
    else if (b.paymentMethod === 'upi') upiSales += b.totalAmount;
    else if (b.paymentMethod === 'card') cardSales += b.totalAmount;
    else if (b.paymentMethod === 'split' && b.paymentSplit) {
      cashSales += b.paymentSplit.cash || 0;
      upiSales += b.paymentSplit.upi || 0;
      cardSales += b.paymentSplit.card || 0;
    }
  });

  // Top Items Map
  const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  completedBills.forEach((b) => {
    b.items.forEach((it) => {
      const key = it.name;
      if (!itemMap[key]) {
        itemMap[key] = { name: it.name, quantity: 0, revenue: 0 };
      }
      itemMap[key].quantity += it.quantity;
      itemMap[key].revenue += it.unitPrice * it.quantity;
    });
  });

  const topItems = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 8);

  // Hourly Distribution (for peak BBQ stall rush)
  const hourlyCount: Record<number, number> = {};
  completedBills.forEach((b) => {
    const hour = new Date(b.timestamp).getHours();
    hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
  });

  const displayHours = [16, 17, 18, 19, 20, 21, 22, 23];
  const maxHourlyBills = Math.max(...displayHours.map((h) => hourlyCount[h] || 0), 1);

  // CSV Export
  const handleExportCSV = () => {
    sound.playTap(soundEnabled);
    const headers = [
      'Bill ID',
      'Token Number',
      'Timestamp',
      'Order Type',
      'Reference',
      'Payment Method',
      'Total Amount',
      'Status',
      'Items Detail',
    ].join(',');

    const rows = filteredBills.map((b) => {
      const itemsStr = b.items
        .map(
          (it) =>
            `${it.quantity}x ${it.name}${it.variantName ? `(${it.variantName})` : ''}${
              it.flavourName ? `[${it.flavourName}]` : ''
            }`
        )
        .join('; ');

      return [
        b.id,
        b.tokenNumber,
        `"${formatDateTime(b.timestamp)}"`,
        b.orderType,
        `"${b.tableOrToken || ''}"`,
        b.paymentMethod,
        b.totalAmount,
        b.status,
        `"${itemsStr}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BBQ_Boxx_Sales_Report_${timeRange}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EOD Cash Drawer calculation
  const totalDenominationCash =
    (denominations[500] || 0) * 500 +
    (denominations[200] || 0) * 200 +
    (denominations[100] || 0) * 100 +
    (denominations[50] || 0) * 50 +
    (denominations[20] || 0) * 20 +
    (denominations[10] || 0) * 10 +
    coinsAmount;

  // Expected cash = Opening float + today's cash sales
  const todayCompletedBills = bills.filter(
    (b) =>
      new Date(b.timestamp).toISOString().split('T')[0] === todayStr &&
      b.status === 'completed'
  );

  const todayTotalSales = todayCompletedBills.reduce((sum, b) => sum + b.totalAmount, 0);

  let todayCashSales = 0;
  let todayUpiSales = 0;
  let todayCardSales = 0;

  todayCompletedBills.forEach((b) => {
    if (b.paymentMethod === 'cash') todayCashSales += b.totalAmount;
    else if (b.paymentMethod === 'upi') todayUpiSales += b.totalAmount;
    else if (b.paymentMethod === 'card') todayCardSales += b.totalAmount;
    else if (b.paymentMethod === 'split' && b.paymentSplit) {
      todayCashSales += b.paymentSplit.cash || 0;
      todayUpiSales += b.paymentSplit.upi || 0;
      todayCardSales += b.paymentSplit.card || 0;
    }
  });

  const todayDineInBills = todayCompletedBills.filter((b) => b.orderType === 'dine-in');
  const todayParcelBills = todayCompletedBills.filter((b) => b.orderType === 'parcel');
  const todayDineInSales = todayDineInBills.reduce((sum, b) => sum + b.totalAmount, 0);
  const todayParcelSales = todayParcelBills.reduce((sum, b) => sum + b.totalAmount, 0);

  const expectedDrawerCash = openingFloat + todayCashSales;
  const drawerVariance = totalDenominationCash - expectedDrawerCash;

  const todaySummary: DayClosingSummary = {
    dateStr: todayStr,
    totalSales: todayTotalSales,
    totalBills: todayCompletedBills.length,
    cashSales: todayCashSales,
    upiSales: todayUpiSales,
    cardSales: todayCardSales,
    dineInCount: todayDineInBills.length,
    parcelCount: todayParcelBills.length,
    dineInSales: todayDineInSales,
    parcelSales: todayParcelSales,
    openingFloat,
    countedCash: totalDenominationCash,
    expectedCash: expectedDrawerCash,
    variance: drawerVariance,
  };

  const handleShareWhatsAppText = () => {
    sound.playTap(soundEnabled);
    const message = generateDayClosingWhatsAppMessage(todaySummary, settings);
    let waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (ownerPhone && ownerPhone.trim()) {
      const clean = ownerPhone.replace(/\D/g, '');
      const finalPhone = clean.length === 10 ? `91${clean}` : clean;
      waUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    }
    window.open(waUrl, '_blank');
  };

  const handleShareWhatsAppImage = async () => {
    sound.playTap(soundEnabled);
    setIsSharingImage(true);
    try {
      await shareDayClosingAsImageToWhatsApp(todaySummary, settings, ownerPhone);
    } catch (err) {
      console.error('Error sharing daily report picture:', err);
    } finally {
      setIsSharingImage(false);
    }
  };

  const handleDownloadClosingPicture = async () => {
    sound.playTap(soundEnabled);
    try {
      await downloadDayClosingImage(todaySummary, settings);
    } catch (err) {
      console.error('Error downloading picture:', err);
    }
  };

  const handleCopySummary = () => {
    sound.playTap(soundEnabled);
    const text = generateDayClosingWhatsAppMessage(todaySummary, settings);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSaveClosing = () => {
    sound.playCashSuccess(soundEnabled);
    const newClosing: DrawerClosing = {
      id: `CLOSE-${Date.now()}`,
      timestamp: Date.now(),
      dateStr: todayStr,
      openingCash: openingFloat,
      expectedCash: expectedDrawerCash,
      actualCash: totalDenominationCash,
      difference: drawerVariance,
      denominations: { ...denominations },
      notes: closingNotes,
      totalSales: todayTotalSales,
      totalBills: todayCompletedBills.length,
      cashSales: todayCashSales,
      upiSales: todayUpiSales,
      cardSales: todayCardSales,
      closedAt: new Date().toISOString(),
    };

    const updated = storage.saveDrawerClosing(newClosing);
    setClosings(updated);
    setShowDrawerModal(false);
    setShowShareModal(true);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24 space-y-5 font-serif text-white bg-black">
      {/* Top Banner with Filter Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black border border-white p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              SALES REPORTS &amp; ANALYTICS
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 border border-white">
              [PIN VERIFIED]
            </span>
          </div>
          <p className="text-xs text-white/70 mt-1">
            Sales velocity, Hand Cash &amp; GPay reconciliation, top items, and daily closing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Range Buttons */}
          <div className="flex border border-white p-0.5 text-xs">
            {(['today', 'weekly', 'monthly', 'all'] as const).map((rng) => (
              <button
                key={rng}
                type="button"
                onClick={() => setTimeRange(rng)}
                className={`px-3 py-1 font-bold uppercase transition-colors ${
                  timeRange === rng
                    ? 'bg-white text-black'
                    : 'bg-black text-white hover:bg-white/10'
                }`}
              >
                {rng}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-white hover:text-black border border-white text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDrawerModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-white hover:text-black border border-white text-xs font-bold transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Drawer Closing</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap(soundEnabled);
              setShowShareModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black hover:bg-white/90 border border-white text-xs font-bold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Day Sales</span>
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-black border border-white flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">
            Total Sales ({timeRange.toUpperCase()})
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-[10px] text-white/70 mt-1">
            {completedBills.length} orders
          </div>
        </div>

        <div className="p-4 bg-black border border-white flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">
            Avg Order Value
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums">
            {formatCurrency(aov)}
          </div>
          <div className="text-[10px] text-white/70 mt-1">
            Per paying customer
          </div>
        </div>

        {/* Explicit Hand Cash KPI */}
        <div className="p-4 bg-black border-2 border-white flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white mb-1">
            HAND CASH
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums">
            {formatCurrency(cashSales)}
          </div>
          <div className="text-[10px] text-white/70 mt-1">
            {totalRevenue > 0 ? `${Math.round((cashSales / totalRevenue) * 100)}% of sales` : '0%'}
          </div>
        </div>

        {/* Explicit GPay / UPI KPI */}
        <div className="p-4 bg-black border-2 border-white flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white mb-1">
            GPAY / UPI
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums">
            {formatCurrency(upiSales)}
          </div>
          <div className="text-[10px] text-white/70 mt-1">
            {totalRevenue > 0 ? `${Math.round((upiSales / totalRevenue) * 100)}%` : '0%'}
            {cardSales > 0 ? ` • Card: ${formatCurrency(cardSales)}` : ''}
          </div>
        </div>
      </div>

      {/* Payment Split & Hourly Rush Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods Mix */}
        <div className="p-4 sm:p-5 bg-black border border-white space-y-4">
          <div className="flex items-center justify-between border-b border-white/20 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Payment Breakdown
            </h3>
            <span className="text-xs text-white/70">
              Total {formatCurrency(totalRevenue)}
            </span>
          </div>

          {/* Visual Bar */}
          <div className="h-3 w-full border border-white flex overflow-hidden">
            {totalRevenue > 0 ? (
              <>
                <div
                  style={{ width: `${(cashSales / totalRevenue) * 100}%` }}
                  className="bg-white h-full"
                  title={`Cash: ${formatCurrency(cashSales)}`}
                />
                <div
                  style={{ width: `${(upiSales / totalRevenue) * 100}%` }}
                  className="bg-black border-l border-r border-white h-full"
                  title={`UPI: ${formatCurrency(upiSales)}`}
                />
                <div
                  style={{ width: `${(cardSales / totalRevenue) * 100}%` }}
                  className="bg-white/40 h-full"
                  title={`Card: ${formatCurrency(cardSales)}`}
                />
              </>
            ) : (
              <div className="w-full bg-black" />
            )}
          </div>

          {/* Legend Items */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <div className="p-2.5 border border-white bg-black">
              <div className="font-bold mb-0.5 uppercase text-[11px]">
                Hand Cash
              </div>
              <div className="text-sm font-bold">
                {formatCurrency(cashSales)}
              </div>
              <div className="text-[10px] text-white/70">
                {totalRevenue > 0 ? `${Math.round((cashSales / totalRevenue) * 100)}%` : '0%'}
              </div>
            </div>

            <div className="p-2.5 border border-white bg-black">
              <div className="font-bold mb-0.5 uppercase text-[11px]">
                GPay / UPI
              </div>
              <div className="text-sm font-bold">
                {formatCurrency(upiSales)}
              </div>
              <div className="text-[10px] text-white/70">
                {totalRevenue > 0 ? `${Math.round((upiSales / totalRevenue) * 100)}%` : '0%'}
              </div>
            </div>

            <div className="p-2.5 border border-white bg-black">
              <div className="font-bold mb-0.5 uppercase text-[11px]">
                Card
              </div>
              <div className="text-sm font-bold">
                {formatCurrency(cardSales)}
              </div>
              <div className="text-[10px] text-white/70">
                {totalRevenue > 0 ? `${Math.round((cardSales / totalRevenue) * 100)}%` : '0%'}
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Rush Chart (Evening Peak) */}
        <div className="p-4 sm:p-5 bg-black border border-white space-y-3">
          <div className="flex items-center justify-between border-b border-white/20 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Evening Rush Hours (Counter Traffic)
            </h3>
            <span className="text-[11px] text-white/70">Orders by Hour</span>
          </div>

          <div className="h-36 flex items-end justify-between gap-2 pt-4">
            {displayHours.map((hr) => {
              const count = hourlyCount[hr] || 0;
              const heightPercent = maxHourlyBills > 0 ? (count / maxHourlyBills) * 100 : 0;
              const label = hr > 12 ? `${hr - 12} PM` : `${hr} AM`;

              return (
                <div key={hr} className="flex-1 flex flex-col items-center h-full justify-end gap-1.5">
                  <span className="text-[10px] font-bold">
                    {count > 0 ? count : ''}
                  </span>
                  <div className="w-full max-w-[28px] border border-white relative flex items-end overflow-hidden h-24 bg-black">
                    <div
                      style={{ height: `${Math.max(count > 0 ? 12 : 4, heightPercent)}%` }}
                      className={`w-full transition-all ${
                        count > 0 ? 'bg-white' : 'bg-transparent'
                      }`}
                    />
                  </div>
                  <span className="text-[9px] text-white/70 whitespace-nowrap">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Selling Items Table */}
      <div className="p-4 sm:p-5 bg-black border border-white space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider">
          Top Selling BBQ Items ({timeRange.toUpperCase()})
        </h3>

        {topItems.length === 0 ? (
          <p className="text-xs text-white/60 py-4 text-center">
            No completed sales in this period yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-white/20">
              <thead>
                <tr className="border-b border-white text-white font-bold text-[11px] bg-black">
                  <th className="py-2.5 px-3">RANK</th>
                  <th className="py-2.5 px-3">ITEM NAME</th>
                  <th className="py-2.5 px-3 text-right">QUANTITY SOLD</th>
                  <th className="py-2.5 px-3 text-right">REVENUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20">
                {topItems.map((item, idx) => (
                  <tr key={item.name} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white/70">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold">{item.name}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white/90">
                      {item.quantity} Orders
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                      {formatCurrency(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past Drawer Closings History */}
      {closings.length > 0 && (
        <div className="p-4 sm:p-5 bg-black border border-white space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Past Drawer Closings (Cash Reconciliations)
          </h3>
          <div className="space-y-2">
            {closings.slice(0, 5).map((cl) => (
              <div
                key={cl.id}
                className="p-3 border border-white bg-black flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold">{cl.dateStr}</div>
                  <div className="text-[11px] text-white/70">
                    Expected: {formatCurrency(cl.expectedCash)} • Actual: {formatCurrency(cl.actualCash)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold px-2 py-0.5 border border-white text-[11px] inline-block">
                    {cl.difference === 0
                      ? 'BALANCED (₹0)'
                      : cl.difference > 0
                      ? `+${formatCurrency(cl.difference)} EXCESS`
                      : `-${formatCurrency(Math.abs(cl.difference))} SHORTAGE`}
                  </span>
                  <div className="text-[10px] text-white/60 mt-0.5">
                    {formatDateTime(cl.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash Drawer Closing Modal */}
      {showDrawerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-lg bg-black border-2 border-white flex flex-col max-h-[92vh] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold uppercase">End-of-Day Cash Drawer Closing</h3>
                <span className="text-xs text-white/70">Reconcile physical cash with system bills</span>
              </div>
              <button
                onClick={() => setShowDrawerModal(false)}
                className="text-white hover:opacity-70 text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Expected Cash Summary */}
              <div className="grid grid-cols-2 gap-3 p-3 border border-white text-xs">
                <div>
                  <span className="text-white/70 block uppercase">Today's Cash Sales:</span>
                  <span className="text-base font-bold">
                    {formatCurrency(todayCashSales)}
                  </span>
                </div>
                <div>
                  <span className="text-white/70 block uppercase">Opening Cash Float:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs">₹</span>
                    <input
                      type="number"
                      value={openingFloat}
                      onChange={(e) => setOpeningFloat(Number(e.target.value) || 0)}
                      className="w-24 bg-black border border-white px-2 py-0.5 text-xs font-bold text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Denomination Counter */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2">
                  Count Physical Cash Notes in Drawer:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[500, 200, 100, 50, 20, 10].map((den) => {
                    const count = denominations[den] || 0;
                    return (
                      <div
                        key={den}
                        className="p-2.5 border border-white flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold">
                            ₹{den}
                          </div>
                          <div className="text-[10px] text-white/70">
                            = {formatCurrency(den * count)}
                          </div>
                        </div>

                        <input
                          type="number"
                          min="0"
                          value={count === 0 ? '' : count}
                          onChange={(e) =>
                            setDenominations({
                              ...denominations,
                              [den]: Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          placeholder="0"
                          className="w-14 bg-black border border-white px-2 py-1 text-center font-bold text-white text-xs"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Coins / Small Change */}
                <div className="mt-2.5 p-2.5 border border-white flex items-center justify-between">
                  <span className="text-xs font-bold uppercase">
                    Loose Coins &amp; Change Total:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={coinsAmount === 0 ? '' : coinsAmount}
                      onChange={(e) => setCoinsAmount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-24 bg-black border border-white px-2 py-1 text-right font-bold text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Reconciliation Status Card */}
              <div className="p-4 border border-white">
                <div className="flex items-center justify-between text-xs">
                  <span>Total Cash Counted in Drawer:</span>
                  <span className="font-bold text-sm">
                    {formatCurrency(totalDenominationCash)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span>System Expected Cash:</span>
                  <span className="text-white/80">
                    {formatCurrency(expectedDrawerCash)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/40 font-bold">
                  <span>Drawer Variance:</span>
                  <span className="text-base font-bold">
                    {drawerVariance === 0
                      ? '₹0 [EXACT MATCH]'
                      : drawerVariance > 0
                      ? `+${formatCurrency(drawerVariance)} [SURPLUS]`
                      : `-${formatCurrency(Math.abs(drawerVariance))} [SHORTAGE]`}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase block mb-1">
                  Closing Notes (Optional):
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. Returned ₹100 change to supplier, verified with night shift."
                  className="w-full bg-black border border-white p-2.5 text-xs text-white"
                  rows={2}
                />
              </div>
            </div>

            <div className="p-4 border-t border-white flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDrawerModal(false)}
                className="flex-1 py-2.5 bg-black hover:bg-white hover:text-black border border-white text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClosing}
                className="flex-1 py-2.5 bg-white text-black hover:bg-white/90 border border-white text-xs font-bold transition-colors"
              >
                Save &amp; Share Closing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Today's Sales Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md bg-black border-2 border-white flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold uppercase">Share Day Closing Report</h3>
                <span className="text-[11px] text-white/70">Total Sales, Hand Cash &amp; GPay Breakdown</span>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-white hover:opacity-70 p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Report Summary Card Preview */}
              <div className="p-4 border border-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {settings.businessName}
                  </span>
                  <span className="text-[11px] font-bold">
                    {todayStr}
                  </span>
                </div>

                <div className="p-3 border border-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-white/70 uppercase font-bold block">
                      Total Sales
                    </span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(todayTotalSales)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/70 block font-bold uppercase">Orders</span>
                    <span className="text-sm font-bold">
                      {todayCompletedBills.length} Completed
                    </span>
                  </div>
                </div>

                {/* Hand Cash & GPay Side by Side */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 border border-white">
                    <span className="text-[10px] font-bold block uppercase">
                      HAND CASH
                    </span>
                    <span className="text-base font-bold">
                      {formatCurrency(todayCashSales)}
                    </span>
                  </div>
                  <div className="p-2.5 border border-white">
                    <span className="text-[10px] font-bold block uppercase">
                      GPAY / UPI
                    </span>
                    <span className="text-base font-bold">
                      {formatCurrency(todayUpiSales)}
                    </span>
                  </div>
                </div>

                {/* Dine-in vs Parcel Orders Breakdown */}
                <div className="p-2.5 border border-white flex items-center justify-between text-xs">
                  <span>DINE-IN: {todayDineInBills.length} ({formatCurrency(todayDineInSales)})</span>
                  <span>PARCEL: {todayParcelBills.length} ({formatCurrency(todayParcelSales)})</span>
                </div>

                {/* Cash Drawer Reconciliation Summary */}
                <div className="text-[11px] text-white/70 space-y-0.5 border-t border-white/40 pt-2">
                  <div className="flex justify-between">
                    <span>Opening Float: {formatCurrency(openingFloat)}</span>
                    <span>Expected Drawer: {formatCurrency(expectedDrawerCash)}</span>
                  </div>
                  {totalDenominationCash > 0 && (
                    <div className="flex justify-between font-bold text-white">
                      <span>Counted Drawer Cash: {formatCurrency(totalDenominationCash)}</span>
                      <span>
                        {drawerVariance === 0
                          ? '[EXACT MATCH]'
                          : drawerVariance > 0
                          ? `+${formatCurrency(drawerVariance)} SURPLUS`
                          : `-${formatCurrency(Math.abs(drawerVariance))} SHORTAGE`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Recipient Phone Number */}
              <div>
                <label className="text-[11px] font-bold uppercase block mb-1">
                  Owner WhatsApp Number (Optional):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 text-xs font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="9876543210 (Leave blank for contacts picker)"
                    className="w-full bg-black border border-white pl-11 pr-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* 1. Share as Picture to WhatsApp */}
                <button
                  type="button"
                  onClick={handleShareWhatsAppImage}
                  disabled={isSharingImage}
                  className="w-full py-3 bg-white text-black hover:bg-white/90 border border-white text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{isSharingImage ? 'Generating Picture...' : 'Share Sales Report as Picture in WhatsApp'}</span>
                </button>

                {/* 2. Share as Text to WhatsApp */}
                <button
                  type="button"
                  onClick={handleShareWhatsAppText}
                  className="w-full py-2.5 bg-black hover:bg-white hover:text-black border border-white text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Sales Summary as WhatsApp Message</span>
                </button>

                {/* 3. Secondary Actions Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadClosingPicture}
                    className="py-2 px-3 bg-black hover:bg-white hover:text-black border border-white text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Picture</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="py-2 px-3 bg-black hover:bg-white hover:text-black border border-white text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Summary</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white text-center">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-xs text-white/70 hover:text-white uppercase font-bold"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
