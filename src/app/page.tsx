"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { QuantumLeapProvider, useQuantumLeap } from "@/lib/store";
import Header from "@/components/Header";
import TabBar from "@/components/TabBar";
import SummaryBar, { type SignalFilter } from "@/components/SummaryBar";
import StockGrid from "@/components/StockGrid";
import AddStockModal from "@/components/AddStockModal";
import ChartSection from "@/components/ChartSection";
import TechnicalPanel from "@/components/TechnicalPanel";
import TeamAnalysis from "@/components/TeamAnalysis";
import NewsFeed from "@/components/NewsFeed";
import Disclaimer from "@/components/Disclaimer";
import { SEED_STOCKS, getStockData, TICKER_LIST } from "@/lib/mockData";
import {
  fetchAllQuotes,
  fetchCandles,
  fetchIndicators,
  fetchNews,
  calculateIchimoku,
  type QuoteData,
} from "@/lib/api";
import { calculateCompositeSignal } from "@/lib/signals";
import type { StockCardData, Indicators, OHLCData } from "@/lib/types";
import type { NewsItem } from "@/lib/news";

// 시드 종목 Map (빠른 조회용)
const STOCK_MAP: Record<string, StockCardData> = {};
for (const s of SEED_STOCKS) {
  STOCK_MAP[s.stock.ticker] = s;
}

// 티커 → 이름/섹터 맵
const TICKER_NAME: Record<string, { name: string; sector: string }> = {};
for (const t of TICKER_LIST) {
  TICKER_NAME[t.ticker] = { name: t.name, sector: t.sector };
}

// 기본 지표 (데이터 없을 때 폴백)
const DEFAULT_INDICATORS: Indicators = {
  rsi: 50,
  macd: { macd: 0, signal: 0, histogram: 0 },
  bollingerBands: { upper: 0, middle: 0, lower: 0 },
  ichimoku: { tenkan: 0, kijun: 0, senkouA: 0, senkouB: 0 },
  sma: { sma20: 0, sma50: 0, sma200: 0 },
};

