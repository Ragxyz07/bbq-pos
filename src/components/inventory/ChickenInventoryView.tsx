import React, { useState, useMemo } from 'react';
import {
  ChickenItem,
  ChickenUnit,
  ChickenDeductionRule,
  ChickenDeductionComponent,
  ChickenLogEntry,
  MenuItem,
} from '../../types';
import { SEED_CHICKEN_RULES } from '../../data/seedChickenInventory';
import { storage } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { formatDateTime } from '../../utils/format';
import {
  Plus,
  Minus,
  Edit3,
  Trash2,
  X,
  Check,
  AlertTriangle,
  History,
  Download,
  ClipboardCheck,
  Sliders,
  RotateCcw,
} from 'lucide-react';

interface ChickenInventoryViewProps {
  items: ChickenItem[];
  setItems: (items: ChickenItem[]) => void;
  logs: ChickenLogEntry[];
  setLogs: (logs: ChickenLogEntry[]) => void;
  rules: ChickenDeductionRule[];
  setRules: (rules: ChickenDeductionRule[]) => void;
  menuItems: MenuItem[];
  soundEnabled?: boolean;
}

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return 'Never';
  const [y, m, day] = dateStr.split('-');
  if (!y || !m || !day) return dateStr;
  return `${day}/${m}/${y.slice(-2)}`;
};

