import { offlineTokenManager, OfflineUserSettings } from './OfflineTokenManager';

/**
 * Fetch settings from Convex and save to offline storage
 * This should be called after successful login or when settings change
 */
export async function syncSettingsToOffline(
  fetchSettings: () => Promise<any>
): Promise<void> {
  try {
    const settings = await fetchSettings();
    
    if (settings) {
      const offlineSettings: OfflineUserSettings = {
        currency: settings.currency || 'USD',
        calendar: settings.calendar || 'gregorian',
        language: settings.language || 'en'
      };
      
      await offlineTokenManager.updateOfflineSettings(offlineSettings);
      console.log('Settings synced to offline storage:', offlineSettings);
    }
  } catch (error) {
    console.error('Failed to sync settings to offline storage:', error);
  }
}

/**
 * Get default settings if no settings are available
 */
export function getDefaultSettings(): OfflineUserSettings {
  return {
    currency: 'USD',
    calendar: 'gregorian',
    language: 'en'
  };
}
