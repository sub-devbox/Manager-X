"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isInitialized: boolean | null;
  showSettings: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setUser: (user: AuthUser | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const meUser = await api.get<AuthUser>("/auth/me");
      setUser(meUser);
      setIsInitialized(true);
    } catch {
      setUser(null);
      try {
        const status = await api.get<{ initialized: boolean }>("/auth/status");
        setIsInitialized(status.initialized);
      } catch {
        setIsInitialized(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isInitialized,
        showSettings,
        openSettings: () => setShowSettings(true),
        closeSettings: () => setShowSettings(false),
        setUser,
        checkAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