export const ChickenInventoryView: React.FC<ChickenInventoryViewProps> = ({
  items,
  setItems,
  logs,
  setLogs,
  rules,
  setRules,
  menuItems,
  soundEnabled = true,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'counts' | 'rules' | 'history'>('counts');
  const [showLowOnly, setShowLowOnly] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Bulk Daily Count Modal
  const [isBulkCountOpen, setIsBulkCountOpen] = useState<boolean>(false);
  const [bulkMode, setBulkMode] = useState<'set' | 'add'>('set');
  const [bulkValues, setBulkValues] = useState<Record<string, string>>({});
  const [bulkNote, setBulkNote] = useState<string>('Morning prep count');

  // Single Item Movement Modal (Set / Add / Out)
  const [moveModal, setMoveModal] = useState<{
    item: ChickenItem;
    mode: 'set' | 'in' | 'out';
  } | null>(null);
  const [moveQty, setMoveQty] = useState<string>('');
  const [moveNote, setMoveNote] = useState<string>('');

  // Add / Edit Chicken Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ChickenItem | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formUnit, setFormUnit] = useState<ChickenUnit>('pcs');
  const [formCount, setFormCount] = useState<string>('0');
  const [formMin, setFormMin] = useState<string>('10');

  // Delete Confirmation Modal
  const [deletingItem, setDeletingItem] = useState<ChickenItem | null>(null);

  // Rule Editor Modal
  const [editingRule, setEditingRule] = useState<ChickenDeductionRule | null>(null);
  const [ruleDraftComponents, setRuleDraftComponents] = useState<ChickenDeductionComponent[]>([]);
  const [ruleSearch, setRuleSearch] = useState<string>('');

  // History filter
  const [historyFilter, setHistoryFilter] = useState<'all' | ChickenLogEntry['type']>('all');

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)),
    [items]
  );

  const lowOrOutItems = useMemo(
    () => sortedItems.filter((it) => it.currentCount <= it.minCount),
    [sortedItems]
  );

  const totalPiecesReady = useMemo(
    () => sortedItems.reduce((sum, it) => sum + it.currentCount, 0),
    [sortedItems]
  );

  const displayedItems = useMemo(
    () => (showLowOnly ? lowOrOutItems : sortedItems),
    [sortedItems, lowOrOutItems, showLowOnly]
  );

  const itemMap = useMemo(
    () => new Map(sortedItems.map((it) => [it.id, it])),
    [sortedItems]
  );

  // Unmapped menu items (if owner adds custom menu dishes later)
  const unmappedMenuOptions = useMemo(() => {
    const existingKeys = new Set(rules.map((r) => r.ruleKey));
    const candidates: { ruleKey: string; label: string }[] = [];
    for (const mi of menuItems) {
      if (mi.hasVariants && mi.variants.length > 0) {
        const hasItemLevel = existingKeys.has(mi.id);
        if (!hasItemLevel) {
          for (const v of mi.variants) {
            const k = `${mi.id}::${v.name}`;
            if (!existingKeys.has(k)) {
              candidates.push({ ruleKey: k, label: `${mi.name} (${v.name})` });
            }
          }
        }
      } else if (!existingKeys.has(mi.id)) {
        candidates.push({ ruleKey: mi.id, label: mi.name });
      }
    }
    return candidates;
  }, [menuItems, rules]);

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) => r.label.toLowerCase().includes(q));
  }, [rules, ruleSearch]);

  const filteredLogs = useMemo(() => {
    if (historyFilter === 'all') return logs;
    return logs.filter((l) => l.type === historyFilter);
  }, [logs, historyFilter]);

  // Open Bulk Count Sheet
  const openBulkCountModal = (mode: 'set' | 'add' = 'set') => {
    sound.playTap(soundEnabled);
    setBulkMode(mode);
    const initial: Record<string, string> = {};
    sortedItems.forEach((it) => {
      initial[it.id] = mode === 'set' ? String(it.currentCount) : '';
    });
    setBulkValues(initial);
    setBulkNote(mode === 'set' ? 'Updated prep count' : 'Added fresh batch');
    setIsBulkCountOpen(true);
  };

  const handleSaveBulkCount = (e: React.FormEvent) => {
    e.preventDefault();
    const todayKey = getTodayKey();
    const nowIso = new Date().toISOString();
    const nowTs = Date.now();
    const newLogs: ChickenLogEntry[] = [];

    const updatedItems = items.map((it) => {
      const raw = bulkValues[it.id];
      if (raw === undefined || raw.trim() === '') return it;
      const parsed = Math.max(0, Math.round(Number(raw)));
      if (Number.isNaN(parsed)) return it;

      const prevCount = it.currentCount;
      const nextCount = bulkMode === 'set' ? parsed : prevCount + parsed;

      if (bulkMode === 'add' && parsed === 0) return it;
      if (bulkMode === 'set' && nextCount === prevCount) {
        return { ...it, lastCountedDate: todayKey, updatedAt: nowIso };
      }

      newLogs.push({
        id: `chklog-bulk-${nowTs}-${it.id}`,
        chickenItemId: it.id,
        itemName: it.name,
        unit: it.unit,
        type: bulkMode === 'set' ? 'count_set' : 'in',
        quantity: bulkMode === 'set' ? nextCount : parsed,
        previousCount: prevCount,
        newCount: nextCount,
        note: bulkNote.trim() || (bulkMode === 'set' ? 'Count updated' : 'Batch added'),
        timestamp: nowTs,
      });

      return {
        ...it,
        currentCount: nextCount,
        lastCountedDate: todayKey,
        updatedAt: nowIso,
      };
    });

    storage.saveChickenItems(updatedItems);
    setItems(updatedItems);

    if (newLogs.length > 0) {
      const mergedLogs = [...newLogs, ...logs].slice(0, 800);
      storage.saveChickenLogs(mergedLogs);
      setLogs(mergedLogs);
    }

    sound.playCashSuccess(soundEnabled);
    setIsBulkCountOpen(false);
    showToast(bulkMode === 'set' ? 'All chicken counts updated!' : 'Chicken counts added!');
  };

  // Single Movement Modal
  const openMovementModal = (item: ChickenItem, mode: 'set' | 'in' | 'out') => {
    sound.playTap(soundEnabled);
    setMoveModal({ item, mode });
    setMoveQty(mode === 'set' ? String(item.currentCount) : '');
    setMoveNote(
      mode === 'set' ? 'Manual count update' : mode === 'in' ? 'Fresh prep added' : 'Wastage / Manual out'
    );
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveModal) return;
    const val = Math.round(Number(moveQty));
    if (Number.isNaN(val) || val < 0 || (moveModal.mode !== 'set' && val <= 0)) return;

    const { item, mode } = moveModal;
    const prevCount = item.currentCount;
    const nextCount =
      mode === 'set'
        ? val
        : mode === 'in'
        ? prevCount + val
        : Math.max(0, prevCount - val);

    const todayKey = getTodayKey();
    const nowIso = new Date().toISOString();

    const updatedItems = items.map((it) =>
      it.id === item.id
        ? {
            ...it,
            currentCount: nextCount,
            lastCountedDate: mode === 'out' ? it.lastCountedDate : todayKey,
            updatedAt: nowIso,
          }
        : it
    );

    storage.saveChickenItems(updatedItems);
    setItems(updatedItems);

    const logEntry: ChickenLogEntry = {
      id: `chklog-${Date.now()}-${item.id}`,
      chickenItemId: item.id,
      itemName: item.name,
      unit: item.unit,
      type: mode === 'set' ? 'count_set' : mode === 'in' ? 'in' : 'out',
      quantity: mode === 'set' ? nextCount : val,
      previousCount: prevCount,
      newCount: nextCount,
      note: moveNote.trim() || undefined,
      timestamp: Date.now(),
    };
    const updatedLogs = storage.addChickenLog(logEntry);
    setLogs(updatedLogs);

    sound.playCashSuccess(soundEnabled);
    setMoveModal(null);
    showToast(`${item.name}: ${nextCount} ${item.unit}`);
  };

  // Add / Edit Item
  const openAddItem = () => {
    sound.playTap(soundEnabled);
    setEditingItem(null);
    setFormName('');
    setFormUnit('pcs');
    setFormCount('0');
    setFormMin('10');
    setIsItemModalOpen(true);
  };

  const openEditItem = (item: ChickenItem) => {
    sound.playTap(soundEnabled);
    setEditingItem(item);
    setFormName(item.name);
    setFormUnit(item.unit);
    setFormCount(String(item.currentCount));
    setFormMin(String(item.minCount));
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) return;

    const countVal = Math.max(0, Math.round(Number(formCount) || 0));
    const minVal = Math.max(0, Math.round(Number(formMin) || 0));
    const todayKey = getTodayKey();
    const nowIso = new Date().toISOString();

    if (editingItem) {
      const updated = items.map((it) =>
        it.id === editingItem.id
          ? {
              ...it,
              name: cleanName,
              unit: formUnit,
              currentCount: countVal,
              minCount: minVal,
              updatedAt: nowIso,
            }
          : it
      );
      storage.saveChickenItems(updated);
      setItems(updated);

      if (countVal !== editingItem.currentCount) {
        const updatedLogs = storage.addChickenLog({
          id: `chklog-edit-${Date.now()}`,
          chickenItemId: editingItem.id,
          itemName: cleanName,
          unit: formUnit,
          type: 'adjust',
          quantity: countVal,
          previousCount: editingItem.currentCount,
          newCount: countVal,
          note: 'Edited item count',
          timestamp: Date.now(),
        });
        setLogs(updatedLogs);
      }
      showToast(`Updated ${cleanName}`);
    } else {
      const maxOrder = items.reduce((m, it) => Math.max(m, it.sortOrder || 0), 0);
      const newItem: ChickenItem = {
        id: `chk-${Date.now()}`,
        name: cleanName,
        unit: formUnit,
        currentCount: countVal,
        minCount: minVal,
        sortOrder: maxOrder + 1,
        lastCountedDate: todayKey,
        updatedAt: nowIso,
      };
      const updated = [...items, newItem];
      storage.saveChickenItems(updated);
      setItems(updated);

      if (countVal > 0) {
        const updatedLogs = storage.addChickenLog({
          id: `chklog-new-${Date.now()}`,
          chickenItemId: newItem.id,
          itemName: newItem.name,
          unit: newItem.unit,
          type: 'count_set',
          quantity: countVal,
          previousCount: 0,
          newCount: countVal,
          note: 'Initial count',
          timestamp: Date.now(),
        });
        setLogs(updatedLogs);
      }
      showToast(`Added ${cleanName}`);
    }

    sound.playCashSuccess(soundEnabled);
    setIsItemModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    const updated = items.filter((it) => it.id !== deletingItem.id);
    storage.saveChickenItems(updated);
    setItems(updated);
    sound.playCancel(soundEnabled);
    showToast(`Deleted ${deletingItem.name}`);
    setDeletingItem(null);
  };

  // Rule Editor
  const openRuleEditor = (rule: ChickenDeductionRule) => {
    sound.playTap(soundEnabled);
    setEditingRule(rule);
    setRuleDraftComponents(rule.components.map((c) => ({ ...c })));
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    const cleaned = ruleDraftComponents.filter((c) => c.chickenItemId && c.quantity > 0);
    const exists = rules.some((r) => r.ruleKey === editingRule.ruleKey);
    const updated = exists
      ? rules.map((r) =>
          r.ruleKey === editingRule.ruleKey ? { ...r, components: cleaned } : r
        )
      : [...rules, { ...editingRule, components: cleaned }];

    storage.saveChickenRules(updated);
    setRules(updated);
    sound.playCashSuccess(soundEnabled);
    setEditingRule(null);
    showToast(`Saved deduction rule for ${editingRule.label}`);
  };

  const handleResetRulesToDefault = () => {
    sound.playTap(soundEnabled);
    storage.saveChickenRules(SEED_CHICKEN_RULES);
    setRules(SEED_CHICKEN_RULES);
    showToast('Reset menu deduction rules to default');
  };

  // CSV Export
  const handleExportCSV = () => {
    sound.playTap(soundEnabled);
    const todayKey = getTodayKey();
    let csvContent = '';
    let filename = '';

    if (activeSubTab === 'counts' || activeSubTab === 'rules') {
      const headers = ['Order', 'Chicken Item', 'Current Count', 'Unit', 'Min Alert', 'Status', 'Last Counted'];
      const rows = sortedItems.map((it, idx) => {
        const status =
          it.currentCount <= 0
            ? 'OUT OF STOCK'
            : it.currentCount <= it.minCount
            ? 'LOW'
            : 'READY';
        return [
          idx + 1,
          `"${it.name.replace(/"/g, '""')}"`,
          it.currentCount,
          `"${it.unit}"`,
          it.minCount,
          `"${status}"`,
          `"${formatDateShort(it.lastCountedDate)}"`,
        ].join(',');
      });
      csvContent = [headers.join(','), ...rows].join('\n');
      filename = `bbq_boxx_chicken_inventory_${todayKey}.csv`;
    } else {
      const headers = ['Date & Time', 'Chicken Item', 'Type', 'Qty', 'Unit', 'Before', 'After', 'Bill ID', 'Note'];
      const rows = filteredLogs.map((l) =>
        [
          `"${formatDateTime(l.timestamp)}"`,
          `"${l.itemName.replace(/"/g, '""')}"`,
          `"${l.type.toUpperCase()}"`,
          l.quantity,
          `"${l.unit}"`,
          l.previousCount,
          l.newCount,
          `"${l.billId || ''}"`,
          `"${(l.note || '').replace(/"/g, '""')}"`,
        ].join(',')
      );
      csvContent = [headers.join(','), ...rows].join('\n');
      filename = `bbq_boxx_chicken_history_${todayKey}.csv`;
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
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-2 border-black p-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-black uppercase tracking-tight">
            CHICKEN INVENTORY
          </h2>
          <p className="text-xs text-black/70 mt-0.5">
            Update counted chicken cuts &amp; sticks. Each order auto-reduces pcs by menu rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openBulkCountModal('set')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white border border-red-600 hover:bg-red-700 text-xs font-bold uppercase transition-colors"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Update Counts</span>
          </button>

          <button
            type="button"
            onClick={openAddItem}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-black border border-black hover:bg-black hover:text-white text-xs font-bold uppercase transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Cut</span>
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
            setActiveSubTab('counts');
            setShowLowOnly(false);
          }}
          className="p-3 text-left hover:bg-black/5 transition-colors"
        >
          <div className="text-[10px] font-bold uppercase text-black/65">Chicken Cuts</div>
          <div className="text-xl sm:text-2xl font-bold text-black tabular-nums mt-0.5">
            {sortedItems.length}
          </div>
        </button>

        <div className="p-3 text-left">
          <div className="text-[10px] font-bold uppercase text-black/65">Total Pcs / Sticks</div>
          <div className="text-xl sm:text-2xl font-bold text-black tabular-nums mt-0.5">
            {totalPiecesReady}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playTap(soundEnabled);
            setActiveSubTab('counts');
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
            <span>Low / Out</span>
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
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 border border-black p-1 bg-white">
          <button
            type="button"
            onClick={() => {
              sound.playTap(soundEnabled);
              setActiveSubTab('counts');
            }}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase transition-colors ${
              activeSubTab === 'counts' ? 'bg-black text-white' : 'text-black hover:bg-black/5'
            }`}
          >
            Chicken Count ({sortedItems.length})
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap(soundEnabled);
              setActiveSubTab('rules');
            }}
            className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold uppercase transition-colors ${
              activeSubTab === 'rules' ? 'bg-black text-white' : 'text-black hover:bg-black/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Per-Order Rules</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap(soundEnabled);
              setActiveSubTab('history');
            }}
            className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold uppercase transition-colors ${
              activeSubTab === 'history' ? 'bg-black text-white' : 'text-black hover:bg-black/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({logs.length})</span>
          </button>
        </div>

        {activeSubTab === 'counts' && showLowOnly && (
          <button
            type="button"
            onClick={() => setShowLowOnly(false)}
            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold uppercase border border-red-600 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Show All</span>
          </button>
        )}
      </div>

      {/* ================= SUB-TAB 1: CHICKEN COUNT ================= */}
      {activeSubTab === 'counts' && (
        <div className="space-y-2.5">
          {displayedItems.length === 0 ? (
            <div className="bg-white border border-black p-10 text-center">
              <p className="text-sm font-bold uppercase text-black">
                {showLowOnly ? 'All chicken cuts are stocked!' : 'No chicken items listed'}
              </p>
              {showLowOnly && (
                <button
                  type="button"
                  onClick={() => setShowLowOnly(false)}
                  className="mt-3 px-4 py-1.5 bg-black text-white text-xs font-bold uppercase"
                >
                  View All Chicken Items
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedItems.map((item, idx) => {
                const isOut = item.currentCount <= 0;
                const isLow = item.currentCount > 0 && item.currentCount <= item.minCount;
                return (
                  <div
                    key={item.id}
                    className={`bg-white border-2 p-4 flex flex-col justify-between gap-3 ${
                      isOut || isLow ? 'border-red-600' : 'border-black'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-black text-white text-[10px] font-bold">
                            #{idx + 1}
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-black uppercase tracking-tight">
                            {item.name}
                          </h3>
                          {isOut ? (
                            <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold uppercase">
                              OUT
                            </span>
                          ) : isLow ? (
                            <span className="px-1.5 py-0.5 border border-red-600 text-red-600 text-[10px] font-bold uppercase">
                              LOW
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-black/65 mt-1">
                          Unit: <strong className="uppercase">{item.unit}</strong> &bull; Min Alert:{' '}
                          <strong>
                            {item.minCount} {item.unit}
                          </strong>{' '}
                          &bull; Counted: <strong>{formatDateShort(item.lastCountedDate)}</strong>
                          {item.unit === 'stick' && (
                            <span className="ml-1.5 text-red-600 font-bold">
                              ({item.currentCount * 4} pcs @ 4 pcs/stick)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${
                            isOut || isLow ? 'text-red-600' : 'text-black'
                          }`}
                        >
                          {item.currentCount}
                        </div>
                        <div className="text-[11px] font-bold uppercase text-black/70 mt-1">
                          {item.unit}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-black/15 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openMovementModal(item, 'set')}
                          className="px-2.5 py-1.5 bg-black text-white hover:bg-black/85 text-xs font-bold uppercase border border-black"
                        >
                          Set Count
                        </button>
                        <button
                          type="button"
                          onClick={() => openMovementModal(item, 'in')}
                          className="px-2.5 py-1.5 bg-white text-black hover:bg-black hover:text-white text-xs font-bold uppercase border border-black flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openMovementModal(item, 'out')}
                          className="px-2.5 py-1.5 bg-white text-red-600 hover:bg-red-600 hover:text-white text-xs font-bold uppercase border border-red-600 flex items-center gap-1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          <span>Out</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditItem(item)}
                          title="Edit cut settings"
                          className="p-1.5 border border-black text-black hover:bg-black hover:text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          title="Delete item"
                          className="p-1.5 border border-black text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= SUB-TAB 2: PER-ORDER DEDUCTION RULES ================= */}
      {activeSubTab === 'rules' && (
        <div className="space-y-3">
          <div className="bg-white border border-black p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs sm:text-sm font-bold uppercase text-black">
                Pieces Reduced Per Order Item
              </h3>
              <p className="text-[11px] text-black/70 mt-0.5">
                Every completed order automatically reduces these pcs / sticks from Chicken Inventory.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                placeholder="Search dish..."
                className="bg-white border border-black px-2.5 py-1.5 text-xs text-black w-40 sm:w-48 focus:outline-none focus:border-red-600"
              />
              <button
                type="button"
                onClick={handleResetRulesToDefault}
                className="px-2.5 py-1.5 bg-white border border-black text-xs font-bold uppercase hover:bg-black hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-black divide-y divide-black/15">
            {filteredRules.map((rule) => (
              <div
                key={rule.ruleKey}
                className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs sm:text-sm font-bold text-black">{rule.label}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {rule.components.length === 0 ? (
                      <span className="text-[11px] text-black/50 italic">No chicken pieces mapped</span>
                    ) : (
                      rule.components.map((comp, i) => {
                        const ci = itemMap.get(comp.chickenItemId);
                        return (
                          <span
                            key={`${rule.ruleKey}-${i}`}
                            className="px-2 py-0.5 border border-black text-[11px] font-bold bg-white text-black"
                          >
                            {comp.quantity} {ci?.unit || 'pcs'} {ci?.name || comp.chickenItemId}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openRuleEditor(rule)}
                  className="self-start sm:self-center px-3 py-1.5 border border-black bg-white text-black hover:bg-black hover:text-white text-xs font-bold uppercase flex items-center gap-1 shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Pcs</span>
                </button>
              </div>
            ))}

            {unmappedMenuOptions.length > 0 && !ruleSearch.trim() && (
              <div className="p-3 sm:px-4 bg-black/[0.03]">
                <div className="text-[11px] font-bold uppercase text-black/70 mb-2">
                  Unmapped Menu Items (Seafood / Other / Custom)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {unmappedMenuOptions.map((opt) => (
                    <button
                      key={opt.ruleKey}
                      type="button"
                      onClick={() =>
                        openRuleEditor({
                          ruleKey: opt.ruleKey,
                          label: opt.label,
                          components: [],
                        })
                      }
                      className="px-2.5 py-1 border border-black/40 bg-white hover:border-black text-[11px] font-bold text-black flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-red-600" />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 3: HISTORY ================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all' as const, label: 'All' },
              { id: 'sale' as const, label: 'Order Sales' },
              { id: 'count_set' as const, label: 'Count Updates' },
              { id: 'in' as const, label: 'Added' },
              { id: 'out' as const, label: 'Manual Out' },
              { id: 'void_return' as const, label: 'Void Returns' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setHistoryFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-bold uppercase border ${
                  historyFilter === f.id
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-black border-black hover:bg-black/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredLogs.length === 0 ? (
            <div className="bg-white border border-black p-10 text-center text-xs font-bold uppercase text-black/60">
              No chicken inventory movements recorded yet.
            </div>
          ) : (
            <div className="bg-white border border-black divide-y divide-black/15">
              {filteredLogs.map((log) => {
                const isReduction = log.type === 'sale' || log.type === 'out';
                return (
                  <div
                    key={log.id}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            isReduction
                              ? 'bg-red-600 text-white'
                              : log.type === 'void_return'
                              ? 'bg-black text-white'
                              : 'border border-black text-black'
                          }`}
                        >
                          {log.type === 'count_set'
                            ? 'COUNT SET'
                            : log.type === 'void_return'
                            ? 'VOID RETURN'
                            : log.type.toUpperCase()}
                        </span>
                        <span className="font-bold text-black uppercase">{log.itemName}</span>
                        <span className="text-black/60">{formatDateTime(log.timestamp)}</span>
                      </div>
                      {log.note && <div className="text-black/75 mt-0.5">{log.note}</div>}
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-bold tabular-nums text-sm ${
                          isReduction ? 'text-red-600' : 'text-black'
                        }`}
                      >
                        {log.type === 'count_set'
                          ? `= ${log.newCount} ${log.unit}`
                          : `${isReduction ? '-' : '+'}${log.quantity} ${log.unit}`}
                      </div>
                      <div className="text-[11px] text-black/60 tabular-nums">
                        {log.previousCount} &rarr; {log.newCount} {log.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= BULK UPDATE COUNTS MODAL ================= */}
      {isBulkCountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-md bg-white border-2 border-black shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-black flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase text-black">
                Update Chicken Counts
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkCountOpen(false)}
                className="w-7 h-7 border border-black flex items-center justify-center text-black hover:bg-black hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBulkCount} className="flex-1 flex flex-col min-h-0">
              <div className="p-4 overflow-y-auto touch-scroll space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkMode('set');
                      const vals: Record<string, string> = {};
                      sortedItems.forEach((it) => {
                        vals[it.id] = String(it.currentCount);
                      });
                      setBulkValues(vals);
                    }}
                    className={`py-2 text-xs font-bold uppercase border ${
                      bulkMode === 'set'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-black border-black'
                    }`}
                  >
                    Set Exact Count (=)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkMode('add');
                      const vals: Record<string, string> = {};
                      sortedItems.forEach((it) => {
                        vals[it.id] = '';
                      });
                      setBulkValues(vals);
                    }}
                    className={`py-2 text-xs font-bold uppercase border ${
                      bulkMode === 'add'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-black border-black'
                    }`}
                  >
                    Add Batch (+)
                  </button>
                </div>

                <div className="space-y-2 border border-black p-3 bg-white">
                  {sortedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-1 border-b border-black/10 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase text-black">
                          {idx + 1}. {item.name}
                        </div>
                        <div className="text-[11px] text-black/60">
                          Current: {item.currentCount} {item.unit}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={bulkValues[item.id] ?? ''}
                          onChange={(e) =>
                            setBulkValues((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          placeholder={bulkMode === 'set' ? '0' : '+0'}
                          className="w-24 bg-white border border-black px-2.5 py-1.5 text-sm font-bold text-right text-black focus:outline-none focus:border-red-600 tabular-nums"
                        />
                        <span className="text-xs font-bold uppercase text-black/70 w-10">
                          {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                    Count Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={bulkNote}
                    onChange={(e) => setBulkNote(e.target.value)}
                    placeholder="e.g. Evening prep tray count"
                    className="w-full bg-white border border-black px-3 py-2 text-xs text-black focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="p-3 border-t border-black flex items-center justify-end gap-2 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBulkCountOpen(false)}
                  className="px-4 py-2 border border-black bg-white text-black text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-red-600 bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase"
                >
                  Save All Counts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SINGLE MOVEMENT MODAL ================= */}
      {moveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-sm bg-white border-2 border-black p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <h3 className="text-sm font-bold uppercase text-black">
                {moveModal.mode === 'set'
                  ? `Set Count: ${moveModal.item.name}`
                  : moveModal.mode === 'in'
                  ? `Add ${moveModal.item.name}`
                  : `Reduce ${moveModal.item.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setMoveModal(null)}
                className="p-1 border border-black hover:bg-black hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-3">
              <div className="text-xs text-black/75">
                Current count:{' '}
                <strong className="text-black">
                  {moveModal.item.currentCount} {moveModal.item.unit}
                </strong>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                  {moveModal.mode === 'set'
                    ? `New Total (${moveModal.item.unit})`
                    : `Quantity (${moveModal.item.unit})`}
                </label>
                <input
                  type="number"
                  min={moveModal.mode === 'set' ? '0' : '1'}
                  step="1"
                  required
                  autoFocus
                  value={moveQty}
                  onChange={(e) => setMoveQty(e.target.value)}
                  className="w-full bg-white border border-black px-3 py-2 text-base font-bold text-black focus:outline-none focus:border-red-600 tabular-nums"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={moveNote}
                  onChange={(e) => setMoveNote(e.target.value)}
                  className="w-full bg-white border border-black px-3 py-2 text-xs text-black focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMoveModal(null)}
                  className="px-4 py-2 border border-black bg-white text-black text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-red-600 bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT CHICKEN CUT MODAL ================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-sm bg-white border-2 border-black p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <h3 className="text-sm font-bold uppercase text-black">
                {editingItem ? `Edit ${editingItem.name}` : 'Add Chicken Cut'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 border border-black hover:bg-black hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase block mb-1 text-black">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Wings, Chest, Boneless Stick"
                  className="w-full bg-white border border-black px-3 py-2 text-black focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold uppercase block mb-1 text-black">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as ChickenUnit)}
                    className="w-full bg-white border border-black px-2.5 py-2 text-black uppercase focus:outline-none focus:border-red-600"
                  >
                    <option value="pcs">pcs</option>
                    <option value="stick">stick</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase block mb-1 text-black">Low Alert Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={formMin}
                    onChange={(e) => setFormMin(e.target.value)}
                    className="w-full bg-white border border-black px-2.5 py-2 text-black font-bold focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase block mb-1 text-black">
                  Current Count ({formUnit})
                </label>
                <input
                  type="number"
                  min="0"
                  value={formCount}
                  onChange={(e) => setFormCount(e.target.value)}
                  className="w-full bg-white border border-black px-3 py-2 text-black font-bold focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 border border-black bg-white text-black font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-red-600 bg-red-600 text-white font-bold uppercase hover:bg-red-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT RULE MODAL ================= */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-sm bg-white border-2 border-black p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold uppercase text-black truncate">
                  {editingRule.label}
                </h3>
                <p className="text-[11px] text-black/65">Set pcs/sticks deducted per 1 ordered</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="p-1 border border-black hover:bg-black hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-2.5 text-xs">
              {sortedItems.map((ci) => {
                const existing = ruleDraftComponents.find((c) => c.chickenItemId === ci.id);
                const qty = existing ? existing.quantity : 0;
                return (
                  <div
                    key={ci.id}
                    className="flex items-center justify-between gap-2 py-1 border-b border-black/10"
                  >
                    <span className="font-bold uppercase text-black">
                      {ci.name} ({ci.unit})
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(0, qty - 1);
                          setRuleDraftComponents((prev) => {
                            const others = prev.filter((c) => c.chickenItemId !== ci.id);
                            return next > 0 ? [...others, { chickenItemId: ci.id, quantity: next }] : others;
                          });
                        }}
                        className="w-7 h-7 border border-black flex items-center justify-center hover:bg-black/5"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) => {
                          const next = Math.max(0, Math.round(Number(e.target.value) || 0));
                          setRuleDraftComponents((prev) => {
                            const others = prev.filter((c) => c.chickenItemId !== ci.id);
                            return next > 0 ? [...others, { chickenItemId: ci.id, quantity: next }] : others;
                          });
                        }}
                        className="w-14 border border-black px-1.5 py-1 text-center font-bold tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = qty + 1;
                          setRuleDraftComponents((prev) => {
                            const others = prev.filter((c) => c.chickenItemId !== ci.id);
                            return [...others, { chickenItemId: ci.id, quantity: next }];
                          });
                        }}
                        className="w-7 h-7 border border-red-600 bg-red-600 text-white flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 border border-black bg-white text-black font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-red-600 bg-red-600 text-white font-bold uppercase hover:bg-red-700"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION ================= */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-sm bg-white border-2 border-black p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase text-red-600">
              Delete {deletingItem.name}?
            </h3>
            <p className="text-xs text-black/80">
              This will remove {deletingItem.name} from Chicken Inventory.
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
