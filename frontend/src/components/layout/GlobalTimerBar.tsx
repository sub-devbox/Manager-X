"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Clock, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { ProjectData, TaskData } from "@/types/project";
import StartTimerModal from "@/components/modules/time/StartTimerModal";
import { api } from "@/lib/api-client";

interface TimerState {
  isRunning: boolean;
  seconds: number;
  taskId: string | null;
  taskTitle: string;
  projectId: string | null;
  projectTitle: string;
  startTime: string | null;
  description: string;
}

interface WidgetPosition {
  x: number;
  y: number;
}

export default function GlobalTimerBar() {
  const [timerState, setTimerState] = useState<TimerState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mx_active_timer");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      isRunning: false,
      seconds: 0,
      taskId: null,
      taskTitle: "No task selected",
      projectId: null,
      projectTitle: "Idle",
      startTime: null,
      description: "",
    };
  });

  const [minimized, setMinimized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const timerStateRef = useRef<TimerState>(timerState);

  // Position and dragging state
  const [position, setPosition] = useState<WidgetPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const posRef = useRef<WidgetPosition | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    hasMoved: boolean;
  }>({ startX: 0, startY: 0, startPosX: 0, startPosY: 0, hasMoved: false });

  useEffect(() => {
    posRef.current = position;
  }, [position]);

  // Load saved position from localStorage or default to bottom-right
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mx_timer_position");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          const rect = widgetRef.current?.getBoundingClientRect();
          const width = rect?.width || 300;
          const height = rect?.height || 48;
          const clampedX = Math.max(8, Math.min(window.innerWidth - width - 8, parsed.x));
          const clampedY = Math.max(8, Math.min(window.innerHeight - height - 8, parsed.y));
          setPosition({ x: clampedX, y: clampedY });
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse timer position from localStorage", e);
    }

    if (typeof window !== "undefined") {
      const width = 300;
      const height = 48;
      const defaultX = Math.max(8, window.innerWidth - width - 24);
      const defaultY = Math.max(8, window.innerHeight - height - 20);
      setPosition({ x: defaultX, y: defaultY });
    }
  }, []);

  // Clamp position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        const rect = widgetRef.current?.getBoundingClientRect();
        const width = rect?.width || 300;
        const height = rect?.height || 48;
        const clampedX = Math.max(8, Math.min(window.innerWidth - width - 8, prev.x));
        const clampedY = Math.max(8, Math.min(window.innerHeight - height - 8, prev.y));
        if (clampedX !== prev.x || clampedY !== prev.y) {
          const next = { x: clampedX, y: clampedY };
          localStorage.setItem("mx_timer_position", JSON.stringify(next));
          return next;
        }
        return prev;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  // Sync with localStorage and notify components
  useEffect(() => {
    localStorage.setItem("mx_active_timer", JSON.stringify(timerState));
    window.dispatchEvent(new CustomEvent("mx_timer_state_change", { detail: timerState }));
  }, [timerState]);

  // Client-side ticking when running
  useEffect(() => {
    if (!timerState.isRunning) return;
    const interval = setInterval(() => {
      setTimerState((prev) => ({ ...prev, seconds: prev.seconds + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerState.isRunning]);

  // Listen for task start timer events from TaskTable or TimeTracker
  useEffect(() => {
    const handleStartTask = async (e: Event) => {
      const customEvent = e as CustomEvent<{
        taskId: string;
        taskTitle: string;
        projectId?: string;
        projectTitle?: string;
      }>;
      if (customEvent.detail) {
        // Auto-save existing timer if it was running and had seconds >= 1
        const current = timerStateRef.current;
        if (current.isRunning && current.taskId && current.seconds >= 1) {
          try {
            const startTime = current.startTime || new Date(Date.now() - current.seconds * 1000).toISOString();
            await api.post("/time-entries", {
              task_id: current.taskId,
              project_id: current.projectId || undefined,
              description: current.description || `Logged via stopwatch for ${current.taskTitle}`,
              start_time: startTime,
              end_time: new Date().toISOString(),
              duration_seconds: current.seconds,
              is_billable: true,
            });
            window.dispatchEvent(new CustomEvent("mx_timer_saved"));
          } catch (err) {
            console.error("Auto-saving prior timer session failed:", err);
          }
        }

        setTimerState({
          isRunning: true,
          seconds: 0,
          taskId: customEvent.detail.taskId,
          taskTitle: customEvent.detail.taskTitle,
          projectId: customEvent.detail.projectId || null,
          projectTitle: customEvent.detail.projectTitle || "Active Project",
          startTime: new Date().toISOString(),
          description: "",
        });
      }
    };

    window.addEventListener("mx_start_timer", handleStartTask);
    return () => window.removeEventListener("mx_start_timer", handleStartTask);
  }, []);

  // Cross-tab sync using native window storage events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mx_active_timer" && e.newValue) {
        try {
          setTimerState(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const openStartModal = async () => {
    setIsModalOpen(true);
    try {
      const [projectData, taskData] = await Promise.all([
        api.get<ProjectData[]>("/projects"),
        api.get<TaskData[]>("/tasks"),
      ]);
      setProjects(Array.isArray(projectData) ? projectData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
    } catch (err) {
      console.error("Failed to load projects/tasks for timer modal:", err);
    }
  };

  const handleStartFromModal = (task: TaskData, note?: string) => {
    const proj = projects.find((p) => p.id === task.project_id);
    const projName = proj?.name || task.project_name || "Active Project";

    setTimerState({
      isRunning: true,
      seconds: 0,
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.project_id || null,
      projectTitle: projName,
      startTime: new Date().toISOString(),
      description: note || "",
    });

    if (task.status === "backlog") {
      api.patch(`/tasks/${task.id}/status`, { status: "in_progress" }).catch(() => {});
    }

    setIsModalOpen(false);
  };

  const handlePlayClick = () => {
    if (timerState.isRunning) {
      // Pause running timer
      setTimerState((prev) => ({
        ...prev,
        isRunning: false,
      }));
    } else {
      // If task already selected and has seconds, resume; otherwise open selection modal
      if (timerState.taskId && timerState.seconds > 0) {
        setTimerState((prev) => ({
          ...prev,
          isRunning: true,
          startTime: prev.startTime || new Date().toISOString(),
        }));
      } else {
        openStartModal();
      }
    }
  };

  const stopTimer = async () => {
    const current = timerStateRef.current;
    if (current.taskId && current.seconds >= 1) {
      setIsSaving(true);
      try {
        const startTime = current.startTime || new Date(Date.now() - current.seconds * 1000).toISOString();
        await api.post("/time-entries", {
          task_id: current.taskId,
          project_id: current.projectId || undefined,
          description: current.description || `Logged via stopwatch for ${current.taskTitle}`,
          start_time: startTime,
          end_time: new Date().toISOString(),
          duration_seconds: current.seconds,
          is_billable: true,
        });

        // Notify other components (e.g. TimeTrackerPage) to re-fetch
        window.dispatchEvent(new CustomEvent("mx_timer_saved"));
      } catch (err) {
        console.error("Failed to automatically save time entry:", err);
      } finally {
        setIsSaving(false);
      }
    }

    const resetState: TimerState = {
      isRunning: false,
      seconds: 0,
      taskId: null,
      taskTitle: "No task selected",
      projectId: null,
      projectTitle: "Idle",
      startTime: null,
      description: "",
    };
    setTimerState(resetState);
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("select")) {
      return;
    }

    const rect = widgetRef.current?.getBoundingClientRect();
    const currentX = position ? position.x : (rect?.left || Math.max(8, window.innerWidth - (rect?.width || 300) - 24));
    const currentY = position ? position.y : (rect?.top || Math.max(8, window.innerHeight - (rect?.height || 48) - 20));

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: currentX,
      startPosY: currentY,
      hasMoved: false,
    };

    setIsDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.hasMoved = true;
    }

    const rect = widgetRef.current?.getBoundingClientRect();
    const width = rect?.width || 300;
    const height = rect?.height || 48;

    const newX = Math.max(8, Math.min(window.innerWidth - width - 8, dragRef.current.startPosX + dx));
    const newY = Math.max(8, Math.min(window.innerHeight - height - 8, dragRef.current.startPosY + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (posRef.current) {
      localStorage.setItem("mx_timer_position", JSON.stringify(posRef.current));
    }
  };

  const handleTaskTitleClick = () => {
    if (dragRef.current.hasMoved) return;
    if (!timerState.isRunning && !timerState.taskId) {
      openStartModal();
    }
  };

  // Listen for remote stop requests (e.g. from TimeTrackerPage)
  useEffect(() => {
    const handleStop = () => {
      stopTimer();
    };
    window.addEventListener("mx_stop_timer", handleStop);
    return () => window.removeEventListener("mx_stop_timer", handleStop);
  }, []);

  return (
    <>
      <div
        ref={widgetRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="global-timer-bar finance-panel"
        style={{
          zIndex: 60,
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: isDragging ? "none" : "auto",
          touchAction: "none",
          position: "fixed",
          ...(position
            ? {
                left: `${position.x}px`,
                top: `${position.y}px`,
                bottom: "auto",
                right: "auto",
              }
            : {}),
          transition: isDragging ? "none" : "transform 0.2s ease, opacity 0.2s ease",
          boxShadow: isDragging
            ? "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)"
            : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Drag Handle Icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              cursor: isDragging ? "grabbing" : "grab",
              color: "var(--text-dim)",
              padding: "2px 0",
            }}
            title="Drag to reposition timer"
          >
            <GripVertical size={14} />
          </div>

          {timerState.isRunning ? (
            <span className="pulse-indicator" />
          ) : (
            <Clock size={15} style={{ color: "var(--text-dim)" }} />
          )}

          <span className="timer-digits">{formatTime(timerState.seconds)}</span>

          {!minimized && (
            <div
              onClick={handleTaskTitleClick}
              style={{
                display: "flex",
                flexDirection: "column",
                marginLeft: "4px",
                maxWidth: "140px",
                cursor: !timerState.isRunning && !timerState.taskId ? "pointer" : "default",
              }}
              title={!timerState.isRunning && !timerState.taskId ? "Click to select a task & start timer" : undefined}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {timerState.taskTitle}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-dim)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {timerState.projectTitle}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={handlePlayClick}
            className="finance-button-secondary"
            style={{
              padding: "5px 8px",
              color: timerState.isRunning ? "var(--accent-amber)" : "var(--accent-emerald)",
            }}
            title={
              timerState.isRunning
                ? "Pause timer"
                : timerState.taskId && timerState.seconds > 0
                ? "Resume timer"
                : "Start timer"
            }
          >
            {timerState.isRunning ? <Pause size={13} /> : <Play size={13} />}
          </button>

          {timerState.seconds > 0 && (
            <button
              onClick={stopTimer}
              disabled={isSaving}
              className="finance-button-secondary"
              style={{
                padding: "5px 8px",
                color: "var(--accent-rose)",
                opacity: isSaving ? 0.6 : 1,
                cursor: isSaving ? "wait" : "pointer",
              }}
              title={timerState.taskId ? "Stop & Save time entry to task" : "Stop & Reset timer"}
            >
              <Square size={13} />
            </button>
          )}

          <button
            onClick={() => setMinimized(!minimized)}
            className="finance-button-secondary"
            style={{ padding: "5px 6px" }}
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      <StartTimerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projects={projects}
        tasks={tasks}
        onStart={handleStartFromModal}
      />
    </>
  );
}
