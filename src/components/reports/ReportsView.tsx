import React, { useState, useMemo } from 'react';
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

const toLocalDateKey = (timestamp: number): string => {
  const d = new Date(timestamp);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseDateKey = (dateKey: string): Date => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  bills,
  settings = storage.getSettings(),
  soundEnabled = true,
}) => {
  const todayKey = toLocalDateKey(Date.now());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterdayDate.getTime());

  const [timeRange, setTimeRange] = useState<'day' | 'weekly' | 'monthly'>('day');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
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

  const getDayCategoryName = (dateKey: string) => {
    if (dateKey === todayKey) return 'Today';
    if (dateKey === yesterdayKey) return 'Yesterday';
    return parseDateKey(dateKey).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFullHeaderDate = (dateKey: string) => {
    return parseDateKey(dateKey).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Group counts per local calendar day matching OrderHistory
  const { dayCounts, orderedDayKeys } = useMemo(() => {
    const completedCounts: Record<string, number> = {};
    const allDates = new Set<string>([todayKey, yesterdayKey, selectedDateKey]);

    bills.forEach((b) => {
      const k = toLocalDateKey(b.timestamp);
      allDates.add(k);
      if (b.status === 'completed') {
        completedCounts[k] = (completedCounts[k] || 0) + 1;
      }
    });

    const sorted = Array.from(allDates).sort((a, b) => b.localeCompare(a));
    return { dayCounts: completedCounts, orderedDayKeys: sorted };
  }, [bills, todayKey, yesterdayKey, selectedDateKey]);

  const now = new Date();

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const billDate = new Date(b.timestamp);
      if (timeRange === 'day') {
        return toLocalDateKey(b.timestamp) === selectedDateKey;
      }
      if (timeRange === 'weekly') {
        const startOfWeekWindow = new Date();
        startOfWeekWindow.setHours(0, 0, 0, 0);
        startOfWeekWindow.setDate(startOfWeekWindow.getDate() - 6);
        return billDate >= startOfWeekWindow;
      }
      return (
        billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear()
      );
    });
  }, [bills, timeRange, selectedDateKey]);

  const completedBills = filteredBills.filter((b) => b.status === 'completed');

  const activeRangeLabel =
    timeRange === 'day'
      ? getDayCategoryName(selectedDateKey).toUpperCase()
      : timeRange === 'weekly'
      ? 'WEEKLY'
      : 'MONTHLY';

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
    const fileTag = timeRange === 'day' ? selectedDateKey : `${timeRange}_${todayKey}`;
    link.setAttribute('download', `BBQ_Boxx_Sales_Report_${fileTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EOD Cash Drawer calculation (uses selected date when in day view, otherwise today)
  const activeDayKey = timeRange === 'day' ? selectedDateKey : todayKey;

  const totalDenominationCash =
    (denominations[500] || 0) * 500 +
    (denominations[200] || 0) * 200 +
    (denominations[100] || 0) * 100 +
    (denominations[50] || 0) * 50 +
    (denominations[20] || 0) * 20 +
    (denominations[10] || 0) * 10 +
    coinsAmount;

  const dayCompletedBills = bills.filter(
    (b) => toLocalDateKey(b.timestamp) === activeDayKey && b.status === 'completed'
  );

  const dayTotalSales = dayCompletedBills.reduce((sum, b) => sum + b.totalAmount, 0);

  let dayCashSales = 0;
  let dayUpiSales = 0;
  let dayCardSales = 0;

  dayCompletedBills.forEach((b) => {
    if (b.paymentMethod === 'cash') dayCashSales += b.totalAmount;
    else if (b.paymentMethod === 'upi') dayUpiSales += b.totalAmount;
    else if (b.paymentMethod === 'card') dayCardSales += b.totalAmount;
    else if (b.paymentMethod === 'split' && b.paymentSplit) {
      dayCashSales += b.paymentSplit.cash || 0;
      dayUpiSales += b.paymentSplit.upi || 0;
      dayCardSales += b.paymentSplit.card || 0;
    }
  });

  const dayDineInBills = dayCompletedBills.filter((b) => b.orderType === 'dine-in');
  const dayParcelBills = dayCompletedBills.filter((b) => b.orderType === 'parcel');
  const dayDineInSales = dayDineInBills.reduce((sum, b) => sum + b.totalAmount, 0);
  const dayParcelSales = dayParcelBills.reduce((sum, b) => sum + b.totalAmount, 0);

  const expectedDrawerCash = openingFloat + dayCashSales;
  const drawerVariance = totalDenominationCash - expectedDrawerCash;

  const daySummary: DayClosingSummary = {
    dateStr: activeDayKey,
    totalSales: dayTotalSales,
    totalBills: dayCompletedBills.length,
    cashSales: dayCashSales,
    upiSales: dayUpiSales,
    cardSales: dayCardSales,
    dineInCount: dayDineInBills.length,
    parcelCount: dayParcelBills.length,
    dineInSales: dayDineInSales,
    parcelSales: dayParcelSales,
    openingFloat,
    countedCash: totalDenominationCash,
    expectedCash: expectedDrawerCash,
    variance: drawerVariance,
  };

  const handleShareWhatsAppText = () => {
    sound.playTap(soundEnabled);
    const message = generateDayClosingWhatsAppMessage(daySummary, settings);
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
      await shareDayClosingAsImageToWhatsApp(daySummary, settings, ownerPhone);
    } catch (err) {
      console.error('Error sharing daily report picture:', err);
    } finally {
      setIsSharingImage(false);
    }
  };

  const handleDownloadClosingPicture = async () => {
    sound.playTap(soundEnabled);
    try {
      await downloadDayClosingImage(daySummary, settings);
    } catch (err) {
      console.error('Error downloading picture:', err);
    }
  };

  const handleCopySummary = () => {
    sound.playTap(soundEnabled);
    const text = generateDayClosingWhatsAppMessage(daySummary, settings);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSaveClosing = () => {
    sound.playCashSuccess(soundEnabled);
    const newClosing: DrawerClosing = {
      id: `CLOSE-${Date.now()}`,
      timestamp: Date.now(),
      dateStr: activeDayKey,
      openingCash: openingFloat,
      expectedCash: expectedDrawerCash,
      actualCash: totalDenominationCash,
      difference: drawerVariance,
      denominations: { ...denominations },
      notes: closingNotes,
      totalSales: dayTotalSales,
      totalBills: dayCompletedBills.length,
      cashSales: dayCashSales,
      upiSales: dayUpiSales,
      cardSales: dayCardSales,
      closedAt: new Date().toISOString(),
    };

    const updated = storage.saveDrawerClosing(newClosing);
    setClosings(updated);
    setShowDrawerModal(false);
    setShowShareModal(true);
  };

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 pb-28 space-y-4 sm:space-y-5 font-serif text-black bg-white select-none">
      {/* Top Banner with Filter Tabs & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-2 border-black p-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-black">
              SALES REPORTS &amp; ANALYTICS
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 border border-black text-black">
              [PIN VERIFIED]
            </span>
          </div>
          <p className="text-xs text-black/70 mt-1">
            Day-wise sales reports, Hand Cash &amp; GPay reconciliation, top items, and daily closing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Range Buttons: Today | Yesterday | Weekly | Monthly */}
          <div className="flex border border-black p-0.5 text-xs bg-white overflow-x-auto no-scrollbar max-w-full">
            {[
              {
                id: 'today',
                label: 'Today',
                isActive: timeRange === 'day' && selectedDateKey === todayKey,
                onClick: () => {
                  setTimeRange('day');
                  setSelectedDateKey(todayKey);
                },
              },
              {
                id: 'yesterday',
                label: 'Yesterday',
                isActive: timeRange === 'day' && selectedDateKey === yesterdayKey,
                onClick: () => {
                  setTimeRange('day');
                  setSelectedDateKey(yesterdayKey);
                },
              },
              {
                id: 'weekly',
                label: 'Weekly',
                isActive: timeRange === 'weekly',
                onClick: () => setTimeRange('weekly'),
              },
              {
                id: 'monthly',
                label: 'Monthly',
                isActive: timeRange === 'monthly',
                onClick: () => setTimeRange('monthly'),
              },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => {
                  sound.playTap(soundEnabled);
                  btn.onClick();
                }}
                className={`px-2.5 sm:px-3 py-1.5 font-bold uppercase transition-colors min-h-[36px] whitespace-nowrap ${
                  btn.isActive
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-black hover:bg-black/5'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-black hover:text-white border border-black text-xs font-bold transition-colors min-h-[38px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDrawerModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-black hover:text-white border border-black text-xs font-bold transition-colors min-h-[38px]"
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 text-white hover:bg-red-700 border border-red-600 text-xs font-bold transition-colors min-h-[38px] shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Day Sales</span>
          </button>
        </div>
      </div>

      {/* Day Category Selector: Today, Yesterday, and Past Dates + Date Picker (Same as Order History) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-black/20">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {orderedDayKeys.map((dateKey) => {
            const isActive = timeRange === 'day' && selectedDateKey === dateKey;
            const count = dayCounts[dateKey] || 0;
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => {
                  sound.playTap(soundEnabled);
                  setSelectedDateKey(dateKey);
                  setTimeRange('day');
                }}
                className={`px-3 py-1.5 text-xs font-bold border transition-colors whitespace-nowrap flex items-center gap-1.5 min-h-[38px] ${
                  isActive
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-white text-black border-black/60 hover:border-black hover:bg-black/5'
                }`}
              >
                <span>{getDayCategoryName(dateKey)}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 border ${
                    isActive
                      ? 'bg-white text-red-600 border-white'
                      : 'bg-white text-black border-black/40'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Direct Date Picker */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <label className="flex items-center gap-1.5 border border-black/60 px-2.5 py-1.5 bg-white text-xs font-bold text-black min-h-[38px]">
            <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <input
              type="date"
              value={selectedDateKey}
              max={todayKey}
              onChange={(e) => {
                if (e.target.value) {
                  sound.playTap(soundEnabled);
                  setSelectedDateKey(e.target.value);
                  setTimeRange('day');
                }
              }}
              className="bg-transparent text-xs font-bold text-black focus:outline-none cursor-pointer"
              aria-label="Filter reports by date"
            />
          </label>
        </div>
      </div>

      {/* Selected Day / Period Banner */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 bg-black text-white text-[11px] font-bold uppercase tracking-wider">
            {activeRangeLabel}
          </span>
          <span className="text-xs sm:text-sm font-bold text-black">
            {timeRange === 'day'
              ? getFullHeaderDate(selectedDateKey)
              : timeRange === 'weekly'
              ? 'Last 7 Days'
              : now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="text-xs font-bold text-black/80 tabular-nums shrink-0">
          {completedBills.length} {completedBills.length === 1 ? 'Order' : 'Orders'} •{' '}
          {formatCurrency(totalRevenue)}
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 bg-white border border-black flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/70 mb-1">
            Total Sales ({activeRangeLabel})
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-black">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-[10px] text-black/70 mt-1">
            {completedBills.length} {completedBills.length === 1 ? 'order' : 'orders'}
          </div>
        </div>

        <div className="p-3.5 sm:p-4 bg-white border border-black flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/70 mb-1">
            Avg Order Value
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-black">
            {formatCurrency(aov)}
          </div>
          <div className="text-[10px] text-black/70 mt-1">
            Per paying customer
          </div>
        </div>

        {/* Explicit Hand Cash KPI */}
        <div className="p-3.5 sm:p-4 bg-white border-2 border-black flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black mb-1">
            HAND CASH
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-black">
            {formatCurrency(cashSales)}
          </div>
          <div className="text-[10px] text-black/70 mt-1">
            {totalRevenue > 0 ? `${Math.round((cashSales / totalRevenue) * 100)}% of sales` : '0%'}
          </div>
        </div>

        {/* Explicit GPay / UPI KPI */}
        <div className="p-3.5 sm:p-4 bg-white border-2 border-black flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black mb-1">
            GPAY / UPI
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-black">
            {formatCurrency(upiSales)}
          </div>
          <div className="text-[10px] text-black/70 mt-1">
            {totalRevenue > 0 ? `${Math.round((upiSales / totalRevenue) * 100)}%` : '0%'}
            {cardSales > 0 ? ` • Card: ${formatCurrency(cardSales)}` : ''}
          </div>
        </div>
      </div>

      {/* Payment Split & Hourly Rush Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods Mix */}
        <div className="p-4 sm:p-5 bg-white border border-black space-y-4">
          <div className="flex items-center justify-between border-b border-black/20 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black">
              Payment Breakdown
            </h3>
            <span className="text-xs text-black/70">
              Total {formatCurrency(totalRevenue)}
            </span>
          </div>

          {/* Visual Bar */}
          <div className="h-3 w-full border border-black flex overflow-hidden bg-white">
            {totalRevenue > 0 ? (
              <>
                <div
                  style={{ width: `${(cashSales / totalRevenue) * 100}%` }}
                  className="bg-black h-full"
                  title={`Cash: ${formatCurrency(cashSales)}`}
                />
                <div
                  style={{ width: `${(upiSales / totalRevenue) * 100}%` }}
                  className="bg-red-600 border-l border-r border-black h-full"
                  title={`UPI: ${formatCurrency(upiSales)}`}
                />
                {cardSales > 0 && (
                  <div
                    style={{ width: `${(cardSales / totalRevenue) * 100}%` }}
                    className="bg-black/30 h-full"
                    title={`Card: ${formatCurrency(cardSales)}`}
                  />
                )}
              </>
            ) : (
              <div className="w-full bg-white" />
            )}
          </div>

          {/* Legend Items */}
          <div className={`grid gap-2 pt-1 text-xs ${cardSales > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="p-2.5 border border-black bg-white">
              <div className="font-bold mb-0.5 uppercase text-[10px] sm:text-[11px] flex items-center gap-1">
                <span className="w-2 h-2 bg-black inline-block shrink-0" />
                <span>Hand Cash</span>
              </div>
              <div className="text-sm font-bold text-black">
                {formatCurrency(cashSales)}
              </div>
              <div className="text-[10px] text-black/70">
                {totalRevenue > 0 ? `${Math.round((cashSales / totalRevenue) * 100)}%` : '0%'}
              </div>
            </div>

            <div className="p-2.5 border border-black bg-white">
              <div className="font-bold mb-0.5 uppercase text-[10px] sm:text-[11px] flex items-center gap-1">
                <span className="w-2 h-2 bg-red-600 inline-block shrink-0" />
                <span>GPay / UPI</span>
              </div>
              <div className="text-sm font-bold text-black">
                {formatCurrency(upiSales)}
              </div>
              <div className="text-[10px] text-black/70">
                {totalRevenue > 0 ? `${Math.round((upiSales / totalRevenue) * 100)}%` : '0%'}
              </div>
            </div>

            {cardSales > 0 && (
              <div className="p-2.5 border border-black bg-white">
                <div className="font-bold mb-0.5 uppercase text-[10px] sm:text-[11px] flex items-center gap-1">
                  <span className="w-2 h-2 bg-black/30 border border-black inline-block shrink-0" />
                  <span>Card</span>
                </div>
                <div className="text-sm font-bold text-black">
                  {formatCurrency(cardSales)}
                </div>
                <div className="text-[10px] text-black/70">
                  {totalRevenue > 0 ? `${Math.round((cardSales / totalRevenue) * 100)}%` : '0%'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hourly Rush Chart (Evening Peak) */}
        <div className="p-4 sm:p-5 bg-white border border-black space-y-3">
          <div className="flex items-center justify-between border-b border-black/20 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black">
              Evening Rush Hours
            </h3>
            <span className="text-[11px] text-black/70">Orders by Hour</span>
          </div>

          <div className="h-36 flex items-end justify-between gap-1.5 sm:gap-2 pt-4 overflow-x-auto no-scrollbar">
            {displayHours.map((hr) => {
              const count = hourlyCount[hr] || 0;
              const heightPercent = maxHourlyBills > 0 ? (count / maxHourlyBills) * 100 : 0;
              const label = hr > 12 ? `${hr - 12} PM` : `${hr} AM`;

              return (
                <div key={hr} className="flex-1 min-w-[32px] flex flex-col items-center h-full justify-end gap-1.5">
                  <span className="text-[10px] font-bold text-black">
                    {count > 0 ? count : ''}
                  </span>
                  <div className="w-full max-w-[28px] border border-black relative flex items-end overflow-hidden h-24 bg-white">
                    <div
                      style={{ height: `${Math.max(count > 0 ? 12 : 4, heightPercent)}%` }}
                      className={`w-full transition-all ${
                        count > 0 ? 'bg-red-600' : 'bg-transparent'
                      }`}
                    />
                  </div>
                  <span className="text-[9px] text-black/70 whitespace-nowrap">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Selling Items Table */}
      <div className="p-4 sm:p-5 bg-white border border-black space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-black">
          Top Selling BBQ Items ({activeRangeLabel})
        </h3>

        {topItems.length === 0 ? (
          <p className="text-xs text-black/60 py-4 text-center">
            No completed sales in this period yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-black/30">
              <thead>
                <tr className="border-b-2 border-black text-black font-bold text-[11px] bg-white">
                  <th className="py-2.5 px-3">RANK</th>
                  <th className="py-2.5 px-3">ITEM NAME</th>
                  <th className="py-2.5 px-3 text-right">QTY SOLD</th>
                  <th className="py-2.5 px-3 text-right">REVENUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/15">
                {topItems.map((item, idx) => (
                  <tr key={item.name} className="hover:bg-black/5 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-black/70">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-black">{item.name}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-black/80">
                      {item.quantity} Orders
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums text-black">
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
        <div className="p-4 sm:p-5 bg-white border border-black space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black">
            Past Drawer Closings (Cash Reconciliations)
          </h3>
          <div className="space-y-2">
            {closings.slice(0, 5).map((cl) => (
              <div
                key={cl.id}
                className="p-3 border border-black bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-black">{cl.dateStr}</div>
                  <div className="text-[11px] text-black/70">
                    Expected: {formatCurrency(cl.expectedCash)} • Actual: {formatCurrency(cl.actualCash)}
                  </div>
                </div>

                <div className="sm:text-right">
                  <span className="font-bold px-2 py-0.5 border border-black text-[11px] inline-block text-black">
                    {cl.difference === 0
                      ? 'BALANCED (₹0)'
                      : cl.difference > 0
                      ? `+${formatCurrency(cl.difference)} EXCESS`
                      : `-${formatCurrency(Math.abs(cl.difference))} SHORTAGE`}
                  </span>
                  <div className="text-[10px] text-black/60 mt-0.5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-sm sm:max-w-md bg-white text-black border-2 border-black flex flex-col max-h-[84dvh] overflow-hidden shadow-2xl">
            <div className="px-3.5 sm:px-4 py-2.5 border-b-2 border-black flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold uppercase text-black">
                  Cash Drawer Closing ({getDayCategoryName(activeDayKey)})
                </h3>
                <span className="text-xs text-black/70">
                  {getFullHeaderDate(activeDayKey)}
                </span>
              </div>
              <button
                onClick={() => setShowDrawerModal(false)}
                className="w-8 h-8 border border-black flex items-center justify-center text-black hover:bg-black hover:text-white transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto touch-scroll space-y-3 flex-1 min-h-0">
              {/* Expected Cash Summary */}
              <div className="grid grid-cols-2 gap-3 p-3 border border-black text-xs bg-white">
                <div>
                  <span className="text-black/70 block uppercase">
                    {getDayCategoryName(activeDayKey)} Cash Sales:
                  </span>
                  <span className="text-base font-bold text-black">
                    {formatCurrency(dayCashSales)}
                  </span>
                </div>
                <div>
                  <span className="text-black/70 block uppercase">Opening Cash Float:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs">₹</span>
                    <input
                      type="number"
                      value={openingFloat}
                      onChange={(e) => setOpeningFloat(Number(e.target.value) || 0)}
                      className="w-24 bg-white border border-black px-2 py-0.5 text-xs font-bold text-black"
                    />
                  </div>
                </div>
              </div>

              {/* Denomination Counter */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2 text-black">
                  Count Physical Cash Notes in Drawer:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[500, 200, 100, 50, 20, 10].map((den) => {
                    const count = denominations[den] || 0;
                    return (
                      <div
                        key={den}
                        className="p-2.5 border border-black flex items-center justify-between bg-white"
                      >
                        <div>
                          <div className="text-xs font-bold text-black">
                            ₹{den}
                          </div>
                          <div className="text-[10px] text-black/70">
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
                          className="w-14 bg-white border border-black px-2 py-1 text-center font-bold text-black text-xs"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Coins / Small Change */}
                <div className="mt-2.5 p-2.5 border border-black flex items-center justify-between bg-white">
                  <span className="text-xs font-bold uppercase text-black">
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
                      className="w-24 bg-white border border-black px-2 py-1 text-right font-bold text-black text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Reconciliation Status Card */}
              <div className="p-4 border-2 border-black bg-white">
                <div className="flex items-center justify-between text-xs">
                  <span>Total Cash Counted in Drawer:</span>
                  <span className="font-bold text-sm text-black">
                    {formatCurrency(totalDenominationCash)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span>System Expected Cash:</span>
                  <span className="text-black/80">
                    {formatCurrency(expectedDrawerCash)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-black/30 font-bold">
                  <span>Drawer Variance:</span>
                  <span className={`text-base font-bold ${drawerVariance < 0 ? 'text-red-600' : 'text-black'}`}>
                    {drawerVariance === 0
                      ? '₹0 [EXACT MATCH]'
                      : drawerVariance > 0
                      ? `+${formatCurrency(drawerVariance)} [SURPLUS]`
                      : `-${formatCurrency(Math.abs(drawerVariance))} [SHORTAGE]`}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                  Closing Notes (Optional):
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. Returned ₹100 change to supplier, verified with night shift."
                  className="w-full bg-white border border-black p-2.5 text-xs text-black"
                  rows={2}
                />
              </div>
            </div>

            <div className="p-3 border-t-2 border-black flex items-center gap-2 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setShowDrawerModal(false)}
                className="flex-1 py-2 bg-white hover:bg-black/5 border border-black text-black text-xs font-bold transition-colors min-h-[42px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClosing}
                className="flex-1 py-2 bg-red-600 text-white hover:bg-red-700 border border-red-600 text-xs font-bold transition-colors min-h-[42px]"
              >
                Save &amp; Share Closing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Day Sales Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-sm sm:max-w-md bg-white text-black border-2 border-black flex flex-col overflow-hidden max-h-[84dvh] shadow-2xl">
            {/* Modal Header */}
            <div className="px-3.5 sm:px-4 py-2.5 border-b-2 border-black flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold uppercase text-black">
                  Share Day Closing Report ({getDayCategoryName(activeDayKey)})
                </h3>
                <span className="text-[11px] text-black/70">Total Sales, Hand Cash &amp; GPay Breakdown</span>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 border border-black flex items-center justify-center text-black hover:bg-black hover:text-white transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3 sm:p-4 space-y-3 overflow-y-auto touch-scroll flex-1 min-h-0">
              {/* Report Summary Card Preview */}
              <div className="p-4 border border-black space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-black">
                    {settings.businessName}
                  </span>
                  <span className="text-[11px] font-bold text-black">
                    {activeDayKey}
                  </span>
                </div>

                <div className="p-3 border border-black flex items-center justify-between bg-white">
                  <div>
                    <span className="text-[10px] text-black/70 uppercase font-bold block">
                      Total Sales
                    </span>
                    <span className="text-2xl font-bold text-black">
                      {formatCurrency(dayTotalSales)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-black/70 block font-bold uppercase">Orders</span>
                    <span className="text-sm font-bold text-black">
                      {dayCompletedBills.length} Completed
                    </span>
                  </div>
                </div>

                {/* Hand Cash & GPay Side by Side */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 border border-black bg-white">
                    <span className="text-[10px] font-bold block uppercase text-black/70">
                      HAND CASH
                    </span>
                    <span className="text-base font-bold text-black">
                      {formatCurrency(dayCashSales)}
                    </span>
                  </div>
                  <div className="p-2.5 border border-black bg-white">
                    <span className="text-[10px] font-bold block uppercase text-black/70">
                      GPAY / UPI
                    </span>
                    <span className="text-base font-bold text-black">
                      {formatCurrency(dayUpiSales)}
                    </span>
                  </div>
                </div>

                {/* Dine-in vs Parcel Orders Breakdown */}
                <div className="p-2.5 border border-black flex items-center justify-between text-xs bg-white flex-wrap gap-1">
                  <span>DINE-IN: {dayDineInBills.length} ({formatCurrency(dayDineInSales)})</span>
                  <span>PARCEL: {dayParcelBills.length} ({formatCurrency(dayParcelSales)})</span>
                </div>

                {/* Cash Drawer Reconciliation Summary */}
                <div className="text-[11px] text-black/70 space-y-0.5 border-t border-black/30 pt-2">
                  <div className="flex justify-between">
                    <span>Opening Float: {formatCurrency(openingFloat)}</span>
                    <span>Expected Drawer: {formatCurrency(expectedDrawerCash)}</span>
                  </div>
                  {totalDenominationCash > 0 && (
                    <div className="flex justify-between font-bold text-black">
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
                <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                  Owner WhatsApp Number (Optional):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/70 text-xs font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="9876543210 (Leave blank for contacts picker)"
                    className="w-full bg-white border border-black pl-11 pr-3 py-2 text-xs text-black placeholder-black/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* 1. Share as Picture to WhatsApp (BOLD RED) */}
                <button
                  type="button"
                  onClick={handleShareWhatsAppImage}
                  disabled={isSharingImage}
                  className="w-full py-3 bg-red-600 text-white hover:bg-red-700 border border-red-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 min-h-[44px]"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{isSharingImage ? 'Generating Picture...' : 'Share Sales Report as Picture in WhatsApp'}</span>
                </button>

                {/* 2. Share as Text to WhatsApp */}
                <button
                  type="button"
                  onClick={handleShareWhatsAppText}
                  className="w-full py-2.5 bg-white hover:bg-black hover:text-white border border-black text-black text-xs font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Sales Summary as WhatsApp Message</span>
                </button>

                {/* 3. Secondary Actions Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadClosingPicture}
                    className="py-2 px-3 bg-white hover:bg-black hover:text-white border border-black text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Picture</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="py-2 px-3 bg-white hover:bg-black hover:text-white border border-black text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
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
            <div className="p-3 border-t border-black text-center bg-white">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-xs text-black/70 hover:text-black uppercase font-bold"
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
