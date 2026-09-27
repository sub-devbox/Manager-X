"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TaskData, TaskStatus } from "@/types/project";
import { useResizableColumns, ResizeHandle } from "@/hooks/useResizableColumns";
import {
  CheckSquare,
  FolderKanban,
  Building2,
  Clock,
  Play,
  Square,
  Pencil,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface TaskTableProps {
  tasks: TaskData[];
  timeTrackedMap?: Record<string, number>;
  onEditTask?: (task: TaskData) => void;
  onDeleteTask?: (task: TaskData) => void;
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onTimerNotice?: (msg: { type: "success" | "error"; text: string }) => void;
}

type SortField = "project" | "title" | "client" | "estimated_time" | "time_tracked" | "due_date" | "status";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

const DEFAULT_TASK_WIDTHS = {
  project: 170,
  title: 250,
  client: 140,
  estimated_time: 110,
  time_tracked: 110,
  due_date: 110,
  status: 120,
  actions: 90,
};

const MIN_TASK_WIDTHS = {
  project: 120,
  title: 150,
  client: 100,
  estimated_time: 90,
  time_tracked: 90,
  due_date: 90,
  status: 100,
  actions: 80,
};

export default function TaskTable({
  tasks,
  timeTrackedMap = {},
  onEditTask,
  onDeleteTask,
  onTaskStatusChange,
  onTimerNotice,
}: TaskTableProps) {
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Active Timer state tracking from localStorage and events
  const [activeTimer, setActiveTimer] = useState<{
    isRunning: boolean;
    taskId: string | null;
  }>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mx_active_timer");
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            isRunning: Boolean(parsed.isRunning),
            taskId: parsed.taskId || null,
          };
        }
      } catch {}
    }
    return { isRunning: false, taskId: null };
  });

  useEffect(() => {
    const handleTimerChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        isRunning?: boolean;
        taskId?: string | null;
      }>;
      if (customEvent.detail) {
        setActiveTimer({
          isRunning: Boolean(customEvent.detail.isRunning),
          taskId: customEvent.detail.taskId || null,
        });
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mx_active_timer" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setActiveTimer({
            isRunning: Boolean(parsed.isRunning),
            taskId: parsed.taskId || null,
          });
        } catch {}
      }
    };

    window.addEventListener("mx_timer_state_change", handleTimerChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("mx_timer_state_change", handleTimerChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const { widths, startResize, totalWidth } = useResizableColumns(
    "mx_col_widths_tasks",
    DEFAULT_TASK_WIDTHS,
    MIN_TASK_WIDTHS
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

  useEffect(() => {
    setCurrentPage(1);
  }, [tasks.length]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "project": {
          const projA = a.project_name || "";
          const projB = b.project_name || "";
          comparison = projA.localeCompare(projB, undefined, { sensitivity: "base" });
          break;
        }
        case "title":
          comparison = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
          break;
        case "client": {
          const clientA = a.client_name || "";
          const clientB = b.client_name || "";
          comparison = clientA.localeCompare(clientB, undefined, { sensitivity: "base" });
          break;
        }
        case "estimated_time":
          comparison = (a.estimated_hours || 0) - (b.estimated_hours || 0);
          break;
        case "time_tracked":
          comparison = (timeTrackedMap[a.id] || 0) - (timeTrackedMap[b.id] || 0);
          break;
        case "due_date": {
          const dateA = a.due_date || "9999-12-31";
          const dateB = b.due_date || "9999-12-31";
          comparison = dateA.localeCompare(dateB);
          break;
        }
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
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [tasks, sortField, sortDirection, timeTrackedMap]);

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

  const handleStartTracking = (e: React.MouseEvent, task: TaskData) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("mx_start_timer", {
        detail: {
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.project_id,
          projectTitle: task.project_name || "Project",
        },
      })
    );

    if (task.status === "backlog" && onTaskStatusChange) {
      onTaskStatusChange(task.id, "in_progress");
    }

    if (onTimerNotice) {
      onTimerNotice({
        type: "success",
        text: `Live timer started for "${task.title}". Ticking in the bottom bar!`,
      });
    }
  };

  const handleStopTracking = (e: React.MouseEvent, task: TaskData) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("mx_stop_timer"));

    if (onTimerNotice) {
      onTimerNotice({
        type: "success",
        text: `Stopping timer and saving session for "${task.title}"...`,
      });
    }
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
              {/* 1. Project Name */}
              <th
                onClick={() => handleSort("project")}
                style={{
                  position: "relative",
                  width: `${widths.project}px`,
                  minWidth: `${MIN_TASK_WIDTHS.project}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "project" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Project Name</span>
                  {renderSortIndicator("project")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("project", e)} />
              </th>

              {/* 2. Task Title */}
              <th
                onClick={() => handleSort("title")}
                style={{
                  position: "relative",
                  width: `${widths.title}px`,
                  minWidth: `${MIN_TASK_WIDTHS.title}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "title" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Task</span>
                  {renderSortIndicator("title")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("title", e)} />
              </th>

              {/* 3. Client */}
              <th
                onClick={() => handleSort("client")}
                style={{
                  position: "relative",
                  width: `${widths.client}px`,
                  minWidth: `${MIN_TASK_WIDTHS.client}px`,
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

              {/* 4. Estimated Time */}
              <th
                onClick={() => handleSort("estimated_time")}
                style={{
                  position: "relative",
                  width: `${widths.estimated_time}px`,
                  minWidth: `${MIN_TASK_WIDTHS.estimated_time}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "estimated_time" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Estimated Time</span>
                  {renderSortIndicator("estimated_time")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("estimated_time", e)} />
              </th>

              {/* 5. Time Tracked */}
              <th
                onClick={() => handleSort("time_tracked")}
                style={{
                  position: "relative",
                  width: `${widths.time_tracked}px`,
                  minWidth: `${MIN_TASK_WIDTHS.time_tracked}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "time_tracked" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Time Tracked</span>
                  {renderSortIndicator("time_tracked")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("time_tracked", e)} />
              </th>

              {/* 6. Due Date */}
              <th
                onClick={() => handleSort("due_date")}
                style={{
                  position: "relative",
                  width: `${widths.due_date}px`,
                  minWidth: `${MIN_TASK_WIDTHS.due_date}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "due_date" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Due Date</span>
                  {renderSortIndicator("due_date")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("due_date", e)} />
              </th>

              {/* 7. Status */}
              <th
                onClick={() => handleSort("status")}
                style={{
                  position: "relative",
                  width: `${widths.status}px`,
                  minWidth: `${MIN_TASK_WIDTHS.status}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "status" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Status</span>
                  {renderSortIndicator("status")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("status", e)} />
              </th>

              {/* 7. Actions */}
              <th
                style={{
                  position: "relative",
                  width: `${widths.actions}px`,
                  minWidth: `${MIN_TASK_WIDTHS.actions}px`,
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
            {currentBatch.map((task) => {
              const checklist = task.checklist || [];
              const completedCount = checklist.filter((i) => i.completed).length;
              const totalChecklist = checklist.length;
              const allDone = totalChecklist > 0 && completedCount === totalChecklist;
              const isThisRunning = activeTimer.isRunning && activeTimer.taskId === task.id;
              const trackedSec = timeTrackedMap[task.id] || 0;

              return (
                <tr
                  key={task.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    height: "36px",
                    transition: "background 0.1s ease",
                    background: isThisRunning ? "rgba(16, 185, 129, 0.04)" : undefined,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = isThisRunning
                      ? "rgba(16, 185, 129, 0.08)"
                      : "var(--bg-surface-subtle)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isThisRunning
                      ? "rgba(16, 185, 129, 0.04)"
                      : "transparent")
                  }
                >
                  {/* 1. Project Name */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {task.project_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FolderKanban size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span
                          style={{
                            color: "var(--text-main)",
                            fontWeight: 500,
                            maxWidth: "170px",
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

                  {/* 2. Task Title + Checklist Badge */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: "12.5px",
                          color: task.status === "done" ? "var(--text-muted)" : "var(--text-main)",
                          textDecoration: task.status === "done" ? "line-through" : "none",
                          maxWidth: "240px",
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
                    </div>
                  </td>

                  {/* 3. Client */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {task.client_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Building2 size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span
                          style={{
                            color: "var(--text-muted)",
                            maxWidth: "140px",
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

                  {/* 4. Estimated Time */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {task.estimated_hours > 0 ? (
                      <span className="mono" style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                        {task.estimated_hours}h
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>—</span>
                    )}
                  </td>

                  {/* 5. Time Tracked */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {isThisRunning ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span className="pulse-indicator" style={{ width: "6px", height: "6px" }} />
                        <span className="mono" style={{ fontSize: "11px", color: "var(--accent-emerald)", fontWeight: 600 }}>
                          Active
                        </span>
                      </div>
                    ) : trackedSec > 0 ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <Clock size={11} style={{ color: "var(--text-dim)" }} />
                        <span
                          className="mono"
                          style={{ fontSize: "11px", color: "var(--text-main)", fontWeight: 500 }}
                          title={`${(trackedSec / 3600).toFixed(2)} hours tracked`}
                        >
                          {(trackedSec / 3600).toFixed(1)}h
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)", fontSize: "11px" }} className="mono">
                        0.0h
                      </span>
                    )}
                  </td>

                  {/* 6. Due Date */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    {task.due_date ? (
                      <span
                        className="mono"
                        style={{
                          fontSize: "11px",
                          color:
                            task.status !== "done" &&
                            task.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10)
                              ? "var(--accent-rose)"
                              : "var(--text-main)",
                          fontWeight:
                            task.status !== "done" &&
                            task.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10)
                              ? 600
                              : 400,
                        }}
                        title={
                          task.status !== "done" &&
                          task.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10)
                            ? `Overdue: Due date was ${task.due_date.slice(0, 10)}`
                            : `Due: ${task.due_date.slice(0, 10)}`
                        }
                      >
                        {task.due_date.slice(0, 10)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>—</span>
                    )}
                  </td>

                  {/* 7. Status Dropdown */}
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
                            : task.status === "review"
                            ? "var(--accent-amber)"
                            : "var(--text-main)",
                        fontWeight:
                          task.status === "done" ||
                          task.status === "in_progress" ||
                          task.status === "review"
                            ? 600
                            : 400,
                      }}
                    >
                      <option value="backlog">Backlog</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </td>

                  {/* 7. Actions */}
                  <td style={{ padding: "6px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {/* Start/Stop Tracking Time Button */}
                      {isThisRunning ? (
                        <button
                          type="button"
                          onClick={(e) => handleStopTracking(e, task)}
                          className="finance-button-secondary"
                          style={{
                            padding: "3px 6px",
                            color: "var(--accent-rose)",
                            borderColor: "var(--accent-rose)",
                            background: "rgba(244, 63, 94, 0.12)",
                          }}
                          title="Stop Tracking Time on this Task"
                        >
                          <Square size={11} fill="currentColor" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleStartTracking(e, task)}
                          className="finance-button-secondary"
                          style={{ padding: "3px 6px", color: "var(--accent-emerald)" }}
                          title="Start Tracking Time on this Task"
                        >
                          <Play size={11} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onEditTask && onEditTask(task)}
                        className="finance-button-secondary"
                        style={{ padding: "3px 6px" }}
                        title="Edit Task"
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

      {/* 50-Interval Footer Pagination: exactly matching time-tracker */}
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
          Showing <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{totalTasks === 0 ? 0 : startIndex + 1}</span> to{" "}
          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{endIndex}</span> of{" "}
          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{totalTasks}</span> tasks (50 per page)
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
              title="Previous 50 tasks"
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
              title="Next 50 tasks"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
