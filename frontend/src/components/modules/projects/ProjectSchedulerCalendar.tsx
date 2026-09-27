"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TaskData, TaskStatus, ProjectData } from "@/types/project";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Maximize2,
  Minimize2,
  Layers,
  GripVertical,
} from "lucide-react";

interface ProjectSchedulerCalendarProps {
  tasks: TaskData[];
  projects: ProjectData[];
  timeTrackedByDate?: Record<string, number>;
  onUpdateTaskDueDate: (taskId: string, newDueDate: string | null) => Promise<void> | void;
  onOpenNewTask: (defaultDate?: string) => void;
  onEditTask: (task: TaskData) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ProjectSchedulerCalendar({
  tasks,
  projects,
  timeTrackedByDate = {},
  onUpdateTaskDueDate,
  onOpenNewTask,
  onEditTask,
}: ProjectSchedulerCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isUnscheduledOpen, setIsUnscheduledOpen] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Close full screen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  // Year and Month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  }, []);

  // Quick project lookup map
  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectData>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  // Compute 7xN Calendar Grid cells for current month
  const { calendarDays, weeksCount } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    // 0 = Sunday, 1 = Monday. We want Monday = 0, Sunday = 6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const totalNeeded = startOffset + daysInCurrentMonth;
    const totalWeeks = Math.ceil(totalNeeded / 7);
    const totalSlots = totalWeeks * 7;

    const days = [];

