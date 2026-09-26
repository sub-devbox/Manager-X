"use client";

import React from "react";
import AppShell from "@/components/layout/AppShell";
import { FileText, Plus } from "lucide-react";

export default function InvoicesPage() {
  return (
    <AppShell title="Invoices & Billing">
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
              Invoices & Receivable Accounts
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
              Generate compliant GST & multi-currency invoices with PDF export.
            </p>
          </div>

          <button
            className="finance-button-primary"
            style={{ width: "auto", padding: "8px 14px" }}
          >
            <Plus size={15} />
            <span>Create Invoice</span>
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
            <FileText size={22} />
          </div>
          <div style={{ fontSize: "15px", fontWeight: 600 }}>Billing Engine Ready</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "420px" }}>
            The invoice generation wizard, time-entry linkage, and tax breakdown will be activated in Phase 4.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
