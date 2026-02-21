"use client";

import type { Indicators, CompositeSignal, SignalDirection } from "@/lib/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface TechnicalPanelProps {
  ticker: string;
  indicators: Indicators;
  signal: CompositeSignal;
}

// 신호 색상 헬퍼
function signalColor(sig: SignalDirection): string {
  switch (sig) {
    case "BUY":
      return "var(--color-buy)";
    case "SELL":
      return "var(--color-sell)";
    case "NEUTRAL":
      return "var(--text-muted)";
  }
}

function signalBg(sig: SignalDirection): string {
  switch (sig) {
    case "BUY":
      return "rgba(34,197,94,0.15)";
    case "SELL":
      return "rgba(239,68,68,0.15)";
    case "NEUTRAL":
      return "rgba(107,114,128,0.15)";
  }
}

export default function TechnicalPanel({
  ticker,
  indicators,
  signal,
}: TechnicalPanelProps) {
  // RSI 미니 차트 데이터 (현재값만 있으므로 간단히 시각화)
  const rsiData = Array.from({ length: 14 }, (_, i) => ({
    idx: i + 1,
    rsi: Math.max(
      10,
      Math.min(
        90,
        indicators.rsi + (Math.random() - 0.5) * 20
      )
    ),
  }));
  // 마지막 값을 현재 RSI로 고정
  rsiData[rsiData.length - 1].rsi = indicators.rsi;

  // MACD 미니 차트 데이터
  const macdData = Array.from({ length: 14 }, (_, i) => ({
    idx: i + 1,
    macd:
      indicators.macd.macd + (Math.random() - 0.5) * 0.5,
    signal:
      indicators.macd.signal + (Math.random() - 0.5) * 0.3,
    histogram:
      indicators.macd.histogram *
      (0.3 + (i / 14) * 0.7) *
      (1 + (Math.random() - 0.5) * 0.3),
  }));
  // 마지막을 현재값으로
  macdData[macdData.length - 1] = {
    idx: 14,
    macd: indicators.macd.macd,
    signal: indicators.macd.signal,
    histogram: indicators.macd.histogram,
  };

  return (
    <div className="px-4 mt-4 sm:px-6">
      <div className="glass-card p-4">
        <h3
          className="text-lg font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          {ticker} 기술 분석
        </h3>

        {/* 차트 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* RSI 차트 */}
          <div
            className="p-3 rounded-lg"
            style={{ background: "var(--bg-primary)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                RSI (14)
              </span>
              <span
                className="text-sm font-bold tabular-nums"
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
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={rsiData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(31,41,55,0.5)"
                />
                <YAxis domain={[0, 100]} hide />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" />
                <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="rsi"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* MACD 차트 */}
          <div
            className="p-3 rounded-lg"
            style={{ background: "var(--bg-primary)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                MACD (12,26,9)
              </span>
              <span
                className="text-sm font-bold tabular-nums"
                style={{
                  color:
                    indicators.macd.histogram > 0
                      ? "var(--color-buy)"
                      : "var(--color-sell)",
                }}
              >
                {indicators.macd.histogram.toFixed(3)}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={macdData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(31,41,55,0.5)"
                />
                <YAxis hide />
                <ReferenceLine y={0} stroke="#374151" />
                <Bar
                  dataKey="histogram"
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #1f2937",
                    borderRadius: "8px",
                    color: "#f5f5f7",
                    fontSize: "12px",
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5개 지표 신호 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b border-[var(--border)]"
                style={{ color: "var(--text-secondary)" }}
              >
                <th className="text-left py-2 px-3 font-medium">지표</th>
                <th className="text-center py-2 px-3 font-medium">신호</th>
                <th className="text-left py-2 px-3 font-medium">근거</th>
              </tr>
            </thead>
            <tbody>
              {signal.indicators.map((ind) => (
                <tr
                  key={ind.name}
                  className="border-b border-[var(--border)]/50"
                >
                  <td
                    className="py-2.5 px-3 font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {ind.name}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        background: signalBg(ind.signal),
                        color: signalColor(ind.signal),
                      }}
                    >
                      {ind.signal}
                    </span>
                  </td>
                  <td
                    className="py-2.5 px-3 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {ind.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 종합 점수 프로그레스 바 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              종합 점수
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span style={{ color: "var(--color-buy)" }}>
                매수 {signal.buyScore}
              </span>
              <span style={{ color: "var(--color-sell)" }}>
                매도 {signal.sellScore}
              </span>
            </div>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden flex"
            style={{ background: "var(--bg-primary)" }}
          >
            <div
              className="h-full transition-all duration-500 rounded-l-full"
              style={{
                width: `${signal.buyScore}%`,
                background: "var(--color-buy)",
              }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${100 - signal.buyScore - signal.sellScore}%`,
                background: "var(--border)",
              }}
            />
            <div
              className="h-full transition-all duration-500 rounded-r-full"
              style={{
                width: `${signal.sellScore}%`,
                background: "var(--color-sell)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
