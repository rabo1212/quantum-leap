"use client";

import { useQuantumLeap } from "@/lib/store";

interface TeamAnalysisProps {
  ticker: string;
}

export default function TeamAnalysis({ ticker }: TeamAnalysisProps) {
  const { getTeamNotes, updateTeamNote } = useQuantumLeap();
  const notes = getTeamNotes(ticker);

  return (
    <div className="px-4 mt-4 sm:px-6">
      <div className="glass-card p-4">
        <h3
          className="text-lg font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          퀀텀리프 팀 분석 — {ticker}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => (
            <div
              key={note.analyst}
              className="rounded-lg p-3"
              style={{ background: "var(--bg-primary)" }}
            >
              {/* 분석가 헤더 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{note.emoji}</span>
                  <div>
                    <span
                      className="text-sm font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {note.analyst}
                    </span>
                    <span
                      className="text-xs ml-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {note.role}
                    </span>
                  </div>
                </div>
                {note.updatedAt && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {new Date(note.updatedAt).toLocaleString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              {/* 메모 textarea */}
              <textarea
                value={note.note}
                onChange={(e) =>
                  updateTeamNote(ticker, note.analyst, e.target.value)
                }
                placeholder={`${note.analyst}의 ${note.role} 분석 메모...`}
                rows={3}
                className="
                  w-full px-3 py-2 rounded-md
                  bg-[var(--bg-card)] border border-[var(--border)]
                  text-sm text-[var(--text-primary)]
                  placeholder:text-[var(--text-muted)]
                  focus:outline-none focus:border-[var(--color-accent)]
                  transition-colors resize-none
                "
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
