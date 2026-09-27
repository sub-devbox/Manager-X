"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api-client";
import { TaskData, TaskStatus, ChecklistItem, ProjectData } from "@/types/project";
import SearchableProjectSelect, { ProjectOption } from "@/components/common/SearchableProjectSelect";
import ProjectModal from "./ProjectModal";
import {
  X,
  CheckSquare,
  FolderKanban,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (task: TaskData) => void | Promise<void>;
  initialData?: TaskData | null;
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSuccess,
  onDelete,
  initialData,
  defaultProjectId,
  defaultStatus = "backlog",
}: TaskModalProps) {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createProjectName, setCreateProjectName] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    project_id: "",
    status: "backlog" as TaskStatus,
    estimated_hours: 0,
    checklist: [] as ChecklistItem[],
  });

  const [newItemText, setNewItemText] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key (only if nested ProjectModal is not open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isCreateProjectOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isCreateProjectOpen]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setNewItemText("");
      setConfirmDelete(false);
      setDeleting(false);
      loadProjects();

      if (initialData) {
        setFormData({
          title: initialData.title,
          project_id: initialData.project_id,
          status: initialData.status,
          estimated_hours: initialData.estimated_hours || 0,
          checklist: Array.isArray(initialData.checklist) ? [...initialData.checklist] : [],
        });
      } else {
        setFormData({
          title: "",
          project_id: defaultProjectId || "",
          status: defaultStatus,
          estimated_hours: 0,
          checklist: [],
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

  const handleOpenCreateProject = (searchQuery?: string) => {
    setCreateProjectName(searchQuery || "");
    setIsCreateProjectOpen(true);
  };

  const handleProjectCreated = (newProject?: ProjectData) => {
    if (newProject && newProject.id) {
      setProjects((prev) => {
        if (prev.some((p) => p.id === newProject.id)) return prev;
        return [
          {
            id: newProject.id,
            name: newProject.name,
            client_name: (newProject as any).client_name || null,
          },
          ...prev,
        ];
      });
      setFormData((prev) => ({ ...prev, project_id: newProject.id }));
    } else {
      loadProjects();
    }
    setIsCreateProjectOpen(false);
  };

  const handleAddChecklistItem = () => {
    const text = newItemText.trim();
    if (!text) return;

    const newItem: ChecklistItem = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text,
      completed: false,
    };

    setFormData((prev) => ({
      ...prev,
      checklist: [...prev.checklist, newItem],
    }));
    setNewItemText("");
  };

  const handleToggleChecklistItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const handleDeleteChecklistItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((item) => item.id !== id),
    }));
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
        status: formData.status,
        estimated_hours: Number(formData.estimated_hours) || 0,
        checklist: formData.checklist,
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

  const handleDelete = async () => {
    if (!initialData) return;
    setErrorMsg("");
    setDeleting(true);
    try {
      if (onDelete) {
        await onDelete(initialData);
      } else {
        await api.delete(`/tasks/${initialData.id}`);
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete task.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const completedCount = formData.checklist.filter((i) => i.completed).length;
  const totalCount = formData.checklist.length;

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
          maxWidth: "520px",
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

          {/* Target Project */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <label style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                Target Project <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => handleOpenCreateProject()}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-blue)",
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "0 2px",
                }}
              >
                <Plus size={11} />
                <span>New Project</span>
              </button>
            </div>
            <SearchableProjectSelect
              projects={projects}
              value={formData.project_id}
              onChange={(projectId) =>
                setFormData((prev) => ({ ...prev, project_id: projectId }))
              }
              onCreateNewProject={(query) => handleOpenCreateProject(query)}
              disabled={loadingProjects}
              placeholder={
                loadingProjects
                  ? "Loading projects..."
                  : projects.length === 0
                  ? "No projects available — create one"
                  : "Select target project..."
              }
            />
          </div>

          {/* Task Title */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Task Title <span style={{ color: "var(--accent-rose)" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design DB Schema / Configure CI pipeline"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="finance-input"
              autoFocus
            />
          </div>

          {/* Task Status & Estimated Hours */}
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
          </div>

          {/* Simple Checklist Section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              paddingTop: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  margin: 0,
                }}
              >
                <span>Checklist</span>
              </label>
              {totalCount > 0 && (
                <span
                  className="mono"
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-xs)",
                    background:
                      completedCount === totalCount
                        ? "rgba(16, 185, 129, 0.15)"
                        : "var(--bg-surface-subtle)",
                    color:
                      completedCount === totalCount
                        ? "var(--accent-emerald)"
                        : "var(--text-muted)",
                    border: `1px solid ${
                      completedCount === totalCount
                        ? "var(--accent-emerald)"
                        : "var(--border-subtle)"
                    }`,
                  }}
                >
                  {completedCount}/{totalCount} completed
                </span>
              )}
            </div>

            {/* Checklist Items Container */}
            <div
              style={{
                background: "var(--bg-surface-subtle)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                minHeight: "44px",
              }}
            >
              {formData.checklist.length === 0 ? (
                <div
                  style={{
                    padding: "10px",
                    textAlign: "center",
                    color: "var(--text-dim)",
                    fontSize: "12px",
                  }}
                >
                  No items in checklist yet. Add steps below.
                </div>
              ) : (
                formData.checklist.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "6px 10px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-xs)",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        flex: 1,
                        margin: 0,
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklistItem(item.id)}
                        style={{
                          accentColor: "var(--accent-emerald)",
                          cursor: "pointer",
                          width: "14px",
                          height: "14px",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "12.5px",
                          color: item.completed ? "var(--text-dim)" : "var(--text-main)",
                          textDecoration: item.completed ? "line-through" : "none",
                          transition: "color 0.15s ease",
                        }}
                      >
                        {item.text}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="finance-button-secondary"
                      style={{
                        padding: "2px 5px",
                        color: "var(--text-dim)",
                        border: "none",
                        background: "transparent",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-rose)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                      title="Remove item"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}

              {/* Add New Item Input */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  marginTop: formData.checklist.length > 0 ? "4px" : "0",
                }}
              >
                <input
                  type="text"
                  placeholder="Add item (press Enter)..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  className="finance-input"
                  style={{ fontSize: "12px", padding: "6px 10px" }}
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="finance-button-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    width: "auto",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Plus size={12} />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: initialData ? "space-between" : "flex-end",
              alignItems: "center",
              gap: "10px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border-subtle)",
              marginTop: "4px",
            }}
          >
            {initialData && (
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="finance-button-secondary"
                    disabled={submitting || deleting}
                    style={{
                      color: "var(--accent-rose)",
                      borderColor: "rgba(244, 63, 94, 0.25)",
                      gap: "6px",
                      height: "36px",
                      padding: "0 12px",
                      fontSize: "12.5px",
                    }}
                    title="Delete this task"
                  >
                    <Trash2 size={13} />
                    <span>Delete Task</span>
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="finance-button-primary"
                      style={{
                        background: "var(--accent-rose)",
                        borderColor: "var(--accent-rose)",
                        color: "#fff",
                        height: "36px",
                        padding: "0 12px",
                        fontSize: "12px",
                        gap: "6px",
                        width: "auto",
                      }}
                    >
                      <Trash2 size={12} />
                      <span>{deleting ? "Deleting..." : "Confirm Delete?"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="finance-button-secondary"
                      style={{ height: "36px", padding: "0 10px", fontSize: "12px" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                onClick={onClose}
                className="finance-button-secondary"
                disabled={submitting || deleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="finance-button-primary"
                disabled={submitting || deleting}
                style={{ width: "auto", minWidth: "120px" }}
              >
                {submitting ? "Saving..." : initialData ? "Save Changes" : "Create Task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      {isCreateProjectOpen && (
        <ProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          onSuccess={handleProjectCreated}
          initialName={createProjectName}
          zIndex={10050}
        />
      )}
    </>
  );
}
