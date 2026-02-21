// === 뉴스 피드 — Finnhub Company News + 감성 분석 ===

export interface NewsItem {
  id: number;
  ticker: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;      // unix timestamp
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number; // 0-100
  isUrgent: boolean;
  matchedKeywords: string[];
}

// === 감성 분석 키워드 ===
const POSITIVE_KEYWORDS = [
  "upgrade", "beat", "growth", "revenue up", "contract", "partnership",
  "buy", "outperform", "bullish", "record", "surge", "soar", "breakout",
  "approval", "award", "expansion", "profit", "exceeded", "strong",
  "insider buy", "raised", "positive", "upside", "momentum",
];

const NEGATIVE_KEYWORDS = [
  "downgrade", "miss", "decline", "dilution", "lawsuit", "sell",
  "warning", "layoff", "loss", "debt", "risk", "investigation",
  "insider sell", "cut", "negative", "bearish", "underperform",
  "weak", "delay", "recall", "fraud", "bankruptcy", "default",
];

// 텔레그램 즉시 알림 트리거 키워드
const URGENT_KEYWORDS = [
  "earnings", "revenue", "FDA", "approval", "contract",
  "insider buy", "insider sell", "upgrade", "downgrade",
  "acquisition", "merger", "SEC", "investigation",
];

// === 감성 분석 ===
export function analyzeSentiment(headline: string, summary: string): {
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  matchedKeywords: string[];
  isUrgent: boolean;
} {
  const text = `${headline} ${summary}`.toLowerCase();
  const matched: string[] = [];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const kw of POSITIVE_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      positiveCount++;
      matched.push(kw);
    }
  }

  for (const kw of NEGATIVE_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      negativeCount++;
      matched.push(kw);
    }
  }

  const total = positiveCount + negativeCount;
  let score: number;
  let sentiment: "positive" | "negative" | "neutral";

  if (total === 0) {
    score = 50;
    sentiment = "neutral";
  } else {
    score = Math.round((positiveCount / total) * 100);
    sentiment = score >= 60 ? "positive" : score <= 40 ? "negative" : "neutral";
  }

  // 긴급 뉴스 판별
  const isUrgent = URGENT_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));

  return { sentiment, score, matchedKeywords: matched, isUrgent };
}

