"use client";

import React from "react";
import AppShell from "@/components/layout/AppShell";
import { Calculator } from "lucide-react";

export default function ItrHelperPage() {
  return (
    <AppShell title="ITR Tax Helper">
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
              Income Tax Return (ITR) Helper & Estimator
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
              Old vs New regime comparison with Section 44ADA presumptive taxation computations.
            </p>
          </div>
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
            <Calculator size={22} />
          </div>
          <div style={{ fontSize: "15px", fontWeight: 600 }}>Zero-Hardcoding Tax Engine</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "420px" }}>
            Dynamic tax slabs, deduction schedules, and regime comparison will be activated in Phase 5.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
