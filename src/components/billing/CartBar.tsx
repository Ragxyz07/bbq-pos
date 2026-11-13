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
    <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:bottom-3 left-0 right-0 z-30 p-2 sm:p-3 pointer-events-none lg:hidden select-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <button
          type="button"
          onClick={onOpenCart}
          className="w-full h-14 bg-white text-black p-3 flex items-center justify-between shadow-2xl active:scale-[0.99] transition-all border-2 border-black"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 border border-black bg-white flex items-center justify-center text-black">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-black/70 uppercase tracking-wider block">
                {itemCount} {itemCount === 1 ? 'Item' : 'Items'} in Bill
              </span>
              <span className="text-lg font-bold tracking-tight text-black tabular-nums">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 font-bold text-xs uppercase tracking-wider border border-red-600 hover:bg-red-700 transition-colors">
            <span>View Bill</span>
            <ChevronUp className="w-4 h-4 animate-bounce" />
          </div>
        </button>
      </div>
    </div>
  );
};
