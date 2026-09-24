"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Sun,
  KeyRound,
  Database,
  Cpu,
  LogOut,
  ArrowRight,
  Terminal,
  Activity,
} from "lucide-react";

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export default function LoginPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Security & Feedback State
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [showSecurityDrawer, setShowSecurityDrawer] = useState(false);

  // Theme synchronization
  useEffect(() => {
    const savedTheme = (localStorage.getItem("mx_theme") as "dark" | "light") || "dark";
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("mx_theme", newTheme);
    document.documentElement.dataset.theme = newTheme;
  };

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer === null || lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev === null || prev <= 1) {
          setErrorMsg("");
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Initial Auth Status Check
  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // 1. Check if user is already authenticated
      const meRes = await fetch("/api/v1/auth/me", { credentials: "include" });
      if (meRes.ok) {
        const userData = await meRes.json();
        setUser(userData);
        setIsInitialized(true);
        setLoading(false);
        return;
      }

      // 2. Check if system has any users registered
      const statusRes = await fetch("/api/v1/auth/status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setIsInitialized(statusData.initialized);
      } else {
        // Fallback default
        setIsInitialized(true);
      }
    } catch {
      setErrorMsg("Backend service connection error. Please ensure FastAPI is running on port 8000.");
      setIsInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  // Password Strength Calculation (Client-side mirror of backend Argon2 validation rules)
  const passwordAnalysis = useMemo(() => {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      symbol: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/]/.test(password),
    };
    const score = Object.values(checks).filter(Boolean).length;
    let label = "Very Weak";
    let color = "#ef4444";
    if (score >= 5) {
      label = "Formidable";
      color = "#10b981";
    } else if (score >= 4) {
      label = "Strong";
      color = "#14b8a6";
    } else if (score >= 3) {
      label = "Moderate";
      color = "#f59e0b";
    } else if (score >= 2) {
      label = "Weak";
      color = "#f97316";
    }

    return { checks, score, label, color, isSecure: score === 5 };
  }, [password]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer !== null && lockoutTimer > 0) return;

    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      if (!isInitialized) {
        // Registration Flow
        if (!passwordAnalysis.isSecure) {
          setErrorMsg("Please satisfy all password complexity criteria before proceeding.");
          setSubmitting(false);
          return;
        }

        const res = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, full_name: fullName }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Registration failed.");
        }

        setSuccessMsg("Administrator account initialized! Logging in...");
        setIsInitialized(true);
        // Automatically log in
        await performLogin(email, password);
      } else {
        // Standard Login Flow
        await performLogin(email, password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const performLogin = async (loginEmail: string, loginPass: string) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: loginEmail, password: loginPass }),
    });

    const data = await res.json();

    if (res.status === 423) {
      // Account locked out
      setLockoutTimer(15 * 60); // 15 mins default
      throw new Error(data.detail || "Account temporarily locked.");
    }

    if (!res.ok) {
      // Check remaining attempts
      if (typeof data.detail === "string" && data.detail.includes("attempt(s) remaining")) {
        const match = data.detail.match(/(\d+)\s+attempt\(s\)\s+remaining/);
        if (match) setAttemptsRemaining(parseInt(match[1]));
      }
      throw new Error(data.detail || "Invalid credentials.");
    }

    // Success
    setUser(data.user);
    setAttemptsRemaining(null);
    setPassword("");
    setSuccessMsg("Access granted. Session initialized.");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setEmail("");
      setPassword("");
      setSuccessMsg("Logged out safely.");
    }
  };

  // Detect Caps Lock for security ergonomics
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState("CapsLock"));
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "2rem 1rem",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Top Header & Theme Switcher */}
      <header
        style={{
          width: "100%",
          maxWidth: "1080px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.5rem 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--accent-primary) 0%, #14b8a6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.1rem",
              boxShadow: "0 4px 14px var(--accent-glow)",
            }}
          >
            X
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
              MANAGER
            </span>
            <span
              style={{
                color: "var(--accent-primary)",
                fontWeight: 800,
                marginLeft: "3px",
                fontSize: "1.05rem",
              }}
            >
              X
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setShowSecurityDrawer(!showSecurityDrawer)}
            style={{
              background: showSecurityDrawer ? "var(--bg-pill)" : "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-full)",
              padding: "0.4rem 0.85rem",
              fontSize: "0.78rem",
              fontWeight: 500,
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <ShieldCheck size={14} color="var(--accent-teal)" />
            <span>Security Architecture</span>
          </button>

          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-full)",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Main Authentication Centerpiece */}
      <main
        style={{
          width: "100%",
          maxWidth: user ? "580px" : "440px",
          margin: "auto 0",
          transition: "max-width 0.3s ease",
        }}
        className="animate-fade-in"
      >
        {loading ? (
          <div
            className="glass-panel"
            style={{
              padding: "3.5rem 2rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                border: "2px solid var(--border-subtle)",
                borderTopColor: "var(--accent-primary)",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
              Initializing secure session engine...
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : user ? (
          /* Authenticated Dashboard View */
          <div className="glass-panel" style={{ padding: "2.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "2rem",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "var(--accent-emerald)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: "var(--radius-full)",
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    marginBottom: "0.75rem",
                  }}
                >
                  <Activity size={12} />
                  <span>Authenticated Session Active</span>
                </div>
                <h1 style={{ fontSize: "1.45rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                  Welcome, {user.full_name}
                </h1>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Primary Administrator &middot; Local Workspace
                </p>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.5rem 0.9rem",
                  color: "var(--accent-rose)",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <LogOut size={14} />
                <span>Revoke & Sign Out</span>
              </button>
            </div>

            {/* User Security Snapshot */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  background: "var(--bg-pill)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "1rem",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Email Identity
                </div>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, marginTop: "0.25rem", wordBreak: "break-all" }}>
                  {user.email}
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-pill)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "1rem",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Role Privilege
                </div>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, marginTop: "0.25rem", color: "var(--accent-teal)" }}>
                  {user.is_superuser ? "Super Administrator" : "Standard User"}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                background: "rgba(99, 102, 241, 0.06)",
                border: "1px solid var(--border-glow)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-primary)", fontWeight: 600, fontSize: "0.88rem" }}>
                <CheckCircle2 size={16} />
                <span>Zero-Trust Local Invariant Verified</span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                Your local SQLite database is running in high-performance Write-Ahead Logging mode. The active JWT session is cryptographically bound to your machine with automatic timing-attack defense.
              </p>
            </div>
          </div>
        ) : (
          /* Login & Registration Form Card */
          <div className="glass-panel" style={{ padding: "2.5rem 2rem" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "var(--bg-pill)",
                  border: "1px solid var(--border-subtle)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <Lock size={22} color="var(--accent-primary)" />
              </div>
              <h1 style={{ fontSize: "1.45rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                {!isInitialized ? "Initialize Administrator" : "Executive Sign In"}
              </h1>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                {!isInitialized
                  ? "Create the master key for your local Manager X workspace"
                  : "Enter your credentials to decrypt your workspace"}
              </p>
            </div>

            {/* Status & Error Alerts */}
            {errorMsg && (
              <div
                style={{
                  background: "rgba(244, 63, 94, 0.12)",
                  border: "1px solid rgba(244, 63, 94, 0.25)",
                  color: "var(--accent-rose)",
                  padding: "0.8rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.82rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.6rem",
                  lineHeight: 1.4,
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>{errorMsg}</div>
              </div>
            )}

            {attemptsRemaining !== null && attemptsRemaining > 0 && !errorMsg.includes("locked") && (
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  color: "var(--accent-amber)",
                  padding: "0.6rem 0.9rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.78rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <AlertTriangle size={14} />
                <span>Security Notice: {attemptsRemaining} attempt(s) remaining before temporary lockout.</span>
              </div>
            )}

            {lockoutTimer !== null && lockoutTimer > 0 && (
              <div
                style={{
                  background: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.35)",
                  color: "var(--accent-rose)",
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.82rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                  <Shield size={16} />
                  <span>Brute-Force Rate Limiter Engaged</span>
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                  Cooldown remaining:{" "}
                  <strong className="mono">
                    {Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s
                  </strong>
                </div>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  color: "var(--accent-emerald)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.82rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isInitialized && (
                <div style={{ marginBottom: "1.1rem" }}>
                  <label
                    htmlFor="fullName"
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      color: "var(--text-muted)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Full Name
                  </label>
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-dim)",
                      }}
                    >
                      <User size={16} />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      required
                      placeholder="e.g. Subhankar Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem 0.75rem 2.4rem",
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-main)",
                        fontSize: "0.9rem",
                        outline: "none",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div style={{ marginBottom: "1.1rem" }}>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    marginBottom: "0.4rem",
                  }}
                >
                  Email Identity
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-dim)",
                    }}
                  >
                    <Mail size={16} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem 0.75rem 2.4rem",
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-main)",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.4rem",
                  }}
                >
                  <label
                    htmlFor="password"
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      color: "var(--text-muted)",
                    }}
                  >
                    Master Password
                  </label>
                  {capsLockActive && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--accent-amber)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <AlertTriangle size={12} /> Caps Lock ON
                    </span>
                  )}
                </div>

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-dim)",
                    }}
                  >
                    <KeyRound size={16} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete={isInitialized ? "current-password" : "new-password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                      width: "100%",
                      padding: "0.75rem 2.5rem 0.75rem 2.4rem",
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-main)",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-dim)",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Registration: Real-time Password Strength Meter */}
                {!isInitialized && password.length > 0 && (
                  <div style={{ marginTop: "0.85rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.74rem",
                        marginBottom: "0.35rem",
                      }}
                    >
                      <span style={{ color: "var(--text-dim)" }}>Entropy Level:</span>
                      <span style={{ color: passwordAnalysis.color, fontWeight: 600 }}>
                        {passwordAnalysis.label}
                      </span>
                    </div>

                    <div
                      style={{
                        height: "4px",
                        width: "100%",
                        background: "var(--border-subtle)",
                        borderRadius: "2px",
                        overflow: "hidden",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(passwordAnalysis.score / 5) * 100}%`,
                          backgroundColor: passwordAnalysis.color,
                          transition: "width 0.3s ease, background-color 0.3s ease",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.3rem",
                        fontSize: "0.72rem",
                        color: "var(--text-dim)",
                      }}
                    >
                      <span style={{ color: passwordAnalysis.checks.length ? "var(--accent-emerald)" : undefined }}>
                        &bull; 8+ Characters
                      </span>
                      <span style={{ color: passwordAnalysis.checks.uppercase ? "var(--accent-emerald)" : undefined }}>
                        &bull; Uppercase letter
                      </span>
                      <span style={{ color: passwordAnalysis.checks.lowercase ? "var(--accent-emerald)" : undefined }}>
                        &bull; Lowercase letter
                      </span>
                      <span style={{ color: passwordAnalysis.checks.number ? "var(--accent-emerald)" : undefined }}>
                        &bull; Numeric digit
                      </span>
                      <span style={{ color: passwordAnalysis.checks.symbol ? "var(--accent-emerald)" : undefined }}>
                        &bull; Special character
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || (lockoutTimer !== null && lockoutTimer > 0)}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  background:
                    lockoutTimer !== null && lockoutTimer > 0
                      ? "var(--border-subtle)"
                      : "linear-gradient(135deg, var(--accent-primary) 0%, #4338ca 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor:
                    submitting || (lockoutTimer !== null && lockoutTimer > 0)
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow:
                    lockoutTimer !== null && lockoutTimer > 0 ? "none" : "var(--shadow-glow)",
                }}
              >
                {submitting ? (
                  <span>Authenticating...</span>
                ) : lockoutTimer !== null && lockoutTimer > 0 ? (
                  <span>Locked ({Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s)</span>
                ) : (
                  <>
                    <span>{!isInitialized ? "Initialize Master Vault" : "Sign In"}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Security Architecture Drawer (Modal / Expandable Card) */}
      {showSecurityDrawer && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: "fixed",
            bottom: "4.5rem",
            width: "92%",
            maxWidth: "680px",
            padding: "1.5rem",
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={18} color="var(--accent-teal)" />
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                Senior Security Controls & Specifications
              </h2>
            </div>
            <button
              onClick={() => setShowSecurityDrawer(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              &times; Close
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              fontSize: "0.78rem",
            }}
          >
            <div
              style={{
                background: "var(--bg-pill)",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--accent-teal)", marginBottom: "0.2rem" }}>
                1. Argon2id Password Hashing
              </div>
              <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>
                OWASP standard password derivation with 64MB memory cost, 3 iterations, and constant-time dummy verify mitigation.
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-pill)",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--accent-primary)", marginBottom: "0.2rem" }}>
                2. Brute-Force & Lockout
              </div>
              <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>
                Account lockout after 5 consecutive failures with 15-minute cooldown and audit trail logs.
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-pill)",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--accent-amber)", marginBottom: "0.2rem" }}>
                3. Ephemeral Sessions & Revocation
              </div>
              <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>
                Each JWT embeds a unique <code className="mono">jti</code> tracked in SQLite. Single-click revocation terminates rogue access immediately.
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-pill)",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--accent-emerald)", marginBottom: "0.2rem" }}>
                4. SQLite WAL Mode Storage
              </div>
              <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>
                Local-first zero external cloud leakage. Concurrency handled with Write-Ahead Logging and atomic ACID transactions.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Assurance Footer Badges */}
      <footer
        style={{
          width: "100%",
          maxWidth: "800px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "1.5rem",
          fontSize: "0.76rem",
          color: "var(--text-dim)",
          padding: "1rem 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Shield size={14} color="var(--accent-teal)" />
          <span>Argon2id Hashing</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Lock size={14} color="var(--accent-primary)" />
          <span>HttpOnly Strict Cookies</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Database size={14} color="var(--accent-emerald)" />
          <span>SQLite WAL Isolation</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Cpu size={14} color="var(--accent-amber)" />
          <span>Zero Cloud Telemetry</span>
        </div>
      </footer>
    </div>
  );
}
