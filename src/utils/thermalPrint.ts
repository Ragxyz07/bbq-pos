import { Bill, AppSettings } from '../types';
import { formatDateTime } from './format';

// Standard ESC/POS command bytes compatible with 58mm portable Bluetooth printers (Posiflow, MTP-2, PT-210, XPrinter, RPP02)
const ESC = '\x1B';
const GS = '\x1D';
const CMD_INIT = `${ESC}@`;
const CMD_ALIGN_LEFT = `${ESC}a\x00`;
const CMD_ALIGN_CENTER = `${ESC}a\x01`;
const CMD_BOLD_ON = `${ESC}E\x01`;
const CMD_BOLD_OFF = `${ESC}E\x00`;
const CMD_SIZE_NORMAL = `${GS}!\x00`;
const CMD_SIZE_DOUBLE = `${GS}!\x11`; // 2x width & 2x height
const CMD_SIZE_TALL = `${GS}!\x01`; // 1x width & 2x height

const lineBetween = (left: string, right: string, cols: number): string => {
  const maxLeft = Math.max(1, cols - right.length - 1);
  const clippedLeft = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  const spaces = Math.max(1, cols - clippedLeft.length - right.length);
  return clippedLeft + ' '.repeat(spaces) + right;
};

const formatThreeColRow = (itemCol: string, qtyCol: string, amtCol: string, cols: number): string => {
  // 58mm = 32 cols -> 17 item + 1 + 4 qty + 1 + 9 amt = 32
  // 80mm = 48 cols -> 30 item + 1 + 5 qty + 1 + 11 amt = 48
  const qtyW = cols === 48 ? 5 : 4;
  const amtW = cols === 48 ? 11 : 9;
  const itemW = cols - qtyW - amtW - 2;

  const q = qtyCol.slice(0, qtyW).padStart(qtyW, ' ');
  const a = amtCol.slice(0, amtW).padStart(amtW, ' ');
  const i = itemCol.length > itemW ? itemCol.slice(0, itemW) : itemCol.padEnd(itemW, ' ');
  return `${i} ${q} ${a}`;
};

const rs = (amount: number): string => `Rs.${Math.round(amount)}`;

// Strip non-ASCII characters (like ₹) so low-cost 58mm portable Bluetooth printers never print garbled symbols
const toAscii = (str: string): string =>
  str.replace(/₹/g, 'Rs.').replace(/[^\x20-\x7E\n]/g, ' ');

/**
 * Generates ESC/POS receipt or KOT payload sized for 58mm (32 cols) or 80mm (48 cols) portable Bluetooth printers.
 * Layout matches clean thermal mobile receipts (Centered header, Item | Qty | Amount table, Bold Total, tear-bar feed).
 */
