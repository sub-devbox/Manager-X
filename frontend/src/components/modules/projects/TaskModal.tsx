"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api-client";
import { TaskData, TaskStatus, TaskPriority } from "@/types/project";
import {
  X,
  CheckSquare,
  FolderKanban,
  Clock,
  Calendar,
  AlertCircle,
  Flag,
} from "lucide-react";

interface ProjectOption {
  id: string;
  name: string;
  client_name?: string | null;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: TaskData | null;
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  defaultProjectId,
  defaultStatus = "backlog",
}: TaskModalProps) {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    project_id: "",
    description: "",
    status: "backlog" as TaskStatus,
    priority: "medium" as TaskPriority,
    estimated_hours: 0,
    due_date: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      loadProjects();

      if (initialData) {
        setFormData({
          title: initialData.title,
          project_id: initialData.project_id,
          description: initialData.description || "",
          status: initialData.status,
          priority: initialData.priority,
          estimated_hours: initialData.estimated_hours || 0,
          due_date: initialData.due_date || "",
        });
      } else {
        setFormData({
          title: "",
          project_id: defaultProjectId || "",
          description: "",
          status: defaultStatus,
          priority: "medium",
          estimated_hours: 0,
          due_date: "",
        });
      }
    }
  }, [isOpen, initialData, defaultProjectId, defaultStatus]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await api.get<any[]>("/projects/summary");
      if (Array.isArray(data)) {
        setProjects(data);
        if (!initialData && !formData.project_id && !defaultProjectId && data.length > 0) {
          setFormData((prev) => ({ ...prev, project_id: data[0].id }));
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.title.trim()) {
      setErrorMsg("Task title is required.");
      return;
    }
    if (!formData.project_id) {
      setErrorMsg("Please select a project for this task.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        project_id: formData.project_id,
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        estimated_hours: Number(formData.estimated_hours) || 0,
        due_date: formData.due_date || null,
      };

      if (initialData) {
        await api.put(`/tasks/${initialData.id}`, payload);
      } else {
        await api.post("/tasks", payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save task.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="finance-panel animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Pinned Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CheckSquare size={18} style={{ color: "var(--accent-blue)" }} />
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0, letterSpacing: "-0.2px" }}>
              {initialData ? "Edit Task" : "Create New Task"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="finance-button-secondary"
            style={{ padding: "6px" }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid var(--accent-rose)",
                color: "var(--accent-rose)",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Project Selection */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Target Project <span style={{ color: "var(--accent-rose)" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <select
                required
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="finance-input"
                style={{ appearance: "none", cursor: "pointer", paddingRight: "30px" }}
                disabled={loadingProjects}
              >
                {projects.length === 0 ? (
                  <option value="">No projects available — create project first</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.client_name ? `(${p.client_name})` : ""}
                    </option>
                  ))
                )}
              </select>
              <FolderKanban
                size={14}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--text-dim)",
                }}
              />
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Task Title <span style={{ color: "var(--accent-rose)" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design DB Schema / Implement OAuth2 Handshake"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="finance-input"
              autoFocus
            />
          </div>

          {/* Status & Priority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Task Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                className="finance-input"
              >
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="finance-input"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Estimated Hours & Due Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Estimated Hours
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0.0"
                  value={formData.estimated_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 0 })
                  }
                  className="finance-input mono"
                />
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "12px",
                    color: "var(--text-dim)",
                    pointerEvents: "none",
                  }}
                >
                  hrs
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="finance-input mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Task Details & Acceptance Criteria
            </label>
            <textarea
              rows={3}
              placeholder="Technical specs, acceptance checklist, or PR links..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="finance-input"
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border-subtle)",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="finance-button-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="finance-button-primary"
              disabled={submitting}
              style={{ width: "auto", minWidth: "120px" }}
            >
              {submitting ? "Saving..." : initialData ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
