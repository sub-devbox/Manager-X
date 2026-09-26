"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import TimeEntryTable from "@/components/modules/time/TimeEntryTable";
import ManualTimeModal from "@/components/modules/time/ManualTimeModal";
import { api } from "@/lib/api-client";
import { TimeEntryData } from "@/types/time";
import { TaskData } from "@/types/project";
import {
  Clock,
  Play,
  Plus,
  Search,
  Filter,
  DollarSign,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";

type PeriodFilter = "all" | "today" | "this_week" | "this_month";

export default function TimeTrackerPage() {
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<string>("all");

  // Manual Log & Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryData | null>(null);

  // Active session selector state for top bar
  const [selectedLauncherTaskId, setSelectedLauncherTaskId] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entryData, taskData] = await Promise.all([
        api.get<TimeEntryData[]>("/time-entries"),
        api.get<TaskData[]>("/tasks"),
      ]);
      setEntries(Array.isArray(entryData) ? entryData : []);
      const taskList = Array.isArray(taskData) ? taskData : [];
      setTasks(taskList);
      if (taskList.length > 0 && !selectedLauncherTaskId) {
        setSelectedLauncherTaskId(taskList[0].id);
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load time tracking records." });
    } finally {
      setLoading(false);
    }
  }, [selectedLauncherTaskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for timer events saved from GlobalTimerBar or elsewhere
  useEffect(() => {
    const handleTimerSaved = () => {
      fetchData();
      setActionMsg({ type: "success", text: "Time session recorded successfully!" });
      setTimeout(() => setActionMsg(null), 4000);
    };

    window.addEventListener("mx_timer_saved", handleTimerSaved);
    return () => window.removeEventListener("mx_timer_saved", handleTimerSaved);
  }, [fetchData]);

  // Start timer from top bar
  const handleStartSession = () => {
    const task = tasks.find((t) => t.id === selectedLauncherTaskId);
    if (!task) {
      setActionMsg({ type: "error", text: "Please select a task to track." });
      return;
    }

    window.dispatchEvent(
      new CustomEvent("mx_start_timer", {
        detail: {
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.project_id,
          projectTitle: task.project_name || "Project",
        },
      })
    );

    // If task is in backlog, update status to in_progress
    if (task.status === "backlog") {
      api.patch(`/tasks/${task.id}`, { status: "in_progress" }).then(() => {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: "in_progress" } : t))
        );
      });
    }

    setActionMsg({
      type: "success",
      text: `Live timer started for task: "${task.title}". Ticking in the bottom dock!`,
    });
    setTimeout(() => setActionMsg(null), 4000);
  };

  // Submit manual time or update existing entry
  const handleModalSubmit = async (data: {
    task_id: string;
    description: string;
    start_time: string;
    duration_seconds: number;
    is_billable: boolean;
    hourly_rate?: number;
  }) => {
    if (editingEntry) {
      await api.patch(`/time-entries/${editingEntry.id}`, data);
      setActionMsg({ type: "success", text: "Time entry updated successfully." });
    } else {
      await api.post("/time-entries", data);
      setActionMsg({ type: "success", text: "Time entry logged successfully." });
    }
    setTimeout(() => setActionMsg(null), 4000);
    await fetchData();
  };

  // Delete entry
  const handleDeleteEntry = async (entry: TimeEntryData) => {
    if (entry.invoiced) {
      setActionMsg({ type: "error", text: "Cannot delete an invoiced time entry." });
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this time entry (${(entry.duration_seconds / 3600).toFixed(1)}h on "${entry.task_title}")?`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/time-entries/${entry.id}`);
      setActionMsg({ type: "success", text: "Time entry deleted successfully." });
      setTimeout(() => setActionMsg(null), 4000);
      await fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to delete time entry." });
    }
  };

  // Period filtering
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Calculate beginning of this week (Monday)
    const dayOfWeek = now.getDay() || 7; // Sunday = 7
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    // Calculate beginning of this month
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return entries.filter((entry) => {
      // Period filter
      const entryDate = new Date(entry.start_time);
      if (periodFilter === "today") {
        if (entry.start_time.slice(0, 10) !== todayStr) return false;
      } else if (periodFilter === "this_week") {
        if (entryDate < monday) return false;
      } else if (periodFilter === "this_month") {
        if (entryDate < firstOfMonth) return false;
      }

      // Task filter
      if (selectedTaskFilter !== "all" && entry.task_id !== selectedTaskFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTask = entry.task_title?.toLowerCase().includes(q);
        const matchProj = entry.project_name?.toLowerCase().includes(q);
        const matchClient = entry.client_name?.toLowerCase().includes(q);
        const matchDesc = entry.description?.toLowerCase().includes(q);
        if (!matchTask && !matchProj && !matchClient && !matchDesc) return false;
      }

      return true;
    });
  }, [entries, periodFilter, selectedTaskFilter, searchQuery]);

  // Aggregate stats
  const totalSeconds = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + e.duration_seconds, 0);
  }, [filteredEntries]);

  const totalBillableAmount = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + (e.is_billable ? e.billable_amount : 0), 0);
  }, [filteredEntries]);

  const totalHours = (totalSeconds / 3600.0).toFixed(1);

  return (
    <AppShell title="Time Tracker">
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Action Banner / Notification */}
        {actionMsg && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13px",
              background:
                actionMsg.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)",
              border: `1px solid ${actionMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)"}`,
              color: actionMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)",
            }}
          >
            {actionMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* Top Control Panel: Fast Task Launcher & Manual Entry Action */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Active Task Tracker
              </span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                Track Time Directly on Tasks
              </span>
            </div>

            {/* Task Quick Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <select
                value={selectedLauncherTaskId}
                onChange={(e) => setSelectedLauncherTaskId(e.target.value)}
                className="finance-input"
                style={{ height: "34px", fontSize: "12.5px", minWidth: "240px", maxWidth: "340px" }}
              >
                {tasks.length === 0 ? (
                  <option value="">No tasks found</option>
                ) : (
                  tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} {t.project_name ? `• ${t.project_name}` : ""}
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                onClick={handleStartSession}
                disabled={!selectedLauncherTaskId || tasks.length === 0}
                className="finance-button-primary"
                style={{ height: "34px", padding: "0 14px", gap: "6px" }}
                title="Start tracking time on selected task"
              >
                <Play size={13} />
                <span>Start Timer</span>
              </button>
            </div>
          </div>

          {/* Manual Entry Button */}
          <button
            type="button"
            onClick={() => {
              setEditingEntry(null);
              setIsModalOpen(true);
            }}
            className="finance-button-secondary"
            style={{ height: "34px", padding: "0 14px", gap: "6px" }}
          >
            <Plus size={13} />
            <span>Log Time Manually</span>
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          <div className="finance-panel" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
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
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Total Tracked</div>
              <div className="mono" style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}>
                {totalHours}h
              </div>
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
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
              <DollarSign size={18} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Billable Amount</div>
              <div className="mono" style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-emerald)" }}>
                ${totalBillableAmount.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-xs)",
                background: "var(--bg-surface-subtle)",
                color: "var(--text-dim)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Briefcase size={18} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Total Sessions</div>
              <div className="mono" style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}>
                {filteredEntries.length} logs
              </div>
            </div>
          </div>
        </div>

        {/* Period Filter Tabs & Search Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Quick Period Selector */}
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
                { id: "all", label: "All Logs" },
                { id: "today", label: "Today" },
                { id: "this_week", label: "This Week" },
                { id: "this_month", label: "This Month" },
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
                  border: periodFilter === tab.id ? "1px solid var(--border-subtle)" : "1px solid transparent",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Task Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={13}
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
                placeholder="Search task, project, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finance-input"
                style={{ paddingLeft: "30px", height: "32px", fontSize: "12px", width: "220px" }}
              />
            </div>

            <select
              value={selectedTaskFilter}
              onChange={(e) => setSelectedTaskFilter(e.target.value)}
              className="finance-input"
              style={{ height: "32px", fontSize: "12px", maxWidth: "180px" }}
            >
              <option value="all">All Tasks</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabular Time Logs Table (50 Per Page) */}
        {loading ? (
          <div
            className="finance-panel"
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            Loading time logs...
          </div>
        ) : (
          <TimeEntryTable
            entries={filteredEntries}
            onEditEntry={(entry) => {
              setEditingEntry(entry);
              setIsModalOpen(true);
            }}
            onDeleteEntry={handleDeleteEntry}
          />
        )}

        {/* Manual Time & Edit Modal */}
        <ManualTimeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEntry(null);
          }}
          onSubmit={handleModalSubmit}
          tasks={tasks}
          initialEntry={editingEntry}
        />
      </div>
    </AppShell>
  );
}
