import { Category, MenuItem, AppSettings, Bill, DrawerClosing, CartItem } from '../types';
import { SEED_CATEGORIES, SEED_MENU_ITEMS, DEFAULT_APP_SETTINGS } from '../data/seedMenu';

const STORAGE_KEYS = {
  CATEGORIES: 'bbq_pos_categories_v1',
  MENU_ITEMS: 'bbq_pos_menu_items_v1',
  SETTINGS: 'bbq_pos_settings_v1',
  BILLS: 'bbq_pos_bills_v1',
  DRAWER_CLOSINGS: 'bbq_pos_drawer_closings_v1',
  LAST_BILL_NUMBER: 'bbq_pos_last_bill_no_v1',
  TOKEN_TRACKER: 'bbq_pos_token_tracker_v1',
  SAVED_CART: 'bbq_pos_saved_cart_v1',
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
    return data.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  saveCategories(categories: Category[]): void {
    safeSet(STORAGE_KEYS.CATEGORIES, categories);
  },

  getMenuItems(): MenuItem[] {
    const data = safeGet<MenuItem[] | null>(STORAGE_KEYS.MENU_ITEMS, null);
    if (!data || data.length === 0) {
      safeSet(STORAGE_KEYS.MENU_ITEMS, SEED_MENU_ITEMS);
      return SEED_MENU_ITEMS;
    }
    // Auto-migrate any previously saved 20 surcharge flavours to 10
    let hasMigration = false;
    const migrated = data.map((item) => {
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
    if (merged.defaultFlavourSurcharge === 20) {
      merged.defaultFlavourSurcharge = 10;
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
    // Increment bill counter
    const lastBillNo = safeGet<number>(STORAGE_KEYS.LAST_BILL_NUMBER, 1000);
    const nextBillNo = lastBillNo + 1;
    safeSet(STORAGE_KEYS.LAST_BILL_NUMBER, nextBillNo);

    // Increment daily token
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

  // Export full JSON database for backup
  exportAllDataJson(): string {
    const payload = {
      app: 'The BBQ Boxx POS',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      categories: this.getCategories(),
      menuItems: this.getMenuItems(),
      settings: this.getSettings(),
      bills: this.getBills(),
      drawerClosings: this.getDrawerClosings(),
      lastBillNumber: safeGet<number>(STORAGE_KEYS.LAST_BILL_NUMBER, 1000),
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
