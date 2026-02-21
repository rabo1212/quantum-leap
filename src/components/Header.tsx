"use client";

import { useState, useEffect } from "react";

export default function Header() {
  const [lastUpdate, setLastUpdate] = useState<string>("\uB85C\uB529 \uC911...");

  useEffect(() => {
    setLastUpdate("\uBC29\uAE08 \uC804");
    // 매 분마다 갱신 시간 업데이트
    const interval = setInterval(() => {
      setLastUpdate(
        new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 py-3 sm:px-6 border-b border-[var(--border)]">
      {/* 좌측: 로고 */}
      <div className="flex items-center gap-2">
        <span className="text-2xl" role="img" aria-label="chart">
          📈
        </span>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <h1
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: "var(--color-accent)" }}
          >
            QUANTUM LEAP
          </h1>
          <span
            className="text-xs sm:text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            AI Stock Monitor
          </span>
        </div>
      </div>

      {/* 우측: 마지막 갱신 */}
      <div
        className="text-xs sm:text-sm whitespace-nowrap"
        style={{ color: "var(--text-secondary)" }}
      >
        마지막 갱신: {lastUpdate}
      </div>
    </header>
  );
}