export function buildThermalEscPosPayload(
  bill: Bill,
  settings: AppSettings,
  mode: 'receipt' | 'kot',
  printerWidth: '58mm' | '80mm'
): string {
  const cols = printerWidth === '80mm' ? 48 : 32;
  const dash = '-'.repeat(cols);
  const dbl = '='.repeat(cols);
  const out: string[] = [CMD_INIT, CMD_SIZE_NORMAL, CMD_BOLD_OFF];

  if (mode === 'kot') {
    out.push(CMD_ALIGN_CENTER + CMD_BOLD_ON + '*** KITCHEN TOKEN ***' + CMD_BOLD_OFF);
    out.push(CMD_ALIGN_CENTER + CMD_SIZE_DOUBLE + CMD_BOLD_ON + `#${bill.tokenNumber}` + CMD_SIZE_NORMAL + CMD_BOLD_OFF);
    out.push(
      CMD_ALIGN_CENTER +
        CMD_BOLD_ON +
        `${bill.orderType.toUpperCase()}${bill.tableOrToken ? ` - ${toAscii(bill.tableOrToken)}` : ''}` +
        CMD_BOLD_OFF
    );
    out.push(CMD_ALIGN_CENTER + `PAID: ${bill.paymentMethod.toUpperCase()}`);
    out.push(CMD_ALIGN_CENTER + toAscii(formatDateTime(bill.timestamp)));
    out.push(CMD_ALIGN_CENTER + `Bill: ${bill.id}`);
    out.push(CMD_ALIGN_LEFT + dbl);

    bill.items.forEach((it) => {
      out.push(CMD_BOLD_ON + toAscii(`${it.quantity} x ${it.name}`) + CMD_BOLD_OFF);
      if (it.variantName) out.push(toAscii(`  Size: ${it.variantName}`));
      if (it.flavourName && it.flavourName !== 'Plain / Original') {
        out.push(toAscii(`  Flavour: ${it.flavourName}`));
      }
      if (it.notes) out.push(CMD_BOLD_ON + toAscii(`  NOTE: ${it.notes}`) + CMD_BOLD_OFF);
      out.push(dash);
    });

    out.push(CMD_ALIGN_CENTER + CMD_BOLD_ON + `Total Items: ${bill.itemCount}` + CMD_BOLD_OFF);
    out.push(CMD_ALIGN_LEFT + '\n\n\n\n');
    return out.join('\n');
  }

  // Customer Sales Receipt (matches 58mm Posiflow mobile thermal format)
  out.push(
    CMD_ALIGN_CENTER +
      CMD_SIZE_DOUBLE +
      CMD_BOLD_ON +
      toAscii(settings.businessName.toUpperCase()) +
      CMD_SIZE_NORMAL +
      CMD_BOLD_OFF
  );
  out.push(CMD_ALIGN_CENTER + CMD_BOLD_ON + 'SALES RECEIPT' + CMD_BOLD_OFF);
  if (settings.tagline) out.push(CMD_ALIGN_CENTER + toAscii(settings.tagline));
  if (settings.isHalal) out.push(CMD_ALIGN_CENTER + CMD_BOLD_ON + '*** 100% HALAL ***' + CMD_BOLD_OFF);
  if (settings.address) out.push(CMD_ALIGN_CENTER + toAscii(settings.address));
  if (settings.phone) out.push(CMD_ALIGN_CENTER + toAscii(`Ph: ${settings.phone}`));
  if (settings.gstin) out.push(CMD_ALIGN_CENTER + toAscii(`GSTIN: ${settings.gstin}`));
  out.push(CMD_ALIGN_LEFT + dash);

  out.push(CMD_BOLD_ON + lineBetween(`Receipt: ${bill.id}`, `Token: #${bill.tokenNumber}`, cols) + CMD_BOLD_OFF);
  out.push(lineBetween(toAscii(formatDateTime(bill.timestamp)), `[${bill.orderType.toUpperCase()}]`, cols));
  if (bill.tableOrToken) out.push(toAscii(`Ref: ${bill.tableOrToken}`));
  out.push(dash);

  // Columnar Table Header
  out.push(CMD_BOLD_ON + formatThreeColRow('Item', 'Qty', 'Amount', cols) + CMD_BOLD_OFF);
  out.push(dash);

  const itemColMax = cols === 48 ? 30 : 17;
  bill.items.forEach((it) => {
    let title = toAscii(it.name);
    if (it.variantName) title += ` (${toAscii(it.variantName)})`;
    const qtyStr = String(it.quantity);
    const amtStr = rs(it.quantity * it.unitPrice);

    if (title.length <= itemColMax) {
      out.push(formatThreeColRow(title, qtyStr, amtStr, cols));
    } else {
      // Print full item name cleanly, then aligned qty & amount on the next line
      out.push(CMD_BOLD_ON + title + CMD_BOLD_OFF);
      out.push(formatThreeColRow(`  @ ${rs(it.unitPrice)}`, qtyStr, amtStr, cols));
    }

    if (it.flavourName && it.flavourName !== 'Plain / Original') {
      out.push(toAscii(`  + ${it.flavourName}`));
    }
    if (it.notes) {
      out.push(toAscii(`  * ${it.notes}`));
    }
  });

  out.push(dash);
  out.push(lineBetween('Subtotal', rs(bill.subtotal), cols));
  if (bill.discountAmount > 0) {
    out.push(lineBetween('Discount', `-${rs(bill.discountAmount)}`, cols));
  }
  if (bill.gstEnabled && bill.gstAmount > 0) {
    out.push(lineBetween(`GST (${bill.gstRate}%)`, `+${rs(bill.gstAmount)}`, cols));
  }
  out.push(dbl);
  out.push(
    CMD_SIZE_TALL +
      CMD_BOLD_ON +
      lineBetween('TOTAL', rs(bill.totalAmount), cols) +
      CMD_SIZE_NORMAL +
      CMD_BOLD_OFF
  );
  out.push(dbl);

  out.push(CMD_BOLD_ON + `Paid via: ${bill.paymentMethod.toUpperCase()}` + CMD_BOLD_OFF);
  if (bill.paymentMethod === 'split' && bill.paymentSplit) {
    const parts = [
      bill.paymentSplit.cash > 0 ? `Cash ${rs(bill.paymentSplit.cash)}` : '',
      bill.paymentSplit.upi > 0 ? `UPI ${rs(bill.paymentSplit.upi)}` : '',
      bill.paymentSplit.card > 0 ? `Card ${rs(bill.paymentSplit.card)}` : '',
    ].filter(Boolean);
    if (parts.length) out.push(`  (${parts.join(' | ')})`);
  }

  out.push(dash);
  out.push(CMD_ALIGN_CENTER + toAscii(settings.receiptFooter || 'Thank you for your order!'));
  out.push(CMD_ALIGN_CENTER + 'Visit us again!');
  out.push(CMD_ALIGN_LEFT + '\n\n\n\n');
  return out.join('\n');
}

