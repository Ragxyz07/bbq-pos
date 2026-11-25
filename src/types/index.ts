/**
 * The BBQ Boxx POS - Type Definitions
 */

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  icon?: string;
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
  surcharge: number; // default +₹10
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
  badge?: string;
}

export interface CartItem {
  cartItemId: string;
  itemId: string;
  name: string;
  variantId?: string;
  variantName?: string;
  variantPrice: number;
  flavourId?: string;
  flavourName?: string;
  flavourSurcharge: number;
  unitPrice: number;
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
  billNumber: number;
  tokenNumber: number;
  timestamp: number;
  createdAt: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountType: 'flat' | 'percent';
  discountValue: number;
  discountAmount: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  orderType: OrderType;
  tableOrToken: string;
  paymentMethod: PaymentMethod;
  paymentSplit: PaymentSplit;
  status: 'completed' | 'cancelled';
  cancelReason?: string;
  cancelledAt?: string;
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
  securityPin: string;
  pinRequired: boolean;
  thermalPrinterSize: '58mm' | '80mm';
  defaultOrderType: OrderType;
  defaultPaymentMethod: PaymentMethod;
  defaultFlavourSurcharge: number;
  soundEnabled: boolean;
  twoColorTheme?: 'bw' | 'red';
  printerMode?: 'rawbt' | 'bluetooth' | 'system';
  autoPrintOnBill?: boolean;
}

export interface CashDenominationCount {
  [denomination: number]: number;
}

export interface DrawerClosing {
  id: string;
  timestamp: number;
  dateStr: string;
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

export type InventoryCategory =
  | 'Packaging'
  | 'Tissue & Hygiene'
  | 'Cleaning Supplies'
  | 'Fuel & Kitchen'
  | 'Fuel & Generator'
  | 'Raw Meat'
  | 'Seafood'
  | 'Bakery'
  | 'Beverage'
  | 'Other';

export type InventoryUnit =
  | 'pcs'
  | 'packs'
  | 'kg'
  | 'g'
  | 'L'
  | 'ml'
  | 'litres'
  | 'bottles'
  | 'boxes'
  | 'rolls';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  currentStock: number;
  minStock: number;
  costPerUnit?: number;
  supplier?: string;
  notes?: string;
  lastRestockedDate?: string;
  updatedAt: string;
}

export interface InventoryLogEntry {
  id: string;
  itemId: string;
  itemName: string;
  unit: InventoryUnit;
  type: 'in' | 'out' | 'adjust';
  quantity: number;
  previousStock: number;
  newStock: number;
  cost?: number;
  note?: string;
  timestamp: number;
}

export type ChickenUnit = 'pcs' | 'stick';

export interface ChickenItem {
  id: string;
  name: string;
  unit: ChickenUnit;
  currentCount: number;
  minCount: number;
  sortOrder: number;
  lastCountedDate?: string;
  updatedAt: string;
}

export interface ChickenDeductionComponent {
  chickenItemId: string;
  quantity: number;
}

export interface ChickenDeductionRule {
  ruleKey: string;
  label: string;
  components: ChickenDeductionComponent[];
}

export interface ChickenLogEntry {
  id: string;
  chickenItemId: string;
  itemName: string;
  unit: ChickenUnit;
  type: 'count_set' | 'in' | 'out' | 'sale' | 'void_return' | 'adjust';
  quantity: number;
  previousCount: number;
  newCount: number;
  billId?: string;
  note?: string;
  timestamp: number;
}

export type StaffSalaryType = 'daily' | 'monthly';

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  roleLabel?: string; // e.g. Grill Master, Helper, Counter (display only, no login)
  salaryType: StaffSalaryType;
  salaryAmount: number; // ₹ per day OR ₹ per month
  joinedDate?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'half' | 'absent';

export interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  dateStr: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  updatedAt: string;
}

export type StaffPayoutType = 'advance' | 'salary' | 'bonus';

export interface StaffPayoutRecord {
  id: string;
  staffId: string;
  staffName: string;
  type: StaffPayoutType;
  amount: number;
  dateStr: string; // YYYY-MM-DD
  paymentMode: 'cash' | 'upi';
  note?: string;
  timestamp: number;
}

export type ActiveTab =
  | 'billing'
  | 'orders'
  | 'chicken-inventory'
  | 'inventory'
  | 'reports'
  | 'staff'
  | 'admin'
  | 'settings';
