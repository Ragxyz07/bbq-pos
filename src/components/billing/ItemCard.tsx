import React from 'react';
import { MenuItem } from '../../types';
import { Plus, Flame, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

interface ItemCardProps {
  item: MenuItem;
  onSelectItem: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
  currentCartQty?: number;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onSelectItem,
  onQuickAdd,
  currentCartQty = 0,
}) => {
  const isOutOfStock = !!item.isOutOfStock;

  const handleClick = () => {
    if (isOutOfStock) return;
    if (!item.hasVariants && !item.hasFlavours) {
      // 1-tap direct add!
      onQuickAdd(item);
    } else {
      // Opens variant picker (where 1 tap confirms/customizes)
      onSelectItem(item);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col justify-between p-3.5 sm:p-4 bg-black border transition-colors select-none ${
        isOutOfStock
          ? 'opacity-40 cursor-not-allowed border-white/30'
          : 'cursor-pointer border-white/50 hover:border-white active:bg-white/5'
      }`}
    >
      {/* Top row: Badges and current cart indicator */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-white text-white">
              {item.badge}
            </span>
          )}
          {item.isCombo && (
            <span className="text-[10px] font-bold px-2 py-0.5 border border-white text-white">
              Combo Box
            </span>
          )}
        </div>

        {currentCartQty > 0 && (
          <span className="text-xs font-bold bg-white text-black px-2 py-0.5 border border-white">
            {currentCartQty} in bill
          </span>
        )}
      </div>

      {/* Item Title and Description */}
      <div className="flex-1 my-1">
        <h4 className="text-sm sm:text-base font-bold text-white tracking-wide group-hover:underline line-clamp-1">
          {item.name}
        </h4>
        {item.description && (
          <p className="text-xs text-white/75 line-clamp-2 mt-0.5 font-normal leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Combo Details Breakdown */}
        {item.isCombo && item.comboDetails && item.comboDetails.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-white/80">
            {item.comboDetails.map((cd, idx) => (
              <span key={idx} className="bg-black px-1.5 py-0.5 text-[10px] text-white border border-white/40">
                {cd.quantity}x {cd.itemName}
              </span>
            ))}
          </div>
        )}

        {/* Variant previews */}
        {item.hasVariants && item.variants.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.variants.map((v) => (
              <span
                key={v.id}
                className="text-[10px] font-bold text-white bg-black border border-white/40 px-1.5 py-0.5"
              >
                {v.name}: {formatCurrency(v.price)}
              </span>
            ))}
          </div>
        )}

        {/* Flavour Addon preview */}
        {item.hasFlavours && (
          <div className="mt-1.5 text-[11px] text-white/80 font-normal flex items-center gap-1 italic">
            <span>
              Signature Flavours (+₹{item.flavours?.find((f) => f.surcharge > 0)?.surcharge || 10})
            </span>
          </div>
        )}
      </div>

      {/* Bottom Action Row: Price & Tap CTA */}
      <div className="mt-3 pt-2.5 border-t border-white/40 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase font-bold text-white/70 block -mb-0.5">
            {item.hasVariants ? 'Starts at' : 'Price'}
          </span>
          <span className="text-base sm:text-lg font-bold text-white tabular-nums">
            {formatCurrency(item.basePrice)}
          </span>
        </div>

        {isOutOfStock ? (
          <span className="text-xs font-bold text-white border border-white/40 px-2 py-1">
            [Sold Out]
          </span>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1.5 bg-white text-black font-bold text-xs border border-white hover:bg-white/90 active:scale-95 transition-all min-h-[38px]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{item.hasVariants || item.hasFlavours ? 'Select' : 'Add'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