// ── 메인 대시보드 컴포넌트 ──
function Dashboard() {
  const {
    state,
    addStock,
    removeStock,
    setSelectedTicker,
  } = useQuantumLeap();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("ALL");

  // ── 실시간 데이터 상태 ──
  const [liveQuotes, setLiveQuotes] = useState<Record<string, QuoteData>>({});
  const [liveIndicators, setLiveIndicators] = useState<Record<string, Indicators>>({});
  const [liveCandles, setLiveCandles] = useState<Record<string, OHLCData[]>>({});
  const [liveNews, setLiveNews] = useState<Record<string, NewsItem[]>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const tickers = activeTab?.tickers || [];

  // ── 전체 종목 가격 fetch (Finnhub, 1분마다) ──
  const fetchPrices = useCallback(async () => {
    if (tickers.length === 0) return;
    const quotes = await fetchAllQuotes(tickers);
    if (Object.keys(quotes).length > 0) {
      setLiveQuotes((prev) => ({ ...prev, ...quotes }));
    }
  }, [tickers.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000); // 1분 자동 갱신
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // ── 종목 선택 시 상세 데이터 fetch (캔들 + 지표 + 뉴스) ──
  useEffect(() => {
    if (!state.selectedTicker) return;
    const ticker = state.selectedTicker;
    let cancelled = false;

    const loadDetail = async () => {
      setDetailLoading(true);

      const [candlesResult, indicatorsResult, newsResult] = await Promise.all([
        fetchCandles(ticker),
        fetchIndicators(ticker),
        fetchNews(ticker),
      ]);

      if (cancelled) return;

      if (candlesResult) {
        setLiveCandles((prev) => ({ ...prev, [ticker]: candlesResult }));

        // 일목균형표는 캔들에서 자체 계산
        if (indicatorsResult) {
          indicatorsResult.ichimoku = calculateIchimoku(candlesResult);
        }
      }

      if (indicatorsResult) {
        setLiveIndicators((prev) => ({ ...prev, [ticker]: indicatorsResult }));
      }

      if (newsResult && newsResult.length > 0) {
        setLiveNews((prev) => ({ ...prev, [ticker]: newsResult }));
      }

      setDetailLoading(false);
    };

    loadDetail();
    return () => { cancelled = true; };
  }, [state.selectedTicker]);

  // ── StockCardData 빌드 (실데이터 > 목업 > 기본값) ──
  const buildStockData = useCallback(
    (ticker: string): StockCardData => {
      const mock = STOCK_MAP[ticker] || getStockData(ticker);
      const quote = liveQuotes[ticker];
      const indicators = liveIndicators[ticker];
      const candles = liveCandles[ticker];
      const info = TICKER_NAME[ticker] || { name: ticker, sector: "" };

      // 가격: 실데이터 > 목업
      const price = quote?.price || mock?.stock.price || 0;
      const change = quote?.change || mock?.stock.change || 0;
      const changePercent = quote?.changePercent || mock?.stock.changePercent || 0;

      const stock = {
        ticker,
        name: mock?.stock.name || info.name,
        sector: mock?.stock.sector || info.sector,
        price,
        change,
        changePercent,
        volume: mock?.stock.volume || 0,
        updatedAt: new Date().toISOString(),
      };

      // 지표: 실데이터 > 목업 > 기본값
      const finalIndicators = indicators || mock?.indicators || DEFAULT_INDICATORS;
      const signal = calculateCompositeSignal(price, finalIndicators);

      return {
        stock,
        indicators: finalIndicators,
        signal,
        sparkline: mock?.sparkline || [],
        candles: candles || mock?.candles || [],
        grokNote: mock?.grokNote,
      };
    },
    [liveQuotes, liveIndicators, liveCandles],
  );

  // 현재 탭의 종목 데이터 (전체)
  const allStocks: StockCardData[] = useMemo(() => {
    if (!activeTab) return [];
    return activeTab.tickers.map(buildStockData);
  }, [activeTab, buildStockData]);

  // 필터 적용된 종목
  const currentStocks: StockCardData[] = useMemo(() => {
    if (signalFilter === "ALL") return allStocks;
    return allStocks.filter((s) => s.signal.overall === signalFilter);
  }, [allStocks, signalFilter]);

  // 선택된 종목 데이터
  const selectedStock = state.selectedTicker
    ? buildStockData(state.selectedTicker)
    : null;

  // 선택된 종목 뉴스 (실데이터 > 빈 배열)
  const selectedNews = state.selectedTicker
    ? liveNews[state.selectedTicker] || []
    : [];

  return (
    <div className="min-h-screen flex flex-col max-w-[1600px] mx-auto w-full overflow-x-hidden">
      <Header />
      <TabBar />
      <SummaryBar
        stocks={allStocks}
        activeFilter={signalFilter}
        onFilterChange={setSignalFilter}
      />
      <StockGrid
        stocks={currentStocks}
        selectedTicker={state.selectedTicker}
        onSelectTicker={(ticker) => setSelectedTicker(ticker)}
        onRemoveStock={(ticker) => {
          if (activeTab) {
            removeStock(activeTab.id, ticker);
          }
        }}
        onAddStock={() => setIsModalOpen(true)}
      />

      {/* 종목 상세 영역 */}
      {selectedStock && (
        <div className="px-4 sm:px-6 pb-4 space-y-4">
          <ChartSection
            ticker={selectedStock.stock.ticker}
            candles={selectedStock.candles}
          />

          {/* 기술 분석 + 뉴스 2단 레이아웃 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <TechnicalPanel
                ticker={selectedStock.stock.ticker}
                indicators={selectedStock.indicators}
                signal={selectedStock.signal}
              />
            </div>
            <div>
              <NewsFeed
                ticker={selectedStock.stock.ticker}
                news={selectedNews}
                loading={detailLoading && selectedNews.length === 0}
              />
            </div>
          </div>

          <TeamAnalysis ticker={selectedStock.stock.ticker} />
        </div>
      )}

      <Disclaimer />

      {/* 종목 추가 모달 */}
      <AddStockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={(ticker) => {
          if (activeTab) {
            addStock(activeTab.id, ticker);
          }
        }}
        existingTickers={activeTab?.tickers || []}
      />
    </div>
  );
}

// ── 루트: Provider 감싸기 ──
export default function Home() {
  return (
    <QuantumLeapProvider>
      <Dashboard />
    </QuantumLeapProvider>
  );
}
