"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CreditCard, AlertCircle, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { GatewayData, GatewayCreatePayload } from "@/types/gateway";

interface GatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (gateway: GatewayData) => Promise<void> | void;
  initialData?: GatewayData | null;
}

interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

const COMMON_CURRENCIES: CurrencyOption[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "AU$", name: "Australian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
];

export default function GatewayModal({
  isOpen,
  onClose,
  onSuccess,
  onDelete,
  initialData,
}: GatewayModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>(COMMON_CURRENCIES);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState<GatewayCreatePayload>({
    name: "",
    currency_code: "USD",
    gateway_note: "",
    is_active: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch workspace active currencies
  useEffect(() => {
    if (!isOpen) return;
    async function loadCurrencies() {
      try {
        const res = await api.get<any[]>("/settings/currencies");
        if (Array.isArray(res) && res.length > 0) {
          const mapped = res.map((c) => ({
            code: c.code,
            symbol: c.symbol,
            name: c.name,
          }));
          setCurrencies(mapped);
        }
      } catch {
        setCurrencies(COMMON_CURRENCIES);
      }
    }
    loadCurrencies();
  }, [isOpen]);

  // Reset or populate form data
  useEffect(() => {
    setConfirmDelete(false);
    setDeleting(false);
    setErrorMsg("");

    if (initialData) {
      setFormData({
        name: initialData.name,
        currency_code: initialData.currency_code,
        gateway_note: initialData.gateway_note || "",
        is_active: initialData.is_active,
      });
    } else {
      setFormData({
        name: "",
        currency_code: "USD",
        gateway_note: "",
        is_active: true,
      });
    }
  }, [initialData, isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleInputChange = (field: keyof GatewayCreatePayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Gateway name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        currency_code: formData.currency_code.trim().toUpperCase(),
        gateway_note: formData.gateway_note || "",
        is_active: formData.is_active ?? true,
      };

      if (initialData?.id) {
        await api.put(`/gateways/${initialData.id}`, payload);
      } else {
        await api.post("/gateways", payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save payment gateway.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    setDeleting(true);
    setErrorMsg("");
    try {
      if (onDelete) {
        await onDelete(initialData);
      } else {
        await api.delete(`/gateways/${initialData.id}`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete payment gateway.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
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
          maxWidth: "580px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-surface-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                {initialData ? "Edit Payment Gateway" : "Add Payment Gateway"}
              </h2>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Configure settlement gateway and invoice remittance instructions
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="finance-button-secondary"
            style={{ width: "28px", height: "28px", padding: 0, justifyContent: "center" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid var(--accent-rose)",
                borderRadius: "var(--radius-xs)",
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

          {/* Row 1: Gateway Name & Currency */}
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
                Gateway Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g. Razorpay, PayPal, Direct Bank Wire"
                className="finance-input"
                style={{ height: "36px", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
                Currency *
              </label>
              <select
                value={formData.currency_code}
                onChange={(e) => handleInputChange("currency_code", e.target.value)}
                className="finance-input mono"
                style={{ height: "36px", fontSize: "12px" }}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Auto-Calculated Metrics (Read-only banner when editing existing gateway) */}
          {initialData && (
            <div
              style={{
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
                  Total Incoming
                </div>
                <div className="mono" style={{ fontSize: "12px", fontWeight: 700, marginTop: "2px" }}>
                  {initialData.currency_code} {initialData.total_incoming_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                  Total Equiv. INR
                </div>
                <div className="mono" style={{ fontSize: "12px", fontWeight: 700, marginTop: "2px", color: "var(--accent-emerald)" }}>
                  ₹{initialData.total_equivalent_inr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                  Average Rate
                </div>
                <div className="mono" style={{ fontSize: "12px", fontWeight: 700, marginTop: "2px", color: "var(--accent-blue)" }}>
                  ₹{initialData.average_rate.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Row 2: Multiline Gateway Note */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                Gateway Note (Multiline Payment Instructions)
              </label>
              <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                Reflected in Invoice Sheet
              </span>
            </div>
            <textarea
              rows={7}
              value={formData.gateway_note}
              onChange={(e) => handleInputChange("gateway_note", e.target.value)}
              placeholder="Enter bank wire details, account number, IFSC, SWIFT/BIC code, PayPal email, or payment link instructions..."
              className="finance-input mono"
              style={{ fontSize: "11px", resize: "vertical", lineHeight: "1.4" }}
            />
            <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              This note will automatically pre-populate the &ldquo;Payment Instructions&rdquo; box on invoices when this gateway is selected.
            </span>
          </div>

          {/* Row 3: Status Checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "2px" }}>
            <input
              type="checkbox"
              id="is_active_toggle"
              checked={formData.is_active}
              onChange={(e) => handleInputChange("is_active", e.target.checked)}
              style={{ accentColor: "var(--accent-emerald)", cursor: "pointer" }}
            />
            <label htmlFor="is_active_toggle" style={{ fontSize: "12px", color: "var(--text-main)", cursor: "pointer" }}>
              Active (available in invoice gateway selector)
            </label>
          </div>

          {/* Modal Footer with Delete option in edit window */}
          <div
            style={{
              display: "flex",
              justifyContent: initialData ? "space-between" : "flex-end",
              alignItems: "center",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-subtle)",
              marginTop: "4px",
            }}
          >
            {initialData && (
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
                      height: "32px",
                      padding: "0 10px",
                      fontSize: "12px",
                      gap: "5px",
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
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
                        height: "32px",
                        padding: "0 10px",
                        fontSize: "12px",
                        gap: "5px",
                        width: "auto",
                      }}
                    >
                      <Trash2 size={13} />
                      <span>{deleting ? "Deleting..." : "Confirm Delete?"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="finance-button-secondary"
                      style={{ height: "32px", padding: "0 8px", fontSize: "12px" }}
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
                disabled={submitting || deleting}
                className="finance-button-secondary"
                style={{ height: "34px", padding: "0 14px", fontSize: "12px" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || deleting}
                className="finance-button-primary"
                style={{ height: "34px", padding: "0 16px", fontSize: "12px", width: "auto" }}
              >
                <span>{submitting ? "Saving..." : initialData ? "Update Gateway" : "Add Gateway"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
