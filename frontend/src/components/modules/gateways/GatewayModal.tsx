"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CreditCard, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { GatewayData, GatewayCreatePayload } from "@/types/gateway";

interface GatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
  initialData,
}: GatewayModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>(COMMON_CURRENCIES);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState<GatewayCreatePayload>({
    name: "",
    currency_code: "USD",
    total_incoming_amount: 0,
    total_equivalent_inr: 0,
    average_rate: 0,
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
    if (initialData) {
      setFormData({
        name: initialData.name,
        currency_code: initialData.currency_code,
        total_incoming_amount: initialData.total_incoming_amount,
        total_equivalent_inr: initialData.total_equivalent_inr,
        average_rate: initialData.average_rate,
        gateway_note: initialData.gateway_note || "",
        is_active: initialData.is_active,
      });
    } else {
      setFormData({
        name: "",
        currency_code: "USD",
        total_incoming_amount: 0,
        total_equivalent_inr: 0,
        average_rate: 0,
        gateway_note: "",
        is_active: true,
      });
    }
    setErrorMsg("");
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
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-recalculate average rate when incoming or inr amount changes if rate was 0 or unedited
      if (field === "total_incoming_amount" || field === "total_equivalent_inr") {
        const inAmt = field === "total_incoming_amount" ? Number(value) || 0 : prev.total_incoming_amount || 0;
        const inrAmt = field === "total_equivalent_inr" ? Number(value) || 0 : prev.total_equivalent_inr || 0;
        if (inAmt > 0 && inrAmt > 0) {
          next.average_rate = Number((inrAmt / inAmt).toFixed(2));
        }
      }

      return next;
    });
  };

  const calculateAutoRate = () => {
    const inAmt = Number(formData.total_incoming_amount) || 0;
    const inrAmt = Number(formData.total_equivalent_inr) || 0;
    if (inAmt > 0 && inrAmt > 0) {
      setFormData((prev) => ({
        ...prev,
        average_rate: Number((inrAmt / inAmt).toFixed(2)),
      }));
    }
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
        total_incoming_amount: Number(formData.total_incoming_amount) || 0,
        total_equivalent_inr: Number(formData.total_equivalent_inr) || 0,
        average_rate: Number(formData.average_rate) || 0,
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
          maxWidth: "600px",
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
                Configure settlement currency, conversion rates, and invoice remittance instructions
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

          {/* Row 2: Incoming Amount, Equivalent INR, Average Rate */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Total Incoming ({formData.currency_code})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.total_incoming_amount}
                onChange={(e) => handleInputChange("total_incoming_amount", e.target.value)}
                className="finance-input mono"
                placeholder="0.00"
                style={{ height: "34px", fontSize: "12px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Total Equivalent INR (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.total_equivalent_inr}
                onChange={(e) => handleInputChange("total_equivalent_inr", e.target.value)}
                className="finance-input mono"
                placeholder="0.00"
                style={{ height: "34px", fontSize: "12px", color: "var(--accent-emerald)" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Avg Rate (₹/{formData.currency_code})
                </label>
                <button
                  type="button"
                  onClick={calculateAutoRate}
                  title="Auto-calculate INR / Incoming"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-blue)", padding: 0 }}
                >
                  <RefreshCw size={11} />
                </button>
              </div>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.average_rate}
                onChange={(e) => handleInputChange("average_rate", e.target.value)}
                className="finance-input mono"
                placeholder="0.00"
                style={{ height: "34px", fontSize: "12px" }}
              />
            </div>
          </div>

          {/* Row 3: Multiline Gateway Note */}
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
              rows={6}
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

          {/* Row 4: Status Checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "4px" }}>
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

          {/* Modal Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-subtle)",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="finance-button-secondary"
              style={{ height: "34px", padding: "0 14px", fontSize: "12px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="finance-button-primary"
              style={{ height: "34px", padding: "0 16px", fontSize: "12px", width: "auto" }}
            >
              <span>{submitting ? "Saving..." : initialData ? "Update Gateway" : "Add Gateway"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
