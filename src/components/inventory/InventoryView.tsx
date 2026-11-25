import React, { useState, useMemo } from 'react';
import {
  InventoryCategory,
  InventoryItem,
  InventoryLogEntry,
  InventoryUnit,
} from '../../types';
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
} from '../../data/seedInventory';
import { storage } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { formatCurrency, formatDateTime } from '../../utils/format';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Edit2,
  History,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface InventoryViewProps {
  items: InventoryItem[];
  setItems: (items: InventoryItem[]) => void;
  logs: InventoryLogEntry[];
  setLogs: (logs: InventoryLogEntry[]) => void;
  soundEnabled?: boolean;
}

const toLocalDateKey = (timestamp: number): string => {
  const d = new Date(timestamp);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatRestockDate = (dateKey?: string): string => {
  if (!dateKey) return '—';
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const dateKeyToTimestamp = (dateKey: string, todayKey: string): number => {
  if (!dateKey || dateKey === todayKey) return Date.now();
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return Date.now();
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
};

const formatQty = (val: number): string => {
  const rounded = Math.round(val * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
};

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  setItems,
  logs,
  setLogs,
  soundEnabled = true,
}) => {
  const todayKey = toLocalDateKey(Date.now());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterdayDate.getTime());

  // Navigation & Filters
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'history'>('stock');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showLowOnly, setShowLowOnly] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | InventoryCategory>('all');
  const [historyDayFilter, setHistoryDayFilter] = useState<string>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'in' | 'out' | 'adjust'>('all');

  // Toast / Copy Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Add / Edit Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<InventoryCategory>('Packaging');
  const [formUnit, setFormUnit] = useState<InventoryUnit>('packs');
  const [formCurrentStock, setFormCurrentStock] = useState<string>('0');
  const [formMinStock, setFormMinStock] = useState<string>('3');
  const [formCostPerUnit, setFormCostPerUnit] = useState<string>('');
  const [formRestockDate, setFormRestockDate] = useState<string>(todayKey);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Stock Movement Modal (+ Stock In / - Stock Out)
  const [movementModal, setMovementModal] = useState<{
    item: InventoryItem;
    mode: 'in' | 'out';
  } | null>(null);
  const [moveQty, setMoveQty] = useState<string>('1');
  const [moveCost, setMoveCost] = useState<string>('');
  const [moveDate, setMoveDate] = useState<string>(todayKey);
  const [moveNote, setMoveNote] = useState<string>('');
  const [moveError, setMoveError] = useState<string>('');

  // Delete Confirmation Modal
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Metrics
  const lowOrOutItems = useMemo(
    () =>
      items
        .filter((it) => it.currentStock <= it.minStock)
        .sort((a, b) => a.currentStock - b.currentStock),
    [items]
  );

  const todayRestockSpend = useMemo(
    () =>
      logs
        .filter((l) => l.type === 'in' && toLocalDateKey(l.timestamp) === todayKey)
        .reduce((sum, l) => sum + (l.cost || 0), 0),
    [logs, todayKey]
  );

  // Filtered Stock Items
  const filteredItems = useMemo(() => {
    return items
      .filter((it) => {
        if (showLowOnly && it.currentStock > it.minStock) return false;
        if (categoryFilter !== 'all' && it.category !== categoryFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = it.name.toLowerCase().includes(q);
          const matchCat = it.category.toLowerCase().includes(q);
          const matchNotes = (it.notes || '').toLowerCase().includes(q);
          if (!matchName && !matchCat && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aRank = a.currentStock <= 0 ? 0 : a.currentStock <= a.minStock ? 1 : 2;
        const bRank = b.currentStock <= 0 ? 0 : b.currentStock <= b.minStock ? 1 : 2;
        if (aRank !== bRank) return aRank - bRank;
        return a.name.localeCompare(b.name);
      });
  }, [items, showLowOnly, categoryFilter, searchQuery]);

  // Filtered History Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (historyTypeFilter !== 'all' && l.type !== historyTypeFilter) return false;
      if (historyDayFilter !== 'all' && toLocalDateKey(l.timestamp) !== historyDayFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (
          !l.itemName.toLowerCase().includes(q) &&
          !(l.note || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [logs, historyTypeFilter, historyDayFilter, searchQuery]);

  // Open Add / Edit Modal
  const openAddItemModal = () => {
    sound.playTap(soundEnabled);
    setEditingItem(null);
    setFormName('');
    setFormCategory('Packaging');
    setFormUnit('packs');
    setFormCurrentStock('0');
    setFormMinStock('3');
    setFormCostPerUnit('');
    setFormRestockDate(todayKey);
    setFormNotes('');
    setFormError('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    sound.playTap(soundEnabled);
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormUnit(item.unit);
    setFormCurrentStock(String(item.currentStock));
    setFormMinStock(String(item.minStock));
    setFormCostPerUnit(item.costPerUnit !== undefined ? String(item.costPerUnit) : '');
    setFormRestockDate(item.lastRestockedDate || '');
    setFormNotes(item.notes || '');
    setFormError('');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Please enter item name.');
      return;
    }
    const parsedStock = parseFloat(formCurrentStock);
    const parsedMin = parseFloat(formMinStock);
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      setFormError('Stock must be 0 or more.');
      return;
    }
    if (Number.isNaN(parsedMin) || parsedMin < 0) {
      setFormError('Alert limit must be 0 or more.');
      return;
    }
    const parsedCost = formCostPerUnit.trim() !== '' ? parseFloat(formCostPerUnit) : undefined;
    if (parsedCost !== undefined && (Number.isNaN(parsedCost) || parsedCost < 0)) {
      setFormError('Cost must be 0 or more.');
      return;
    }

    sound.playTap(soundEnabled);
    const nowIso = new Date().toISOString();
    const cleanRestockDate = formRestockDate.trim() || undefined;

    if (editingItem) {
      const stockDiff = parsedStock - editingItem.currentStock;
      const updatedItem: InventoryItem = {
        ...editingItem,
        name: trimmedName,
        category: formCategory,
        unit: formUnit,
        currentStock: parsedStock,
        minStock: parsedMin,
        costPerUnit: parsedCost,
        lastRestockedDate: cleanRestockDate,
        notes: formNotes.trim() || undefined,
        updatedAt: nowIso,
      };
      const updatedItems = items.map((it) => (it.id === editingItem.id ? updatedItem : it));
      setItems(updatedItems);
      storage.saveInventoryItems(updatedItems);

      if (Math.abs(stockDiff) > 0.0001) {
        const updatedLogs = storage.addInventoryLog({
          id: `invlog-${Date.now()}`,
          itemId: updatedItem.id,
          itemName: updatedItem.name,
          unit: updatedItem.unit,
          type: 'adjust',
          quantity: Math.abs(stockDiff),
          previousStock: editingItem.currentStock,
          newStock: parsedStock,
          note: 'Manual stock adjustment',
          timestamp: Date.now(),
        });
        setLogs(updatedLogs);
      }
      showToast(`Saved "${trimmedName}"`);
    } else {
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        name: trimmedName,
        category: formCategory,
        unit: formUnit,
        currentStock: parsedStock,
        minStock: parsedMin,
        costPerUnit: parsedCost,
        lastRestockedDate: cleanRestockDate,
        notes: formNotes.trim() || undefined,
        updatedAt: nowIso,
      };
      const updatedItems = [newItem, ...items];
      setItems(updatedItems);
      storage.saveInventoryItems(updatedItems);

      if (parsedStock > 0) {
        const updatedLogs = storage.addInventoryLog({
          id: `invlog-${Date.now()}`,
          itemId: newItem.id,
          itemName: newItem.name,
          unit: newItem.unit,
          type: 'in',
          quantity: parsedStock,
          previousStock: 0,
          newStock: parsedStock,
          cost: parsedCost !== undefined ? Math.round(parsedCost * parsedStock) : undefined,
          note: 'Initial stock',
          timestamp: cleanRestockDate
            ? dateKeyToTimestamp(cleanRestockDate, todayKey)
            : Date.now(),
        });
        setLogs(updatedLogs);
      }
      showToast(`Added "${trimmedName}"`);
    }

    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  // Open Stock Movement Modal
  const openMovementModal = (item: InventoryItem, mode: 'in' | 'out') => {
    sound.playTap(soundEnabled);
    setMovementModal({ item, mode });
    setMoveQty('1');
    setMoveCost(
      mode === 'in' && item.costPerUnit !== undefined ? String(item.costPerUnit) : ''
    );
    setMoveDate(todayKey);
    setMoveNote('');
    setMoveError('');
  };

  const handleUpdateMoveQty = (qtyStr: string) => {
    setMoveQty(qtyStr);
    setMoveError('');
    if (movementModal?.mode === 'in' && movementModal.item.costPerUnit !== undefined) {
      const q = parseFloat(qtyStr);
      if (!Number.isNaN(q) && q > 0) {
        setMoveCost(String(Math.round(q * movementModal.item.costPerUnit)));
      }
    }
  };

  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModal) return;

    const { item, mode } = movementModal;
    const qty = parseFloat(moveQty);
    if (Number.isNaN(qty) || qty <= 0) {
      setMoveError('Enter quantity greater than 0.');
      return;
    }

    if (mode === 'out' && qty > item.currentStock) {
      setMoveError(`Only ${formatQty(item.currentStock)} ${item.unit} available.`);
      return;
    }

    const parsedCost =
      mode === 'in' && moveCost.trim() !== '' ? parseFloat(moveCost) : undefined;
    if (parsedCost !== undefined && (Number.isNaN(parsedCost) || parsedCost < 0)) {
      setMoveError('Cost cannot be negative.');
      return;
    }

    sound.playTap(soundEnabled);
    const chosenDate = moveDate.trim() || todayKey;
    const prevStock = item.currentStock;
    const newStock =
      mode === 'in'
        ? Math.round((prevStock + qty) * 100) / 100
        : Math.max(0, Math.round((prevStock - qty) * 100) / 100);

    const updatedItems = items.map((it) =>
      it.id === item.id
        ? {
            ...it,
            currentStock: newStock,
            lastRestockedDate: mode === 'in' ? chosenDate : it.lastRestockedDate,
            updatedAt: new Date().toISOString(),
          }
        : it
    );
    setItems(updatedItems);
    storage.saveInventoryItems(updatedItems);

    const updatedLogs = storage.addInventoryLog({
      id: `invlog-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      type: mode,
      quantity: qty,
      previousStock: prevStock,
      newStock,
      cost: parsedCost,
      note: moveNote.trim() || (mode === 'in' ? 'Restocked' : 'Used at stall'),
      timestamp: dateKeyToTimestamp(chosenDate, todayKey),
    });
    setLogs(updatedLogs);

    setMovementModal(null);
    showToast(
      `${mode === 'in' ? '+' : '-'}${formatQty(qty)} ${item.unit} ${item.name}`
    );
  };

  // Delete Supply Item
  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    sound.playCancel(soundEnabled);
    const updated = items.filter((it) => it.id !== deletingItem.id);
    setItems(updated);
    storage.saveInventoryItems(updated);
    showToast(`Deleted "${deletingItem.name}"`);
    setDeletingItem(null);
  };

  // Copy Low-Stock Buy List
  const handleCopyReorderList = async () => {
    sound.playTap(soundEnabled);
    const targetList = lowOrOutItems.length > 0 ? lowOrOutItems : items;
    const header =
      lowOrOutItems.length > 0
        ? `*THE BBQ BOXX - BUY LIST (${new Date().toLocaleDateString('en-IN')})*`
        : `*THE BBQ BOXX - STOCK LIST (${new Date().toLocaleDateString('en-IN')})*`;

    const lines = targetList.map((it, idx) => {
      const status = it.currentStock <= 0 ? 'OUT' : it.currentStock <= it.minStock ? 'LOW' : 'OK';
      return `${idx + 1}. ${it.name}: ${formatQty(it.currentStock)} ${it.unit} (Min ${formatQty(it.minStock)}) [${status}]`;
    });

    try {
      await navigator.clipboard.writeText(`${header}\n\n${lines.join('\n')}`);
      showToast(
        lowOrOutItems.length > 0
          ? `Copied buy list (${lowOrOutItems.length} low items)`
          : 'Copied stock list'
      );
    } catch {
      showToast('Could not copy to clipboard.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    sound.playTap(soundEnabled);
    let csvContent = '';
    let filename = '';

    if (activeSubTab === 'stock') {
      const headers = [
        'Item',
        'Category',
        'Stock',
        'Unit',
        'Min Limit',
        'Status',
        'Restock Date',
        'Cost/Unit',
        'Notes',
      ];
      const rows = items.map((it) => {
        const status =
          it.currentStock <= 0
            ? 'OUT OF STOCK'
            : it.currentStock <= it.minStock
            ? 'LOW STOCK'
            : 'IN STOCK';
        return [
          `"${it.name.replace(/"/g, '""')}"`,
          `"${it.category}"`,
          formatQty(it.currentStock),
          `"${it.unit}"`,
          formatQty(it.minStock),
          `"${status}"`,
          `"${formatRestockDate(it.lastRestockedDate)}"`,
          it.costPerUnit ?? '',
          `"${(it.notes || '').replace(/"/g, '""')}"`,
        ].join(',');
      });
      csvContent = [headers.join(','), ...rows].join('\n');
      filename = `bbq_boxx_stock_${todayKey}.csv`;
    } else {
      const headers = ['Date & Time', 'Item', 'Type', 'Qty', 'Unit', 'Before', 'After', 'Cost', 'Note'];
      const rows = filteredLogs.map((l) => [
        `"${formatDateTime(l.timestamp)}"`,
        `"${l.itemName.replace(/"/g, '""')}"`,
        `"${l.type.toUpperCase()}"`,
        formatQty(l.quantity),
        `"${l.unit}"`,
        formatQty(l.previousStock),
        formatQty(l.newStock),
        l.cost ?? '',
        `"${(l.note || '').replace(/"/g, '""')}"`,
      ].join(','));
      csvContent = [headers.join(','), ...rows].join('\n');
      filename = `bbq_boxx_stock_history_${todayKey}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24 md:pb-8 space-y-4">
      {/* 1. Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-2 border-black p-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-black uppercase tracking-tight">
            STOCK
          </h2>
          <p className="text-xs text-black/70 mt-0.5">
            Track paper plates, tissues, cleaning supplies &amp; stall stock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddItemModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white border border-red-600 hover:bg-red-700 text-xs font-bold uppercase transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>

          <button
            type="button"
            onClick={handleCopyReorderList}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-black border border-black hover:bg-black hover:text-white text-xs font-bold uppercase transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Buy List</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-black border border-black hover:bg-black hover:text-white text-xs font-bold uppercase transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Inline Toast */}
      {feedbackMsg && (
        <div className="flex items-center justify-between bg-black text-white px-3.5 py-2 text-xs font-bold uppercase">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-red-500 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button type="button" onClick={() => setFeedbackMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Compact Summary Strip */}
      <div className="grid grid-cols-3 border border-black bg-white divide-x divide-black">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('stock');
            setShowLowOnly(false);
          }}
          className="p-3 text-left hover:bg-black/5 transition-colors"
        >
          <div className="text-[10px] font-bold uppercase text-black/65">Total Items</div>
          <div className="text-xl sm:text-2xl font-bold text-black tabular-nums mt-0.5">
            {items.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap(soundEnabled);
            setActiveSubTab('stock');
            setShowLowOnly((prev) => !prev);
          }}
          className={`p-3 text-left transition-colors ${
            showLowOnly
              ? 'bg-red-600 text-white'
              : lowOrOutItems.length > 0
              ? 'bg-white hover:bg-red-50'
              : 'bg-white hover:bg-black/5'
          }`}
        >
          <div
            className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
              showLowOnly ? 'text-white' : 'text-red-600'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Low Stock</span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold tabular-nums mt-0.5 ${
              showLowOnly
                ? 'text-white'
                : lowOrOutItems.length > 0
                ? 'text-red-600'
                : 'text-black'
            }`}
          >
            {lowOrOutItems.length}
          </div>
        </button>

        <div className="p-3 text-left">
          <div className="text-[10px] font-bold uppercase text-black/65">Today Spend</div>
          <div className="text-xl sm:text-2xl font-bold text-black tabular-nums mt-0.5">
            {formatCurrency(todayRestockSpend)}
          </div>
        </div>
      </div>

      {/* 3. Neat 1-Line Low-Stock Alert Strip */}
      {lowOrOutItems.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-red-600 bg-white px-3.5 py-2.5 text-xs">
          <div className="flex items-start sm:items-center gap-2 text-red-600 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              Low Stock ({lowOrOutItems.length}):{' '}
              <span className="text-black font-normal">
                {lowOrOutItems
                  .map((it) => `${it.name} (${formatQty(it.currentStock)} ${it.unit})`)
                  .join(', ')}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap(soundEnabled);
              setActiveSubTab('stock');
              setShowLowOnly((prev) => !prev);
            }}
            className="self-start sm:self-auto shrink-0 px-2.5 py-1 border border-red-600 text-[11px] font-bold uppercase text-red-600 hover:bg-red-600 hover:text-white transition-colors"
          >
            {showLowOnly ? 'Show All' : 'View Low Only'}
          </button>
        </div>
      )}

      {/* 4. Clean Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border border-black bg-white">
            <button
              type="button"
              onClick={() => setActiveSubTab('stock')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase ${
                activeSubTab === 'stock'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black/5'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Stock</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase border-l border-black ${
                activeSubTab === 'history'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black/5'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({logs.length})</span>
            </button>
          </div>

          {activeSubTab === 'stock' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | InventoryCategory)}
              className="border border-black bg-white px-2.5 py-1.5 text-xs font-bold text-black"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {INVENTORY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-black/60 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSubTab === 'stock' ? 'Search supplies...' : 'Search history...'
            }
            className="w-full bg-white border border-black pl-8 pr-7 py-1.5 text-xs text-black placeholder-black/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-black/60 hover:text-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* History Sub-filters */}
      {activeSubTab === 'history' && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'all', label: 'All Days' },
              { key: todayKey, label: 'Today' },
              { key: yesterdayKey, label: 'Yesterday' },
            ].map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setHistoryDayFilter(d.key)}
                className={`px-2.5 py-1 font-bold border ${
                  historyDayFilter === d.key
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-black/5'
                }`}
              >
                {d.label}
              </button>
            ))}
            <input
              type="date"
              value={historyDayFilter !== 'all' ? historyDayFilter : ''}
              onChange={(e) => setHistoryDayFilter(e.target.value || 'all')}
              className="px-2 py-1 font-bold border border-black bg-white text-black"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'in' as const, label: 'In (+)' },
              { key: 'out' as const, label: 'Out (-)' },
              { key: 'adjust' as const, label: 'Edited' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setHistoryTypeFilter(t.key)}
                className={`px-2.5 py-1 font-bold border ${
                  historyTypeFilter === t.key
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-black border-black hover:bg-black/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Clean List / Table */}
      {activeSubTab === 'stock' ? (
        <div className="bg-white border border-black">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs font-bold uppercase text-black/75">
                {showLowOnly ? 'No low-stock items right now.' : 'No supply items match.'}
              </p>
              <button
                type="button"
                onClick={openAddItemModal}
                className="px-3.5 py-1.5 bg-red-600 text-white border border-red-600 text-xs font-bold uppercase hover:bg-red-700"
              >
                + Add Item
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/15">
              {/* Desktop Column Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2.5 bg-white border-b border-black text-[11px] font-bold uppercase text-black/75">
                <div className="col-span-3">Supply Item</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-2 text-center">Restock Date</div>
                <div className="col-span-2 text-right">Stock</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {filteredItems.map((item) => {
                const isOut = item.currentStock <= 0;
                const isLow = !isOut && item.currentStock <= item.minStock;

                return (
                  <div
                    key={item.id}
                    className={`px-3.5 py-3 md:px-4 md:grid md:grid-cols-12 md:items-center gap-3 transition-colors ${
                      isOut || isLow ? 'bg-red-50/35' : 'bg-white hover:bg-black/[0.02]'
                    }`}
                  >
                    {/* Item Name + Category */}
                    <div className="md:col-span-3 flex items-start justify-between md:block gap-2">
                      <div>
                        <div className="text-sm font-bold text-black leading-snug">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-black/65 mt-0.5">
                          {item.category}
                          {item.costPerUnit !== undefined
                            ? ` • ${formatCurrency(item.costPerUnit)}/${item.unit}`
                            : ''}
                          {item.notes ? ` • ${item.notes}` : ''}
                        </div>
                      </div>

                      {/* Mobile Status Badge */}
                      <span
                        className={`md:hidden shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase border ${
                          isOut
                            ? 'bg-red-600 text-white border-red-600'
                            : isLow
                            ? 'bg-white text-red-600 border-red-600'
                            : 'bg-white text-black border-black'
                        }`}
                      >
                        {isOut ? 'Out' : isLow ? 'Low' : 'OK'}
                      </span>
                    </div>

                    {/* Desktop Status */}
                    <div className="hidden md:flex md:col-span-2 justify-center">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                          isOut
                            ? 'bg-red-600 text-white border-red-600'
                            : isLow
                            ? 'bg-white text-red-600 border-red-600'
                            : 'bg-white text-black border-black'
                        }`}
                      >
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>

                    {/* Desktop Restock Date */}
                    <div className="hidden md:block md:col-span-2 text-center text-xs font-bold text-black tabular-nums">
                      {formatRestockDate(item.lastRestockedDate)}
                    </div>

                    {/* Stock Quantity (+ Restock Date on mobile) */}
                    <div className="md:col-span-2 flex items-baseline justify-between md:block md:text-right mt-2 md:mt-0">
                      <div
                        className={`text-base font-bold tabular-nums ${
                          isOut || isLow ? 'text-red-600' : 'text-black'
                        }`}
                      >
                        {formatQty(item.currentStock)} {item.unit}
                      </div>
                      <div className="text-[11px] text-black/60 tabular-nums">
                        <span className="md:hidden">
                          Restocked: <strong>{formatRestockDate(item.lastRestockedDate)}</strong> •{' '}
                        </span>
                        Min: {formatQty(item.minStock)} {item.unit}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-3 flex items-center justify-end gap-1.5 mt-2.5 md:mt-0">
                      <button
                        type="button"
                        onClick={() => openMovementModal(item, 'in')}
                        className="flex-1 md:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 bg-black text-white border border-black hover:bg-black/85 text-xs font-bold uppercase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>In</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openMovementModal(item, 'out')}
                        disabled={item.currentStock <= 0}
                        className="flex-1 md:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white text-black border border-black hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase"
                      >
                        <Minus className="w-3.5 h-3.5 text-red-600" />
                        <span>Out</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditItemModal(item)}
                        title="Edit item"
                        className="p-1.5 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playTap(soundEnabled);
                          setDeletingItem(item);
                        }}
                        title="Delete item"
                        className="p-1.5 border border-black bg-white text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* STOCK HISTORY TABLE */
        <div className="bg-white border border-black">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-black/70">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black text-[11px] font-bold uppercase text-black/75">
                    <th className="p-3">Time</th>
                    <th className="p-3">Item</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Balance</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/15 text-xs">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-black/[0.02]">
                      <td className="p-3 whitespace-nowrap text-black/75">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="p-3 font-bold text-black">{log.itemName}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
                            log.type === 'in'
                              ? 'bg-black text-white border-black'
                              : log.type === 'out'
                              ? 'bg-white text-red-600 border-red-600'
                              : 'bg-white text-black border-black'
                          }`}
                        >
                          {log.type === 'in' ? 'IN' : log.type === 'out' ? 'OUT' : 'EDIT'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold tabular-nums whitespace-nowrap">
                        {log.type === 'in' ? '+' : log.type === 'out' ? '-' : ''}
                        {formatQty(log.quantity)} {log.unit}
                      </td>
                      <td className="p-3 text-right tabular-nums whitespace-nowrap text-black/75">
                        {formatQty(log.previousStock)} &rarr; <strong>{formatQty(log.newStock)}</strong>
                      </td>
                      <td className="p-3 text-right tabular-nums whitespace-nowrap font-bold">
                        {log.cost !== undefined && log.cost > 0 ? formatCurrency(log.cost) : '—'}
                      </td>
                      <td className="p-3 text-black/70">{log.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= ADD / EDIT ITEM MODAL ================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-md bg-white border-2 border-black shadow-2xl max-h-[84dvh] overflow-y-auto touch-scroll">
            <div className="flex items-center justify-between px-4 py-3 border-b border-black sticky top-0 bg-white z-10">
              <h3 className="text-sm font-bold uppercase">
                {editingItem ? 'Edit Supply Item' : 'Add Supply Item'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 border border-black hover:bg-black hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-4 space-y-3">
              {formError && (
                <div className="p-2 border border-red-600 bg-red-50 text-red-600 text-xs font-bold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Paper Plates, Tissue, Dish Wash"
                  className="w-full border border-black px-3 py-2 text-xs"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as InventoryCategory)}
                    className="w-full border border-black px-2.5 py-2 text-xs bg-white"
                  >
                    {INVENTORY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">
                    Unit *
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as InventoryUnit)}
                    className="w-full border border-black px-2.5 py-2 text-xs bg-white"
                  >
                    {INVENTORY_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">
                    Current Stock ({formUnit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formCurrentStock}
                    onChange={(e) => setFormCurrentStock(e.target.value)}
                    className="w-full border border-black px-3 py-2 text-xs tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1 text-red-600">
                    Low-Stock Alert At *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full border border-black px-3 py-2 text-xs tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">
                    Restock Date
                  </label>
                  <input
                    type="date"
                    value={formRestockDate}
                    onChange={(e) => setFormRestockDate(e.target.value)}
                    className="w-full border border-black px-2.5 py-2 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">
                    Cost / {formUnit} (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formCostPerUnit}
                    onChange={(e) => setFormCostPerUnit(e.target.value)}
                    placeholder="Optional"
                    className="w-full border border-black px-3 py-2 text-xs tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. 100 pcs/pack"
                  className="w-full border border-black px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 border border-black bg-white text-black text-xs font-bold uppercase hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-red-600 bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-700"
                >
                  {editingItem ? 'Save' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= STOCK IN / OUT MODAL ================= */}
      {movementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-sm bg-white border-2 border-black shadow-2xl max-h-[84dvh] overflow-y-auto touch-scroll">
            <div className="flex items-center justify-between px-4 py-3 border-b border-black sticky top-0 bg-white z-10">
              <h3 className="text-sm font-bold uppercase">
                {movementModal.mode === 'in' ? 'Stock In' : 'Stock Out'} — {movementModal.item.name}
              </h3>
              <button
                type="button"
                onClick={() => setMovementModal(null)}
                className="p-1 border border-black hover:bg-black hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovement} className="p-4 space-y-3">
              <div className="text-xs text-black/75">
                Available:{' '}
                <strong className="text-black">
                  {formatQty(movementModal.item.currentStock)} {movementModal.item.unit}
                </strong>{' '}
                (Min: {formatQty(movementModal.item.minStock)})
              </div>

              <div className="grid grid-cols-2 border border-black">
                <button
                  type="button"
                  onClick={() => {
                    setMovementModal({ ...movementModal, mode: 'in' });
                    setMoveError('');
                  }}
                  className={`py-1.5 text-xs font-bold uppercase ${
                    movementModal.mode === 'in'
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-black/5'
                  }`}
                >
                  + Stock In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMovementModal({ ...movementModal, mode: 'out' });
                    setMoveError('');
                  }}
                  className={`py-1.5 text-xs font-bold uppercase border-l border-black ${
                    movementModal.mode === 'out'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-black hover:bg-black/5'
                  }`}
                >
                  - Stock Out
                </button>
              </div>

              {moveError && (
                <div className="p-2 border border-red-600 bg-red-50 text-red-600 text-xs font-bold">
                  {moveError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase mb-1">
                  Quantity ({movementModal.item.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={moveQty}
                  onChange={(e) => handleUpdateMoveQty(e.target.value)}
                  className="w-full border border-black px-3 py-2 text-sm font-bold tabular-nums"
                  autoFocus
                />
                <div className="flex items-center gap-1.5 mt-2">
                  {[1, 2, 5, 10].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleUpdateMoveQty(String(preset))}
                      className="flex-1 py-1 text-xs font-bold border border-black bg-white hover:bg-black hover:text-white"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase mb-1">
                  {movementModal.mode === 'in' ? 'Restock Date *' : 'Date *'}
                </label>
                <input
                  type="date"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  className="w-full border border-black px-3 py-2 text-xs bg-white"
                />
              </div>

              {movementModal.mode === 'in' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">
                    Purchase Cost (₹ Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={moveCost}
                    onChange={(e) => setMoveCost(e.target.value)}
                    placeholder="e.g. 200"
                    className="w-full border border-black px-3 py-2 text-xs tabular-nums"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={moveNote}
                  onChange={(e) => setMoveNote(e.target.value)}
                  placeholder={movementModal.mode === 'in' ? 'Restocked' : 'Wastage / spoilage note'}
                  className="w-full border border-black px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovementModal(null)}
                  className="px-4 py-2 border border-black bg-white text-black text-xs font-bold uppercase hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 border text-white text-xs font-bold uppercase ${
                    movementModal.mode === 'in'
                      ? 'bg-black border-black hover:bg-black/85'
                      : 'bg-red-600 border-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-sm bg-white border-2 border-black p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase text-red-600">
              Delete {deletingItem.name}?
            </h3>
            <p className="text-xs text-black/80">
              This will remove the item from your stock list.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-1.5 border border-black bg-white text-black text-xs font-bold uppercase hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 border border-red-600 bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
