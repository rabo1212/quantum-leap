"use client";

import type { StockCardData, OverallSignal } from "@/lib/types";

export type SignalFilter = "ALL" | "BUY" | "SELL" | "WATCH";

interface SummaryBarProps {
  stocks: StockCardData[];
  activeFilter: SignalFilter;
  onFilterChange: (filter: SignalFilter) => void;
}

interface SummaryItem {
  label: string;
  count: number;
  color: string;
}

export default function SummaryBar({ stocks, activeFilter, onFilterChange }: SummaryBarProps) {
  const counts: Record<OverallSignal | "total", number> = {
    total: stocks.length,
    BUY: 0,
    SELL: 0,
    WATCH: 0,
  };

  stocks.forEach((s) => {
    const sig = s.signal.overall;
    if (sig in counts) counts[sig]++;
  });

  const items: (SummaryItem & { filter: SignalFilter })[] = [
    { label: "총 종목", count: counts.total, color: "var(--text-primary)", filter: "ALL" },
    { label: "매수 신호", count: counts.BUY, color: "var(--color-buy)", filter: "BUY" },
    { label: "매도 신호", count: counts.SELL, color: "var(--color-sell)", filter: "SELL" },
    { label: "관망", count: counts.WATCH, color: "var(--color-neutral)", filter: "WATCH" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 mt-4 sm:px-6">
      {items.map((item) => {
        const isActive = activeFilter === item.filter;
        return (
          <button
            key={item.label}
            onClick={() => onFilterChange(isActive ? "ALL" : item.filter)}
            className={`glass-card px-4 py-3 flex flex-col items-center cursor-pointer transition-all ${
              isActive
                ? "ring-2 ring-offset-1 ring-offset-[var(--bg-primary)]"
                : "hover:border-[var(--border-hover)]"
            }`}
            style={isActive ? { borderColor: item.color, ringColor: item.color } as React.CSSProperties : undefined}
          >
            <span
              className="text-2xl sm:text-3xl font-bold tabular-nums"
              style={{ color: item.color }}
            >
              {item.count}
            </span>
            <span className="text-xs mt-1" style={{ color: isActive ? item.color : "var(--text-secondary)" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
