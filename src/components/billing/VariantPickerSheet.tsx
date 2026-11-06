import React, { useState, useEffect } from 'react';
import { MenuItem, ItemVariant, FlavourAddon } from '../../types';
import { X, Plus, Minus, Check, Flame, MessageSquare } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { sound } from '../../utils/sound';

interface VariantPickerSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (params: {
    item: MenuItem;
    variant?: ItemVariant;
    flavour?: FlavourAddon;
    quantity: number;
    notes?: string;
  }) => void;
  soundEnabled?: boolean;
}

export const VariantPickerSheet: React.FC<VariantPickerSheetProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
  soundEnabled = true,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null);
  const [selectedFlavour, setSelectedFlavour] = useState<FlavourAddon | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [showNotesInput, setShowNotesInput] = useState<boolean>(false);

  useEffect(() => {
    if (item) {
      // Preselect default or first variant
      if (item.hasVariants && item.variants.length > 0) {
        const defaultVar = item.variants.find((v) => v.isDefault) || item.variants[0];
        setSelectedVariant(defaultVar);
      } else {
        setSelectedVariant(null);
      }

      // Preselect default flavour
      if (item.hasFlavours && item.flavours.length > 0) {
        const defaultFlv = item.flavours.find((f) => f.isDefault) || item.flavours[0];
        setSelectedFlavour(defaultFlv);
      } else {
        setSelectedFlavour(null);
      }

      setQuantity(1);
      setNotes('');
      setShowNotesInput(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  // Calculate unit price
  const basePrice = selectedVariant ? selectedVariant.price : item.basePrice;
  const flavourSurcharge = selectedFlavour ? selectedFlavour.surcharge : 0;
  const unitPrice = basePrice + flavourSurcharge;
  const totalPrice = unitPrice * quantity;

  const handleConfirm = () => {
    sound.playTap(soundEnabled);
    onAddToCart({
      item,
      variant: selectedVariant || undefined,
      flavour: selectedFlavour || undefined,
      quantity,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-black border-t border-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div className="w-12 h-1 bg-white/40 mx-auto my-3 shrink-0" />

        {/* Sheet Header */}
        <div className="px-5 pb-3 border-b border-white flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-wide">{item.name}</h3>
              {item.badge && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-white text-white">
                  {item.badge}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-white/75 mt-0.5 line-clamp-2">{item.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 border border-white bg-black hover:bg-white hover:text-black flex items-center justify-center text-white shrink-0 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Customization Body */}
        <div className="px-5 py-4 overflow-y-auto space-y-5 flex-1 text-white">
          {/* 1. Variant Picker */}
          {item.hasVariants && item.variants.length > 0 && (
            <div>
              <label className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
                Select Size / Variant
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {item.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        sound.playTap(soundEnabled);
                        setSelectedVariant(v);
                      }}
                      className={`p-3 border text-left transition-all min-h-[56px] flex flex-col justify-between ${
                        isSelected
                          ? 'bg-white text-black border-white'
                          : 'bg-black text-white border-white/40 hover:border-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{v.name}</span>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold mt-1">
                        {formatCurrency(v.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Flavour Add-on Picker */}
          {item.hasFlavours && item.flavours.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Signature Flavour
                </label>
                <span className="text-[11px] text-white/80">
                  Flavoured: +{formatCurrency(item.flavours.find((f) => f.surcharge > 0)?.surcharge || 10)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {item.flavours.map((flv) => {
                  const isSelected = selectedFlavour?.id === flv.id;
                  return (
                    <button
                      key={flv.id}
                      type="button"
                      onClick={() => {
                        sound.playTap(soundEnabled);
                        setSelectedFlavour(flv);
                      }}
                      className={`p-2.5 border text-left transition-all min-h-[50px] flex items-center justify-between ${
                        isSelected
                          ? 'bg-white text-black border-white'
                          : 'bg-black text-white border-white/40 hover:border-white'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{flv.name}</div>
                        <div className="text-[10px]">
                          {flv.surcharge > 0 ? `+${formatCurrency(flv.surcharge)}` : 'Standard'}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 stroke-[3] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Quantity Stepper */}
          <div className="flex items-center justify-between pt-2 border-t border-white/40">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Quantity
            </span>
            <div className="flex items-center gap-3 bg-black border border-white p-1">
              <button
                type="button"
                onClick={() => {
                  sound.playTap(soundEnabled);
                  setQuantity((q) => Math.max(1, q - 1));
                }}
                disabled={quantity <= 1}
                className="w-10 h-10 bg-black hover:bg-white hover:text-black border border-white disabled:opacity-30 text-white flex items-center justify-center transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-base font-bold text-white px-2 tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playTap(soundEnabled);
                  setQuantity((q) => q + 1);
                }}
                className="w-10 h-10 bg-white hover:bg-white/90 text-black border border-white flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* 4. Kitchen Note */}
          <div>
            {!showNotesInput ? (
              <button
                type="button"
                onClick={() => setShowNotesInput(true)}
                className="text-xs font-bold text-white underline hover:no-underline flex items-center gap-1.5 py-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>+ Add kitchen note (e.g. extra spicy, crispy, no onions)</span>
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-white/80">
                    Kitchen / Preparation Note
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNotes('');
                      setShowNotesInput(false);
                    }}
                    className="text-[10px] text-white/70 underline"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Extra spicy, no onions, well done"
                  className="w-full bg-black border border-white px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
                  maxLength={60}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sticky Sheet Bottom Bar: Big CTA */}
        <div className="p-4 bg-black border-t border-white pb-safe">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full h-13 bg-white hover:bg-white/90 text-black border border-white font-bold text-sm sm:text-base flex items-center justify-between px-6 transition-colors min-h-[52px]"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Add to Bill</span>
            </div>
            <div className="text-base sm:text-lg font-bold tabular-nums">
              {formatCurrency(totalPrice)}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