export function buildTestPrintPayload(settings: AppSettings): string {
  const cols = settings.thermalPrinterSize === '80mm' ? 48 : 32;
  const dash = '-'.repeat(cols);
  const out: string[] = [
    CMD_INIT,
    CMD_SIZE_NORMAL,
    CMD_BOLD_OFF,
    CMD_ALIGN_CENTER + CMD_SIZE_DOUBLE + CMD_BOLD_ON + toAscii(settings.businessName.toUpperCase()) + CMD_SIZE_NORMAL + CMD_BOLD_OFF,
    CMD_ALIGN_CENTER + CMD_BOLD_ON + '58mm PRINTER TEST OK' + CMD_BOLD_OFF,
    CMD_ALIGN_LEFT + dash,
    formatThreeColRow('Item', 'Qty', 'Amount', cols),
    dash,
    formatThreeColRow('BBQ Quarter', '1', 'Rs.129', cols),
    formatThreeColRow('Wings Meal Box', '2', 'Rs.318', cols),
    dash,
    CMD_SIZE_TALL + CMD_BOLD_ON + lineBetween('TOTAL', 'Rs.447', cols) + CMD_SIZE_NORMAL + CMD_BOLD_OFF,
    dash,
    CMD_ALIGN_CENTER + 'Thermal Printer Ready!',
    CMD_ALIGN_LEFT + '\n\n\n\n',
  ];
  return out.join('\n');
}

/**
 * Triggers Android RawBT app directly via rawbt:base64 intent URI.
 */
export function launchRawBTPayload(payload: string): void {
  const bytes = new TextEncoder().encode(payload);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const base64 = btoa(binary);

  const link = document.createElement('a');
  link.href = `rawbt:base64,${base64}`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printViaRawBT(
  bill: Bill,
  settings: AppSettings,
  mode: 'receipt' | 'kot',
  printerWidth: '58mm' | '80mm'
): void {
  const payload = buildThermalEscPosPayload(bill, settings, mode, printerWidth);
  launchRawBTPayload(payload);
}

// Common GATT service UUIDs used by 58mm portable BLE thermal printers (Posiflow / MTP-2 / PT-210 / XPrinter / RPP02)
const BLE_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
];

interface BleCharLike {
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValueWithResponse?: (data: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (data: BufferSource) => Promise<void>;
  writeValue?: (data: BufferSource) => Promise<void>;
}

interface BleDeviceLike {
  name?: string;
  gatt?: {
    connected: boolean;
    disconnect?: () => void;
    connect: () => Promise<{
      getPrimaryServices: () => Promise<Array<{ getCharacteristics: () => Promise<BleCharLike[]> }>>;
    }>;
  };
}

let cachedBleDevice: BleDeviceLike | null = null;
let cachedBleChar: BleCharLike | null = null;

export function getConnectedBlePrinterName(): string | null {
  if (cachedBleDevice?.gatt?.connected && cachedBleChar) {
    return cachedBleDevice.name || '58mm Bluetooth Printer';
  }
  return null;
}

export function disconnectBlePrinter(): void {
  try {
    cachedBleDevice?.gatt?.disconnect?.();
  } catch {
    // ignore disconnect errors
  }
  cachedBleDevice = null;
  cachedBleChar = null;
}

export async function connectBlePrinter(): Promise<{ ok: boolean; deviceName?: string; message: string }> {
  const nav = navigator as Navigator & {
    bluetooth?: {
      requestDevice: (opts: {
        acceptAllDevices: boolean;
        optionalServices: string[];
      }) => Promise<BleDeviceLike>;
    };
  };

  if (!nav.bluetooth) {
    return {
      ok: false,
      message: 'Web Bluetooth is only available in Chrome on Android/Desktop. For Classic Bluetooth printers, use RawBT Print.',
    };
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLE_PRINTER_SERVICES,
    });
    if (!device.gatt) {
      return { ok: false, message: 'Selected device does not expose BLE GATT services.' };
    }

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    let writable: BleCharLike | null = null;

