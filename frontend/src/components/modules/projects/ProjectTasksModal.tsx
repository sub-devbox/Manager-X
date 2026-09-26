"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ProjectData, TaskData, TaskStatus } from "@/types/project";
import {
  X,
  Plus,
  Play,
  Square,
  Pencil,
  CheckSquare,
  Clock,
  Building2,
  Calendar,
} from "lucide-react";

interface ProjectTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData | null;
  tasks: TaskData[];
  timeTrackedMap: Record<string, number>;
  onAddTask: (projectId: string) => void;
  onEditTask: (task: TaskData) => void;
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onTimerNotice?: (msg: { type: "success" | "error"; text: string }) => void;
}

export default function ProjectTasksModal({
  isOpen,
  onClose,
  project,
  tasks,
  timeTrackedMap,
  onAddTask,
  onEditTask,
  onTaskStatusChange,
  onTimerNotice,
}: ProjectTasksModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTimer, setActiveTimer] = useState<{ isRunning: boolean; taskId: string | null }>(() => {
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
    setMounted(true);
  }, []);

  // Listen for live timer state changes
  useEffect(() => {
    const handleTimerChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isRunning?: boolean; taskId?: string | null }>;
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || !project) return null;

  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((t) => t.status === "done").length;
  const totalEstHours = projectTasks.reduce((acc, t) => acc + (t.estimated_hours || 0), 0);
  const totalDurationSeconds = projectTasks.reduce(
    (acc, t) => acc + (timeTrackedMap[t.id] || 0),
    0
  );

  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return "0m";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours === 0 && minutes === 0) return `${totalSeconds}s`;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "backlog":
        return "var(--text-muted)";
      case "in_progress":
        return "var(--accent-amber)";
      case "review":
        return "var(--accent-blue)";
      case "done":
        return "var(--accent-emerald)";
      default:
        return "var(--text-muted)";
    }
  };

  const handleStartTracking = (e: React.MouseEvent, task: TaskData) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("mx_start_timer", {
        detail: {
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.project_id,
          projectTitle: project.name,
        },
      })
    );
    if (onTimerNotice) {
      onTimerNotice({
        type: "success",
        text: `Tracking started for "${task.title}".`,
      });
    }
  };

  const handleStopTracking = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("mx_stop_timer"));
    if (onTimerNotice) {
      onTimerNotice({
        type: "success",
        text: "Live session stopped and saved.",
      });
    }
  };

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="finance-panel animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "88vh",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-surface-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckSquare size={16} style={{ color: "var(--accent-blue)" }} />
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)" }}>
                {project.name}
              </h3>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                }}
              >
                {project.billing_type}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px", fontSize: "11.5px", color: "var(--text-muted)" }}>
              {project.client?.company_name && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Building2 size={12} style={{ color: "var(--text-dim)" }} />
                  {project.client.company_name}
                </span>
              )}
              {project.end_date && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Calendar size={12} style={{ color: "var(--text-dim)" }} />
                  Due {project.end_date}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={12} style={{ color: "var(--accent-emerald)" }} />
                {formatDuration(totalDurationSeconds)} spent
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => onAddTask(project.id)}
              className="finance-button-primary"
              style={{
                height: "32px",
                padding: "0 12px",
                fontSize: "12px",
                gap: "6px",
                width: "auto",
              }}
            >
              <Plus size={12} />
              <span>Add Task</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="finance-button-secondary"
              style={{ padding: "6px", borderRadius: "50%" }}
              title="Close modal"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Task List Table: Task | Status | Checklist | Est. Time | Time Spent | Action */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
          {projectTasks.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                color: "var(--text-muted)",
              }}
            >
              <CheckSquare size={32} style={{ color: "var(--text-dim)", opacity: 0.5 }} />
              <div style={{ fontSize: "13px", fontWeight: 500 }}>No tasks created for this project yet.</div>
              <button
                type="button"
                onClick={() => onAddTask(project.id)}
                className="finance-button-primary"
                style={{ padding: "6px 14px", fontSize: "12px", width: "auto", marginTop: "4px" }}
              >
                <Plus size={12} />
                <span>Create First Task</span>
              </button>
            </div>
          ) : (
            <table
              className="finance-table"
              style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}
            >
              <thead>
                <tr style={{ background: "var(--bg-surface-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-dim)", minWidth: "220px" }}>
                    Task
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-dim)", width: "130px" }}>
                    Status
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-dim)", width: "110px" }}>
                    Checklist
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-dim)", width: "95px" }}>
                    Est. Time
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-dim)", width: "105px" }}>
                    Time Spent
                  </th>
                  <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, color: "var(--text-dim)", width: "85px" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectTasks.map((task) => {
                  const isTimerActiveForTask = activeTimer.isRunning && activeTimer.taskId === task.id;
                  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
                  const chkCompleted = checklist.filter((i) => i.completed).length;
                  const chkTotal = checklist.length;
                  const spentSec = timeTrackedMap[task.id] || 0;

                  return (
                    <tr
                      key={task.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        height: "40px",
                        background: isTimerActiveForTask ? "rgba(16, 185, 129, 0.04)" : "transparent",
                      }}
                    >
                      {/* 1. Task Title & Description */}
                      <td style={{ padding: "8px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: task.status === "done" ? "var(--text-dim)" : "var(--text-main)",
                              textDecoration: task.status === "done" ? "line-through" : "none",
                            }}
                          >
                            {task.title}
                          </span>
                          {task.description && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "260px",
                              }}
                            >
                              {task.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Status */}
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                        {onTaskStatusChange ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: getStatusColor(task.status),
                                flexShrink: 0,
                              }}
                            />
                            <select
                              value={task.status}
                              onChange={(e) => onTaskStatusChange(task.id, e.target.value as TaskStatus)}
                              className="finance-input"
                              style={{
                                height: "26px",
                                fontSize: "11.5px",
                                padding: "0 6px",
                                width: "auto",
                                color: getStatusColor(task.status),
                                fontWeight: 500,
                              }}
                            >
                              <option value="backlog">Backlog</option>
                              <option value="in_progress">In Progress</option>
                              <option value="review">Review</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: "11.5px",
                              fontWeight: 500,
                              color: getStatusColor(task.status),
                              textTransform: "capitalize",
                            }}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                        )}
                      </td>

                      {/* 3. Checklist */}
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                        {chkTotal > 0 ? (
                          <span
                            className="mono"
                            style={{
                              fontSize: "11px",
                              padding: "2px 6px",
                              borderRadius: "var(--radius-xs)",
                              background: chkCompleted === chkTotal ? "rgba(16, 185, 129, 0.1)" : "var(--bg-surface-subtle)",
                              border: `1px solid ${chkCompleted === chkTotal ? "var(--accent-emerald)" : "var(--border-subtle)"}`,
                              color: chkCompleted === chkTotal ? "var(--accent-emerald)" : "var(--text-dim)",
                            }}
                          >
                            {chkCompleted}/{chkTotal} done
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>—</span>
                        )}
                      </td>

                      {/* 4. Est. Time */}
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }} className="mono">
                        {task.estimated_hours ? (
                          <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                            {task.estimated_hours}h
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>—</span>
                        )}
                      </td>

                      {/* 5. Time Spent */}
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }} className="mono">
                        <span
                          style={{
                            fontSize: "11.5px",
                            fontWeight: spentSec > 0 ? 600 : 400,
                            color: isTimerActiveForTask
                              ? "var(--accent-emerald)"
                              : spentSec > 0
                              ? "var(--text-main)"
                              : "var(--text-dim)",
                          }}
                        >
                          {formatDuration(spentSec)}
                        </span>
                      </td>

                      {/* 6. Action (remove delete) */}
                      <td style={{ padding: "8px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          {/* Live Timer Start/Stop */}
                          {isTimerActiveForTask ? (
                            <button
                              type="button"
                              onClick={handleStopTracking}
                              className="finance-button-primary"
                              style={{
                                padding: "3px 6px",
                                background: "rgba(244, 63, 94, 0.15)",
                                color: "var(--accent-rose)",
                                border: "1px solid var(--accent-rose)",
                              }}
                              title="Stop active timer session"
                            >
                              <Square size={11} fill="currentColor" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleStartTracking(e, task)}
                              className="finance-button-secondary"
                              style={{ padding: "3px 6px", color: "var(--accent-emerald)" }}
                              title="Start tracking time on this task"
                            >
                              <Play size={11} />
                            </button>
                          )}

                          {/* Edit Task (Pencil) */}
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className="finance-button-secondary"
                            style={{ padding: "3px 6px" }}
                            title="Edit task details"
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
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-surface-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "11.5px",
            color: "var(--text-muted)",
          }}
        >
          <div>
            Showing <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{projectTasks.length}</span> tasks •{" "}
            <span style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>{completedTasks}</span> completed •{" "}
            Est: <span className="mono">{totalEstHours}h</span> • Spent: <span className="mono">{formatDuration(totalDurationSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="finance-button-secondary"
            style={{ padding: "5px 12px", fontSize: "11.5px" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
