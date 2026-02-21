"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { OHLCData } from "@/lib/types";

// lightweight-charts를 dynamic import (SSR 비활성화)
const ChartComponent = dynamic(
  () => import("./ChartInner"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return (
    <div
      className="w-full h-[400px] rounded-xl flex items-center justify-center"
      style={{ background: "var(--bg-card)" }}
    >
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        차트 로딩 중...
      </span>
    </div>
  );
}

type Period = "1M" | "3M" | "6M" | "1Y";

interface ChartSectionProps {
  ticker: string;
  candles: OHLCData[];
}

export default function ChartSection({ ticker, candles }: ChartSectionProps) {
  const [period, setPeriod] = useState<Period>("1M");

  const periods: Period[] = ["1M", "3M", "6M", "1Y"];

  // Phase 1: 1M만 실제, 나머지는 같은 데이터
  const filteredCandles = candles;

  return (
    <div className="px-4 mt-6 sm:px-6">
      <div className="glass-card p-4">
        {/* 헤더: 티커 + 기간 선택 */}
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {ticker} 차트
          </h3>
          <div className="flex gap-1">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`
                  px-3 py-1 text-xs rounded-md transition-colors
                  ${
                    p === period
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }
                  ${p !== "1M" ? "opacity-50" : ""}
                `}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 차트 */}
        <ChartComponent candles={filteredCandles} />
      </div>
    </div>
  );
}
