import { Bill, AppSettings } from '../types';

export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return `₹${Math.round(amount)}`;
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateOnly(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTimeOnly(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function generateUpiString(
  upiId: string,
  businessName: string,
  amount: number,
  billId: string
): string {
  const cleanUpi = encodeURIComponent(upiId.trim());
  const cleanName = encodeURIComponent(businessName.trim());
  const cleanAmount = amount.toFixed(2);
  const cleanNote = encodeURIComponent(`Bill ${billId}`);
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${cleanNote}`;
}

export function generateWhatsAppMessage(bill: Bill, settings: AppSettings): string {
  const lines: string[] = [
    `🔥 *${settings.businessName.toUpperCase()}*`,
    settings.tagline ? `_${settings.tagline}_` : '',
    settings.isHalal ? `✅ 100% Halal Certified` : '',
    `--------------------------------`,
    `🧾 *Bill:* ${bill.id} | *Token:* #${bill.tokenNumber}`,
    `📅 ${formatDateTime(bill.timestamp)}`,
    `🍽️ *Type:* ${bill.orderType.toUpperCase()}${bill.tableOrToken ? ` (${bill.tableOrToken})` : ''}`,
    `--------------------------------`,
  ];

  bill.items.forEach((item) => {
    let name = item.name;
    if (item.variantName) name += ` (${item.variantName})`;
    if (item.flavourName && item.flavourName !== 'Plain / Original') name += ` [${item.flavourName}]`;
    const lineTotal = item.unitPrice * item.quantity;
    lines.push(`${item.quantity}x ${name}  -  ₹${lineTotal}`);
    if (item.notes) {
      lines.push(`   ↳ Note: ${item.notes}`);
    }
  });

  lines.push(`--------------------------------`);
  lines.push(`Subtotal: ₹${bill.subtotal}`);
  if (bill.discountAmount > 0) {
    lines.push(`Discount: -₹${bill.discountAmount}`);
  }
  if (bill.gstEnabled && bill.gstAmount > 0) {
    lines.push(`GST (${bill.gstRate}%): +₹${bill.gstAmount}`);
  }
  lines.push(`*TOTAL AMOUNT: ₹${bill.totalAmount}*`);

  // Detailed Method of Payment Breakdown
  if (bill.paymentMethod === 'cash') {
    let cashText = `💵 *Payment Method:* CASH`;
    if (bill.paymentSplit?.cashReceived && bill.paymentSplit.cashReceived > 0) {
      cashText += ` (Received: ₹${bill.paymentSplit.cashReceived}, Change: ₹${bill.paymentSplit.cashChange || 0})`;
    }
    lines.push(cashText);
  } else if (bill.paymentMethod === 'upi') {
    lines.push(`📱 *Payment Method:* UPI QR (${settings.upiId || 'Verified'})`);
  } else if (bill.paymentMethod === 'card') {
    lines.push(`💳 *Payment Method:* CARD (POS Terminal)`);
  } else if (bill.paymentMethod === 'split') {
    const s = bill.paymentSplit;
    lines.push(`🔀 *Payment Method:* SPLIT`);
    lines.push(`   ↳ Cash: ₹${s?.cash || 0} | UPI: ₹${s?.upi || 0} | Card: ₹${s?.card || 0}`);
  } else {
    lines.push(`💳 *Payment Method:* ${String(bill.paymentMethod || '').toUpperCase()}`);
  }
  lines.push(`--------------------------------`);
  if (settings.phone) lines.push(`📞 Contact: ${settings.phone}`);
  if (settings.address) lines.push(`📍 ${settings.address}`);
  if (settings.receiptFooter) lines.push(`✨ ${settings.receiptFooter}`);

  return lines.filter(Boolean).join('\n');
}

export interface DayClosingSummary {
  dateStr: string;
  totalSales: number;
  totalBills: number;
  cashSales: number; // Hand Cash
  upiSales: number;  // GPay / UPI
  cardSales: number;
  dineInCount: number;
  parcelCount: number;
  dineInSales: number;
  parcelSales: number;
  openingFloat: number;
  actualDrawerCash?: number;
  drawerDifference?: number;
  countedCash?: number;
  variance?: number;
  expectedCash?: number;
  notes?: string;
}

export function generateDayClosingWhatsAppMessage(
  summary: DayClosingSummary,
  settings: AppSettings
): string {
  const lines: string[] = [
    `🔥 *${settings.businessName.toUpperCase()} - END OF DAY REPORT* 🔥`,
    `📅 *Date:* ${summary.dateStr}`,
    settings.tagline ? `_${settings.tagline}_` : '',
    `================================`,
    `💰 *TOTAL DAY SALES: ${formatCurrency(summary.totalSales)}*`,
    `🧾 *Total Completed Orders:* ${summary.totalBills}`,
    `================================`,
    `💳 *PAYMENT METHOD BREAKDOWN:*`,
    `💵 *Hand Cash:* ${formatCurrency(summary.cashSales)}`,
    `📱 *GPay / UPI:* ${formatCurrency(summary.upiSales)}`,
    summary.cardSales > 0 ? `💳 *Card:* ${formatCurrency(summary.cardSales)}` : '',
    `================================`,
    `📦 *ORDER BREAKDOWN (Dine-in / Parcel):*`,
    `🍽️ Dine-in: ${summary.dineInCount} bills (${formatCurrency(summary.dineInSales)})`,
    `🥡 Parcel: ${summary.parcelCount} bills (${formatCurrency(summary.parcelSales)})`,
    `================================`,
    `🏦 *CASH DRAWER RECONCILIATION:*`,
    `• Opening Cash Float: ${formatCurrency(summary.openingFloat)}`,
    `• Expected Cash in Drawer: ${formatCurrency(summary.openingFloat + summary.cashSales)}`,
  ];

  if (summary.actualDrawerCash !== undefined) {
    lines.push(`• Physical Cash Counted: ${formatCurrency(summary.actualDrawerCash)}`);
    const diff = summary.drawerDifference || 0;
    if (diff === 0) {
      lines.push(`• Drawer Status: *EXACT MATCH (₹0) ✅*`);
    } else if (diff > 0) {
      lines.push(`• Drawer Status: *SURPLUS +${formatCurrency(diff)} ⚠️*`);
    } else {
      lines.push(`• Drawer Status: *SHORTAGE -${formatCurrency(Math.abs(diff))} ⚠️*`);
    }
  }

  if (summary.notes && summary.notes.trim()) {
    lines.push(`================================`);
    lines.push(`📝 *Notes:* ${summary.notes.trim()}`);
  }

  lines.push(`================================`);
  lines.push(`Generated by The BBQ Boxx POS · ${formatDateTime(Date.now())}`);

  return lines.filter(Boolean).join('\n');
}
