import { OfflineTokenManager } from '../src/lib/auth/OfflineTokenManager';
import 'fake-indexeddb/auto';

describe('OfflineTokenManager', () => {
  let tokenManager: OfflineTokenManager;

  beforeEach(() => {
    // Clear localStorage before creating token manager
    localStorage.clear();
    tokenManager = new OfflineTokenManager();
  });

  afterEach(async () => {
    // Clean up after each test
    await tokenManager.clearToken();
  });

  describe('Token Storage', () => {
    it('should save and retrieve an offline token', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';
      const avatar = 'https://example.com/avatar.jpg';

      await tokenManager.saveToken(userId, username, authToken, avatar);

      const token = await tokenManager.getToken();
      expect(token).not.toBeNull();
      expect(token?.userId).toBe(userId);
      expect(token?.username).toBe(username);
      expect(token?.avatar).toBe(avatar);
      expect(token?.encryptedToken).toBeDefined();
      expect(token?.encryptedToken).not.toBe(authToken); // Should be encrypted
    });

    it('should decrypt the auth token correctly', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      const decryptedToken = await tokenManager.getDecryptedAuthToken();
      expect(decryptedToken).toBe(authToken);
    });

    it('should return null when no token exists', async () => {
      const token = await tokenManager.getToken();
      expect(token).toBeNull();

      const decryptedToken = await tokenManager.getDecryptedAuthToken();
      expect(decryptedToken).toBeNull();
    });

    it('should clear the token', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);
      let token = await tokenManager.getToken();
      expect(token).not.toBeNull();

      await tokenManager.clearToken();
      token = await tokenManager.getToken();
      expect(token).toBeNull();
    });
  });

  describe('Token Validation', () => {
    it('should validate a fresh token as valid', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      const validation = await tokenManager.validateToken();
      expect(validation.isValid).toBe(true);
      expect(validation.isExpired).toBe(false);
      expect(validation.isInGracePeriod).toBe(false);
      expect(validation.daysUntilExpiry).toBeGreaterThan(0);
    });

    it('should return invalid when no token exists', async () => {
      const validation = await tokenManager.validateToken();
      expect(validation.isValid).toBe(false);
      expect(validation.isExpired).toBe(false);
      expect(validation.isInGracePeriod).toBe(false);
      expect(validation.daysUntilExpiry).toBe(0);
    });

    it('should detect expired tokens', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      // Manually expire the token beyond grace period
      const token = await tokenManager.getToken();
      if (token) {
        token.expiresAt = Date.now() - (5 * 24 * 60 * 60 * 1000); // Expired 5 days ago (beyond grace period)
        await (tokenManager as any).storage.setItem((tokenManager as any).STORAGE_KEY, token);
      }

      const validation = await tokenManager.validateToken();
      expect(validation.isExpired).toBe(true);
      expect(validation.isValid).toBe(false);
    });

    it('should detect grace period tokens', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      // Set token to be expired but within grace period
      const token = await tokenManager.getToken();
      if (token) {
        token.expiresAt = Date.now() - (24 * 60 * 60 * 1000); // Expired 1 day ago
        await (tokenManager as any).storage.setItem((tokenManager as any).STORAGE_KEY, token);
      }

      const validation = await tokenManager.validateToken();
      expect(validation.isExpired).toBe(true);
      expect(validation.isInGracePeriod).toBe(true);
      expect(validation.isValid).toBe(true); // Still valid because in grace period
    });

    it('should detect tokens beyond grace period', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      // Set token to be expired beyond grace period
      const token = await tokenManager.getToken();
      if (token) {
        token.expiresAt = Date.now() - (5 * 24 * 60 * 60 * 1000); // Expired 5 days ago
        await (tokenManager as any).storage.setItem((tokenManager as any).STORAGE_KEY, token);
      }

      const validation = await tokenManager.validateToken();
      expect(validation.isExpired).toBe(true);
      expect(validation.isInGracePeriod).toBe(false);
      expect(validation.isValid).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    it('should update last validated timestamp', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      const tokenBefore = await tokenManager.getToken();
      const lastValidatedBefore = tokenBefore?.lastValidated || 0;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await tokenManager.updateLastValidated();

      const tokenAfter = await tokenManager.getToken();
      const lastValidatedAfter = tokenAfter?.lastValidated || 0;

      expect(lastValidatedAfter).toBeGreaterThan(lastValidatedBefore);
    });

    it('should refresh token expiry', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      const tokenBefore = await tokenManager.getToken();
      const expiresAtBefore = tokenBefore?.expiresAt || 0;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await tokenManager.refreshToken();

      const tokenAfter = await tokenManager.getToken();
      const expiresAtAfter = tokenAfter?.expiresAt || 0;

      expect(expiresAtAfter).toBeGreaterThan(expiresAtBefore);
    });
  });

  describe('Offline Login Check', () => {
    it('should allow offline login with valid token', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      const canLogin = await tokenManager.canLoginOffline();
      expect(canLogin).toBe(true);
    });

    it('should not allow offline login without token', async () => {
      const canLogin = await tokenManager.canLoginOffline();
      expect(canLogin).toBe(false);
    });

    it('should not allow offline login with expired token beyond grace period', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      // Expire token beyond grace period
      const token = await tokenManager.getToken();
      if (token) {
        token.expiresAt = Date.now() - (10 * 24 * 60 * 60 * 1000); // Expired 10 days ago
        await (tokenManager as any).storage.setItem((tokenManager as any).STORAGE_KEY, token);
      }

      const canLogin = await tokenManager.canLoginOffline();
      expect(canLogin).toBe(false);
    });
  });

  describe('User Info Retrieval', () => {
    it('should retrieve offline user info', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';
      const avatar = 'https://example.com/avatar.jpg';

      await tokenManager.saveToken(userId, username, authToken, avatar);

      const userInfo = await tokenManager.getOfflineUserInfo();
      expect(userInfo).not.toBeNull();
      expect(userInfo?.userId).toBe(userId);
      expect(userInfo?.username).toBe(username);
      expect(userInfo?.avatar).toBe(avatar);
    });

    it('should return null when no token exists', async () => {
      const userInfo = await tokenManager.getOfflineUserInfo();
      expect(userInfo).toBeNull();
    });
  });

  describe('Device ID Generation', () => {
    it('should generate a device ID for tokens', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      const token = await tokenManager.getToken();
      const deviceId = token?.deviceId;

      // Device ID should be generated and attached to token
      expect(deviceId).toBeDefined();
      expect(deviceId).toMatch(/^device_/);
      expect(typeof deviceId).toBe('string');
    });
  });

  describe('Timeout Behavior', () => {
    it('should handle 2-second timeout scenario', async () => {
      // This test simulates the Promise.race behavior in AuthContext
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      // Simulate slow validation
      const slowValidation = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(true), 3000); // Takes 3 seconds
      });

      const timeout = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 2000); // 2 second timeout
      });

      const result = await Promise.race([slowValidation, timeout]);
      
      // Should timeout and return false
      expect(result).toBe(false);

      // Token should still be valid for offline use
      const canLogin = await tokenManager.canLoginOffline();
      expect(canLogin).toBe(true);
    });

    it('should handle fast validation within timeout', async () => {
      const userId = 'user123';
      const username = 'testuser';
      const authToken = 'test-auth-token-123';

      await tokenManager.saveToken(userId, username, authToken);

      // Simulate fast validation
      const fastValidation = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(true), 500); // Takes 0.5 seconds
      });

      const timeout = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 2000); // 2 second timeout
      });

      const result = await Promise.race([fastValidation, timeout]);
      
      // Should complete before timeout
      expect(result).toBe(true);
    });
  });
});
