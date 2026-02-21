/**
 * signals.ts — 퀀텀리프 기술 지표 신호 판정 엔진
 * QUANT(📊) 작성 | 2026-02-22
 *
 * 5개 지표 가중치:
 *   RSI(14)       20%
 *   MACD          25%
 *   볼린저밴드     15%
 *   일목균형표     25%
 *   SMA           15%
 *
 * 종합: buyScore >= 60 → BUY, sellScore >= 60 → SELL, 그 외 → WATCH
 */

import type {
  Indicators,
  IndicatorSignal,
  CompositeSignal,
  SignalDirection,
  OverallSignal,
  MACDData,
  BollingerBands,
  IchimokuData,
  SMAData,
} from "./types";

// ─── 개별 지표 판정 ─────────────────────────────────────

/**
 * RSI(14) 판정
 * < 30  → BUY  (과매도)
 * > 70  → SELL (과매수)
 * 그 외 → NEUTRAL
 */
export function evaluateRSI(rsi: number): IndicatorSignal {
  const rounded = Math.round(rsi * 10) / 10;

  if (rsi < 30) {
    return {
      name: "RSI(14)",
      weight: 20,
      signal: "BUY",
      reason: `RSI ${rounded} — 과매도 구간, 반등 가능성`,
    };
  }
  if (rsi > 70) {
    return {
      name: "RSI(14)",
      weight: 20,
      signal: "SELL",
      reason: `RSI ${rounded} — 과매수 구간, 조정 가능성`,
    };
  }

  // 중립 세부 구간 안내
  if (rsi < 40) {
    return {
      name: "RSI(14)",
      weight: 20,
      signal: "NEUTRAL",
      reason: `RSI ${rounded} — 중립 하단, 매수 관심 구간 접근 중`,
    };
  }
  if (rsi > 60) {
    return {
      name: "RSI(14)",
      weight: 20,
      signal: "NEUTRAL",
      reason: `RSI ${rounded} — 중립 상단, 과매수 주의 구간 접근 중`,
    };
  }
  return {
    name: "RSI(14)",
    weight: 20,
    signal: "NEUTRAL",
    reason: `RSI ${rounded} — 중립 구간, 방향성 미확정`,
  };
}

/**
 * MACD 판정
 * 히스토그램이 양→음 (현재 음수이고 절대값이 커지는 중) → SELL (데드크로스)
 * 히스토그램이 음→양 (현재 양수이고 절대값이 커지는 중) → BUY  (골든크로스)
 *
 * 단순화: histogram > 0 이면 매수 우위, < 0 이면 매도 우위
 * 크로스 판별을 위해 histogram 부호 + macd와 signal 관계를 함께 봄
 */
export function evaluateMACD(macd: MACDData): IndicatorSignal {
  const { macd: macdLine, signal, histogram } = macd;
  const histRounded = Math.round(histogram * 1000) / 1000;

  // 골든크로스: MACD선이 시그널선 위로 돌파 (histogram 양수 전환)
  if (histogram > 0 && macdLine > signal) {
    const strength = histogram > 0.5 ? "강한" : "초기";
    return {
      name: "MACD",
      weight: 25,
      signal: "BUY",
      reason: `MACD 골든크로스 (히스토그램 ${histRounded}) — ${strength} 상승 모멘텀`,
    };
  }

  // 데드크로스: MACD선이 시그널선 아래로 하락 (histogram 음수 전환)
  if (histogram < 0 && macdLine < signal) {
    const strength = histogram < -0.5 ? "강한" : "초기";
    return {
      name: "MACD",
      weight: 25,
      signal: "SELL",
      reason: `MACD 데드크로스 (히스토그램 ${histRounded}) — ${strength} 하락 모멘텀`,
    };
  }

  return {
    name: "MACD",
    weight: 25,
    signal: "NEUTRAL",
    reason: `MACD 히스토그램 ${histRounded} — 교차 직전, 방향 전환 대기`,
  };
}

/**
 * 볼린저밴드 판정
 * 가격 < 하단밴드 → BUY  (과매도 이탈)
 * 가격 > 상단밴드 → SELL (과매수 이탈)
 * 그 외 → NEUTRAL
 */
export function evaluateBollinger(
  price: number,
  bb: BollingerBands
): IndicatorSignal {
  const { upper, middle, lower } = bb;
  const priceStr = price.toFixed(2);

  if (price < lower) {
    const deviation = (((lower - price) / lower) * 100).toFixed(1);
    return {
      name: "볼린저밴드",
      weight: 15,
      signal: "BUY",
      reason: `가격 $${priceStr}이 하단밴드($${lower.toFixed(2)}) 하회 (${deviation}% 이탈) — 반등 기대`,
    };
  }

  if (price > upper) {
    const deviation = (((price - upper) / upper) * 100).toFixed(1);
    return {
      name: "볼린저밴드",
      weight: 15,
      signal: "SELL",
      reason: `가격 $${priceStr}이 상단밴드($${upper.toFixed(2)}) 상회 (${deviation}% 이탈) — 과열 주의`,
    };
  }

  // 밴드 내 위치 파악
  const bandWidth = upper - lower;
  const position = bandWidth > 0 ? ((price - lower) / bandWidth) * 100 : 50;
  const posStr = Math.round(position);

  if (position < 30) {
    return {
      name: "볼린저밴드",
      weight: 15,
      signal: "NEUTRAL",
      reason: `밴드 하단 ${posStr}% 위치 — 하단 접근 중, 매수 관심`,
    };
  }
  if (position > 70) {
    return {
      name: "볼린저밴드",
      weight: 15,
      signal: "NEUTRAL",
      reason: `밴드 상단 ${posStr}% 위치 — 상단 접근 중, 차익실현 고려`,
    };
  }
  return {
    name: "볼린저밴드",
    weight: 15,
    signal: "NEUTRAL",
    reason: `밴드 중앙 ${posStr}% 위치 — 밴드 내 정상 범위`,
  };
}

