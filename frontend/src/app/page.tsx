"use client";

import React from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  FolderKanban,
  Clock,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  Calculator,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function OverviewPage() {
  const { user } = useAuth();

  const operationalModules = [
    {
      title: "Project Manager",
      desc: "Client engagements, sprint milestones, and ticket Kanban board.",
      href: "/projects",
      icon: FolderKanban,
      badge: "Ops",
    },
    {
      title: "Time Tracker",
      desc: "Live multi-tab stopwatch, billable hours capture, and audit logs.",
      href: "/time-tracker",
      icon: Clock,
      badge: "Ops",
    },
    {
      title: "Invoice Generator",
      desc: "GST-compliant invoices, automated tax split, and PDF exports.",
      href: "/invoices",
      icon: FileText,
      badge: "Ops",
    },
  ];

  const financialModules = [
    {
      title: "Finance & Accounts",
      desc: "Bank & cash accounts ledger, double-entry transfers, and P&L charts.",
      href: "/finance",
      icon: DollarSign,
      badge: "Financial",
    },
    {
      title: "Asset Registry",
      desc: "Fixed assets tracking, WDV & SLM formula depreciation engines.",
      href: "/assets",
      icon: Package,
      badge: "Financial",
    },
    {
      title: "ITR Tax Helper",
      desc: "Old vs New regime comparator, 44ADA presumptive tax estimator.",
      href: "/itr-helper",
      icon: Calculator,
      badge: "Tax",
    },
    {
      title: "Wealth Portfolio",
      desc: "Asset allocations, net worth timeline, and goal tracking.",
      href: "/wealth",
      icon: TrendingUp,
      badge: "Wealth",
    },
  ];

  return (
    <AppShell title="Executive Overview">
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Welcome Banner */}
        <div
          className="finance-panel"
          style={{
            padding: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.3px" }}>
                Welcome back, {user?.full_name || user?.email || "Executive"}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-xs)",
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "var(--accent-emerald)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  fontWeight: 500,
                }}
              >
                {user?.is_superuser ? "Super Admin" : "Member"}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
              Unified operational ERP, billable time tracker, and financial wealth operating system.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-xs)",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              <ShieldCheck size={14} style={{ color: "var(--accent-emerald)" }} />
              <span className="mono">Local-First SQLite (WAL)</span>
            </div>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          {[
            { label: "Active Engagements", val: "0 Projects", sub: "Operational Pipeline" },
            { label: "Billable Unbilled Time", val: "0h 00m", sub: "Ready for Invoicing" },
            { label: "Outstanding Receivables", val: "₹0.00", sub: "Unpaid Invoices" },
            { label: "Cash & Liquid Balance", val: "₹0.00", sub: "Across All Accounts" },
          ].map((kpi, idx) => (
            <div
              key={idx}
              className="finance-panel"
              style={{
                padding: "16px",
                background: "var(--bg-surface)",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 600, marginTop: "8px", letterSpacing: "-0.5px" }} className="mono">
                {kpi.val}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Operations Section */}
        <div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            Operational Modules
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "12px",
            }}
          >
            {operationalModules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={idx}
                  href={mod.href}
                  className="finance-panel"
                  style={{
                    padding: "20px",
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "var(--radius-xs)",
                          background: "var(--bg-surface-subtle)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-main)",
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: "var(--radius-xs)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-dim)",
                        }}
                      >
                        {mod.badge}
                      </span>
                    </div>

                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                      {mod.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                      {mod.desc}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--accent-blue)",
                      fontWeight: 500,
                    }}
                  >
                    <span>Open Module</span>
                    <ArrowRight size={13} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Financial & Wealth Section */}
        <div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            Financial, Tax & Wealth Systems
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "12px",
            }}
          >
            {financialModules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={idx}
                  href={mod.href}
                  className="finance-panel"
                  style={{
                    padding: "20px",
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "var(--radius-xs)",
                          background: "var(--bg-surface-subtle)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-main)",
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: "var(--radius-xs)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-dim)",
                        }}
                      >
                        {mod.badge}
                      </span>
                    </div>

                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                      {mod.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                      {mod.desc}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--accent-blue)",
                      fontWeight: 500,
                    }}
                  >
                    <span>Open Module</span>
                    <ArrowRight size={13} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
