"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Building2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";

export interface ClientData {
  id?: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  tax_id?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  hourly_rate: number;
  currency_code: string;
  payment_terms_days: number;
  is_active: boolean;
}

interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ClientData | null;
}

export default function ClientModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ClientModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState<ClientData>({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    tax_id: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    hourly_rate: 0,
    currency_code: "INR",
    payment_terms_days: 15,
    is_active: true,
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

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      loadSettingsData();
      if (initialData) {
        setFormData({
          ...initialData,
          phone: initialData.phone || "",
          tax_id: initialData.tax_id || "",
          address_line2: initialData.address_line2 || "",
        });
      } else {
        setFormData({
          company_name: "",
          contact_person: "",
          email: "",
          phone: "",
          tax_id: "",
          address_line1: "",
          address_line2: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
          hourly_rate: 0,
          currency_code: "INR",
          payment_terms_days: 15,
          is_active: true,
        });
      }
    }
  }, [isOpen, initialData]);

  const loadSettingsData = async () => {
    try {
      const [currRes, countryRes, compRes] = await Promise.allSettled([
        api.get<CurrencyOption[]>("/settings/currencies"),
        api.get<string[]>("/settings/countries"),
        api.get<{ address?: string }>("/settings/company"),
      ]);

      if (currRes.status === "fulfilled" && currRes.value && currRes.value.length > 0) {
        setCurrencies(currRes.value);
        if (!initialData && !formData.currency_code) {
          setFormData((prev) => ({ ...prev, currency_code: currRes.value[0].code }));
        }
      }

      let loadedCountries: string[] = [];
      if (countryRes.status === "fulfilled" && countryRes.value && countryRes.value.length > 0) {
        loadedCountries = countryRes.value;
        setCountries(countryRes.value);
      }

      if (!initialData) {
        let defaultCountry = loadedCountries[0] || "India";
        if (compRes.status === "fulfilled" && compRes.value?.address) {
          const parts = compRes.value.address.split(",").map((s) => s.trim());
          const candidate = parts[parts.length - 1];
          if (candidate) defaultCountry = candidate;
        }
        setFormData((prev) => ({
          ...prev,
          country: prev.country || defaultCountry,
        }));
      }
    } catch {
      setCurrencies([
        { code: "INR", symbol: "₹", name: "Indian Rupee" },
        { code: "USD", symbol: "$", name: "US Dollar" },
        { code: "EUR", symbol: "€", name: "Euro" },
        { code: "GBP", symbol: "£", name: "British Pound" },
      ]);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "hourly_rate" || name === "payment_terms_days") {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        phone: formData.phone?.trim() || null,
        tax_id: formData.tax_id?.trim() || null,
        address_line2: formData.address_line2?.trim() || null,
      };

      if (initialData?.id) {
        await api.put(`/clients/${initialData.id}`, payload);
      } else {
        await api.post("/clients", payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save client.");
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
          maxWidth: "640px",
          maxHeight: "88vh",
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
            <Building2 size={18} style={{ color: "var(--accent-blue)" }} />
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0, letterSpacing: "-0.2px" }}>
              {initialData ? "Edit Client" : "Register New Client"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="finance-button-secondary"
            style={{ padding: "6px" }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Modal Body Form */}
        <form
          id="client-form"
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {errorMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(244, 63, 94, 0.08)",
                border: "1px solid var(--accent-rose)",
                color: "var(--accent-rose)",
                fontSize: "13px",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Business Identity */}
          <div>
            <div
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--text-dim)",
                fontWeight: 600,
                marginBottom: "10px",
              }}
            >
              Business Information
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company_name"
                  required
                  placeholder="e.g. Acme Innovations Corp"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="finance-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contact_person"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={formData.contact_person}
                  onChange={handleChange}
                  className="finance-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Work Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="billing@acme.corp"
                  value={formData.email}
                  onChange={handleChange}
                  className="finance-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  placeholder="+1 (555) 019-2834"
                  value={formData.phone || ""}
                  onChange={handleChange}
                  className="finance-input"
                />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Tax ID / GSTIN / VAT / EIN
                </label>
                <input
                  type="text"
                  name="tax_id"
                  placeholder="e.g. 29AAAAA0000A1Z5 or US-EIN-9928374"
                  value={formData.tax_id || ""}
                  onChange={handleChange}
                  className="finance-input"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Address */}
          <div>
            <div
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--text-dim)",
                fontWeight: 600,
                marginBottom: "10px",
              }}
            >
              Billing Address
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Address Line 1 (Street name & number) *
                </label>
                <input
                  type="text"
                  name="address_line1"
                  required
                  placeholder="e.g. 742 Evergreen Terrace"
                  value={formData.address_line1}
                  onChange={handleChange}
                  className="finance-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Address Line 2 (Apt, suite, unit) — Optional
                </label>
                <input
                  type="text"
                  name="address_line2"
                  placeholder="e.g. Suite 402, Building B"
                  value={formData.address_line2 || ""}
                  onChange={handleChange}
                  className="finance-input"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    City / Town *
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    placeholder="Springfield"
                    value={formData.city}
                    onChange={handleChange}
                    className="finance-input"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    State / Region *
                  </label>
                  <input
                    type="text"
                    name="state"
                    required
                    placeholder="Oregon"
                    value={formData.state}
                    onChange={handleChange}
                    className="finance-input"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    ZIP / Postal Code *
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    required
                    placeholder="97477"
                    value={formData.postal_code}
                    onChange={handleChange}
                    className="finance-input"
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Country *
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    Select or type custom
                  </span>
                </div>
                <input
                  type="text"
                  name="country"
                  list="countries-datalist"
                  required
                  placeholder="Select or enter country..."
                  value={formData.country}
                  onChange={handleChange}
                  className="finance-input"
                  autoComplete="country-name"
                />
                <datalist id="countries-datalist">
                  {countries.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Section 3: Commercial & Billing Terms */}
          <div>
            <div
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--text-dim)",
                fontWeight: 600,
                marginBottom: "10px",
              }}
            >
              Commercial Terms
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Currency *
                </label>
                <select
                  name="currency_code"
                  value={formData.currency_code}
                  onChange={handleChange}
                  className="finance-input mono"
                  style={{ cursor: "pointer" }}
                >
                  {currencies.map((curr) => (
                    <option
                      key={curr.code}
                      value={curr.code}
                      style={{ background: "var(--bg-surface)", color: "var(--text-main)" }}
                    >
                      {curr.code} ({curr.symbol}) — {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Hourly Rate
                </label>
                <input
                  type="number"
                  name="hourly_rate"
                  step="0.5"
                  min="0"
                  placeholder="0.00"
                  value={formData.hourly_rate}
                  onChange={handleChange}
                  className="finance-input mono"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Payment Terms (Days)
                </label>
                <input
                  type="number"
                  name="payment_terms_days"
                  min="0"
                  max="365"
                  placeholder="15"
                  value={formData.payment_terms_days}
                  onChange={handleChange}
                  className="finance-input mono"
                />
              </div>
            </div>

            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                style={{ cursor: "pointer" }}
              />
              <label htmlFor="is_active" style={{ fontSize: "13px", cursor: "pointer" }}>
                Active Client (Available for new projects, logs, and invoices)
              </label>
            </div>
          </div>
        </form>

        {/* Pinned Modal Footer (Always visible, never scrolled away) */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
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
            form="client-form"
            disabled={submitting}
            className="finance-button-primary"
            style={{ width: "auto", minWidth: "120px" }}
          >
            {submitting ? "Saving..." : initialData ? "Save Changes" : "Register Client"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