// === Finnhub API 호출 ===
export async function fetchCompanyNews(
  ticker: string,
  fromDate: string,
  toDate: string,
  apiKey: string
): Promise<NewsItem[]> {
  const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();

  return data.slice(0, 10).map((item: Record<string, unknown>, idx: number) => {
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
}

// === 날짜 포맷 (몇 시간 전) ===
export function timeAgo(unixTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixTimestamp;

  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return `${Math.floor(diff / 604800)}주 전`;
}

// === 텔레그램 알림 포맷 ===
export function formatNewsAlert(news: NewsItem, price?: number, changePercent?: number): string {
  const sentimentEmoji = news.sentiment === "positive" ? "🟢" :
    news.sentiment === "negative" ? "🔴" : "🟡";

  const sentimentLabel = news.sentiment === "positive" ? "긍정" :
    news.sentiment === "negative" ? "부정" : "중립";

  const priceInfo = price
    ? `\n현재가: $${price.toFixed(2)} (${changePercent && changePercent >= 0 ? "▲" : "▼"}${changePercent?.toFixed(1)}%)`
    : "";

  return `━━━━━━━━━━━━━━━━━
📰 Quantum Leap 뉴스 속보
━━━━━━━━━━━━━━━━━
${sentimentEmoji} ${news.ticker} — ${news.source} (${timeAgo(news.datetime)})
"${news.headline}"
감성: ${sentimentLabel} (${news.sentimentScore}%)
키워드: ${news.matchedKeywords.join(", ") || "없음"}${priceInfo}
━━━━━━━━━━━━━━━━━
⚠️ 뉴스는 참고 자료입니다. 투자 판단은 본인 책임.
━━━━━━━━━━━━━━━━━`;
}

// === 목업 뉴스 데이터 ===
export const MOCK_NEWS: Record<string, NewsItem[]> = {
  AISP: [
    {
      id: 1, ticker: "AISP",
      headline: "Airship AI: Paul Allen's Estate Acquires 100K Shares",
      summary: "Major insider buying signals confidence in AI video analytics platform growth.",
      source: "MarketWatch", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 7200,
      sentiment: "positive", sentimentScore: 85, isUrgent: true,
      matchedKeywords: ["insider buy", "growth"],
    },
    {
      id: 2, ticker: "AISP",
      headline: "AI Video Analytics Market to Reach $15B by 2028",
      summary: "Industry report highlights strong growth trajectory for surveillance AI sector.",
      source: "Reuters", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 86400,
      sentiment: "positive", sentimentScore: 70, isUrgent: false,
      matchedKeywords: ["growth"],
    },
  ],
  AXTI: [
    {
      id: 3, ticker: "AXTI",
      headline: "AXT Q4 Revenue Surges 25% on AI Semiconductor Demand",
      summary: "Company reports record quarterly revenue driven by compound semiconductor substrate orders for AI applications.",
      source: "Reuters", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 3600,
      sentiment: "positive", sentimentScore: 90, isUrgent: true,
      matchedKeywords: ["revenue", "surge", "record"],
    },
    {
      id: 4, ticker: "AXTI",
      headline: "Wedbush Raises AXTI Price Target to $28 from $8.50",
      summary: "Analyst upgrade citing AI datacenter tailwinds and improved fundamentals.",
      source: "MarketWatch", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 18000,
      sentiment: "positive", sentimentScore: 80, isUrgent: true,
      matchedKeywords: ["upgrade", "raised"],
    },
    {
      id: 5, ticker: "AXTI",
      headline: "AXTI Executive Sells 10,000 Shares in Open Market",
      summary: "SEC filing reveals planned insider stock sale by VP of operations.",
      source: "SEC Filing", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 172800,
      sentiment: "negative", sentimentScore: 25, isUrgent: true,
      matchedKeywords: ["insider sell", "SEC"],
    },
  ],
  BBAI: [
    {
      id: 6, ticker: "BBAI",
      headline: "BigBear.ai Wins $50M Airport Biometrics Contract",
      summary: "Contract expansion with major US airports for AI-powered biometric screening.",
      source: "Business Wire", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 14400,
      sentiment: "positive", sentimentScore: 85, isUrgent: true,
      matchedKeywords: ["contract", "expansion"],
    },
  ],
  GRRR: [
    {
      id: 7, ticker: "GRRR",
      headline: "Gorilla Technology Announces $5M Share Buyback Program",
      summary: "Board authorizes stock repurchase program, signaling confidence in undervaluation.",
      source: "PR Newswire", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 28800,
      sentiment: "positive", sentimentScore: 75, isUrgent: false,
      matchedKeywords: ["bullish", "positive"],
    },
    {
      id: 8, ticker: "GRRR",
      headline: "Northland Raises GRRR Target to $40 from $35",
      summary: "Analyst sees strong cybersecurity demand driving revenue growth.",
      source: "Northland Capital", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 43200,
      sentiment: "positive", sentimentScore: 80, isUrgent: true,
      matchedKeywords: ["upgrade", "growth", "raised"],
    },
  ],
  POET: [
    {
      id: 9, ticker: "POET",
      headline: "POET Technologies Partners with Major Cloud Provider",
      summary: "Strategic partnership to integrate photonic interconnects into next-gen data centers.",
      source: "GlobeNewswire", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 36000,
      sentiment: "positive", sentimentScore: 80, isUrgent: true,
      matchedKeywords: ["partnership", "contract"],
    },
  ],
  VECO: [
    {
      id: 10, ticker: "VECO",
      headline: "Veeco Reports Strong Q4, Guides Higher on AI Chip Demand",
      summary: "MOCVD equipment maker beats estimates with AI/HPC tailwind. Revenue guidance raised.",
      source: "Barrons", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 50400,
      sentiment: "positive", sentimentScore: 85, isUrgent: true,
      matchedKeywords: ["beat", "strong", "revenue", "raised"],
    },
  ],
  ATOM: [
    {
      id: 11, ticker: "ATOM",
      headline: "Atomera Faces Delays in MST Technology Licensing",
      summary: "GAA transistor technology adoption slower than expected, timeline pushed to 2027.",
      source: "EE Times", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 72000,
      sentiment: "negative", sentimentScore: 30, isUrgent: false,
      matchedKeywords: ["delay", "weak"],
    },
    {
      id: 12, ticker: "ATOM",
      headline: "Atomera CFO Sells 5,000 Shares",
      summary: "Insider selling amid uncertain licensing timeline raises concerns.",
      source: "SEC Filing", url: "#",
      datetime: Math.floor(Date.now() / 1000) - 129600,
      sentiment: "negative", sentimentScore: 20, isUrgent: true,
      matchedKeywords: ["insider sell", "SEC"],
    },
  ],
};

// 종목별 뉴스 가져오기 (목업 or 실제)
export function getNewsForTicker(ticker: string): NewsItem[] {
  return MOCK_NEWS[ticker] || [];
}
