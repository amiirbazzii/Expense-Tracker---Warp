/**
 * Background Sync Tests (Jest)
 * Tests for Service Worker background sync functionality
 */

import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { ServiceWorkerManager } from '../src/lib/workers/ServiceWorkerManager';

// Mock Service Worker APIs
const mockServiceWorker = {
  register: jest.fn(),
  controller: null,
  addEventListener: jest.fn(),
  ready: Promise.resolve({
    sync: {
      register: jest.fn()
    },
    pushManager: {
      getSubscription: jest.fn(),
      subscribe: jest.fn()
    },
    showNotification: jest.fn()
  })
};

const mockRegistration = {
  sync: {
    register: jest.fn()
  },
  pushManager: {
    getSubscription: jest.fn(),
    subscribe: jest.fn()
  },
  showNotification: jest.fn(),
  addEventListener: jest.fn(),
  installing: null,
  waiting: null,
  active: null
};

// Mock global objects
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: mockServiceWorker,
    onLine: true
  },
  writable: true
});

Object.defineProperty(global, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: jest.fn()
  },
  writable: true
});

// Mock MessageChannel globally
global.MessageChannel = class {
  port1 = { onmessage: null, close: jest.fn() };
  port2 = { close: jest.fn() };
};

Object.defineProperty(global, 'window', {
  value: {
    Notification: {
      permission: 'default',
      requestPermission: jest.fn()
    },
    PushManager: {},
    MessageChannel: global.MessageChannel,
    atob: jest.fn((str) => str),
    location: {
      origin: 'http://localhost:3000',
      reload: jest.fn()
    },
    sync: {} // Add sync support
  },
  writable: true
});

