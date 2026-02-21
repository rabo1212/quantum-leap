import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";
const FH_KEY = process.env.FINNHUB_API_KEY || "";

// 서버 사이드 캐시 (프로세스 메모리)
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached(key: string, maxAgeMs: number): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < maxAgeMs) return entry.data;
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

// Alpha Vantage rate limit: 분당 5회 → 간격 두기
async function fetchAV(params: string): Promise<Record<string, unknown> | null> {
  try {
    const url = `https://www.alphavantage.co/query?${params}&apikey=${AV_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data["Note"] || data["Information"]) {
      console.warn("[AV] Rate limit:", data["Note"] || data["Information"]);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function fetchFH(path: string): Promise<unknown | null> {
  try {
    const url = `https://finnhub.io/api/v1${path}&token=${FH_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── 핸들러 ───

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "quote";
  const symbol = ticker.toUpperCase();

  try {
    switch (type) {
      // ── Finnhub: 실시간 가격 ──
      case "quote": {
        const cacheKey = `quote:${symbol}`;
        const cached = getCached(cacheKey, 60_000); // 1분 캐시
        if (cached) return NextResponse.json(cached);

        const data = await fetchFH(`/quote?symbol=${symbol}`);
        if (!data) return NextResponse.json({ error: "quote failed" }, { status: 502 });

        const q = data as Record<string, number>;
        const result = {
          price: q.c || 0,
          change: q.d || 0,
          changePercent: q.dp || 0,
          high: q.h || 0,
          low: q.l || 0,
          open: q.o || 0,
          prevClose: q.pc || 0,
          volume: 0, // Finnhub quote doesn't include volume
        };
        setCache(cacheKey, result);
        return NextResponse.json(result);
      }

      // ── 캔들 (일봉 30일): Finnhub → Alpha Vantage 폴백 ──
      case "candles": {
        const cacheKey = `candles:${symbol}`;
        const cached = getCached(cacheKey, 3_600_000); // 1시간 캐시
        if (cached) return NextResponse.json(cached);

        // 1) Finnhub 시도
        const now = Math.floor(Date.now() / 1000);
        const from = now - 30 * 86400;
        const fhData = await fetchFH(`/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${now}`);
        if (fhData && (fhData as Record<string, unknown>).s !== "no_data" && !(fhData as Record<string, unknown>).error) {
          const d = fhData as Record<string, number[]>;
          if (d.t && d.t.length > 0) {
            const candles = d.t.map((t: number, i: number) => ({
              time: new Date(t * 1000).toISOString().split("T")[0],
              open: d.o[i],
              high: d.h[i],
              low: d.l[i],
              close: d.c[i],
              volume: d.v[i],
            }));
            setCache(cacheKey, candles);
            return NextResponse.json(candles);
          }
        }

        // 2) Alpha Vantage 폴백 (TIME_SERIES_DAILY)
        const avData = await fetchAV(`function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact`);
        if (avData && avData["Time Series (Daily)"]) {
          const series = avData["Time Series (Daily)"] as Record<string, Record<string, string>>;
          const entries = Object.entries(series).slice(0, 30).reverse();
          const candles = entries.map(([date, vals]) => ({
            time: date,
            open: parseFloat(vals["1. open"]),
            high: parseFloat(vals["2. high"]),
            low: parseFloat(vals["3. low"]),
            close: parseFloat(vals["4. close"]),
            volume: parseInt(vals["5. volume"]),
          }));
          setCache(cacheKey, candles);
          return NextResponse.json(candles);
        }

        return NextResponse.json({ error: "no candle data" }, { status: 404 });
      }

      // ── Finnhub: 뉴스 ──
      case "news": {
        const cacheKey = `news:${symbol}`;
        const cached = getCached(cacheKey, 1_800_000); // 30분 캐시
        if (cached) return NextResponse.json(cached);

        const to = new Date().toISOString().split("T")[0];
        const fromDate = new Date(Date.now() - 7 * 86400_000).toISOString().split("T")[0];
        const data = await fetchFH(`/company-news?symbol=${symbol}&from=${fromDate}&to=${to}`);
        if (!data) return NextResponse.json([]);

        const news = (data as Array<Record<string, unknown>>).slice(0, 10);
        setCache(cacheKey, news);
        return NextResponse.json(news);
      }

      // ── Alpha Vantage: RSI ──
      case "rsi": {
        const cacheKey = `rsi:${symbol}`;
        const cached = getCached(cacheKey, 3_600_000);
        if (cached) return NextResponse.json(cached);

        const data = await fetchAV(`function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close`);
        if (!data || !data["Technical Analysis: RSI"]) {
          return NextResponse.json({ error: "rsi failed" }, { status: 502 });
        }

        const series = data["Technical Analysis: RSI"] as Record<string, Record<string, string>>;
        const latest = Object.values(series)[0];
        const result = { rsi: parseFloat(latest["RSI"]) };
        setCache(cacheKey, result);
        return NextResponse.json(result);
      }

      // ── Alpha Vantage: MACD ──
      case "macd": {
        const cacheKey = `macd:${symbol}`;
        const cached = getCached(cacheKey, 3_600_000);
        if (cached) return NextResponse.json(cached);

        const data = await fetchAV(`function=MACD&symbol=${symbol}&interval=daily&series_type=close`);
        if (!data || !data["Technical Analysis: MACD"]) {
          return NextResponse.json({ error: "macd failed" }, { status: 502 });
        }

        const series = data["Technical Analysis: MACD"] as Record<string, Record<string, string>>;
        const latest = Object.values(series)[0];
        const result = {
          macd: parseFloat(latest["MACD"]),
          signal: parseFloat(latest["MACD_Signal"]),
          histogram: parseFloat(latest["MACD_Hist"]),
        };
        setCache(cacheKey, result);
        return NextResponse.json(result);
      }

      // ── Alpha Vantage: Bollinger Bands ──
      case "bbands": {
        const cacheKey = `bbands:${symbol}`;
        const cached = getCached(cacheKey, 3_600_000);
        if (cached) return NextResponse.json(cached);

        const data = await fetchAV(`function=BBANDS&symbol=${symbol}&interval=daily&time_period=20&series_type=close`);
        if (!data || !data["Technical Analysis: BBANDS"]) {
          return NextResponse.json({ error: "bbands failed" }, { status: 502 });
        }

        const series = data["Technical Analysis: BBANDS"] as Record<string, Record<string, string>>;
        const latest = Object.values(series)[0];
        const result = {
          upper: parseFloat(latest["Real Upper Band"]),
          middle: parseFloat(latest["Real Middle Band"]),
          lower: parseFloat(latest["Real Lower Band"]),
        };
        setCache(cacheKey, result);
        return NextResponse.json(result);
      }

      // ── Alpha Vantage: SMA (20, 50, 200) ──
      case "sma": {
        const cacheKey = `sma:${symbol}`;
        const cached = getCached(cacheKey, 3_600_000);
        if (cached) return NextResponse.json(cached);

        // 3개 SMA를 순차 호출 (rate limit 대비)
        const periods = [20, 50, 200];
        const result: Record<string, number> = {};

        for (const p of periods) {
          const data = await fetchAV(`function=SMA&symbol=${symbol}&interval=daily&time_period=${p}&series_type=close`);
          if (data && data["Technical Analysis: SMA"]) {
            const series = data["Technical Analysis: SMA"] as Record<string, Record<string, string>>;
            const latest = Object.values(series)[0];
            result[`sma${p}`] = parseFloat(latest["SMA"]);
          }
          // Alpha Vantage rate limit 대비 0.5초 대기
          if (p !== 200) await new Promise((r) => setTimeout(r, 500));
        }

        setCache(cacheKey, result);
        return NextResponse.json(result);
      }

      // ── 전체 지표 한번에 (순차) ──
      case "indicators": {
        const cacheKey = `indicators:${symbol}`;
        const cached = getCached(cacheKey, 3_600_000);
        if (cached) return NextResponse.json(cached);

        // 순차 호출 (분당 5회 제한 대비)
        const base = new URL(request.url).origin;

        const rsiRes = await fetch(`${base}/api/stock/${symbol}?type=rsi`);
        const rsiData = rsiRes.ok ? await rsiRes.json() : null;

        await new Promise((r) => setTimeout(r, 300));

        const macdRes = await fetch(`${base}/api/stock/${symbol}?type=macd`);
        const macdData = macdRes.ok ? await macdRes.json() : null;

        await new Promise((r) => setTimeout(r, 300));

        const bbandsRes = await fetch(`${base}/api/stock/${symbol}?type=bbands`);
        const bbandsData = bbandsRes.ok ? await bbandsRes.json() : null;

        await new Promise((r) => setTimeout(r, 300));

        const smaRes = await fetch(`${base}/api/stock/${symbol}?type=sma`);
        const smaData = smaRes.ok ? await smaRes.json() : null;

        const result = {
          rsi: rsiData?.rsi ?? null,
          macd: macdData?.error ? null : macdData,
          bollingerBands: bbandsData?.error ? null : bbandsData,
          sma: smaData?.error ? null : smaData,
        };

        if (result.rsi !== null) setCache(cacheKey, result);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `unknown type: ${type}` }, { status: 400 });
    }
  } catch (err) {
    console.error(`[API] ${type} ${symbol} error:`, err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
