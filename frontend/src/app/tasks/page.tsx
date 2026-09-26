"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import TaskModal from "@/components/modules/projects/TaskModal";
import TaskTable from "@/components/modules/projects/TaskTable";
import SearchableClientSelect from "@/components/common/SearchableClientSelect";
import { api } from "@/lib/api-client";
import { TaskData, TaskStatus, ProjectData } from "@/types/project";
import { TimeEntryData } from "@/types/time";
import {
  CheckSquare,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

type PeriodFilter = "today" | "this_week" | "this_month" | "custom";

export default function TasksPage() {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("this_month");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [taskDefaultProjectId, setTaskDefaultProjectId] = useState<string | undefined>();
  const [taskDefaultStatus, setTaskDefaultStatus] = useState<TaskStatus>("backlog");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskData, projData, clientData, entryData] = await Promise.all([
        api.get<TaskData[]>("/tasks"),
        api.get<ProjectData[]>("/projects"),
        api.get<{ id: string; company_name: string }[]>("/clients"),
        api.get<TimeEntryData[]>("/time-entries"),
      ]);

      setTasks(Array.isArray(taskData) ? taskData : []);
      setProjects(Array.isArray(projData) ? projData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
      setEntries(Array.isArray(entryData) ? entryData : []);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load task records." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for timer events saved from GlobalTimerBar or TimeTracker
  useEffect(() => {
    const handleTimerSaved = () => {
      fetchData();
    };
    window.addEventListener("mx_timer_saved", handleTimerSaved);
    return () => window.removeEventListener("mx_timer_saved", handleTimerSaved);
  }, [fetchData]);

  // Aggregate tracked seconds per task ID
  const timeTrackedMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.task_id) {
        map[entry.task_id] = (map[entry.task_id] || 0) + (entry.duration_seconds || 0);
      }
    }
    return map;
  }, [entries]);

  // Task Actions
  const handleOpenNewTask = (projectId?: string, defaultCol: TaskStatus = "backlog") => {
    setEditingTask(null);
    setTaskDefaultProjectId(projectId);
    setTaskDefaultStatus(defaultCol);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: TaskData) => {
    setEditingTask(task);
    setTaskDefaultProjectId(task.project_id);
    setTaskDefaultStatus(task.status);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = async (task: TaskData) => {
    setActionMsg(null);
    try {
      await api.delete(`/tasks/${task.id}`);
      setActionMsg({ type: "success", text: `Task "${task.title}" deleted.` });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to delete task." });
      throw err;
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to update task status." });
      fetchData();
    }
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Monday of this week
    const dayOfWeek = now.getDay() || 7; // Sunday is 7
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    // Sunday of this week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // First and last day of this month
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Tasks that had active time entries within selected period
    const taskIdsWithTimeInPeriod = new Set<string>();
    for (const entry of entries) {
      if (!entry.task_id) continue;
      const entryDateStr = entry.start_time ? entry.start_time.slice(0, 10) : "";
      const entryDate = entry.start_time ? new Date(entry.start_time) : null;
      let inPeriod = false;

      if (periodFilter === "today") {
        inPeriod = entryDateStr === todayStr;
      } else if (periodFilter === "this_week") {
        inPeriod = entryDate ? entryDate >= monday : false;
      } else if (periodFilter === "this_month") {
        inPeriod = entryDate ? entryDate >= firstOfMonth : false;
      } else if (periodFilter === "custom") {
        const afterStart = !customStartDate || entryDateStr >= customStartDate;
        const beforeEnd = !customEndDate || entryDateStr <= customEndDate;
        inPeriod = afterStart && beforeEnd;
      }

      if (inPeriod) {
        taskIdsWithTimeInPeriod.add(entry.task_id);
      }
    }

    return tasks.filter((t) => {
      // 1. Period View Filter
      const hasTimeInPeriod = taskIdsWithTimeInPeriod.has(t.id);
      let matchesPeriod = hasTimeInPeriod;

      if (!matchesPeriod) {
        const taskDateStr = t.due_date ? t.due_date.slice(0, 10) : (t.updated_at || t.created_at || "").slice(0, 10);
        const taskDate = taskDateStr ? new Date(taskDateStr) : null;

        if (periodFilter === "today") {
          matchesPeriod = taskDateStr === todayStr || (t.status === "in_progress" && (t.updated_at || "").slice(0, 10) === todayStr);
        } else if (periodFilter === "this_week") {
          if (!taskDate) matchesPeriod = true;
          else if (t.due_date) matchesPeriod = taskDate >= monday && taskDate <= sunday;
          else matchesPeriod = taskDate >= monday;
        } else if (periodFilter === "this_month") {
          if (!taskDate) matchesPeriod = true;
          else if (t.due_date) matchesPeriod = taskDate >= firstOfMonth && taskDate <= lastOfMonth;
          else matchesPeriod = taskDate >= firstOfMonth;
        } else if (periodFilter === "custom") {
          if (!taskDateStr) matchesPeriod = true;
          else {
            const afterStart = !customStartDate || taskDateStr >= customStartDate;
            const beforeEnd = !customEndDate || taskDateStr <= customEndDate;
            matchesPeriod = afterStart && beforeEnd;
          }
        }
      }

      if (!matchesPeriod) return false;

      // 2. Search query filter
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.project_name && t.project_name.toLowerCase().includes(q)) ||
        (t.client_name && t.client_name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 3. Client filter
      const prj = projects.find((p) => p.id === t.project_id);
      const matchesClient = clientFilter === "all" || (prj && prj.client_id === clientFilter);

      return matchesClient;
    });
  }, [tasks, entries, periodFilter, customStartDate, customEndDate, searchQuery, clientFilter, projects]);

  // Aggregate stats
  const totalTasks = filteredTasks.length;
  const pendingTasks = filteredTasks.filter((t) => t.status !== "done").length;
  const completedTasks = totalTasks - pendingTasks;
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress").length;

  return (
    <AppShell title="Tasks">
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Action Status Toast */}
        {actionMsg && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background:
                actionMsg.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)",
              border: `1px solid ${
                actionMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)"
              }`,
              color: actionMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {actionMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{actionMsg.text}</span>
            </div>
            <button
              onClick={() => setActionMsg(null)}
              style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Top Control Panel */}
        <div
          className="finance-panel"
          style={{
            padding: "16px 20px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Deliverables & Tasks
            </span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
              Manage Project Deliverables & Time
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => handleOpenNewTask()}
              className="finance-button-primary"
              style={{ height: "36px", padding: "0 16px", gap: "8px", fontWeight: 600, width: "auto" }}
            >
              <Plus size={13} />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Stats KPI Summary Bar (matching time-tracker presentation) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          <div
            className="finance-panel"
            style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(59, 130, 246, 0.12)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckSquare size={18} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                Total Deliverables
              </div>
              <div
                className="mono"
                style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}
              >
                {totalTasks}
              </div>
            </div>
          </div>

          <div
            className="finance-panel"
            style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(245, 158, 11, 0.12)",
                color: "var(--accent-amber)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                In Progress & Pending
              </div>
              <div
                className="mono"
                style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-amber)" }}
              >
                {inProgressTasks}{" "}
                <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-dim)" }}>
                  ({pendingTasks} pending)
                </span>
              </div>
            </div>
          </div>

          <div
            className="finance-panel"
            style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                Completed Deliverables
              </div>
              <div
                className="mono"
                style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-emerald)" }}
              >
                {completedTasks}
              </div>
            </div>
          </div>
        </div>

        {/* Period Filter Tabs & Search Controls (matching time-tracker) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Quick Period Selector (Left) */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--bg-surface-subtle)",
                padding: "3px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "this_week", label: "This week" },
                  { id: "this_month", label: "This month" },
                  { id: "custom", label: "Custom" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPeriodFilter(tab.id)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: periodFilter === tab.id ? 600 : 400,
                    color: periodFilter === tab.id ? "var(--text-main)" : "var(--text-dim)",
                    background: periodFilter === tab.id ? "var(--bg-surface)" : "transparent",
                    border:
                      periodFilter === tab.id
                        ? "1px solid var(--border-subtle)"
                        : "1px solid transparent",
                    borderRadius: "var(--radius-xs)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker */}
            {periodFilter === "custom" && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "var(--bg-surface-subtle)",
                  padding: "3px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "12px",
                }}
              >
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="finance-input"
                  style={{ height: "26px", fontSize: "11.5px", padding: "0 6px" }}
                  title="Start Date"
                />
                <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="finance-input"
                  style={{ height: "26px", fontSize: "11.5px", padding: "0 6px" }}
                  title="End Date"
                />
              </div>
            )}
          </div>

          {/* Search & Client Filter (Right) */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <SearchableClientSelect
              clients={clients}
              value={clientFilter}
              onChange={setClientFilter}
              placeholder="All Clients"
              width="180px"
            />

            <div style={{ position: "relative", width: "240px" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-dim)",
                }}
              />
              <input
                type="text"
                placeholder="Search tasks, projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finance-input"
                style={{ height: "36px", paddingLeft: "32px", fontSize: "12px", width: "100%" }}
              />
            </div>

            {(searchQuery || clientFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setClientFilter("all");
                }}
                className="finance-button-secondary"
                style={{
                  height: "36px",
                  padding: "0 12px",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
                title="Reset search and client filter"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* View Content: Dedicated Tasks Sheet */}
        <TaskTable
          tasks={filteredTasks}
          timeTrackedMap={timeTrackedMap}
          onEditTask={handleOpenEditTask}
          onDeleteTask={handleDeleteTask}
          onTaskStatusChange={handleTaskStatusChange}
          onTimerNotice={setActionMsg}
        />

        {/* Task Modal */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSuccess={fetchData}
          onDelete={handleDeleteTask}
          initialData={editingTask}
          defaultProjectId={taskDefaultProjectId}
          defaultStatus={taskDefaultStatus}
        />
      </div>
    </AppShell>
  );
}
