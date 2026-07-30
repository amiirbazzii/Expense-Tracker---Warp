"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "./AuthContext";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { offlineTokenManager, OfflineUserSettings } from "@/lib/auth/OfflineTokenManager";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { mutationQueue } from "@/lib/queue/MutationQueueManager";

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
  const [hasPendingSettings, setHasPendingSettings] = useState(false);

  // Track whether a settings change is still waiting in the sync queue.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const queued = await mutationQueue.getAll();
        if (cancelled) return;
        setHasPendingSettings(
          queued.some((m) => m.action === "userSettings:update"),
        );
      } catch {
        // Non-fatal: fall back to treating the server copy as authoritative.
      }
    };

    const unsubscribe = mutationQueue.subscribe(() => {
      void check();
    });
    void check();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
  
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
      // Don't overwrite a change that hasn't been delivered yet.
      if (onlineSettings && !hasPendingSettings) {
        const settingsToCache: OfflineUserSettings = {
          currency: onlineSettings.currency as OfflineUserSettings['currency'],
          calendar: onlineSettings.calendar as OfflineUserSettings['calendar'],
          language: (onlineSettings.language ?? 'en') as OfflineUserSettings['language'],
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
  }, [onlineSettings, hasPendingSettings]);

  // Determine which settings to use.
  //
  // While a settings change is still queued, the local copy is the truth: the
  // server has not seen the change yet, so preferring `onlineSettings` here
  // would visibly revert the user's choice on reconnect.
  const preferLocal = hasPendingSettings && offlineSettings !== null;
  const effectiveSettings = ((preferLocal ? null : onlineSettings) || (offlineSettings ? {
    _id: 'offline' as any,
    _creationTime: Date.now(),
    updatedAt: Date.now(),
    userId: '' as any,
    currency: offlineSettings.currency,
    calendar: offlineSettings.calendar,
    language: offlineSettings.language,
  } : null)) as Doc<"userSettings"> | null | undefined;

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
      // Send it now when we can; otherwise hand it to the same FIFO queue the
      // rest of the app uses so the change actually reaches the server later.
      // Previously an offline change was only cached locally and was silently
      // reverted by the server's copy on the next reconnect.
      let delivered = false;
      if (isOnline) {
        try {
          await updateMutation({ ...args, token });
          delivered = true;
        } catch (error) {
          console.warn("Settings update failed, queueing for background sync", error);
        }
      }

      if (!delivered) {
        await mutationQueue.enqueue("userSettings:update", { token, ...args });
        setHasPendingSettings(true);
      }

      // Always update offline cache
      const currentSettings = offlineSettings || {
        currency: 'USD' as Currency,
        calendar: 'gregorian' as Calendar,
        language: 'en' as Language
      };
      
      const updatedSettings: OfflineUserSettings = {
        currency: (args.currency != null ? args.currency : currentSettings.currency) as OfflineUserSettings['currency'],
        calendar: (args.calendar != null ? args.calendar : currentSettings.calendar) as OfflineUserSettings['calendar'],
        language: (args.language != null ? args.language : currentSettings.language) as OfflineUserSettings['language'],
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
