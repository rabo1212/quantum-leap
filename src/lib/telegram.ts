/**
 * telegram.ts — 텔레그램 알림 전송 유틸
 * Quantum Leap 긴급 뉴스 + 매매 신호 요약
 */

import { type NewsItem, formatNewsAlert, timeAgo } from "./news";
import type { OverallSignal } from "./types";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

// ── 텔레그램 메시지 전송 ──

export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("[Telegram] BOT_TOKEN 또는 CHAT_ID 미설정");
    return false;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Telegram] 전송 실패:", err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Telegram] 네트워크 에러:", err);
    return false;
  }
}

// ── 긴급 뉴스 알림 ──

export async function sendNewsAlert(
  news: NewsItem,
  price?: number,
  changePercent?: number,
): Promise<void> {
  const sentimentEmoji =
    news.sentiment === "positive" ? "🟢" :
    news.sentiment === "negative" ? "🔴" : "🟡";

  const sentimentLabel =
    news.sentiment === "positive" ? "긍정" :
    news.sentiment === "negative" ? "부정" : "중립";

  const priceInfo = price != null
    ? `\n💰 현재가: $${price.toFixed(2)} (${changePercent != null && changePercent >= 0 ? "▲" : "▼"}${changePercent?.toFixed(1)}%)`
    : "";

  const text =
`🚨 <b>Quantum Leap 긴급 뉴스</b>
━━━━━━━━━━━━━━━━━
${sentimentEmoji} <b>${news.ticker}</b> — ${news.source} (${timeAgo(news.datetime)})
"${escapeHtml(news.headline)}"

감성: ${sentimentLabel} (${news.sentimentScore}%)
키워드: ${news.matchedKeywords.join(", ") || "없음"}${priceInfo}
━━━━━━━━━━━━━━━━━`;

  await sendTelegramMessage(text);
}

// ── 매매 신호 요약 알림 ──

export interface SignalEntry {
  ticker: string;
  overall: OverallSignal;
  buyScore: number;
  sellScore: number;
  price: number;
  changePercent: number;
}

export async function sendSignalSummary(signals: SignalEntry[]): Promise<void> {
  if (signals.length === 0) return;

  const signalEmoji = (s: OverallSignal) =>
    s === "BUY" ? "🟢" : s === "SELL" ? "🔴" : "🟡";

  const signalLabel = (s: OverallSignal) =>
    s === "BUY" ? "BUY " : s === "SELL" ? "SELL" : "WAIT";

  // BUY → SELL → WATCH 순서로 정렬
  const order: Record<OverallSignal, number> = { BUY: 0, SELL: 1, WATCH: 2 };
  const sorted = [...signals].sort((a, b) => order[a.overall] - order[b.overall]);

  const lines = sorted.map((s) => {
    const score = s.overall === "BUY" ? s.buyScore :
                  s.overall === "SELL" ? s.sellScore : 0;
    const arrow = s.changePercent >= 0 ? "▲" : "▼";
    const scoreStr = score > 0 ? `  점수 ${score}` : "";
    return `${signalEmoji(s.overall)} ${signalLabel(s.overall)} <b>${s.ticker}</b>  $${s.price.toFixed(2)} (${arrow}${Math.abs(s.changePercent).toFixed(1)}%)${scoreStr}`;
  });

  const buyCount = signals.filter((s) => s.overall === "BUY").length;
  const sellCount = signals.filter((s) => s.overall === "SELL").length;

  const text =
`📊 <b>Quantum Leap 신호 리포트</b>
━━━━━━━━━━━━━━━━━
${lines.join("\n")}
━━━━━━━━━━━━━━━━━
매수 ${buyCount} | 매도 ${sellCount} | 관망 ${signals.length - buyCount - sellCount}
⚠️ 투자 판단은 본인 책임입니다.`;

  await sendTelegramMessage(text);
}

// HTML 특수문자 이스케이프
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