    for (let i = 0; i < totalSlots; i++) {
      let cellYear = year;
      let cellMonth = month;
      let cellDay = 1;
      let isCurrentMonth = true;

      if (i < startOffset) {
        // Prev month days
        isCurrentMonth = false;
        cellDay = daysInPrevMonth - startOffset + i + 1;
        cellMonth = month - 1;
        if (cellMonth < 0) {
          cellMonth = 11;
          cellYear = year - 1;
        }
      } else if (i < startOffset + daysInCurrentMonth) {
        // Current month days
        cellDay = i - startOffset + 1;
        isCurrentMonth = true;
      } else {
        // Next month days
        isCurrentMonth = false;
        cellDay = i - (startOffset + daysInCurrentMonth) + 1;
        cellMonth = month + 1;
        if (cellMonth > 11) {
          cellMonth = 0;
          cellYear = year + 1;
        }
      }

      const dateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, "0")}-${String(
        cellDay
      ).padStart(2, "0")}`;

      days.push({
        dateStr,
        dayNumber: cellDay,
        isCurrentMonth,
        isToday: dateStr === todayStr,
      });
    }

    return { calendarDays: days, weeksCount: totalWeeks };
  }, [year, month, todayStr]);

  // Group tasks by due date
  const { tasksByDate, unscheduledTasks } = useMemo(() => {
    const map: Record<string, TaskData[]> = {};
    const unscheduled: TaskData[] = [];

    for (const t of tasks) {
      if (t.due_date) {
        const d = t.due_date.slice(0, 10);
        if (!map[d]) map[d] = [];
        map[d].push(t);
      } else {
        unscheduled.push(t);
      }
    }

    return { tasksByDate: map, unscheduledTasks: unscheduled };
  }, [tasks]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleDragLeave = (e: React.DragEvent, dateStr: string) => {
    if (dragOverDate === dateStr) {
      setDragOverDate(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverDate(null);

    if (!taskId) return;

    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    if (targetTask.due_date?.slice(0, 10) === targetDateStr) {
      return;
    }

    await onUpdateTaskDueDate(taskId, targetDateStr);
  };

  const handleDropOnUnscheduled = async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverDate(null);

    if (!taskId) return;
    await onUpdateTaskDueDate(taskId, null);
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

  return (
    <div
      style={
        isFullScreen
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "var(--bg-app)",
              display: "flex",
              flexDirection: "column",
              padding: "16px 20px",
              boxSizing: "border-box",
            }
          : {
              height: "calc(100vh - 190px)",
              minHeight: "560px",
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }
      }
    >
      {/* Calendar Header / Toolbar */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        {/* Left: Navigation, Month Title and Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="finance-button-secondary"
              style={{
                width: "32px",
                height: "32px",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Previous Month (<)"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="finance-button-secondary"
              style={{
                width: "32px",
                height: "32px",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Next Month (>)"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <h2
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--text-main)",
              margin: 0,
              letterSpacing: "-0.2px",
              minWidth: "150px",
            }}
          >
            {MONTH_NAMES[month]} {year}
          </h2>

          <button
            type="button"
            onClick={handleToday}
            className="finance-button-secondary"
            style={{
              height: "30px",
              padding: "0 10px",
              fontSize: "11.5px",
              fontWeight: 500,
            }}
          >
            Today
          </button>

          {/* Badge Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              className="mono"
              style={{
                fontSize: "10px",
                color: "var(--accent-amber)",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
              title="Amber badge on date cell shows total estimated hours"
            >
              Est Hr
            </span>
            <span
              className="mono"
              style={{
                fontSize: "10px",
                color: "var(--accent-emerald)",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
              title="Green badge on date cell shows total time tracked"
            >
              Tracked Hr
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Unscheduled Tasks Right-Sidebar Toggle */}
          <button
            type="button"
            onClick={() => setIsUnscheduledOpen((prev) => !prev)}
            className="finance-button-secondary"
            style={{
              height: "32px",
              padding: "0 10px",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              borderColor: isUnscheduledOpen ? "var(--accent-blue)" : undefined,
              color: isUnscheduledOpen ? "var(--accent-blue)" : undefined,
            }}
            title={isUnscheduledOpen ? "Hide Unscheduled Sidebar" : "Show Unscheduled Sidebar"}
          >
            <Layers size={13} />
            <span>Unscheduled ({unscheduledTasks.length})</span>
          </button>

          {/* Full Screen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullScreen((prev) => !prev)}
            className="finance-button-secondary"
            style={{
              width: "32px",
              height: "32px",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isFullScreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen"}
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Quick Create Task */}
          <button
            type="button"
            onClick={() => onOpenNewTask()}
            className="finance-button-primary"
            style={{
              height: "32px",
              padding: "0 12px",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              width: "auto",
            }}
          >
            <Plus size={13} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Calendar Grid on Left, Unscheduled Sidebar on Right */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        {/* Left / Center: Month Calendar View */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Weekday Columns Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              background: "var(--bg-surface-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            {WEEKDAY_NAMES.map((name, idx) => (
              <div
                key={name}
                style={{
                  padding: "8px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: idx >= 5 ? "var(--accent-amber)" : "var(--text-muted)",
                  textAlign: "center",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Single-Page Full Month Grid */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gridTemplateRows: `repeat(${weeksCount}, 1fr)`,
              gap: "1px",
              background: "var(--border-subtle)",
            }}
          >
            {calendarDays.map((day) => {
              const dayTasks = tasksByDate[day.dateStr] || [];
              const isOver = dragOverDate === day.dateStr;

              // Total estimated hours assigned on this day
              const dayTotalEstHours = dayTasks.reduce(
                (sum, t) => sum + (t.estimated_hours || 0),
                0
              );

              // Total time tracked on this day (in green)
              const dayTrackedSeconds = timeTrackedByDate[day.dateStr] || 0;
              const dayTrackedHours = dayTrackedSeconds / 3600;

              return (
                <div
                  key={day.dateStr}
                  onDragOver={(e) => handleDragOver(e, day.dateStr)}
                  onDragLeave={(e) => handleDragLeave(e, day.dateStr)}
                  onDrop={(e) => handleDrop(e, day.dateStr)}
                  style={{
                    background: isOver
                      ? "rgba(59, 130, 246, 0.12)"
                      : day.isCurrentMonth
                      ? "var(--bg-surface)"
                      : "var(--bg-app)",
                    padding: "5px 7px",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    position: "relative",
                    transition: "background 0.15s ease",
                    outline: isOver ? "2px dashed var(--accent-blue)" : "none",
                    outlineOffset: "-2px",
                  }}
                >
                  {/* Day Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                      flexShrink: 0,
                      gap: "4px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: day.isToday ? 700 : 500,
                          color: day.isToday
                            ? "#ffffff"
                            : day.isCurrentMonth
                            ? "var(--text-main)"
                            : "var(--text-dim)",
                          background: day.isToday ? "var(--accent-blue)" : "transparent",
                          padding: day.isToday ? "1px 5px" : "0",
                          borderRadius: day.isToday ? "10px" : "0",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {day.dayNumber}
                      </span>

                      {/* Total estimated hr assigned (amber) */}
                      <span
                        className="mono"
                        style={{
                          fontSize: "9.5px",
                          fontWeight: dayTotalEstHours > 0 ? 600 : 400,
                          color:
                            dayTotalEstHours > 0 ? "var(--accent-amber)" : "var(--text-dim)",
                          background:
                            dayTotalEstHours > 0
                              ? "rgba(245, 158, 11, 0.12)"
                              : "rgba(255, 255, 255, 0.03)",
                          border:
                            dayTotalEstHours > 0
                              ? "1px solid rgba(245, 158, 11, 0.3)"
                              : "1px solid transparent",
                          padding: "0 3px",
                          borderRadius: "3px",
                        }}
                        title={`Total estimated hours assigned for ${day.dateStr}: ${dayTotalEstHours}h`}
                      >
                        {dayTotalEstHours > 0 ? `${Number(dayTotalEstHours.toFixed(1))}h` : "0h"}
                      </span>

                      {/* Total time tracked on that day (in green) */}
                      <span
                        className="mono"
                        style={{
                          fontSize: "9.5px",
                          fontWeight: dayTrackedHours > 0 ? 600 : 400,
                          color:
                            dayTrackedHours > 0 ? "var(--accent-emerald)" : "var(--text-dim)",
                          background:
                            dayTrackedHours > 0
                              ? "rgba(16, 185, 129, 0.12)"
                              : "rgba(255, 255, 255, 0.03)",
                          border:
                            dayTrackedHours > 0
                              ? "1px solid rgba(16, 185, 129, 0.3)"
                              : "1px solid transparent",
                          padding: "0 3px",
                          borderRadius: "3px",
                        }}
                        title={`Total time tracked on ${day.dateStr}: ${
                          dayTrackedHours > 0 ? `${Number(dayTrackedHours.toFixed(1))}h` : "0h"
                        }`}
                      >
                        {dayTrackedHours > 0 ? `${Number(dayTrackedHours.toFixed(1))}h` : "0h"}
                      </span>
                    </div>

                    {/* Quick Add Task on this date */}
                    <button
                      type="button"
                      onClick={() => onOpenNewTask(day.dateStr)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-dim)",
                        cursor: "pointer",
                        padding: "2px",
                        borderRadius: "3px",
                        display: "flex",
                        alignItems: "center",
                        opacity: 0.6,
                        transition: "opacity 0.15s ease, color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.color = "var(--accent-blue)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "0.6";
                        e.currentTarget.style.color = "var(--text-dim)";
                      }}
                      title={`Add task due on ${day.dateStr}`}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Tasks List on this day: Project Name Only (no cardview) */}
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    {dayTasks.map((task) => {
                      const statusColor = getStatusColor(task.status);
                      const isDragging = draggedTaskId === task.id;
                      const proj = projectMap.get(task.project_id);
                      const projectName = task.project_name || proj?.name || "Untitled Project";
                      const clientName = task.client_name || proj?.client?.company_name || "";

                      return (
                        <div
                          key={task.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onEditTask(task)}
                          style={{
                            padding: "2px 5px",
                            background: "var(--bg-surface-subtle)",
                            border: "1px solid var(--border-subtle)",
                            borderLeft: `3px solid ${statusColor}`,
                            borderRadius: "var(--radius-xs)",
                            cursor: "grab",
                            opacity: isDragging ? 0.35 : 1,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            minWidth: 0,
                            transition: "border-color 0.15s ease, background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-strong)";
                            e.currentTarget.style.background = "var(--bg-surface-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-subtle)";
                            e.currentTarget.style.background = "var(--bg-surface-subtle)";
                          }}
                          /* Hovering mouse shows full details */
                          title={`Project: ${projectName}\nClient: ${
                            clientName || "None"
                          }\nTask: ${task.title}\nEst: ${task.estimated_hours || 0} hrs | Status: ${
                            task.status
                          }\n(Drag to reschedule)`}
                        >
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 500,
                              color: "var(--text-main)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                          >
                            {projectName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Unscheduled Tasks Sidebar */}
        {isUnscheduledOpen && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={handleDropOnUnscheduled}
            style={{
              width: "270px",
              minWidth: "240px",
              maxWidth: "320px",
              borderLeft: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {/* Sidebar Header */}
            <div
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-surface-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Layers size={13} style={{ color: "var(--accent-amber)" }} />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-main)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Unscheduled ({unscheduledTasks.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsUnscheduledOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-dim)",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: "0 4px",
                  lineHeight: 1,
                }}
                title="Hide sidebar"
              >
                &times;
              </button>
            </div>

            <div
              style={{
                padding: "7px 10px",
                fontSize: "11px",
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border-subtle)",
                background: "rgba(0, 0, 0, 0.05)",
              }}
            >
              Drag to calendar to schedule. Drop here to unschedule.
            </div>

            {/* Unscheduled Tasks List */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {unscheduledTasks.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 10px",
                    color: "var(--text-dim)",
                    fontSize: "12px",
                  }}
                >
                  All tasks are scheduled with due dates.
                </div>
              ) : (
                unscheduledTasks.map((t) => {
                  const proj = projectMap.get(t.project_id);
                  const projectName = t.project_name || proj?.name || "Untitled Project";
                  const clientName = t.client_name || proj?.client?.company_name || "";
                  const statusColor = getStatusColor(t.status);

                  return (
                    <div
                      key={t.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onEditTask(t)}
                      style={{
                        padding: "6px 8px",
                        background: "var(--bg-surface-subtle)",
                        border: "1px solid var(--border-subtle)",
                        borderLeft: `3px solid ${statusColor}`,
                        borderRadius: "var(--radius-xs)",
                        cursor: "grab",
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                        transition: "border-color 0.15s ease, background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                        e.currentTarget.style.background = "var(--bg-surface-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-subtle)";
                        e.currentTarget.style.background = "var(--bg-surface-subtle)";
                      }}
                      title={`Task: ${t.title}\nProject: ${projectName}\nClient: ${
                        clientName || "None"
                      }\nEst: ${t.estimated_hours || 0} hrs\n(Drag onto calendar to schedule)`}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--text-main)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {projectName}
                        </span>
                        {t.estimated_hours > 0 && (
                          <span
                            className="mono"
                            style={{
                              fontSize: "9.5px",
                              color: "var(--accent-amber)",
                              flexShrink: 0,
                            }}
                          >
                            {t.estimated_hours}h
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <GripVertical
                          size={10}
                          style={{ color: "var(--text-dim)", flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontSize: "10.5px",
                            color: "var(--text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.title}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
