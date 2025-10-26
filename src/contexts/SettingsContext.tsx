"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "./AuthContext";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { offlineTokenManager, OfflineUserSettings } from "@/lib/auth/OfflineTokenManager";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export type Currency = Doc<"userSettings">["currency"];
export type Calendar = Doc<"userSettings">["calendar"];
export type Language = Doc<"userSettings">["language"];

interface SettingsContextType {
  settings: Doc<"userSettings"> | null | undefined;
  updateSettings: (args: { currency?: Currency; calendar?: Calendar; language?: Language }) => Promise<void>;
  isLoading: boolean;
  isUsingOfflineSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { token, isOfflineMode } = useAuth();
  const isOnline = useOnlineStatus();
  const [offlineSettings, setOfflineSettings] = useState<OfflineUserSettings | null>(null);
  const [isUsingOfflineSettings, setIsUsingOfflineSettings] = useState(false);
  
  // Fetch settings from Convex (online)
  let onlineSettings;
  try {
    onlineSettings = useQuery(api.userSettings.get, token ? { token } : "skip");
  } catch (error) {
    console.error('Settings query error:', error);
    onlineSettings = null;
  }
  
  const updateMutation = useMutation(api.userSettings.update);

  // Load offline settings on mount
  useEffect(() => {
    const loadOfflineSettings = async () => {
      try {
        const cached = await offlineTokenManager.getOfflineSettings();
        if (cached) {
          setOfflineSettings(cached);
          console.log('Loaded offline settings:', cached);
        }
      } catch (error) {
        console.error('Failed to load offline settings:', error);
      }
    };

    loadOfflineSettings();
  }, []);

  // Save settings to offline storage when online settings change
  useEffect(() => {
    const saveOfflineSettings = async () => {
      if (onlineSettings) {
        const settingsToCache: OfflineUserSettings = {
          currency: onlineSettings.currency,
          calendar: onlineSettings.calendar,
          language: onlineSettings.language
        };
        
        try {
          // Also update the offline token with settings
          const token = await offlineTokenManager.getToken();
          if (token && !token.settings) {
            // First time saving settings to token
            await offlineTokenManager.saveToken(
              token.userId,
              token.username,
              await offlineTokenManager.getDecryptedAuthToken() || '',
              token.avatar,
              settingsToCache
            );
          } else {
            // Just update settings
            await offlineTokenManager.updateOfflineSettings(settingsToCache);
          }
          
          setOfflineSettings(settingsToCache);
          console.log('Settings cached for offline use');
        } catch (error) {
          console.error('Failed to cache settings:', error);
        }
      }
    };

    saveOfflineSettings();
  }, [onlineSettings]);

  // Determine which settings to use
  const effectiveSettings = onlineSettings || (offlineSettings ? {
    _id: 'offline' as any,
    _creationTime: Date.now(),
    userId: 'offline',
    currency: offlineSettings.currency,
    calendar: offlineSettings.calendar,
    language: offlineSettings.language
  } : null);

  // Track if we're using offline settings
  useEffect(() => {
    setIsUsingOfflineSettings(!onlineSettings && !!offlineSettings);
  }, [onlineSettings, offlineSettings]);

  const updateSettings = async (args: { currency?: Currency; calendar?: Calendar; language?: Language }) => {
    if (!token) {
      console.error("Authentication token not found. Cannot update settings.");
      return;
    }
    
    try {
      // Update online if possible
      if (isOnline) {
        await updateMutation({ ...args, token });
      }
      
      // Always update offline cache
      const currentSettings = offlineSettings || {
        currency: 'USD' as Currency,
        calendar: 'gregorian' as Calendar,
        language: 'en' as Language
      };
      
      const updatedSettings: OfflineUserSettings = {
        ...currentSettings,
        ...args
      };
      
      await offlineTokenManager.updateOfflineSettings(updatedSettings);
      setOfflineSettings(updatedSettings);
      
      if (!isOnline) {
        console.log('Settings updated offline, will sync when online');
      }
    } catch (error) {
      console.error("Failed to update settings", error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings: effectiveSettings,
        updateSettings,
        isLoading: onlineSettings === undefined && offlineSettings === null,
        isUsingOfflineSettings,
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
