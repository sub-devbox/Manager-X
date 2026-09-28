"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon, LogOut, Settings, Menu } from "lucide-react";
import { api } from "@/lib/api-client";

interface HeaderProps {
  userEmail?: string;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onToggleMobileNav?: () => void;
  title?: string;
}

export default function Header({
  userEmail,
  onLogout,
  onOpenSettings,
  onToggleMobileNav,
  title,
}: HeaderProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("mx_theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("mx_theme", next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <header className="app-header">
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {onToggleMobileNav && (
          <button
            type="button"
            onClick={onToggleMobileNav}
            className="finance-button-secondary mobile-only"
            title="Open Menu"
            style={{ padding: "6px 8px" }}
            aria-label="Toggle navigation menu"
          >
            <Menu size={16} />
          </button>
        )}
        {title && (
          <h1
            style={{
              fontSize: "15px",
              fontWeight: 600,
              letterSpacing: "-0.2px",
              margin: 0,
            }}
          >
            {title}
          </h1>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* System Status Pill (Desktop only) */}
        <div
          className="desktop-only"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-xs)",
            fontSize: "12px",
            color: "var(--text-muted)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--accent-emerald)",
            }}
          />
          <span className="mono" style={{ fontSize: "11px" }}>
            SYSTEM LIVE
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="finance-button-secondary"
          title="Toggle theme"
          style={{ padding: "6px 10px" }}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="finance-button-secondary"
            title="Settings"
            style={{ padding: "6px 10px" }}
          >
            <Settings size={14} />
          </button>
        )}

        {/* User Badge / Logout */}
        {userEmail && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingLeft: "8px",
              borderLeft: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="desktop-only"
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                maxWidth: "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userEmail}
            </span>

            {onLogout && (
              <button
                onClick={onLogout}
                className="finance-button-secondary"
                title="Sign out"
                style={{ padding: "6px 8px" }}
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
