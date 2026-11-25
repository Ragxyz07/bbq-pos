import {
  Category,
  MenuItem,
  AppSettings,
  Bill,
  DrawerClosing,
  CartItem,
  InventoryItem,
  InventoryLogEntry,
  ChickenItem,
  ChickenDeductionRule,
  ChickenLogEntry,
  StaffMember,
  StaffAttendanceRecord,
  StaffPayoutRecord,
} from '../types';
import { SEED_CATEGORIES, SEED_MENU_ITEMS, DEFAULT_APP_SETTINGS } from '../data/seedMenu';
import { SEED_INVENTORY_ITEMS } from '../data/seedInventory';
import { SEED_CHICKEN_ITEMS, SEED_CHICKEN_RULES } from '../data/seedChickenInventory';

const STORAGE_KEYS = {
  CATEGORIES: 'bbq_pos_categories_v1',
  MENU_ITEMS: 'bbq_pos_menu_items_v1',
  SETTINGS: 'bbq_pos_settings_v1',
  BILLS: 'bbq_pos_bills_v1',
  DRAWER_CLOSINGS: 'bbq_pos_drawer_closings_v1',
  LAST_BILL_NUMBER: 'bbq_pos_last_bill_no_v1',
  TOKEN_TRACKER: 'bbq_pos_token_tracker_v1',
  SAVED_CART: 'bbq_pos_saved_cart_v1',
  MIGRATED_MEALBOX: 'bbq_pos_migrated_mealbox_v1',
  INVENTORY_ITEMS: 'bbq_pos_inventory_items_v1',
  INVENTORY_LOGS: 'bbq_pos_inventory_logs_v1',
  MIGRATED_NOTEBOOK_INVENTORY: 'bbq_pos_migrated_notebook_inv_v1',
  CHICKEN_ITEMS: 'bbq_pos_chicken_items_v1',
  CHICKEN_LOGS: 'bbq_pos_chicken_logs_v1',
  CHICKEN_RULES: 'bbq_pos_chicken_rules_v1',
  MIGRATED_CHICKEN_RULES_V2: 'bbq_pos_migrated_chicken_rules_v2',
  STAFF_MEMBERS: 'bbq_pos_staff_members_v1',
  STAFF_ATTENDANCE: 'bbq_pos_staff_attendance_v1',
  STAFF_PAYOUTS: 'bbq_pos_staff_payouts_v1',
};

// Safe JSON parser
function safeGet<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultValue;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
  }
}

