"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Building2, ChevronDown, Search, X, Check } from "lucide-react";

interface ClientOption {
  id: string;
  company_name: string;
}

interface SearchableClientSelectProps {
  clients: ClientOption[];
  value: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
  width?: string;
}

export default function SearchableClientSelect({
  clients,
  value,
  onChange,
  placeholder = "All Clients",
  width = "210px",
}: SearchableClientSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedClient = useMemo(() => {
    if (value === "all" || !value) return null;
    return clients.find((c) => c.id === value) || null;
  }, [clients, value]);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) => c.company_name.toLowerCase().includes(q));
  }, [clients, search]);

  const handleSelect = (clientId: string) => {
    onChange(clientId);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("all");
    setSearch("");
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width,
        minWidth: "180px",
        userSelect: "none",
      }}
    >
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="finance-input"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "36px",
          padding: "0 10px",
          cursor: "pointer",
          gap: "8px",
          borderColor: isOpen ? "var(--accent-blue)" : undefined,
          background: "var(--bg-surface)",
        }}
        title={selectedClient ? `Client: ${selectedClient.company_name}` : placeholder}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", flex: 1 }}>
          <Building2
            size={13}
            style={{
              color: selectedClient ? "var(--accent-blue)" : "var(--text-dim)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: selectedClient ? "var(--text-main)" : "var(--text-muted)",
              fontWeight: selectedClient ? 500 : 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selectedClient ? selectedClient.company_name : placeholder}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          {selectedClient && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                borderRadius: "50%",
              }}
              title="Clear client filter"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={12}
            style={{
              color: "var(--text-dim)",
              transform: isOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.15s ease",
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="finance-panel animate-fade-in"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            minWidth: "240px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search Box inside dropdown */}
          <div
            style={{
              padding: "8px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-surface-subtle)",
            }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={12}
                style={{
                  position: "absolute",
                  left: "9px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-dim)",
                }}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="finance-input"
                style={{
                  width: "100%",
                  height: "28px",
                  paddingLeft: "26px",
                  fontSize: "11.5px",
                }}
              />
            </div>
          </div>

          {/* Options List */}
          <div style={{ maxHeight: "200px", overflowY: "auto", padding: "4px" }}>
            {/* All Clients Option */}
            <div
              onClick={() => handleSelect("all")}
              style={{
                padding: "7px 10px",
                borderRadius: "var(--radius-xs)",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: value === "all" ? "var(--bg-surface-subtle)" : "transparent",
                color: value === "all" ? "var(--accent-blue)" : "var(--text-main)",
                fontWeight: value === "all" ? 600 : 400,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-subtle)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = value === "all" ? "var(--bg-surface-subtle)" : "transparent")
              }
            >
              <span>{placeholder}</span>
              {value === "all" && <Check size={12} style={{ color: "var(--accent-blue)" }} />}
            </div>

            {/* Filtered Clients */}
            {filteredClients.map((client) => {
              const isSelected = value === client.id;
              return (
                <div
                  key={client.id}
                  onClick={() => handleSelect(client.id)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "var(--radius-xs)",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: isSelected ? "var(--bg-surface-subtle)" : "transparent",
                    color: isSelected ? "var(--accent-blue)" : "var(--text-main)",
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-subtle)")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isSelected ? "var(--bg-surface-subtle)" : "transparent")
                  }
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {client.company_name}
                  </span>
                  {isSelected && <Check size={12} style={{ color: "var(--accent-blue)" }} />}
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div
                style={{
                  padding: "12px",
                  textAlign: "center",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                }}
              >
                No clients match &quot;{search}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
