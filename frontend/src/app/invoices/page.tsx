"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import InvoiceTable from "@/components/modules/invoices/InvoiceTable";
import InvoiceModal from "@/components/modules/invoices/InvoiceModal";
import SearchableClientSelect from "@/components/common/SearchableClientSelect";
import { api } from "@/lib/api-client";
import { InvoiceData } from "@/types/invoice";
import { ClientData } from "@/types/client";
import {
  FileText,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Period & Filter State (Default: this_month, matching tasks/projects/time-tracker)
  const [periodFilter, setPeriodFilter] = useState<"today" | "this_week" | "this_month" | "custom">("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, clientData] = await Promise.all([
        api.get<InvoiceData[]>("/invoices"),
        api.get<ClientData[]>("/clients"),
      ]);
      setInvoices(Array.isArray(invData) ? invData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load invoice records." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unique currencies available in records
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((i) => {
      if (i.currency_code) set.add(i.currency_code.toUpperCase());
    });
    clients.forEach((c) => {
      if (c.currency_code) set.add(c.currency_code.toUpperCase());
    });
    if (set.size === 0) set.add("USD");
    return Array.from(set).sort();
  }, [invoices, clients]);

  // Invoice Actions
  const handleOpenNewInvoice = () => {
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const handleOpenEditInvoice = (inv: InvoiceData) => {
    setEditingInvoice(inv);
    setIsModalOpen(true);
  };

  const handleDeleteInvoice = async (inv: InvoiceData) => {
    setActionMsg(null);
    try {
      await api.delete(`/invoices/${inv.id}`);
      setActionMsg({ type: "success", text: `Invoice ${inv.invoice_number} deleted.` });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to delete invoice." });
      throw err;
    }
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Monday of this week in local time
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek - 1));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);

    // First and last day of this month in local time
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return invoices.filter((inv) => {
      // 1. Period filter on issue_date
      const invDateStr = inv.issue_date || "";
      const invDate = invDateStr ? new Date(invDateStr) : null;
      let matchesPeriod = true;

      if (periodFilter === "today") {
        matchesPeriod = invDateStr === todayStr;
      } else if (periodFilter === "this_week") {
        if (!invDate) matchesPeriod = true;
        else matchesPeriod = invDate >= monday && invDate <= sunday;
      } else if (periodFilter === "this_month") {
        if (!invDate) matchesPeriod = true;
        else matchesPeriod = invDate >= firstOfMonth && invDate <= lastOfMonth;
      } else if (periodFilter === "custom") {
        if (!invDateStr) matchesPeriod = true;
        else {
          const afterStart = !customStartDate || invDateStr >= customStartDate;
          const beforeEnd = !customEndDate || invDateStr <= customEndDate;
          matchesPeriod = afterStart && beforeEnd;
        }
      }

      if (!matchesPeriod) return false;

      // 2. Client filter
      if (clientFilter !== "all" && inv.client_id !== clientFilter) {
        return false;
      }

      // 3. Search query
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesQuery =
          inv.invoice_number.toLowerCase().includes(q) ||
          (inv.client?.company_name && inv.client.company_name.toLowerCase().includes(q)) ||
          String(inv.final_amount).includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [invoices, periodFilter, customStartDate, customEndDate, clientFilter, searchQuery]);

  // Aggregate KPI Stats grouped by currency
  const {
    invoicedByCurrency,
    pendingByCurrency,
    paidByCurrency,
    pendingCount,
    paidCount,
    monthInvoiceCount,
  } = useMemo(() => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const invMonth: Record<string, number> = {};
    const pend: Record<string, number> = {};
    const paid: Record<string, number> = {};
    let pendC = 0;
    let paidC = 0;
    let monthC = 0;

    const baseInvoices = invoices.filter((inv) => {
      if (clientFilter !== "all" && inv.client_id !== clientFilter) return false;
      return true;
    });

    for (const inv of baseInvoices) {
      const invDate = inv.issue_date ? new Date(inv.issue_date) : null;
      const isThisMonth = invDate ? invDate >= firstOfMonth && invDate <= lastOfMonth : false;
      const curr = (inv.currency_code || "USD").toUpperCase();

      if (isThisMonth) {
        invMonth[curr] = (invMonth[curr] || 0) + inv.final_amount;
        monthC += 1;
      }

      if (inv.status === "paid") {
        if (isThisMonth) {
          paid[curr] = (paid[curr] || 0) + inv.final_amount;
          paidC += 1;
        }
      } else if (inv.status === "sent" || inv.status === "draft" || inv.status === "overdue") {
        pend[curr] = (pend[curr] || 0) + inv.final_amount;
        pendC += 1;
      }
    }

    return {
      invoicedByCurrency: invMonth,
      pendingByCurrency: pend,
      paidByCurrency: paid,
      pendingCount: pendC,
      paidCount: paidC,
      monthInvoiceCount: monthC,
    };
  }, [invoices, clientFilter]);

  const formatCurrencyWithSymbol = (amount: number, currency: string = "USD") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      const symbol =
        currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "INR" ? "₹" : currency === "EUR" ? "€" : "";
      return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const renderCurrencyList = (
    currencyMap: Record<string, number>,
    color: string,
    emptyLabel: string = "0.00"
  ) => {
    const entries = Object.entries(currencyMap).filter(([, amt]) => amt > 0);
    if (entries.length === 0) {
      return (
        <div className="mono" style={{ fontSize: "18px", fontWeight: 700, color }}>
          {emptyLabel}
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {entries.map(([curr, amt]) => (
          <div key={curr} style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span
              className="mono"
              style={{
                fontSize: entries.length > 1 ? "15px" : "18px",
                fontWeight: 700,
                color,
              }}
            >
              {formatCurrencyWithSymbol(amt, curr)}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: "4px",
                background: "var(--bg-surface-subtle)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              {curr}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppShell title="Invoices">
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Action Status Toast */}
        {actionMsg && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background:
                actionMsg.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)",
              border: `1px solid ${
                actionMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)"
              }`,
              color: actionMsg.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)",
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
              &times;
            </button>
          </div>
        )}

        {/* Top Control Panel (matching tasks and projects sheets presentation) */}
        <div
          className="finance-panel"
          style={{
            padding: "16px 20px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Billing &amp; Receivables
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                Invoices Sheet
              </span>
              <span
                className="mono"
                style={{
                  fontSize: "11px",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  background: "var(--bg-surface-subtle)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-dim)",
                }}
              >
                {invoices.length} total
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleOpenNewInvoice}
              className="finance-button-primary"
              style={{ height: "36px", padding: "0 16px", gap: "8px", fontWeight: 600, width: "auto" }}
            >
              <Plus size={13} />
              <span>Create Invoice</span>
            </button>
          </div>
        </div>

        {/* Stats KPI Summary Bar (differentiated by currency) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "12px",
          }}
        >
          <div
            className="finance-panel"
            style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: "12px" }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(59, 130, 246, 0.12)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileText size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, marginBottom: "4px" }}>
                Invoiced This Month
              </div>
              {renderCurrencyList(invoicedByCurrency, "var(--text-main)")}
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                {monthInvoiceCount} {monthInvoiceCount === 1 ? "invoice" : "invoices"}
              </div>
            </div>
          </div>

          <div
            className="finance-panel"
            style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: "12px" }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(245, 158, 11, 0.12)",
                color: "var(--accent-amber)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Clock size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, marginBottom: "4px" }}>
                Pending Receivables
              </div>
              {renderCurrencyList(pendingByCurrency, "var(--accent-amber)")}
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                {pendingCount} open {pendingCount === 1 ? "invoice" : "invoices"}
              </div>
            </div>
          </div>

          <div
            className="finance-panel"
            style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: "12px" }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, marginBottom: "4px" }}>
                Paid / Settled This Month
              </div>
              {renderCurrencyList(paidByCurrency, "var(--accent-emerald)")}
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                {paidCount} settled {paidCount === 1 ? "invoice" : "invoices"}
              </div>
            </div>
          </div>
        </div>

        {/* Period Filter Tabs & Search Controls (matching tasks/projects) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Quick Period Selector (Left) */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--bg-surface-subtle)",
                padding: "3px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "this_week", label: "This week" },
                  { id: "this_month", label: "This month" },
                  { id: "custom", label: "Custom" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPeriodFilter(tab.id)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: periodFilter === tab.id ? 600 : 400,
                    color: periodFilter === tab.id ? "var(--text-main)" : "var(--text-dim)",
                    background: periodFilter === tab.id ? "var(--bg-surface)" : "transparent",
                    border:
                      periodFilter === tab.id
                        ? "1px solid var(--border-subtle)"
                        : "1px solid transparent",
                    borderRadius: "var(--radius-xs)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker */}
            {periodFilter === "custom" && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "var(--bg-surface-subtle)",
                  padding: "3px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "12px",
                }}
              >
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="finance-input"
                  style={{ height: "26px", fontSize: "11.5px", padding: "0 6px" }}
                  title="Start Date"
                />
                <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="finance-input"
                  style={{ height: "26px", fontSize: "11.5px", padding: "0 6px" }}
                  title="End Date"
                />
              </div>
            )}
          </div>

          {/* Search & Client Filter (Right) */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <SearchableClientSelect
              clients={clients}
              value={clientFilter}
              onChange={setClientFilter}
              placeholder="All Clients"
              width="180px"
            />

            <div style={{ position: "relative", width: "240px" }}>
              <Search
                size={14}
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
                placeholder="Search invoice #, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finance-input"
                style={{ paddingLeft: "30px", width: "100%", height: "32px", fontSize: "12px" }}
              />
            </div>

            {(searchQuery || clientFilter !== "all" || periodFilter !== "this_month") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setClientFilter("all");
                  setPeriodFilter("this_month");
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="finance-button-secondary"
                style={{ padding: "0 10px", height: "32px", fontSize: "12px", whiteSpace: "nowrap" }}
                title="Reset filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* View Content: Tabular Invoices Sheet */}
        <InvoiceTable
          invoices={filteredInvoices}
          onSelectInvoice={handleOpenEditInvoice}
          onEditInvoice={handleOpenEditInvoice}
          onInvoiceUpdated={fetchData}
        />

        {/* 2-Split Screen Modal (User Input + Real-time Letter Preview) */}
        <InvoiceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
          onDelete={handleDeleteInvoice}
          initialData={editingInvoice}
          clients={clients}
        />
      </div>
    </AppShell>
  );
}
