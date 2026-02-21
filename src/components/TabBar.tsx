"use client";

import { useState, useRef, useEffect } from "react";
import { useQuantumLeap } from "@/lib/store";

export default function TabBar() {
  const { state, setActiveTab, addTab, deleteTab, renameTab } =
    useQuantumLeap();
  const { tabs, activeTabId } = state;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 편집 모드 시 input 포커스
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleDoubleClick = (tabId: string, currentName: string) => {
    setEditingId(tabId);
    setEditValue(currentName);
  };

  const handleRenameSubmit = () => {
    if (editingId && editValue.trim()) {
      renameTab(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length <= 1) {
      alert("\uCD5C\uC18C 1\uAC1C \uD0ED\uC740 \uC720\uC9C0\uD574\uC57C \uD569\uB2C8\uB2E4.");
      return;
    }
    if (confirm("\uC774 \uD0ED\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
      deleteTab(tabId);
    }
  };

  const handleAddTab = () => {
    const name = prompt("\uC0C8 \uD0ED \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694:");
    if (name && name.trim()) {
      addTab(name.trim());
    }
  };

  // 정렬된 탭
  const sortedTabs = [...tabs].sort((a, b) => a.order - b.order);

  return (
    <div className="glass-card mx-4 mt-4 sm:mx-6">
      <div className="flex items-center overflow-x-auto scrollbar-thin">
        {sortedTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = tab.id === editingId;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onDoubleClick={() => handleDoubleClick(tab.id, tab.name)}
              className={`
                group relative flex items-center gap-1.5 px-4 py-3
                text-sm whitespace-nowrap transition-colors
                border-b-2 shrink-0
                ${
                  isActive
                    ? "border-[var(--color-accent)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }
              `}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="bg-transparent border border-[var(--color-accent)] rounded px-1 py-0.5 text-sm w-32 outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span>{tab.name}</span>
              )}

              {/* X 삭제 버튼 */}
              {!isEditing && (
                <span
                  onClick={(e) => handleDelete(e, tab.id)}
                  className="
                    opacity-0 group-hover:opacity-100
                    ml-1 w-4 h-4 flex items-center justify-center
                    rounded-full text-xs
                    text-[var(--text-muted)] hover:text-[var(--color-sell)]
                    hover:bg-[var(--color-sell)]/10
                    transition-all cursor-pointer
                  "
                  role="button"
                  aria-label={`${tab.name} \uD0ED \uC0AD\uC81C`}
                >
                  ×
                </span>
              )}
            </button>
          );
        })}

        {/* + 새 탭 추가 */}
        <button
          onClick={handleAddTab}
          className="
            shrink-0 px-4 py-3 text-sm
            text-[var(--text-muted)] hover:text-[var(--color-accent)]
            transition-colors
          "
          aria-label="\uC0C8 \uD0ED \uCD94\uAC00"
        >
          +
        </button>
      </div>
    </div>
  );
}
