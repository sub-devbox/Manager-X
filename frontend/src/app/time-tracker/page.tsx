"use client";

import React from "react";
import AppShell from "@/components/layout/AppShell";
import { Clock, Play } from "lucide-react";

export default function TimeTrackerPage() {
  return (
    <AppShell title="Time Tracker">
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          className="finance-panel"
          style={{
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px" }}>
              Billable Time Tracking & Live Logs
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
              WebSocket-synchronized live stopwatch and manual time entries.
            </p>
          </div>

          <button
            className="finance-button-primary"
            style={{ width: "auto", padding: "8px 14px" }}
          >
            <Play size={14} />
            <span>Start Session</span>
          </button>
        </div>

        <div
          className="finance-panel"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-xs)",
              background: "var(--bg-surface-subtle)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
            }}
          >
            <Clock size={22} />
          </div>
          <div style={{ fontSize: "15px", fontWeight: 600 }}>Global Live Timer Connected</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "420px" }}>
            The Global Floating Timer Bar operates persistently in the bottom dock across all pages and routes.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
