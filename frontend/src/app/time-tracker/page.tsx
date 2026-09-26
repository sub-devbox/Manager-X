"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import TimeEntryTable from "@/components/modules/time/TimeEntryTable";
import ManualTimeModal from "@/components/modules/time/ManualTimeModal";
import StartTimerModal from "@/components/modules/time/StartTimerModal";
import { api } from "@/lib/api-client";
import { TimeEntryData } from "@/types/time";
import { TaskData, ProjectData } from "@/types/project";
import {
  Clock,
  Play,
  Square,
  Search,
  DollarSign,
  Briefcase,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type PeriodFilter = "today" | "this_week" | "this_month" | "custom";

export default function TimeTrackerPage() {
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters (today by default)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("today");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryData | null>(null);

  // Active Live Timer State
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mx_active_timer");
        if (saved) return Boolean(JSON.parse(saved)?.isRunning);
      } catch {}
    }
    return false;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entryData, taskData, projectData] = await Promise.all([
        api.get<TimeEntryData[]>("/time-entries"),
        api.get<TaskData[]>("/tasks"),
        api.get<ProjectData[]>("/projects"),
      ]);
      setEntries(Array.isArray(entryData) ? entryData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setProjects(Array.isArray(projectData) ? projectData : []);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load time tracking records." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for timer events saved or state changes from GlobalTimerBar
  useEffect(() => {
    const handleTimerSaved = () => {
      fetchData();
      setIsTimerRunning(false);
      setActionMsg({ type: "success", text: "Time session recorded successfully!" });
      setTimeout(() => setActionMsg(null), 4000);
    };

    const handleTimerStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isRunning?: boolean }>;
      if (customEvent.detail) {
        setIsTimerRunning(Boolean(customEvent.detail.isRunning));
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mx_active_timer" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setIsTimerRunning(Boolean(parsed.isRunning));
        } catch {}
      }
    };

    window.addEventListener("mx_timer_saved", handleTimerSaved);
    window.addEventListener("mx_timer_state_change", handleTimerStateChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("mx_timer_saved", handleTimerSaved);
      window.removeEventListener("mx_timer_state_change", handleTimerStateChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchData]);

  // Start timer from modal
  const handleStartTimer = (task: TaskData, note?: string) => {
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

    setIsTimerRunning(true);

    // If task is in backlog, update status to in_progress
    if (task.status === "backlog") {
      api
        .patch(`/tasks/${task.id}/status`, { status: "in_progress" })
        .then(() => {
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, status: "in_progress" } : t))
          );
        })
        .catch(() => {});
    }

    setActionMsg({
      type: "success",
      text: `Live timer started for task: "${task.title}". Ticking in the bottom dock!`,
    });
    setTimeout(() => setActionMsg(null), 4000);
  };

  // Stop timer from top bar
  const handleStopTimer = () => {
    window.dispatchEvent(new CustomEvent("mx_stop_timer"));
    setIsTimerRunning(false);
    setActionMsg({
      type: "success",
      text: "Stopping live timer and saving session...",
    });
    setTimeout(() => setActionMsg(null), 4000);
  };

  // Submit manual time or update existing entry
  const handleModalSubmit = async (data: {
    task_id: string;
    description: string;
    start_time: string;
    end_time?: string;
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
      const entryDateStr = entry.start_time.slice(0, 10);

      if (periodFilter === "today") {
        if (entryDateStr !== todayStr) return false;
      } else if (periodFilter === "this_week") {
        if (entryDate < monday) return false;
      } else if (periodFilter === "this_month") {
        if (entryDate < firstOfMonth) return false;
      } else if (periodFilter === "custom") {
        if (customStartDate && entryDateStr < customStartDate) return false;
        if (customEndDate && entryDateStr > customEndDate) return false;
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
  }, [entries, periodFilter, customStartDate, customEndDate, searchQuery]);

  // Aggregate stats
  const totalSeconds = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + e.duration_seconds, 0);
  }, [filteredEntries]);

  // Sum billable amount separately by currency (e.g. USD, GBP, INR) if not 0
  const billableByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of filteredEntries) {
      if (e.is_billable && e.billable_amount > 0) {
        const curr = (e.currency_code || "USD").toUpperCase();
        totals[curr] = (totals[curr] || 0) + e.billable_amount;
      }
    }
    return totals;
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

        {/* Top Control Panel: Active Task Tracker & Relocated Timer Button */}
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
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Active Task Tracker
            </span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
              Track Time Directly on Tasks
            </span>
          </div>

          {/* Dynamic Start / Stop Timer Action */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isTimerRunning ? (
              <button
                type="button"
                onClick={handleStopTimer}
                className="finance-button-primary"
                style={{
                  height: "36px",
                  padding: "0 16px",
                  gap: "8px",
                  background: "rgba(244, 63, 94, 0.15)",
                  color: "var(--accent-rose)",
                  border: "1px solid var(--accent-rose)",
                  fontWeight: 600,
                  width: "auto",
                }}
                title="Stop active timer session and save entry"
              >
                <Square size={13} style={{ fill: "currentColor" }} />
                <span>Stop Timer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsStartModalOpen(true)}
                className="finance-button-primary"
                style={{ height: "36px", padding: "0 16px", gap: "8px", fontWeight: 600, width: "auto" }}
                title="Start a live tracking session"
              >
                <Play size={13} style={{ fill: "currentColor" }} />
                <span>Start Timer</span>
              </button>
            )}
          </div>
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

          <div className="finance-panel" style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
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
                flexShrink: 0,
              }}
            >
              <DollarSign size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, marginBottom: "2px" }}>
                Billable Amount
              </div>
              {Object.keys(billableByCurrency).length === 0 ? (
                <div className="mono" style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-emerald)" }}>
                  0.00
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {Object.entries(billableByCurrency).map(([curr, amt]) => {
                    const symbol =
                      curr === "USD" ? "$" : curr === "GBP" ? "£" : curr === "INR" ? "₹" : curr === "EUR" ? "€" : "";
                    return (
                      <div key={curr} style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                        <span className="mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-emerald)" }}>
                          {symbol}{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>
                          {curr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
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

        {/* Start Live Timer Modal */}
        <StartTimerModal
          isOpen={isStartModalOpen}
          onClose={() => setIsStartModalOpen(false)}
          projects={projects}
          tasks={tasks}
          onStart={handleStartTimer}
        />

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
