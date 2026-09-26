"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  DollarSign,
  Package,
  Calculator,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  onOpenSettings?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  onOpenSettings,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  const navSections = [
    {
      title: "Core",
      items: [{ name: "Overview", href: "/", icon: LayoutDashboard }],
    },
    {
      title: "Operations",
      items: [
        { name: "Clients", href: "/clients", icon: Building2 },
        { name: "Projects", href: "/projects", icon: FolderKanban },
        { name: "Tasks", href: "/tasks", icon: CheckSquare },
        { name: "Time Tracker", href: "/time-tracker", icon: Clock },
        { name: "Invoices", href: "/invoices", icon: FileText },
      ],
    },
    {
      title: "Financials",
      items: [
        { name: "Accounts & P&L", href: "/finance", icon: DollarSign },
        { name: "Fixed Assets", href: "/assets", icon: Package },
        { name: "ITR Tax Helper", href: "/itr-helper", icon: Calculator },
        { name: "Wealth Portfolio", href: "/wealth", icon: TrendingUp },
      ],
    },
  ];

  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Top Brand Logo */}
      <div
        style={{
          height: "var(--header-height)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0" : "0 16px",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-xs)",
              background: "var(--text-main)",
              color: "var(--bg-app)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "-0.5px",
              flexShrink: 0,
            }}
          >
            MX
          </div>
          {!collapsed && (
            <span style={{ fontWeight: 600, fontSize: "14px", letterSpacing: "-0.2px" }}>
              Manager X
            </span>
          )}
        </Link>
      </div>

      {/* Nav List */}
      <div style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {navSections.map((sec, secIdx) => (
          <div key={secIdx} style={{ marginBottom: "16px" }}>
            {!collapsed && <div className="nav-section-label">{sec.title}</div>}
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  title={collapsed ? item.name : undefined}
                  style={{
                    justifyContent: collapsed ? "center" : "flex-start",
                    padding: collapsed ? "10px 0" : "9px 12px",
                  }}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Footer Actions */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "10px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="nav-item"
            style={{
              width: "100%",
              background: "none",
              border: "1px solid transparent",
              cursor: "pointer",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "10px 0" : "9px 12px",
            }}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings size={17} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Settings</span>}
          </button>
        )}

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="nav-item"
            style={{
              width: "100%",
              background: "none",
              border: "1px solid transparent",
              cursor: "pointer",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "10px 0" : "9px 12px",
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={17} style={{ flexShrink: 0 }} />
            ) : (
              <>
                <ChevronLeft size={17} style={{ flexShrink: 0 }} />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
