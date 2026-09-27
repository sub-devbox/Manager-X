"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { FolderKanban, ChevronDown, Search, Plus, Check } from "lucide-react";

export interface ProjectOption {
  id: string;
  name: string;
  client_name?: string | null;
}

interface SearchableProjectSelectProps {
  projects: ProjectOption[];
  value: string;
  onChange: (projectId: string) => void;
  onCreateNewProject?: (searchQuery?: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableProjectSelect({
  projects,
  value,
  onChange,
  onCreateNewProject,
  placeholder = "Select target project...",
  disabled = false,
}: SearchableProjectSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedProject = useMemo(() => {
    if (!value) return null;
    return projects.find((p) => p.id === value) || null;
  }, [projects, value]);

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.client_name && p.client_name.toLowerCase().includes(q))
    );
  }, [projects, search]);

  const handleSelect = (projectId: string) => {
    onChange(projectId);
    setIsOpen(false);
    setSearch("");
  };

  const handleOpenCreate = () => {
    const currentQuery = search.trim();
    setIsOpen(false);
    setSearch("");
    if (onCreateNewProject) {
      onCreateNewProject(currentQuery || undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearch("");
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProjects.length > 0) {
        handleSelect(filteredProjects[0].id);
      } else if (onCreateNewProject) {
        handleOpenCreate();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        userSelect: "none",
      }}
    >
      {/* Trigger Box */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className="finance-input"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "38px",
          padding: "0 12px",
          cursor: disabled ? "not-allowed" : "pointer",
          gap: "8px",
          borderColor: isOpen ? "var(--accent-blue)" : undefined,
          background: "var(--bg-surface)",
          opacity: disabled ? 0.6 : 1,
        }}
        title={
          selectedProject
            ? `Project: ${selectedProject.name}${
                selectedProject.client_name ? ` (${selectedProject.client_name})` : ""
              }`
            : placeholder
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflow: "hidden",
            flex: 1,
          }}
        >
          <FolderKanban
            size={15}
            style={{
              color: selectedProject ? "var(--accent-blue)" : "var(--text-dim)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "13px",
              color: selectedProject ? "var(--text-main)" : "var(--text-muted)",
              fontWeight: selectedProject ? 500 : 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selectedProject ? selectedProject.name : placeholder}
          </span>
          {selectedProject?.client_name && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                background: "var(--bg-surface-subtle)",
                border: "1px solid var(--border-subtle)",
                padding: "1px 6px",
                borderRadius: "3px",
                flexShrink: 0,
                maxWidth: "140px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedProject.client_name}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <ChevronDown
            size={14}
            style={{
              color: "var(--text-dim)",
              transform: isOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.15s ease",
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="finance-panel animate-fade-in"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
            zIndex: 10000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search Box inside dropdown */}
          <div
            style={{
              padding: "8px 10px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-surface-subtle)",
            }}
          >
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
                ref={inputRef}
                type="text"
                placeholder="Search projects by name or client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="finance-input"
                style={{
                  width: "100%",
                  height: "30px",
                  paddingLeft: "30px",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>

          {/* Options List */}
          <div
            style={{
              maxHeight: "220px",
              overflowY: "auto",
              padding: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {filteredProjects.map((project) => {
              const isSelected = value === project.id;
              return (
                <div
                  key={project.id}
                  onClick={() => handleSelect(project.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-xs)",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: isSelected ? "var(--bg-surface-subtle)" : "transparent",
                    color: isSelected ? "var(--accent-blue)" : "var(--text-main)",
                    fontWeight: isSelected ? 600 : 400,
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-subtle)")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isSelected
                      ? "var(--bg-surface-subtle)"
                      : "transparent")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      overflow: "hidden",
                      flex: 1,
                    }}
                  >
                    <FolderKanban
                      size={13}
                      style={{
                        color: isSelected ? "var(--accent-blue)" : "var(--text-dim)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {project.name}
                    </span>
                    {project.client_name && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-dim)",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-subtle)",
                          padding: "1px 5px",
                          borderRadius: "3px",
                          flexShrink: 0,
                          maxWidth: "120px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {project.client_name}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={13} style={{ color: "var(--accent-blue)" }} />}
                </div>
              );
            })}

            {filteredProjects.length === 0 && search.trim() && (
              <div
                style={{
                  padding: "12px 10px",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                }}
              >
                <div>No project matching &quot;{search}&quot;</div>
                {onCreateNewProject && (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="finance-button-primary"
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      padding: "6px 12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Plus size={13} />
                    <span>Create &quot;{search}&quot;</span>
                  </button>
                )}
              </div>
            )}

            {projects.length === 0 && !search.trim() && (
              <div
                style={{
                  padding: "14px 10px",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                }}
              >
                <div>No projects available yet.</div>
                {onCreateNewProject && (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="finance-button-primary"
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      padding: "6px 12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Plus size={13} />
                    <span>Create First Project</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer: Create New Project Button */}
          {onCreateNewProject && (projects.length > 0 || search.trim()) && (
            <div
              style={{
                borderTop: "1px solid var(--border-subtle)",
                padding: "6px",
                background: "var(--bg-surface-subtle)",
              }}
            >
              <button
                type="button"
                onClick={handleOpenCreate}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "7px 10px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--accent-blue)",
                  background: "transparent",
                  border: "none",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Plus size={13} />
                <span>
                  {search.trim() ? `Create new project "${search.trim()}"` : "Create New Project"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
