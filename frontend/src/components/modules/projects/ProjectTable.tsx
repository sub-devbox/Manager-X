"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ProjectData, TaskData, TaskStatus } from "@/types/project";
import { useResizableColumns, ResizeHandle } from "@/hooks/useResizableColumns";
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
  ChevronDown,
  CheckSquare,
  Clock,
  FolderKanban,
} from "lucide-react";

interface ProjectTableProps {
  projects: ProjectData[];
  onEditProject: (project: ProjectData) => void;
  onDeleteProject: (project: ProjectData) => void;
  onAddTask: (projectId: string) => void;
  onEditTask?: (task: TaskData) => void;
  onDeleteTask?: (task: TaskData) => void;
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}

type SortField = "name" | "client" | "completion" | "rate" | "due_date";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

const DEFAULT_PROJECT_WIDTHS = {
  name: 260,
  client: 180,
  completion: 160,
  rate: 150,
  due_date: 130,
  actions: 110,
};

const MIN_PROJECT_WIDTHS = {
  name: 140,
  client: 100,
  completion: 110,
  rate: 100,
  due_date: 90,
  actions: 90,
};

export default function ProjectTable({
  projects,
  onEditProject,
  onDeleteProject,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onTaskStatusChange,
}: ProjectTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());

  const { widths, startResize, totalWidth } = useResizableColumns(
    "mx_col_widths_projects",
    DEFAULT_PROJECT_WIDTHS,
    MIN_PROJECT_WIDTHS
  );

  const toggleExpand = (projectId: string) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

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
                height: "36px",
              }}
            >
              {/* 1. Project Name */}
              <th
                onClick={() => handleSort("name")}
                style={{
                  position: "relative",
                  width: `${widths.name}px`,
                  minWidth: `${MIN_PROJECT_WIDTHS.name}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "name" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
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

              {/* 3. Completion % */}
              <th
                onClick={() => handleSort("completion")}
                style={{
                  position: "relative",
                  width: `${widths.completion}px`,
                  minWidth: `${MIN_PROJECT_WIDTHS.completion}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "completion" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Completion %</span>
                  {renderSortIndicator("completion")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("completion", e)} />
              </th>

              {/* 4. Rate */}
              <th
                onClick={() => handleSort("rate")}
                style={{
                  position: "relative",
                  width: `${widths.rate}px`,
                  minWidth: `${MIN_PROJECT_WIDTHS.rate}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: sortField === "rate" ? "var(--text-main)" : "var(--text-dim)",
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Rate / Budget</span>
                  {renderSortIndicator("rate")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("rate", e)} />
              </th>

              {/* 5. Due Date */}
              <th
                onClick={() => handleSort("due_date")}
                style={{
                  position: "relative",
                  width: `${widths.due_date}px`,
                  minWidth: `${MIN_PROJECT_WIDTHS.due_date}px`,
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

              const isExpanded = expandedProjectIds.has(proj.id);
              const tasks = proj.tasks || [];

              return (
                <React.Fragment key={proj.id}>
                  {/* Primary Project Row */}
                  <tr
                    onClick={() => toggleExpand(proj.id)}
                    style={{
                      borderBottom: isExpanded ? "none" : "1px solid var(--border-subtle)",
                      height: "38px",
                      cursor: "pointer",
                      background: isExpanded ? "var(--bg-surface-subtle)" : "transparent",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isExpanded) e.currentTarget.style.background = "var(--bg-surface-subtle)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {/* Project Name + Chevron + Status Indicator */}
                    <td style={{ padding: "6px 12px", fontWeight: 500, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            color: "var(--text-dim)",
                            display: "inline-flex",
                            alignItems: "center",
                            transition: "transform 0.15s ease",
                            transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                          }}
                          title={isExpanded ? "Collapse task list" : "Click to view project tasks"}
                        >
                          <ChevronDown size={14} />
                        </div>

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
                            maxWidth: "230px",
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
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            border: `1px solid ${
                              effectiveStatus === "completed"
                                ? "rgba(59, 130, 246, 0.4)"
                                : effectiveStatus === "active"
                                ? "rgba(16, 185, 129, 0.4)"
                                : "var(--border-subtle)"
                            }`,
                            background:
                              effectiveStatus === "completed"
                                ? "rgba(59, 130, 246, 0.1)"
                                : effectiveStatus === "active"
                                ? "rgba(16, 185, 129, 0.1)"
                                : "transparent",
                            color:
                              effectiveStatus === "completed"
                                ? "var(--accent-blue)"
                                : effectiveStatus === "active"
                                ? "var(--accent-emerald)"
                                : "var(--text-muted)",
                            textTransform: "capitalize",
                          }}
                        >
                          {effectiveStatus.replace("_", " ")}
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
                      <div
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onAddTask(proj.id)}
                          className="finance-button-secondary"
                          style={{ padding: "3px 6px", fontSize: "10px", gap: "2px" }}
                          title="Add Task to this project"
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

                  {/* Expandable Nested Tasks View */}
                  {isExpanded && (
                    <tr
                      style={{
                        background: "var(--bg-surface-subtle)",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <td colSpan={6} style={{ padding: "8px 16px 14px 28px" }}>
                        <div
                          style={{
                            borderLeft: "2px solid var(--accent-primary, #ffffff)",
                            paddingLeft: "14px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          {/* Nested Tasks Header */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <CheckSquare size={13} style={{ color: "var(--accent-blue)" }} />
                              <span style={{ fontSize: "12px", fontWeight: 600 }}>
                                Tasks for "{proj.name}"
                              </span>
                              <span
                                className="mono"
                                style={{
                                  fontSize: "11px",
                                  padding: "1px 6px",
                                  borderRadius: "var(--radius-xs)",
                                  background: "var(--bg-surface)",
                                  border: "1px solid var(--border-subtle)",
                                  color: "var(--text-dim)",
                                }}
                              >
                                {tasks.length} items
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddTask(proj.id);
                              }}
                              className="finance-button-primary"
                              style={{ padding: "3px 8px", fontSize: "11px", width: "auto" }}
                            >
                              <Plus size={11} />
                              <span>Add Task</span>
                            </button>
                          </div>

                          {/* Nested Tasks Table */}
                          {tasks.length === 0 ? (
                            <div
                              style={{
                                padding: "12px",
                                textAlign: "center",
                                color: "var(--text-dim)",
                                fontSize: "12px",
                                background: "var(--bg-surface)",
                                border: "1px dashed var(--border-subtle)",
                                borderRadius: "var(--radius-xs)",
                              }}
                            >
                              No tasks assigned to this project yet. Click "+ Add Task" to create one.
                            </div>
                          ) : (
                            <div
                              style={{
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "var(--radius-xs)",
                                overflow: "hidden",
                                background: "var(--bg-surface)",
                              }}
                            >
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: "11.5px",
                                  textAlign: "left",
                                }}
                              >
                                <thead>
                                  <tr
                                    style={{
                                      background: "var(--bg-surface-subtle)",
                                      borderBottom: "1px solid var(--border-subtle)",
                                      height: "28px",
                                    }}
                                  >
                                    <th style={{ padding: "4px 10px", fontWeight: 600, color: "var(--text-dim)" }}>
                                      Task Title
                                    </th>
                                    <th style={{ padding: "4px 10px", fontWeight: 600, color: "var(--text-dim)", width: "130px" }}>
                                      Status
                                    </th>
                                    <th style={{ padding: "4px 10px", fontWeight: 600, color: "var(--text-dim)", width: "160px" }}>
                                      Checklist
                                    </th>
                                    <th style={{ padding: "4px 10px", fontWeight: 600, color: "var(--text-dim)", width: "90px" }}>
                                      Est. Hours
                                    </th>
                                    <th style={{ padding: "4px 10px", fontWeight: 600, color: "var(--text-dim)", textAlign: "right", width: "80px" }}>
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tasks.map((task) => {
                                    const checklist = task.checklist || [];
                                    const completedItems = checklist.filter((i) => i.completed).length;
                                    const totalItems = checklist.length;
                                    const allCompleted = totalItems > 0 && completedItems === totalItems;

                                    return (
                                      <tr
                                        key={task.id}
                                        style={{
                                          borderBottom: "1px solid var(--border-subtle)",
                                          height: "32px",
                                        }}
                                      >
                                        {/* Task Title */}
                                        <td style={{ padding: "4px 10px", fontWeight: 500 }}>
                                          <span style={{ color: "var(--text-main)" }}>{task.title}</span>
                                        </td>

                                        {/* Status Dropdown */}
                                        <td style={{ padding: "4px 10px" }}>
                                          <select
                                            value={task.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                              onTaskStatusChange &&
                                              onTaskStatusChange(task.id, e.target.value as TaskStatus)
                                            }
                                            className="finance-input"
                                            style={{
                                              padding: "2px 6px",
                                              fontSize: "11px",
                                              height: "24px",
                                              cursor: "pointer",
                                            }}
                                          >
                                            <option value="backlog">Backlog</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="review">Review</option>
                                            <option value="done">Done</option>
                                          </select>
                                        </td>

                                        {/* Checklist Summary */}
                                        <td style={{ padding: "4px 10px" }}>
                                          {totalItems > 0 ? (
                                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                              <CheckSquare
                                                size={12}
                                                style={{
                                                  color: allCompleted
                                                    ? "var(--accent-emerald)"
                                                    : "var(--accent-blue)",
                                                }}
                                              />
                                              <span
                                                className="mono"
                                                style={{
                                                  fontSize: "10.5px",
                                                  padding: "1px 6px",
                                                  borderRadius: "var(--radius-xs)",
                                                  background: allCompleted
                                                    ? "rgba(16, 185, 129, 0.15)"
                                                    : "var(--bg-surface-subtle)",
                                                  color: allCompleted
                                                    ? "var(--accent-emerald)"
                                                    : "var(--text-muted)",
                                                  border: `1px solid ${
                                                    allCompleted
                                                      ? "var(--accent-emerald)"
                                                      : "var(--border-subtle)"
                                                  }`,
                                                }}
                                              >
                                                {completedItems}/{totalItems}
                                              </span>
                                              <span style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>
                                                {allCompleted ? "Done" : `${totalItems - completedItems} left`}
                                              </span>
                                            </div>
                                          ) : (
                                            <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>—</span>
                                          )}
                                        </td>

                                        {/* Estimated Hours */}
                                        <td style={{ padding: "4px 10px" }} className="mono">
                                          {task.estimated_hours > 0 ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                              <Clock size={11} style={{ color: "var(--text-dim)" }} />
                                              <span>{task.estimated_hours}h</span>
                                            </div>
                                          ) : (
                                            <span style={{ color: "var(--text-dim)" }}>—</span>
                                          )}
                                        </td>

                                        {/* Task Actions */}
                                        <td style={{ padding: "4px 10px", textAlign: "right" }}>
                                          <div
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "4px",
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => onEditTask && onEditTask(task)}
                                              className="finance-button-secondary"
                                              style={{ padding: "2px 5px" }}
                                              title="Edit Task"
                                            >
                                              <Pencil size={10} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => onDeleteTask && onDeleteTask(task)}
                                              className="finance-button-secondary"
                                              style={{ padding: "2px 5px", color: "var(--accent-rose)" }}
                                              title="Delete Task"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
            Page {safeCurrentPage} of {totalPages}
          </span>

          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="finance-button-secondary"
              style={{
                padding: "3px 8px",
                fontSize: "11px",
                opacity: safeCurrentPage <= 1 ? 0.4 : 1,
                cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
              }}
              title="Previous 50 projects"
            >
              <ChevronLeft size={12} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="finance-button-secondary"
              style={{
                padding: "3px 8px",
                fontSize: "11px",
                opacity: safeCurrentPage >= totalPages ? 0.4 : 1,
                cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer",
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