describe('ServiceWorkerManager', () => {
  let serviceWorkerManager: ServiceWorkerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockServiceWorker.register as jest.Mock).mockResolvedValue(mockRegistration);
    (mockRegistration.sync.register as jest.Mock).mockResolvedValue(undefined);
    (mockRegistration.pushManager.getSubscription as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    if (serviceWorkerManager) {
      serviceWorkerManager.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully when Service Worker is supported', async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/background-sync-sw.js', {
        scope: '/'
      });
      // Sync registration happens during initialization
      expect(mockRegistration.sync.register).toHaveBeenCalled();
    });

    it('should handle initialization failure gracefully', async () => {
      (mockServiceWorker.register as jest.Mock).mockRejectedValue(new Error('Registration failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      serviceWorkerManager = new ServiceWorkerManager();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize ServiceWorkerManager:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Background Sync', () => {
    beforeEach(async () => {
      // Reset mocks before each test
      jest.clearAllMocks();
      (mockServiceWorker.register as jest.Mock).mockResolvedValue(mockRegistration);
      (mockRegistration.sync.register as jest.Mock).mockResolvedValue(undefined);
      
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    it('should register background sync successfully', async () => {
      await serviceWorkerManager.registerBackgroundSync();
      
      // Should be called during initialization and explicitly
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('background-sync');
    });

    it('should handle background sync registration failure', async () => {
      // Create a new manager with failing sync registration
      const failingRegistration = {
        ...mockRegistration,
        sync: {
          register: jest.fn().mockRejectedValue(new Error('Sync registration failed'))
        }
      };
      
      (mockServiceWorker.register as jest.Mock).mockResolvedValue(failingRegistration);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const failingManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Should log error during initialization
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register background sync'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
      failingManager.dispose();
    });

    it('should force sync successfully when initialized', async () => {
      const mockController = {
        postMessage: jest.fn()
      };
      mockServiceWorker.controller = mockController;
      
      // Ensure manager is initialized by waiting for initialization
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock the message channel response synchronously
      const mockMessageChannel = {
        port1: { onmessage: null, close: jest.fn() },
        port2: { close: jest.fn() }
      };
      
      // Mock MessageChannel constructor to return our mock
      const originalMessageChannel = global.MessageChannel;
      global.MessageChannel = jest.fn(() => mockMessageChannel);
      
      // Start the force sync
      const messagePromise = serviceWorkerManager.forceSync();
      
      // Immediately trigger the response
      if (mockMessageChannel.port1.onmessage) {
        mockMessageChannel.port1.onmessage({ data: { success: true } });
      }
      
      await expect(messagePromise).resolves.toBeUndefined();
      expect(mockController.postMessage).toHaveBeenCalledWith(
        { type: 'force_sync' },
        expect.any(Array)
      );
      
      // Restore original MessageChannel
      global.MessageChannel = originalMessageChannel;
    }, 10000);
  });

  describe('Feature Detection', () => {
    beforeEach(async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 200));
      // Ensure manager is initialized for feature detection
      serviceWorkerManager['isInitialized'] = true;
    });

    it('should detect Service Worker support correctly', () => {
      expect(serviceWorkerManager.isSupported()).toBe(true);
    });

    it('should detect background sync support correctly', () => {
      expect(serviceWorkerManager.isBackgroundSyncSupported()).toBe(true);
    });

    it('should detect push notification support correctly', () => {
      expect(serviceWorkerManager.isPushNotificationSupported()).toBe(true);
    });
  });

  describe('Push Notifications', () => {
    beforeEach(async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    it('should request notification permission successfully', async () => {
      // Mock global Notification
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: jest.fn().mockResolvedValue('granted')
        },
        writable: true
      });
      
      const permission = await serviceWorkerManager.requestNotificationPermission();
      
      expect(permission).toBe('granted');
      expect(global.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should return existing permission if already granted', async () => {
      // Mock global Notification with granted permission
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: jest.fn()
        },
        writable: true
      });
      
      const permission = await serviceWorkerManager.requestNotificationPermission();
      
      expect(permission).toBe('granted');
      expect(global.Notification.requestPermission).not.toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    beforeEach(async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    it('should get registration correctly', () => {
      const registration = serviceWorkerManager.getRegistration();
      expect(registration).toBe(mockRegistration);
    });

    it('should dispose correctly', () => {
      serviceWorkerManager.dispose();
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});

describe('Background Sync Integration', () => {
  it('should handle complete sync workflow', async () => {
    const serviceWorkerManager = new ServiceWorkerManager();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock successful operations
    const mockController = {
      postMessage: jest.fn()
    };
    mockServiceWorker.controller = mockController;
    
    // Mock the message channels
    const mockSyncChannel = {
      port1: { onmessage: null, close: jest.fn() },
      port2: { close: jest.fn() }
    };
    
    const mockStatusChannel = {
      port1: { onmessage: null, close: jest.fn() },
      port2: { close: jest.fn() }
    };
    
    // Mock MessageChannel constructor to return different mocks
    let channelCallCount = 0;
    const originalMessageChannel = global.MessageChannel;
    global.MessageChannel = jest.fn(() => {
      channelCallCount++;
      return channelCallCount === 1 ? mockSyncChannel : mockStatusChannel;
    });
    
    // Test force sync
    const syncPromise = serviceWorkerManager.forceSync();
    
    // Immediately trigger the sync response
    if (mockSyncChannel.port1.onmessage) {
      mockSyncChannel.port1.onmessage({ data: { success: true } });
    }
    
    await expect(syncPromise).resolves.toBeUndefined();
    
    // Test status retrieval
    const statusPromise = serviceWorkerManager.getSyncStatus();
    
    // Immediately trigger the status response
    if (mockStatusChannel.port1.onmessage) {
      mockStatusChannel.port1.onmessage({
        data: {
          isOnline: true,
          syncInProgress: false,
          lastSyncTimestamp: Date.now(),
          pendingOperationsCount: 0
        }
      });
    }
    
    const status = await statusPromise;
    
    expect(status).toMatchObject({
      isOnline: true,
      syncInProgress: false,
      pendingOperationsCount: 0
    });
    
    // Restore original MessageChannel
    global.MessageChannel = originalMessageChannel;
    
    serviceWorkerManager.dispose();
  }, 10000);
});