"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { TickerInfo } from "@/lib/types";

// 임시 티커 목록 (나중에 mockData.ts에서 가져올 예정)
const TEMP_TICKER_LIST: TickerInfo[] = [
  { ticker: "AAPL", name: "Apple", sector: "Tech" },
  { ticker: "MSFT", name: "Microsoft", sector: "Tech" },
  { ticker: "NVDA", name: "NVIDIA", sector: "Semiconductor" },
  { ticker: "AISP", name: "Airship AI Holdings", sector: "AI" },
  { ticker: "AXTI", name: "AXT Inc", sector: "Semiconductor" },
  { ticker: "BBAI", name: "BigBear.ai", sector: "AI" },
  { ticker: "GRRR", name: "Gorilla Technology", sector: "AI" },
  { ticker: "POET", name: "POET Technologies", sector: "Semiconductor" },
  { ticker: "VECO", name: "Veeco Instruments", sector: "Semiconductor" },
  { ticker: "ATOM", name: "Atomera Inc", sector: "Semiconductor" },
  { ticker: "TSLA", name: "Tesla", sector: "EV" },
  { ticker: "AMZN", name: "Amazon", sector: "Tech" },
  { ticker: "GOOGL", name: "Alphabet", sector: "Tech" },
  { ticker: "META", name: "Meta Platforms", sector: "Tech" },
  { ticker: "AMD", name: "Advanced Micro Devices", sector: "Semiconductor" },
  { ticker: "INTC", name: "Intel", sector: "Semiconductor" },
  { ticker: "PLTR", name: "Palantir Technologies", sector: "AI" },
  { ticker: "SNOW", name: "Snowflake", sector: "Cloud" },
  { ticker: "CRWD", name: "CrowdStrike", sector: "Security" },
  { ticker: "NET", name: "Cloudflare", sector: "Cloud" },
];

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (ticker: string) => void;
  existingTickers: string[];
}

export default function AddStockModal({
  isOpen,
  onClose,
  onAdd,
  existingTickers,
}: AddStockModalProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달 열릴 때 포커스
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // 검색 필터링 (debounce 대신 useMemo로 간단하게)
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return TEMP_TICKER_LIST;
    return TEMP_TICKER_LIST.filter(
      (t) =>
        t.ticker.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.sector.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 반투명 배경 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 모달 본체 */}
      <div
        className="
          relative w-full max-w-md max-h-[70vh] flex flex-col
          glass-card p-5
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            종목 추가
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* 검색 입력 */}
        <input
          ref={inputRef}
          type="text"
          placeholder="티커 또는 회사명 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            w-full px-4 py-2.5 rounded-lg mb-3
            bg-[var(--bg-primary)] border border-[var(--border)]
            text-sm text-[var(--text-primary)]
            placeholder:text-[var(--text-muted)]
            focus:outline-none focus:border-[var(--color-accent)]
            transition-colors
          "
        />

        {/* 티커 목록 */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
              검색 결과가 없습니다
            </p>
          )}
          {filtered.map((item) => {
            const alreadyAdded = existingTickers.includes(item.ticker);
            return (
              <button
                key={item.ticker}
                onClick={() => {
                  if (!alreadyAdded) {
                    onAdd(item.ticker);
                    onClose();
                  }
                }}
                disabled={alreadyAdded}
                className={`
                  w-full text-left px-4 py-3 rounded-lg
                  flex items-center justify-between
                  transition-colors text-sm
                  ${
                    alreadyAdded
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-[var(--bg-card-hover)] cursor-pointer"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="font-bold w-12"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {item.ticker}
                  </span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {item.name}
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "rgba(59,130,246,0.1)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {alreadyAdded ? "\uCD94\uAC00\uB428" : item.sector}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
