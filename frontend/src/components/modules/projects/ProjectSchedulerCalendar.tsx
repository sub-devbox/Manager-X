"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { ProjectData, ProjectStatus } from "@/types/project";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Maximize2,
  Minimize2,
  FolderKanban,
  CheckCircle2,
  Calendar as CalendarIcon,
  Layers,
  Building2,
  GripVertical,
} from "lucide-react";

interface ProjectSchedulerCalendarProps {
  projects: ProjectData[];
  onUpdateProjectDueDate: (projectId: string, newEndDate: string) => Promise<void> | void;
  onOpenNewProject: (defaultDate?: string) => void;
  onEditProject: (project: ProjectData) => void;
  onSelectProjectTasks?: (project: ProjectData) => void;
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
  projects,
  onUpdateProjectDueDate,
  onOpenNewProject,
  onEditProject,
  onSelectProjectTasks,
}: ProjectSchedulerCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isUnscheduledOpen, setIsUnscheduledOpen] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
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

  // Group projects by due date (end_date)
  const { projectsByDate, unscheduledProjects } = useMemo(() => {
    const map: Record<string, ProjectData[]> = {};
    const unscheduled: ProjectData[] = [];

    for (const p of projects) {
      if (p.end_date) {
        const d = p.end_date.slice(0, 10);
        if (!map[d]) map[d] = [];
        map[d].push(p);
      } else {
        unscheduled.push(p);
      }
    }

    return { projectsByDate: map, unscheduledProjects: unscheduled };
  }, [projects]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData("text/plain", projectId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedProjectId(projectId);
  };

  const handleDragEnd = () => {
    setDraggedProjectId(null);
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
    const projectId = e.dataTransfer.getData("text/plain") || draggedProjectId;
    setDraggedProjectId(null);
    setDragOverDate(null);

    if (!projectId) return;

    const targetProject = projects.find((p) => p.id === projectId);
    if (!targetProject) return;

    if (targetProject.end_date?.slice(0, 10) === targetDateStr) {
      return;
    }

    await onUpdateProjectDueDate(projectId, targetDateStr);
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "active":
        return "var(--accent-blue)";
      case "completed":
        return "var(--accent-emerald)";
      case "on_hold":
        return "var(--accent-amber)";
      case "archived":
        return "var(--text-dim)";
      default:
        return "var(--accent-blue)";
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
              height: "calc(100vh - 200px)",
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
        {/* Left: Navigation and Month Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
              title="Previous Month"
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
              title="Next Month"
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
              minWidth: "160px",
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
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Unscheduled Drawer Toggle */}
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
            title="Projects without due dates"
          >
            <Layers size={13} />
            <span>Unscheduled ({unscheduledProjects.length})</span>
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

          {/* Quick Create Project */}
          <button
            type="button"
            onClick={() => onOpenNewProject()}
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
            <span>New Project</span>
          </button>
        </div>
      </div>

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
          const dayProjects = projectsByDate[day.dateStr] || [];
          const isOver = dragOverDate === day.dateStr;

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
                padding: "6px 8px",
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
                }}
              >
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
                    padding: day.isToday ? "1px 6px" : "0",
                    borderRadius: day.isToday ? "10px" : "0",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {day.dayNumber}
                </span>

                {/* Add Project on this specific date */}
                <button
                  type="button"
                  onClick={() => onOpenNewProject(day.dateStr)}
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
                  title={`Add project due on ${day.dateStr}`}
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Projects List on this day */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {dayProjects.map((project) => {
                  const statusColor = getStatusColor(project.status);
                  const isDragging = draggedProjectId === project.id;

                  return (
                    <div
                      key={project.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, project.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onEditProject(project)}
                      style={{
                        padding: "4px 6px",
                        background: "var(--bg-surface-subtle)",
                        border: "1px solid var(--border-subtle)",
                        borderLeft: `3px solid ${statusColor}`,
                        borderRadius: "var(--radius-xs)",
                        cursor: "grab",
                        opacity: isDragging ? 0.35 : 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        transition: "transform 0.1s ease, border-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-subtle)";
                      }}
                      title={`${project.name}\nDue Date: ${project.end_date?.slice(0, 10)}\nStatus: ${
                        project.status
                      }\n(Drag to reschedule)`}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "4px",
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
                          {project.name}
                        </span>
                        {project.task_count > 0 && (
                          <span
                            onClick={(e) => {
                              if (onSelectProjectTasks) {
                                e.stopPropagation();
                                onSelectProjectTasks(project);
                              }
                            }}
                            style={{
                              fontSize: "9.5px",
                              color:
                                project.completed_task_count === project.task_count
                                  ? "var(--accent-emerald)"
                                  : "var(--text-dim)",
                              fontWeight: 500,
                              flexShrink: 0,
                            }}
                            title="Click to view tasks"
                          >
                            {project.completed_task_count}/{project.task_count}
                          </span>
                        )}
                      </div>

                      {project.client?.company_name && (
                        <div
                          style={{
                            fontSize: "9.5px",
                            color: "var(--text-dim)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <Building2 size={9} />
                          <span>{project.client.company_name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled Projects Dock / Drawer */}
      {isUnscheduledOpen && (
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            padding: "10px 14px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>
              UNSCHEDULED PROJECTS (Drag onto any calendar date to set due date)
            </span>
            <button
              type="button"
              onClick={() => setIsUnscheduledOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            {unscheduledProjects.length === 0 ? (
              <span style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
                All projects currently have scheduled due dates.
              </span>
            ) : (
              unscheduledProjects.map((p) => (
                <div
                  key={p.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, p.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onEditProject(p)}
                  style={{
                    padding: "6px 10px",
                    background: "var(--bg-surface-subtle)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-xs)",
                    cursor: "grab",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                  }}
                  title="Drag onto a calendar date to set due date"
                >
                  <GripVertical size={12} style={{ color: "var(--text-dim)" }} />
                  <span style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--text-main)" }}>
                    {p.name}
                  </span>
                  {p.client?.company_name && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--text-dim)",
                        background: "var(--bg-surface)",
                        padding: "1px 5px",
                        borderRadius: "3px",
                      }}
                    >
                      {p.client.company_name}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
