"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import React from "react";
import type { AppState, Tab, TeamNote } from "./types";

// ── 상수 ──
const STORAGE_KEY = "quantum-leap-state";

// ── 초기 탭 데이터 ──
const DEFAULT_TABS: Tab[] = [
  {
    id: "ai-megatrend",
    name: "\uD83D\uDD25 AI \uBA54\uAC00\uD2B8\uB80C\uB4DC",
    order: 0,
    tickers: ["AISP", "AXTI", "BBAI", "GRRR"],
  },
  {
    id: "semiconductor",
    name: "\uD83D\uDD29 \uBC18\uB3C4\uCCB4 \uACF5\uAE09\uB9DD",
    order: 1,
    tickers: ["AXTI", "POET", "VECO", "ATOM"],
  },
  {
    id: "my-watchlist",
    name: "\u2B50 \uB0B4 \uAD00\uC2EC",
    order: 2,
    tickers: [],
  },
];

const DEFAULT_STATE: AppState = {
  tabs: DEFAULT_TABS,
  activeTabId: "ai-megatrend",
  selectedTicker: null,
  teamNotes: {},
};

// ── Context 타입 ──
interface QuantumLeapContextValue {
  state: AppState;
  // 탭 관련
  setActiveTab: (tabId: string) => void;
  addTab: (name: string) => void;
  deleteTab: (tabId: string) => void;
  renameTab: (tabId: string, newName: string) => void;
  reorderTabs: (tabs: Tab[]) => void;
  // 종목 관련
  addStock: (tabId: string, ticker: string) => void;
  removeStock: (tabId: string, ticker: string) => void;
  setSelectedTicker: (ticker: string | null) => void;
  // 팀 메모
  updateTeamNote: (
    ticker: string,
    analyst: string,
    note: string
  ) => void;
  getTeamNotes: (ticker: string) => TeamNote[];
}

const QuantumLeapContext = createContext<QuantumLeapContextValue | null>(null);

// ── localStorage 헬퍼 ──
function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as AppState;
    // 최소 검증: tabs 배열이 있어야 함
    if (!Array.isArray(parsed.tabs) || parsed.tabs.length === 0) {
      return DEFAULT_STATE;
    }
    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

// ── Provider ──
export function QuantumLeapProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // 클라이언트에서만 localStorage 로드 (SSR 안전)
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setHydrated(true);
  }, []);

  // 상태 변경될 때마다 저장
  useEffect(() => {
    if (hydrated) {
      saveState(state);
    }
  }, [state, hydrated]);

  // ── 탭 관련 ──
  const setActiveTab = useCallback((tabId: string) => {
    setState((prev) => ({
      ...prev,
      activeTabId: tabId,
      selectedTicker: null,
    }));
  }, []);

  const addTab = useCallback((name: string) => {
    setState((prev) => {
      const id = `tab-${Date.now()}`;
      const maxOrder = Math.max(...prev.tabs.map((t) => t.order), -1);
      const newTab: Tab = {
        id,
        name,
        order: maxOrder + 1,
        tickers: [],
      };
      return {
        ...prev,
        tabs: [...prev.tabs, newTab],
        activeTabId: id,
      };
    });
  }, []);

  const deleteTab = useCallback((tabId: string) => {
    setState((prev) => {
      const remaining = prev.tabs.filter((t) => t.id !== tabId);
      if (remaining.length === 0) return prev; // 최소 1개 탭 유지
      const newActive =
        prev.activeTabId === tabId ? remaining[0].id : prev.activeTabId;
      return {
        ...prev,
        tabs: remaining,
        activeTabId: newActive,
        selectedTicker:
          prev.activeTabId === tabId ? null : prev.selectedTicker,
      };
    });
  }, []);

  const renameTab = useCallback((tabId: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) =>
        t.id === tabId ? { ...t, name: newName } : t
      ),
    }));
  }, []);

  const reorderTabs = useCallback((tabs: Tab[]) => {
    setState((prev) => ({ ...prev, tabs }));
  }, []);

  // ── 종목 관련 ──
  const addStock = useCallback((tabId: string, ticker: string) => {
    setState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) =>
        t.id === tabId && !t.tickers.includes(ticker)
          ? { ...t, tickers: [...t.tickers, ticker] }
          : t
      ),
    }));
  }, []);

  const removeStock = useCallback((tabId: string, ticker: string) => {
    setState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) =>
        t.id === tabId
          ? { ...t, tickers: t.tickers.filter((tk) => tk !== ticker) }
          : t
      ),
      selectedTicker:
        prev.selectedTicker === ticker ? null : prev.selectedTicker,
    }));
  }, []);

  const setSelectedTicker = useCallback((ticker: string | null) => {
    setState((prev) => ({ ...prev, selectedTicker: ticker }));
  }, []);

  // ── 팀 메모 ──
  const DEFAULT_ANALYSTS: Omit<TeamNote, "note" | "updatedAt">[] = [
    { analyst: "Grok", emoji: "\uD83C\uDFAF", role: "\uB9AC\uB354" },
    { analyst: "Harper", emoji: "\uD83C\uDF0D", role: "\uB9E4\uD06C\uB85C" },
    { analyst: "Benjamin", emoji: "\uD83D\uDCB0", role: "\uD380\uB354\uBA58\uD138" },
    { analyst: "Lucas", emoji: "\uD83D\uDCCA", role: "\uAE30\uC220" },
  ];

  const getTeamNotes = useCallback(
    (ticker: string): TeamNote[] => {
      if (state.teamNotes[ticker]) return state.teamNotes[ticker];
      return DEFAULT_ANALYSTS.map((a) => ({
        ...a,
        note: "",
        updatedAt: "",
      }));
    },
    [state.teamNotes]
  );

  const updateTeamNote = useCallback(
    (ticker: string, analyst: string, note: string) => {
      setState((prev) => {
        const existing = prev.teamNotes[ticker] || getTeamNotes(ticker);
        const updated = existing.map((n) =>
          n.analyst === analyst
            ? { ...n, note, updatedAt: new Date().toISOString() }
            : n
        );
        return {
          ...prev,
          teamNotes: { ...prev.teamNotes, [ticker]: updated },
        };
      });
    },
    [getTeamNotes]
  );

  const value: QuantumLeapContextValue = {
    state,
    setActiveTab,
    addTab,
    deleteTab,
    renameTab,
    reorderTabs,
    addStock,
    removeStock,
    setSelectedTicker,
    updateTeamNote,
    getTeamNotes,
  };

  return React.createElement(
    QuantumLeapContext.Provider,
    { value },
    children
  );
}

// ── 커스텀 훅 ──
export function useQuantumLeap(): QuantumLeapContextValue {
  const ctx = useContext(QuantumLeapContext);
  if (!ctx) {
    throw new Error(
      "useQuantumLeap must be used within a QuantumLeapProvider"
    );
  }
  return ctx;
}