    for (const svc of services) {
      const chars = await svc.getCharacteristics();
      const found = chars.find(
        (c) => c.properties.writeWithoutResponse || c.properties.write
      );
      if (found) {
        writable = found;
        break;
      }
    }

    if (!writable) {
      return {
        ok: false,
        message: 'No writable BLE print channel found. This printer uses Classic Bluetooth SPP — use "RawBT Print (Android)".',
      };
    }

    cachedBleDevice = device;
    cachedBleChar = writable;
    return {
      ok: true,
      deviceName: device.name || '58mm Bluetooth Printer',
      message: `Connected to ${device.name || '58mm Bluetooth Printer'}!`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bluetooth connection failed';
    if (msg.toLowerCase().includes('cancel')) {
      return {
        ok: false,
        message: 'Printer scan cancelled. If your 58mm printer did not appear in the list, it uses Classic Bluetooth — use "RawBT Print (Android)".',
      };
    }
    return {
      ok: false,
      message: `${msg}. If this printer uses Classic Bluetooth SPP, use "RawBT Print (Android)".`,
    };
  }
}

export async function sendPayloadViaWebBluetooth(
  payload: string
): Promise<{ ok: boolean; deviceName?: string; message: string }> {
  if (!cachedBleDevice || !cachedBleDevice.gatt?.connected || !cachedBleChar) {
    const conn = await connectBlePrinter();
    if (!conn.ok || !cachedBleChar) return conn;
  }

  try {
    const bytes = new TextEncoder().encode(payload);
    // Conservative 32-byte pacing works reliably on Posiflow / MTP-2 / PT-210 BLE modules without buffer overflow
    const CHUNK_SIZE = 32;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      if (cachedBleChar.properties.writeWithoutResponse && cachedBleChar.writeValueWithoutResponse) {
        await cachedBleChar.writeValueWithoutResponse(chunk);
      } else if (cachedBleChar.writeValueWithResponse) {
        await cachedBleChar.writeValueWithResponse(chunk);
      } else if (cachedBleChar.writeValue) {
        await cachedBleChar.writeValue(chunk);
      }
      await new Promise((r) => setTimeout(r, 25));
    }

    return {
      ok: true,
      deviceName: cachedBleDevice?.name || 'Bluetooth Printer',
      message: `Printed directly to ${cachedBleDevice?.name || '58mm Bluetooth Printer'}!`,
    };
  } catch (err) {
    cachedBleChar = null;
    const msg = err instanceof Error ? err.message : 'Bluetooth print failed';
    return {
      ok: false,
      message: `${msg}. Reconnect or use "RawBT Print (Android)".`,
    };
  }
}

export async function printViaWebBluetooth(
  bill: Bill,
  settings: AppSettings,
  mode: 'receipt' | 'kot',
  printerWidth: '58mm' | '80mm'
): Promise<{ ok: boolean; deviceName?: string; message: string }> {
  const payload = buildThermalEscPosPayload(bill, settings, mode, printerWidth);
  return sendPayloadViaWebBluetooth(payload);
}

export async function sendTestPrint(
  settings: AppSettings,
  modeOverride?: 'rawbt' | 'bluetooth'
): Promise<{ ok: boolean; message: string }> {
  const payload = buildTestPrintPayload(settings);
  const chosen = modeOverride || (settings.printerMode === 'bluetooth' ? 'bluetooth' : 'rawbt');
  if (chosen === 'bluetooth') {
    return sendPayloadViaWebBluetooth(payload);
  }
  launchRawBTPayload(payload);
  return { ok: true, message: 'Sent 58mm test receipt to RawBT!' };
}
