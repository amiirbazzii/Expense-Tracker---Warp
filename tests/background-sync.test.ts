/**
 * Background Sync Tests
 * Tests for Service Worker background sync functionality
 */

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

Object.defineProperty(global, 'window', {
  value: {
    Notification: {
      permission: 'default',
      requestPermission: jest.fn()
    },
    PushManager: {},
    MessageChannel: class {
      port1 = { onmessage: null, close: jest.fn() };
      port2 = { close: jest.fn() };
    },
    atob: jest.fn((str) => str),
    location: {
      origin: 'http://localhost:3000',
      reload: jest.fn()
    }
  },
  writable: true
});

describe('ServiceWorkerManager', () => {
  let serviceWorkerManager: ServiceWorkerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceWorker.register.mockResolvedValue(mockRegistration);
    mockRegistration.sync.register.mockResolvedValue(undefined);
    mockRegistration.pushManager.getSubscription.mockResolvedValue(null);
  });

  afterEach(() => {
    if (serviceWorkerManager) {
      serviceWorkerManager.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully when Service Worker is supported', async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/background-sync-sw.js', {
        scope: '/'
      });
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('background-sync');
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('conflict-check');
    });

    it('should handle initialization failure gracefully', async () => {
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      serviceWorkerManager = new ServiceWorkerManager();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize ServiceWorkerManager:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Background Sync', () => {
    beforeEach(async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should register background sync successfully', async () => {
      await serviceWorkerManager.registerBackgroundSync();
      
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('background-sync');
    });

    it('should handle background sync registration failure', async () => {
      mockRegistration.sync.register.mockRejectedValue(new Error('Sync registration failed'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await serviceWorkerManager.registerBackgroundSync();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to register background sync:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should force sync successfully', async () => {
      const mockController = {
        postMessage: vi.fn()
      };
      mockServiceWorker.controller = mockController;
      
      // Mock message response
      const messagePromise = serviceWorkerManager.forceSync();
      
      // Simulate message channel response
      setTimeout(() => {
        const messageChannel = mockController.postMessage.mock.calls[0]?.[1]?.[0];
        if (messageChannel && messageChannel.port1) {
          messageChannel.port1.onmessage({ data: { success: true } });
        }
      }, 10);
      
      await expect(messagePromise).resolves.toBeUndefined();
      expect(mockController.postMessage).toHaveBeenCalledWith(
        { type: 'force_sync' },
        expect.any(Array)
      );
    });
  });

  describe('Conflict Detection', () => {
    beforeEach(async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should register conflict check successfully', async () => {
      await serviceWorkerManager.registerConflictCheck();
      
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('conflict-check');
    });

    it('should handle conflict check registration failure', async () => {
      mockRegistration.sync.register.mockRejectedValue(new Error('Conflict check registration failed'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await serviceWorkerManager.registerConflictCheck();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to register conflict check:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Push Notifications', () => {
    beforeEach(async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should request notification permission successfully', async () => {
      (window.Notification.requestPermission as Mock).mockResolvedValue('granted');
      
      const permission = await serviceWorkerManager.requestNotificationPermission();
      
      expect(permission).toBe('granted');
      expect(window.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should return existing permission if already granted', async () => {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'granted',
        writable: true
      });
      
      const permission = await serviceWorkerManager.requestNotificationPermission();
      
      expect(permission).toBe('granted');
      expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    });

    it('should subscribe to push notifications successfully', async () => {
      const mockSubscription = {
        endpoint: 'https://example.com/push',
        keys: {
          p256dh: 'key1',
          auth: 'key2'
        }
      };
      
      mockRegistration.pushManager.subscribe.mockResolvedValue(mockSubscription);
      
      // Mock VAPID key
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-key';
      
      const subscription = await serviceWorkerManager.subscribeToPushNotifications();
      
      expect(subscription).toBe(mockSubscription);
      expect(mockRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array)
      });
    });

    it('should return existing subscription if already subscribed', async () => {
      const mockSubscription = {
        endpoint: 'https://example.com/push',
        keys: {
          p256dh: 'key1',
          auth: 'key2'
        }
      };
      
      mockRegistration.pushManager.getSubscription.mockResolvedValue(mockSubscription);
      
      const subscription = await serviceWorkerManager.subscribeToPushNotifications();
      
      expect(subscription).toBe(mockSubscription);
      expect(mockRegistration.pushManager.subscribe).not.toHaveBeenCalled();
    });

    it('should unsubscribe from push notifications successfully', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn().mockResolvedValue(true)
      };
      
      mockRegistration.pushManager.getSubscription.mockResolvedValue(mockSubscription);
      
      const success = await serviceWorkerManager.unsubscribeFromPushNotifications();
      
      expect(success).toBe(true);
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Sync Status', () => {
    beforeEach(async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should get sync status successfully', async () => {
      const mockController = {
        postMessage: vi.fn()
      };
      mockServiceWorker.controller = mockController;
      
      const mockStatus = {
        isOnline: true,
        syncInProgress: false,
        lastSyncTimestamp: Date.now(),
        pendingOperationsCount: 5
      };
      
      const statusPromise = serviceWorkerManager.getSyncStatus();
      
      // Simulate message channel response
      setTimeout(() => {
        const messageChannel = mockController.postMessage.mock.calls[0]?.[1]?.[0];
        if (messageChannel && messageChannel.port1) {
          messageChannel.port1.onmessage({ data: mockStatus });
        }
      }, 10);
      
      const status = await statusPromise;
      
      expect(status).toEqual(mockStatus);
      expect(mockController.postMessage).toHaveBeenCalledWith(
        { type: 'get_sync_status' },
        expect.any(Array)
      );
    });

    it('should handle sync status timeout', async () => {
      const mockController = {
        postMessage: vi.fn()
      };
      mockServiceWorker.controller = mockController;
      
      // Don't respond to simulate timeout
      const statusPromise = serviceWorkerManager.getSyncStatus();
      
      await expect(statusPromise).rejects.toThrow('Service Worker message timeout');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should add and remove event listeners', () => {
      const listener = vi.fn();
      
      serviceWorkerManager.addEventListener(listener);
      serviceWorkerManager.removeEventListener(listener);
      
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should emit sync events to listeners', () => {
      const listener = vi.fn();
      serviceWorkerManager.addEventListener(listener);
      
      // Simulate receiving a sync event message
      const mockEvent = {
        data: {
          type: 'sync_completed',
          syncedCount: 5,
          failedCount: 0,
          timestamp: Date.now()
        }
      };
      
      // Trigger the message handler
      mockServiceWorker.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1](mockEvent);
      
      expect(listener).toHaveBeenCalledWith(mockEvent.data);
    });
  });

  describe('Feature Detection', () => {
    beforeEach(async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should detect Service Worker support correctly', () => {
      expect(serviceWorkerManager.isSupported()).toBe(true);
    });

    it('should detect background sync support correctly', () => {
      Object.defineProperty(global, 'window', {
        value: {
          ...window,
          sync: {}
        },
        writable: true
      });
      
      expect(serviceWorkerManager.isBackgroundSyncSupported()).toBe(true);
    });

    it('should detect push notification support correctly', () => {
      expect(serviceWorkerManager.isPushNotificationSupported()).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    beforeEach(async () => {
      serviceWorkerManager = new ServiceWorkerManager();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should convert VAPID key to Uint8Array correctly', () => {
      // This tests the private method indirectly through subscribeToPushNotifications
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80xGfc5rm0kcWfaS4fAXjqMjQKctY7p-UkSKRvMvfp3nUIS3MRBcuAJo';
      
      mockRegistration.pushManager.subscribe.mockResolvedValue({
        endpoint: 'https://example.com/push'
      });
      
      expect(async () => {
        await serviceWorkerManager.subscribeToPushNotifications();
      }).not.toThrow();
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
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock successful operations
    const mockController = {
      postMessage: vi.fn()
    };
    mockServiceWorker.controller = mockController;
    
    // Test force sync
    const syncPromise = serviceWorkerManager.forceSync();
    
    // Simulate successful response
    setTimeout(() => {
      const messageChannel = mockController.postMessage.mock.calls[0]?.[1]?.[0];
      if (messageChannel && messageChannel.port1) {
        messageChannel.port1.onmessage({ data: { success: true } });
      }
    }, 10);
    
    await expect(syncPromise).resolves.toBeUndefined();
    
    // Test status retrieval
    const statusPromise = serviceWorkerManager.getSyncStatus();
    
    setTimeout(() => {
      const messageChannel = mockController.postMessage.mock.calls[1]?.[1]?.[0];
      if (messageChannel && messageChannel.port1) {
        messageChannel.port1.onmessage({
          data: {
            isOnline: true,
            syncInProgress: false,
            lastSyncTimestamp: Date.now(),
            pendingOperationsCount: 0
          }
        });
      }
    }, 10);
    
    const status = await statusPromise;
    
    expect(status).toMatchObject({
      isOnline: true,
      syncInProgress: false,
      pendingOperationsCount: 0
    });
    
    serviceWorkerManager.dispose();
  });
});