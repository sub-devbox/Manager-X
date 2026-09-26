"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ProjectData } from "@/types/project";
import { useResizableColumns, ResizeHandle } from "@/hooks/useResizableColumns";
import {
  Building2,
  Calendar,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderKanban,
} from "lucide-react";

interface ProjectTableProps {
  projects: ProjectData[];
  timeSpentByProject?: Record<string, number>;
  onSelectProject: (project: ProjectData) => void;
  onEditProject: (project: ProjectData) => void;
  onDeleteProject: (project: ProjectData) => void;
}

type SortField = "name" | "client" | "due_date" | "time_spent" | "completion";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

const DEFAULT_PROJECT_WIDTHS = {
  name: 260,
  client: 180,
  due_date: 130,
  time_spent: 140,
  completion: 160,
  actions: 90,
};

const MIN_PROJECT_WIDTHS = {
  name: 150,
  client: 110,
  due_date: 90,
  time_spent: 100,
  completion: 110,
  actions: 70,
};

export default function ProjectTable({
  projects,
  timeSpentByProject = {},
  onSelectProject,
  onEditProject,
  onDeleteProject,
}: ProjectTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const { widths, startResize, totalWidth } = useResizableColumns(
    "mx_col_widths_projects",
    DEFAULT_PROJECT_WIDTHS,
    MIN_PROJECT_WIDTHS
  );

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          break;
        case "client": {
          const clientA = a.client?.company_name || "";
          const clientB = b.client?.company_name || "";
          comparison = clientA.localeCompare(clientB, undefined, { sensitivity: "base" });
          break;
        }
        case "due_date": {
          const dateA = a.end_date || "9999-12-31";
          const dateB = b.end_date || "9999-12-31";
          comparison = dateA.localeCompare(dateB);
          break;
        }
        case "time_spent": {
          const spentA = timeSpentByProject[a.id] || 0;
          const spentB = timeSpentByProject[b.id] || 0;
          comparison = spentA - spentB;
          break;
        }
        case "completion": {
          const rateA = a.task_count > 0 ? a.completed_task_count / a.task_count : 0;
          const rateB = b.task_count > 0 ? b.completed_task_count / b.task_count : 0;
          comparison = rateA - rateB;
          break;
        }
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [projects, sortField, sortDirection, timeSpentByProject]);

  useEffect(() => {
    setCurrentPage(1);
  }, [projects.length]);

  // 50-item interval pagination
  const totalItems = sortedProjects.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const currentBatch = sortedProjects.slice(startIndex, endIndex);

  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return "0m";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours === 0 && minutes === 0) return `${totalSeconds}s`;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} style={{ color: "var(--text-dim)", opacity: 0.4 }} />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp size={11} style={{ color: "var(--accent-blue)" }} />
    ) : (
      <ArrowDown size={11} style={{ color: "var(--accent-blue)" }} />
    );
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case "active":
        return "var(--accent-emerald)";
      case "completed":
        return "var(--accent-blue)";
      case "on_hold":
        return "var(--accent-amber)";
      default:
        return "var(--text-dim)";
    }
  };

  if (projects.length === 0) {
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
        <FolderKanban size={32} style={{ color: "var(--text-dim)", opacity: 0.5 }} />
        <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>
          No projects found matching the filter criteria.
        </div>
      </div>
    );
  }

  return (
    <div
      className="finance-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto", width: "100%" }}>
        <table
          className="finance-table"
          style={{
            width: totalWidth ? `${totalWidth}px` : "100%",
            minWidth: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-surface-subtle)",
                height: "32px",
                textAlign: "left",
                userSelect: "none",
              }}
            >
              {/* 1. Project Name */}
              <th
                onClick={() => handleSort("name")}
                style={{
                  position: "relative",
                  width: `${widths.name}px`,
                  minWidth: `${MIN_PROJECT_WIDTHS.name}px`,
                  padding: "6px 14px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Project Name</span>
                  {renderSortIndicator("name")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("name", e)} />
              </th>

              {/* 2. Client */}
              <th
                onClick={() => handleSort("client")}
                style={{
                  position: "relative",
                  width: `${widths.client}px`,
                  minWidth: `${MIN_PROJECT_WIDTHS.client}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Client</span>
                  {renderSortIndicator("client")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("client", e)} />
              </th>

              {/* 3. Due Date */}
              <th
                onClick={() => handleSort("due_date")}
                style={{
                  position: "relative",
                  width: `${widths.due_date}px`,
                  minWidth: `${MIN_PROJECT_WIDTHS.due_date}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Due Date</span>
                  {renderSortIndicator("due_date")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("due_date", e)} />
              </th>

              {/* 4. Total Time Spent */}
              <th
                onClick={() => handleSort("time_spent")}
                style={{
                  position: "relative",
                  width: `${widths.time_spent}px`,
                  minWidth: `${MIN_PROJECT_WIDTHS.time_spent}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Total Time Spent</span>
                  {renderSortIndicator("time_spent")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("time_spent", e)} />
              </th>

              {/* 5. Completion % */}
              <th
                onClick={() => handleSort("completion")}
                style={{
                  position: "relative",
                  width: `${widths.completion}px`,
                  minWidth: `${MIN_PROJECT_WIDTHS.completion}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Completion %</span>
                  {renderSortIndicator("completion")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("completion", e)} />
              </th>

              {/* 6. Actions */}
              <th
                style={{
                  position: "relative",
                  width: `${widths.actions}px`,
                  minWidth: `${MIN_PROJECT_WIDTHS.actions}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <span>Actions</span>
                <ResizeHandle onMouseDown={(e) => startResize("actions", e)} />
              </th>
            </tr>
          </thead>

          <tbody>
            {currentBatch.map((proj) => {
              const percent =
                proj.task_count > 0
                  ? Math.round((proj.completed_task_count / proj.task_count) * 100)
                  : 0;
              const effectiveStatus =
                percent === 100 && proj.task_count > 0 && proj.status !== "archived"
                  ? "completed"
                  : proj.status;
              const spentSeconds = timeSpentByProject[proj.id] || 0;

              return (
                <tr
                  key={proj.id}
                  onClick={() => onSelectProject(proj)}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    height: "38px",
                    cursor: "pointer",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-surface-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  title="Click to view all tasks in popup"
                >
                  {/* 1. Project Name */}
                  <td style={{ padding: "6px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: getStatusDotColor(effectiveStatus),
                          flexShrink: 0,
                        }}
                        title={`Status: ${effectiveStatus}`}
                      />
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "12.5px",
                          color: "var(--text-main)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {proj.name}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "1px 5px",
                          borderRadius: "var(--radius-xs)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-dim)",
                          textTransform: "uppercase",
                        }}
                      >
                        {proj.billing_type}
                      </span>
                    </div>
                  </td>

                  {/* 2. Client */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {proj.client ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Building2 size={12} style={{ color: "var(--text-dim)" }} />
                        <span style={{ color: "var(--text-main)" }}>{proj.client.company_name}</span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>

                  {/* 3. Due Date */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }} className="mono">
                    {proj.end_date ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Calendar size={11} style={{ color: "var(--text-dim)" }} />
                        <span>{proj.end_date}</span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>

                  {/* 4. Total Time Spent */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }} className="mono">
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Clock size={11} style={{ color: spentSeconds > 0 ? "var(--accent-emerald)" : "var(--text-dim)" }} />
                      <span
                        style={{
                          fontWeight: spentSeconds > 0 ? 600 : 400,
                          color: spentSeconds > 0 ? "var(--text-main)" : "var(--text-dim)",
                        }}
                      >
                        {formatDuration(spentSeconds)}
                      </span>
                    </div>
                  </td>

                  {/* 5. Completion % */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "55px",
                          height: "4px",
                          background: "var(--bg-surface-subtle)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "2px",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${percent}%`,
                            background:
                              percent === 100
                                ? "var(--accent-emerald)"
                                : percent > 0
                                ? "var(--accent-blue)"
                                : "transparent",
                          }}
                        />
                      </div>
                      <span className="mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {percent}% ({proj.completed_task_count}/{proj.task_count})
                      </span>
                    </div>
                  </td>

                  {/* 6. Actions */}
                  <td style={{ padding: "6px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onEditProject(proj)}
                        className="finance-button-secondary"
                        style={{ padding: "3px 5px" }}
                        title="Edit Project Details"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(proj)}
                        className="finance-button-secondary"
                        style={{ padding: "3px 5px", color: "var(--accent-rose)" }}
                        title="Delete Project"
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
          Showing <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{totalItems === 0 ? 0 : startIndex + 1}</span> to{" "}
          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{endIndex}</span> of{" "}
          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{totalItems}</span> projects (50 per page)
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            className="finance-button-secondary"
            style={{ padding: "3px 6px", fontSize: "11px", opacity: safeCurrentPage <= 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={12} />
          </button>
          <span className="mono" style={{ fontSize: "11px", padding: "0 4px" }}>
            {safeCurrentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="finance-button-secondary"
            style={{ padding: "3px 6px", fontSize: "11px", opacity: safeCurrentPage >= totalPages ? 0.4 : 1 }}
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
