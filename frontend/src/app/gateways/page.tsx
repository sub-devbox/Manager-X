"use client";

import React, { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import GatewayModal from "@/components/modules/gateways/GatewayModal";
import { GatewayData } from "@/types/gateway";
import { api } from "@/lib/api-client";
import {
  CreditCard,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  DollarSign,
} from "lucide-react";

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<GatewayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<GatewayData | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchGateways = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | boolean | undefined> = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (statusFilter === "active") params.is_active = true;
      if (statusFilter === "archived") params.is_active = false;

      const data = await api.get<GatewayData[]>("/gateways", { params });
      setGateways(data || []);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load payment gateways." });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const handleToggleStatus = async (gateway: GatewayData) => {
    if (!gateway.id) return;
    try {
      await api.patch(`/gateways/${gateway.id}/toggle-status`);
      setActionMsg({
        type: "success",
        text: `Gateway '${gateway.name}' is now ${gateway.is_active ? "Archived" : "Active"}.`,
      });
      fetchGateways();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to toggle gateway status." });
    }
  };

  const handleDelete = async (gateway: GatewayData) => {
    if (!gateway.id) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete payment gateway '${gateway.name}'?\n\nThis will remove the saved remittance instructions and metrics.`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/gateways/${gateway.id}`);
      setActionMsg({ type: "success", text: `Gateway '${gateway.name}' was deleted.` });
      fetchGateways();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Cannot delete payment gateway." });
    }
  };

  const openCreateModal = () => {
    setEditingGateway(null);
    setIsModalOpen(true);
  };

  const openEditModal = (gateway: GatewayData) => {
    setEditingGateway(gateway);
    setIsModalOpen(true);
  };

  // Aggregated KPIs
  const totalGateways = gateways.length;
  const activeGateways = gateways.filter((g) => g.is_active).length;
  const totalSettledINR = gateways.reduce((sum, g) => sum + (g.total_equivalent_inr || 0), 0);

  return (
    <AppShell title="Payment Gateways">
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Action / Error Banner */}
        {actionMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderRadius: "var(--radius-xs)",
              background:
                actionMsg.type === "success"
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(244, 63, 94, 0.1)",
              border: `1px solid ${
                actionMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)"
              }`,
              color: actionMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)",
              fontSize: "13px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {actionMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{actionMsg.text}</span>
            </div>
            <button
              onClick={() => setActionMsg(null)}
              style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        {/* Top Summary KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          <div className="finance-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(59, 130, 246, 0.12)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Gateways
              </div>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 700, marginTop: "2px" }}>
                {totalGateways}
              </div>
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Active Gateways
              </div>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 700, marginTop: "2px" }}>
                {activeGateways}
              </div>
            </div>
          </div>

          <div className="finance-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(245, 158, 11, 0.12)",
                color: "var(--accent-amber)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Settled (INR)
              </div>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 700, marginTop: "2px", color: "var(--accent-emerald)" }}>
                ₹{totalSettledINR.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Status Filter, and New Gateway Button */}
        <div
          className="finance-panel"
          style={{
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", width: "320px", maxWidth: "100%" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gateways, currency, or notes..."
              className="finance-input"
              style={{ paddingLeft: "32px", height: "34px", fontSize: "13px" }}
            />
          </div>

          {/* Status Tabs & Action Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                background: "var(--bg-surface-subtle)",
                padding: "2px",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {(["all", "active", "archived"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  style={{
                    background: statusFilter === tab ? "var(--bg-surface)" : "transparent",
                    color: statusFilter === tab ? "var(--text-main)" : "var(--text-dim)",
                    border: "none",
                    borderRadius: "var(--radius-xs)",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button onClick={openCreateModal} className="finance-button-primary" style={{ width: "auto" }}>
              <Plus size={15} />
              <span>New Gateway</span>
            </button>
          </div>
        </div>

        {/* Gateways Grid */}
        {loading ? (
          <div
            className="finance-panel"
            style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}
          >
            <span className="mono">Loading payment gateways...</span>
          </div>
        ) : gateways.length === 0 ? (
          <div
            className="finance-panel"
            style={{
              padding: "56px 24px",
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
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-xs)",
                background: "var(--bg-surface-subtle)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-dim)",
              }}
            >
              <CreditCard size={24} />
            </div>
            <div style={{ fontSize: "15px", fontWeight: 600 }}>No Gateways Found</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "380px" }}>
              {searchQuery
                ? `No gateways match "${searchQuery}".`
                : "No payment gateways registered yet. Add your settlement gateways to automatically populate invoice remittance instructions."}
            </div>
            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="finance-button-primary"
                style={{ width: "auto", marginTop: "6px" }}
              >
                <Plus size={15} />
                <span>Add Payment Gateway</span>
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "14px",
            }}
          >
            {gateways.map((gw) => (
              <div
                key={gw.id}
                className="finance-panel"
                style={{
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                  opacity: gw.is_active ? 1 : 0.65,
                }}
              >
                {/* Gateway Card Header */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.2px", margin: 0, color: "var(--text-main)" }}>
                        {gw.name}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "var(--radius-xs)",
                            background: "var(--bg-surface-subtle)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-dim)",
                          }}
                        >
                          {gw.currency_code}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-xs)",
                        background: gw.is_active
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(100, 116, 139, 0.12)",
                        color: gw.is_active ? "var(--accent-emerald)" : "var(--text-dim)",
                        border: `1px solid ${
                          gw.is_active ? "rgba(16, 185, 129, 0.25)" : "var(--border-subtle)"
                        }`,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {gw.is_active ? "Active" : "Archived"}
                    </span>
                  </div>

                  {/* Financial Metrics Strip */}
                  <div
                    style={{
                      marginTop: "12px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "8px",
                      padding: "10px 12px",
                      background: "var(--bg-surface-subtle)",
                      borderRadius: "var(--radius-xs)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                        Incoming
                      </div>
                      <div className="mono" style={{ fontSize: "12px", fontWeight: 700, marginTop: "2px" }}>
                        {gw.currency_code} {gw.total_incoming_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                        Equiv. INR
                      </div>
                      <div className="mono" style={{ fontSize: "12px", fontWeight: 700, marginTop: "2px", color: "var(--accent-emerald)" }}>
                        ₹{gw.total_equivalent_inr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                        Avg Rate
                      </div>
                      <div className="mono" style={{ fontSize: "12px", fontWeight: 700, marginTop: "2px", color: "var(--accent-blue)" }}>
                        ₹{gw.average_rate.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Multiline Gateway Note Preview */}
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>
                        Payment Instructions / Note:
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                        Used on Invoice Sheet
                      </span>
                    </div>
                    <div
                      className="mono"
                      style={{
                        background: "var(--bg-surface-subtle)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-xs)",
                        padding: "8px 10px",
                        fontSize: "11px",
                        lineHeight: "1.4",
                        color: "var(--text-main)",
                        whiteSpace: "pre-wrap",
                        maxHeight: "95px",
                        overflowY: "auto",
                      }}
                    >
                      {gw.gateway_note || "No custom note provided."}
                    </div>
                  </div>
                </div>

                {/* Card Actions Bar */}
                <div
                  style={{
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={() => handleToggleStatus(gw)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-dim)",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                    }}
                  >
                    {gw.is_active ? "Archive Gateway" : "Activate Gateway"}
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => openEditModal(gw)}
                      className="finance-button-secondary"
                      style={{ height: "30px", padding: "0 10px", fontSize: "12px", gap: "4px" }}
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(gw)}
                      className="finance-button-secondary"
                      style={{
                        height: "30px",
                        width: "30px",
                        padding: 0,
                        justifyContent: "center",
                        color: "var(--accent-rose)",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gateway Add / Edit Modal */}
        <GatewayModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchGateways}
          initialData={editingGateway}
        />
      </div>
    </AppShell>
  );
}
