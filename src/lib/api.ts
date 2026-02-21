/**
 * api.ts — 클라이언트 측 API 클라이언트 + 메모리 캐시
 * Finnhub: 가격/캔들/뉴스 | Alpha Vantage: 기술 지표
 */

import type { OHLCData, Indicators, MACDData, BollingerBands, SMAData } from "./types";
import { type NewsItem, analyzeSentiment } from "./news";

// ── 캐시 ──
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string, maxAgeMs: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < maxAgeMs) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

// ── 가격 (Finnhub) ──

export interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
}

export async function fetchQuote(ticker: string): Promise<QuoteData | null> {
  const cacheKey = `quote:${ticker}`;
  const cached = getCached<QuoteData>(cacheKey, 60_000); // 1분
  if (cached) return cached;

  try {
    const res = await fetch(`/api/stock/${ticker}?type=quote`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    setCache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchAllQuotes(
  tickers: string[]
): Promise<Record<string, QuoteData>> {
  const results: Record<string, QuoteData> = {};
  const promises = tickers.map(async (ticker) => {
    const quote = await fetchQuote(ticker);
    if (quote) results[ticker] = quote;
  });
  await Promise.all(promises);
  return results;
}

// ── 캔들 (Finnhub) ──

export async function fetchCandles(ticker: string): Promise<OHLCData[] | null> {
  const cacheKey = `candles:${ticker}`;
  const cached = getCached<OHLCData[]>(cacheKey, 3_600_000); // 1시간
  if (cached) return cached;

  try {
    const res = await fetch(`/api/stock/${ticker}?type=candles`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    setCache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

// ── 기술 지표 (Alpha Vantage) ──

interface RawIndicators {
  rsi: number | null;
  macd: MACDData | null;
  bollingerBands: BollingerBands | null;
  sma: SMAData | null;
}

export async function fetchIndicators(ticker: string): Promise<Indicators | null> {
  const cacheKey = `indicators:${ticker}`;
  const cached = getCached<Indicators>(cacheKey, 3_600_000); // 1시간
  if (cached) return cached;

  try {
    const res = await fetch(`/api/stock/${ticker}?type=indicators`);
    if (!res.ok) return null;
    const data: RawIndicators = await res.json();

    // 모든 필드가 있어야 유효
    if (data.rsi === null || !data.macd || !data.bollingerBands || !data.sma) {
      return null;
    }

    const indicators: Indicators = {
      rsi: data.rsi,
      macd: data.macd,
      bollingerBands: data.bollingerBands,
      sma: data.sma,
      // 일목균형표는 Alpha Vantage에서 제공 안 함 → 캔들 데이터에서 계산
      ichimoku: { tenkan: 0, kijun: 0, senkouA: 0, senkouB: 0 },
    };

    setCache(cacheKey, indicators);
    return indicators;
  } catch {
    return null;
  }
}

// ── 일목균형표 자체 계산 (캔들 데이터 필요) ──

export function calculateIchimoku(candles: OHLCData[]): {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
} {
  if (candles.length < 26) {
    return { tenkan: 0, kijun: 0, senkouA: 0, senkouB: 0 };
  }

  const highLow = (slice: OHLCData[]) => {
    const highs = slice.map((c) => c.high);
    const lows = slice.map((c) => c.low);
    return (Math.max(...highs) + Math.min(...lows)) / 2;
  };

  const tenkan = highLow(candles.slice(-9)); // 전환선 (9일)
  const kijun = highLow(candles.slice(-26)); // 기준선 (26일)
  const senkouA = (tenkan + kijun) / 2; // 선행스팬 A
  const senkouB = candles.length >= 52 ? highLow(candles.slice(-52)) : highLow(candles); // 선행스팬 B

  return { tenkan, kijun, senkouA, senkouB };
}

// ── 뉴스 (Finnhub) ──

export async function fetchNews(ticker: string): Promise<NewsItem[]> {
  const cacheKey = `news:${ticker}`;
  const cached = getCached<NewsItem[]>(cacheKey, 1_800_000); // 30분
  if (cached) return cached;

  try {
    const res = await fetch(`/api/stock/${ticker}?type=news`);
    if (!res.ok) return [];
    const rawNews: Array<Record<string, unknown>> = await res.json();

    const news: NewsItem[] = rawNews.map((item, idx) => {
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

    setCache(cacheKey, news);
    return news;
  } catch {
    return [];
  }
}
