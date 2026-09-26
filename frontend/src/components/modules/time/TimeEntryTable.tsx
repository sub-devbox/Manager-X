"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TimeEntryData } from "@/types/time";
import { useResizableColumns, ResizeHandle } from "@/hooks/useResizableColumns";
import {
  Clock,
  FolderKanban,
  Building2,
  Calendar,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
} from "lucide-react";

interface TimeEntryTableProps {
  entries: TimeEntryData[];
  onEditEntry?: (entry: TimeEntryData) => void;
  onDeleteEntry?: (entry: TimeEntryData) => void;
}

type SortField = "date" | "project_task" | "client" | "duration";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

const DEFAULT_TIME_WIDTHS = {
  date: 160,
  project_task: 360,
  client: 180,
  duration: 150,
  actions: 80,
};

const MIN_TIME_WIDTHS = {
  date: 120,
  project_task: 180,
  client: 110,
  duration: 100,
  actions: 70,
};

export default function TimeEntryTable({
  entries,
  onEditEntry,
  onDeleteEntry,
}: TimeEntryTableProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const { widths, startResize, totalWidth } = useResizableColumns(
    "mx_col_widths_time_entries",
    DEFAULT_TIME_WIDTHS,
    MIN_TIME_WIDTHS
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc"); // default desc for date/time
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [entries.length]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date": {
          const dateA = new Date(a.start_time).getTime();
          const dateB = new Date(b.start_time).getTime();
          comparison = dateA - dateB;
          break;
        }
        case "project_task": {
          const valA = `${a.project_name || ""} ${a.task_title || ""}`;
          const valB = `${b.project_name || ""} ${b.task_title || ""}`;
          comparison = valA.localeCompare(valB, undefined, { sensitivity: "base" });
          break;
        }
        case "client": {
          const clientA = a.client_name || "";
          const clientB = b.client_name || "";
          comparison = clientA.localeCompare(clientB, undefined, { sensitivity: "base" });
          break;
        }
        case "duration": {
          comparison = a.duration_seconds - b.duration_seconds;
          break;
        }
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [entries, sortField, sortDirection]);

  // 50-interval pagination calculations
  const totalEntries = sortedEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalEntries);
  const currentBatch = sortedEntries.slice(startIndex, endIndex);

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours === 0 && minutes === 0) return `${totalSeconds}s`;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString.slice(0, 10);
    }
  };

  const formatTimeRange = (startIso: string, endIso?: string | null) => {
    try {
      const s = new Date(startIso);
      const sStr = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      if (!endIso) return `${sStr} — ongoing`;
      const e = new Date(endIso);
      const eStr = e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      return `${sStr} — ${eStr}`;
    } catch {
      return "";
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} style={{ opacity: 0.35 }} />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp size={12} style={{ color: "var(--accent-blue)" }} />
    ) : (
      <ChevronDown size={12} style={{ color: "var(--accent-blue)" }} />
    );
  };

  if (entries.length === 0) {
    return (
      <div
        className="finance-panel"
        style={{
          padding: "48px 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          background: "var(--bg-surface)",
        }}
      >
        <Clock size={32} style={{ color: "var(--text-dim)" }} />
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
          No time logs recorded
        </div>
        <div style={{ fontSize: "12.5px", color: "var(--text-muted)", maxWidth: "380px" }}>
          Start tracking time directly from any task in your task list or use the live stopwatch.
        </div>
      </div>
    );
  }

  return (
    <div
      className="finance-panel"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: totalWidth ? `${totalWidth}px` : "100%",
            minWidth: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            fontSize: "12px",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--bg-surface-subtle)",
                borderBottom: "1px solid var(--border-subtle)",
                height: "34px",
              }}
            >
              {/* 1. Date */}
              <th
                onClick={() => handleSort("date")}
                style={{
                  position: "relative",
                  width: `${widths.date}px`,
                  minWidth: `${MIN_TIME_WIDTHS.date}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "date" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Date</span>
                  {renderSortIndicator("date")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("date", e)} />
              </th>

              {/* 2. Project Name & Task */}
              <th
                onClick={() => handleSort("project_task")}
                style={{
                  position: "relative",
                  width: `${widths.project_task}px`,
                  minWidth: `${MIN_TIME_WIDTHS.project_task}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "project_task" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Project Name & Task</span>
                  {renderSortIndicator("project_task")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("project_task", e)} />
              </th>

              {/* 3. Client */}
              <th
                onClick={() => handleSort("client")}
                style={{
                  position: "relative",
                  width: `${widths.client}px`,
                  minWidth: `${MIN_TIME_WIDTHS.client}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "client" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Client</span>
                  {renderSortIndicator("client")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("client", e)} />
              </th>

              {/* 4. Duration */}
              <th
                onClick={() => handleSort("duration")}
                style={{
                  position: "relative",
                  width: `${widths.duration}px`,
                  minWidth: `${MIN_TIME_WIDTHS.duration}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "duration" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Duration</span>
                  {renderSortIndicator("duration")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("duration", e)} />
              </th>

              {/* 5. Actions */}
              <th
                style={{
                  position: "relative",
                  width: `${widths.actions}px`,
                  minWidth: `${MIN_TIME_WIDTHS.actions}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  textAlign: "right",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                <span>Actions</span>
                <ResizeHandle onMouseDown={(e) => startResize("actions", e)} />
              </th>
            </tr>
          </thead>
          <tbody>
            {currentBatch.map((entry) => {
              return (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    height: "36px",
                    transition: "background 0.15s ease",
                  }}
                  className="table-row-hover"
                >
                  {/* 1. Date */}
                  <td
                    style={{
                      padding: "6px 12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    className="mono"
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Calendar size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-main)" }}>
                          {formatDate(entry.start_time)}
                        </span>
                      </div>
                      <span style={{ fontSize: "10.5px", color: "var(--text-dim)", paddingLeft: "17px" }}>
                        {formatTimeRange(entry.start_time, entry.end_time)}
                      </span>
                    </div>
                  </td>

                  {/* 2. Project Name & Task */}
                  <td
                    style={{
                      padding: "6px 12px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FolderKanban size={13} style={{ color: "var(--accent-blue)", flexShrink: 0 }} />
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "12.5px",
                            color: "var(--text-main)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={entry.project_name || "Internal Project"}
                        >
                          {entry.project_name || "Internal Project"}
                        </span>
                        <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>›</span>
                        <span
                          style={{
                            fontWeight: 500,
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={entry.task_title || "Task"}
                        >
                          {entry.task_title || "Task"}
                        </span>
                      </div>
                      {entry.description && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-dim)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            paddingLeft: "19px",
                          }}
                          title={entry.description}
                        >
                          {entry.description}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 3. Client */}
                  <td
                    style={{
                      padding: "6px 12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {entry.client_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Building2 size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span style={{ color: "var(--text-main)", fontSize: "12px" }}>
                          {entry.client_name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>

                  {/* 4. Duration */}
                  <td
                    style={{
                      padding: "6px 12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    className="mono"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Clock size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--text-main)" }}>
                          {formatDuration(entry.duration_seconds)}
                        </span>
                      </div>
                      {entry.is_billable && entry.billable_amount > 0 && (
                        <span
                          style={{
                            fontSize: "10.5px",
                            color: "var(--accent-emerald)",
                            fontWeight: 600,
                            background: "rgba(16, 185, 129, 0.1)",
                            padding: "1px 6px",
                            borderRadius: "var(--radius-xs)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                          }}
                          title={`Billable: ${(entry.currency_code || "USD").toUpperCase()} ${entry.billable_amount.toFixed(2)}`}
                        >
                          {(entry.currency_code || "USD").toUpperCase() === "USD"
                            ? "$"
                            : (entry.currency_code || "USD").toUpperCase() === "INR"
                            ? "₹"
                            : (entry.currency_code || "USD").toUpperCase() === "GBP"
                            ? "£"
                            : (entry.currency_code || "USD").toUpperCase() === "EUR"
                            ? "€"
                            : ""}{entry.billable_amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 5. Actions */}
                  <td style={{ padding: "6px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => onEditEntry && onEditEntry(entry)}
                        disabled={entry.invoiced}
                        className="finance-button-secondary"
                        style={{ padding: "3px 6px" }}
                        title={entry.invoiced ? "Invoiced entry cannot be modified" : "Edit time entry"}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry && onDeleteEntry(entry)}
                        disabled={entry.invoiced}
                        className="finance-button-secondary"
                        style={{
                          padding: "3px 6px",
                          color: entry.invoiced ? "var(--text-dim)" : "var(--accent-rose)",
                          opacity: entry.invoiced ? 0.4 : 1,
                        }}
                        title={entry.invoiced ? "Invoiced entry cannot be deleted" : "Delete time entry"}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 50-Interval Footer Pagination */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          background: "var(--bg-surface-subtle)",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "11.5px",
          color: "var(--text-muted)",
        }}
      >
        <div>
          Showing <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{totalEntries === 0 ? 0 : startIndex + 1}</span> to{" "}
          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{endIndex}</span> of{" "}
          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{totalEntries}</span> time entries (50 per page)
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>
            Page {safeCurrentPage} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="finance-button-secondary"
              style={{
                padding: "3px 6px",
                opacity: safeCurrentPage <= 1 ? 0.4 : 1,
                cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
              }}
              title="Previous 50 entries"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="finance-button-secondary"
              style={{
                padding: "3px 6px",
                opacity: safeCurrentPage >= totalPages ? 0.4 : 1,
                cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer",
              }}
              title="Next 50 entries"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
