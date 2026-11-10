# The BBQ Boxx — Mobile Billing & POS Web App

> **"Premium Flavours in Every Bite"** · *100% Halal Certified Street-Food BBQ Stall*

A mobile-first, responsive, offline-capable Billing and Point of Sale (POS) Progressive Web Application built specifically for **The BBQ Boxx** street-food counter. Designed for fast, confident, one-handed operation at night on phones and tablets, with side-by-side menu and cart on desktop.

---

## Key Features

### 1. Minimalist Two-Colour & Times New Roman Aesthetic
- **Pure Two-Color Palette**: High-contrast `#000000` Black and `#FFFFFF` White styling with inverted tactile buttons for night counter clarity.
- **Unified Typography**: Universal serif styling powered by **Times New Roman** across all screens, modals, receipts, and inputs.

### 2. Fast Counter Billing (Max 2 Taps)
- **1-Tap Quick Add**: Add standard items straight into the active order with a single tap.
- **Variant & Flavour Bottom Sheet**: Choose portions (*Quarter, Half, Full*, etc.) and signature flavours (*Peri Peri, Schezwan, Garlic, Honey*) with automatic **+₹10** surcharge calculation.
- **Order Types**: Dedicated **Dine-in** and **Parcel** modes.
- **Search & Filter**: Real-time search across menu items, token numbers, and categories.

### 3. Cart & Payment Settlement
- **Flexible Payments**: Hand Cash, GPay / UPI, Card, and Split payment modes.
- **Instant UPI QR**: Generates dynamic QR codes for the exact bill total directly from the configured counter UPI ID.
- **Cash Tender Calculator**: Quick ₹500, ₹200, ₹100 tender chips with instant change due calculation.
- **Discounts & GST**: Flat ₹ or % discount toggles, plus optional GST calculation.
- **Safety & Undo**: Instant item removal with an Undo toast.

### 4. Receipts & Kitchen Tokens (KOT)
- **WhatsApp Picture Sharing**: Export and share bills as crisp high-DPI picture cards directly into customer WhatsApp chats.
- **WhatsApp Text Sharing**: One-click formatted text receipt with itemised totals and stall details.
- **Thermal Printer Ready**: Dedicated CSS print engine for **58mm (pocket thermal)** and **80mm (standard thermal)** receipt printers.
- **Kitchen Token View (KOT)**: Clean, high-legibility kitchen slip with token number, portions, and custom chef notes.

### 5. In-App Menu Management (Owner Admin)
- **No Code Changes Needed**: Fully editable from inside the app with zero code updates.
- **Categories**: Add, rename, reorder, or delete categories with safe item migration.
- **Items & Portions**: Add new items, configure multiple variants/portions, set signature flavours, or create combo packages.
- **Quick Stock Toggles**: Toggle items as *Sold Out* / *In Stock* or hide them from the counter screen without deleting.
- **Bulk Price Adjustment**: Increase or decrease entire menus or specific categories by a flat ₹ amount or percentage (%).
- **Data Backup**: Export menu as JSON or CSV spreadsheet, import backup files, or restore default starting menu.

### 6. Sales Reports & Daily Cash Drawer Closing
- **Daily Closing Summary**: Immediate breakdown of **Total Sales**, **Hand Cash**, and **GPay / UPI**.
- **End-of-Day Drawer Reconciliation**: Physical cash denomination counter (₹500, ₹200, ₹100, ₹50, ₹20, ₹10, and coins) with opening float calculation and variance indicator (*Balanced, Surplus, Shortage*).
- **Share Day Report**: Send end-of-day sales closing reports as pictures or formatted text to owner WhatsApp in one tap.
- **CSV Audit Export**: Download all transaction records as standard CSV spreadsheets.

### 7. Security & Offline Reliability
- **PIN Protection**: Optional 4-digit PIN lock for Menu Admin and Sales Reports (Default PIN: `1234`).
- **100% Offline-First**: All data, bills, menu items, and settings persist safely in client-side `localStorage`.
- **Installable PWA**: Installable directly to home screens on Android and iOS devices.

---

## Tech Stack

- **Framework**: React 19 SPA
- **Tooling**: Vite 8 & TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Motion
- **Sound**: Web Audio API tactile audio synthesizer

---

## Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/Ragxyz07/bbq-pos.git
   cd bbq-pos
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your mobile browser or emulator.

4. Build for production:
   ```bash
   npm run build
   ```

---

## One-Click Deployment

Deployable in 30 seconds on **Vercel** or **Netlify**:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18+ or 22

---

## License

Apache-2.0 License. Built for **The BBQ Boxx**.
