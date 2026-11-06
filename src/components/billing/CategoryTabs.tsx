import React from 'react';
import { Category } from '../../types';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string; // 'all' or category ID
  onSelectCategory: (categoryId: string) => void;
  categoryItemCounts: Record<string, number>;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  categoryItemCounts,
}) => {
  const allCount = Object.values(categoryItemCounts).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 -mx-4 px-4 sm:mx-0 sm:px-0 select-none">
      <div className="flex items-center gap-2 min-w-max">
        {/* All Items Tab */}
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border transition-all min-h-[44px] ${
            selectedCategoryId === 'all'
              ? 'bg-white text-black border-white'
              : 'bg-black text-white border-white/40 hover:border-white'
          }`}
        >
          <span>All Items</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 border ${
              selectedCategoryId === 'all'
                ? 'bg-black text-white border-black'
                : 'bg-black text-white border-white/60'
            }`}
          >
            {allCount}
          </span>
        </button>

        {/* Categories */}
        {categories.map((cat) => {
          const count = categoryItemCounts[cat.id] || 0;
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border transition-all min-h-[44px] ${
                isSelected
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-white border-white/40 hover:border-white'
              }`}
            >
              <span className="whitespace-nowrap">{cat.name}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 border ${
                  isSelected
                    ? 'bg-black text-white border-black'
                    : 'bg-black text-white border-white/60'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
