"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api-client";
import {
  InvoiceData,
  InvoiceItemData,
  InvoiceStatus,
  UnbilledTaskData,
  CompanyProfileData,
} from "@/types/invoice";
import { ClientData } from "@/types/client";
import SearchableClientSelect from "@/components/common/SearchableClientSelect";
import {
  X,
  Plus,
  Trash2,
  Printer,
  Download,
  Building2,
  Calendar,
  CreditCard,
  CheckSquare,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (invoice: InvoiceData) => Promise<void> | void;
  initialData?: InvoiceData | null;
  clients: ClientData[];
}

const GATEWAY_OPTIONS = [
  { id: "Razorpay", label: "Razorpay" },
  { id: "PayPal", label: "PayPal" },
  { id: "Payoneer", label: "Payoneer" },
  { id: "Stripe", label: "Stripe" },
  { id: "Direct Bank Wire", label: "Direct Bank Wire (SWIFT / IBAN)" },
  { id: "Wise", label: "Wise (TransferWise)" },
  { id: "Other", label: "Other / Custom Gateway" },
];

export default function InvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  onDelete,
  initialData,
  clients,
}: InvoiceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Company profile for "Bill From:"
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileData>({
    name: "My Agency / Consulting",
    address: "",
    phone: "",
    pan: "",
    gstin: "",
    email: "",
    website: "",
  });

  // Unbilled tasks available for selected client
  const [unbilledTasks, setUnbilledTasks] = useState<UnbilledTaskData[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Form State
  const [clientId, setClientId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [paymentGateway, setPaymentGateway] = useState("Razorpay");
  const [currencyCode, setCurrencyCode] = useState("USD");

  const [items, setItems] = useState<InvoiceItemData[]>([]);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [roundOff, setRoundOff] = useState<number>(0);
  const [gatewayNotes, setGatewayNotes] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Company Profile from Settings for "Bill From"
  useEffect(() => {
    if (!isOpen) return;
    async function loadCompanyProfile() {
      try {
        const res = await api.get<CompanyProfileData>("/settings/company");
        if (res && res.name) {
          setCompanyProfile(res);
        }
      } catch {}
    }
    loadCompanyProfile();
  }, [isOpen]);

  // Selected client details
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === clientId) || null;
  }, [clients, clientId]);

  // Helper: Extract company initials (e.g., American Dreams LLC -> ADL)
  const extractCompanyInitials = (name: string): string => {
    const words = name.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (!words.length) return "CLI";
    return words.map((w) => w[0].toUpperCase()).join("");
  };

  // Fetch Next Invoice Number when client or issue date changes
  const fetchNextInvoiceNumber = useCallback(async (cId: string, iDate: string) => {
    if (!cId) return;
    try {
      const res = await api.get<{ invoice_number: string }>(
        `/invoices/next-number?client_id=${cId}&issue_date=${iDate}`
      );
      if (res && res.invoice_number) {
        setInvoiceNumber(res.invoice_number);
      }
    } catch {
      const client = clients.find((c) => c.id === cId);
      const initials = client ? extractCompanyInitials(client.company_name) : "CLI";
      const parts = iDate.split("-");
      const ym = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : "2026-09";
      setInvoiceNumber(`INV-${ym}-${initials}.1`);
    }
  }, [clients]);

  // Fetch unbilled tasks for selected client
  const fetchUnbilledTasks = useCallback(async (cId: string, currentInvoiceId?: string) => {
    if (!cId) {
      setUnbilledTasks([]);
      return;
    }
    setLoadingTasks(true);
    try {
      const url = currentInvoiceId
        ? `/invoices/unbilled-tasks?client_id=${cId}&exclude_invoice_id=${currentInvoiceId}`
        : `/invoices/unbilled-tasks?client_id=${cId}`;
      const data = await api.get<UnbilledTaskData[]>(url);
      setUnbilledTasks(Array.isArray(data) ? data : []);
    } catch {
      setUnbilledTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // Initialize or reset form data
  useEffect(() => {
    if (!isOpen) return;

    setConfirmDelete(false);
    setDeleting(false);
    setErrorMsg("");

    if (initialData) {
      setClientId(initialData.client_id);
      setInvoiceNumber(initialData.invoice_number);
      setStatus(initialData.status);
      setIssueDate(initialData.issue_date);
      setDueDate(initialData.due_date);
      setPaymentGateway(initialData.payment_gateway || "Razorpay");
      setCurrencyCode(initialData.currency_code || "USD");
      setDiscountType(initialData.discount_type || "fixed");
      setDiscountValue(initialData.discount_value || 0);
      setRoundOff(initialData.round_off || 0);
      setGatewayNotes(initialData.gateway_notes || "");
      setItems(
        (initialData.items || []).map((itm) => ({
          ...itm,
          total: Number((itm.quantity * itm.unit_price).toFixed(2)),
        }))
      );
      fetchUnbilledTasks(initialData.client_id, initialData.id);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setIssueDate(today);
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 15);
      setDueDate(defaultDue.toISOString().slice(0, 10));

      const firstClient = clients[0]?.id || "";
      setClientId(firstClient);
      setStatus("draft");
      setPaymentGateway("Razorpay");
      setDiscountType("fixed");
      setDiscountValue(0);
      setRoundOff(0);
      setGatewayNotes(
        "Payment terms: Net 15 days.\nPlease remit via Razorpay link or SWIFT wire transfer.\nInclude Invoice number as payment reference."
      );
      setItems([]);

      if (firstClient) {
        const client = clients.find((c) => c.id === firstClient);
        if (client) {
          setCurrencyCode(client.currency_code || "USD");
          const terms = client.payment_terms_days || 15;
          const due = new Date();
          due.setDate(due.getDate() + terms);
          setDueDate(due.toISOString().slice(0, 10));
        }
        fetchNextInvoiceNumber(firstClient, today);
        fetchUnbilledTasks(firstClient);
      }
    }
  }, [isOpen, initialData, clients, fetchNextInvoiceNumber, fetchUnbilledTasks]);

  // Handle client selection change
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    const client = clients.find((c) => c.id === newClientId);
    if (client) {
      setCurrencyCode(client.currency_code || "USD");
      // Update due date from client payment terms
      const issue = new Date(issueDate);
      if (!isNaN(issue.getTime())) {
        const terms = client.payment_terms_days || 15;
        const due = new Date(issue);
        due.setDate(due.getDate() + terms);
        setDueDate(due.toISOString().slice(0, 10));
      }
    }
    fetchNextInvoiceNumber(newClientId, issueDate);
    fetchUnbilledTasks(newClientId, initialData?.id);
  };

  // Handle issue date change
  const handleIssueDateChange = (newDate: string) => {
    setIssueDate(newDate);
    if (selectedClient) {
      const issue = new Date(newDate);
      if (!isNaN(issue.getTime())) {
        const terms = selectedClient.payment_terms_days || 15;
        const due = new Date(issue);
        due.setDate(due.getDate() + terms);
        setDueDate(due.toISOString().slice(0, 10));
      }
    }
    if (!initialData && clientId) {
      fetchNextInvoiceNumber(clientId, newDate);
    }
  };

  // Add line item
  const handleAddLineItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        hsn_sac: "998311",
        price: selectedClient?.hourly_rate || 50,
        quantity: 1,
        unit_price: selectedClient?.hourly_rate || 50,
        total: selectedClient?.hourly_rate || 50,
      },
    ]);
  };

  // Add unbilled task to items
  const handleAddUnbilledTask = (task: UnbilledTaskData) => {
    const qty = task.time_spent_seconds > 0
      ? Number((task.time_spent_seconds / 3600).toFixed(2))
      : (task.estimated_hours || 1);

    const rate = task.hourly_rate || selectedClient?.hourly_rate || 50;
    const itemTotal = Number((qty * rate).toFixed(2));

    const description = task.project_name
      ? `[${task.project_name}] ${task.title}`
      : task.title;

    setItems((prev) => [
      ...prev,
      {
        task_id: task.id,
        description,
        hsn_sac: "998311",
        price: rate,
        quantity: qty,
        unit_price: rate,
        total: itemTotal,
      },
    ]);

    // Remove from unbilled pool locally
    setUnbilledTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof InvoiceItemData, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: val };

      if (field === "quantity" || field === "unit_price" || field === "price") {
        const qty = field === "quantity" ? Number(val) || 0 : cur.quantity;
        const unit = field === "unit_price" ? Number(val) || 0 : (field === "price" ? Number(val) || 0 : cur.unit_price);
        cur.price = unit;
        cur.unit_price = unit;
        cur.quantity = qty;
        cur.total = Number((qty * unit).toFixed(2));
      }

      updated[index] = cur;
      return updated;
    });
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    const sum = items.reduce((acc, itm) => acc + (itm.total || 0), 0);
    return Number(sum.toFixed(2));
  }, [items]);

  const discountAmount = useMemo(() => {
    if (discountType === "percentage") {
      return Number(((subtotal * (discountValue || 0)) / 100).toFixed(2));
    }
    return Number((discountValue || 0).toFixed(2));
  }, [subtotal, discountType, discountValue]);

  const finalAmount = useMemo(() => {
    const total = subtotal - discountAmount + (roundOff || 0);
    return Math.max(0, Number(total.toFixed(2)));
  }, [subtotal, discountAmount, roundOff]);

  // Format currency helper
  const formatCurrency = (amount: number, cur: string = currencyCode) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cur,
        minimumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${cur} ${amount.toFixed(2)}`;
    }
  };

  // Save handler
  const handleSave = async (targetStatus?: InvoiceStatus) => {
    setErrorMsg("");
    if (!clientId) {
      setErrorMsg("Please select a client.");
      return;
    }
    if (!invoiceNumber.trim()) {
      setErrorMsg("Invoice number is required.");
      return;
    }
    if (!items.length) {
      setErrorMsg("Please add at least one line item.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        client_id: clientId,
        invoice_number: invoiceNumber.trim(),
        status: targetStatus || status,
        issue_date: issueDate,
        due_date: dueDate,
        payment_gateway: paymentGateway,
        subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        round_off: roundOff,
        final_amount: finalAmount,
        currency_code: currencyCode,
        gateway_notes: gatewayNotes,
        items: items.map((itm, idx) => ({
          task_id: itm.task_id || null,
          description: itm.description || "Consulting Services",
          hsn_sac: itm.hsn_sac || "",
          price: itm.price || itm.unit_price,
          quantity: itm.quantity || 1,
          unit_price: itm.unit_price || itm.price,
          total: itm.total,
          sort_order: idx,
        })),
      };

      if (initialData) {
        await api.put(`/invoices/${initialData.id}`, payload);
      } else {
        await api.post("/invoices", payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    setDeleting(true);
    setErrorMsg("");
    try {
      await onDelete(initialData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete invoice.");
      setDeleting(false);
    }
  };

  // Print / PDF export
  const handlePrint = () => {
    const printContent = document.getElementById("invoice-letter-sheet");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${invoiceNumber} - Invoice</title>
          <style>
            @page {
              size: letter;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { border-bottom: 2px solid #cbd5e1; padding: 8px 6px; text-align: left; font-weight: 600; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px 6px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // One-click PDF download using hidden iframe (no popup tab left open)
  const handleDownloadPDF = () => {
    const printContent = document.getElementById("invoice-letter-sheet");
    if (!printContent) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${invoiceNumber || "Invoice"}</title>
          <style>
            @page {
              size: letter portrait;
              margin: 10mm 12mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { border-bottom: 2px solid #cbd5e1; padding: 8px 6px; text-align: left; font-weight: 600; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px 6px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 250);
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="finance-panel animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "1380px",
          height: "92vh",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Modal Top Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-surface-subtle)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(59, 130, 246, 0.12)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={16} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                  {initialData ? `Edit Invoice: ${invoiceNumber}` : "New Invoice Generator"}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background:
                      status === "paid"
                        ? "rgba(16, 185, 129, 0.12)"
                        : status === "sent"
                        ? "rgba(59, 130, 246, 0.12)"
                        : "rgba(245, 158, 11, 0.12)",
                    color:
                      status === "paid"
                        ? "var(--accent-emerald)"
                        : status === "sent"
                        ? "var(--accent-blue)"
                        : "var(--accent-amber)",
                    textTransform: "capitalize",
                  }}
                >
                  {status}
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                US Letter (8.5&quot; &times; 11&quot;) real-time live preview &amp; billing editor
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="finance-button-primary"
              style={{
                background: "var(--accent-emerald)",
                borderColor: "var(--accent-emerald)",
                color: "#ffffff",
                height: "32px",
                padding: "0 12px",
                gap: "6px",
                fontSize: "12px",
                width: "auto",
              }}
              title="Download or save Letter PDF in one click"
            >
              <Download size={13} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="finance-button-secondary"
              style={{ height: "32px", padding: "0 12px", gap: "6px", fontSize: "12px" }}
              title="Print or export Letter PDF"
            >
              <Printer size={13} />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={submitting || deleting}
              className="finance-button-primary"
              style={{ height: "32px", padding: "0 14px", gap: "6px", fontSize: "12px", width: "auto" }}
            >
              <span>{submitting ? "Saving..." : initialData ? "Save Changes" : "Create Invoice"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting || deleting}
              className="finance-button-secondary"
              style={{ width: "32px", height: "32px", padding: 0, justifyContent: "center" }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div
            style={{
              padding: "10px 16px",
              background: "rgba(244, 63, 94, 0.1)",
              borderBottom: "1px solid var(--accent-rose)",
              color: "var(--accent-rose)",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2-Split Screen Vertically */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* ========================================================= */}
          {/* LEFT SPLIT: USER INPUT & BILLING CONTROLS                 */}
          {/* ========================================================= */}
          <div
            style={{
              flex: "1 1 50%",
              minWidth: "480px",
              borderRight: "1px solid var(--border-subtle)",
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* 1. Client & Invoice Metadata */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)" }}>
                1. Engagement &amp; Invoice Identifiers
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Select Client *
                  </label>
                  <SearchableClientSelect
                    clients={clients}
                    value={clientId}
                    onChange={handleClientChange}
                    placeholder="Choose client..."
                    width="100%"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Invoice # (Auto: INV-YYYY-MM-INITIALS.N)
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="finance-input mono"
                    placeholder="INV-YYYY-MM-CLI.1"
                    style={{ height: "34px", fontSize: "12px", fontWeight: 600 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => handleIssueDateChange(e.target.value)}
                    className="finance-input mono"
                    style={{ height: "34px", fontSize: "12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="finance-input mono"
                    style={{ height: "34px", fontSize: "12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                    className="finance-input"
                    style={{ height: "34px", fontSize: "12px" }}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="void">Void</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Payment Gateway / Method
                  </label>
                  <select
                    value={paymentGateway}
                    onChange={(e) => setPaymentGateway(e.target.value)}
                    className="finance-input"
                    style={{ height: "34px", fontSize: "12px" }}
                  >
                    {GATEWAY_OPTIONS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Currency Code
                  </label>
                  <input
                    type="text"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    className="finance-input mono"
                    placeholder="USD"
                    style={{ height: "34px", fontSize: "12px", textTransform: "uppercase" }}
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "4px 0" }} />

            {/* 2. Unbilled Tasks for this client (Import from Tasks) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)" }}>
                  2. Import Unbilled Tasks ({unbilledTasks.length} Available)
                </span>
                {loadingTasks && (
                  <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Loading tasks...</span>
                )}
              </div>

              {unbilledTasks.length > 0 ? (
                <div
                  style={{
                    maxHeight: "130px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    background: "var(--bg-surface-subtle)",
                    padding: "8px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {unbilledTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 8px",
                        background: "var(--bg-surface)",
                        borderRadius: "var(--radius-xs)",
                        fontSize: "11.5px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "8px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{task.title}</span>
                        {task.project_name && (
                          <span style={{ color: "var(--text-dim)", marginLeft: "6px" }}>({task.project_name})</span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                        <span className="mono" style={{ fontSize: "11px", color: "var(--accent-emerald)" }}>
                          {task.time_spent_seconds > 0
                            ? `${(task.time_spent_seconds / 3600).toFixed(1)}h logged`
                            : `${task.estimated_hours}h est.`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddUnbilledTask(task)}
                          className="finance-button-secondary"
                          style={{ padding: "2px 6px", fontSize: "11px", height: "24px" }}
                        >
                          <Plus size={10} />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--text-muted)",
                    padding: "8px 12px",
                    background: "var(--bg-surface-subtle)",
                    borderRadius: "var(--radius-xs)",
                    border: "1px dashed var(--border-subtle)",
                  }}
                >
                  No unbilled tasks for {selectedClient?.company_name || "selected client"}. All deliverables are billed or create custom items below.
                </div>
              )}
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "4px 0" }} />

            {/* 3. Line Items Editor Table */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)" }}>
                  3. Line Items &amp; Deliverables
                </span>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="finance-button-secondary"
                  style={{ padding: "4px 10px", fontSize: "11.5px", height: "28px" }}
                >
                  <Plus size={12} />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-xs)",
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-surface-subtle)", borderBottom: "1px solid var(--border-subtle)", height: "30px", textAlign: "left", color: "var(--text-dim)" }}>
                      <th style={{ padding: "6px 8px" }}>Item Description</th>
                      <th style={{ padding: "6px 8px", width: "90px" }}>HSN/SAC</th>
                      <th style={{ padding: "6px 8px", width: "70px" }}>Qty</th>
                      <th style={{ padding: "6px 8px", width: "85px" }}>Rate</th>
                      <th style={{ padding: "6px 8px", width: "90px", textAlign: "right" }}>Total</th>
                      <th style={{ padding: "6px 8px", width: "36px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            padding: "20px 12px",
                            textAlign: "center",
                            color: "var(--text-dim)",
                            fontSize: "12px",
                          }}
                        >
                          No line items added yet. Click &quot;+ Add Line Item&quot; or import unbilled tasks above.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "4px 6px" }}>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                              placeholder="Deliverable description..."
                              className="finance-input"
                              style={{ height: "28px", fontSize: "11.5px", width: "100%" }}
                            />
                          </td>
                          <td style={{ padding: "4px 6px" }}>
                            <input
                              type="text"
                              value={item.hsn_sac || ""}
                              onChange={(e) => handleUpdateItem(idx, "hsn_sac", e.target.value)}
                              placeholder="998311"
                              className="finance-input mono"
                              style={{ height: "28px", fontSize: "11px", width: "100%" }}
                            />
                          </td>
                          <td style={{ padding: "4px 6px" }}>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                              className="finance-input mono"
                              style={{ height: "28px", fontSize: "11.5px", width: "100%" }}
                            />
                          </td>
                          <td style={{ padding: "4px 6px" }}>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unit_price}
                              onChange={(e) => handleUpdateItem(idx, "unit_price", e.target.value)}
                              className="finance-input mono"
                              style={{ height: "28px", fontSize: "11.5px", width: "100%" }}
                            />
                          </td>
                          <td style={{ padding: "4px 8px", textAlign: "right" }} className="mono">
                            <span style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</span>
                          </td>
                          <td style={{ padding: "4px 4px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="finance-button-secondary"
                              style={{ padding: "2px 4px", border: "none", color: "var(--text-dim)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-rose)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                              title="Remove line"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "4px 0" }} />

            {/* 4. Financial Calculations: Discount & Round Off */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)" }}>
                4. Summary &amp; Adjustments
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Discount</label>
                    <div style={{ display: "inline-flex", background: "var(--bg-surface-subtle)", borderRadius: "var(--radius-xs)", padding: "1px" }}>
                      <button
                        type="button"
                        onClick={() => setDiscountType("fixed")}
                        style={{
                          padding: "2px 6px",
                          fontSize: "10px",
                          fontWeight: discountType === "fixed" ? 700 : 400,
                          background: discountType === "fixed" ? "var(--bg-surface)" : "transparent",
                          border: "none",
                          color: discountType === "fixed" ? "var(--text-main)" : "var(--text-dim)",
                          cursor: "pointer",
                          borderRadius: "2px",
                        }}
                      >
                        {currencyCode}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("percentage")}
                        style={{
                          padding: "2px 6px",
                          fontSize: "10px",
                          fontWeight: discountType === "percentage" ? 700 : 400,
                          background: discountType === "percentage" ? "var(--bg-surface)" : "transparent",
                          border: "none",
                          color: discountType === "percentage" ? "var(--text-main)" : "var(--text-dim)",
                          cursor: "pointer",
                          borderRadius: "2px",
                        }}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                    className="finance-input mono"
                    style={{ height: "32px", fontSize: "12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Round off (+/-)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={roundOff}
                    onChange={(e) => setRoundOff(Number(e.target.value) || 0)}
                    className="finance-input mono"
                    style={{ height: "32px", fontSize: "12px" }}
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "4px 0" }} />

            {/* 5. Payment Gateway Notes (10 lines reserved) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)" }}>
                  5. Payment Gateway Remittance Instructions
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Reserved ~10 lines</span>
              </div>
              <textarea
                rows={7}
                value={gatewayNotes}
                onChange={(e) => setGatewayNotes(e.target.value)}
                placeholder="Payment instructions, bank wire info, SWIFT, IBAN, Razorpay/PayPal link, or note from gateway..."
                className="finance-input mono"
                style={{ fontSize: "11px", resize: "vertical", lineHeight: "1.4" }}
              />
            </div>

            {/* Modal Bottom Footer Actions on Left Pane */}
            <div
              style={{
                display: "flex",
                justifyContent: initialData && onDelete ? "space-between" : "flex-end",
                alignItems: "center",
                paddingTop: "16px",
                borderTop: "1px solid var(--border-subtle)",
                marginTop: "auto",
              }}
            >
              {initialData && onDelete && (
                <div>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      disabled={submitting || deleting}
                      className="finance-button-secondary"
                      style={{
                        color: "var(--accent-rose)",
                        borderColor: "rgba(244, 63, 94, 0.2)",
                        height: "34px",
                        padding: "0 12px",
                        fontSize: "12px",
                        gap: "6px",
                      }}
                    >
                      <Trash2 size={12} />
                      <span>Delete Invoice</span>
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="finance-button-primary"
                        style={{
                          background: "var(--accent-rose)",
                          borderColor: "var(--accent-rose)",
                          color: "#fff",
                          height: "34px",
                          padding: "0 12px",
                          fontSize: "12px",
                          gap: "6px",
                          width: "auto",
                        }}
                      >
                        <Trash2 size={12} />
                        <span>{deleting ? "Deleting..." : "Confirm Delete?"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        className="finance-button-secondary"
                        style={{ height: "34px", padding: "0 10px", fontSize: "12px" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="finance-button-secondary"
                  disabled={submitting || deleting}
                  style={{ height: "34px", padding: "0 14px", fontSize: "12px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSave("sent")}
                  disabled={submitting || deleting}
                  className="finance-button-secondary"
                  style={{ height: "34px", padding: "0 14px", fontSize: "12px" }}
                >
                  Save as Sent
                </button>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={submitting || deleting}
                  className="finance-button-primary"
                  style={{ height: "34px", padding: "0 16px", fontSize: "12px", width: "auto" }}
                >
                  {submitting ? "Saving..." : initialData ? "Save Changes" : "Create Invoice"}
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT SPLIT: REAL-TIME LETTER (8.5" x 11") LIVE PREVIEW   */}
          {/* ========================================================= */}
          <div
            style={{
              flex: "1 1 50%",
              overflowY: "auto",
              padding: "24px 20px",
              background: "#090d16",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            {/* The US Letter sheet container */}
            <div
              id="invoice-letter-sheet"
              style={{
                width: "100%",
                maxWidth: "680px",
                minHeight: "880px",
                background: "#ffffff",
                color: "#0f172a",
                padding: "44px 48px",
                borderRadius: "2px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 1px rgba(0, 0, 0, 0.8)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                boxSizing: "border-box",
              }}
            >
              <div>
                {/* 1. Invoice Top Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: "18px" }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px", color: "#0f172a" }}>
                      INVOICE
                    </h1>
                    <div className="mono" style={{ fontSize: "13px", fontWeight: 700, color: "#2563eb", marginTop: "4px" }}>
                      {invoiceNumber || "INV-YYYY-MM-CLI.1"}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", fontSize: "11px", color: "#475569" }}>
                    <div style={{ marginBottom: "3px" }}>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>Issue Date: </span>
                      <span className="mono">{issueDate}</span>
                    </div>
                    <div style={{ marginBottom: "6px" }}>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>Due Date: </span>
                      <span className="mono">{dueDate}</span>
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        background:
                          status === "paid" ? "#dcfce7" : status === "sent" ? "#dbeafe" : "#fef3c7",
                        color:
                          status === "paid" ? "#15803d" : status === "sent" ? "#1d4ed8" : "#b45309",
                      }}
                    >
                      {status}
                    </div>
                  </div>
                </div>

                {/* 2. Bill From & Bill To Blocks */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "18px 0", borderBottom: "1px solid #e2e8f0" }}>
                  {/* Bill From (User Company Profile in Settings) */}
                  <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.5" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#94a3b8", marginBottom: "4px" }}>
                      Bill From:
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                      {companyProfile.name || "Manager X Agency"}
                    </div>
                    {companyProfile.address && <div>{companyProfile.address}</div>}
                    {companyProfile.email && <div>Email: {companyProfile.email}</div>}
                    {companyProfile.phone && <div>Phone: {companyProfile.phone}</div>}
                    {companyProfile.pan && <div>Tax ID / PAN: {companyProfile.pan}</div>}
                    {companyProfile.website && <div>Web: {companyProfile.website}</div>}
                  </div>

                  {/* Bill To (Client Details) */}
                  <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.5" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#94a3b8", marginBottom: "4px" }}>
                      Bill To:
                    </div>
                    {selectedClient ? (
                      <>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                          {selectedClient.company_name}
                        </div>
                        <div>Attn: {selectedClient.contact_person}</div>
                        <div>
                          {selectedClient.address_line1}
                          {selectedClient.address_line2 ? `, ${selectedClient.address_line2}` : ""}
                        </div>
                        <div>
                          {selectedClient.city}, {selectedClient.state} {selectedClient.postal_code}, {selectedClient.country}
                        </div>
                        {selectedClient.tax_id && <div>Tax ID: {selectedClient.tax_id}</div>}
                        {selectedClient.email && <div>Email: {selectedClient.email}</div>}
                      </>
                    ) : (
                      <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No client selected</div>
                    )}
                  </div>
                </div>

                {/* 3. Items Table (No GST, Export/Consulting Layout) */}
                <div style={{ marginTop: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #0f172a", textAlign: "left", color: "#0f172a" }}>
                        <th style={{ padding: "8px 6px", fontWeight: 700 }}>Items</th>
                        <th style={{ padding: "8px 6px", width: "70px", fontWeight: 700 }}>HSN/SAC</th>
                        <th style={{ padding: "8px 6px", width: "50px", textAlign: "right", fontWeight: 700 }}>Qty</th>
                        <th style={{ padding: "8px 6px", width: "80px", textAlign: "right", fontWeight: 700 }}>Unit Price</th>
                        <th style={{ padding: "8px 6px", width: "90px", textAlign: "right", fontWeight: 700 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: "24px 6px",
                              textAlign: "center",
                              color: "#94a3b8",
                              fontStyle: "italic",
                              fontSize: "11px",
                            }}
                          >
                            No deliverables added yet. Use the editor on the left to add line items.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px 6px", color: "#0f172a" }}>
                              <div style={{ fontWeight: 600 }}>{item.description || "Deliverable item"}</div>
                            </td>
                            <td style={{ padding: "8px 6px", color: "#64748b" }} className="mono">
                              {item.hsn_sac || "—"}
                            </td>
                            <td style={{ padding: "8px 6px", textAlign: "right", color: "#0f172a" }} className="mono">
                              {item.quantity}
                            </td>
                            <td style={{ padding: "8px 6px", textAlign: "right", color: "#0f172a" }} className="mono">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "#0f172a" }} className="mono">
                              {formatCurrency(item.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Section: Payment Notes (10 lines) + Financial Totals */}
              <div style={{ borderTop: "2px solid #0f172a", paddingTop: "14px", marginTop: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
                  {/* Left: 10 lines of Payment Gateway / Remittance Notes */}
                  <div style={{ fontSize: "8.5px", color: "#334155" }}>
                    <div style={{ fontSize: "8.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", marginBottom: "4px" }}>
                      Payment Instructions ({paymentGateway})
                    </div>
                    <div
                      className="mono"
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "4px",
                        padding: "6px 8px",
                        minHeight: "75px",
                        whiteSpace: "pre-wrap",
                        fontSize: "8.5px",
                        lineHeight: "1.3",
                        color: "#475569",
                      }}
                    >
                      {gatewayNotes || "Direct Bank Wire or Gateway payment accepted.\nRemittance details provided upon request."}
                    </div>
                  </div>

                  {/* Right: Subtotal, Discount, Round Off, Final Amount */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11.5px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                      <span>Total Amount:</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#b45309" }}>
                        <span>
                          Discount {discountType === "percentage" ? `(${discountValue}%)` : ""}:
                        </span>
                        <span className="mono" style={{ fontWeight: 600 }}>
                          -{formatCurrency(discountAmount)}
                        </span>
                      </div>
                    )}

                    {roundOff !== 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                        <span>Round off:</span>
                        <span className="mono">{roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</span>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        background: "#0f172a",
                        color: "#ffffff",
                        borderRadius: "4px",
                        marginTop: "4px",
                      }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Final Amount:
                      </span>
                      <span className="mono" style={{ fontSize: "15px", fontWeight: 800 }}>
                        {formatCurrency(finalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Sign-off / Page Note */}
                <div style={{ textAlign: "center", fontSize: "10px", color: "#94a3b8", marginTop: "24px", paddingTop: "8px", borderTop: "1px dashed #cbd5e1" }}>
                  Thank you for your business! &bull; Generated by Manager-X
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
