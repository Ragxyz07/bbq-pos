import React, { useState } from 'react';
import { Category, MenuItem, ItemVariant, FlavourAddon, ComboComponent } from '../../types';
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  X,
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { storage } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { DEFAULT_FLAVOURS } from '../../data/seedMenu';

interface MenuManagerProps {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  items: MenuItem[];
  setItems: (items: MenuItem[]) => void;
  soundEnabled?: boolean;
}

export const MenuManager: React.FC<MenuManagerProps> = ({
  categories,
  setCategories,
  items,
  setItems,
  soundEnabled = true,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<
    'items' | 'categories' | 'flavours' | 'bulk' | 'data'
  >('items');

  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCreatingNewItem, setIsCreatingNewItem] = useState<boolean>(false);

  // Category Modal State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [catNameInput, setCatNameInput] = useState<string>('');
  const [catIconInput, setCatIconInput] = useState<string>('🍗');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [moveTargetCatId, setMoveTargetCatId] = useState<string>('');

  // Bulk Price Update State
  const [bulkCategory, setBulkCategory] = useState<string>('all');
  const [bulkType, setBulkType] = useState<'flat' | 'percent'>('flat');
  const [bulkAmount, setBulkAmount] = useState<number>(10);
  const [bulkDirection, setBulkDirection] = useState<'increase' | 'decrease'>('increase');

  // Global Flavours State
  const [flavourList, setFlavourList] = useState<FlavourAddon[]>(DEFAULT_FLAVOURS);
  const [newFlavourName, setNewFlavourName] = useState<string>('');
  const [newFlavourSurcharge, setNewFlavourSurcharge] = useState<number>(10);

  // ================= CATEGORY ACTIONS =================
  const handleSaveCategory = () => {
    if (!catNameInput.trim()) return;
    sound.playTap(soundEnabled);

    if (isCreatingCategory) {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: catNameInput.trim(),
        icon: catIconInput.trim() || '🍗',
        sortOrder: categories.length + 1,
      };
      const updated = [...categories, newCat];
      setCategories(updated);
      storage.saveCategories(updated);
    } else if (editingCategory) {
      const updated = categories.map((c) =>
        c.id === editingCategory.id
          ? { ...c, name: catNameInput.trim(), icon: catIconInput.trim() || '🍗' }
          : c
      );
      setCategories(updated);
      storage.saveCategories(updated);
    }
    setEditingCategory(null);
    setIsCreatingCategory(false);
    setCatNameInput('');
  };

  const handleMoveCategory = (catId: string, direction: 'up' | 'down') => {
    sound.playTap(soundEnabled);
    const index = categories.findIndex((c) => c.id === catId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    const updated = reordered.map((cat, idx) => ({ ...cat, sortOrder: idx + 1 }));
    setCategories(updated);
    storage.saveCategories(updated);
  };

  const handleConfirmDeleteCategory = (action: 'move' | 'delete') => {
    if (!deletingCategory) return;
    sound.playCancel(soundEnabled);

    let updatedItems = [...items];
    if (action === 'move') {
      const target = moveTargetCatId || categories.find((c) => c.id !== deletingCategory.id)?.id;
      if (target) {
        updatedItems = updatedItems.map((it) =>
          it.categoryId === deletingCategory.id ? { ...it, categoryId: target } : it
        );
      }
    } else {
      updatedItems = updatedItems.filter((it) => it.categoryId !== deletingCategory.id);
    }

    const updatedCats = categories.filter((c) => c.id !== deletingCategory.id);
    setCategories(updatedCats);
    setItems(updatedItems);
    storage.saveCategories(updatedCats);
    storage.saveMenuItems(updatedItems);
    setDeletingCategory(null);
  };

  // ================= ITEM ACTIONS =================
  const handleToggleStock = (itemId: string) => {
    sound.playTap(soundEnabled);
    const updated = items.map((it) =>
      it.id === itemId ? { ...it, isOutOfStock: !it.isOutOfStock } : it
    );
    setItems(updated);
    storage.saveMenuItems(updated);
  };

  const handleToggleHide = (itemId: string) => {
    sound.playTap(soundEnabled);
    const updated = items.map((it) =>
      it.id === itemId ? { ...it, isHidden: !it.isHidden } : it
    );
    setItems(updated);
    storage.saveMenuItems(updated);
  };

  const handleDuplicateItem = (item: MenuItem) => {
    sound.playTap(soundEnabled);
    const cloned: MenuItem = {
      ...item,
      id: `item-${Date.now()}`,
      name: `${item.name} (Copy)`,
      sortOrder: item.sortOrder + 1,
    };
    const updated = [cloned, ...items];
    setItems(updated);
    storage.saveMenuItems(updated);
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      sound.playCancel(soundEnabled);
      const updated = items.filter((it) => it.id !== itemId);
      setItems(updated);
      storage.saveMenuItems(updated);
    }
  };

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    sound.playTap(soundEnabled);
    const index = items.findIndex((it) => it.id === itemId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    const updated = reordered.map((it, idx) => ({ ...it, sortOrder: idx + 1 }));
    setItems(updated);
    storage.saveMenuItems(updated);
  };

  // ================= BULK PRICE ADJUSTMENT =================
  const handleApplyBulkPrice = () => {
    sound.playCashSuccess(soundEnabled);
    const updated = items.map((item) => {
      if (bulkCategory !== 'all' && item.categoryId !== bulkCategory) {
        return item;
      }

      const adjust = (oldPrice: number) => {
        let diff = bulkAmount;
        if (bulkType === 'percent') {
          diff = Math.round((oldPrice * bulkAmount) / 100);
        }
        const newPrice = bulkDirection === 'increase' ? oldPrice + diff : oldPrice - diff;
        return Math.max(0, newPrice);
      };

      const newBasePrice = adjust(item.basePrice);
      const newVariants = item.hasVariants
        ? item.variants.map((v) => ({ ...v, price: adjust(v.price) }))
        : item.variants;

      return {
        ...item,
        basePrice: newBasePrice,
        variants: newVariants,
      };
    });

    setItems(updated);
    storage.saveMenuItems(updated);
    alert('Bulk prices updated successfully!');
  };

  // ================= IMPORT / EXPORT =================
  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Are you sure you want to reset the menu to default? Any custom items will be replaced with starting menu.'
      )
    ) {
      sound.playCancel(soundEnabled);
      const res = storage.resetMenuToDefault();
      setCategories(res.categories);
      setItems(res.items);
      alert('Menu reset to default successfully!');
    }
  };

  const handleExportJson = () => {
    sound.playTap(soundEnabled);
    const data = JSON.stringify({ categories, items }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `The_BBQ_Boxx_Menu_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    sound.playTap(soundEnabled);
    const csv = storage.exportMenuCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `The_BBQ_Boxx_Menu_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.categories) && Array.isArray(parsed.items)) {
          setCategories(parsed.categories);
          setItems(parsed.items);
          storage.saveCategories(parsed.categories);
          storage.saveMenuItems(parsed.items);
          alert('Menu imported successfully!');
        } else {
          alert('Invalid menu JSON file structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const filteredItems = items.filter((it) => {
    if (selectedCatFilter === 'all') return true;
    return it.categoryId === selectedCatFilter;
  });

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 pb-28 space-y-4 select-none font-serif text-black bg-white">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-black p-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-black">
              MENU MANAGEMENT
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 border border-black text-black uppercase">
              [OWNER MODE]
            </span>
          </div>
          <p className="text-xs text-black/70 mt-1">
            Add items, configure sizes/flavours (+₹10), reorder, bulk adjust prices, or edit categories.
          </p>
        </div>

        {/* Action Button */}
        {activeAdminTab === 'items' && (
          <button
            type="button"
            onClick={() => {
              setIsCreatingNewItem(true);
              setEditingItem(null);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 text-xs font-bold border border-red-600 transition-colors min-h-[44px] shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Item</span>
          </button>
        )}
      </div>

      {/* Admin Subtabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-white border border-black text-xs">
        {[
          { id: 'items' as const, label: 'Menu Items', count: items.length },
          { id: 'categories' as const, label: 'Categories', count: categories.length },
          { id: 'bulk' as const, label: 'Bulk Price Update' },
          { id: 'flavours' as const, label: 'Flavours & Addons' },
          { id: 'data' as const, label: 'Import / Export' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveAdminTab(tab.id)}
            className={`px-3 py-2 font-bold uppercase transition-colors whitespace-nowrap flex items-center gap-1.5 min-h-[40px] ${
              activeAdminTab === tab.id
                ? 'bg-red-600 text-white'
                : 'bg-white text-black hover:bg-black/5'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 border ${activeAdminTab === tab.id ? 'border-white bg-white text-red-600' : 'border-black text-black'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: MENU ITEMS */}
      {activeAdminTab === 'items' && (
        <div className="space-y-4">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedCatFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors whitespace-nowrap border min-h-[38px] ${
                selectedCatFilter === 'all'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-black border-black hover:bg-black/5'
              }`}
            >
              All ({items.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCatFilter(c.id)}
                className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors whitespace-nowrap flex items-center gap-1 border min-h-[38px] ${
                  selectedCatFilter === c.id
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-black border-black hover:bg-black/5'
                }`}
              >
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          {/* Items List */}
          <div className="space-y-2.5">
            {filteredItems.map((item, idx) => {
              const category = categories.find((c) => c.id === item.categoryId);
              return (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 bg-white border transition-colors ${
                    item.isOutOfStock
                      ? 'border-dashed border-black/50 opacity-75'
                      : item.isHidden
                      ? 'border-black/40 opacity-60'
                      : 'border-black'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-black">
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-black text-black">
                            {item.badge}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-black/70 uppercase">
                          [{category?.name || 'Uncategorized'}]
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-black/70 mt-1 line-clamp-1">
                          {item.description}
                        </p>
                      )}

                      {/* Variants & Pricing summary */}
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-bold text-black">
                          Base: {formatCurrency(item.basePrice)}
                        </span>
                        {item.hasVariants && (
                          <span className="text-[11px] text-black/80">
                            • {item.variants.length} Sizes (
                            {item.variants.map((v) => `${v.name}:${formatCurrency(v.price)}`).join(', ')}
                            )
                          </span>
                        )}
                        {item.hasFlavours && (
                          <span className="text-[11px] underline text-black">• Flavours (+₹10)</span>
                        )}
                        {item.isCombo && (
                          <span className="text-[11px] font-bold text-black">
                            • {item.categoryId === 'cat-meal-box' ? 'Meal Box' : 'Combo Box'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Toggles and Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap pt-2 sm:pt-0 border-t sm:border-t-0 border-black/20">
                      {/* Out of Stock Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleStock(item.id)}
                        className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors border min-h-[38px] ${
                          item.isOutOfStock
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-black border-black hover:bg-black/5'
                        }`}
                      >
                        {item.isOutOfStock ? 'Sold Out' : 'In Stock'}
                      </button>

                      {/* Hide toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleHide(item.id)}
                        title={item.isHidden ? 'Show in POS' : 'Hide from POS'}
                        className="w-9 h-9 bg-white hover:bg-black hover:text-white text-black border border-black flex items-center justify-center min-h-[38px] min-w-[38px] transition-colors"
                      >
                        {item.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>

                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        onClick={() => handleMoveItem(item.id, 'up')}
                        disabled={idx === 0}
                        className="w-9 h-9 bg-white hover:bg-black hover:text-white disabled:opacity-30 text-black border border-black flex items-center justify-center min-h-[38px] min-w-[38px] transition-colors"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveItem(item.id, 'down')}
                        disabled={idx === filteredItems.length - 1}
                        className="w-9 h-9 bg-white hover:bg-black hover:text-white disabled:opacity-30 text-black border border-black flex items-center justify-center min-h-[38px] min-w-[38px] transition-colors"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(item)}
                        title="Duplicate item"
                        className="w-9 h-9 bg-white hover:bg-black hover:text-white text-black border border-black flex items-center justify-center min-h-[38px] min-w-[38px] transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Edit (RED) */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsCreatingNewItem(false);
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 border border-red-600 text-xs font-bold flex items-center gap-1 min-h-[38px] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-9 h-9 bg-white hover:bg-red-600 hover:text-white hover:border-red-600 text-red-600 border border-black flex items-center justify-center min-h-[38px] min-w-[38px] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeAdminTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-black/70">
              Change category display order in POS tabs.
            </span>
            <button
              type="button"
              onClick={() => {
                setIsCreatingCategory(true);
                setEditingCategory(null);
                setCatNameInput('');
                setCatIconInput('🍗');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white hover:bg-red-700 border border-red-600 text-xs font-bold transition-colors min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((cat, idx) => {
              const count = items.filter((it) => it.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="p-3.5 bg-white border border-black flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="text-sm font-bold uppercase text-black">{cat.name}</h4>
                      <span className="text-xs text-black/70">
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Reorder Arrows */}
                    <button
                      type="button"
                      onClick={() => handleMoveCategory(cat.id, 'up')}
                      disabled={idx === 0}
                      className="w-8 h-8 bg-white hover:bg-black hover:text-white border border-black disabled:opacity-30 text-black flex items-center justify-center transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveCategory(cat.id, 'down')}
                      disabled={idx === categories.length - 1}
                      className="w-8 h-8 bg-white hover:bg-black hover:text-white border border-black disabled:opacity-30 text-black flex items-center justify-center transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setIsCreatingCategory(false);
                        setCatNameInput(cat.name);
                        setCatIconInput(cat.icon || '🍗');
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-black hover:text-white border border-black text-black text-xs font-bold transition-colors"
                    >
                      Rename
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setDeletingCategory(cat)}
                      className="w-8 h-8 bg-white hover:bg-red-600 hover:text-white hover:border-red-600 border border-black text-red-600 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BULK PRICE UPDATE */}
      {activeAdminTab === 'bulk' && (
        <div className="p-4 sm:p-5 bg-white border border-black space-y-4 max-w-xl">
          <div>
            <h3 className="text-base font-bold uppercase text-black">Bulk Price Adjustment</h3>
            <p className="text-xs text-black/70 mt-1">
              Adjust prices across all items or a category by flat ₹ amount or percentage %.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            {/* Target Category */}
            <div>
              <label className="font-bold block mb-1 uppercase">Target Category</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full bg-white border border-black px-3 py-2 text-black focus:outline-none"
              >
                <option value="all">Entire Menu (All Categories)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Direction & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1 uppercase">Action</label>
                <div className="grid grid-cols-2 gap-1 p-0.5 border border-black bg-white">
                  <button
                    type="button"
                    onClick={() => setBulkDirection('increase')}
                    className={`py-1.5 font-bold uppercase ${
                      bulkDirection === 'increase'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    Increase (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDirection('decrease')}
                    className={`py-1.5 font-bold uppercase ${
                      bulkDirection === 'decrease'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    Decrease (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1 uppercase">Type</label>
                <div className="grid grid-cols-2 gap-1 p-0.5 border border-black bg-white">
                  <button
                    type="button"
                    onClick={() => setBulkType('flat')}
                    className={`py-1.5 font-bold uppercase ${
                      bulkType === 'flat'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    Flat ₹
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkType('percent')}
                    className={`py-1.5 font-bold uppercase ${
                      bulkType === 'percent'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>
            </div>

            {/* Input Value */}
            <div>
              <label className="font-bold block mb-1 uppercase">
                {bulkType === 'flat' ? 'Amount (₹)' : 'Percentage (%)'}
              </label>
              <input
                type="number"
                min="1"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(Number(e.target.value) || 0)}
                className="w-full bg-white border border-black px-3 py-2 text-black text-sm"
              />
            </div>

            {/* Apply Button */}
            <button
              type="button"
              onClick={handleApplyBulkPrice}
              className="w-full py-3 bg-red-600 text-white hover:bg-red-700 border border-red-600 font-bold text-sm transition-colors mt-2 uppercase min-h-[44px]"
            >
              Apply Bulk Price Update
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: FLAVOURS & ADDONS */}
      {activeAdminTab === 'flavours' && (
        <div className="p-4 sm:p-5 bg-white border border-black space-y-4 max-w-xl">
          <div>
            <h3 className="text-base font-bold uppercase text-black">Signature Flavours &amp; Surcharges</h3>
            <p className="text-xs text-black/70 mt-1">
              Flavours for BBQ Chicken &amp; specials with automatic surcharge calculation (+₹10 default).
            </p>
          </div>

          <div className="space-y-2">
            {flavourList.map((flv, idx) => (
              <div
                key={flv.id}
                className="p-3 border border-black bg-white flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-black">{flv.name}</div>
                  <div className="text-black/70 text-[11px]">
                    Surcharge: +{formatCurrency(flv.surcharge)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = flavourList.filter((f) => f.id !== flv.id);
                        setFlavourList(updated);
                      }}
                      className="text-red-600 hover:underline p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add New Flavour */}
          <div className="p-3 border border-black space-y-2 text-xs bg-white">
            <span className="font-bold uppercase block text-black">Add New Flavour</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Flavour name (e.g. Smoky Hickory)"
                value={newFlavourName}
                onChange={(e) => setNewFlavourName(e.target.value)}
                className="bg-white border border-black px-2.5 py-1.5 text-black text-xs"
              />
              <div className="flex items-center gap-1">
                <span className="text-black/70">₹</span>
                <input
                  type="number"
                  placeholder="Surcharge"
                  value={newFlavourSurcharge}
                  onChange={(e) => setNewFlavourSurcharge(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-black px-2.5 py-1.5 text-black text-xs"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newFlavourName.trim()) return;
                const newFlv: FlavourAddon = {
                  id: `flv-${Date.now()}`,
                  name: newFlavourName.trim(),
                  surcharge: newFlavourSurcharge,
                };
                setFlavourList([...flavourList, newFlv]);
                setNewFlavourName('');
                setNewFlavourSurcharge(10);
              }}
              className="w-full py-2.5 bg-red-600 text-white hover:bg-red-700 border border-red-600 font-bold text-xs uppercase transition-colors"
            >
              + Add Flavour
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: IMPORT / EXPORT & RESET */}
      {activeAdminTab === 'data' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-white border border-black space-y-3">
            <h3 className="text-base font-bold uppercase text-black">Export Menu</h3>
            <p className="text-xs text-black/70">
              Download your full menu configuration to keep safe backups or open in Excel.
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="w-full py-2.5 bg-white hover:bg-black hover:text-white border border-black text-black text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase min-h-[42px]"
              >
                <Download className="w-4 h-4" />
                <span>Download Menu (JSON)</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="w-full py-2.5 bg-white hover:bg-black hover:text-white border border-black text-black text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase min-h-[42px]"
              >
                <Download className="w-4 h-4" />
                <span>Download Menu (CSV Spreadsheet)</span>
              </button>
            </div>
          </div>

          <div className="p-5 bg-white border border-black space-y-3">
            <h3 className="text-base font-bold uppercase text-black">Import / Restore</h3>
            <p className="text-xs text-black/70">
              Load an existing menu file or reset to the pre-loaded starting menu.
            </p>
            <div className="space-y-2 pt-2">
              <label className="w-full py-2.5 bg-red-600 hover:bg-red-700 border border-red-600 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors uppercase min-h-[42px]">
                <Upload className="w-4 h-4" />
                <span>Upload Menu (JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="w-full py-2.5 bg-white hover:bg-black hover:text-white border border-black text-black text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase min-h-[42px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Menu to Default Starting Items</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM EDITOR MODAL (Add / Edit Item) */}
      {(isCreatingNewItem || editingItem) && (
        <ItemEditorModal
          isOpen={true}
          item={editingItem}
          categories={categories}
          flavourList={flavourList}
          onClose={() => {
            setEditingItem(null);
            setIsCreatingNewItem(false);
          }}
          onSave={(savedItem) => {
            sound.playTap(soundEnabled);
            if (editingItem) {
              const updated = items.map((it) => (it.id === savedItem.id ? savedItem : it));
              setItems(updated);
              storage.saveMenuItems(updated);
            } else {
              const updated = [savedItem, ...items];
              setItems(updated);
              storage.saveMenuItems(updated);
            }
            setEditingItem(null);
            setIsCreatingNewItem(false);
          }}
        />
      )}

      {/* CATEGORY ADD/EDIT MODAL */}
      {(isCreatingCategory || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-sm bg-white text-black border-2 border-black p-4 space-y-3 max-h-[82dvh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <h3 className="text-base font-bold uppercase text-black">
                {isCreatingCategory ? 'Add Category' : 'Rename Category'}
              </h3>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setIsCreatingCategory(false);
                }}
                className="text-black hover:opacity-70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1 uppercase">Category Name</label>
                <input
                  type="text"
                  value={catNameInput}
                  onChange={(e) => setCatNameInput(e.target.value)}
                  placeholder="e.g. Seafood Specials, Meal Box"
                  className="w-full bg-white border border-black px-3 py-2 text-black"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 uppercase">Category Code / Tag</label>
                <input
                  type="text"
                  value={catIconInput}
                  onChange={(e) => setCatIconInput(e.target.value)}
                  placeholder="TAG"
                  maxLength={5}
                  className="w-24 bg-white border border-black p-2 text-center text-black"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setIsCreatingCategory(false);
                }}
                className="flex-1 py-2.5 bg-white hover:bg-black/5 border border-black text-black text-xs font-bold transition-colors uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                className="flex-1 py-2.5 bg-red-600 text-white hover:bg-red-700 border border-red-600 text-xs font-bold transition-colors uppercase"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY DELETE MODAL */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-sm bg-white text-black border-2 border-black p-4 space-y-3 max-h-[82dvh] overflow-y-auto shadow-2xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
              <h3 className="text-base font-bold uppercase text-black">Delete "{deletingCategory.name}"?</h3>
            </div>

            <p className="text-xs text-black/80 leading-relaxed">
              This category contains items. What would you like to do with them?
            </p>

            <div className="space-y-2 text-xs">
              <label className="text-black/70 block font-bold uppercase">
                Move items to another category:
              </label>
              <select
                value={moveTargetCatId}
                onChange={(e) => setMoveTargetCatId(e.target.value)}
                className="w-full bg-white border border-black px-3 py-2 text-black"
              >
                {categories
                  .filter((c) => c.id !== deletingCategory.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmDeleteCategory('move')}
                className="w-full py-2.5 bg-red-600 text-white hover:bg-red-700 border border-red-600 text-xs font-bold transition-colors uppercase"
              >
                Move Items &amp; Delete Category
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteCategory('delete')}
                className="w-full py-2 bg-white hover:bg-black hover:text-white text-black text-xs font-bold border border-black transition-colors uppercase"
              >
                Delete Category &amp; All Items
              </button>
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="w-full py-1.5 text-xs text-black/70 hover:text-black uppercase font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================= ITEM EDITOR MODAL COMPONENT =================
interface ItemEditorModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  categories: Category[];
  flavourList: FlavourAddon[];
  onClose: () => void;
  onSave: (item: MenuItem) => void;
}

const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  isOpen,
  item,
  categories,
  flavourList,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState<string>(item ? item.name : '');
  const [categoryId, setCategoryId] = useState<string>(
    item ? item.categoryId : categories[0]?.id || ''
  );
  const [description, setDescription] = useState<string>(item?.description || '');
  const [basePrice, setBasePrice] = useState<number>(item ? item.basePrice : 119);
  const [badge, setBadge] = useState<string>(item?.badge || '');
  const [hasVariants, setHasVariants] = useState<boolean>(item?.hasVariants || false);
  const [variants, setVariants] = useState<ItemVariant[]>(
    item?.variants && item.variants.length > 0
      ? item.variants
      : [
          { id: 'v-1', name: 'Quarter', price: 119, isDefault: true },
          { id: 'v-2', name: 'Half', price: 239 },
          { id: 'v-3', name: 'Full', price: 479 },
        ]
  );
  const [hasFlavours, setHasFlavours] = useState<boolean>(item?.hasFlavours || false);
  const [isCombo, setIsCombo] = useState<boolean>(item?.isCombo || false);
  const [comboDetails, setComboDetails] = useState<ComboComponent[]>(
    item?.comboDetails || [{ itemName: 'Wings', quantity: 2 }]
  );

  if (!isOpen) return null;

  const handleAddVariant = () => {
    const newV: ItemVariant = {
      id: `v-${Date.now()}`,
      name: 'Size',
      price: basePrice,
    };
    setVariants([...variants, newV]);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const handleAddComboComponent = () => {
    setComboDetails([...comboDetails, { itemName: '', quantity: 1 }]);
  };

  const handleRemoveComboComponent = (idx: number) => {
    setComboDetails(comboDetails.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const saved: MenuItem = {
      id: item ? item.id : `item-${Date.now()}`,
      categoryId,
      name: name.trim(),
      description: description.trim() || undefined,
      basePrice: hasVariants && variants.length > 0 ? variants[0].price : basePrice,
      hasVariants,
      variants: hasVariants ? variants : [],
      hasFlavours,
      flavours: hasFlavours ? flavourList : [],
      isCombo,
      comboDetails: isCombo ? comboDetails.filter((c) => c.itemName.trim()) : undefined,
      sortOrder: item ? item.sortOrder : 99,
      badge: badge.trim() || undefined,
      isOutOfStock: item?.isOutOfStock || false,
      isHidden: item?.isHidden || false,
    };

    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 font-serif text-black">
      <div className="w-full max-w-sm sm:max-w-md bg-white border-2 border-black flex flex-col max-h-[84dvh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-3.5 sm:px-4 py-2.5 border-b-2 border-black flex items-center justify-between bg-white shrink-0">
          <h3 className="text-sm sm:text-base font-bold uppercase text-black truncate pr-2">
            {item ? `Edit Item: ${item.name}` : 'Create New Menu Item'}
          </h3>
          <button onClick={onClose} className="text-black hover:opacity-70 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 min-h-0 text-xs">
          {/* Item Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1 uppercase">Item Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alfaham BBQ"
                className="w-full bg-white border border-black px-3 py-2 text-black"
              />
            </div>

            <div>
              <label className="font-bold block mb-1 uppercase">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-white border border-black px-3 py-2 text-black"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description & Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold block mb-1 uppercase">Short Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Charcoal roasted juicy chicken"
                className="w-full bg-white border border-black px-3 py-2 text-black"
              />
            </div>
            <div>
              <label className="font-bold block mb-1 uppercase">Badge</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="POPULAR"
                className="w-full bg-white border border-black px-3 py-2 text-black"
              />
            </div>
          </div>

          {/* Base Price (if no variants) */}
          {!hasVariants && (
            <div>
              <label className="font-bold block mb-1 uppercase">Price (₹) *</label>
              <div className="flex items-center gap-1.5 max-w-[200px]">
                <span className="text-black/70">₹</span>
                <input
                  type="number"
                  min="0"
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-black px-3 py-2 text-black font-bold"
                />
              </div>
            </div>
          )}

          {/* Variants Toggle & Editor */}
          <div className="p-3.5 border border-black space-y-3 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-bold uppercase block text-black">Multiple Sizes / Variants</span>
                <span className="text-[11px] text-black/70">
                  e.g. Quarter, Half, Full or Plain, Flavoured
                </span>
              </div>
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
                className="w-4 h-4 accent-red-600 shrink-0"
              />
            </div>

            {hasVariants && (
              <div className="space-y-2 pt-2 border-t border-black/30">
                {variants.map((v, idx) => (
                  <div key={v.id || idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => {
                        const updated = [...variants];
                        updated[idx].name = e.target.value;
                        setVariants(updated);
                      }}
                      placeholder="Size name"
                      className="flex-1 min-w-0 bg-white border border-black px-2.5 py-1.5 text-black"
                    />
                    <div className="flex items-center gap-1 w-24 sm:w-28 shrink-0">
                      <span className="text-black/70">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={v.price}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].price = Number(e.target.value) || 0;
                          setVariants(updated);
                        }}
                        className="w-full bg-white border border-black px-2 py-1.5 text-black font-bold"
                      />
                    </div>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.id)}
                        className="text-red-600 hover:underline p-1 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="text-red-600 underline text-xs font-bold pt-1 block uppercase"
                >
                  + Add Another Size Variant
                </button>
              </div>
            )}
          </div>

          {/* Flavours Checkbox */}
          <div className="p-3.5 border border-black flex items-center justify-between gap-3 bg-white">
            <div>
              <span className="font-bold uppercase block text-black">Enable Signature Flavours (+₹10)</span>
              <span className="text-[11px] text-black/70">
                Allow customer to choose Peri Peri, Schezwan, Garlic, Honey
              </span>
            </div>
            <input
              type="checkbox"
              checked={hasFlavours}
              onChange={(e) => setHasFlavours(e.target.checked)}
              className="w-4 h-4 accent-red-600 shrink-0"
            />
          </div>

          {/* Combo / Meal Box Checkbox */}
          <div className="p-3.5 border border-black space-y-3 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-bold uppercase block text-black">Combo / Meal Box Package</span>
                <span className="text-[11px] text-black/70">
                  Bundle multiple item components inside one box price
                </span>
              </div>
              <input
                type="checkbox"
                checked={isCombo}
                onChange={(e) => setIsCombo(e.target.checked)}
                className="w-4 h-4 accent-red-600 shrink-0"
              />
            </div>

            {isCombo && (
              <div className="space-y-2 pt-2 border-t border-black/30">
                {comboDetails.map((cd, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Component item (e.g. Kuboos)"
                      value={cd.itemName}
                      onChange={(e) => {
                        const copy = [...comboDetails];
                        copy[idx].itemName = e.target.value;
                        setComboDetails(copy);
                      }}
                      className="flex-1 min-w-0 bg-white border border-black px-2.5 py-1.5 text-black"
                    />
                    <div className="flex items-center gap-1 w-20 shrink-0">
                      <span className="text-black/70">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={cd.quantity}
                        onChange={(e) => {
                          const copy = [...comboDetails];
                          copy[idx].quantity = Number(e.target.value) || 1;
                          setComboDetails(copy);
                        }}
                        className="w-full bg-white border border-black px-2 py-1.5 text-black font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveComboComponent(idx)}
                      className="text-red-600 hover:underline p-1 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddComboComponent}
                  className="text-red-600 underline text-xs font-bold pt-1 block uppercase"
                >
                  + Add Box Component
                </button>
              </div>
            )}
          </div>

          <div className="p-3 border-t-2 border-black flex items-center gap-2 -mx-3 -mb-3 sm:-mx-4 sm:-mb-4 mt-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-white hover:bg-black/5 border border-black text-black text-xs font-bold transition-colors uppercase min-h-[42px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-red-600 text-white hover:bg-red-700 border border-red-600 text-xs font-bold transition-colors uppercase min-h-[42px]"
            >
              Save Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
