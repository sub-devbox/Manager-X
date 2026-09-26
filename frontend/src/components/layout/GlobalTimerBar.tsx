"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Clock, ChevronDown, ChevronUp } from "lucide-react";

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
  const wsRef = useRef<WebSocket | null>(null);

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem("mx_active_timer", JSON.stringify(timerState));
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
    const handleStartTask = (e: Event) => {
      const customEvent = e as CustomEvent<{
        taskId: string;
        taskTitle: string;
        projectId?: string;
        projectTitle?: string;
      }>;
      if (customEvent.detail) {
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

  // WebSocket sync for multi-tab consistency
  useEffect(() => {
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_TIMER_URL || "ws://localhost:8000/ws/timer";

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "TIMER_SYNC") {
              setTimerState((prev) => ({
                ...prev,
                isRunning: Boolean(data.isRunning),
                seconds: Number(data.seconds) || prev.seconds,
                taskTitle: data.taskTitle || prev.taskTitle,
                projectTitle: data.projectTitle || prev.projectTitle,
              }));
            }
          } catch {}
        };

        socket.onerror = () => {
          socket?.close();
        };

        socket.onclose = () => {
          reconnectTimeout = setTimeout(connect, 15000);
        };
      } catch {}
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const toggleRun = () => {
    setTimerState((prev) => {
      const willRun = !prev.isRunning;
      const next = {
        ...prev,
        isRunning: willRun,
        startTime: willRun && !prev.startTime ? new Date().toISOString() : prev.startTime,
      };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "TIMER_TOGGLE", ...next }));
      }
      return next;
    });
  };

  const stopTimer = async () => {
    if (timerState.taskId && timerState.seconds >= 5) {
      setIsSaving(true);
      try {
        const { api } = await import("@/lib/api-client");
        const startTime = timerState.startTime || new Date(Date.now() - timerState.seconds * 1000).toISOString();
        await api.post("/time-entries", {
          task_id: timerState.taskId,
          project_id: timerState.projectId || undefined,
          description: timerState.description || `Logged via stopwatch for ${timerState.taskTitle}`,
          start_time: startTime,
          end_time: new Date().toISOString(),
          duration_seconds: timerState.seconds,
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

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "TIMER_STOP", ...resetState }));
    }
  };

  return (
    <div className="global-timer-bar finance-panel" style={{ zIndex: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {timerState.isRunning ? (
          <span className="pulse-indicator" />
        ) : (
          <Clock size={15} style={{ color: "var(--text-dim)" }} />
        )}

        <span className="timer-digits">{formatTime(timerState.seconds)}</span>

        {!minimized && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: "4px",
              maxWidth: "140px",
            }}
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
          onClick={toggleRun}
          className="finance-button-secondary"
          style={{
            padding: "5px 8px",
            color: timerState.isRunning ? "var(--accent-amber)" : "var(--accent-emerald)",
          }}
          title={timerState.isRunning ? "Pause timer" : "Start timer"}
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
  );
}
