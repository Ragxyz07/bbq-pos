/**
 * The BBQ Boxx POS - Type Definitions
 */

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  icon?: string; // Emoji or icon identifier
}

export interface ItemVariant {
  id: string;
  name: string; // e.g. "Quarter", "Half", "Full", "Basic", "Plain", "Flavoured"
  price: number;
  isDefault?: boolean;
}

export interface FlavourAddon {
  id: string;
  name: string; // e.g. "Peri Peri", "Schezwan", "Garlic", "Honey"
  surcharge: number; // default +₹20
  isDefault?: boolean;
}

export interface ComboComponent {
  itemName: string;
  quantity: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  basePrice: number;
  hasVariants: boolean;
  variants: ItemVariant[];
  hasFlavours: boolean;
  flavours: FlavourAddon[];
  isCombo?: boolean;
  comboDetails?: ComboComponent[];
  isOutOfStock?: boolean;
  isHidden?: boolean;
  sortOrder: number;
  badge?: string; // e.g. "Best Seller", "Halal", "Limited"
}

export interface CartItem {
  cartItemId: string; // unique ID per cart entry
  itemId: string;
  name: string;
  variantId?: string;
  variantName?: string;
  variantPrice: number;
  flavourId?: string;
  flavourName?: string;
  flavourSurcharge: number;
  unitPrice: number; // variantPrice + flavourSurcharge
  quantity: number;
  notes?: string;
  isCombo?: boolean;
  comboDetails?: ComboComponent[];
}

export type OrderType = 'dine-in' | 'parcel';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'split';

export interface PaymentSplit {
  cash: number;
  upi: number;
  card: number;
  cashReceived?: number;
  cashChange?: number;
}

export interface Bill {
  id: string; // e.g. "BBQ-1001"
  billNumber: number; // incremental integer
  tokenNumber: number; // daily running token e.g. 1, 2, 3...
  timestamp: number; // epoch ms
  createdAt: string; // formatted ISO string
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountType: 'flat' | 'percent';
  discountValue: number;
  discountAmount: number;
  gstEnabled: boolean;
  gstRate: number; // e.g. 5
  gstAmount: number;
  totalAmount: number;
  orderType: OrderType;
  tableOrToken: string;
  paymentMethod: PaymentMethod;
  paymentSplit: PaymentSplit;
  status: 'completed' | 'cancelled';
  cancelReason?: string;
  cancelledAt?: string;
  cashierName?: string;
}

export interface AppSettings {
  businessName: string;
  tagline: string;
  isHalal: boolean;
  address: string;
  phone: string;
  gstin: string;
  defaultGstEnabled: boolean;
  defaultGstRate: number;
  upiId: string;
  upiName: string;
  receiptFooter: string;
  securityPin: string; // 4-digit PIN for Admin and Reports
  pinRequired: boolean;
  thermalPrinterSize: '58mm' | '80mm';
  defaultOrderType: OrderType;
  defaultPaymentMethod: PaymentMethod;
  defaultFlavourSurcharge: number;
  soundEnabled: boolean;
  twoColorTheme?: 'bw' | 'red';
}

export interface CashDenominationCount {
  [denomination: number]: number; // 500: count, 200: count, 100: count, etc.
}

export interface DrawerClosing {
  id: string;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
  openingCash: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  denominations: CashDenominationCount;
  notes?: string;
  totalSales: number;
  totalBills: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  closedAt: string;
}

export type ActiveTab = 'billing' | 'orders' | 'reports' | 'admin' | 'settings';
