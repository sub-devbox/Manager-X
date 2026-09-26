"use client";

import React, { useState, useMemo } from "react";
import { TaskData, TaskStatus } from "@/types/project";
import {
  CheckSquare,
  FolderKanban,
  Building2,
  Clock,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface TaskTableProps {
  tasks: TaskData[];
  onEditTask?: (task: TaskData) => void;
  onDeleteTask?: (task: TaskData) => void;
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}

type SortField = "title" | "status" | "project" | "client";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

export default function TaskTable({
  tasks,
  onEditTask,
  onDeleteTask,
  onTaskStatusChange,
}: TaskTableProps) {
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);

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

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
          break;
        case "status": {
          const statusOrder: Record<TaskStatus, number> = {
            backlog: 1,
            in_progress: 2,
            review: 3,
            done: 4,
          };
          comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
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
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [tasks, sortField, sortDirection]);

  // 50-interval pagination calculations
  const totalTasks = sortedTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalTasks / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalTasks);
  const currentBatch = sortedTasks.slice(startIndex, endIndex);

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

  if (tasks.length === 0) {
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
        <CheckSquare size={32} style={{ color: "var(--text-dim)" }} />
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
          No tasks found
        </div>
        <div style={{ fontSize: "12.5px", color: "var(--text-muted)", maxWidth: "360px" }}>
          No tasks match the active view criteria or search filter.
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
      {/* Tabular View Container */}
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
              {/* 1. Task Title */}
              <th
                onClick={() => handleSort("title")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "title" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Task Title</span>
                  {renderSortIndicator("title")}
                </div>
              </th>

              {/* 2. Status */}
              <th
                onClick={() => handleSort("status")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "status" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  width: "140px",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Status</span>
                  {renderSortIndicator("status")}
                </div>
              </th>

              {/* 3. Project */}
              <th
                onClick={() => handleSort("project")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "project" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  width: "200px",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Project</span>
                  {renderSortIndicator("project")}
                </div>
              </th>

              {/* 4. Client */}
              <th
                onClick={() => handleSort("client")}
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "client" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  width: "180px",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Client</span>
                  {renderSortIndicator("client")}
                </div>
              </th>

              {/* 5. Actions */}
              <th
                style={{
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  width: "90px",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {currentBatch.map((task) => {
              const checklist = task.checklist || [];
              const completedCount = checklist.filter((i) => i.completed).length;
              const totalChecklist = checklist.length;
              const allDone = totalChecklist > 0 && completedCount === totalChecklist;

              return (
                <tr
                  key={task.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    height: "36px",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Task Title + Checklist Badge */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: "12.5px",
                          color: task.status === "done" ? "var(--text-muted)" : "var(--text-main)",
                          textDecoration: task.status === "done" ? "line-through" : "none",
                          maxWidth: "280px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={task.title}
                      >
                        {task.title}
                      </span>

                      {/* Checklist Badge if exists */}
                      {totalChecklist > 0 && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "var(--radius-xs)",
                            background: allDone ? "rgba(16, 185, 129, 0.12)" : "var(--bg-surface-subtle)",
                            color: allDone ? "var(--accent-emerald)" : "var(--text-dim)",
                            border: `1px solid ${allDone ? "var(--accent-emerald)" : "var(--border-subtle)"}`,
                          }}
                          className="mono"
                          title={`${completedCount} of ${totalChecklist} checklist items completed`}
                        >
                          <CheckSquare size={10} />
                          <span>
                            {completedCount}/{totalChecklist}
                          </span>
                        </div>
                      )}

                      {task.estimated_hours > 0 && (
                        <span
                          className="mono"
                          style={{
                            fontSize: "10.5px",
                            color: "var(--text-dim)",
                            marginLeft: "auto",
                          }}
                        >
                          {task.estimated_hours}h
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Dropdown */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        onTaskStatusChange &&
                        onTaskStatusChange(task.id, e.target.value as TaskStatus)
                      }
                      className="finance-input"
                      style={{
                        padding: "3px 6px",
                        fontSize: "11px",
                        height: "26px",
                        cursor: "pointer",
                        width: "120px",
                        color:
                          task.status === "done"
                            ? "var(--accent-emerald)"
                            : task.status === "in_progress"
                            ? "var(--accent-blue)"
                            : "var(--text-main)",
                        fontWeight: task.status === "done" || task.status === "in_progress" ? 600 : 400,
                      }}
                    >
                      <option value="backlog">Backlog</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </td>

                  {/* Project */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {task.project_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FolderKanban size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span
                          style={{
                            color: "var(--text-main)",
                            maxWidth: "180px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={task.project_name}
                        >
                          {task.project_name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>

                  {/* Client */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {task.client_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Building2 size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span
                          style={{
                            color: "var(--text-muted)",
                            maxWidth: "160px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={task.client_name}
                        >
                          {task.client_name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "6px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onEditTask && onEditTask(task)}
                        className="finance-button-secondary"
                        style={{ padding: "3px 6px" }}
                        title="Edit Task"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask && onDeleteTask(task)}
                        className="finance-button-secondary"
                        style={{ padding: "3px 6px", color: "var(--accent-rose)" }}
                        title="Delete Task"
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

      {/* 50-Interval Pagination Bar */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          fontSize: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span style={{ color: "var(--text-dim)" }}>
          Showing{" "}
          <strong style={{ color: "var(--text-main)" }}>
            {totalTasks === 0 ? 0 : startIndex + 1} - {endIndex}
          </strong>{" "}
          of <strong style={{ color: "var(--text-main)" }}>{totalTasks}</strong> tasks
        </span>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="finance-button-secondary"
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                opacity: safeCurrentPage <= 1 ? 0.4 : 1,
                cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft size={13} />
              <span>Prev 50</span>
            </button>

            <span className="mono" style={{ fontSize: "11px", padding: "0 6px", color: "var(--text-muted)" }}>
              Page {safeCurrentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="finance-button-secondary"
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                opacity: safeCurrentPage >= totalPages ? 0.4 : 1,
                cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer",
              }}
            >
              <span>Next 50</span>
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
