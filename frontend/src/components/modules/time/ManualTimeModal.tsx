"use client";

import React, { useState, useEffect } from "react";
import { TimeEntryData } from "@/types/time";
import { TaskData } from "@/types/project";
import { X, Clock, Calendar, CheckSquare, DollarSign, FileText } from "lucide-react";

interface ManualTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    task_id: string;
    description: string;
    start_time: string;
    duration_seconds: number;
    is_billable: boolean;
    hourly_rate?: number;
  }) => Promise<void>;
  tasks: TaskData[];
  initialEntry?: TimeEntryData | null;
}

export default function ManualTimeModal({
  isOpen,
  onClose,
  onSubmit,
  tasks,
  initialEntry,
}: ManualTimeModalProps) {
  const [taskId, setTaskId] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [durationHours, setDurationHours] = useState<string>("1.0");
  const [description, setDescription] = useState<string>("");
  const [isBillable, setIsBillable] = useState<boolean>(true);
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialEntry) {
      setTaskId(initialEntry.task_id);
      setDateStr(initialEntry.start_time.slice(0, 10));
      setDurationHours((initialEntry.duration_seconds / 3600.0).toFixed(2));
      setDescription(initialEntry.description || "");
      setIsBillable(initialEntry.is_billable);
      setHourlyRate(initialEntry.hourly_rate !== null && initialEntry.hourly_rate !== undefined ? String(initialEntry.hourly_rate) : "");
    } else {
      setTaskId(tasks.length > 0 ? tasks[0].id : "");
      setDateStr(new Date().toISOString().slice(0, 10));
      setDurationHours("1.0");
      setDescription("");
      setIsBillable(true);
      setHourlyRate("");
    }
    setErrorMsg(null);
  }, [initialEntry, isOpen, tasks]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId) {
      setErrorMsg("Please select a task to track time against.");
      return;
    }

    const hours = parseFloat(durationHours);
    if (isNaN(hours) || hours <= 0) {
      setErrorMsg("Please enter a valid positive duration in hours.");
      return;
    }

    const durationSeconds = Math.round(hours * 3600);
    const startIso = new Date(`${dateStr}T09:00:00Z`).toISOString();
    const rateVal = hourlyRate.trim() ? parseFloat(hourlyRate) : undefined;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        task_id: taskId,
        description,
        start_time: startIso,
        duration_seconds: durationSeconds,
        is_billable: isBillable,
        hourly_rate: rateVal,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to record time entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="finance-panel"
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-surface-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={16} style={{ color: "var(--accent-blue)" }} />
            <h3 style={{ fontSize: "14px", fontWeight: 600 }}>
              {initialEntry ? "Edit Time Log" : "Log Time on Task"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="finance-button-secondary"
            style={{ padding: "4px", borderRadius: "50%" }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {errorMsg && (
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid var(--accent-rose)",
                color: "var(--accent-rose)",
                borderRadius: "var(--radius-xs)",
                fontSize: "12px",
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Task Selector */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
              Assigned Task <span style={{ color: "var(--accent-rose)" }}>*</span>
            </label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="finance-input"
              style={{ width: "100%", height: "36px", fontSize: "12.5px" }}
              required
            >
              {tasks.length === 0 ? (
                <option value="">No active tasks available</option>
              ) : (
                tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} {t.project_name ? `(${t.project_name})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date & Duration Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Date <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="finance-input"
                style={{ width: "100%", height: "36px", fontSize: "12px" }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Duration (Hours) <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.05"
                max="24"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                placeholder="e.g. 2.5"
                className="finance-input"
                style={{ width: "100%", height: "36px", fontSize: "12px" }}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
              Work Notes / Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on during this time?"
              className="finance-input"
              rows={3}
              style={{ width: "100%", padding: "8px 10px", fontSize: "12px", resize: "vertical" }}
            />
          </div>

          {/* Billable & Rate Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px" }}>
              <input
                type="checkbox"
                checked={isBillable}
                onChange={(e) => setIsBillable(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontWeight: 500 }}>Billable Session</span>
            </label>

            {isBillable && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Hourly Rate ($):</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="Auto"
                  className="finance-input"
                  style={{ width: "80px", height: "28px", fontSize: "11.5px", textAlign: "right" }}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginTop: "8px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="finance-button-secondary"
              style={{ padding: "7px 14px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || tasks.length === 0}
              className="finance-button-primary"
              style={{ padding: "7px 16px" }}
            >
              {isSubmitting ? "Saving..." : initialEntry ? "Update Entry" : "Save Time Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
