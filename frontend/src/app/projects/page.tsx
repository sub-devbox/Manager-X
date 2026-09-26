"use client";

import React from "react";
import AppShell from "@/components/layout/AppShell";
import { FolderKanban, Plus } from "lucide-react";

export default function ProjectsPage() {
  return (
    <AppShell title="Projects & Tasks">
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
              Project Management & Kanban
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
              Track clients, deliverables, sprints, and task lifecycles.
            </p>
          </div>

          <button
            className="finance-button-primary"
            style={{ width: "auto", padding: "8px 14px" }}
          >
            <Plus size={15} />
            <span>New Project</span>
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
            <FolderKanban size={22} />
          </div>
          <div style={{ fontSize: "15px", fontWeight: 600 }}>Operational Engine Ready</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "420px" }}>
            The Project & Kanban module is prepared for full CRUD, milestones, and task synchronization in Phase 4.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
