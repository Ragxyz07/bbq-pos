import React from 'react';
import { ShoppingBag, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

interface CartBarProps {
  itemCount: number;
  totalAmount: number;
  onOpenCart: () => void;
}

export const CartBar: React.FC<CartBarProps> = ({
  itemCount,
  totalAmount,
  onOpenCart,
}) => {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-30 p-2 sm:p-3 pointer-events-none lg:hidden select-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <button
          type="button"
          onClick={onOpenCart}
          className="w-full h-14 bg-black text-white p-3 flex items-center justify-between shadow-2xl active:scale-[0.99] transition-all border border-white"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 border border-white bg-black flex items-center justify-center text-white">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-white/75 uppercase tracking-wider block">
                {itemCount} {itemCount === 1 ? 'Item' : 'Items'} in Bill
              </span>
              <span className="text-lg font-bold tracking-tight text-white tabular-nums">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white text-black px-4 py-2 font-bold text-xs uppercase tracking-wider border border-white transition-colors">
            <span>View Bill</span>
            <ChevronUp className="w-4 h-4 animate-bounce" />
          </div>
        </button>
      </div>
    </div>
  );
};
