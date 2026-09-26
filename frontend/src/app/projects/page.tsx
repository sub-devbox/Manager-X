"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import ProjectModal from "@/components/modules/projects/ProjectModal";
import TaskModal from "@/components/modules/projects/TaskModal";
import ProjectTable from "@/components/modules/projects/ProjectTable";
import SearchableClientSelect from "@/components/common/SearchableClientSelect";
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

      const rawProjects = Array.isArray(projData) ? projData : [];
      const processedProjects = rawProjects.map((p) => {
        const is100 = p.task_count > 0 && p.completed_task_count === p.task_count;
        return is100 && p.status !== "archived" ? { ...p, status: "completed" as const } : p;
      });
      setProjects(processedProjects);
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
      // Optimistic update in both tasks state and projects.tasks nested state
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      setProjects((prev) =>
        prev.map((p) => {
          const updatedTasks = (p.tasks || []).map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
          const completedCount = updatedTasks.filter((t) => t.status === "done").length;
          const is100 = updatedTasks.length > 0 && completedCount === updatedTasks.length;
          let newProjStatus = p.status;
          if (is100 && p.status !== "archived") {
            newProjStatus = "completed";
          } else if (!is100 && p.status === "completed") {
            newProjStatus = "active";
          }
          return {
            ...p,
            tasks: updatedTasks,
            completed_task_count: completedCount,
            status: newProjStatus,
          };
        })
      );
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to update task status." });
      fetchData();
    }
  };

  // Filtered Projects for Projects Table
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
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
  }, [projects, searchQuery, clientFilter, statusFilter]);

  // Aggregate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const totalTasks = tasks.length;

  return (
    <AppShell title="Projects">
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
                background: "rgba(59, 130, 246, 0.12)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FolderKanban size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)" }}>
                  Projects Sheet
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
                  {totalProjects} total
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Manage client engagements, milestones, and deliverable pipelines
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link
              href="/tasks"
              className="finance-button-secondary"
              style={{ textDecoration: "none", gap: "6px", fontSize: "12.5px" }}
            >
              <CheckSquare size={14} style={{ color: "var(--accent-emerald)" }} />
              <span>Tasks Sheet</span>
            </Link>

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
              Completed Projects
            </div>
            <div
              style={{ fontSize: "22px", fontWeight: 600, marginTop: "6px", color: "var(--accent-blue)" }}
              className="mono"
            >
              {completedProjects}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              100% deliverables done
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
              Tracked across projects
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        {/* Filter Controls Bar: Status View (Left) | Client Filter (Middle) | Search Bar (Right) */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {/* LEFT: Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="finance-input"
              style={{ width: "150px", height: "36px", fontSize: "12.5px" }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
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
                placeholder="Search projects by name, description, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finance-input"
                style={{ paddingLeft: "34px", width: "100%", height: "36px", fontSize: "12.5px" }}
              />
            </div>

            {(searchQuery || clientFilter !== "all" || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setClientFilter("all");
                  setStatusFilter("all");
                }}
                className="finance-button-secondary"
                style={{ padding: "8px 12px", fontSize: "12px", whiteSpace: "nowrap" }}
                title="Reset search and filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* View Content: Tabular Projects Sheet */}
        <ProjectTable
          projects={filteredProjects}
          onEditProject={handleOpenEditProject}
          onDeleteProject={handleDeleteProject}
          onAddTask={(projId) => handleOpenNewTask(projId)}
          onEditTask={handleOpenEditTask}
          onDeleteTask={handleDeleteTask}
          onTaskStatusChange={handleTaskStatusChange}
        />

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
          onDelete={handleDeleteTask}
          initialData={editingTask}
          defaultProjectId={taskDefaultProjectId}
          defaultStatus={taskDefaultStatus}
        />
      </div>
    </AppShell>
  );
}
