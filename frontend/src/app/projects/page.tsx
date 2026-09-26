"use client";

import React, { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import ProjectModal from "@/components/modules/projects/ProjectModal";
import TaskModal from "@/components/modules/projects/TaskModal";
import KanbanBoard from "@/components/modules/projects/KanbanBoard";
import { api } from "@/lib/api-client";
import { ProjectData, TaskData, TaskStatus, ProjectStatus } from "@/types/project";
import {
  FolderKanban,
  CheckSquare,
  Plus,
  Search,
  Building2,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  LayoutGrid,
  Columns,
} from "lucide-react";

export default function ProjectsPage() {
  const [activeView, setActiveView] = useState<"projects" | "kanban">("projects");
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

  // Filtered lists
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.client?.company_name && p.client.company_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesClient = clientFilter === "all" || p.client_id === clientFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesClient && matchesStatus;
  });

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const prj = projects.find((p) => p.id === t.project_id);
    const matchesClient = clientFilter === "all" || (prj && prj.client_id === clientFilter);

    return matchesSearch && matchesClient;
  });

  // Aggregate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((t) => t.status !== "done").length;

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

        {/* Header Bar */}
        <div
          className="finance-panel"
          style={{
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>
              Operational Deliverables & Kanban Sprints
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px", margin: 0 }}>
              Organize engagements, sprint milestones, and billable work packages.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-surface-subtle)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-xs)",
                padding: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveView("projects")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  borderRadius: "var(--radius-xs)",
                  border: "none",
                  cursor: "pointer",
                  background: activeView === "projects" ? "var(--bg-surface)" : "transparent",
                  color: activeView === "projects" ? "var(--text-main)" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                <LayoutGrid size={13} />
                <span>Projects</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("kanban")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  borderRadius: "var(--radius-xs)",
                  border: "none",
                  cursor: "pointer",
                  background: activeView === "kanban" ? "var(--bg-surface)" : "transparent",
                  color: activeView === "kanban" ? "var(--text-main)" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                <Columns size={13} />
                <span>Kanban Board</span>
              </button>
            </div>

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
            <div style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px", color: "var(--accent-emerald)" }} className="mono">
              {activeProjects}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              In active execution
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "16px", background: "var(--bg-surface)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Total Tasks
            </div>
            <div style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px" }} className="mono">
              {totalTasks}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Logged deliverables
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "16px", background: "var(--bg-surface)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Pending Tasks
            </div>
            <div style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px", color: "var(--accent-amber)" }} className="mono">
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
              placeholder={activeView === "projects" ? "Search projects..." : "Search tasks..."}
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
            style={{ width: "auto", minWidth: "170px" }}
          >
            <option value="all">All Clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>

          {/* Status Filter (Projects View) */}
          {activeView === "projects" && (
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

          {(searchQuery || clientFilter !== "all" || statusFilter !== "all") && (
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

        {/* View Content: Projects Grid OR Kanban Board */}
        {activeView === "projects" ? (
          <div>
            {filteredProjects.length === 0 ? (
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
                <div style={{ fontSize: "15px", fontWeight: 600 }}>No Projects Found</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "400px" }}>
                  {searchQuery || clientFilter !== "all" || statusFilter !== "all"
                    ? "No projects match your active search filters."
                    : "Create your first project to begin organizing client engagements and Kanban sprints."}
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewProject}
                  className="finance-button-primary"
                  style={{ width: "auto", marginTop: "4px" }}
                >
                  <Plus size={14} />
                  <span>Create Project</span>
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "16px",
                }}
              >
                {filteredProjects.map((proj) => {
                  const percent =
                    proj.task_count > 0
                      ? Math.round((proj.completed_task_count / proj.task_count) * 100)
                      : 0;

                  return (
                    <div
                      key={proj.id}
                      className="finance-panel"
                      style={{
                        padding: "18px",
                        background: "var(--bg-surface)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "14px",
                        border: "1px solid var(--border-subtle)",
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      <div>
                        {/* Top: Status & Client */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-xs)",
                              background:
                                proj.status === "active"
                                  ? "rgba(16, 185, 129, 0.12)"
                                  : proj.status === "completed"
                                  ? "rgba(59, 130, 246, 0.12)"
                                  : "rgba(148, 163, 184, 0.12)",
                              color:
                                proj.status === "active"
                                  ? "var(--accent-emerald)"
                                  : proj.status === "completed"
                                  ? "var(--accent-blue)"
                                  : "var(--text-dim)",
                              border: "1px solid",
                              borderColor:
                                proj.status === "active"
                                  ? "rgba(16, 185, 129, 0.3)"
                                  : proj.status === "completed"
                                  ? "rgba(59, 130, 246, 0.3)"
                                  : "var(--border-subtle)",
                            }}
                          >
                            {proj.status.replace("_", " ")}
                          </span>

                          {proj.client && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-dim)" }}>
                              <Building2 size={12} />
                              <span style={{ fontWeight: 500 }}>{proj.client.company_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Project Name */}
                        <h3
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            marginTop: "10px",
                            marginBottom: "4px",
                            letterSpacing: "-0.2px",
                          }}
                        >
                          {proj.name}
                        </h3>

                        {proj.description && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              lineHeight: "1.4",
                              margin: 0,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {proj.description}
                          </p>
                        )}
                      </div>

                      {/* Commercial Details & Progress */}
                      <div>
                        {/* Commercials: Billing & Rate */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "12px",
                            paddingBottom: "8px",
                            borderBottom: "1px solid var(--border-subtle)",
                            marginBottom: "10px",
                          }}
                        >
                          <span style={{ color: "var(--text-dim)", textTransform: "capitalize" }}>
                            {proj.billing_type} model
                          </span>
                          <span className="mono" style={{ fontWeight: 600 }}>
                            {proj.billing_type === "hourly"
                              ? `${proj.client?.currency_code || "INR"} ${proj.hourly_rate?.toFixed(2)}/hr`
                              : proj.billing_type === "fixed"
                              ? `${proj.client?.currency_code || "INR"} ${proj.budget_amount?.toFixed(2)} budget`
                              : "Internal"}
                          </span>
                        </div>

                        {/* Tasks Completion Progress */}
                        <div style={{ marginBottom: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>
                            <span>Deliverables Progress</span>
                            <span className="mono">
                              {proj.completed_task_count}/{proj.task_count} tasks ({percent}%)
                            </span>
                          </div>
                          <div
                            style={{
                              height: "6px",
                              width: "100%",
                              background: "var(--bg-surface-subtle)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "3px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${percent}%`,
                                background: percent === 100 ? "var(--accent-emerald)" : "var(--accent-blue)",
                                transition: "width 0.25s ease",
                              }}
                            />
                          </div>
                        </div>

                        {/* Dates & Actions */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "11px",
                            color: "var(--text-dim)",
                          }}
                        >
                          {proj.start_date ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Calendar size={11} />
                              <span className="mono">{proj.start_date}</span>
                            </div>
                          ) : (
                            <div />
                          )}

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenNewTask(proj.id)}
                              className="finance-button-secondary"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              title="Add Task to this Project"
                            >
                              <Plus size={11} />
                              <span>Task</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditProject(proj)}
                              className="finance-button-secondary"
                              style={{ padding: "4px 6px" }}
                              title="Edit Project Details"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(proj)}
                              className="finance-button-secondary"
                              style={{ padding: "4px 6px", color: "var(--accent-rose)" }}
                              title="Delete Project"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Kanban Board View */
          <div>
            <KanbanBoard
              tasks={filteredTasks}
              projects={projects}
              onStatusChange={handleTaskStatusChange}
              onEditTask={handleOpenEditTask}
              onDeleteTask={handleDeleteTask}
              onAddTaskToColumn={(col) => handleOpenNewTask(undefined, col)}
            />
          </div>
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
