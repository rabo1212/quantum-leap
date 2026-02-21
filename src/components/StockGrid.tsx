"use client";

import type { StockCardData } from "@/lib/types";
import StockCard from "./StockCard";

interface StockGridProps {
  stocks: StockCardData[];
  selectedTicker: string | null;
  onSelectTicker: (ticker: string) => void;
  onRemoveStock: (ticker: string) => void;
  onAddStock: () => void;
}

export default function StockGrid({
  stocks,
  selectedTicker,
  onSelectTicker,
  onRemoveStock,
  onAddStock,
}: StockGridProps) {
  return (
    <div className="px-4 mt-4 sm:px-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stocks.map((s) => (
          <StockCard
            key={s.stock.ticker}
            data={s}
            isSelected={s.stock.ticker === selectedTicker}
            onSelect={() => onSelectTicker(s.stock.ticker)}
            onRemove={() => onRemoveStock(s.stock.ticker)}
          />
        ))}
      </div>

      {/* + 종목 추가 버튼 */}
      <button
        onClick={onAddStock}
        className="
          mt-4 w-full py-3 rounded-xl
          border border-dashed border-[var(--border)]
          text-sm text-[var(--text-muted)]
          hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]
          transition-colors
        "
      >
        + 종목 추가
      </button>
    </div>
  );
}
