"use client";

import React, { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import ClientModal, { ClientData } from "@/components/modules/clients/ClientModal";
import { api } from "@/lib/api-client";
import {
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  FileText,
  TrendingUp,
} from "lucide-react";

interface CurrencySetting {
  code: string;
  symbol: string;
  name: string;
  is_base_currency?: boolean;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<CurrencySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const baseCurrCode = baseCurrency?.code || "INR";
  const baseCurrSymbol = baseCurrency?.symbol || "₹";
  const totalSettledRevenue = clients.reduce((acc, c) => acc + (c.total_equivalent_inr || 0), 0);
  const activeClientsCount = clients.filter((c) => c.is_active).length;

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | boolean | undefined> = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (statusFilter === "active") params.is_active = true;
      if (statusFilter === "archived") params.is_active = false;

      const [clientsRes, currRes] = await Promise.allSettled([
        api.get<ClientData[]>("/clients", { params }),
        api.get<CurrencySetting[]>("/settings/currencies"),
      ]);

      if (clientsRes.status === "fulfilled") {
        setClients(clientsRes.value || []);
      }
      if (currRes.status === "fulfilled" && Array.isArray(currRes.value)) {
        const base = currRes.value.find((c) => c.is_base_currency) || currRes.value[0];
        if (base) setBaseCurrency(base);
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load clients." });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleToggleStatus = async (client: ClientData) => {
    if (!client.id) return;
    try {
      await api.patch(`/clients/${client.id}/toggle-status`);
      setActionMsg({
        type: "success",
        text: `Client '${client.company_name}' is now ${client.is_active ? "Archived" : "Active"}.`,
      });
      fetchClients();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to toggle status." });
    }
  };

  const handleDelete = async (client: ClientData) => {
    if (!client.id) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete '${client.company_name}'?\n\nNote: If this client is referenced in any projects or invoices, deletion will be safely blocked.`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/clients/${client.id}`);
      setActionMsg({ type: "success", text: `Client '${client.company_name}' was deleted.` });
      fetchClients();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Cannot delete client." });
    }
  };

  const openCreateModal = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const openEditModal = (client: ClientData) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  return (
    <AppShell title="Client Directory">
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Feedback Message */}
        {actionMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background:
                actionMsg.type === "success"
                  ? "rgba(16, 185, 129, 0.08)"
                  : "rgba(244, 63, 94, 0.08)",
              border: `1px solid ${
                actionMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)"
              }`,
              color:
                actionMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)",
              fontSize: "13px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {actionMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{actionMsg.text}</span>
            </div>
            <button
              onClick={() => setActionMsg(null)}
              style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Top Summary Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          <div
            className="finance-panel"
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(59, 130, 246, 0.1)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Clients
              </div>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 700, marginTop: "2px" }}>
                {clients.length} <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--text-dim)" }}>({activeClientsCount} active)</span>
              </div>
            </div>
          </div>

          <div
            className="finance-panel"
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(16, 185, 129, 0.1)",
                color: "var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Revenue Settled ({baseCurrCode})
              </div>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 700, marginTop: "2px", color: "var(--accent-emerald)" }}>
                {baseCurrSymbol}{totalSettledRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Top Control Bar */}
        <div
          className="finance-panel"
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Search Input */}
          <div style={{ position: "relative", minWidth: "260px", flex: 1, maxWidth: "420px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
              }}
            />
            <input
              type="text"
              placeholder="Search by company, contact person, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="finance-input"
              style={{ paddingLeft: "36px" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Status Filter Tabs */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "2px",
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

            {/* Create Client Button */}
            <button onClick={openCreateModal} className="finance-button-primary" style={{ width: "auto" }}>
              <Plus size={15} />
              <span>New Client</span>
            </button>
          </div>
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div
            className="finance-panel"
            style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}
          >
            <span className="mono">Loading client directory...</span>
          </div>
        ) : clients.length === 0 ? (
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
              <Building2 size={24} />
            </div>
            <div style={{ fontSize: "15px", fontWeight: 600 }}>No Clients Found</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "360px" }}>
              {searchQuery
                ? `No clients match the search term "${searchQuery}".`
                : "No clients registered yet. Register your first client to start assigning projects and issuing invoices."}
            </div>
            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="finance-button-primary"
                style={{ width: "auto", marginTop: "6px" }}
              >
                <Plus size={15} />
                <span>Register Client</span>
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
            {clients.map((client) => (
              <div
                key={client.id}
                className="finance-panel"
                style={{
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                  opacity: client.is_active ? 1 : 0.65,
                }}
              >
                {/* Client Card Header */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "6px",
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.2px", margin: 0 }}>
                        {client.company_name}
                      </h3>
                      <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                        Contact: <span style={{ color: "var(--text-main)" }}>{client.contact_person}</span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-xs)",
                        background: client.is_active
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(100, 116, 139, 0.12)",
                        color: client.is_active ? "var(--accent-emerald)" : "var(--text-dim)",
                        border: `1px solid ${
                          client.is_active ? "rgba(16, 185, 129, 0.25)" : "var(--border-subtle)"
                        }`,
                        fontWeight: 500,
                        textTransform: "uppercase",
                      }}
                    >
                      {client.is_active ? "Active" : "Archived"}
                    </span>
                  </div>

                  {/* Tax ID if provided */}
                  {client.tax_id && (
                    <div style={{ marginTop: "4px" }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: "11px",
                          color: "var(--text-dim)",
                          background: "var(--bg-surface-subtle)",
                          padding: "2px 6px",
                          borderRadius: "var(--radius-xs)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        Tax ID: {client.tax_id}
                      </span>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Mail size={13} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {client.email}
                      </span>
                    </div>

                    {client.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Phone size={13} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span>{client.phone}</span>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <MapPin size={13} style={{ color: "var(--text-dim)", flexShrink: 0, marginTop: "2px" }} />
                      <span style={{ lineHeight: "1.3" }}>
                        {client.address_line1}
                        {client.address_line2 ? `, ${client.address_line2}` : ""}
                        <br />
                        {client.city}, {client.state} {client.postal_code}, {client.country}
                      </span>
                    </div>
                  </div>

                  {/* Revenue Auto-Calculated Metrics Strip: Total Incoming Currency | Total Equiv INR */}
                  <div
                    style={{
                      marginTop: "12px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      padding: "10px 12px",
                      background: "var(--bg-surface-subtle)",
                      borderRadius: "var(--radius-xs)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                        Total Incoming
                      </div>
                      <div className="mono" style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>
                        {client.currency_code} {(client.total_incoming_amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                        Equiv. {baseCurrCode}
                      </div>
                      <div className="mono" style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px", color: "var(--accent-emerald)" }}>
                        {baseCurrSymbol}{(client.total_equivalent_inr ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commercial Terms & Actions Bar */}
                <div
                  style={{
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                      Terms & Rate
                    </span>
                    <span className="mono" style={{ fontSize: "13px", fontWeight: 600, marginTop: "2px" }}>
                      {client.currency_code} {client.hourly_rate.toFixed(2)}/hr · Net {client.payment_terms_days}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      onClick={() => handleToggleStatus(client)}
                      className="finance-button-secondary"
                      style={{ padding: "6px 8px" }}
                      title={client.is_active ? "Archive Client" : "Re-activate Client"}
                    >
                      {client.is_active ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                    </button>

                    <button
                      onClick={() => openEditModal(client)}
                      className="finance-button-secondary"
                      style={{ padding: "6px 8px" }}
                      title="Edit Client Details"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      onClick={() => handleDelete(client)}
                      className="finance-button-secondary"
                      style={{ padding: "6px 8px", color: "var(--accent-rose)" }}
                      title="Delete Client"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Client Modal */}
        <ClientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchClients}
          initialData={editingClient}
        />
      </div>
    </AppShell>
  );
}
