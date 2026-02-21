// === 탭 (워치리스트 그룹) ===
export interface Tab {
  id: string;
  name: string;
  order: number;
  tickers: string[];
}

// === 종목 기본 데이터 ===
export interface StockData {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  updatedAt: string;
}

// === 기술 지표 ===
export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export interface IchimokuData {
  tenkan: number;   // 전환선 (9)
  kijun: number;    // 기준선 (26)
  senkouA: number;  // 선행스팬 A
  senkouB: number;  // 선행스팬 B
}

export interface SMAData {
  sma20: number;
  sma50: number;
  sma200: number;
}

export interface Indicators {
  rsi: number;
  macd: MACDData;
  bollingerBands: BollingerBands;
  ichimoku: IchimokuData;
  sma: SMAData;
}

// === 개별 지표 신호 ===
export type SignalDirection = "BUY" | "SELL" | "NEUTRAL";
export type OverallSignal = "BUY" | "SELL" | "WATCH";

export interface IndicatorSignal {
  name: string;
  weight: number;
  signal: SignalDirection;
  reason: string;
}

// === 종합 신호 ===
export interface CompositeSignal {
  overall: OverallSignal;
  buyScore: number;   // 0-100
  sellScore: number;  // 0-100
  indicators: IndicatorSignal[];
}

// === OHLC 캔들 데이터 ===
export interface OHLCData {
  time: string;  // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// === 종목 카드 전체 데이터 ===
export interface StockCardData {
  stock: StockData;
  indicators: Indicators;
  signal: CompositeSignal;
  sparkline: number[];
  candles: OHLCData[];
  grokNote?: string;
}

// === 팀 분석 ===
export interface TeamNote {
  analyst: string;
  emoji: string;
  role: string;
  note: string;
  updatedAt: string;
}

// === 앱 상태 (localStorage) ===
export interface AppState {
  tabs: Tab[];
  activeTabId: string;
  selectedTicker: string | null;
  teamNotes: Record<string, TeamNote[]>;  // ticker -> notes
}

// === 검색용 티커 ===
export interface TickerInfo {
  ticker: string;
  name: string;
  sector: string;
}
