"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TimeEntryData } from "@/types/time";
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

type SortField = "date" | "task" | "project" | "client" | "duration" | "amount";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

export default function TimeEntryTable({
  entries,
  onEditEntry,
  onDeleteEntry,
}: TimeEntryTableProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);

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
        case "task": {
          const taskA = a.task_title || "";
          const taskB = b.task_title || "";
          comparison = taskA.localeCompare(taskB, undefined, { sensitivity: "base" });
          break;
        }
        case "project": {
          const projA = a.project_name || "";
          const projB = b.project_name || "";
          comparison = projA.localeCompare(projB, undefined, { sensitivity: "base" });
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
        case "amount": {
          comparison = a.billable_amount - b.billable_amount;
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
            width: "100%",
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
                height: "32px",
              }}
            >
              {/* Task Title */}
              <th
                onClick={() => handleSort("task")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "task" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Task</span>
                  {renderSortIndicator("task")}
                </div>
              </th>

              {/* Project */}
              <th
                onClick={() => handleSort("project")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "project" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  width: "180px",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Project</span>
                  {renderSortIndicator("project")}
                </div>
              </th>

              {/* Client */}
              <th
                onClick={() => handleSort("client")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "client" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  width: "160px",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Client</span>
                  {renderSortIndicator("client")}
                </div>
              </th>

              {/* Date */}
              <th
                onClick={() => handleSort("date")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "date" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  width: "120px",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Date</span>
                  {renderSortIndicator("date")}
                </div>
              </th>

              {/* Duration */}
              <th
                onClick={() => handleSort("duration")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "duration" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  width: "110px",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Duration</span>
                  {renderSortIndicator("duration")}
                </div>
              </th>

              {/* Billable Value */}
              <th
                onClick={() => handleSort("amount")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "amount" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  width: "120px",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Billable</span>
                  {renderSortIndicator("amount")}
                </div>
              </th>

              {/* Actions */}
              <th
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  textAlign: "right",
                  width: "80px",
                }}
              >
                Actions
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
                  {/* Task Column + Notes */}
                  <td style={{ padding: "6px 12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: "12.5px",
                          color: "var(--text-main)",
                          maxWidth: "260px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={entry.task_title || "Unnamed Task"}
                      >
                        {entry.task_title || "Task"}
                      </span>
                      {entry.description && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-dim)",
                            maxWidth: "260px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={entry.description}
                        >
                          {entry.description}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Project */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {entry.project_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FolderKanban size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span
                          style={{
                            color: "var(--text-main)",
                            maxWidth: "160px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={entry.project_name}
                        >
                          {entry.project_name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>

                  {/* Client */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {entry.client_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Building2 size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span
                          style={{
                            color: "var(--text-muted)",
                            maxWidth: "140px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={entry.client_name}
                        >
                          {entry.client_name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>

                  {/* Date & Time Range */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--text-main)", fontSize: "12px", fontWeight: 500 }}>
                        <Calendar size={11} style={{ color: "var(--text-dim)" }} />
                        <span>{formatDate(entry.start_time)}</span>
                      </div>
                      <span className="mono" style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>
                        {formatTimeRange(entry.start_time, entry.end_time)}
                      </span>
                    </div>
                  </td>

                  {/* Duration */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    <span
                      className="mono"
                      style={{
                        fontWeight: 600,
                        color: "var(--text-main)",
                        background: "var(--bg-surface-subtle)",
                        padding: "2px 6px",
                        borderRadius: "var(--radius-xs)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {formatDuration(entry.duration_seconds)}
                    </span>
                  </td>

                  {/* Billable Amount */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {entry.is_billable ? (
                      <span className="mono" style={{ color: "var(--accent-emerald)", fontWeight: 500 }}>
                        {(() => {
                          const curr = (entry.currency_code || "USD").toUpperCase();
                          const sym =
                            curr === "USD" ? "$" : curr === "GBP" ? "£" : curr === "INR" ? "₹" : curr === "EUR" ? "€" : "";
                          return `${sym}${entry.billable_amount.toFixed(2)}`;
                        })()}{" "}
                        <span style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>
                          {entry.currency_code || "USD"}
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Non-billable</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "6px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => onEditEntry && onEditEntry(entry)}
                        className="finance-button-secondary"
                        style={{ padding: "3px 6px" }}
                        title="Edit time entry"
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
