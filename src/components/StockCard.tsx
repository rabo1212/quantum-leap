"use client";

import type { StockCardData, OverallSignal } from "@/lib/types";

interface StockCardProps {
  data: StockCardData;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

// 신호 도트
function SignalDot({ signal }: { signal: OverallSignal }) {
  const dots: Record<OverallSignal, string> = {
    BUY: "\uD83D\uDFE2",
    SELL: "\uD83D\uDD34",
    WATCH: "\uD83D\uDFE1",
  };
  return <span className="text-sm">{dots[signal]}</span>;
}

// 신호 배지
function SignalBadge({ signal }: { signal: OverallSignal }) {
  const styles: Record<OverallSignal, { bg: string; text: string; label: string }> = {
    BUY: {
      bg: "rgba(34,197,94,0.15)",
      text: "var(--color-buy)",
      label: "BUY",
    },
    SELL: {
      bg: "rgba(239,68,68,0.15)",
      text: "var(--color-sell)",
      label: "SELL",
    },
    WATCH: {
      bg: "rgba(234,179,8,0.15)",
      text: "var(--color-neutral)",
      label: "WATCH",
    },
  };
  const s = styles[signal];

  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

export default function StockCard({
  data,
  isSelected,
  onSelect,
  onRemove,
}: StockCardProps) {
  const { stock, indicators, signal } = data;
  const isPositive = stock.changePercent >= 0;

  const macdDirection =
    indicators.macd.histogram > 0
      ? "\u2191 \uC0C1\uC2B9"
      : indicators.macd.histogram < 0
        ? "\u2193 \uD558\uB77D"
        : "\u2192 \uBCF4\uD569";

  return (
    <div
      onClick={onSelect}
      className={`
        glass-card p-4 cursor-pointer transition-all
        hover:border-[var(--color-accent)]/50
        ${isSelected ? "border-[var(--color-accent)]" : ""}
      `}
    >
      {/* 상단: 신호 + 티커 + 회사명 + 삭제 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <SignalDot signal={signal.overall} />
          <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            {stock.ticker}
          </span>
          <span
            className="text-xs truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {stock.name}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="
            w-6 h-6 flex items-center justify-center rounded
            text-[var(--text-muted)] hover:text-[var(--color-sell)]
            hover:bg-[var(--color-sell)]/10 transition-colors text-sm
          "
          aria-label={`${stock.ticker} \uC0AD\uC81C`}
        >
          ×
        </button>
      </div>

      {/* 중단: 가격 + 등락률 */}
      <div className="flex items-baseline gap-2 mb-3">
        <span
          className="text-xl sm:text-2xl font-bold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          ${stock.price.toFixed(2)}
        </span>
        <span
          className="text-sm font-medium tabular-nums"
          style={{ color: isPositive ? "var(--color-buy)" : "var(--color-sell)" }}
        >
          {isPositive ? "\u25B2" : "\u25BC"}{" "}
          {isPositive ? "+" : ""}
          {stock.changePercent.toFixed(2)}%
        </span>
      </div>

      {/* 하단: RSI + MACD + 종합 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span>
            RSI{" "}
            <span
              className="font-medium"
              style={{
                color:
                  indicators.rsi > 70
                    ? "var(--color-sell)"
                    : indicators.rsi < 30
                      ? "var(--color-buy)"
                      : "var(--text-primary)",
              }}
            >
              {indicators.rsi.toFixed(1)}
            </span>
          </span>
          <span>
            MACD{" "}
            <span
              className="font-medium"
              style={{
                color:
                  indicators.macd.histogram > 0
                    ? "var(--color-buy)"
                    : "var(--color-sell)",
              }}
            >
              {macdDirection}
            </span>
          </span>
        </div>
        <SignalBadge signal={signal.overall} />
      </div>
    </div>
  );
}
