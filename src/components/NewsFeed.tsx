"use client";

import { useState } from "react";
import { type NewsItem, timeAgo } from "@/lib/news";

interface NewsFeedProps {
  ticker: string;
  news: NewsItem[];
  loading?: boolean;
}

export default function NewsFeed({ ticker, news, loading }: NewsFeedProps) {
  const [expanded, setExpanded] = useState(false);
  const displayNews = expanded ? news : news.slice(0, 3);

  if (loading) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[--text-secondary] mb-3">
          📰 {ticker} 최근 뉴스
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-[--bg-primary]/50 animate-pulse">
              <div className="h-3 bg-[--border] rounded w-1/3 mb-2" />
              <div className="h-4 bg-[--border] rounded w-full mb-1" />
              <div className="h-3 bg-[--border] rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[--text-secondary] mb-3">
          📰 {ticker} 최근 뉴스
        </h3>
        <p className="text-sm text-[--text-muted]">뉴스가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-[--text-secondary] mb-4">
        📰 {ticker} 최근 뉴스
      </h3>

      <div className="space-y-3">
        {displayNews.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>

      {news.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-[--color-accent] hover:underline"
        >
          {expanded ? "접기" : `더 보기 (${news.length - 3}건)`}
        </button>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const sentimentColor =
    item.sentiment === "positive"
      ? "--color-buy"
      : item.sentiment === "negative"
        ? "--color-sell"
        : "--color-neutral";

  const sentimentEmoji =
    item.sentiment === "positive" ? "🟢" :
    item.sentiment === "negative" ? "🔴" : "🟡";

  const sentimentLabel =
    item.sentiment === "positive" ? "긍정" :
    item.sentiment === "negative" ? "부정" : "중립";

  // 감성 바 계산 (10칸)
  const filled = Math.round(item.sentimentScore / 10);
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);

  return (
    <a
      href={item.url !== "#" ? item.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg bg-[--bg-primary]/50 hover:bg-[--bg-primary]/80 transition-colors"
    >
      {/* 헤더: 감성 + 시간 + 출처 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs">{sentimentEmoji}</span>
        <span className="text-xs text-[--text-muted]">
          {timeAgo(item.datetime)} — {item.source}
        </span>
        {item.isUrgent && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[--color-sell]/20 text-[--color-sell] font-medium">
            긴급
          </span>
        )}
      </div>

      {/* 헤드라인 */}
      <p className="text-sm text-[--text-primary] font-medium leading-snug mb-1.5">
        {item.headline}
      </p>

      {/* 감성 바 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[--text-muted]">감성:</span>
        <span className="text-xs" style={{ color: `var(${sentimentColor})` }}>
          {sentimentLabel}
        </span>
        <span
          className="text-[10px] font-mono tracking-tighter"
          style={{ color: `var(${sentimentColor})` }}
        >
          {bar}
        </span>
        <span className="text-xs text-[--text-muted]">{item.sentimentScore}%</span>
      </div>

      {/* 키워드 태그 */}
      {item.matchedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {item.matchedKeywords.slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-[--border] text-[--text-muted]"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
