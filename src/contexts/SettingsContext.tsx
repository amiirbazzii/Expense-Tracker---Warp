"use client";

import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "./AuthContext";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";

export type Currency = Doc<"userSettings">["currency"];
export type Calendar = Doc<"userSettings">["calendar"];
export type Language = Doc<"userSettings">["language"];

interface SettingsContextType {
  settings: Doc<"userSettings"> | null | undefined;
  updateSettings: (args: { currency?: Currency; calendar?: Calendar; language?: Language }) => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  
  // Add error handling for the settings query
  let settings;
  try {
    settings = useQuery(api.userSettings.get, token ? { token } : "skip");
  } catch (error) {
    console.error('Settings query error:', error);
    settings = null;
  }
  
  const updateMutation = useMutation(api.userSettings.update);

  const updateSettings = async (args: { currency?: Currency; calendar?: Calendar; language?: Language }) => {
    if (!token) {
      console.error("Authentication token not found. Cannot update settings.");
      return;
    }
    try {
      await updateMutation({ ...args, token });
    } catch (error) {
      console.error("Failed to update settings", error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        isLoading: settings === undefined,
      }}
    >
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