/**
 * 일목균형표 판정
 * 가격 > senkouA AND 가격 > senkouB → BUY  (구름 위)
 * 가격 < senkouA AND 가격 < senkouB → SELL (구름 아래)
 * 그 외 → NEUTRAL (구름 내부)
 */
export function evaluateIchimoku(
  price: number,
  ichimoku: IchimokuData
): IndicatorSignal {
  const { tenkan, kijun, senkouA, senkouB } = ichimoku;
  const cloudTop = Math.max(senkouA, senkouB);
  const cloudBottom = Math.min(senkouA, senkouB);

  if (price > senkouA && price > senkouB) {
    const aboveCloud = (((price - cloudTop) / cloudTop) * 100).toFixed(1);
    const tenkanCross = tenkan > kijun ? "전환선>기준선 (강세)" : "전환선<기준선 (주의)";
    return {
      name: "일목균형표",
      weight: 25,
      signal: "BUY",
      reason: `구름 상단 +${aboveCloud}% 위 — ${tenkanCross}, 상승 추세 유지`,
    };
  }

  if (price < senkouA && price < senkouB) {
    const belowCloud = (((cloudBottom - price) / cloudBottom) * 100).toFixed(1);
    const tenkanCross = tenkan < kijun ? "전환선<기준선 (약세)" : "전환선>기준선 (반등 조짐)";
    return {
      name: "일목균형표",
      weight: 25,
      signal: "SELL",
      reason: `구름 하단 -${belowCloud}% 아래 — ${tenkanCross}, 하락 추세`,
    };
  }

  // 구름 내부
  const cloudWidth = cloudTop - cloudBottom;
  const posInCloud = cloudWidth > 0
    ? Math.round(((price - cloudBottom) / cloudWidth) * 100)
    : 50;
  return {
    name: "일목균형표",
    weight: 25,
    signal: "NEUTRAL",
    reason: `구름 내부 ${posInCloud}% 위치 — 추세 전환 구간, 돌파 방향 주시`,
  };
}

/**
 * SMA(이동평균) 판정
 * sma50 > sma200 → BUY  (골든크로스)
 * sma50 < sma200 → SELL (데드크로스)
 */
export function evaluateSMA(price: number, sma: SMAData): IndicatorSignal {
  const { sma20, sma50, sma200 } = sma;
  const gap = (((sma50 - sma200) / sma200) * 100).toFixed(2);

  if (sma50 > sma200) {
    const priceAboveSma20 = price > sma20;
    const momentum = priceAboveSma20 ? "단기 모멘텀 양호" : "단기 조정 중이나 중기 추세 유지";
    return {
      name: "SMA",
      weight: 15,
      signal: "BUY",
      reason: `SMA50($${sma50.toFixed(2)}) > SMA200($${sma200.toFixed(2)}) 골든크로스 (+${gap}%) — ${momentum}`,
    };
  }

  if (sma50 < sma200) {
    const priceBelowSma20 = price < sma20;
    const momentum = priceBelowSma20 ? "단기 하락 가속" : "단기 반등 시도 중이나 중기 약세";
    return {
      name: "SMA",
      weight: 15,
      signal: "SELL",
      reason: `SMA50($${sma50.toFixed(2)}) < SMA200($${sma200.toFixed(2)}) 데드크로스 (${gap}%) — ${momentum}`,
    };
  }

  return {
    name: "SMA",
    weight: 15,
    signal: "NEUTRAL",
    reason: `SMA50 ≈ SMA200 — 이동평균 수렴 중, 큰 방향성 전환 임박 가능`,
  };
}

// ─── 종합 판정 ─────────────────────────────────────────

/**
 * 5개 지표의 가중치 합산으로 종합 매매 신호를 산출한다.
 *
 * buyScore  = BUY  신호를 가진 지표들의 weight 합 (0~100)
 * sellScore = SELL 신호를 가진 지표들의 weight 합 (0~100)
 *
 * buyScore  >= 60 → BUY
 * sellScore >= 60 → SELL
 * 그 외 → WATCH
 */
export function calculateCompositeSignal(
  price: number,
  indicators: Indicators
): CompositeSignal {
  const signals: IndicatorSignal[] = [
    evaluateRSI(indicators.rsi),
    evaluateMACD(indicators.macd),
    evaluateBollinger(price, indicators.bollingerBands),
    evaluateIchimoku(price, indicators.ichimoku),
    evaluateSMA(price, indicators.sma),
  ];

  let buyScore = 0;
  let sellScore = 0;

  for (const s of signals) {
    if (s.signal === "BUY") buyScore += s.weight;
    if (s.signal === "SELL") sellScore += s.weight;
  }

  let overall: OverallSignal;
  if (buyScore >= 60) {
    overall = "BUY";
  } else if (sellScore >= 60) {
    overall = "SELL";
  } else {
    overall = "WATCH";
  }

  return {
    overall,
    buyScore,
    sellScore,
    indicators: signals,
  };
}
