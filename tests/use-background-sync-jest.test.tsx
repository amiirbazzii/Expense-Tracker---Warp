/**
 * useBackgroundSync Hook Tests (Jest)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBackgroundSync, useSyncStatus } from '../src/hooks/useBackgroundSync';

// Mock the ServiceWorkerManager
const mockServiceWorkerManager = {
  isSupported: jest.fn(() => true),
  isBackgroundSyncSupported: jest.fn(() => true),
  isPushNotificationSupported: jest.fn(() => true),
  getSyncStatus: jest.fn(),
  forceSync: jest.fn(),
  requestNotificationPermission: jest.fn(),
  subscribeToPushNotifications: jest.fn(),
  unsubscribeFromPushNotifications: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getRegistration: jest.fn()
};

jest.mock('../src/lib/workers/ServiceWorkerManager', () => ({
  serviceWorkerManager: mockServiceWorkerManager
}));

// Mock Notification API
Object.defineProperty(global, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: jest.fn()
  },
  writable: true
});

// Mock push manager
const mockPushManager = {
  getSubscription: jest.fn()
};

const mockRegistration = {
  pushManager: mockPushManager
};

describe('useBackgroundSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockServiceWorkerManager.getSyncStatus.mockResolvedValue({
      isOnline: true,
      syncInProgress: false,
      lastSyncTimestamp: Date.now(),
      pendingOperationsCount: 0
    });
    
    mockServiceWorkerManager.getRegistration.mockReturnValue(mockRegistration);
    mockPushManager.getSubscription.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with correct default state', async () => {
      const { result } = renderHook(() => useBackgroundSync());
      
      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
        expect(result.current.isBackgroundSyncSupported).toBe(true);
        expect(result.current.isPushNotificationSupported).toBe(true);
        expect(result.current.notificationPermission).toBe('default');
        expect(result.current.isSubscribedToPush).toBe(false);
        expect(result.current.lastSyncEvent).toBe(null);
      });
    });

    it('should load sync status on initialization', async () => {
      const mockSyncStatus = {
        isOnline: true,
        syncInProgress: false,
        lastSyncTimestamp: Date.now(),
        pendingOperationsCount: 5
      };
      
      mockServiceWorkerManager.getSyncStatus.mockResolvedValue(mockSyncStatus);
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await waitFor(() => {
        expect(result.current.syncStatus).toEqual(mockSyncStatus);
      });
    });

    it('should check push subscription status on initialization', async () => {
      const mockSubscription = {
        endpoint: 'https://example.com/push'
      };
      
      mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await waitFor(() => {
        expect(result.current.isSubscribedToPush).toBe(true);
      });
    });

    it('should handle initialization errors gracefully', async () => {
      mockServiceWorkerManager.getSyncStatus.mockRejectedValue(new Error('Failed to get status'));
      mockPushManager.getSubscription.mockRejectedValue(new Error('Failed to get subscription'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
        expect(result.current.syncStatus).toBe(null);
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Sync Operations', () => {
    it('should force sync successfully', async () => {
      mockServiceWorkerManager.forceSync.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await act(async () => {
        await result.current.forceSync();
      });
      
      expect(mockServiceWorkerManager.forceSync).toHaveBeenCalled();
    });

    it('should handle force sync errors', async () => {
      const error = new Error('Sync failed');
      mockServiceWorkerManager.forceSync.mockRejectedValue(error);
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await expect(act(async () => {
        await result.current.forceSync();
      })).rejects.toThrow('Sync failed');
    });

    it('should refresh sync status', async () => {
      const initialStatus = {
        isOnline: true,
        syncInProgress: false,
        lastSyncTimestamp: Date.now() - 1000,
        pendingOperationsCount: 5
      };
      
      const updatedStatus = {
        isOnline: true,
        syncInProgress: false,
        lastSyncTimestamp: Date.now(),
        pendingOperationsCount: 0
      };
      
      mockServiceWorkerManager.getSyncStatus
        .mockResolvedValueOnce(initialStatus)
        .mockResolvedValueOnce(updatedStatus);
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await waitFor(() => {
        expect(result.current.syncStatus).toEqual(initialStatus);
      });
      
      await act(async () => {
        await result.current.refreshSyncStatus();
      });
      
      expect(result.current.syncStatus).toEqual(updatedStatus);
    });
  });

  describe('Notification Management', () => {
    it('should request notification permission successfully', async () => {
      mockServiceWorkerManager.requestNotificationPermission.mockResolvedValue('granted');
      
      const { result } = renderHook(() => useBackgroundSync());
      
      let permission: NotificationPermission;
      await act(async () => {
        permission = await result.current.requestNotificationPermission();
      });
      
      expect(permission!).toBe('granted');
      await waitFor(() => {
        expect(result.current.notificationPermission).toBe('granted');
      });
    });

    it('should subscribe to push notifications successfully', async () => {
      mockServiceWorkerManager.subscribeToPushNotifications.mockResolvedValue({
        endpoint: 'https://example.com/push'
      });
      
      const { result } = renderHook(() => useBackgroundSync());
      
      let success: boolean;
      await act(async () => {
        success = await result.current.subscribeToPushNotifications();
      });
      
      expect(success!).toBe(true);
      await waitFor(() => {
        expect(result.current.isSubscribedToPush).toBe(true);
      });
    });

    it('should unsubscribe from push notifications successfully', async () => {
      // Start with subscribed state
      mockPushManager.getSubscription.mockResolvedValue({
        endpoint: 'https://example.com/push'
      });
      
      mockServiceWorkerManager.unsubscribeFromPushNotifications.mockResolvedValue(true);
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await waitFor(() => {
        expect(result.current.isSubscribedToPush).toBe(true);
      });
      
      let success: boolean;
      await act(async () => {
        success = await result.current.unsubscribeFromPushNotifications();
      });
      
      expect(success!).toBe(true);
      expect(result.current.isSubscribedToPush).toBe(false);
    });

    it('should handle notification permission errors', async () => {
      const error = new Error('Permission denied');
      mockServiceWorkerManager.requestNotificationPermission.mockRejectedValue(error);
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await expect(act(async () => {
        await result.current.requestNotificationPermission();
      })).rejects.toThrow('Permission denied');
    });
  });

  describe('Event Handling', () => {
    it('should handle sync events from service worker', async () => {
      let eventListener: (event: any) => void;
      
      mockServiceWorkerManager.addEventListener.mockImplementation((listener) => {
        eventListener = listener;
      });
      
      const { result } = renderHook(() => useBackgroundSync());
      
      const syncEvent = {
        type: 'sync_completed',
        syncedCount: 10,
        failedCount: 0,
        timestamp: Date.now()
      };
      
      act(() => {
        eventListener!(syncEvent);
      });
      
      expect(result.current.lastSyncEvent).toEqual(syncEvent);
    });

    it('should refresh sync status after sync events', async () => {
      let eventListener: (event: any) => void;
      
      mockServiceWorkerManager.addEventListener.mockImplementation((listener) => {
        eventListener = listener;
      });
      
      const { result } = renderHook(() => useBackgroundSync());
      
      const syncEvent = {
        type: 'sync_completed',
        syncedCount: 5,
        failedCount: 0,
        timestamp: Date.now()
      };
      
      act(() => {
        eventListener!(syncEvent);
      });
      
      // Should trigger refreshSyncStatus
      await waitFor(() => {
        expect(mockServiceWorkerManager.getSyncStatus).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useBackgroundSync());
      
      unmount();
      
      expect(mockServiceWorkerManager.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('Periodic Updates', () => {
    it('should periodically refresh sync status', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useBackgroundSync());
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockServiceWorkerManager.getSyncStatus).toHaveBeenCalledTimes(1);
      });
      
      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      
      await waitFor(() => {
        expect(mockServiceWorkerManager.getSyncStatus).toHaveBeenCalledTimes(2);
      });
      
      jest.useRealTimers();
    });

    it('should clean up periodic timer on unmount', () => {
      jest.useFakeTimers();
      
      const { unmount } = renderHook(() => useBackgroundSync());
      
      unmount();
      
      // Should not throw errors when timer tries to execute
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      
      jest.useRealTimers();
    });
  });

  describe('Feature Detection', () => {
    it('should handle unsupported service worker', async () => {
      mockServiceWorkerManager.isSupported.mockReturnValue(false);
      mockServiceWorkerManager.isBackgroundSyncSupported.mockReturnValue(false);
      mockServiceWorkerManager.isPushNotificationSupported.mockReturnValue(false);
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await waitFor(() => {
        expect(result.current.isSupported).toBe(false);
        expect(result.current.isBackgroundSyncSupported).toBe(false);
        expect(result.current.isPushNotificationSupported).toBe(false);
      });
    });
  });
});

describe('useSyncStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockServiceWorkerManager.getSyncStatus.mockResolvedValue({
      isOnline: true,
      syncInProgress: false,
      lastSyncTimestamp: Date.now(),
      pendingOperationsCount: 0
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize and load sync status', async () => {
    const mockSyncStatus = {
      isOnline: true,
      syncInProgress: false,
      lastSyncTimestamp: Date.now(),
      pendingOperationsCount: 3
    };
    
    mockServiceWorkerManager.getSyncStatus.mockResolvedValue(mockSyncStatus);
    
    const { result } = renderHook(() => useSyncStatus());
    
    await waitFor(() => {
      expect(result.current.syncStatus).toEqual(mockSyncStatus);
    });
  });

  it('should refresh sync status manually', async () => {
    const initialStatus = {
      isOnline: true,
      syncInProgress: false,
      lastSyncTimestamp: Date.now() - 1000,
      pendingOperationsCount: 5
    };
    
    const updatedStatus = {
      isOnline: true,
      syncInProgress: false,
      lastSyncTimestamp: Date.now(),
      pendingOperationsCount: 0
    };
    
    mockServiceWorkerManager.getSyncStatus
      .mockResolvedValueOnce(initialStatus)
      .mockResolvedValueOnce(updatedStatus);
    
    const { result } = renderHook(() => useSyncStatus());
    
    await waitFor(() => {
      expect(result.current.syncStatus).toEqual(initialStatus);
    });
    
    await act(async () => {
      await result.current.refreshSyncStatus();
    });
    
    expect(result.current.syncStatus).toEqual(updatedStatus);
  });

  it('should periodically refresh sync status', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useSyncStatus());
    
    // Wait for initial load
    await waitFor(() => {
      expect(mockServiceWorkerManager.getSyncStatus).toHaveBeenCalledTimes(1);
    });
    
    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    
    await waitFor(() => {
      expect(mockServiceWorkerManager.getSyncStatus).toHaveBeenCalledTimes(2);
    });
    
    jest.useRealTimers();
  });

  it('should handle sync status errors gracefully', async () => {
    mockServiceWorkerManager.getSyncStatus.mockRejectedValue(new Error('Failed to get status'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useSyncStatus());
    
    await waitFor(() => {
      expect(result.current.syncStatus).toBe(null);
    });
    
    consoleSpy.mockRestore();
  });

  it('should clean up timer on unmount', () => {
    jest.useFakeTimers();
    
    const { unmount } = renderHook(() => useSyncStatus());
    
    unmount();
    
    // Should not throw errors when timer tries to execute
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    
    jest.useRealTimers();
  });
});