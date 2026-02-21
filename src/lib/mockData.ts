/**
 * mockData.ts — 퀀텀리프 시드 종목 목업 데이터
 * QUANT(📊) 작성 | 2026-02-22
 *
 * 7개 시드 종목 + 50개 검색용 티커 목록
 * signals.ts의 calculateCompositeSignal()로 신호를 동적 산출
 */

import type {
  StockData,
  Indicators,
  StockCardData,
  OHLCData,
  TickerInfo,
} from "./types";
import { calculateCompositeSignal } from "./signals";

// ─── 유틸: 스파크라인 & 캔들 생성 ──────────────────────

/** 30일 날짜 배열 (2026-01-20 ~ 2026-02-18) */
function generateDates(): string[] {
  const dates: string[] = [];
  const start = new Date("2026-01-20");
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

const DATES = generateDates();

/**
 * 시드 기반 의사난수 생성기 (Mulberry32)
 * 종목마다 동일 데이터를 보장하면서도 현실적 분포를 만든다.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 티커 문자열을 숫자 시드로 변환 */
function tickerToSeed(ticker: string): number {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) {
    h = (Math.imul(31, h) + ticker.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * 현실적인 30일 OHLC + 스파크라인 생성
 * 브라운 운동(random walk) + 평균 회귀 성분
 */
function generateCandlesAndSparkline(
  basePrice: number,
  volatility: number,
  trend: number, // -1 ~ +1, 기간 방향성
  ticker: string
): { candles: OHLCData[]; sparkline: number[] } {
  const rand = mulberry32(tickerToSeed(ticker));
  const candles: OHLCData[] = [];
  const sparkline: number[] = [];

  let price = basePrice * (0.95 + rand() * 0.1); // 시작가 ±5%

  for (let i = 0; i < 30; i++) {
    const dailyTrend = trend * 0.003; // 일일 추세 성분
    const noise = (rand() - 0.5) * volatility * 2; // 랜덤 노이즈
    const meanRevert = (basePrice - price) * 0.02; // 평균 회귀
    const change = dailyTrend * price + noise * price + meanRevert;

    const open = price;
    const close = Math.max(0.01, price + change);

    // 고가/저가: 장중 변동
    const intraHigh = Math.max(open, close) * (1 + rand() * volatility * 0.5);
    const intraLow = Math.min(open, close) * (1 - rand() * volatility * 0.5);

    // 거래량: 기본 + 변동 (큰 움직임 = 큰 거래량)
    const baseVol = basePrice < 5 ? 2_000_000 : basePrice < 15 ? 800_000 : 400_000;
    const volMultiplier = 1 + Math.abs(change / price) * 20 + rand() * 0.6;
    const volume = Math.round(baseVol * volMultiplier);

    candles.push({
      time: DATES[i],
      open: round2(open),
      high: round2(intraHigh),
      low: round2(intraLow),
      close: round2(close),
      volume,
    });

    sparkline.push(round2(close));
    price = close;
  }

  return { candles, sparkline };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── 7개 시드 종목 정의 ─────────────────────────────────

interface SeedConfig {
  ticker: string;
  name: string;
  sector: string;
  basePrice: number;
  volatility: number;
  trend: number;
  indicators: Indicators;
  grokNote: string;
}

const SEED_CONFIGS: SeedConfig[] = [
  // ── AISP: BUY 신호 (RSI 과매도 + MACD 골든 + 일목 구름 위) ──
  {
    ticker: "AISP",
    name: "Airship AI Holdings",
    sector: "AI/영상분석",
    basePrice: 3.12,
    volatility: 0.045,
    trend: 0.3,
    indicators: {
      rsi: 28.5,
      macd: { macd: 0.08, signal: 0.02, histogram: 0.06 },
      bollingerBands: { upper: 3.60, middle: 3.20, lower: 2.80 },
      ichimoku: { tenkan: 3.15, kijun: 3.05, senkouA: 2.95, senkouB: 2.90 },
      sma: { sma20: 3.05, sma50: 3.10, sma200: 2.85 },
    },
    grokNote: "내부자 매수 클러스터 포착. AI 영상분석 DoD 계약 파이프라인 확대 중. 현 가격대 저점 매집 구간으로 판단.",
  },

  // ── AXTI: WATCH (중립 — RSI 중간, 볼린저 내부) ──
  {
    ticker: "AXTI",
    name: "AXT Inc.",
    sector: "반도체 기판",
    basePrice: 8.25,
    volatility: 0.030,
    trend: 0.1,
    indicators: {
      rsi: 52.3,
      macd: { macd: 0.12, signal: 0.10, histogram: 0.02 },
      bollingerBands: { upper: 9.10, middle: 8.30, lower: 7.50 },
      ichimoku: { tenkan: 8.30, kijun: 8.20, senkouA: 8.00, senkouB: 8.15 },
      sma: { sma20: 8.15, sma50: 8.05, sma200: 7.80 },
    },
    grokNote: "화합물 반도체(InP) 기판 수요 회복세. 목표가 $11로 상향 조정. 다만 단기 모멘텀 부재.",
  },

  // ── BBAI: SELL 신호 (RSI 과매수 + MACD 데드 + 구름 아래) ──
  {
    ticker: "BBAI",
    name: "BigBear.ai Holdings",
    sector: "AI/의사결정",
    basePrice: 4.15,
    volatility: 0.055,
    trend: -0.4,
    indicators: {
      rsi: 74.2,
      macd: { macd: -0.15, signal: -0.05, histogram: -0.10 },
      bollingerBands: { upper: 4.50, middle: 4.10, lower: 3.70 },
      ichimoku: { tenkan: 3.95, kijun: 4.10, senkouA: 4.30, senkouB: 4.25 },
      sma: { sma20: 4.20, sma50: 4.00, sma200: 4.35 },
    },
    grokNote: "바이오메트릭스 사업 성장 주목하나, 과매수 영역 진입. 주가 급등 후 차익실현 압력 감지.",
  },

  // ── GRRR: BUY (구름 위 + 골든크로스 SMA + MACD 양) ──
  {
    ticker: "GRRR",
    name: "Gorilla Technology",
    sector: "AI/사이버보안",
    basePrice: 12.40,
    volatility: 0.035,
    trend: 0.5,
    indicators: {
      rsi: 58.7,
      macd: { macd: 0.35, signal: 0.15, histogram: 0.20 },
      bollingerBands: { upper: 13.50, middle: 12.30, lower: 11.10 },
      ichimoku: { tenkan: 12.50, kijun: 12.20, senkouA: 11.80, senkouB: 11.60 },
      sma: { sma20: 12.35, sma50: 12.00, sma200: 10.50 },
    },
    grokNote: "자사주 매입 프로그램 발표로 수급 개선. AI 보안 정부 계약 확대. 기술적으로 강한 상승 추세.",
  },

  // ── POET: WATCH (혼합 신호 — 일부 매수/일부 매도) ──
  {
    ticker: "POET",
    name: "POET Technologies",
    sector: "포토닉스/반도체",
    basePrice: 7.10,
    volatility: 0.040,
    trend: -0.1,
    indicators: {
      rsi: 45.8,
      macd: { macd: -0.05, signal: -0.08, histogram: 0.03 },
      bollingerBands: { upper: 7.90, middle: 7.15, lower: 6.40 },
      ichimoku: { tenkan: 7.00, kijun: 7.10, senkouA: 7.25, senkouB: 7.05 },
      sma: { sma20: 7.05, sma50: 7.20, sma200: 6.80 },
    },
    grokNote: "광학 인터커넥트 기술 파트너십 임박 루머. 데이터센터 병목 해결 잠재력 높으나 실적 확인 필요.",
  },

  // ── VECO: WATCH (RSI 중립, 볼린저 상단 접근) ──
  {
    ticker: "VECO",
    name: "Veeco Instruments",
    sector: "반도체 장비",
    basePrice: 30.50,
    volatility: 0.025,
    trend: 0.2,
    indicators: {
      rsi: 61.4,
      macd: { macd: 0.45, signal: 0.40, histogram: 0.05 },
      bollingerBands: { upper: 32.80, middle: 30.20, lower: 27.60 },
      ichimoku: { tenkan: 30.60, kijun: 30.00, senkouA: 29.50, senkouB: 29.80 },
      sma: { sma20: 30.40, sma50: 29.80, sma200: 28.50 },
    },
    grokNote: "MOCVD 장비 수주 HPC/AI칩 수요와 직결. 실적 안정적이나 벨류에이션 부담. 눌림목 매수 전략 추천.",
  },

  // ── ATOM: SELL (데드크로스 SMA + 구름 아래 + MACD 약세) ──
  {
    ticker: "ATOM",
    name: "Atomera Inc.",
    sector: "반도체 소재",
    basePrice: 10.20,
    volatility: 0.042,
    trend: -0.3,
    indicators: {
      rsi: 38.1,
      macd: { macd: -0.22, signal: -0.10, histogram: -0.12 },
      bollingerBands: { upper: 11.50, middle: 10.40, lower: 9.30 },
      ichimoku: { tenkan: 10.00, kijun: 10.30, senkouA: 10.60, senkouB: 10.50 },
      sma: { sma20: 10.15, sma50: 10.00, sma200: 10.80 },
    },
    grokNote: "GAA 전환 수혜 기대감 있으나 매출 가시성 부족. 기술적으로 하락 추세 지속. 확실한 바닥 확인 후 진입 권장.",
  },
];

// ─── 종목 데이터 생성 ───────────────────────────────────

function buildStockCardData(config: SeedConfig): StockCardData {
  const { candles, sparkline } = generateCandlesAndSparkline(
    config.basePrice,
    config.volatility,
    config.trend,
    config.ticker
  );

  // 최종 종가를 현재가로 사용
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const price = lastCandle.close;
  const change = round2(price - prevCandle.close);
  const changePercent = round2((change / prevCandle.close) * 100);

  const stock: StockData = {
    ticker: config.ticker,
    name: config.name,
    sector: config.sector,
    price,
    change,
    changePercent,
    volume: lastCandle.volume,
    updatedAt: "2026-02-21T16:00:00Z",
  };

  const signal = calculateCompositeSignal(price, config.indicators);

  return {
    stock,
    indicators: config.indicators,
    signal,
    sparkline,
    candles,
    grokNote: config.grokNote,
  };
}

// ─── 시드 종목 데이터 (즉시 계산) ───────────────────────

export const SEED_STOCKS: StockCardData[] = SEED_CONFIGS.map(buildStockCardData);

/**
 * 티커로 종목 데이터를 조회한다.
 * 시드 종목이면 캐시된 데이터 반환, 아니면 null.
 */
export function getStockData(ticker: string): StockCardData | null {
  return SEED_STOCKS.find((s) => s.stock.ticker === ticker) ?? null;
}

// ─── 검색용 티커 목록 (50개+) ───────────────────────────

export const TICKER_LIST: TickerInfo[] = [
  // ── 시드 종목 7개 ──
  { ticker: "AISP", name: "Airship AI Holdings", sector: "AI/영상분석" },
  { ticker: "AXTI", name: "AXT Inc.", sector: "반도체 기판" },
  { ticker: "BBAI", name: "BigBear.ai Holdings", sector: "AI/의사결정" },
  { ticker: "GRRR", name: "Gorilla Technology", sector: "AI/사이버보안" },
  { ticker: "POET", name: "POET Technologies", sector: "포토닉스/반도체" },
  { ticker: "VECO", name: "Veeco Instruments", sector: "반도체 장비" },
  { ticker: "ATOM", name: "Atomera Inc.", sector: "반도체 소재" },

  // ── 빅테크 ──
  { ticker: "AAPL", name: "Apple Inc.", sector: "테크/소비전자" },
  { ticker: "MSFT", name: "Microsoft Corp.", sector: "테크/클라우드" },
  { ticker: "GOOGL", name: "Alphabet Inc.", sector: "테크/광고" },
  { ticker: "AMZN", name: "Amazon.com Inc.", sector: "테크/이커머스" },
  { ticker: "META", name: "Meta Platforms", sector: "테크/소셜미디어" },
  { ticker: "TSLA", name: "Tesla Inc.", sector: "EV/에너지" },

  // ── AI/반도체 핵심 ──
  { ticker: "NVDA", name: "NVIDIA Corp.", sector: "반도체/AI GPU" },
  { ticker: "AMD", name: "Advanced Micro Devices", sector: "반도체/CPU" },
  { ticker: "INTC", name: "Intel Corp.", sector: "반도체/CPU" },
  { ticker: "AVGO", name: "Broadcom Inc.", sector: "반도체/네트워킹" },
  { ticker: "QCOM", name: "Qualcomm Inc.", sector: "반도체/모바일" },
  { ticker: "TSM", name: "TSMC", sector: "반도체/파운드리" },
  { ticker: "ASML", name: "ASML Holding", sector: "반도체 장비/EUV" },
  { ticker: "MU", name: "Micron Technology", sector: "메모리 반도체" },
  { ticker: "MRVL", name: "Marvell Technology", sector: "반도체/데이터센터" },
  { ticker: "ARM", name: "Arm Holdings", sector: "반도체/IP" },

  // ── AI 소프트웨어 ──
  { ticker: "PLTR", name: "Palantir Technologies", sector: "AI/데이터분석" },
  { ticker: "AI", name: "C3.ai Inc.", sector: "AI/엔터프라이즈" },
  { ticker: "SNOW", name: "Snowflake Inc.", sector: "클라우드/데이터" },
  { ticker: "DDOG", name: "Datadog Inc.", sector: "클라우드/모니터링" },
  { ticker: "PATH", name: "UiPath Inc.", sector: "AI/RPA" },
  { ticker: "UPST", name: "Upstart Holdings", sector: "AI/핀테크" },
  { ticker: "SOUN", name: "SoundHound AI", sector: "AI/음성인식" },

  // ── 반도체 장비/소재 ──
  { ticker: "AMAT", name: "Applied Materials", sector: "반도체 장비" },
  { ticker: "LRCX", name: "Lam Research", sector: "반도체 장비/식각" },
  { ticker: "KLAC", name: "KLA Corp.", sector: "반도체 장비/검사" },
  { ticker: "ONTO", name: "Onto Innovation", sector: "반도체 장비/계측" },
  { ticker: "ENTG", name: "Entegris Inc.", sector: "반도체 소재" },
  { ticker: "CAMT", name: "Camtek Ltd.", sector: "반도체 장비/검사" },

  // ── 사이버보안 ──
  { ticker: "CRWD", name: "CrowdStrike Holdings", sector: "사이버보안" },
  { ticker: "PANW", name: "Palo Alto Networks", sector: "사이버보안" },
  { ticker: "ZS", name: "Zscaler Inc.", sector: "사이버보안/제로트러스트" },
  { ticker: "FTNT", name: "Fortinet Inc.", sector: "사이버보안" },
  { ticker: "S", name: "SentinelOne Inc.", sector: "사이버보안/AI" },

  // ── 클라우드/SaaS ──
  { ticker: "CRM", name: "Salesforce Inc.", sector: "클라우드/CRM" },
  { ticker: "NOW", name: "ServiceNow Inc.", sector: "클라우드/ITSM" },
  { ticker: "NET", name: "Cloudflare Inc.", sector: "클라우드/CDN" },
  { ticker: "SHOP", name: "Shopify Inc.", sector: "이커머스/플랫폼" },

  // ── 양자컴퓨팅/첨단 ──
  { ticker: "IONQ", name: "IonQ Inc.", sector: "양자컴퓨팅" },
  { ticker: "RGTI", name: "Rigetti Computing", sector: "양자컴퓨팅" },
  { ticker: "QUBT", name: "Quantum Computing", sector: "양자컴퓨팅" },

  // ── 데이터센터/인프라 ──
  { ticker: "SMCI", name: "Super Micro Computer", sector: "서버/AI인프라" },
  { ticker: "DELL", name: "Dell Technologies", sector: "서버/PC" },
  { ticker: "HPE", name: "Hewlett Packard Enterprise", sector: "서버/엣지" },
  { ticker: "VRT", name: "Vertiv Holdings", sector: "데이터센터/냉각" },

  // ── 로봇/자동화 ──
  { ticker: "ISRG", name: "Intuitive Surgical", sector: "로봇/의료" },
  { ticker: "RKLB", name: "Rocket Lab USA", sector: "우주/로켓" },
];
