import localforage from 'localforage';
import CryptoJS from 'crypto-js';

/**
 * Offline token structure stored in IndexedDB
 */
export interface OfflineToken {
  userId: string;
  username: string;
  avatar?: string;
  encryptedToken: string;
  issuedAt: number;
  expiresAt: number;
  lastValidated: number;
  deviceId: string;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  isInGracePeriod: boolean;
  daysUntilExpiry: number;
  token?: OfflineToken;
}

/**
 * OfflineTokenManager handles secure storage and validation of offline authentication tokens
 * Uses IndexedDB for persistence and encryption for security
 */
export class OfflineTokenManager {
  private storage: typeof localforage;
  private readonly STORAGE_KEY = 'offline_auth_token';
  private readonly ENCRYPTION_KEY = 'offline_token_encryption_key_v1'; // In production, use a more secure key
  private readonly TOKEN_EXPIRY_DAYS = 30;
  private readonly GRACE_PERIOD_DAYS = 3;

  constructor() {
    this.storage = localforage.createInstance({
      name: 'ExpenseTrackerAuth',
      storeName: 'offline_tokens',
      description: 'Secure offline authentication tokens'
    });
  }

  /**
   * Generate a unique device ID for this browser/device
   */
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Encrypt sensitive token data
   */
  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
  }

  /**
   * Decrypt token data
   */
  private decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Save an offline token after successful online login
   */
  async saveToken(
    userId: string,
    username: string,
    authToken: string,
    avatar?: string
  ): Promise<void> {
    try {
      const now = Date.now();
      const expiresAt = now + (this.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      const offlineToken: OfflineToken = {
        userId,
        username,
        avatar,
        encryptedToken: this.encrypt(authToken),
        issuedAt: now,
        expiresAt,
        lastValidated: now,
        deviceId: this.generateDeviceId()
      };

      await this.storage.setItem(this.STORAGE_KEY, offlineToken);
      console.log('Offline token saved successfully');
    } catch (error) {
      console.error('Failed to save offline token:', error);
      throw error;
    }
  }

  /**
   * Get the stored offline token
   */
  async getToken(): Promise<OfflineToken | null> {
    try {
      const token = await this.storage.getItem<OfflineToken>(this.STORAGE_KEY);
      return token;
    } catch (error) {
      console.error('Failed to retrieve offline token:', error);
      return null;
    }
  }

  /**
   * Get the decrypted auth token
   */
  async getDecryptedAuthToken(): Promise<string | null> {
    try {
      const offlineToken = await this.getToken();
      if (!offlineToken) return null;

      return this.decrypt(offlineToken.encryptedToken);
    } catch (error) {
      console.error('Failed to decrypt auth token:', error);
      return null;
    }
  }

  /**
   * Validate the offline token
   */
  async validateToken(): Promise<TokenValidationResult> {
    const token = await this.getToken();

    if (!token) {
      return {
        isValid: false,
        isExpired: false,
        isInGracePeriod: false,
        daysUntilExpiry: 0
      };
    }

    const now = Date.now();
    const isExpired = now > token.expiresAt;
    const gracePeriodEnd = token.expiresAt + (this.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const isInGracePeriod = isExpired && now <= gracePeriodEnd;
    const daysUntilExpiry = Math.ceil((token.expiresAt - now) / (24 * 60 * 60 * 1000));

    return {
      isValid: !isExpired || isInGracePeriod,
      isExpired,
      isInGracePeriod,
      daysUntilExpiry,
      token
    };
  }

  /**
   * Update the last validated timestamp
   */
  async updateLastValidated(): Promise<void> {
    try {
      const token = await this.getToken();
      if (token) {
        token.lastValidated = Date.now();
        await this.storage.setItem(this.STORAGE_KEY, token);
      }
    } catch (error) {
      console.error('Failed to update last validated timestamp:', error);
    }
  }

  /**
   * Refresh the token expiry after successful online validation
   */
  async refreshToken(): Promise<void> {
    try {
      const token = await this.getToken();
      if (token) {
        const now = Date.now();
        token.expiresAt = now + (this.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        token.lastValidated = now;
        await this.storage.setItem(this.STORAGE_KEY, token);
        console.log('Offline token refreshed successfully');
      }
    } catch (error) {
      console.error('Failed to refresh offline token:', error);
    }
  }

  /**
   * Clear the offline token (on logout)
   */
  async clearToken(): Promise<void> {
    try {
      await this.storage.removeItem(this.STORAGE_KEY);
      console.log('Offline token cleared');
    } catch (error) {
      console.error('Failed to clear offline token:', error);
    }
  }

  /**
   * Check if user can login offline
   */
  async canLoginOffline(): Promise<boolean> {
    const validation = await this.validateToken();
    return validation.isValid;
  }

  /**
   * Get user info from offline token
   */
  async getOfflineUserInfo(): Promise<{ userId: string; username: string; avatar?: string } | null> {
    const token = await this.getToken();
    if (!token) return null;

    return {
      userId: token.userId,
      username: token.username,
      avatar: token.avatar
    };
  }
}

// Singleton instance
export const offlineTokenManager = new OfflineTokenManager();
