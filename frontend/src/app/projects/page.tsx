"use client";

import React, { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import ProjectModal from "@/components/modules/projects/ProjectModal";
import TaskModal from "@/components/modules/projects/TaskModal";
import ProjectTable from "@/components/modules/projects/ProjectTable";
import TaskTable from "@/components/modules/projects/TaskTable";
import { api } from "@/lib/api-client";
import { ProjectData, TaskData, TaskStatus } from "@/types/project";
import {
  FolderKanban,
  CheckSquare,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState<"projects" | "tasks">("projects");
  const [taskViewFilter, setTaskViewFilter] = useState<"pending" | "completed" | "all">("pending");

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [taskDefaultProjectId, setTaskDefaultProjectId] = useState<string | undefined>();
  const [taskDefaultStatus, setTaskDefaultStatus] = useState<TaskStatus>("backlog");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, taskData, clientData] = await Promise.all([
        api.get<ProjectData[]>("/projects"),
        api.get<TaskData[]>("/tasks"),
        api.get<{ id: string; company_name: string }[]>("/clients"),
      ]);

      setProjects(Array.isArray(projData) ? projData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load project records." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Project Actions
  const handleOpenNewProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: ProjectData) => {
    setEditingProject(proj);
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = async (proj: ProjectData) => {
    if (!confirm(`Delete project "${proj.name}"? This cannot be undone.`)) return;
    setActionMsg(null);
    try {
      await api.delete(`/projects/${proj.id}`);
      setActionMsg({ type: "success", text: `Project "${proj.name}" deleted.` });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to delete project." });
    }
  };

  // Task Actions
  const handleOpenNewTask = (projectId?: string, defaultCol: TaskStatus = "backlog") => {
    setEditingTask(null);
    setTaskDefaultProjectId(projectId);
    setTaskDefaultStatus(defaultCol);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: TaskData) => {
    setEditingTask(task);
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
      // Optimistic update in both tasks state and projects.tasks nested state
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          tasks: (p.tasks || []).map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
          completed_task_count:
            (p.tasks || []).filter((t) => (t.id === taskId ? newStatus === "done" : t.status === "done")).length,
        }))
      );
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to update task status." });
      fetchData();
    }
  };

  // Filtered Projects for Projects Table
  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.client?.company_name && p.client.company_name.toLowerCase().includes(q));

    const matchesClient = clientFilter === "all" || p.client_id === clientFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesClient && matchesStatus;
  });

  // Filtered Tasks for Dedicated Task Table
  const filteredTasks = tasks.filter((t) => {
    // 1. Task View Filter (Pending / Completed / All)
    if (taskViewFilter === "pending" && t.status === "done") return false;
    if (taskViewFilter === "completed" && t.status !== "done") return false;

    // 2. Search query
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.project_name && t.project_name.toLowerCase().includes(q)) ||
      (t.client_name && t.client_name.toLowerCase().includes(q));

    // 3. Client filter
    const prj = projects.find((p) => p.id === t.project_id);
    const matchesClient = clientFilter === "all" || (prj && prj.client_id === clientFilter);

    return matchesSearch && matchesClient;
  });

  // Aggregate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((t) => t.status !== "done").length;
  const completedTasks = totalTasks - pendingTasks;

  return (
    <AppShell title="Project & Task Management">
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

        {/* Header Bar with Dedicated Sheet Switcher */}
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
          {/* Primary View Switcher: Projects Sheet vs Tasks Sheet */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-surface-subtle)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-xs)",
              padding: "3px",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab("projects");
                setSearchQuery("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "6px 14px",
                fontSize: "12.5px",
                fontWeight: 600,
                borderRadius: "var(--radius-xs)",
                border: "none",
                cursor: "pointer",
                background: activeTab === "projects" ? "var(--bg-surface)" : "transparent",
                color: activeTab === "projects" ? "var(--text-main)" : "var(--text-muted)",
                boxShadow: activeTab === "projects" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <FolderKanban
                size={14}
                style={{ color: activeTab === "projects" ? "var(--accent-blue)" : "inherit" }}
              />
              <span>Projects Sheet</span>
              <span
                className="mono"
                style={{
                  fontSize: "10.5px",
                  padding: "0 6px",
                  borderRadius: "10px",
                  background: activeTab === "projects" ? "var(--bg-surface-subtle)" : "transparent",
                  color: "var(--text-dim)",
                }}
              >
                {totalProjects}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("tasks");
                setSearchQuery("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "6px 14px",
                fontSize: "12.5px",
                fontWeight: 600,
                borderRadius: "var(--radius-xs)",
                border: "none",
                cursor: "pointer",
                background: activeTab === "tasks" ? "var(--bg-surface)" : "transparent",
                color: activeTab === "tasks" ? "var(--text-main)" : "var(--text-muted)",
                boxShadow: activeTab === "tasks" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <CheckSquare
                size={14}
                style={{ color: activeTab === "tasks" ? "var(--accent-emerald)" : "inherit" }}
              />
              <span>Tasks Sheet</span>
              <span
                className="mono"
                style={{
                  fontSize: "10.5px",
                  padding: "0 6px",
                  borderRadius: "10px",
                  background: activeTab === "tasks" ? "var(--bg-surface-subtle)" : "transparent",
                  color: "var(--text-dim)",
                }}
              >
                {pendingTasks}
              </span>
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => handleOpenNewTask()}
              className="finance-button-secondary"
              style={{ width: "auto" }}
            >
              <Plus size={14} />
              <span>New Task</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewProject}
              className="finance-button-primary"
              style={{ width: "auto" }}
            >
              <Plus size={14} />
              <span>New Project</span>
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
              Total Projects
            </div>
            <div style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px" }} className="mono">
              {totalProjects}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Across all clients
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "16px", background: "var(--bg-surface)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Active Projects
            </div>
            <div
              style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px", color: "var(--accent-emerald)" }}
              className="mono"
            >
              {activeProjects}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              In active execution
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "16px", background: "var(--bg-surface)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Total Deliverables
            </div>
            <div style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px" }} className="mono">
              {totalTasks}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              {completedTasks} completed
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
          {/* Left Controls: Search + Dropdowns */}
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
                placeholder={
                  activeTab === "projects"
                    ? "Search projects or clients..."
                    : "Search tasks, project, or client..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finance-input"
                style={{ paddingLeft: "34px", fontSize: "13px" }}
              />
            </div>

            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="finance-input"
              style={{ width: "auto", minWidth: "160px" }}
            >
              <option value="all">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>

            {/* Status Filter for Projects */}
            {activeTab === "projects" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="finance-input"
                style={{ width: "auto", minWidth: "140px" }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="archived">Archived</option>
              </select>
            )}

            {(searchQuery || clientFilter !== "all" || (activeTab === "projects" && statusFilter !== "all")) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setClientFilter("all");
                  setStatusFilter("all");
                }}
                className="finance-button-secondary"
                style={{ padding: "8px 12px", fontSize: "12px" }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Right Controls: Dedicated Task View Option Pills (Pending [Default] | Completed | All) */}
          {activeTab === "tasks" && (
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
          )}
        </div>

        {/* View Content: Tabular Projects Sheet OR Dedicated Tasks Sheet */}
        {activeTab === "projects" ? (
          <ProjectTable
            projects={filteredProjects}
            onEditProject={handleOpenEditProject}
            onDeleteProject={handleDeleteProject}
            onAddTask={(projId) => handleOpenNewTask(projId)}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onTaskStatusChange={handleTaskStatusChange}
          />
        ) : (
          <TaskTable
            tasks={filteredTasks}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onTaskStatusChange={handleTaskStatusChange}
          />
        )}

        {/* Project Modal */}
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          onSuccess={fetchData}
          initialData={editingProject}
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
