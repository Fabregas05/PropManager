"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabaseClient";

type Currency = "XAF" | "EUR" | "USD" | "CAD";

interface SettingsContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => Promise<void>;
  formatCurrency: (amount: number, compact?: boolean) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [currency, setCurrency] = useState<Currency>("XAF");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Sync with database profile if logged in
    if (profile?.currency) {
      setCurrency(profile.currency as Currency);
    } else {
      // Fallback to localStorage for guest view
      const saved = localStorage.getItem("propmanager_currency") as Currency;
      if (saved) setCurrency(saved);
    }
    setMounted(true);
  }, [profile]);

  const handleSetCurrency = async (newCurrency: Currency) => {
    setCurrency(newCurrency);
    localStorage.setItem("propmanager_currency", newCurrency);
    
    if (user) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ currency: newCurrency })
          .eq("id", user.id);
        if (error) {
          console.error("Failed to update profile currency:", error);
        } else {
          await refreshProfile();
        }
      } catch (err) {
        console.error("Profile currency update error:", err);
      }
    }
  };

  const formatCurrency = (amount: number, compact: boolean = false) => {
    if (!mounted) return ""; // Prevent hydration mismatch
    
    // For XAF, standard locale is fr-FR or fr-CM, but we want no decimals usually for FCFA
    const fractionDigits = currency === "XAF" ? 0 : 2;

    const formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      notation: compact ? "compact" : "standard",
    });

    return formatter.format(amount);
  };

  return (
    <SettingsContext.Provider value={{ currency, setCurrency: handleSetCurrency, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

