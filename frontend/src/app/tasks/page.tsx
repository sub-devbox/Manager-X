"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import TaskModal from "@/components/modules/projects/TaskModal";
import TaskTable from "@/components/modules/projects/TaskTable";
import { api } from "@/lib/api-client";
import { TaskData, TaskStatus, ProjectData } from "@/types/project";
import {
  CheckSquare,
  FolderKanban,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function TasksPage() {
  const [taskViewFilter, setTaskViewFilter] = useState<"pending" | "completed" | "all">("pending");
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
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
      const [taskData, projData, clientData] = await Promise.all([
        api.get<TaskData[]>("/tasks"),
        api.get<ProjectData[]>("/projects"),
        api.get<{ id: string; company_name: string }[]>("/clients"),
      ]);

      setTasks(Array.isArray(taskData) ? taskData : []);
      setProjects(Array.isArray(projData) ? projData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load task records." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    return tasks.filter((t) => {
      // 1. Completion view pill filter
      if (taskViewFilter === "pending" && t.status === "done") return false;
      if (taskViewFilter === "completed" && t.status !== "done") return false;

      // 2. Search query filter
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.project_name && t.project_name.toLowerCase().includes(q)) ||
        (t.client_name && t.client_name.toLowerCase().includes(q));

      // 3. Client filter
      const prj = projects.find((p) => p.id === t.project_id);
      const matchesClient = clientFilter === "all" || (prj && prj.client_id === clientFilter);

      return matchesSearch && matchesClient;
    });
  }, [tasks, taskViewFilter, searchQuery, clientFilter, projects]);

  // Aggregate stats
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((t) => t.status !== "done").length;
  const completedTasks = totalTasks - pendingTasks;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;

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
                  {totalTasks} total
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
              Total Deliverables
            </div>
            <div style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px" }} className="mono">
              {totalTasks}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Across all projects
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

        {/* Filter Controls Bar */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {/* Left Controls: Search + Client Filter */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flex: 1,
              minWidth: "280px",
              flexWrap: "wrap",
            }}
          >
            {/* Search Box */}
            <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
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

            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="finance-input"
              style={{ width: "170px", height: "36px", fontSize: "12.5px" }}
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>

            {(searchQuery || clientFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setClientFilter("all");
                }}
                className="finance-button-secondary"
                style={{ padding: "8px 12px", fontSize: "12px" }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Right Controls: Task View Option Pills */}
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
              onClick={() => setTaskViewFilter("pending")}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 500,
                borderRadius: "var(--radius-xs)",
                border: "none",
                cursor: "pointer",
                background: taskViewFilter === "pending" ? "var(--bg-surface)" : "transparent",
                color: taskViewFilter === "pending" ? "var(--accent-amber)" : "var(--text-muted)",
                boxShadow: taskViewFilter === "pending" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Pending Tasks ({pendingTasks})
            </button>
            <button
              type="button"
              onClick={() => setTaskViewFilter("completed")}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 500,
                borderRadius: "var(--radius-xs)",
                border: "none",
                cursor: "pointer",
                background: taskViewFilter === "completed" ? "var(--bg-surface)" : "transparent",
                color: taskViewFilter === "completed" ? "var(--accent-emerald)" : "var(--text-muted)",
                boxShadow: taskViewFilter === "completed" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Completed Tasks ({completedTasks})
            </button>
            <button
              type="button"
              onClick={() => setTaskViewFilter("all")}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 500,
                borderRadius: "var(--radius-xs)",
                border: "none",
                cursor: "pointer",
                background: taskViewFilter === "all" ? "var(--bg-surface)" : "transparent",
                color: taskViewFilter === "all" ? "var(--text-main)" : "var(--text-muted)",
                boxShadow: taskViewFilter === "all" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              All Tasks ({totalTasks})
            </button>
          </div>
        </div>

        {/* View Content: Dedicated Tasks Sheet */}
        <TaskTable
          tasks={filteredTasks}
          onEditTask={handleOpenEditTask}
          onDeleteTask={handleDeleteTask}
          onTaskStatusChange={handleTaskStatusChange}
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
