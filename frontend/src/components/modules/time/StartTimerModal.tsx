"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { ProjectData, TaskData } from "@/types/project";
import { X, Play, Search, Folder, CheckSquare, ChevronDown, Clock, AlertCircle } from "lucide-react";

interface StartTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectData[];
  tasks: TaskData[];
  onStart: (task: TaskData, description?: string) => void;
}

export default function StartTimerModal({
  isOpen,
  onClose,
  projects,
  tasks,
  onStart,
}: StartTimerModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [projectSearch, setProjectSearch] = useState<string>("");
  const [taskSearch, setTaskSearch] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isProjectOpen, setIsProjectOpen] = useState<boolean>(false);
  const [isTaskOpen, setIsTaskOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const taskDropdownRef = useRef<HTMLDivElement>(null);

  // Reset or initialize state when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedProjectId("");
      setSelectedTaskId("");
      setProjectSearch("");
      setTaskSearch("");
      setDescription("");
      setIsProjectOpen(false);
      setIsTaskOpen(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Click outside listener for dropdown popups
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(e.target as Node)
      ) {
        setIsProjectOpen(false);
      }
      if (
        taskDropdownRef.current &&
        !taskDropdownRef.current.contains(e.target as Node)
      ) {
        setIsTaskOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.client?.company_name && p.client.company_name.toLowerCase().includes(q))
    );
  }, [projects, projectSearch]);

  // Filter tasks belonging to the selected project, then by task query
  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const filteredTasks = useMemo(() => {
    if (!taskSearch.trim()) return projectTasks;
    const q = taskSearch.toLowerCase();
    return projectTasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [projectTasks, taskSearch]);

  // Selected object references
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  if (!isOpen) return null;

  const handleSelectProject = (project: ProjectData) => {
    setSelectedProjectId(project.id);
    setProjectSearch(project.name);
    setIsProjectOpen(false);
    // Reset task when project changes
    setSelectedTaskId("");
    setTaskSearch("");
    setErrorMsg(null);
  };

  const handleSelectTask = (task: TaskData) => {
    setSelectedTaskId(task.id);
    setTaskSearch(task.title);
    setIsTaskOpen(false);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setErrorMsg("Please select a project.");
      return;
    }
    if (!selectedTaskId || !selectedTask) {
      setErrorMsg("Please select a task to track time against.");
      return;
    }

    onStart(selectedTask, description.trim());
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(3px)",
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
          maxWidth: "480px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          overflow: "visible",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(59, 130, 246, 0.15)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Play size={14} style={{ fill: "currentColor" }} />
            </div>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                Start Live Timer
              </h3>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                Select a project and task to begin tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="finance-button-secondary"
            style={{ padding: "5px", borderRadius: "50%" }}
            title="Close"
            type="button"
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
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Project Selector (Searchable Dropdown) */}
          <div ref={projectDropdownRef} style={{ position: "relative" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px",
              }}
            >
              <Folder size={13} style={{ color: "var(--accent-blue)" }} />
              <span>Project</span>
              <span style={{ color: "var(--accent-rose)" }}>*</span>
            </label>

            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search or select a project..."
                value={projectSearch}
                onChange={(e) => {
                  setProjectSearch(e.target.value);
                  setIsProjectOpen(true);
                  if (selectedProjectId && e.target.value !== selectedProject?.name) {
                    setSelectedProjectId("");
                    setSelectedTaskId("");
                    setTaskSearch("");
                  }
                }}
                onFocus={() => setIsProjectOpen(true)}
                className="finance-input"
                style={{
                  width: "100%",
                  height: "36px",
                  fontSize: "12.5px",
                  paddingRight: "30px",
                }}
              />
              <button
                type="button"
                onClick={() => setIsProjectOpen((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-dim)",
                  padding: "4px",
                }}
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Dropdown Options */}
            {isProjectOpen && (
              <div
                className="finance-panel animate-fade-in"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  maxHeight: "200px",
                  overflowY: "auto",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  zIndex: 100,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                  padding: "4px",
                }}
              >
                {filteredProjects.length === 0 ? (
                  <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-dim)", textAlign: "center" }}>
                    No projects found
                  </div>
                ) : (
                  filteredProjects.map((p) => {
                    const isSelected = p.id === selectedProjectId;
                    const pTasksCount = tasks.filter((t) => t.project_id === p.id).length;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProject(p)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "var(--radius-xs)",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "12.5px",
                          background: isSelected ? "var(--bg-surface-subtle)" : "transparent",
                          color: isSelected ? "var(--accent-blue)" : "var(--text-main)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "var(--bg-surface-subtle)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          {p.client?.company_name && (
                            <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                              {p.client.company_name}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {pTasksCount} {pTasksCount === 1 ? "task" : "tasks"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 2. Task Selector (Searchable Dropdown, depends on Project) */}
          <div ref={taskDropdownRef} style={{ position: "relative" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px",
              }}
            >
              <CheckSquare size={13} style={{ color: "var(--accent-emerald)" }} />
              <span>Task</span>
              <span style={{ color: "var(--accent-rose)" }}>*</span>
            </label>

            <div style={{ position: "relative" }}>
              <input
                type="text"
                disabled={!selectedProjectId}
                placeholder={
                  selectedProjectId
                    ? "Search or select a task..."
                    : "Select a project first..."
                }
                value={taskSearch}
                onChange={(e) => {
                  setTaskSearch(e.target.value);
                  setIsTaskOpen(true);
                  if (selectedTaskId && e.target.value !== selectedTask?.title) {
                    setSelectedTaskId("");
                  }
                }}
                onFocus={() => {
                  if (selectedProjectId) setIsTaskOpen(true);
                }}
                className="finance-input"
                style={{
                  width: "100%",
                  height: "36px",
                  fontSize: "12.5px",
                  paddingRight: "30px",
                  opacity: selectedProjectId ? 1 : 0.6,
                  cursor: selectedProjectId ? "text" : "not-allowed",
                }}
              />
              <button
                type="button"
                disabled={!selectedProjectId}
                onClick={() => {
                  if (selectedProjectId) setIsTaskOpen((prev) => !prev);
                }}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: selectedProjectId ? "pointer" : "not-allowed",
                  color: "var(--text-dim)",
                  padding: "4px",
                }}
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Dropdown Options */}
            {isTaskOpen && selectedProjectId && (
              <div
                className="finance-panel animate-fade-in"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  maxHeight: "200px",
                  overflowY: "auto",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  zIndex: 100,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                  padding: "4px",
                }}
              >
                {filteredTasks.length === 0 ? (
                  <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-dim)", textAlign: "center" }}>
                    {projectTasks.length === 0
                      ? "No tasks under this project"
                      : "No matching tasks"}
                  </div>
                ) : (
                  filteredTasks.map((t) => {
                    const isSelected = t.id === selectedTaskId;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTask(t)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "var(--radius-xs)",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "12.5px",
                          background: isSelected ? "var(--bg-surface-subtle)" : "transparent",
                          color: isSelected ? "var(--accent-emerald)" : "var(--text-main)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "var(--bg-surface-subtle)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, marginRight: "8px" }}>
                          <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.title}
                          </div>
                          {t.estimated_hours > 0 && (
                            <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                              Est: {t.estimated_hours}h
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-subtle)",
                            color:
                              t.status === "in_progress"
                                ? "var(--accent-blue)"
                                : t.status === "done"
                                ? "var(--accent-emerald)"
                                : "var(--text-muted)",
                            textTransform: "capitalize",
                          }}
                        >
                          {t.status.replace("_", " ")}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Optional Session Description */}
          <div>
            <label
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Session Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Debugging database query, preparing mockups..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="finance-input"
              style={{ width: "100%", height: "36px", fontSize: "12.5px" }}
            />
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "10px",
              marginTop: "8px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="finance-button-secondary"
              style={{ height: "34px", padding: "0 14px", fontSize: "12.5px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedTaskId}
              className="finance-button-primary"
              style={{
                height: "34px",
                padding: "0 16px",
                fontSize: "12.5px",
                gap: "6px",
                opacity: selectedTaskId ? 1 : 0.5,
                cursor: selectedTaskId ? "pointer" : "not-allowed",
              }}
            >
              <Play size={13} style={{ fill: "currentColor" }} />
              <span>Start Timer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
