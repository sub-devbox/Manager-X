"use client";

import React, { useState, useCallback, useRef } from "react";

export function useResizableColumns(
  storageKey: string,
  initialColumns: Record<string, number>,
  minWidths: Record<string, number> = {}
) {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...initialColumns, ...parsed };
        }
      } catch {}
    }
    return initialColumns;
  });

  const resizingRef = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const startResize = useCallback(
    (colKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startWidth = widths[colKey] || initialColumns[colKey] || 100;
      resizingRef.current = {
        colKey,
        startX: e.clientX,
        startWidth,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = moveEvent.clientX - resizingRef.current.startX;
        const minW = minWidths[colKey] || 50;
        const newWidth = Math.max(minW, resizingRef.current.startWidth + delta);

        setWidths((prev) => {
          const next = { ...prev, [colKey]: newWidth };
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {}
          return next;
        });
      };

      const handleMouseUp = () => {
        resizingRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [widths, initialColumns, minWidths, storageKey]
  );

  const totalWidth = Object.values(widths).reduce((acc, curr) => acc + curr, 0);

  return { widths, startResize, totalWidth };
}

export function ResizeHandle({
  onMouseDown,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "8px",
        cursor: "col-resize",
        userSelect: "none",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title="Drag to resize column"
    >
      <div
        style={{
          width: "2px",
          height: "60%",
          backgroundColor: isHovered ? "var(--accent-blue)" : "var(--border-subtle)",
          opacity: isHovered ? 1 : 0.35,
          borderRadius: "1px",
          transition: "all 0.15s ease",
        }}
      />
    </div>
  );
}
