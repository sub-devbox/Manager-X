"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import ProjectModal from "@/components/modules/projects/ProjectModal";
import TaskModal from "@/components/modules/projects/TaskModal";
import ProjectTasksModal from "@/components/modules/projects/ProjectTasksModal";
import ProjectSchedulerCalendar from "@/components/modules/projects/ProjectSchedulerCalendar";
import SearchableClientSelect from "@/components/common/SearchableClientSelect";
import { api } from "@/lib/api-client";
import { ProjectData, TaskData, TaskStatus } from "@/types/project";
import { TimeEntryData } from "@/types/time";
import {
  CalendarDays,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";

export default function ProjectSchedulerPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [newProjectDefaultEndDate, setNewProjectDefaultEndDate] = useState<string | undefined>();

  // Project Tasks Modal
  const [selectedProjectForTasks, setSelectedProjectForTasks] = useState<ProjectData | null>(null);

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [taskDefaultProjectId, setTaskDefaultProjectId] = useState<string | undefined>();
  const [taskDefaultStatus, setTaskDefaultStatus] = useState<TaskStatus>("backlog");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, taskData, clientData, timeData] = await Promise.all([
        api.get<ProjectData[]>("/projects"),
        api.get<TaskData[]>("/tasks"),
        api.get<{ id: string; company_name: string }[]>("/clients"),
        api.get<TimeEntryData[]>("/time-entries"),
      ]);

      const rawProjects = Array.isArray(projData) ? projData : [];
      const processedProjects = rawProjects.map((p) => {
        const is100 = p.task_count > 0 && p.completed_task_count === p.task_count;
        return is100 && p.status !== "archived" ? { ...p, status: "completed" as const } : p;
      });
      setProjects(processedProjects);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
      setEntries(Array.isArray(timeData) ? timeData : []);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load project records." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const handleTimerSaved = () => {
      fetchData();
    };
    window.addEventListener("mx_timer_saved", handleTimerSaved);
    return () => window.removeEventListener("mx_timer_saved", handleTimerSaved);
  }, [fetchData]);

  // Total time spent per task ID
  const timeTrackedByTask = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.task_id) {
        map[entry.task_id] = (map[entry.task_id] || 0) + (entry.duration_seconds || 0);
      }
    }
    return map;
  }, [entries]);

  // Project Actions
  const handleOpenNewProject = (defaultDate?: string) => {
    setEditingProject(null);
    setNewProjectDefaultEndDate(defaultDate);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: ProjectData) => {
    setEditingProject(proj);
    setNewProjectDefaultEndDate(undefined);
    setIsProjectModalOpen(true);
  };

  const handleUpdateProjectDueDate = async (projectId: string, newEndDate: string) => {
    const proj = projects.find((p) => p.id === projectId);
    const prevEndDate = proj?.end_date;

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, end_date: newEndDate } : p))
    );

    try {
      await api.patch(`/projects/${projectId}`, { end_date: newEndDate });
      setActionMsg({
        type: "success",
        text: `Rescheduled "${proj?.name || "Project"}" due date to ${newEndDate}.`,
      });
    } catch (err: any) {
      // Rollback on error
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, end_date: prevEndDate } : p))
      );
      setActionMsg({
        type: "error",
        text: err.message || "Failed to update project due date.",
      });
    }
  };

  const handleDeleteProject = async (proj: ProjectData) => {
    setActionMsg(null);
    try {
      await api.delete(`/projects/${proj.id}`);
      setActionMsg({ type: "success", text: `Project "${proj.name}" deleted.` });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to delete project." });
      throw err;
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

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
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

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Search query filter
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.client?.company_name && p.client.company_name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Client filter
      const matchesClient = clientFilter === "all" || p.client_id === clientFilter;
      return matchesClient;
    });
  }, [projects, searchQuery, clientFilter]);

  const scheduledCount = useMemo(() => {
    return filteredProjects.filter((p) => Boolean(p.end_date)).length;
  }, [filteredProjects]);

  const unscheduledCount = filteredProjects.length - scheduledCount;

  return (
    <AppShell title="Project Scheduler">
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            padding: "14px 20px",
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
              Timeline & Deadlines
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)" }}>
                Project Scheduler
              </span>
              <span
                className="mono"
                style={{
                  fontSize: "11px",
                  padding: "1px 8px",
                  borderRadius: "10px",
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  color: "var(--accent-blue)",
                }}
              >
                {scheduledCount} scheduled
              </span>
              {unscheduledCount > 0 && (
                <span
                  className="mono"
                  style={{
                    fontSize: "11px",
                    padding: "1px 8px",
                    borderRadius: "10px",
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    color: "var(--accent-amber)",
                  }}
                >
                  {unscheduledCount} unscheduled
                </span>
              )}
            </div>
          </div>

          {/* Filters and Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <SearchableClientSelect
              clients={clients}
              value={clientFilter}
              onChange={setClientFilter}
              placeholder="All Clients"
              width="180px"
            />

            <div style={{ position: "relative", width: "220px" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50)",
                  color: "var(--text-dim)",
                }}
              />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finance-input"
                style={{ paddingLeft: "30px", width: "100%", height: "32px", fontSize: "12px" }}
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
                style={{ padding: "0 10px", height: "32px", fontSize: "12px", whiteSpace: "nowrap" }}
                title="Reset filters"
              >
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenNewProject()}
              className="finance-button-primary"
              style={{ height: "34px", padding: "0 14px", gap: "6px", fontWeight: 600, width: "auto" }}
            >
              <Plus size={13} />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Full-Page Calendar Scheduler Grid */}
        <ProjectSchedulerCalendar
          projects={filteredProjects}
          onUpdateProjectDueDate={handleUpdateProjectDueDate}
          onOpenNewProject={handleOpenNewProject}
          onEditProject={handleOpenEditProject}
          onSelectProjectTasks={(proj) => setSelectedProjectForTasks(proj)}
        />

        {/* Project Edit Modal */}
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => {
            setIsProjectModalOpen(false);
            setNewProjectDefaultEndDate(undefined);
          }}
          onSuccess={fetchData}
          onDelete={handleDeleteProject}
          initialData={editingProject}
          defaultEndDate={newProjectDefaultEndDate}
        />

        {/* Clicking on Project Deliverables Counter Opens ProjectTasksModal */}
        <ProjectTasksModal
          isOpen={Boolean(selectedProjectForTasks)}
          onClose={() => setSelectedProjectForTasks(null)}
          project={selectedProjectForTasks}
          tasks={tasks}
          timeTrackedMap={timeTrackedByTask}
          onAddTask={(projId) => handleOpenNewTask(projId)}
          onEditTask={handleOpenEditTask}
          onTaskStatusChange={handleTaskStatusChange}
          onTimerNotice={setActionMsg}
        />

        {/* Task Modal for Editing or Creating Tasks from Tasks Modal */}
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
