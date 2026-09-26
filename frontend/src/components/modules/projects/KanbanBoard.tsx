"use client";

import React from "react";
import { TaskData, TaskStatus, TaskPriority, ProjectData } from "@/types/project";
import {
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronLeft,
  FolderKanban,
} from "lucide-react";

interface KanbanBoardProps {
  tasks: TaskData[];
  projects: ProjectData[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEditTask: (task: TaskData) => void;
  onDeleteTask: (task: TaskData) => void;
  onAddTaskToColumn: (status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "backlog", title: "Backlog", color: "var(--text-dim)" },
  { id: "in_progress", title: "In Progress", color: "var(--accent-blue)" },
  { id: "review", title: "Review", color: "var(--accent-amber)" },
  { id: "done", title: "Done", color: "var(--accent-emerald)" },
];

const PRIORITY_STYLES: Record<TaskPriority, { label: string; bg: string; text: string; border: string }> = {
  urgent: {
    label: "Urgent",
    bg: "rgba(244, 63, 94, 0.12)",
    text: "var(--accent-rose)",
    border: "rgba(244, 63, 94, 0.3)",
  },
  high: {
    label: "High",
    bg: "rgba(245, 158, 11, 0.12)",
    text: "var(--accent-amber)",
    border: "rgba(245, 158, 11, 0.3)",
  },
  medium: {
    label: "Medium",
    bg: "rgba(59, 130, 246, 0.12)",
    text: "var(--accent-blue)",
    border: "rgba(59, 130, 246, 0.3)",
  },
  low: {
    label: "Low",
    bg: "rgba(148, 163, 184, 0.1)",
    text: "var(--text-muted)",
    border: "var(--border-subtle)",
  },
};

export default function KanbanBoard({
  tasks,
  projects,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  onAddTaskToColumn,
}: KanbanBoardProps) {
  const projectMap = React.useMemo(() => {
    const map = new Map<string, ProjectData>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === "backlog") return "in_progress";
    if (current === "in_progress") return "review";
    if (current === "review") return "done";
    return null;
  };

  const getPrevStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === "done") return "review";
    if (current === "review") return "in_progress";
    if (current === "in_progress") return "backlog";
    return null;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "16px",
        alignItems: "flex-start",
      }}
    >
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div
            key={col.id}
            style={{
              background: "var(--bg-surface-subtle)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "75vh",
              overflow: "hidden",
            }}
          >
            {/* Column Header */}
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: col.color,
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 600 }}>{col.title}</span>
                <span
                  className="mono"
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-xs)",
                    background: "var(--bg-surface-subtle)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-dim)",
                  }}
                >
                  {colTasks.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onAddTaskToColumn(col.id)}
                className="finance-button-secondary"
                style={{ padding: "4px" }}
                title={`Add task to ${col.title}`}
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Task Cards Column Body */}
            <div
              style={{
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                overflowY: "auto",
                minHeight: "150px",
              }}
            >
              {colTasks.length === 0 ? (
                <div
                  style={{
                    padding: "24px 12px",
                    textAlign: "center",
                    color: "var(--text-dim)",
                    fontSize: "12px",
                    fontStyle: "italic",
                  }}
                >
                  No tasks in {col.title.toLowerCase()}
                </div>
              ) : (
                colTasks.map((task) => {
                  const prj = projectMap.get(task.project_id);
                  const pStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
                  const next = getNextStatus(task.status);
                  const prev = getPrevStatus(task.status);

                  return (
                    <div
                      key={task.id}
                      className="finance-panel"
                      style={{
                        padding: "12px",
                        background: "var(--bg-surface)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {/* Priority & Project Badge */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "var(--radius-xs)",
                            background: pStyle.bg,
                            color: pStyle.text,
                            border: `1px solid ${pStyle.border}`,
                            textTransform: "uppercase",
                            letterSpacing: "0.4px",
                          }}
                        >
                          {pStyle.label}
                        </span>

                        {prj && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-dim)",
                              maxWidth: "130px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={prj.name}
                          >
                            {prj.name}
                          </span>
                        )}
                      </div>

                      {/* Task Title */}
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          lineHeight: "1.4",
                          cursor: "pointer",
                        }}
                        onClick={() => onEditTask(task)}
                        title="Click to edit task details"
                      >
                        {task.title}
                      </div>

                      {/* Task Metadata: Hours & Due Date */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          paddingTop: "4px",
                          borderTop: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {task.estimated_hours > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }} className="mono">
                              <Clock size={11} style={{ color: "var(--text-dim)" }} />
                              <span>{task.estimated_hours}h</span>
                            </div>
                          )}
                          {task.due_date && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }} className="mono">
                              <Calendar size={11} style={{ color: "var(--text-dim)" }} />
                              <span>{task.due_date}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-dim)",
                              cursor: "pointer",
                              padding: "2px",
                            }}
                            title="Edit Task"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--accent-rose)",
                              cursor: "pointer",
                              padding: "2px",
                            }}
                            title="Delete Task"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Kanban Stage Transition Buttons */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: "6px",
                          borderTop: "1px dashed var(--border-subtle)",
                          marginTop: "2px",
                        }}
                      >
                        {prev ? (
                          <button
                            type="button"
                            onClick={() => onStatusChange(task.id, prev)}
                            className="finance-button-secondary"
                            style={{ padding: "2px 6px", fontSize: "10px", gap: "2px" }}
                            title={`Move back to ${prev.replace("_", " ")}`}
                          >
                            <ChevronLeft size={10} />
                            <span>{prev === "backlog" ? "Backlog" : "Back"}</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        {next ? (
                          <button
                            type="button"
                            onClick={() => onStatusChange(task.id, next)}
                            className="finance-button-secondary"
                            style={{ padding: "2px 6px", fontSize: "10px", gap: "2px", marginLeft: "auto" }}
                            title={`Advance to ${next.replace("_", " ")}`}
                          >
                            <span>{next === "in_progress" ? "Start" : next === "review" ? "Review" : "Done"}</span>
                            <ChevronRight size={10} />
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--accent-emerald)",
                              fontWeight: 600,
                              marginLeft: "auto",
                            }}
                          >
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
