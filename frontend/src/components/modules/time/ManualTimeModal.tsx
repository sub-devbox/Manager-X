"use client";

import React, { useState, useEffect } from "react";
import { TimeEntryData } from "@/types/time";
import { TaskData } from "@/types/project";
import { X, Clock, Calendar, ArrowRight, DollarSign } from "lucide-react";

interface ManualTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    task_id: string;
    description: string;
    start_time: string;
    end_time?: string;
    duration_seconds: number;
    is_billable: boolean;
    hourly_rate?: number;
  }) => Promise<void>;
  tasks: TaskData[];
  initialEntry?: TimeEntryData | null;
}

const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const minutesToTime = (totalMinutes: number) => {
  let normalized = Math.round(totalMinutes) % (24 * 60);
  if (normalized < 0) normalized += 24 * 60;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(h)}:${pad(m)}`;
};

export default function ManualTimeModal({
  isOpen,
  onClose,
  onSubmit,
  tasks,
  initialEntry,
}: ManualTimeModalProps) {
  const [taskId, setTaskId] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState<string>("09:00");
  const [stopTime, setStopTime] = useState<string>("10:00");
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
      const sTime = initialEntry.start_time.slice(11, 16);
      setStartTime(sTime || "09:00");

      if (initialEntry.end_time) {
        setStopTime(initialEntry.end_time.slice(11, 16));
      } else {
        const startMin = timeToMinutes(sTime || "09:00");
        const durMin = initialEntry.duration_seconds / 60;
        setStopTime(minutesToTime(startMin + durMin));
      }

      setDurationHours((initialEntry.duration_seconds / 3600.0).toFixed(2));
      setDescription(initialEntry.description || "");
      setIsBillable(initialEntry.is_billable);
      setHourlyRate(
        initialEntry.hourly_rate !== null && initialEntry.hourly_rate !== undefined
          ? String(initialEntry.hourly_rate)
          : ""
      );
    } else {
      setTaskId(tasks.length > 0 ? tasks[0].id : "");
      setDateStr(new Date().toISOString().slice(0, 10));
      setStartTime("09:00");
      setStopTime("10:00");
      setDurationHours("1.0");
      setDescription("");
      setIsBillable(true);
      setHourlyRate("");
    }
    setErrorMsg(null);
  }, [initialEntry, isOpen, tasks]);

  if (!isOpen) return null;

  // 1. User changes Time Start: recalculate duration based on stopTime
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const startMin = timeToMinutes(newStart);
    const stopMin = timeToMinutes(stopTime);
    let diff = stopMin - startMin;
    if (diff < 0) diff += 24 * 60;
    if (diff === 0) diff = 60; // default 1 hour if identical
    const hours = (diff / 60).toFixed(2);
    setDurationHours(hours);
  };

  // 2. User changes Time Stop: recalculate duration = time stop - time start
  const handleStopTimeChange = (newStop: string) => {
    setStopTime(newStop);
    const startMin = timeToMinutes(startTime);
    const stopMin = timeToMinutes(newStop);
    let diff = stopMin - startMin;
    if (diff < 0) diff += 24 * 60;
    const hours = (diff / 60).toFixed(2);
    setDurationHours(hours);
  };

  // 3. User manually enters Logged Time: time stop = time start + manual time
  const handleDurationChange = (newHoursStr: string) => {
    setDurationHours(newHoursStr);
    const hours = parseFloat(newHoursStr);
    if (!isNaN(hours) && hours > 0) {
      const startMin = timeToMinutes(startTime);
      const addedMin = hours * 60;
      setStopTime(minutesToTime(startMin + addedMin));
    }
  };

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
    const startIso = new Date(`${dateStr}T${startTime}:00Z`).toISOString();
    const endIso = new Date(`${dateStr}T${stopTime}:00Z`).toISOString();
    const rateVal = hourlyRate.trim() ? parseFloat(hourlyRate) : undefined;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        task_id: taskId,
        description,
        start_time: startIso,
        end_time: endIso,
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
    >
      <div
        className="finance-panel"
        style={{
          width: "100%",
          maxWidth: "500px",
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
              {initialEntry ? "Edit Time Log" : "Log Task Time"}
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

          {/* Date Picker */}
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

          {/* Time Start, Time Stop & Logged Time (Synchronized) */}
          <div
            style={{
              background: "var(--bg-surface-subtle)",
              padding: "14px",
              borderRadius: "var(--radius-xs)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Time Range & Duration (Auto-Calculated)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Time Start
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="finance-input"
                  style={{ width: "100%", height: "34px", fontSize: "12px" }}
                  required
                />
              </div>

              <div style={{ paddingTop: "16px", color: "var(--text-dim)" }}>
                <ArrowRight size={14} />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Time Stop
                </label>
                <input
                  type="time"
                  value={stopTime}
                  onChange={(e) => handleStopTimeChange(e.target.value)}
                  className="finance-input"
                  style={{ width: "100%", height: "34px", fontSize: "12px" }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Logged Time (Hours) — <em>edit to recalculate Stop Time</em>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                max="24"
                value={durationHours}
                onChange={(e) => handleDurationChange(e.target.value)}
                placeholder="e.g. 2.5"
                className="finance-input"
                style={{ width: "100%", height: "34px", fontSize: "12px" }}
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
              rows={2}
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
                  step="any"
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
