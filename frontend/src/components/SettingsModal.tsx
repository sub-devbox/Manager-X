"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building,
  Coins,
  Palette,
  Database,
  Download,
  Upload,
  Plus,
  Pencil,
  Trash2,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  pan: string;
  gstin: string;
  email: string;
  website: string;
}

interface Currency {
  code: string;
  symbol: string;
  name: string;
  is_base_currency: boolean;
  is_active: boolean;
}

interface BackupInfo {
  filename: string;
  size_bytes: number;
  size_display: string;
  created_at: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: "Monochrome", hex: "#ffffff" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Cyan", hex: "#06b6d4" },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"company" | "currencies" | "theme" | "backup">("company");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Company Profile State
  const [company, setCompany] = useState<CompanyProfile>({
    name: "",
    address: "",
    phone: "",
    pan: "",
    gstin: "",
    email: "",
    website: "",
  });

  // 2. Currencies State
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [newCurrency, setNewCurrency] = useState({
    code: "",
    symbol: "",
    name: "",
    is_base_currency: false,
  });
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [showAddCurrency, setShowAddCurrency] = useState(false);

  // 3. Theme State
  const [accentColor, setAccentColor] = useState("#ffffff");

  // 4. Backup State
  const [backups, setBackups] = useState<BackupInfo[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadAllSettings();
    }
  }, [isOpen]);

  const loadAllSettings = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      // Company Profile
      const compRes = await fetch("/api/v1/settings/company", { credentials: "include" });
      if (compRes.ok) setCompany(await compRes.json());

      // Currencies
      const currRes = await fetch("/api/v1/settings/currencies", { credentials: "include" });
      if (currRes.ok) setCurrencies(await currRes.json());

      // Theme
      const themeRes = await fetch("/api/v1/settings/theme", { credentials: "include" });
      if (themeRes.ok) {
        const themeData = await themeRes.json();
        if (themeData.accent_color) {
          setAccentColor(themeData.accent_color);
          applyAccentColor(themeData.accent_color);
        }
      }

      // Backups
      const backRes = await fetch("/api/v1/settings/backup/list", { credentials: "include" });
      if (backRes.ok) setBackups(await backRes.json());
    } catch {
      setStatusMsg({ type: "error", text: "Failed to connect to settings API." });
    } finally {
      setLoading(false);
    }
  };

  const applyAccentColor = (hex: string) => {
    document.documentElement.style.setProperty("--accent-primary", hex);
    document.documentElement.style.setProperty(
      "--accent-primary-hover",
      hex === "#ffffff" ? "#e2e8f0" : hex + "cc"
    );
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(company),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to save company profile.");
      setStatusMsg({ type: "success", text: "Company profile updated successfully." });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/settings/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newCurrency),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add currency.");

      setCurrencies((prev) => [...prev, data]);
      setNewCurrency({ code: "", symbol: "", name: "", is_base_currency: false });
      setShowAddCurrency(false);
      setStatusMsg({ type: "success", text: `Currency ${data.code} added.` });
      // Reload list in case base currency shifted
      const listRes = await fetch("/api/v1/settings/currencies", { credentials: "include" });
      if (listRes.ok) setCurrencies(await listRes.json());
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleUpdateCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCurrency) return;
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/v1/settings/currencies/${editingCurrency.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          symbol: editingCurrency.symbol,
          name: editingCurrency.name,
          is_base_currency: editingCurrency.is_base_currency,
          is_active: editingCurrency.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update currency.");

      setEditingCurrency(null);
      setStatusMsg({ type: "success", text: `Currency ${data.code} updated.` });
      const listRes = await fetch("/api/v1/settings/currencies", { credentials: "include" });
      if (listRes.ok) setCurrencies(await listRes.json());
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleDeleteCurrency = async (code: string) => {
    if (!confirm(`Delete currency ${code}?`)) return;
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/v1/settings/currencies/${code}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete currency.");
      setCurrencies((prev) => prev.filter((c) => c.code !== code));
      setStatusMsg({ type: "success", text: data.message });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleSetBaseCurrency = async (code: string) => {
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/v1/settings/currencies/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_base_currency: true }),
      });
      if (!res.ok) throw new Error("Failed to set base currency.");
      const listRes = await fetch("/api/v1/settings/currencies", { credentials: "include" });
      if (listRes.ok) setCurrencies(await listRes.json());
      setStatusMsg({ type: "success", text: `${code} is now the primary base currency.` });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleSelectAccent = async (hex: string) => {
    setAccentColor(hex);
    applyAccentColor(hex);
    try {
      await fetch("/api/v1/settings/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accent_color: hex, theme_mode: "dark" }),
      });
      setStatusMsg({ type: "success", text: "Accent color saved." });
    } catch {
      setStatusMsg({ type: "error", text: "Failed to persist accent color." });
    }
  };

  const handleCreateSnapshot = async () => {
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/settings/backup/create", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Backup failed.");
      setBackups((prev) => [data, ...prev]);
      setStatusMsg({ type: "success", text: `Snapshot created: ${data.filename}` });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleRestoreSnapshot = async (filename: string) => {
    if (!confirm(`Are you sure you want to restore "${filename}"? A safety backup will be taken first.`)) return;
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/v1/settings/backup/restore?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Restore failed.");
      setStatusMsg({ type: "success", text: data.message });
      // Reload backups to show pre-restore backup
      const backRes = await fetch("/api/v1/settings/backup/list", { credentials: "include" });
      if (backRes.ok) setBackups(await backRes.json());
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`Restore database from uploaded file "${file.name}"?`)) return;

    setStatusMsg(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/settings/backup/restore", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload restore failed.");
      setStatusMsg({ type: "success", text: data.message });
      loadAllSettings();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      e.target.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="finance-panel animate-fade-in"
        style={{
          width: "780px",
          maxWidth: "95vw",
          height: "560px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: 600, fontSize: "16px" }}>Workspace Settings</span>
          </div>
          <button onClick={onClose} className="finance-button-secondary" style={{ padding: "6px" }}>
            <X size={16} />
          </button>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div
            style={{
              padding: "10px 16px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: "1px solid var(--border-subtle)",
              background:
                statusMsg.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)",
              color: statusMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)",
            }}
          >
            {statusMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Modal Body with Sidebar Tabs - Fixed Static Height */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, height: "100%", overflow: "hidden" }}>
          {/* Tabs Sidebar */}
          <nav
            style={{
              width: "190px",
              flexShrink: 0,
              borderRight: "1px solid var(--border-subtle)",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              background: "var(--bg-surface-subtle)",
            }}
          >
            {[
              { id: "company", label: "Company Profile", icon: Building },
              { id: "currencies", label: "Currencies", icon: Coins },
              { id: "theme", label: "Accent Color", icon: Palette },
              { id: "backup", label: "Backup & Restore", icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setStatusMsg(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid",
                    borderColor: isActive ? "var(--border-strong)" : "transparent",
                    background: isActive ? "var(--bg-surface)" : "transparent",
                    color: isActive ? "var(--text-main)" : "var(--text-muted)",
                    fontSize: "13px",
                    fontWeight: isActive ? 500 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Tab Content Panel - Scrollable, constant boundary */}
          <div style={{ flex: 1, padding: "24px", overflowY: "auto", height: "100%", minHeight: 0 }}>
            {/* 1. COMPANY PROFILE TAB */}
            {activeTab === "company" && (
              <form onSubmit={handleSaveCompany} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Company & Billing Profile</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Used on invoices, tax returns, and client communications.
                  </p>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Company / Entity Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Tech Studio"
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    className="finance-input"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      Permanent Account Number (PAN)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ABCDE1234F"
                      value={company.pan}
                      onChange={(e) => setCompany({ ...company, pan: e.target.value.toUpperCase() })}
                      className="finance-input mono"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      GSTIN / Tax ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      value={company.gstin}
                      onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })}
                      className="finance-input mono"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      Official Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={company.phone}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                      className="finance-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      Official Email
                    </label>
                    <input
                      type="email"
                      placeholder="finance@acme.io"
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      className="finance-input"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Registered Address
                  </label>
                  <textarea
                    rows={3}
                    placeholder="123 Business Boulevard, Floor 4, Bengaluru, Karnataka 560001"
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                    className="finance-input"
                    style={{ resize: "vertical" }}
                  />
                </div>

                <button type="submit" className="finance-button-primary" style={{ alignSelf: "flex-start", width: "auto" }}>
                  Save Profile
                </button>
              </form>
            )}

            {/* 2. CURRENCIES TAB */}
            {activeTab === "currencies" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Active Currencies</h3>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Manage supported currencies and set primary base currency.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddCurrency(!showAddCurrency)}
                    className="finance-button-secondary"
                  >
                    <Plus size={14} />
                    <span>Add Currency</span>
                  </button>
                </div>

                {showAddCurrency && (
                  <form
                    onSubmit={handleAddCurrency}
                    style={{
                      background: "var(--bg-surface-subtle)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 600 }}>New Currency Details</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="Code (e.g. CAD)"
                        required
                        maxLength={5}
                        value={newCurrency.code}
                        onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                        className="finance-input mono"
                      />
                      <input
                        type="text"
                        placeholder="Symbol (e.g. $)"
                        required
                        maxLength={5}
                        value={newCurrency.symbol}
                        onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                        className="finance-input mono"
                      />
                      <input
                        type="text"
                        placeholder="Name (e.g. Canadian Dollar)"
                        required
                        value={newCurrency.name}
                        onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                        className="finance-input"
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={newCurrency.is_base_currency}
                          onChange={(e) => setNewCurrency({ ...newCurrency, is_base_currency: e.target.checked })}
                        />
                        <span>Make Base Currency</span>
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <button type="submit" className="finance-button-primary" style={{ width: "auto" }}>
                        Save Currency
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCurrency(false)}
                        className="finance-button-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {editingCurrency && (
                  <form
                    onSubmit={handleUpdateCurrency}
                    style={{
                      background: "var(--bg-surface-subtle)",
                      border: "1px solid var(--accent-primary, #ffffff)",
                      borderRadius: "var(--radius-sm)",
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600 }}>
                        Edit Currency: <span className="mono" style={{ color: "var(--accent-primary, #ffffff)" }}>{editingCurrency.code}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingCurrency(null)}
                        style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                          Symbol
                        </label>
                        <input
                          type="text"
                          placeholder="Symbol (e.g. $)"
                          required
                          maxLength={5}
                          value={editingCurrency.symbol}
                          onChange={(e) => setEditingCurrency({ ...editingCurrency, symbol: e.target.value })}
                          className="finance-input mono"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                          Name
                        </label>
                        <input
                          type="text"
                          placeholder="Name (e.g. US Dollar)"
                          required
                          value={editingCurrency.name}
                          onChange={(e) => setEditingCurrency({ ...editingCurrency, name: e.target.value })}
                          className="finance-input"
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "2px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editingCurrency.is_base_currency}
                          onChange={(e) => setEditingCurrency({ ...editingCurrency, is_base_currency: e.target.checked })}
                        />
                        <span>Make Base Currency</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editingCurrency.is_active}
                          onChange={(e) => setEditingCurrency({ ...editingCurrency, is_active: e.target.checked })}
                        />
                        <span>Active</span>
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <button type="submit" className="finance-button-primary" style={{ width: "auto" }}>
                        Update Currency
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCurrency(null)}
                        className="finance-button-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Currency Table */}
                <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-surface-subtle)", borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px", fontWeight: 500, color: "var(--text-dim)" }}>Code</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500, color: "var(--text-dim)" }}>Symbol</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500, color: "var(--text-dim)" }}>Name</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500, color: "var(--text-dim)" }}>Status</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500, color: "var(--text-dim)", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currencies.map((curr) => (
                        <tr key={curr.code} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }} className="mono">
                            {curr.code}
                            {curr.is_base_currency && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "var(--radius-xs)",
                                  background: "rgba(16, 185, 129, 0.15)",
                                  color: "var(--accent-emerald)",
                                  border: "1px solid var(--accent-emerald)",
                                }}
                              >
                                BASE
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px" }} className="mono">
                            {curr.symbol}
                          </td>
                          <td style={{ padding: "10px 12px" }}>{curr.name}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "var(--radius-xs)",
                                background: curr.is_active ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
                                color: curr.is_active ? "var(--accent-emerald)" : "var(--accent-rose)",
                              }}
                            >
                              {curr.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                              <button
                                onClick={() => setEditingCurrency(curr)}
                                className="finance-button-secondary"
                                style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                title={`Edit ${curr.code}`}
                              >
                                <Pencil size={11} />
                                <span>Edit</span>
                              </button>
                              {!curr.is_base_currency ? (
                                <>
                                  <button
                                    onClick={() => handleSetBaseCurrency(curr.code)}
                                    className="finance-button-secondary"
                                    style={{ padding: "4px 8px", fontSize: "11px" }}
                                    title="Make Primary Base Currency"
                                  >
                                    Make Base
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCurrency(curr.code)}
                                    className="finance-button-secondary"
                                    style={{ padding: "4px 6px", color: "var(--accent-rose)" }}
                                    title={`Delete ${curr.code}`}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text-dim)",
                                    padding: "4px 6px",
                                    fontStyle: "italic",
                                  }}
                                  title="Base currency cannot be deleted. Assign another base currency first."
                                >
                                  Primary Base
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. THEME & ACCENT COLOR TAB */}
            {activeTab === "theme" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Application Accent Color</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Select a color to tint primary controls, active badges, and focus rings.
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "8px" }}>Presets</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {PRESET_COLORS.map((preset) => {
                      const isSelected = accentColor.toLowerCase() === preset.hex.toLowerCase();
                      return (
                        <button
                          key={preset.name}
                          onClick={() => handleSelectAccent(preset.hex)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 12px",
                            border: `1px solid ${isSelected ? "var(--text-main)" : "var(--border-subtle)"}`,
                            borderRadius: "var(--radius-sm)",
                            background: "var(--bg-input)",
                            color: "var(--text-main)",
                            cursor: "pointer",
                            fontSize: "13px",
                          }}
                        >
                          <span
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              background: preset.hex,
                              border: "1px solid rgba(255,255,255,0.2)",
                            }}
                          />
                          <span>{preset.name}</span>
                          {isSelected && <Check size={13} style={{ color: "var(--accent-emerald)" }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Custom Hex Code
                  </label>
                  <div style={{ display: "flex", gap: "8px", maxWidth: "240px" }}>
                    <input
                      type="color"
                      value={accentColor.startsWith("#") ? accentColor : "#ffffff"}
                      onChange={(e) => handleSelectAccent(e.target.value)}
                      style={{
                        width: "38px",
                        height: "38px",
                        padding: 0,
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => handleSelectAccent(e.target.value)}
                      className="finance-input mono"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. DATABASE BACKUP & RESTORE TAB */}
            {activeTab === "backup" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Database Resilience & Snapshots</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    SQLite WAL snapshots, live binary export, and atomic restoration with pre-restore safety copies.
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <a
                    href="/api/v1/settings/backup/download"
                    download
                    className="finance-button-secondary"
                    style={{ textDecoration: "none" }}
                  >
                    <Download size={14} />
                    <span>Download Live Database</span>
                  </a>

                  <button onClick={handleCreateSnapshot} className="finance-button-primary" style={{ width: "auto" }}>
                    <Plus size={14} />
                    <span>Create Snapshot Now</span>
                  </button>

                  <label
                    className="finance-button-secondary"
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                  >
                    <Upload size={14} />
                    <span>Upload & Restore .db</span>
                    <input
                      type="file"
                      accept=".db,.sqlite"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "8px", textTransform: "uppercase" }}>
                    Saved Snapshots ({backups.length})
                  </div>
                  {backups.length === 0 ? (
                    <div style={{ fontSize: "13px", color: "var(--text-dim)", padding: "12px 0" }}>
                      No manual snapshots saved yet. Click "Create Snapshot Now" to record one.
                    </div>
                  ) : (
                    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "var(--bg-surface-subtle)", borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
                            <th style={{ padding: "8px 12px", color: "var(--text-dim)" }}>File</th>
                            <th style={{ padding: "8px 12px", color: "var(--text-dim)" }}>Size</th>
                            <th style={{ padding: "8px 12px", color: "var(--text-dim)" }}>Timestamp</th>
                            <th style={{ padding: "8px 12px", color: "var(--text-dim)", textAlign: "right" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backups.map((b) => (
                            <tr key={b.filename} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              <td style={{ padding: "8px 12px" }} className="mono">
                                {b.filename}
                              </td>
                              <td style={{ padding: "8px 12px" }} className="mono">
                                {b.size_display}
                              </td>
                              <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{b.created_at}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                <button
                                  onClick={() => handleRestoreSnapshot(b.filename)}
                                  className="finance-button-secondary"
                                  style={{ padding: "3px 8px", fontSize: "11px" }}
                                >
                                  <RefreshCw size={11} />
                                  <span>Restore</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
