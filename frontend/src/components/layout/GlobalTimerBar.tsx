"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface TimerState {
  isRunning: boolean;
  seconds: number;
  taskTitle: string;
  projectTitle: string;
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
      taskTitle: "Ad-hoc Session",
      projectTitle: "General",
    };
  });

  const [minimized, setMinimized] = useState(false);
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
              setTimerState({
                isRunning: Boolean(data.isRunning),
                seconds: Number(data.seconds) || 0,
                taskTitle: data.taskTitle || "Ad-hoc Session",
                projectTitle: data.projectTitle || "General",
              });
            }
          } catch {}
        };

        socket.onerror = () => {
          // Fallback to local timer without spamming console
          socket?.close();
        };

        socket.onclose = () => {
          // Reconnect attempt every 15s in background
          reconnectTimeout = setTimeout(connect, 15000);
        };
      } catch {
        // WebSocket unavailable, local client state holds
      }
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
      const next = { ...prev, isRunning: !prev.isRunning };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "TIMER_TOGGLE", ...next }));
      }
      return next;
    });
  };

  const stopTimer = () => {
    setTimerState((prev) => {
      const next = { ...prev, isRunning: false, seconds: 0 };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "TIMER_STOP", ...next }));
      }
      return next;
    });
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
            className="finance-button-secondary"
            style={{ padding: "5px 8px", color: "var(--accent-rose)" }}
            title="Stop & Reset timer"
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
