/**
 * /api/cron/alerts — Vercel Cron 핸들러
 * 매시 정각 실행: 긴급 뉴스 알림 + 매매 신호 요약
 */

import { NextResponse } from "next/server";
import { analyzeSentiment } from "@/lib/news";
import { calculateCompositeSignal } from "@/lib/signals";
import { sendNewsAlert, sendSignalSummary, type SignalEntry } from "@/lib/telegram";
import type { NewsItem } from "@/lib/news";
import type { Indicators } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 최대 60초 (Vercel 제한)

const FH_KEY = process.env.FINNHUB_API_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

// 모니터링 종목 (시드 7개)
const WATCH_TICKERS = ["AISP", "AXTI", "BBAI", "GRRR", "POET", "VECO", "ATOM"];

// 목업 지표 (Cron에서는 AV 호출 안 함 — 일 25회 한도 보존)
const MOCK_INDICATORS: Record<string, Indicators> = {
  AISP: {
    rsi: 28.5, macd: { macd: 0.08, signal: 0.02, histogram: 0.06 },
    bollingerBands: { upper: 3.60, middle: 3.20, lower: 2.80 },
    ichimoku: { tenkan: 3.15, kijun: 3.05, senkouA: 2.95, senkouB: 2.90 },
    sma: { sma20: 3.05, sma50: 3.10, sma200: 2.85 },
  },
  AXTI: {
    rsi: 52.3, macd: { macd: 0.12, signal: 0.10, histogram: 0.02 },
    bollingerBands: { upper: 9.10, middle: 8.30, lower: 7.50 },
    ichimoku: { tenkan: 8.30, kijun: 8.20, senkouA: 8.00, senkouB: 8.15 },
    sma: { sma20: 8.15, sma50: 8.05, sma200: 7.80 },
  },
  BBAI: {
    rsi: 74.2, macd: { macd: -0.15, signal: -0.05, histogram: -0.10 },
    bollingerBands: { upper: 4.50, middle: 4.10, lower: 3.70 },
    ichimoku: { tenkan: 3.95, kijun: 4.10, senkouA: 4.30, senkouB: 4.25 },
    sma: { sma20: 4.20, sma50: 4.00, sma200: 4.35 },
  },
  GRRR: {
    rsi: 58.7, macd: { macd: 0.35, signal: 0.15, histogram: 0.20 },
    bollingerBands: { upper: 13.50, middle: 12.30, lower: 11.10 },
    ichimoku: { tenkan: 12.50, kijun: 12.20, senkouA: 11.80, senkouB: 11.60 },
    sma: { sma20: 12.35, sma50: 12.00, sma200: 10.50 },
  },
  POET: {
    rsi: 45.8, macd: { macd: -0.05, signal: -0.08, histogram: 0.03 },
    bollingerBands: { upper: 7.90, middle: 7.15, lower: 6.40 },
    ichimoku: { tenkan: 7.00, kijun: 7.10, senkouA: 7.25, senkouB: 7.05 },
    sma: { sma20: 7.05, sma50: 7.20, sma200: 6.80 },
  },
  VECO: {
    rsi: 61.4, macd: { macd: 0.45, signal: 0.40, histogram: 0.05 },
    bollingerBands: { upper: 32.80, middle: 30.20, lower: 27.60 },
    ichimoku: { tenkan: 30.60, kijun: 30.00, senkouA: 29.50, senkouB: 29.80 },
    sma: { sma20: 30.40, sma50: 29.80, sma200: 28.50 },
  },
  ATOM: {
    rsi: 38.1, macd: { macd: -0.22, signal: -0.10, histogram: -0.12 },
    bollingerBands: { upper: 11.50, middle: 10.40, lower: 9.30 },
    ichimoku: { tenkan: 10.00, kijun: 10.30, senkouA: 10.60, senkouB: 10.50 },
    sma: { sma20: 10.15, sma50: 10.00, sma200: 10.80 },
  },
};

// ── Finnhub 직접 호출 (서버 사이드) ──

async function fetchFinnhubQuote(ticker: string) {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FH_KEY}`
    );
    if (!res.ok) return null;
    const d = await res.json();
    return {
      price: d.c || 0,
      change: d.d || 0,
      changePercent: d.dp || 0,
    };
  } catch {
    return null;
  }
}

async function fetchFinnhubNews(ticker: string): Promise<NewsItem[]> {
  try {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 1 * 86400_000).toISOString().split("T")[0]; // 1일
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${FH_KEY}`
    );
    if (!res.ok) return [];
    const rawNews: Array<Record<string, unknown>> = await res.json();

    return rawNews.slice(0, 5).map((item, idx) => {
      const headline = (item.headline as string) || "";
      const summary = (item.summary as string) || "";
      const { sentiment, score, matchedKeywords, isUrgent } = analyzeSentiment(headline, summary);

      return {
        id: (item.id as number) || idx,
        ticker,
        headline,
        summary,
        source: (item.source as string) || "Unknown",
        url: (item.url as string) || "",
        datetime: (item.datetime as number) || 0,
        sentiment,
        sentimentScore: score,
        isUrgent,
        matchedKeywords,
      };
    });
  } catch {
    return [];
  }
}

// ── 메인 핸들러 ──

export async function GET(request: Request) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    checkedTickers: 0,
    urgentNewsFound: 0,
    urgentNewsSent: 0,
    signalsSent: false,
    errors: [] as string[],
  };

  try {
    const signalEntries: SignalEntry[] = [];
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

    // 종목별 처리 (순차 — rate limit 대비)
    for (const ticker of WATCH_TICKERS) {
      results.checkedTickers++;

      // 1. 가격 fetch
      const quote = await fetchFinnhubQuote(ticker);
      if (!quote) {
        results.errors.push(`${ticker}: 가격 fetch 실패`);
        continue;
      }

      // 2. 뉴스 fetch + 긴급 뉴스 필터
      const news = await fetchFinnhubNews(ticker);
      const urgentNews = news.filter(
        (n) => n.isUrgent && n.datetime > oneHourAgo
      );

      results.urgentNewsFound += urgentNews.length;

      // 3. 긴급 뉴스 개별 알림 전송
      for (const n of urgentNews) {
        const sent = await sendNewsAlert(n, quote.price, quote.changePercent);
        if (sent !== undefined) results.urgentNewsSent++;
        // 스팸 방지: 뉴스 간 0.5초 대기
        await new Promise((r) => setTimeout(r, 500));
      }

      // 4. 매매 신호 계산
      const indicators = MOCK_INDICATORS[ticker];
      if (indicators) {
        const signal = calculateCompositeSignal(quote.price, indicators);
        signalEntries.push({
          ticker,
          overall: signal.overall,
          buyScore: signal.buyScore,
          sellScore: signal.sellScore,
          price: quote.price,
          changePercent: quote.changePercent,
        });
      }

      // Finnhub rate limit 대비 0.3초 대기
      await new Promise((r) => setTimeout(r, 300));
    }

    // 5. 매매 신호 요약 전송
    if (signalEntries.length > 0) {
      await sendSignalSummary(signalEntries);
      results.signalsSent = true;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (err) {
    console.error("[Cron] alerts error:", err);
    return NextResponse.json(
      { error: "cron failed", details: String(err) },
      { status: 500 }
    );
  }
}
