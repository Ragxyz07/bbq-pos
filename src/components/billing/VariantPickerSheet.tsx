import React, { useState, useEffect } from 'react';
import { MenuItem, ItemVariant, FlavourAddon } from '../../types';
import { X, Plus, Minus, Check, MessageSquare } from 'lucide-react';
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
      if (item.hasVariants && item.variants.length > 0) {
        const defaultVar = item.variants.find((v) => v.isDefault) || item.variants[0];
        setSelectedVariant(defaultVar);
      } else {
        setSelectedVariant(null);
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm sm:max-w-md bg-white border-2 border-black shadow-2xl max-h-[82dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet Header */}
        <div className="px-3.5 sm:px-4 py-2.5 border-b border-black flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-black tracking-wide">{item.name}</h3>
              {item.badge && (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 border border-black text-black">
                  {item.badge}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-black/75 mt-0.5 line-clamp-2">{item.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-black bg-white hover:bg-black hover:text-white flex items-center justify-center text-black shrink-0 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Customization Body */}
        <div className="p-3 sm:p-4 overflow-y-auto touch-scroll space-y-3.5 flex-1 min-h-0 text-black">
          {/* 1. Variant Picker */}
          {item.hasVariants && item.variants.length > 0 && (
            <div>
              <label className="text-xs font-bold text-black uppercase tracking-wider block mb-2">
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
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-white text-black border-black hover:bg-black/5'
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
                <label className="text-xs font-bold text-black uppercase tracking-wider">
                  Signature Flavour
                </label>
                <span className="text-[11px] text-black/80">
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
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-white text-black border-black hover:bg-black/5'
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
          <div className="flex items-center justify-between pt-2 border-t border-black/20">
            <span className="text-xs font-bold text-black uppercase tracking-wider">
              Quantity
            </span>
            <div className="flex items-center gap-3 bg-white border border-black p-1">
              <button
                type="button"
                onClick={() => {
                  sound.playTap(soundEnabled);
                  setQuantity((q) => Math.max(1, q - 1));
                }}
                disabled={quantity <= 1}
                className="w-10 h-10 bg-white hover:bg-black/5 border border-black disabled:opacity-30 text-black flex items-center justify-center transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-base font-bold text-black px-2 tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playTap(soundEnabled);
                  setQuantity((q) => q + 1);
                }}
                className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white border border-red-600 flex items-center justify-center transition-colors shadow-sm"
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
                className="text-xs font-bold text-black underline hover:no-underline flex items-center gap-1.5 py-1"
              >
                <MessageSquare className="w-3.5 h-3.5 text-red-600" />
                <span>+ Add kitchen note (e.g. extra spicy, crispy, no onions)</span>
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-black/80">
                    Kitchen / Preparation Note
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNotes('');
                      setShowNotesInput(false);
                    }}
                    className="text-[10px] text-red-600 underline"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Extra spicy, no onions, well done"
                  className="w-full bg-white border border-black px-3 py-2 text-xs text-black placeholder-black/40 focus:outline-none"
                  maxLength={60}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sticky Sheet Bottom Bar: Big CTA in RED */}
        <div className="p-3 bg-white border-t border-black shrink-0">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white border border-red-600 font-bold text-sm flex items-center justify-between px-4 transition-colors min-h-[44px] shadow-md"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add to Bill</span>
            </div>
            <div className="text-base font-bold tabular-nums">
              {formatCurrency(totalPrice)}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
