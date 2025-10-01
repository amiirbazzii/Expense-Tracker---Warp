/**
 * useBackgroundSync Hook Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBackgroundSync, useSyncStatus } from '../src/hooks/useBackgroundSync';

// Mock the ServiceWorkerManager
vi.mock('../src/lib/workers/ServiceWorkerManager', () => {
  const mockServiceWorkerManager = {
    isSupported: vi.fn(() => true),
    isBackgroundSyncSupported: vi.fn(() => true),
    isPushNotificationSupported: vi.fn(() => true),
    getSyncStatus: vi.fn(),
    forceSync: vi.fn(),
    requestNotificationPermission: vi.fn(),
    subscribeToPushNotifications: vi.fn(),
    unsubscribeFromPushNotifications: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getRegistration: vi.fn()
  };

  return {
    serviceWorkerManager: mockServiceWorkerManager
  };
});

// Mock Notification API
Object.defineProperty(global, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: vi.fn()
  },
  writable: true
});

// Mock push manager
const mockPushManager = {
  getSubscription: vi.fn()
};

const mockRegistration = {
  pushManager: mockPushManager
};

import { serviceWorkerManager } from '../src/lib/workers/ServiceWorkerManager';

describe('useBackgroundSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (serviceWorkerManager.getSyncStatus as Mock).mockResolvedValue({
      isOnline: true,
      syncInProgress: false,
      lastSyncTimestamp: Date.now(),
      pendingOperationsCount: 0
    });
    
    (serviceWorkerManager.getRegistration as Mock).mockReturnValue(mockRegistration);
    mockPushManager.getSubscription.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllTimers();
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
      
      (serviceWorkerManager.getSyncStatus as Mock).mockResolvedValue(mockSyncStatus);
      
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
      (serviceWorkerManager.getSyncStatus as Mock).mockRejectedValue(new Error('Failed to get status'));
      mockPushManager.getSubscription.mockRejectedValue(new Error('Failed to get subscription'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
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
      (serviceWorkerManager.forceSync as Mock).mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await act(async () => {
        await result.current.forceSync();
      });
      
      expect(serviceWorkerManager.forceSync).toHaveBeenCalled();
    });

    it('should handle force sync errors', async () => {
      const error = new Error('Sync failed');
      (serviceWorkerManager.forceSync as Mock).mockRejectedValue(error);
      
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
      
      (serviceWorkerManager.getSyncStatus as Mock)
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
      (serviceWorkerManager.requestNotificationPermission as Mock).mockResolvedValue('granted');
      
      const { result } = renderHook(() => useBackgroundSync());
      
      let permission: NotificationPermission;
      await act(async () => {
        permission = await result.current.requestNotificationPermission();
      });
      
      expect(permission!).toBe('granted');
      expect(result.current.notificationPermission).toBe('granted');
    });

    it('should subscribe to push notifications successfully', async () => {
      (serviceWorkerManager.subscribeToPushNotifications as Mock).mockResolvedValue({
        endpoint: 'https://example.com/push'
      });
      
      const { result } = renderHook(() => useBackgroundSync());
      
      let success: boolean;
      await act(async () => {
        success = await result.current.subscribeToPushNotifications();
      });
      
      expect(success!).toBe(true);
      expect(result.current.isSubscribedToPush).toBe(true);
    });

    it('should unsubscribe from push notifications successfully', async () => {
      // Start with subscribed state
      mockPushManager.getSubscription.mockResolvedValue({
        endpoint: 'https://example.com/push'
      });
      
      (serviceWorkerManager.unsubscribeFromPushNotifications as Mock).mockResolvedValue(true);
      
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
      (serviceWorkerManager.requestNotificationPermission as Mock).mockRejectedValue(error);
      
      const { result } = renderHook(() => useBackgroundSync());
      
      await expect(act(async () => {
        await result.current.requestNotificationPermission();
      })).rejects.toThrow('Permission denied');
    });
  });

  describe('Event Handling', () => {
    it('should handle sync events from service worker', async () => {
      let eventListener: (event: any) => void;
      
      (serviceWorkerManager.addEventListener as Mock).mockImplementation((listener) => {
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
      
      (serviceWorkerManager.addEventListener as Mock).mockImplementation((listener) => {
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
        expect(serviceWorkerManager.getSyncStatus).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useBackgroundSync());
      
      unmount();
      
      expect(serviceWorkerManager.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('Periodic Updates', () => {
    it('should periodically refresh sync status', async () => {
      vi.useFakeTimers();
      
      const { result } = renderHook(() => useBackgroundSync());
      
      // Wait for initial load
      await waitFor(() => {
        expect(serviceWorkerManager.getSyncStatus).toHaveBeenCalledTimes(1);
      });
      
      // Fast-forward 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      
      await waitFor(() => {
        expect(serviceWorkerManager.getSyncStatus).toHaveBeenCalledTimes(2);
      });
      
      vi.useRealTimers();
    });

    it('should clean up periodic timer on unmount', () => {
      vi.useFakeTimers();
      
      const { unmount } = renderHook(() => useBackgroundSync());
      
      unmount();
      
      // Should not throw errors when timer tries to execute
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      
      vi.useRealTimers();
    });
  });

  describe('Feature Detection', () => {
    it('should handle unsupported service worker', async () => {
      (serviceWorkerManager.isSupported as Mock).mockReturnValue(false);
      (serviceWorkerManager.isBackgroundSyncSupported as Mock).mockReturnValue(false);
      (serviceWorkerManager.isPushNotificationSupported as Mock).mockReturnValue(false);
      
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
    vi.clearAllMocks();
    
    (serviceWorkerManager.getSyncStatus as Mock).mockResolvedValue({
      isOnline: true,
      syncInProgress: false,
      lastSyncTimestamp: Date.now(),
      pendingOperationsCount: 0
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize and load sync status', async () => {
    const mockSyncStatus = {
      isOnline: true,
      syncInProgress: false,
      lastSyncTimestamp: Date.now(),
      pendingOperationsCount: 3
    };
    
    (serviceWorkerManager.getSyncStatus as Mock).mockResolvedValue(mockSyncStatus);
    
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
    
    (serviceWorkerManager.getSyncStatus as Mock)
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
    vi.useFakeTimers();
    
    const { result } = renderHook(() => useSyncStatus());
    
    // Wait for initial load
    await waitFor(() => {
      expect(serviceWorkerManager.getSyncStatus).toHaveBeenCalledTimes(1);
    });
    
    // Fast-forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    
    await waitFor(() => {
      expect(serviceWorkerManager.getSyncStatus).toHaveBeenCalledTimes(2);
    });
    
    vi.useRealTimers();
  });

  it('should handle sync status errors gracefully', async () => {
    (serviceWorkerManager.getSyncStatus as Mock).mockRejectedValue(new Error('Failed to get status'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useSyncStatus());
    
    await waitFor(() => {
      expect(result.current.syncStatus).toBe(null);
    });
    
    consoleSpy.mockRestore();
  });

  it('should clean up timer on unmount', () => {
    vi.useFakeTimers();
    
    const { unmount } = renderHook(() => useSyncStatus());
    
    unmount();
    
    // Should not throw errors when timer tries to execute
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    
    vi.useRealTimers();
  });
});