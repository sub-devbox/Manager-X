"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  LogOut,
  FolderKanban,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
} from "lucide-react";

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Feedback
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const meRes = await fetch("/api/v1/auth/me", { credentials: "include" });
      if (meRes.ok) {
        setUser(await meRes.json());
        setIsInitialized(true);
        return;
      }
      const statusRes = await fetch("/api/v1/auth/status");
      if (statusRes.ok) {
        const data = await statusRes.json();
        setIsInitialized(data.initialized);
      } else {
        setIsInitialized(true);
      }
    } catch {
      setErrorMsg("Unable to reach backend on port 8000.");
      setIsInitialized(true);
    } finally {
      setLoading(false);
    }
  };

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
        const regRes = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, full_name: fullName }),
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(regData.detail || "Registration failed.");
        setIsInitialized(true);
        setSuccessMsg("Administrator registered. Initializing session...");
      }

      // Login
      const loginRes = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();

      if (loginRes.status === 423) {
        setLockoutTimer(15 * 60);
        throw new Error(loginData.detail || "Account temporarily locked.");
      }

      if (!loginRes.ok) {
        if (typeof loginData.detail === "string" && loginData.detail.includes("attempt(s) remaining")) {
          const match = loginData.detail.match(/(\d+)\s+attempt/);
          if (match) setAttemptsRemaining(parseInt(match[1]));
        }
        throw new Error(loginData.detail || "Invalid credentials.");
      }

      setUser(loginData.user);
      setPassword("");
      setAttemptsRemaining(null);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      setUser(null);
      setPassword("");
      setSuccessMsg("Signed out successfully.");
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navigation Bar - Clean, flat, border-bottom only, NO shadow */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
            }}
          >
            MX
          </div>
          <div>
            <span style={{ fontWeight: 600, fontSize: "14px", letterSpacing: "-0.2px" }}>Manager X</span>
            <span style={{ fontSize: "12px", color: "var(--text-dim)", marginLeft: "8px" }} className="mono">
              FINANCE OS
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
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
            <span className="mono">SYSTEM LIVE</span>
          </div>

          <button
            onClick={toggleTheme}
            className="finance-button-secondary"
            title="Toggle theme"
            style={{ padding: "6px 10px" }}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
        }}
      >
        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: "14px" }} className="mono">
            Synchronizing state...
          </div>
        ) : user ? (
          /* Authenticated Dashboard View - Minimalist Financial Portfolio */
          <div
            className="finance-panel animate-fade-in"
            style={{ width: "100%", maxWidth: "860px", padding: "28px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "20px",
                marginBottom: "24px",
              }}
            >
              <div>
                <h1 style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.3px" }}>Overview</h1>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Signed in as <span style={{ color: "var(--text-main)", fontWeight: 500 }}>{user.email}</span>
                </p>
              </div>

              <button onClick={handleLogout} className="finance-button-secondary">
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Quick KPI stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  background: "var(--bg-surface-subtle)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                  Authentication
                </div>
                <div style={{ fontSize: "16px", fontWeight: 600, marginTop: "6px" }} className="mono">
                  Argon2id + JWT
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-surface-subtle)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                  Database Engine
                </div>
                <div style={{ fontSize: "16px", fontWeight: 600, marginTop: "6px" }} className="mono">
                  SQLite (WAL)
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-surface-subtle)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                  Role & Privileges
                </div>
                <div style={{ fontSize: "16px", fontWeight: 600, marginTop: "6px", color: "var(--accent-emerald)" }}>
                  {user.is_superuser ? "Super Administrator" : "Active Member"}
                </div>
              </div>
            </div>

            {/* Platform Applications Grid */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "20px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "12px",
                }}
              >
                Manager X Modules
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "10px",
                }}
              >
                {[
                  { name: "Project Manager", desc: "Sprints, milestones & tickets", icon: FolderKanban },
                  { name: "Time Tracker", desc: "Billable client hours & audits", icon: Clock },
                  { name: "Invoice Generator", desc: "GST & compliant export", icon: FileText },
                  { name: "Finance Manager", desc: "Cash flow & P&L tracking", icon: DollarSign },
                  { name: "Wealth & Assets", desc: "Holdings, inventory & ITR helper", icon: TrendingUp },
                ].map((mod, idx) => {
                  const Icon = mod.icon;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "14px",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-input)",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "var(--radius-xs)",
                          background: "var(--bg-surface-subtle)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 500 }}>{mod.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{mod.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Clean, Razor-sharp, Minimal Finance Login Card */
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
                  ? "Access your secure Manager X financial workspace."
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
                    placeholder="Chief Financial Officer"
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

                {/* Minimalist 4-segment strength bar for setup */}
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
        )}
      </main>

      {/* Footer - Minimal hairline */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "var(--text-dim)",
        }}
      >
        <span>Manager X &copy; 2026. Financial OS.</span>
        <span className="mono">Security Status: Enforced</span>
      </footer>
    </div>
  );
}
