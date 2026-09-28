"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TimeEntryData } from "@/types/time";
import { useResizableColumns, ResizeHandle } from "@/hooks/useResizableColumns";
import { parseUtcDate } from "@/lib/date";
import {
  Clock,
  FolderKanban,
  Building2,
  Calendar,
  Pencil,
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

type SortField = "date" | "project_task" | "client" | "duration" | "invoice_status";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

const DEFAULT_TIME_WIDTHS = {
  date: 150,
  project_task: 330,
  client: 160,
  duration: 130,
  invoice_status: 125,
  actions: 75,
};

const MIN_TIME_WIDTHS = {
  date: 110,
  project_task: 180,
  client: 110,
  duration: 100,
  invoice_status: 90,
  actions: 65,
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
          const dateA = parseUtcDate(a.start_time).getTime();
          const dateB = parseUtcDate(b.start_time).getTime();
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
        case "invoice_status": {
          const statusA = a.invoice_status || (a.is_billable ? (a.invoiced ? "paid" : "due") : "non_billable");
          const statusB = b.invoice_status || (b.is_billable ? (b.invoiced ? "paid" : "due") : "non_billable");
          comparison = statusA.localeCompare(statusB, undefined, { sensitivity: "base" });
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
      const d = parseUtcDate(isoString);
      return d.toLocaleDateString(undefined, {
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
      const s = parseUtcDate(startIso);
      const sStr = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      if (!endIso) return `${sStr} — ongoing`;
      const e = parseUtcDate(endIso);
      const eStr = e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      return `${sStr} — ${eStr}`;
    } catch {
      return "";
    }
  };

  const renderInvoiceStatusBadge = (entry: TimeEntryData) => {
    if (!entry.is_billable) {
      return (
        <span style={{ fontSize: "11px", color: "var(--text-dim)", opacity: 0.6 }}>
          —
        </span>
      );
    }

    const rawStatus = (entry.invoice_status || (entry.invoiced ? "paid" : "due")).toLowerCase();

    const statusConfig: Record<string, { label: string; bg: string; border: string; color: string }> = {
      due: {
        label: "Due",
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.3)",
        color: "#f59e0b",
      },
      draft: {
        label: "Draft",
        bg: "rgba(148, 163, 184, 0.14)",
        border: "rgba(148, 163, 184, 0.28)",
        color: "#94a3b8",
      },
      sent: {
        label: "Sent",
        bg: "rgba(59, 130, 246, 0.12)",
        border: "rgba(59, 130, 246, 0.3)",
        color: "#3b82f6",
      },
      overdue: {
        label: "Overdue",
        bg: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.3)",
        color: "#ef4444",
      },
      paid: {
        label: "Paid",
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.3)",
        color: "#10b981",
      },
    };

    const cfg = statusConfig[rawStatus] || statusConfig.due;

    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 7px",
            borderRadius: "10px",
            fontSize: "10.5px",
            fontWeight: 600,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            color: cfg.color,
            letterSpacing: "0.2px",
          }}
          title={entry.invoice_number ? `Invoice ${entry.invoice_number} (${cfg.label})` : cfg.label}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              backgroundColor: cfg.color,
            }}
          />
          {cfg.label}
        </span>
        {entry.invoice_number && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-dim)",
              fontFamily: "monospace",
            }}
            title={`Invoice: ${entry.invoice_number}`}
          >
            #{entry.invoice_number}
          </span>
        )}
      </div>
    );
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

              {/* 5. Invoice Status */}
              <th
                onClick={() => handleSort("invoice_status")}
                style={{
                  position: "relative",
                  width: `${widths.invoice_status}px`,
                  minWidth: `${MIN_TIME_WIDTHS.invoice_status}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "invoice_status" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Invoice Status</span>
                  {renderSortIndicator("invoice_status")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("invoice_status", e)} />
              </th>

              {/* 6. Actions */}
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

                  {/* 5. Invoice Status */}
                  <td
                    style={{
                      padding: "6px 12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {renderInvoiceStatusBadge(entry)}
                  </td>

                  {/* 6. Actions */}
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
