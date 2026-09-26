"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api-client";
import { ProjectData, ProjectBillingType, ProjectStatus } from "@/types/project";
import {
  X,
  FolderKanban,
  Building2,
  DollarSign,
  Calendar,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";

interface ClientOption {
  id: string;
  company_name: string;
  hourly_rate: number;
  currency_code: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ProjectData | null;
  defaultClientId?: string;
}

export default function ProjectModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  defaultClientId,
}: ProjectModalProps) {
  const [mounted, setMounted] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    description: "",
    billing_type: "hourly" as ProjectBillingType,
    hourly_rate: 0,
    budget_amount: 0,
    status: "active" as ProjectStatus,
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load clients and initialize form
  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      loadClients();

      if (initialData) {
        setFormData({
          name: initialData.name,
          client_id: initialData.client_id,
          description: initialData.description || "",
          billing_type: initialData.billing_type,
          hourly_rate: initialData.hourly_rate || 0,
          budget_amount: initialData.budget_amount || 0,
          status: initialData.status,
          start_date: initialData.start_date || "",
          end_date: initialData.end_date || "",
        });
      } else {
        setFormData({
          name: "",
          client_id: defaultClientId || "",
          description: "",
          billing_type: "hourly",
          hourly_rate: 0,
          budget_amount: 0,
          status: "active",
          start_date: new Date().toISOString().split("T")[0],
          end_date: "",
        });
      }
    }
  }, [isOpen, initialData, defaultClientId]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const data = await api.get<any[]>("/clients?is_active=true");
      if (Array.isArray(data)) {
        setClients(data);
        if (!initialData && !formData.client_id && data.length > 0) {
          const selected = data[0];
          setFormData((prev) => ({
            ...prev,
            client_id: selected.id,
            hourly_rate: selected.hourly_rate || 0,
          }));
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoadingClients(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    const selected = clients.find((c) => c.id === clientId);
    setFormData((prev) => ({
      ...prev,
      client_id: clientId,
      hourly_rate: selected && prev.hourly_rate === 0 ? selected.hourly_rate : prev.hourly_rate,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Project name is required.");
      return;
    }
    if (!formData.client_id) {
      setErrorMsg("Please select a client for this project.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        client_id: formData.client_id,
        description: formData.description.trim() || null,
        billing_type: formData.billing_type,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      if (formData.billing_type === "hourly") {
        payload.hourly_rate = Number(formData.hourly_rate) || 0;
        payload.budget_amount = null;
      } else if (formData.billing_type === "fixed") {
        payload.budget_amount = Number(formData.budget_amount) || 0;
        payload.hourly_rate = null;
      } else {
        payload.hourly_rate = 0;
        payload.budget_amount = null;
      }

      if (initialData) {
        await api.put(`/projects/${initialData.id}`, payload);
      } else {
        await api.post("/projects", payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save project.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="finance-panel animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Pinned Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FolderKanban size={18} style={{ color: "var(--accent-blue)" }} />
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0, letterSpacing: "-0.2px" }}>
              {initialData ? "Edit Project" : "Create New Project"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="finance-button-secondary"
            style={{ padding: "6px" }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid var(--accent-rose)",
                color: "var(--accent-rose)",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Project Name <span style={{ color: "var(--accent-rose)" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Next-Gen Mobile App / AI Analytics Engine"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="finance-input"
              autoFocus
            />
          </div>

          {/* Client Selection */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Client / Account <span style={{ color: "var(--accent-rose)" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <select
                required
                value={formData.client_id}
                onChange={(e) => handleClientChange(e.target.value)}
                className="finance-input"
                style={{ appearance: "none", cursor: "pointer", paddingRight: "30px" }}
                disabled={loadingClients}
              >
                {clients.length === 0 ? (
                  <option value="">No clients found — register client first</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.currency_code})
                    </option>
                  ))
                )}
              </select>
              <Building2
                size={14}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--text-dim)",
                }}
              />
            </div>
          </div>

          {/* Billing Type & Commercials */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Billing Model
              </label>
              <select
                value={formData.billing_type}
                onChange={(e) =>
                  setFormData({ ...formData, billing_type: e.target.value as ProjectBillingType })
                }
                className="finance-input"
              >
                <option value="hourly">Hourly Rate</option>
                <option value="fixed">Fixed Price Budget</option>
                <option value="internal">Internal / Non-Billable</option>
              </select>
            </div>

            {formData.billing_type === "hourly" ? (
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Hourly Rate
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                  className="finance-input mono"
                />
              </div>
            ) : formData.billing_type === "fixed" ? (
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Fixed Budget Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData({ ...formData, budget_amount: parseFloat(e.target.value) || 0 })}
                  className="finance-input mono"
                />
              </div>
            ) : (
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-dim)", marginBottom: "4px" }}>
                  Internal Project
                </label>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", paddingTop: "8px" }}>
                  No billing tracking
                </div>
              </div>
            )}
          </div>

          {/* Project Status */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Project Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
              className="finance-input"
            >
              <option value="active">Active (Ongoing)</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Dates: Start & End */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="finance-input mono"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Target End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="finance-input mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Description & Scope
            </label>
            <textarea
              rows={3}
              placeholder="Outline project goals, deliverables, milestone criteria..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="finance-input"
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border-subtle)",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="finance-button-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="finance-button-primary"
              disabled={submitting}
              style={{ width: "auto", minWidth: "120px" }}
            >
              {submitting ? "Saving..." : initialData ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
