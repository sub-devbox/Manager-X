"use client";

import React, { useState, useMemo, useEffect } from "react";
import { InvoiceData } from "@/types/invoice";
import { useResizableColumns, ResizeHandle } from "@/hooks/useResizableColumns";
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
} from "lucide-react";

interface InvoiceTableProps {
  invoices: InvoiceData[];
  onSelectInvoice: (invoice: InvoiceData) => void;
  onEditInvoice: (invoice: InvoiceData) => void;
}

type SortField = "invoice_date" | "invoice_number" | "client" | "status" | "amount";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

const DEFAULT_INVOICE_WIDTHS = {
  invoice_date: 130,
  invoice_number: 220,
  client: 200,
  status: 120,
  amount: 150,
  actions: 80,
};

const MIN_INVOICE_WIDTHS = {
  invoice_date: 90,
  invoice_number: 140,
  client: 120,
  status: 90,
  amount: 100,
  actions: 70,
};

export default function InvoiceTable({
  invoices,
  onSelectInvoice,
  onEditInvoice,
}: InvoiceTableProps) {
  const [sortField, setSortField] = useState<SortField>("invoice_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

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
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
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
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Building2 size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                      <span style={{ fontWeight: 500, color: "var(--text-main)" }}>
                        {inv.client?.company_name || "—"}
                      </span>
                    </div>
                  </td>

                  {/* 4. Status */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
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
                  </td>

                  {/* 5. Amount */}
                  <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }} className="mono">
                    <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "12.5px" }}>
                      {formatCurrency(inv.final_amount, inv.currency_code)}
                    </span>
                  </td>

                  {/* 6. Actions (Edit only, no delete button on row) */}
                  <td style={{ padding: "6px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
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
    </div>
  );
}