// Storage helpers
export const storage = {
  getCategories(): Category[] {
    const data = safeGet<Category[] | null>(STORAGE_KEYS.CATEGORIES, null);
    if (!data || data.length === 0) {
      safeSet(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
      return SEED_CATEGORIES;
    }

    const mealBoxCat = SEED_CATEGORIES.find((c) => c.id === 'cat-meal-box');
    if (mealBoxCat && !data.some((c) => c.id === 'cat-meal-box') && !localStorage.getItem(STORAGE_KEYS.MIGRATED_MEALBOX)) {
      const updatedCats = [...data, mealBoxCat];
      safeSet(STORAGE_KEYS.CATEGORIES, updatedCats);
      return updatedCats.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return data.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  saveCategories(categories: Category[]): void {
    safeSet(STORAGE_KEYS.CATEGORIES, categories);
  },

  getMenuItems(): MenuItem[] {
    const data = safeGet<MenuItem[] | null>(STORAGE_KEYS.MENU_ITEMS, null);
    if (!data || data.length === 0) {
      safeSet(STORAGE_KEYS.MENU_ITEMS, SEED_MENU_ITEMS);
      localStorage.setItem(STORAGE_KEYS.MIGRATED_MEALBOX, '1');
      return SEED_MENU_ITEMS;
    }
    let hasMigration = false;
    let migrated = data.map((item) => {
      if (item.hasFlavours && item.flavours) {
        const updatedFlavours = item.flavours.map((flv) => {
          if (flv.surcharge === 20) {
            hasMigration = true;
            return { ...flv, surcharge: 10 };
          }
          return flv;
        });
        return { ...item, flavours: updatedFlavours };
      }
      return item;
    });

    if (!localStorage.getItem(STORAGE_KEYS.MIGRATED_MEALBOX)) {
      const mealBoxItems = SEED_MENU_ITEMS.filter((it) => it.categoryId === 'cat-meal-box');
      const existingIds = new Set(migrated.map((it) => it.id));
      const itemsToAdd = mealBoxItems.filter((it) => !existingIds.has(it.id));
      if (itemsToAdd.length > 0) {
        migrated = [...migrated, ...itemsToAdd];
        hasMigration = true;
      }
      localStorage.setItem(STORAGE_KEYS.MIGRATED_MEALBOX, '1');
    }

    if (hasMigration) {
      safeSet(STORAGE_KEYS.MENU_ITEMS, migrated);
    }

    return migrated.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  saveMenuItems(items: MenuItem[]): void {
    safeSet(STORAGE_KEYS.MENU_ITEMS, items);
  },

  resetMenuToDefault(): { categories: Category[]; items: MenuItem[] } {
    safeSet(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
    safeSet(STORAGE_KEYS.MENU_ITEMS, SEED_MENU_ITEMS);
    return { categories: SEED_CATEGORIES, items: SEED_MENU_ITEMS };
  },

  getSettings(): AppSettings {
    const data = safeGet<AppSettings | null>(STORAGE_KEYS.SETTINGS, null);
    if (!data) {
      safeSet(STORAGE_KEYS.SETTINGS, DEFAULT_APP_SETTINGS);
      return DEFAULT_APP_SETTINGS;
    }
    const merged = { ...DEFAULT_APP_SETTINGS, ...data };
    let changed = false;
    if (!merged.twoColorTheme) {
      merged.twoColorTheme = 'red';
      changed = true;
    }
    if (merged.defaultFlavourSurcharge === 20) {
      merged.defaultFlavourSurcharge = 10;
      changed = true;
    }
    if (merged.address === 'Street Food Lane, Stall #04, Near City Clock Tower') {
      merged.address = DEFAULT_APP_SETTINGS.address;
      changed = true;
    }
    if (merged.phone === '+91 98450 12345') {
      merged.phone = DEFAULT_APP_SETTINGS.phone;
      changed = true;
    }
    if (changed) {
      safeSet(STORAGE_KEYS.SETTINGS, merged);
    }
    return merged;
  },

  saveSettings(settings: AppSettings): void {
    safeSet(STORAGE_KEYS.SETTINGS, settings);
  },

  getBills(): Bill[] {
    return safeGet<Bill[]>(STORAGE_KEYS.BILLS, []);
  },

  saveBills(bills: Bill[]): void {
    safeSet(STORAGE_KEYS.BILLS, bills);
  },

  addBill(bill: Bill): Bill[] {
    const bills = this.getBills();
    const updated = [bill, ...bills];
    this.saveBills(updated);
    return updated;
  },

  cancelBill(billId: string, reason: string): Bill[] {
    const bills = this.getBills();
    const updated = bills.map((b) =>
      b.id === billId
        ? {
            ...b,
            status: 'cancelled' as const,
            cancelReason: reason,
            cancelledAt: new Date().toISOString(),
          }
        : b
    );
    this.saveBills(updated);
    return updated;
  },

  getNextBillAndToken(): { billId: string; billNumber: number; tokenNumber: number } {
    const lastBillNo = safeGet<number>(STORAGE_KEYS.LAST_BILL_NUMBER, 1000);
    const nextBillNo = lastBillNo + 1;
    safeSet(STORAGE_KEYS.LAST_BILL_NUMBER, nextBillNo);

    const todayStr = new Date().toISOString().split('T')[0];
    const tracker = safeGet<{ date: string; token: number }>(STORAGE_KEYS.TOKEN_TRACKER, {
      date: todayStr,
      token: 0,
    });

    let nextToken = 1;
    if (tracker.date === todayStr) {
      nextToken = tracker.token + 1;
    }
    safeSet(STORAGE_KEYS.TOKEN_TRACKER, { date: todayStr, token: nextToken });

    return {
      billId: `BBQ-${nextBillNo}`,
      billNumber: nextBillNo,
      tokenNumber: nextToken,
    };
  },

  getDrawerClosings(): DrawerClosing[] {
    return safeGet<DrawerClosing[]>(STORAGE_KEYS.DRAWER_CLOSINGS, []);
  },

  saveDrawerClosing(closing: DrawerClosing): DrawerClosing[] {
    const list = this.getDrawerClosings();
    const updated = [closing, ...list];
    safeSet(STORAGE_KEYS.DRAWER_CLOSINGS, updated);
    return updated;
  },

  getSavedCart(): CartItem[] {
    return safeGet<CartItem[]>(STORAGE_KEYS.SAVED_CART, []);
  },

  saveCart(cart: CartItem[]): void {
    safeSet(STORAGE_KEYS.SAVED_CART, cart);
  },

  // Inventory Management Storage
  getInventoryItems(): InventoryItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY_ITEMS);
      if (raw === null) {
        safeSet(STORAGE_KEYS.INVENTORY_ITEMS, SEED_INVENTORY_ITEMS);
        localStorage.setItem(STORAGE_KEYS.MIGRATED_NOTEBOOK_INVENTORY, '1');
        return SEED_INVENTORY_ITEMS;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return SEED_INVENTORY_ITEMS;

      if (!localStorage.getItem(STORAGE_KEYS.MIGRATED_NOTEBOOK_INVENTORY)) {
        const oldSeedIds = new Set([
          'inv-paper-plates',
          'inv-parcel-boxes',
          'inv-chutney-cups',
          'inv-foil-rolls',
          'inv-carry-bags',
          'inv-wooden-skewers',
          'inv-thermal-rolls',
          'inv-tissue-packs',
          'inv-gloves',
          'inv-dishwash',
          'inv-surface-cleaner',
          'inv-scrubbers',
          'inv-garbage-bags',
          'inv-charcoal',
          'inv-cooking-oil',
        ]);
        const customUserItems = (parsed as InventoryItem[]).filter(
          (it) => !oldSeedIds.has(it.id)
        );
        const merged = [...customUserItems, ...SEED_INVENTORY_ITEMS];
        safeSet(STORAGE_KEYS.INVENTORY_ITEMS, merged);
        localStorage.setItem(STORAGE_KEYS.MIGRATED_NOTEBOOK_INVENTORY, '1');
        return merged;
      }

      return parsed;
    } catch (err) {
      console.error('Error reading inventory items from localStorage:', err);
      return SEED_INVENTORY_ITEMS;
    }
  },

  saveInventoryItems(items: InventoryItem[]): void {
    safeSet(STORAGE_KEYS.INVENTORY_ITEMS, items);
  },

  getInventoryLogs(): InventoryLogEntry[] {
    return safeGet<InventoryLogEntry[]>(STORAGE_KEYS.INVENTORY_LOGS, []);
  },

  saveInventoryLogs(logs: InventoryLogEntry[]): void {
    safeSet(STORAGE_KEYS.INVENTORY_LOGS, logs);
  },

  addInventoryLog(log: InventoryLogEntry): InventoryLogEntry[] {
    const logs = this.getInventoryLogs();
    const updated = [log, ...logs].slice(0, 500);
    this.saveInventoryLogs(updated);
    return updated;
  },

  resetInventoryToDefault(): { items: InventoryItem[]; logs: InventoryLogEntry[] } {
    safeSet(STORAGE_KEYS.INVENTORY_ITEMS, SEED_INVENTORY_ITEMS);
    safeSet(STORAGE_KEYS.INVENTORY_LOGS, []);
    return { items: SEED_INVENTORY_ITEMS, logs: [] };
  },

  // Chicken Inventory Management Storage (Wings, Lollipop, Chest, Drumstick, Thigh, Boneless Stick)
  getChickenItems(): ChickenItem[] {
    const data = safeGet<ChickenItem[] | null>(STORAGE_KEYS.CHICKEN_ITEMS, null);
    if (!data || !Array.isArray(data) || data.length === 0) {
      safeSet(STORAGE_KEYS.CHICKEN_ITEMS, SEED_CHICKEN_ITEMS);
      return SEED_CHICKEN_ITEMS;
    }
    return [...data].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  },

  saveChickenItems(items: ChickenItem[]): void {
    safeSet(STORAGE_KEYS.CHICKEN_ITEMS, items);
  },

  getChickenLogs(): ChickenLogEntry[] {
    return safeGet<ChickenLogEntry[]>(STORAGE_KEYS.CHICKEN_LOGS, []);
  },

  saveChickenLogs(logs: ChickenLogEntry[]): void {
    safeSet(STORAGE_KEYS.CHICKEN_LOGS, logs);
  },

  addChickenLog(log: ChickenLogEntry): ChickenLogEntry[] {
    const logs = this.getChickenLogs();
    const updated = [log, ...logs].slice(0, 800);
    this.saveChickenLogs(updated);
    return updated;
  },

  getChickenRules(): ChickenDeductionRule[] {
    if (!localStorage.getItem(STORAGE_KEYS.MIGRATED_CHICKEN_RULES_V2)) {
      safeSet(STORAGE_KEYS.CHICKEN_RULES, SEED_CHICKEN_RULES);
      localStorage.setItem(STORAGE_KEYS.MIGRATED_CHICKEN_RULES_V2, '1');
      return SEED_CHICKEN_RULES;
    }
    const data = safeGet<ChickenDeductionRule[] | null>(STORAGE_KEYS.CHICKEN_RULES, null);
    if (!data || !Array.isArray(data) || data.length === 0) {
      safeSet(STORAGE_KEYS.CHICKEN_RULES, SEED_CHICKEN_RULES);
      return SEED_CHICKEN_RULES;
    }
    // Ensure newly added seed rules are present while keeping user-customized rules intact
    const existingKeys = new Set(data.map((r) => r.ruleKey));
    const missing = SEED_CHICKEN_RULES.filter((r) => !existingKeys.has(r.ruleKey));
    if (missing.length > 0) {
      const merged = [...data, ...missing];
      safeSet(STORAGE_KEYS.CHICKEN_RULES, merged);
      return merged;
    }
    return data;
  },

  saveChickenRules(rules: ChickenDeductionRule[]): void {
    safeSet(STORAGE_KEYS.CHICKEN_RULES, rules);
  },

  calculateChickenUsageForItems(
    cartItems: CartItem[],
    rules?: ChickenDeductionRule[]
  ): Record<string, number> {
    const activeRules = rules || this.getChickenRules();
    const ruleMap = new Map(activeRules.map((r) => [r.ruleKey, r]));
    const usage: Record<string, number> = {};

    for (const ci of cartItems) {
      const variantKey = ci.variantName ? `${ci.itemId}::${ci.variantName}` : '';
      const matchedRule = (variantKey && ruleMap.get(variantKey)) || ruleMap.get(ci.itemId);
      if (!matchedRule) continue;

      for (const comp of matchedRule.components) {
        if (comp.quantity <= 0) continue;
        usage[comp.chickenItemId] =
          (usage[comp.chickenItemId] || 0) + comp.quantity * ci.quantity;
      }
    }

    return usage;
  },

  deductChickenForBill(bill: Bill): { items: ChickenItem[]; logs: ChickenLogEntry[] } {
    const usage = this.calculateChickenUsageForItems(bill.items);
    const items = this.getChickenItems();
    let logs = this.getChickenLogs();

    if (Object.keys(usage).length === 0) {
      return { items, logs };
    }

    const nowIso = new Date().toISOString();
    const nowTs = Date.now();
    const newLogs: ChickenLogEntry[] = [];

    const updatedItems = items.map((item) => {
      const usedQty = usage[item.id] || 0;
      if (usedQty <= 0) return item;

      const prevCount = item.currentCount;
      const nextCount = Math.max(0, prevCount - usedQty);

      newLogs.push({
        id: `chklog-sale-${nowTs}-${item.id}-${Math.random().toString(36).slice(2, 6)}`,
        chickenItemId: item.id,
        itemName: item.name,
        unit: item.unit,
        type: 'sale',
        quantity: usedQty,
        previousCount: prevCount,
        newCount: nextCount,
        billId: bill.id,
        note: `Order #${bill.id} (Token #${bill.tokenNumber})`,
        timestamp: nowTs,
      });

      return {
        ...item,
        currentCount: nextCount,
        updatedAt: nowIso,
      };
    });

    this.saveChickenItems(updatedItems);
    logs = [...newLogs, ...logs].slice(0, 800);
    this.saveChickenLogs(logs);

    return { items: updatedItems, logs };
  },

  returnChickenForVoidBill(bill: Bill): { items: ChickenItem[]; logs: ChickenLogEntry[] } {
    const usage = this.calculateChickenUsageForItems(bill.items);
    const items = this.getChickenItems();
    let logs = this.getChickenLogs();

    if (Object.keys(usage).length === 0) {
      return { items, logs };
    }

    const nowIso = new Date().toISOString();
    const nowTs = Date.now();
    const newLogs: ChickenLogEntry[] = [];

    const updatedItems = items.map((item) => {
      const returnQty = usage[item.id] || 0;
      if (returnQty <= 0) return item;

      const prevCount = item.currentCount;
      const nextCount = prevCount + returnQty;

      newLogs.push({
        id: `chklog-void-${nowTs}-${item.id}-${Math.random().toString(36).slice(2, 6)}`,
        chickenItemId: item.id,
        itemName: item.name,
        unit: item.unit,
        type: 'void_return',
        quantity: returnQty,
        previousCount: prevCount,
        newCount: nextCount,
        billId: bill.id,
        note: `Void return #${bill.id}`,
        timestamp: nowTs,
      });

      return {
        ...item,
        currentCount: nextCount,
        updatedAt: nowIso,
      };
    });

    this.saveChickenItems(updatedItems);
    logs = [...newLogs, ...logs].slice(0, 800);
    this.saveChickenLogs(logs);

    return { items: updatedItems, logs };
  },

  // Staff Profiles, Attendance & Advance/Salary Payout Storage
  getStaffMembers(): StaffMember[] {
    return safeGet<StaffMember[]>(STORAGE_KEYS.STAFF_MEMBERS, []);
  },

  saveStaffMembers(members: StaffMember[]): void {
    safeSet(STORAGE_KEYS.STAFF_MEMBERS, members);
  },

  getStaffAttendance(): StaffAttendanceRecord[] {
    return safeGet<StaffAttendanceRecord[]>(STORAGE_KEYS.STAFF_ATTENDANCE, []);
  },

  saveStaffAttendance(records: StaffAttendanceRecord[]): void {
    safeSet(STORAGE_KEYS.STAFF_ATTENDANCE, records);
  },

  getStaffPayouts(): StaffPayoutRecord[] {
    return safeGet<StaffPayoutRecord[]>(STORAGE_KEYS.STAFF_PAYOUTS, []);
  },

  saveStaffPayouts(payouts: StaffPayoutRecord[]): void {
    safeSet(STORAGE_KEYS.STAFF_PAYOUTS, payouts);
  },

  // Export full JSON database for backup
  exportAllDataJson(): string {
    const payload = {
      app: 'The BBQ Boxx POS',
      version: '1.3.0',
      exportedAt: new Date().toISOString(),
      categories: this.getCategories(),
      menuItems: this.getMenuItems(),
      settings: this.getSettings(),
      bills: this.getBills(),
      drawerClosings: this.getDrawerClosings(),
      lastBillNumber: safeGet<number>(STORAGE_KEYS.LAST_BILL_NUMBER, 1000),
      inventoryItems: this.getInventoryItems(),
      inventoryLogs: this.getInventoryLogs(),
      chickenItems: this.getChickenItems(),
      chickenLogs: this.getChickenLogs(),
      chickenRules: this.getChickenRules(),
      staffMembers: this.getStaffMembers(),
      staffAttendance: this.getStaffAttendance(),
      staffPayouts: this.getStaffPayouts(),
    };
    return JSON.stringify(payload, null, 2);
  },

  // Restore full JSON database
  restoreAllDataJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.categories) || !Array.isArray(data.menuItems)) {
        throw new Error('Invalid backup file schema');
      }
      if (data.categories) safeSet(STORAGE_KEYS.CATEGORIES, data.categories);
      if (data.menuItems) safeSet(STORAGE_KEYS.MENU_ITEMS, data.menuItems);
      if (data.settings) safeSet(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.bills) safeSet(STORAGE_KEYS.BILLS, data.bills);
      if (data.drawerClosings) safeSet(STORAGE_KEYS.DRAWER_CLOSINGS, data.drawerClosings);
      if (data.lastBillNumber) safeSet(STORAGE_KEYS.LAST_BILL_NUMBER, data.lastBillNumber);
      if (Array.isArray(data.inventoryItems)) safeSet(STORAGE_KEYS.INVENTORY_ITEMS, data.inventoryItems);
      if (Array.isArray(data.inventoryLogs)) safeSet(STORAGE_KEYS.INVENTORY_LOGS, data.inventoryLogs);
      if (Array.isArray(data.chickenItems)) safeSet(STORAGE_KEYS.CHICKEN_ITEMS, data.chickenItems);
      if (Array.isArray(data.chickenLogs)) safeSet(STORAGE_KEYS.CHICKEN_LOGS, data.chickenLogs);
      if (Array.isArray(data.chickenRules)) safeSet(STORAGE_KEYS.CHICKEN_RULES, data.chickenRules);
      if (Array.isArray(data.staffMembers)) safeSet(STORAGE_KEYS.STAFF_MEMBERS, data.staffMembers);
      if (Array.isArray(data.staffAttendance)) safeSet(STORAGE_KEYS.STAFF_ATTENDANCE, data.staffAttendance);
      if (Array.isArray(data.staffPayouts)) safeSet(STORAGE_KEYS.STAFF_PAYOUTS, data.staffPayouts);
      return true;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      return false;
    }
  },

  // Export Menu to CSV
  exportMenuCSV(): string {
    const items = this.getMenuItems();
    const categories = this.getCategories();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const header = ['Category', 'Item Name', 'Base Price', 'Variants', 'Flavours', 'Badge', 'In Stock'].join(',');
    const rows = items.map((item) => {
      const catName = `"${(catMap.get(item.categoryId) || 'Uncategorized').replace(/"/g, '""')}"`;
      const name = `"${item.name.replace(/"/g, '""')}"`;
      const basePrice = item.basePrice;
      const variantsStr = item.hasVariants
        ? `"${item.variants.map((v) => `${v.name}:${v.price}`).join(' | ')}"`
        : '""';
      const flavoursStr = item.hasFlavours
        ? `"${item.flavours.map((f) => `${f.name}:+${f.surcharge}`).join(' | ')}"`
        : '""';
      const badge = `"${item.badge || ''}"`;
      const inStock = item.isOutOfStock ? 'No' : 'Yes';

      return [catName, name, basePrice, variantsStr, flavoursStr, badge, inStock].join(',');
    });

    return [header, ...rows].join('\n');
  },
};
