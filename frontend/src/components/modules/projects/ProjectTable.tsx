"use client";

import React, { useState, useMemo } from "react";
import { ProjectData } from "@/types/project";
import {
  Building2,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
} from "lucide-react";

interface ProjectTableProps {
  projects: ProjectData[];
  onEditProject: (project: ProjectData) => void;
  onDeleteProject: (project: ProjectData) => void;
  onAddTask: (projectId: string) => void;
}

type SortField = "name" | "client" | "completion" | "rate" | "due_date";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

export default function ProjectTable({
  projects,
  onEditProject,
  onDeleteProject,
  onAddTask,
}: ProjectTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page on sort change
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
        case "completion": {
          const rateA = a.task_count > 0 ? a.completed_task_count / a.task_count : 0;
          const rateB = b.task_count > 0 ? b.completed_task_count / b.task_count : 0;
          comparison = rateA - rateB;
          break;
        }
        case "rate": {
          const valA = a.hourly_rate || a.budget_amount || 0;
          const valB = b.hourly_rate || b.budget_amount || 0;
          comparison = valA - valB;
          break;
        }
        case "due_date": {
          const dateA = a.end_date || "9999-12-31";
          const dateB = b.end_date || "9999-12-31";
          comparison = dateA.localeCompare(dateB);
          break;
        }
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [projects, sortField, sortDirection]);

  // 50-item interval pagination
  const totalItems = sortedProjects.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const currentBatch = sortedProjects.slice(startIndex, endIndex);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ color: "var(--text-dim)", opacity: 0.5 }} />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp size={12} style={{ color: "var(--accent-primary, #ffffff)" }} />
    ) : (
      <ArrowDown size={12} style={{ color: "var(--accent-primary, #ffffff)" }} />
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
          justifyContent: "center",
          gap: "12px",
        }}
      >
        <FolderKanban size={32} style={{ color: "var(--text-dim)" }} />
        <div style={{ fontSize: "14px", fontWeight: 600 }}>No Projects to Display</div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "380px" }}>
          No project records match the active criteria.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-surface)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Sleek Minimal Table Container */}
      <div style={{ overflowX: "auto", width: "100%" }}>
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
                height: "36px",
              }}
            >
              {/* 1. Project Name */}
              <th
                onClick={() => handleSort("name")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "name" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Project Name</span>
                  {renderSortIndicator("name")}
                </div>
              </th>

              {/* 2. Client */}
              <th
                onClick={() => handleSort("client")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "client" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Client</span>
                  {renderSortIndicator("client")}
                </div>
              </th>

              {/* 3. Completion % */}
              <th
                onClick={() => handleSort("completion")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "completion" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  width: "160px",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Completion %</span>
                  {renderSortIndicator("completion")}
                </div>
              </th>

              {/* 4. Rate */}
              <th
                onClick={() => handleSort("rate")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "rate" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Rate / Budget</span>
                  {renderSortIndicator("rate")}
                </div>
              </th>

              {/* 5. Due Date */}
              <th
                onClick={() => handleSort("due_date")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "due_date" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Due Date</span>
                  {renderSortIndicator("due_date")}
                </div>
              </th>

              {/* 6. Actions */}
              <th
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  width: "110px",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {currentBatch.map((proj) => {
              const percent =
                proj.task_count > 0
                  ? Math.round((proj.completed_task_count / proj.task_count) * 100)
                  : 0;

              return (
                <tr
                  key={proj.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    height: "38px",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-surface-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Project Name + Status Indicator */}
                  <td style={{ padding: "6px 12px", fontWeight: 500, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: getStatusDotColor(proj.status),
                          flexShrink: 0,
                        }}
                        title={`Status: ${proj.status}`}
                      />
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "12.5px",
                          maxWidth: "240px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={proj.name}
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

                  {/* Client */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {proj.client ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Building2 size={12} style={{ color: "var(--text-dim)" }} />
                        <span style={{ color: "var(--text-main)" }}>{proj.client.company_name}</span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>

                  {/* Completion % (Mini progress bar + numeric badge) */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "60px",
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

                  {/* Rate / Budget */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }} className="mono">
                    {proj.billing_type === "hourly" ? (
                      <span style={{ color: "var(--text-main)" }}>
                        {proj.client?.currency_code || "INR"} {(proj.hourly_rate || 0).toFixed(2)}
                        <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>/hr</span>
                      </span>
                    ) : proj.billing_type === "fixed" ? (
                      <span style={{ color: "var(--text-main)" }}>
                        {proj.client?.currency_code || "INR"} {(proj.budget_amount || 0).toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>Internal</span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }} className="mono">
                    {proj.end_date ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={11} style={{ color: "var(--text-dim)" }} />
                        <span>{proj.end_date}</span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>

                  {/* Compact Actions */}
                  <td style={{ padding: "6px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => onAddTask(proj.id)}
                        className="finance-button-secondary"
                        style={{ padding: "3px 6px", fontSize: "10px", gap: "2px" }}
                        title="Add Task"
                      >
                        <Plus size={10} />
                        <span>Task</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditProject(proj)}
                        className="finance-button-secondary"
                        style={{ padding: "3px 5px" }}
                        title="Edit Project"
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

      {/* 50-Item Interval Pagination Footer */}
      <div
        style={{
          padding: "8px 14px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "var(--text-dim)",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span>Showing</span>
          <span className="mono" style={{ color: "var(--text-main)", fontWeight: 600 }}>
            {totalItems > 0 ? startIndex + 1 : 0}–{endIndex}
          </span>
          <span>of</span>
          <span className="mono" style={{ color: "var(--text-main)", fontWeight: 600 }}>
            {totalItems}
          </span>
          <span>projects (50 per page)</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Page {currentPage} of {totalPages}
          </span>

          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="finance-button-secondary"
              style={{
                padding: "3px 8px",
                fontSize: "11px",
                opacity: currentPage <= 1 ? 0.4 : 1,
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              }}
              title="Previous 50 projects"
            >
              <ChevronLeft size={12} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="finance-button-secondary"
              style={{
                padding: "3px 8px",
                fontSize: "11px",
                opacity: currentPage >= totalPages ? 0.4 : 1,
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
              }}
              title="Next 50 projects"
            >
              <span>Next</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
