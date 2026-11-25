import { ChickenItem, ChickenDeductionRule } from '../types';

const nowIso = new Date().toISOString();
const d = new Date();
const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const SEED_CHICKEN_ITEMS: ChickenItem[] = [
  {
    id: 'chk-wings',
    name: 'Wings',
    unit: 'pcs',
    currentCount: 50,
    minCount: 10,
    sortOrder: 1,
    lastCountedDate: todayKey,
    updatedAt: nowIso,
  },
  {
    id: 'chk-lollipop',
    name: 'Lollipop',
    unit: 'pcs',
    currentCount: 50,
    minCount: 10,
    sortOrder: 2,
    lastCountedDate: todayKey,
    updatedAt: nowIso,
  },
  {
    id: 'chk-chest',
    name: 'Chest',
    unit: 'pcs',
    currentCount: 30,
    minCount: 8,
    sortOrder: 3,
    lastCountedDate: todayKey,
    updatedAt: nowIso,
  },
  {
    id: 'chk-drumstick',
    name: 'Drumstick',
    unit: 'pcs',
    currentCount: 20,
    minCount: 6,
    sortOrder: 4,
    lastCountedDate: todayKey,
    updatedAt: nowIso,
  },
  {
    id: 'chk-thigh',
    name: 'Thigh',
    unit: 'pcs',
    currentCount: 20,
    minCount: 6,
    sortOrder: 5,
    lastCountedDate: todayKey,
    updatedAt: nowIso,
  },
  {
    id: 'chk-boneless-stick',
    name: 'Boneless Stick',
    unit: 'stick',
    currentCount: 20,
    minCount: 6,
    sortOrder: 6,
    lastCountedDate: todayKey,
    updatedAt: nowIso,
  },
];

