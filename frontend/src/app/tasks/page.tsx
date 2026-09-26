"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import TaskModal from "@/components/modules/projects/TaskModal";
import TaskTable from "@/components/modules/projects/TaskTable";
import SearchableClientSelect from "@/components/common/SearchableClientSelect";
import { api } from "@/lib/api-client";
import { TaskData, TaskStatus, ProjectData } from "@/types/project";
import { TimeEntryData } from "@/types/time";
import {
  CheckSquare,
  FolderKanban,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

type PeriodFilter = "today" | "this_week" | "this_month" | "custom";

export default function TasksPage() {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("this_week");
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
    if (!confirm(`Delete task "${task.title}"?`)) return;
    setActionMsg(null);
    try {
      await api.delete(`/tasks/${task.id}`);
      setActionMsg({ type: "success", text: `Task "${task.title}" deleted.` });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to delete task." });
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

        {/* Header Bar */}
        <div
          className="finance-panel"
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          {/* Header Title with Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
              <CheckSquare size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)" }}>
                  Tasks Sheet
                </h2>
                <span
                  className="mono"
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: "var(--bg-surface-subtle)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-dim)",
                  }}
                >
                  {totalTasks} shown ({tasks.length} total)
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Manage deliverables, deadlines, statuses, and live time tracking
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link
              href="/projects"
              className="finance-button-secondary"
              style={{ textDecoration: "none", gap: "6px", fontSize: "12.5px" }}
            >
              <FolderKanban size={14} style={{ color: "var(--accent-blue)" }} />
              <span>Projects Sheet</span>
            </Link>

            <button
              type="button"
              onClick={() => handleOpenNewTask()}
              className="finance-button-primary"
              style={{ width: "auto" }}
            >
              <Plus size={14} />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          <div className="finance-panel" style={{ padding: "16px", background: "var(--bg-surface)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Total in View
            </div>
            <div style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px" }} className="mono">
              {totalTasks}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Matching active view filter
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "16px", background: "var(--bg-surface)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Pending Tasks
            </div>
            <div
              style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px", color: "var(--accent-amber)" }}
              className="mono"
            >
              {pendingTasks}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Awaiting completion
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "16px", background: "var(--bg-surface)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>
              In Progress
            </div>
            <div
              style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px", color: "var(--accent-blue)" }}
              className="mono"
            >
              {inProgressTasks}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Actively in execution
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "16px", background: "var(--bg-surface)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Completed Tasks
            </div>
            <div
              style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px", color: "var(--accent-emerald)" }}
              className="mono"
            >
              {completedTasks}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Successfully closed
            </div>
          </div>
        </div>

        {/* Filter Controls Bar: View Switch (Left) | Client Filter (Middle) | Search Bar (Right) */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {/* LEFT: View Switcher (today | This week (default) | This month | Custom) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                background: "var(--bg-surface-subtle)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-xs)",
                padding: "2px",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => setPeriodFilter("today")}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  borderRadius: "var(--radius-xs)",
                  border: "none",
                  cursor: "pointer",
                  background: periodFilter === "today" ? "var(--bg-surface)" : "transparent",
                  color: periodFilter === "today" ? "var(--accent-blue)" : "var(--text-muted)",
                  boxShadow: periodFilter === "today" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                today
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("this_week")}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  borderRadius: "var(--radius-xs)",
                  border: "none",
                  cursor: "pointer",
                  background: periodFilter === "this_week" ? "var(--bg-surface)" : "transparent",
                  color: periodFilter === "this_week" ? "var(--accent-blue)" : "var(--text-muted)",
                  boxShadow: periodFilter === "this_week" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                This week
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("this_month")}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  borderRadius: "var(--radius-xs)",
                  border: "none",
                  cursor: "pointer",
                  background: periodFilter === "this_month" ? "var(--bg-surface)" : "transparent",
                  color: periodFilter === "this_month" ? "var(--accent-blue)" : "var(--text-muted)",
                  boxShadow: periodFilter === "this_month" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                This month
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("custom")}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  borderRadius: "var(--radius-xs)",
                  border: "none",
                  cursor: "pointer",
                  background: periodFilter === "custom" ? "var(--bg-surface)" : "transparent",
                  color: periodFilter === "custom" ? "var(--accent-blue)" : "var(--text-muted)",
                  boxShadow: periodFilter === "custom" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Custom
              </button>
            </div>

            {/* Custom Date Pickers */}
            {periodFilter === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="finance-input"
                  style={{ height: "32px", fontSize: "11px", width: "130px" }}
                />
                <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="finance-input"
                  style={{ height: "32px", fontSize: "11px", width: "130px" }}
                />
              </div>
            )}
          </div>

          {/* MIDDLE: Searchable Client Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SearchableClientSelect
              clients={clients}
              value={clientFilter}
              onChange={setClientFilter}
              placeholder="All Clients"
              width="210px"
            />
          </div>

          {/* RIGHT: Search Box + Reset */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: "1 1 240px",
              maxWidth: "340px",
              marginLeft: "auto",
            }}
          >
            <div style={{ position: "relative", width: "100%" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-dim)",
                }}
              />
              <input
                type="text"
                placeholder="Search tasks, projects, clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finance-input"
                style={{ paddingLeft: "34px", width: "100%", height: "36px", fontSize: "12.5px" }}
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
                style={{ padding: "8px 12px", fontSize: "12px", whiteSpace: "nowrap" }}
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
          initialData={editingTask}
          defaultProjectId={taskDefaultProjectId}
          defaultStatus={taskDefaultStatus}
        />
      </div>
    </AppShell>
  );
}
