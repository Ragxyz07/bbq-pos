import { Bill, AppSettings } from '../types';
import { formatDateTime } from './format';

const padRight = (text: string, width: number): string => {
  if (text.length >= width) return text.slice(0, width);
  return text + ' '.repeat(width - text.length);
};

const padLeft = (text: string, width: number): string => {
  if (text.length >= width) return text.slice(0, width);
  return ' '.repeat(width - text.length) + text;
};

const lineBetween = (left: string, right: string, cols: number): string => {
  const maxLeft = Math.max(1, cols - right.length - 1);
  const clippedLeft = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  const spaces = Math.max(1, cols - clippedLeft.length - right.length);
  return clippedLeft + ' '.repeat(spaces) + right;
};

const centerText = (text: string, cols: number): string => {
  if (text.length >= cols) return text.slice(0, cols);
  const leftPad = Math.floor((cols - text.length) / 2);
  return ' '.repeat(leftPad) + text;
};

const rs = (amount: number): string => `Rs.${Math.round(amount)}`;

/**
 * Generates clean ESC/POS formatted plain-text receipt or KOT sized for 58mm (32 cols) or 80mm (48 cols).
 * Uses "Rs." instead of Unicode "₹" so all low-cost Android Bluetooth thermal printers print cleanly.
 */
export function buildThermalEscPosText(
  bill: Bill,
  settings: AppSettings,
  mode: 'receipt' | 'kot',
  printerWidth: '58mm' | '80mm'
): string {
  const cols = printerWidth === '80mm' ? 48 : 32;
  const dash = '-'.repeat(cols);
  const dbl = '='.repeat(cols);
  const lines: string[] = [];

  if (mode === 'kot') {
    lines.push(centerText('*** KITCHEN TOKEN ***', cols));
    lines.push(centerText(`TOKEN #${bill.tokenNumber}`, cols));
    lines.push(
      centerText(
        `${bill.orderType.toUpperCase()}${bill.tableOrToken ? ` - ${bill.tableOrToken}` : ''}`,
        cols
      )
    );
    lines.push(centerText(`PAID: ${bill.paymentMethod.toUpperCase()}`, cols));
    lines.push(centerText(`${formatDateTime(bill.timestamp)}`, cols));
    lines.push(centerText(`Bill: ${bill.id}`, cols));
    lines.push(dbl);

    bill.items.forEach((it) => {
      lines.push(`${it.quantity} x ${it.name}`);
      if (it.variantName) lines.push(`  Size: ${it.variantName}`);
      if (it.flavourName && it.flavourName !== 'Plain / Original') {
        lines.push(`  Flavour: ${it.flavourName}`);
      }
      if (it.notes) lines.push(`  NOTE: ${it.notes}`);
      lines.push(dash);
    });

    lines.push(centerText(`Total Items: ${bill.itemCount}`, cols));
    lines.push('');
    lines.push('');
    lines.push('');
    return lines.join('\n');
  }

  // Customer Receipt
  lines.push(centerText(settings.businessName.toUpperCase(), cols));
  if (settings.tagline) lines.push(centerText(settings.tagline, cols));
  if (settings.isHalal) lines.push(centerText('*** 100% HALAL ***', cols));
  if (settings.address) lines.push(centerText(settings.address, cols));
  if (settings.phone) lines.push(centerText(`Ph: ${settings.phone}`, cols));
  if (settings.gstin) lines.push(centerText(`GSTIN: ${settings.gstin}`, cols));
  lines.push(dash);

  lines.push(lineBetween(`BILL: ${bill.id}`, `TOKEN: #${bill.tokenNumber}`, cols));
  lines.push(lineBetween(formatDateTime(bill.timestamp), `[${bill.orderType.toUpperCase()}]`, cols));
  if (bill.tableOrToken) lines.push(`Ref: ${bill.tableOrToken}`);
  lines.push(dash);

  bill.items.forEach((it) => {
    let title = it.name;
    if (it.variantName) title += ` (${it.variantName})`;
    if (it.flavourName && it.flavourName !== 'Plain / Original') {
      title += ` [${it.flavourName}]`;
    }
    lines.push(title);
    const leftQty = `  ${it.quantity} x ${rs(it.unitPrice)}`;
    const rightAmt = rs(it.quantity * it.unitPrice);
    lines.push(lineBetween(leftQty, rightAmt, cols));
    if (it.notes) lines.push(`  * ${it.notes}`);
  });

  lines.push(dash);
  lines.push(lineBetween('Subtotal:', rs(bill.subtotal), cols));
  if (bill.discountAmount > 0) {
    lines.push(lineBetween('Discount:', `-${rs(bill.discountAmount)}`, cols));
  }
  if (bill.gstEnabled && bill.gstAmount > 0) {
    lines.push(lineBetween(`GST (${bill.gstRate}%):`, `+${rs(bill.gstAmount)}`, cols));
  }
  lines.push(dbl);
  lines.push(lineBetween('TOTAL:', rs(bill.totalAmount), cols));
  lines.push(dbl);

  lines.push(`PAYMENT: ${bill.paymentMethod.toUpperCase()}`);
  if (bill.paymentMethod === 'split' && bill.paymentSplit) {
    const parts = [
      bill.paymentSplit.cash > 0 ? `Cash ${rs(bill.paymentSplit.cash)}` : '',
      bill.paymentSplit.upi > 0 ? `UPI ${rs(bill.paymentSplit.upi)}` : '',
      bill.paymentSplit.card > 0 ? `Card ${rs(bill.paymentSplit.card)}` : '',
    ].filter(Boolean);
    if (parts.length) lines.push(`  (${parts.join(' | ')})`);
  }

  lines.push(dash);
  lines.push(centerText(settings.receiptFooter || 'Thank you for visiting!', cols));
  lines.push(centerText('The BBQ Boxx POS', cols));
  lines.push('');
  lines.push('');
  lines.push('');
  return lines.join('\n');
}

/**
 * Triggers Android RawBT app directly via rawbt:base64 intent URI.
 * Automatically wraps the ESC/POS init + paper feed/cut sequence.
 */
export function printViaRawBT(
  bill: Bill,
  settings: AppSettings,
  mode: 'receipt' | 'kot',
  printerWidth: '58mm' | '80mm'
): void {
  const escInit = '\x1B\x40'; // ESC @ initialize printer
  const escCut = '\x1D\x56\x42\x00'; // GS V B 0 partial cut (ignored safely on non-cutter portable printers)
  const body = buildThermalEscPosText(bill, settings, mode, printerWidth);
  const fullPayload = `${escInit}${body}\n${escCut}`;

  // UTF-8 safe base64 encoding
  const bytes = new TextEncoder().encode(fullPayload);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const base64 = btoa(binary);

  // Use anchor click to trigger Android RawBT intent cleanly without window.open
  const link = document.createElement('a');
  link.href = `rawbt:base64,${base64}`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export { padRight, padLeft };