export const SEED_CHICKEN_RULES: ChickenDeductionRule[] = [
  // BBQ Chicken: Quarter = 2 Chest pcs, Half = 4 Chest pcs, Full = 8 Chest pcs
  {
    ruleKey: 'item-bbq-chicken::Quarter',
    label: 'BBQ Chicken (Quarter)',
    components: [{ chickenItemId: 'chk-chest', quantity: 2 }],
  },
  {
    ruleKey: 'item-bbq-chicken::Half',
    label: 'BBQ Chicken (Half)',
    components: [{ chickenItemId: 'chk-chest', quantity: 4 }],
  },
  {
    ruleKey: 'item-bbq-chicken::Full',
    label: 'BBQ Chicken (Full)',
    components: [{ chickenItemId: 'chk-chest', quantity: 8 }],
  },

  // Wings & Lollipop: 5 pcs per plate
  {
    ruleKey: 'item-wings',
    label: 'BBQ Wings (Plate = 5 pcs)',
    components: [{ chickenItemId: 'chk-wings', quantity: 5 }],
  },
  {
    ruleKey: 'item-lollipop',
    label: 'Chicken Lollipop (Plate = 5 pcs)',
    components: [{ chickenItemId: 'chk-lollipop', quantity: 5 }],
  },

  // Drumstick: 2 pcs per plate
  {
    ruleKey: 'item-drum-stick',
    label: 'Drum Stick (Plate = 2 pcs)',
    components: [{ chickenItemId: 'chk-drumstick', quantity: 2 }],
  },

  // Boneless: 2 sticks per plate (4 pcs per stick)
  {
    ruleKey: 'item-boneless',
    label: 'Boneless BBQ (Plate = 2 sticks / 4 pcs each)',
    components: [{ chickenItemId: 'chk-boneless-stick', quantity: 2 }],
  },

  // Combos
  {
    ruleKey: 'item-combo-1',
    label: 'Combo 1 (1 Drumstick + 2 Wings + 2 Lollipop)',
    components: [
      { chickenItemId: 'chk-drumstick', quantity: 1 },
      { chickenItemId: 'chk-wings', quantity: 2 },
      { chickenItemId: 'chk-lollipop', quantity: 2 },
    ],
  },
  {
    ruleKey: 'item-combo-2',
    label: 'Combo 2 (Quarter BBQ + 2 Wings + 2 Lollipop)',
    components: [
      { chickenItemId: 'chk-chest', quantity: 2 },
      { chickenItemId: 'chk-wings', quantity: 2 },
      { chickenItemId: 'chk-lollipop', quantity: 2 },
    ],
  },

  // Meal Boxes
  {
    ruleKey: 'item-meal-wings',
    label: 'Wings Meal Box',
    components: [{ chickenItemId: 'chk-wings', quantity: 5 }],
  },
  {
    ruleKey: 'item-meal-quarter',
    label: 'Quarter Meal Box',
    components: [{ chickenItemId: 'chk-chest', quantity: 2 }],
  },
  {
    ruleKey: 'item-meal-half',
    label: 'Half Meal Box',
    components: [{ chickenItemId: 'chk-chest', quantity: 4 }],
  },
  {
    ruleKey: 'item-meal-full',
    label: 'Full Meal Box',
    components: [{ chickenItemId: 'chk-chest', quantity: 8 }],
  },

  // Tandoori & Tikkas (Tandoori Q = 1 Thigh pc; Tikkas = 2 sticks)
  {
    ruleKey: 'item-tandoori-chicken::Quarter',
    label: 'Tandoori Chicken (Quarter)',
    components: [{ chickenItemId: 'chk-thigh', quantity: 1 }],
  },
  {
    ruleKey: 'item-tandoori-chicken::Half',
    label: 'Tandoori Chicken (Half)',
    components: [
      { chickenItemId: 'chk-chest', quantity: 1 },
      { chickenItemId: 'chk-thigh', quantity: 1 },
    ],
  },
  {
    ruleKey: 'item-tandoori-chicken::Full',
    label: 'Tandoori Chicken (Full)',
    components: [
      { chickenItemId: 'chk-chest', quantity: 2 },
      { chickenItemId: 'chk-thigh', quantity: 2 },
    ],
  },
  {
    ruleKey: 'item-bbq-tikka',
    label: 'Bbq Tikka (Plate = 2 sticks / 4 pcs each)',
    components: [{ chickenItemId: 'chk-boneless-stick', quantity: 2 }],
  },
  {
    ruleKey: 'item-malai-tikka',
    label: 'Malai Tikka (Plate = 2 sticks / 4 pcs each)',
    components: [{ chickenItemId: 'chk-boneless-stick', quantity: 2 }],
  },
  {
    ruleKey: 'item-haryali-tikka',
    label: 'Haryali Tikka (Plate = 2 sticks / 4 pcs each)',
    components: [{ chickenItemId: 'chk-boneless-stick', quantity: 2 }],
  },

  // Hariyali (Q = 1 Thigh pc)
  {
    ruleKey: 'item-hariyali-bbq::Quarter',
    label: 'Hariyali BBQ Chicken (Quarter)',
    components: [{ chickenItemId: 'chk-thigh', quantity: 1 }],
  },
  {
    ruleKey: 'item-hariyali-bbq::Half',
    label: 'Hariyali BBQ Chicken (Half)',
    components: [
      { chickenItemId: 'chk-chest', quantity: 1 },
      { chickenItemId: 'chk-thigh', quantity: 1 },
    ],
  },
  {
    ruleKey: 'item-hariyali-bbq::Full',
    label: 'Hariyali BBQ Chicken (Full)',
    components: [
      { chickenItemId: 'chk-chest', quantity: 2 },
      { chickenItemId: 'chk-thigh', quantity: 2 },
    ],
  },

  // Alfaham (Q = 1 Thigh pc)
  {
    ruleKey: 'item-alfaham-bbq::Quarter',
    label: 'Alfaham BBQ Chicken (Quarter)',
    components: [{ chickenItemId: 'chk-thigh', quantity: 1 }],
  },
  {
    ruleKey: 'item-alfaham-bbq::Half',
    label: 'Alfaham BBQ Chicken (Half)',
    components: [
      { chickenItemId: 'chk-chest', quantity: 1 },
      { chickenItemId: 'chk-thigh', quantity: 1 },
    ],
  },
  {
    ruleKey: 'item-alfaham-bbq::Full',
    label: 'Alfaham BBQ Chicken (Full)',
    components: [
      { chickenItemId: 'chk-chest', quantity: 2 },
      { chickenItemId: 'chk-thigh', quantity: 2 },
    ],
  },
];
