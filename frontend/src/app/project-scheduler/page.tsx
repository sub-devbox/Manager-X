"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import TaskModal from "@/components/modules/projects/TaskModal";
import ProjectSchedulerCalendar from "@/components/modules/projects/ProjectSchedulerCalendar";
import SearchableClientSelect from "@/components/common/SearchableClientSelect";
import { api } from "@/lib/api-client";
import { parseUtcDate, formatLocalDateStr } from "@/lib/date";
import { ProjectData, TaskData, TaskStatus } from "@/types/project";
import { TimeEntryData } from "@/types/time";
import {
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
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

  // Project lookup map
  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectData>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  // Tracked time map by date string YYYY-MM-DD
  const timeTrackedByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of entries) {
      if (!entry.start_time) continue;
      const d = parseUtcDate(entry.start_time);
      const dateStr = formatLocalDateStr(d);
      map[dateStr] = (map[dateStr] || 0) + (entry.duration_seconds || 0);
    }
    return map;
  }, [entries]);

  // Task Actions
  const handleOpenNewTask = (defaultDate?: string) => {
    setEditingTask(null);
    setTaskDefaultProjectId(undefined);
    setTaskDefaultStatus("backlog");
    setTaskDefaultDueDate(defaultDate);
    setIsTaskModalOpen(true);
  };

  const [taskDefaultDueDate, setTaskDefaultDueDate] = useState<string | undefined>();

  const handleOpenEditTask = (task: TaskData) => {
    setEditingTask(task);
    setTaskDefaultProjectId(task.project_id);
    setTaskDefaultStatus(task.status);
    setTaskDefaultDueDate(task.due_date || undefined);
    setIsTaskModalOpen(true);
  };

  const handleUpdateTaskDueDate = async (taskId: string, newDueDate: string | null) => {
    const task = tasks.find((t) => t.id === taskId);
    const prevDueDate = task?.due_date;
    const cleanDueDate = newDueDate ? newDueDate : null;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, due_date: cleanDueDate } : t))
    );

    try {
      await api.patch(`/tasks/${taskId}`, { due_date: cleanDueDate });
      setActionMsg({
        type: "success",
        text: cleanDueDate
          ? `Rescheduled "${task?.title || "Task"}" due date to ${cleanDueDate}.`
          : `Removed due date for "${task?.title || "Task"}".`,
      });
    } catch (err: any) {
      // Rollback on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, due_date: prevDueDate } : t))
      );
      setActionMsg({
        type: "error",
        text: err.message || "Failed to update task due date.",
      });
    }
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const proj = projectMap.get(t.project_id);

      // 1. Search query filter
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const titleMatch = t.title.toLowerCase().includes(q);
        const descMatch = Boolean(t.description && t.description.toLowerCase().includes(q));
        const projMatch = Boolean(proj?.name && proj.name.toLowerCase().includes(q));
        const clientMatch = Boolean(proj?.client?.company_name && proj.client.company_name.toLowerCase().includes(q));
        if (!titleMatch && !descMatch && !projMatch && !clientMatch) {
          return false;
        }
      }

      // 2. Client filter
      if (clientFilter !== "all") {
        if (!proj || proj.client_id !== clientFilter) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, projectMap, searchQuery, clientFilter]);

  const scheduledCount = useMemo(() => {
    return filteredTasks.filter((t) => Boolean(t.due_date)).length;
  }, [filteredTasks]);

  const unscheduledCount = filteredTasks.length - scheduledCount;

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
              Task Timelines & Deadlines
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
              onClick={() => handleOpenNewTask()}
              className="finance-button-primary"
              style={{ height: "34px", padding: "0 14px", gap: "6px", fontWeight: 600, width: "auto" }}
            >
              <Plus size={13} />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Full-Page Calendar Scheduler Grid for Tasks */}
        <ProjectSchedulerCalendar
          tasks={filteredTasks}
          projects={projects}
          timeTrackedByDate={timeTrackedByDate}
          onUpdateTaskDueDate={handleUpdateTaskDueDate}
          onOpenNewTask={handleOpenNewTask}
          onEditTask={handleOpenEditTask}
        />

        {/* Task Modal for Creating or Editing Tasks */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setTaskDefaultDueDate(undefined);
          }}
          onSuccess={fetchData}
          initialData={editingTask}
          defaultProjectId={taskDefaultProjectId}
          defaultStatus={taskDefaultStatus}
          defaultDueDate={taskDefaultDueDate}
        />
      </div>
    </AppShell>
  );
}
