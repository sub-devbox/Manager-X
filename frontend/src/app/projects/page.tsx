"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import ProjectModal from "@/components/modules/projects/ProjectModal";
import TaskModal from "@/components/modules/projects/TaskModal";
import ProjectTable from "@/components/modules/projects/ProjectTable";
import ProjectTasksModal from "@/components/modules/projects/ProjectTasksModal";
import SearchableClientSelect from "@/components/common/SearchableClientSelect";
import { api } from "@/lib/api-client";
import { ProjectData, TaskData, TaskStatus } from "@/types/project";
import { TimeEntryData } from "@/types/time";
import {
  FolderKanban,
  Clock,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Period & Filter State (Default: this_month, matching tasks and time-tracker)
  const [periodFilter, setPeriodFilter] = useState<"today" | "this_week" | "this_month" | "custom">("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);

  // Project Tasks Modal (Clicking on project row)
  const [selectedProjectForTasks, setSelectedProjectForTasks] = useState<ProjectData | null>(null);

  // Task Edit Modal
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

  // Total time spent per project ID
  const timeSpentByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.project_id) {
        map[entry.project_id] = (map[entry.project_id] || 0) + (entry.duration_seconds || 0);
      }
    }
    return map;
  }, [entries]);

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
      // Optimistic update in both tasks state and projects nested state
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

  // Filtered Projects based on period, client, and search
  const filteredProjects = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Monday of this week in local time
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek - 1));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);

    // First and last day of this month in local time
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Set of project IDs with time entries inside the period
    const projectIdsWithTimeInPeriod = new Set<string>();
    for (const entry of entries) {
      if (!entry.project_id) continue;
      const entryDateStr = entry.start_time ? entry.start_time.slice(0, 10) : "";
      const entryDate = entry.start_time ? new Date(entry.start_time) : null;
      let inPeriod = false;

      if (periodFilter === "today") {
        inPeriod = entryDateStr === todayStr;
      } else if (periodFilter === "this_week") {
        inPeriod = entryDate ? entryDate >= monday && entryDate <= sunday : false;
      } else if (periodFilter === "this_month") {
        inPeriod = entryDate ? entryDate >= firstOfMonth && entryDate <= lastOfMonth : false;
      } else if (periodFilter === "custom") {
        const afterStart = !customStartDate || entryDateStr >= customStartDate;
        const beforeEnd = !customEndDate || entryDateStr <= customEndDate;
        inPeriod = afterStart && beforeEnd;
      }

      if (inPeriod) {
        projectIdsWithTimeInPeriod.add(entry.project_id);
      }
    }

    return projects.filter((p) => {
      // 1. Period View Filter
      const hasTimeInPeriod = projectIdsWithTimeInPeriod.has(p.id);
      let matchesPeriod = hasTimeInPeriod;

      if (!matchesPeriod) {
        const projDateStr = p.end_date ? p.end_date.slice(0, 10) : (p.updated_at || p.created_at || "").slice(0, 10);
        const projDate = projDateStr ? new Date(projDateStr) : null;

        if (periodFilter === "today") {
          matchesPeriod = projDateStr === todayStr || (p.status === "active" && (p.updated_at || "").slice(0, 10) === todayStr);
        } else if (periodFilter === "this_week") {
          if (!projDate) matchesPeriod = true;
          else if (p.end_date) matchesPeriod = projDate >= monday && projDate <= sunday;
          else matchesPeriod = projDate >= monday;
        } else if (periodFilter === "this_month") {
          // In "this month", active projects or projects with activity/due this month are visible
          if (!projDate) matchesPeriod = true;
          else if (p.status === "active") matchesPeriod = true;
          else if (p.end_date) matchesPeriod = projDate >= firstOfMonth && projDate <= lastOfMonth;
          else matchesPeriod = projDate >= firstOfMonth;
        } else if (periodFilter === "custom") {
          if (!projDateStr) matchesPeriod = true;
          else {
            const afterStart = !customStartDate || projDateStr >= customStartDate;
            const beforeEnd = !customEndDate || projDateStr <= customEndDate;
            matchesPeriod = afterStart && beforeEnd;
          }
        }
      }

      if (!matchesPeriod) return false;

      // 2. Search query filter
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.client?.company_name && p.client.company_name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 3. Client filter
      const matchesClient = clientFilter === "all" || p.client_id === clientFilter;

      return matchesClient;
    });
  }, [projects, entries, periodFilter, customStartDate, customEndDate, searchQuery, clientFilter]);

  // Aggregate stats (KPIs)
  const totalFilteredProjects = filteredProjects.length;
  const activeProjects = filteredProjects.filter((p) => p.status === "active").length;
  const completedProjects = filteredProjects.filter((p) => p.status === "completed").length;

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

        {/* Top Control Panel (matching tasks sheet presentation) */}
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
              Engagements & Projects
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                Projects Sheet
              </span>
              <span
                className="mono"
                style={{
                  fontSize: "11px",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  background: "var(--bg-surface-subtle)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-dim)",
                }}
              >
                {projects.length} total
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleOpenNewProject}
              className="finance-button-primary"
              style={{ height: "36px", padding: "0 16px", gap: "8px", fontWeight: 600, width: "auto" }}
            >
              <Plus size={13} />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Stats KPI Summary Bar (matching tasks and time-tracker presentation) */}
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
              <FolderKanban size={18} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                Total Projects
              </div>
              <div
                className="mono"
                style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}
              >
                {totalFilteredProjects}
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
                Active & In Progress
              </div>
              <div
                className="mono"
                style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-amber)" }}
              >
                {activeProjects}
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
                Completed Projects
              </div>
              <div
                className="mono"
                style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-emerald)" }}
              >
                {completedProjects}
              </div>
            </div>
          </div>
        </div>

        {/* Period Filter Tabs & Search Controls (matching tasks and time-tracker presentation) */}
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
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finance-input"
                style={{ paddingLeft: "30px", width: "100%", height: "32px", fontSize: "12px" }}
              />
            </div>

            {(searchQuery || clientFilter !== "all" || periodFilter !== "this_month") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setClientFilter("all");
                  setPeriodFilter("this_month");
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="finance-button-secondary"
                style={{ padding: "0 10px", height: "32px", fontSize: "12px", whiteSpace: "nowrap" }}
                title="Reset filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* View Content: Tabular Projects Sheet */}
        <ProjectTable
          projects={filteredProjects}
          timeSpentByProject={timeSpentByProject}
          onSelectProject={(proj) => setSelectedProjectForTasks(proj)}
          onEditProject={handleOpenEditProject}
          onDeleteProject={handleDeleteProject}
        />

        {/* Project Edit Modal */}
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          onSuccess={fetchData}
          initialData={editingProject}
        />

        {/* Clicking on Project Row Opens All Tasks in a Popup Modal */}
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

        {/* Task Modal (Used for adding new tasks or editing tasks from the popup) */}
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
