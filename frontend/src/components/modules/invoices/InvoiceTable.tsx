"use client";

import React, { useState, useMemo, useEffect } from "react";
import { InvoiceData } from "@/types/invoice";
import { useResizableColumns, ResizeHandle } from "@/hooks/useResizableColumns";
import { api } from "@/lib/api-client";
import {
  Calendar,
  Building2,
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  DollarSign,
  Download,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  X,
  Phone,
} from "lucide-react";

interface InvoiceTableProps {
  invoices: InvoiceData[];
  onSelectInvoice: (invoice: InvoiceData) => void;
  onEditInvoice: (invoice: InvoiceData) => void;
  onInvoiceUpdated?: () => void;
}

type SortField = "invoice_date" | "invoice_number" | "client" | "status" | "amount";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

const DEFAULT_INVOICE_WIDTHS = {
  invoice_date: 120,
  invoice_number: 180,
  client: 170,
  status: 125,
  amount: 155,
  actions: 180,
};

const MIN_INVOICE_WIDTHS = {
  invoice_date: 90,
  invoice_number: 130,
  client: 110,
  status: 90,
  amount: 100,
  actions: 145,
};

export default function InvoiceTable({
  invoices,
  onSelectInvoice,
  onEditInvoice,
  onInvoiceUpdated,
}: InvoiceTableProps) {
  const [sortField, setSortField] = useState<SortField>("invoice_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Record Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<InvoiceData | null>(null);
  const [payAmountInr, setPayAmountInr] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payRef, setPayRef] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState("");

  const { widths, totalWidth, startResize } = useResizableColumns(
    "mx_col_widths_invoices",
    DEFAULT_INVOICE_WIDTHS,
    MIN_INVOICE_WIDTHS
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "invoice_date":
          comparison = (a.issue_date || "").localeCompare(b.issue_date || "");
          break;
        case "invoice_number":
          comparison = a.invoice_number.localeCompare(b.invoice_number, undefined, { sensitivity: "base" });
          break;
        case "client": {
          const clientA = a.client?.company_name || "";
          const clientB = b.client?.company_name || "";
          comparison = clientA.localeCompare(clientB, undefined, { sensitivity: "base" });
          break;
        }
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "amount":
          comparison = a.final_amount - b.final_amount;
          break;
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [invoices, sortField, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [invoices.length]);

  const totalItems = sortedInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const currentBatch = sortedInvoices.slice(startIndex, endIndex);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.35, marginLeft: "4px" }} />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp size={12} style={{ color: "var(--accent-blue)", marginLeft: "4px" }} />
    ) : (
      <ArrowDown size={12} style={{ color: "var(--accent-blue)", marginLeft: "4px" }} />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return {
          bg: "rgba(16, 185, 129, 0.12)",
          color: "var(--accent-emerald)",
          label: "Paid",
        };
      case "sent":
        return {
          bg: "rgba(59, 130, 246, 0.12)",
          color: "var(--accent-blue)",
          label: "Sent",
        };
      case "overdue":
        return {
          bg: "rgba(244, 63, 94, 0.12)",
          color: "var(--accent-rose)",
          label: "Overdue",
        };
      case "void":
        return {
          bg: "rgba(100, 116, 139, 0.12)",
          color: "var(--text-dim)",
          label: "Void",
        };
      case "draft":
      default:
        return {
          bg: "rgba(245, 158, 11, 0.12)",
          color: "var(--accent-amber)",
          label: "Draft",
        };
    }
  };

  const formatCurrency = (amount: number, currencyCode: string = "USD") => {
    const code = (currencyCode || "USD").toUpperCase();
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
      }).format(amount);
    } catch {
      const symbol =
        code === "USD" ? "$" : code === "INR" ? "₹" : code === "EUR" ? "€" : code === "GBP" ? "£" : "";
      return `${symbol}${amount.toFixed(2)}`;
    }
  };

  const handleDownloadPdf = async (inv: InvoiceData, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/invoices/${inv.id}/pdf`);
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoice_number || "Invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("PDF download failed:", err);
    }
  };

  // Open Record Payment Modal
  const handleOpenPayModal = (inv: InvoiceData) => {
    setPayingInvoice(inv);
    setPayAmountInr(
      inv.received_amount_inr
        ? String(inv.received_amount_inr)
        : (inv.currency_code === "INR" ? String(inv.final_amount) : "")
    );
    setPayDate(inv.payment_date || new Date().toISOString().slice(0, 10));
    setPayRef("");
    setPayError("");
    setPayModalOpen(true);
  };

  // Submit Payment
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    const inrVal = parseFloat(payAmountInr);
    if (isNaN(inrVal) || inrVal < 0) {
      setPayError("Please enter a valid equivalent INR amount received in bank account.");
      return;
    }
    setPaySubmitting(true);
    setPayError("");
    try {
      await api.post(`/invoices/${payingInvoice.id}/pay`, {
        received_amount_inr: inrVal,
        payment_date: payDate || new Date().toISOString().slice(0, 10),
        bank_reference: payRef.trim() || undefined,
      });
      setPayModalOpen(false);
      setPayingInvoice(null);
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      setPayError(err.message || "Failed to record payment.");
    } finally {
      setPaySubmitting(false);
    }
  };

  // Undo Payment
  const [undoSubmittingId, setUndoSubmittingId] = useState<string | null>(null);

  const handleUndoPaid = async (inv: InvoiceData) => {
    if (
      !window.confirm(
        `Undo paid status for invoice "${inv.invoice_number || "this invoice"}"?\n\nThis will reset status to Sent and remove recorded payment details.`
      )
    ) {
      return;
    }
    setUndoSubmittingId(inv.id);
    try {
      await api.post(`/invoices/${inv.id}/unpay`);
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to undo payment.");
    } finally {
      setUndoSubmittingId(null);
    }
  };

  if (invoices.length === 0) {
    return (
      <div
        className="finance-panel"
        style={{
          padding: "48px 20px",
          textAlign: "center",
          background: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-xs)",
            background: "var(--bg-surface-subtle)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-dim)",
          }}
        >
          <FileText size={20} />
        </div>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>
          No invoices found matching the selected period or filters.
        </div>
      </div>
    );
  }

  return (
    <div
      className="finance-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto", width: "100%" }}>
        <table
          className="finance-table"
          style={{
            width: totalWidth ? `${totalWidth}px` : "100%",
            minWidth: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-surface-subtle)",
                height: "34px",
                textAlign: "left",
                userSelect: "none",
              }}
            >
              {/* 1. Invoice Date */}
              <th
                onClick={() => handleSort("invoice_date")}
                style={{
                  position: "relative",
                  width: `${widths.invoice_date}px`,
                  minWidth: `${MIN_INVOICE_WIDTHS.invoice_date}px`,
                  padding: "6px 14px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Invoice Date</span>
                  {renderSortIndicator("invoice_date")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("invoice_date", e)} />
              </th>

              {/* 2. Invoice # */}
              <th
                onClick={() => handleSort("invoice_number")}
                style={{
                  position: "relative",
                  width: `${widths.invoice_number}px`,
                  minWidth: `${MIN_INVOICE_WIDTHS.invoice_number}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Invoice #</span>
                  {renderSortIndicator("invoice_number")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("invoice_number", e)} />
              </th>

              {/* 3. Client */}
              <th
                onClick={() => handleSort("client")}
                style={{
                  position: "relative",
                  width: `${widths.client}px`,
                  minWidth: `${MIN_INVOICE_WIDTHS.client}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Client</span>
                  {renderSortIndicator("client")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("client", e)} />
              </th>

              {/* 4. Status */}
              <th
                onClick={() => handleSort("status")}
                style={{
                  position: "relative",
                  width: `${widths.status}px`,
                  minWidth: `${MIN_INVOICE_WIDTHS.status}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Status</span>
                  {renderSortIndicator("status")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("status", e)} />
              </th>

              {/* 5. Amount */}
              <th
                onClick={() => handleSort("amount")}
                style={{
                  position: "relative",
                  width: `${widths.amount}px`,
                  minWidth: `${MIN_INVOICE_WIDTHS.amount}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Amount</span>
                  {renderSortIndicator("amount")}
                </div>
                <ResizeHandle onMouseDown={(e) => startResize("amount", e)} />
              </th>

              {/* 6. Actions */}
              <th
                style={{
                  position: "relative",
                  width: `${widths.actions}px`,
                  minWidth: `${MIN_INVOICE_WIDTHS.actions}px`,
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <span>Action</span>
                <ResizeHandle onMouseDown={(e) => startResize("actions", e)} />
              </th>
            </tr>
          </thead>

          <tbody>
            {currentBatch.map((inv) => {
              const badge = getStatusBadge(inv.status);

              return (
                <tr
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv)}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    height: "38px",
                    cursor: "pointer",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* 1. Invoice Date */}
                  <td style={{ padding: "6px 14px", whiteSpace: "nowrap" }} className="mono">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
                      <Calendar size={12} style={{ color: "var(--text-dim)" }} />
                      <span>{inv.issue_date}</span>
                    </div>
                  </td>

                  {/* 2. Invoice # */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }} className="mono">
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--text-main)",
                        padding: "2px 7px",
                        borderRadius: "var(--radius-xs)",
                        background: "var(--bg-surface-subtle)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {inv.invoice_number}
                    </span>
                  </td>

                  {/* 3. Client */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Building2 size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: "var(--text-main)" }}>
                          {inv.client?.company_name || "—"}
                        </span>
                      </div>
                      {inv.client?.phone && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingLeft: "18px", fontSize: "11px", color: "var(--text-muted)" }}>
                          <Phone size={10} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                          <span>{inv.client.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 4. Status */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: badge.bg,
                          color: badge.color,
                          textTransform: "capitalize",
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </td>

                  {/* 5. Amount */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }} className="mono">
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "12.5px" }}>
                          {formatCurrency(inv.final_amount, inv.currency_code)}
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
                            letterSpacing: "0.3px",
                          }}
                        >
                          {(inv.currency_code || "USD").toUpperCase()}
                        </span>
                      </div>
                      {inv.received_amount_inr != null && inv.received_amount_inr > 0 ? (
                        <span
                          style={{
                            fontSize: "10.5px",
                            color: "var(--accent-emerald)",
                            fontWeight: 600,
                          }}
                          title={`Equivalent INR amount received in bank account: ₹${inv.received_amount_inr.toLocaleString()}`}
                        >
                          ₹{inv.received_amount_inr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} rec'd
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* 6. Actions */}
                  <td style={{ padding: "6px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Paid Button */}
                      {inv.status !== "paid" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPayModal(inv)}
                          className="finance-button-secondary"
                          style={{
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--accent-emerald)",
                            borderColor: "rgba(16, 185, 129, 0.35)",
                            background: "rgba(16, 185, 129, 0.08)",
                            gap: "3px",
                          }}
                          title="Record equivalent INR payment & mark as paid"
                        >
                          <DollarSign size={11} />
                          <span>Paid</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenPayModal(inv)}
                          className="finance-button-secondary"
                          style={{
                            padding: "3px 7px",
                            fontSize: "10.5px",
                            fontWeight: 600,
                            color: "var(--accent-emerald)",
                            borderColor: "rgba(16, 185, 129, 0.35)",
                            background: "rgba(16, 185, 129, 0.15)",
                            gap: "3px",
                          }}
                          title={
                            inv.received_amount_inr
                              ? `Paid: ₹${inv.received_amount_inr.toLocaleString()} on ${inv.payment_date || ""} (Click to edit payment)`
                              : "Paid (Click to edit payment)"
                          }
                        >
                          <CheckCircle2 size={11} />
                          <span>Paid</span>
                        </button>
                      )}

                      {/* Undo Paid Button */}
                      {inv.status === "paid" && (
                        <button
                          type="button"
                          onClick={() => handleUndoPaid(inv)}
                          disabled={undoSubmittingId === inv.id}
                          className="finance-button-secondary"
                          style={{
                            padding: "3px 7px",
                            fontSize: "10.5px",
                            fontWeight: 600,
                            color: "#f59e0b",
                            borderColor: "rgba(245, 158, 11, 0.35)",
                            background: "rgba(245, 158, 11, 0.08)",
                            gap: "3px",
                          }}
                          title="Undo payment: reset status to sent and clear payment details"
                        >
                          <RotateCcw size={11} className={undoSubmittingId === inv.id ? "animate-spin" : ""} />
                          <span>{undoSubmittingId === inv.id ? "Undoing..." : "Undo Paid"}</span>
                        </button>
                      )}

                      {/* Download PDF */}
                      <button
                        type="button"
                        onClick={(e) => handleDownloadPdf(inv, e)}
                        className="finance-button-secondary"
                        style={{ padding: "3px 6px" }}
                        title="Download PDF (ReportLab)"
                      >
                        <Download size={11} />
                      </button>

                      {/* Edit Invoice */}
                      <button
                        type="button"
                        onClick={() => onEditInvoice(inv)}
                        className="finance-button-secondary"
                        style={{ padding: "3px 6px" }}
                        title="Edit Invoice"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 50-Interval Footer Pagination */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          background: "var(--bg-surface-subtle)",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "11.5px",
          color: "var(--text-muted)",
        }}
      >
        <div>
          Showing <span className="mono" style={{ fontWeight: 600 }}>{totalItems > 0 ? startIndex + 1 : 0}</span> –{" "}
          <span className="mono" style={{ fontWeight: 600 }}>{endIndex}</span> of{" "}
          <span className="mono" style={{ fontWeight: 600 }}>{totalItems}</span> invoices
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            className="finance-button-secondary"
            style={{
              padding: "3px 7px",
              opacity: safeCurrentPage <= 1 ? 0.4 : 1,
              cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
            }}
            title="Previous page"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="mono" style={{ padding: "0 6px", fontWeight: 600 }}>
            {safeCurrentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="finance-button-secondary"
            style={{
              padding: "3px 7px",
              opacity: safeCurrentPage >= totalPages ? 0.4 : 1,
              cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer",
            }}
            title="Next page"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. POPUP: RECORD EQUIVALENT INR PAYMENT RECEIVED IN BANK   */}
      {/* ========================================================= */}
      {payModalOpen && payingInvoice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setPayModalOpen(false)}
        >
          <div
            className="finance-panel animate-fade-in"
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-surface-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "var(--radius-xs)",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "var(--accent-emerald)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DollarSign size={16} />
                </div>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                  Record Payment Received
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="finance-button-secondary"
                style={{ width: "26px", height: "26px", padding: 0, justifyContent: "center" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmPayment} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Invoice Metadata Banner */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-xs)",
                  background: "var(--bg-surface-subtle)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                    {payingInvoice.invoice_number}
                  </div>
                  <div style={{ color: "var(--text-dim)", fontSize: "11px" }}>
                    {payingInvoice.client?.company_name || "Client"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Billed Amount</div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-main)" }}>
                    {formatCurrency(payingInvoice.final_amount, payingInvoice.currency_code)}
                  </div>
                </div>
              </div>

              {payError && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-xs)",
                    background: "rgba(244, 63, 94, 0.1)",
                    border: "1px solid var(--accent-rose)",
                    color: "var(--accent-rose)",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{payError}</span>
                </div>
              )}

              {/* Equivalent INR Amount */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
                  Equivalent INR Amount Received in Bank Account (₹) *
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontWeight: 700,
                      color: "var(--text-dim)",
                      fontSize: "13px",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 84500.00"
                    value={payAmountInr}
                    onChange={(e) => setPayAmountInr(e.target.value)}
                    className="finance-input mono"
                    autoFocus
                    style={{ paddingLeft: "26px", height: "36px", fontSize: "13px", fontWeight: 600 }}
                  />
                </div>
                <span style={{ display: "block", fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                  Enter the actual INR amount credited to your bank account after foreign exchange conversion.
                </span>
              </div>

              {/* Payment Date */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
                  Payment Received Date *
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="finance-input mono"
                  style={{ height: "36px", fontSize: "12px" }}
                />
              </div>

              {/* Bank Reference / Notes */}
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Bank Reference / Wire UTR (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC wire UTR #12345678"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="finance-input"
                  style={{ height: "34px", fontSize: "12px" }}
                />
              </div>

              {/* Footer Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "8px",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  disabled={paySubmitting}
                  className="finance-button-secondary"
                  style={{ height: "34px", padding: "0 14px", fontSize: "12px" }}
                >
                  Cancel
                </button>
                {payingInvoice.status === "paid" && (
                  <button
                    type="button"
                    onClick={() => {
                      const inv = payingInvoice;
                      setPayModalOpen(false);
                      handleUndoPaid(inv);
                    }}
                    disabled={paySubmitting}
                    className="finance-button-secondary"
                    style={{
                      height: "34px",
                      padding: "0 12px",
                      fontSize: "12px",
                      color: "#f59e0b",
                      borderColor: "rgba(245, 158, 11, 0.35)",
                      background: "rgba(245, 158, 11, 0.08)",
                      fontWeight: 600,
                      gap: "4px",
                    }}
                    title="Undo payment for this invoice"
                  >
                    <RotateCcw size={12} />
                    <span>Undo Paid</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="finance-button-primary"
                  style={{
                    height: "34px",
                    padding: "0 16px",
                    fontSize: "12px",
                    background: "var(--accent-emerald)",
                    borderColor: "var(--accent-emerald)",
                    color: "#ffffff",
                    fontWeight: 600,
                    width: "auto",
                  }}
                >
                  {paySubmitting ? "Recording..." : payingInvoice.status === "paid" ? "Update Payment" : "Confirm & Mark Paid"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reconcile Modal hidden */}
    </div>
  );
}
