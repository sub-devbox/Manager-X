"use client";

import React from "react";
import AppShell from "@/components/layout/AppShell";
import { TrendingUp, Plus } from "lucide-react";

export default function WealthPage() {
  return (
    <AppShell title="Wealth & Portfolio">
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
              Wealth Portfolio & Net Worth Tracker
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
              Multi-asset allocation (Equity, Mutual Funds, Gold, Real Estate, Crypto) and valuation curves.
            </p>
          </div>

          <button
            className="finance-button-primary"
            style={{ width: "auto", padding: "8px 14px" }}
          >
            <Plus size={15} />
            <span>Add Holding</span>
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
            <TrendingUp size={22} />
          </div>
          <div style={{ fontSize: "15px", fontWeight: 600 }}>Portfolio Aggregation Ready</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "420px" }}>
            Holdings valuations, asset weighting, and net worth growth trajectory will be activated in Phase 5.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
