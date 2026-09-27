"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import SettingsModal from "../SettingsModal";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { api } from "@/lib/api-client";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  const {
    user,
    loading,
    isInitialized,
    showSettings,
    openSettings,
    closeSettings,
    setUser,
    logout,
    checkAuth,
  } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Lockout countdown
  useEffect(() => {
    if (lockoutTimer === null || lockoutTimer <= 0) return;
    const t = setInterval(() => {
      setLockoutTimer((p) => {
        if (p === null || p <= 1) {
          setErrorMsg("");
          return null;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutTimer]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer && lockoutTimer > 0) return;

    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      if (!isInitialized) {
        if (passwordScore < 4) {
          throw new Error("Password requires 8+ chars, upper, number, and special character.");
        }
        await api.post("/auth/register", {
          email,
          password,
          full_name: fullName,
        });
        setSuccessMsg("Administrator registered. Initializing session...");
      }

      // Login
      const loginData: any = await api.post("/auth/login", { email, password });
      setUser(loginData.user);
      setPassword("");
      setAttemptsRemaining(null);
    } catch (err: any) {
      if (err.status === 423) {
        setLockoutTimer(15 * 60);
        setErrorMsg(err.message || "Account temporarily locked.");
      } else {
        if (typeof err.message === "string" && err.message.includes("attempt(s) remaining")) {
          const match = err.message.match(/(\d+)\s+attempt/);
          if (match) setAttemptsRemaining(parseInt(match[1]));
        }
        setErrorMsg(err.message || "An error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-app)",
          color: "var(--text-muted)",
          fontSize: "14px",
        }}
        className="mono"
      >
        Initializing workspace...
      </div>
    );
  }

  // Unauthenticated screen
  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-app)",
          padding: "24px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-xs)",
              background: "var(--text-main)",
              color: "var(--bg-app)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "14px",
              letterSpacing: "-0.5px",
            }}
          >
            MX
          </div>
          <span style={{ fontWeight: 600, fontSize: "16px", letterSpacing: "-0.3px" }}>
            Manager X
          </span>
        </div>

        <div
          className="finance-panel animate-fade-in"
          style={{
            width: "100%",
            maxWidth: "380px",
            padding: "28px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.3px" }}>
              {isInitialized ? "Sign In" : "Setup Administrator"}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
              {isInitialized
                ? "Access your secure Manager X workspace."
                : "Initialize root administrative credentials."}
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(244, 63, 94, 0.08)",
                border: "1px solid var(--accent-rose)",
                color: "var(--accent-rose)",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid var(--accent-emerald)",
                color: "var(--accent-emerald)",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{successMsg}</span>
            </div>
          )}

          {lockoutTimer && lockoutTimer > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid var(--accent-amber)",
                color: "var(--accent-amber)",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} />
                <span>Lockout cooldown</span>
              </div>
              <span className="mono" style={{ fontWeight: 600 }}>
                {formatTimer(lockoutTimer)}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {!isInitialized && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Workspace Administrator"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="finance-input"
                />
              </div>
            )}

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                Work Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@managerx.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="finance-input"
                autoComplete="email"
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Password</label>
                {attemptsRemaining !== null && (
                  <span style={{ fontSize: "11px", color: "var(--accent-amber)" }} className="mono">
                    {attemptsRemaining} attempts left
                  </span>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="finance-input"
                  style={{ paddingRight: "38px" }}
                  autoComplete={isInitialized ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {!isInitialized && password.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", gap: "4px", height: "3px" }}>
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        style={{
                          flex: 1,
                          borderRadius: "1px",
                          background:
                            passwordScore >= step
                              ? passwordScore === 4
                                ? "var(--accent-emerald)"
                                : "var(--accent-amber)"
                              : "var(--border-subtle)",
                          transition: "background-color 0.2s ease",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                    Requires 8+ chars, uppercase, number, symbol
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || (lockoutTimer !== null && lockoutTimer > 0)}
              className="finance-button-primary"
              style={{ marginTop: "6px" }}
            >
              <span>{submitting ? "Authenticating..." : isInitialized ? "Continue" : "Initialize Workspace"}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          <div
            style={{
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "11px",
              color: "var(--text-dim)",
            }}
          >
            <span>Argon2id + HTTP-Only Cookie</span>
            <span className="mono">WAL SQLite</span>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Layout Shell
  return (
    <div className="app-shell">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenSettings={openSettings}
      />

      <div className="app-main-wrapper">
        <Header
          title={title}
          userEmail={user.email}
          onLogout={logout}
          onOpenSettings={openSettings}
        />

        <main className="app-content">{children}</main>
      </div>

      {/* Global Workspace Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={closeSettings} />
    </div>
  );
}
