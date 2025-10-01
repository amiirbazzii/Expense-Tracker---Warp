/**
 * ServiceWorkerManager - Manages Service Worker registration and communication
 * for background sync, push notifications, and periodic conflict detection
 */

export interface SyncStatus {
  isOnline: boolean;
  syncInProgress: boolean;
  lastSyncTimestamp: number;
  pendingOperationsCount: number;
}

export interface SyncEvent {
  type: 'sync_completed' | 'sync_failed' | 'conflict_detected';
  syncedCount?: number;
  failedCount?: number;
  error?: string;
  serverHash?: string;
  localHash?: string;
  timestamp: number;
}

export type SyncEventListener = (event: SyncEvent) => void;

/**
 * ServiceWorkerManager handles all Service Worker interactions for background sync
 */
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private eventListeners = new Set<SyncEventListener>();
  private messageChannel: MessageChannel | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Service Worker registration and setup
   */
  private async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      // Register the background sync service worker
      this.registration = await navigator.serviceWorker.register('/background-sync-sw.js', {
        scope: '/'
      });

      console.log('Background Sync Service Worker registered:', this.registration);

      // Setup message channel for communication
      this.setupMessageChannel();

      // Listen for Service Worker updates
      this.registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
        const newWorker = this.registration!.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New Service Worker installed, reloading...');
              window.location.reload();
            }
          });
        }
      });

      // Listen for messages from Service Worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

      // Register for background sync
      await this.registerBackgroundSync();

      // Register for periodic conflict checks
      await this.registerConflictCheck();

      this.isInitialized = true;
      console.log('ServiceWorkerManager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize ServiceWorkerManager:', error);
    }
  }

  /**
   * Setup message channel for two-way communication
   */
  private setupMessageChannel(): void {
    this.messageChannel = new MessageChannel();
    
    this.messageChannel.port1.onmessage = (event) => {
      this.handleServiceWorkerMessage(event);
    };
  }

  /**
   * Handle messages from Service Worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { data } = event;
    
    if (data && typeof data === 'object') {
      // Emit sync events to listeners
      if (data.type && ['sync_completed', 'sync_failed', 'conflict_detected'].includes(data.type)) {
        this.emitSyncEvent(data as SyncEvent);
      }
      
      console.log('Received message from Service Worker:', data);
    }
  }

  /**
   * Register background sync
   */
  async registerBackgroundSync(): Promise<void> {
    if (!this.registration || !('sync' in window)) {
      console.warn('Background Sync not supported');
      return;
    }

    try {
      await this.registration.sync.register('background-sync');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }

  /**
   * Register periodic conflict check
   */
  async registerConflictCheck(): Promise<void> {
    if (!this.registration || !('sync' in window)) {
      console.warn('Background Sync not supported');
      return;
    }

    try {
      await this.registration.sync.register('conflict-check');
      console.log('Conflict check registered');
    } catch (error) {
      console.error('Failed to register conflict check:', error);
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync(): Promise<void> {
    if (!this.isInitialized) {
      console.warn('ServiceWorkerManager not initialized');
      return;
    }

    try {
      await this.sendMessage({ type: 'force_sync' });
      console.log('Force sync requested');
    } catch (error) {
      console.error('Failed to force sync:', error);
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus | null> {
    if (!this.isInitialized) {
      console.warn('ServiceWorkerManager not initialized');
      return null;
    }

    try {
      const response = await this.sendMessage({ type: 'get_sync_status' });
      return response as SyncStatus;
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return null;
    }
  }

  /**
   * Request push notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.registration || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      // Check if already subscribed
      let subscription = await this.registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        
        if (!vapidPublicKey) {
          console.warn('VAPID public key not configured');
          return null;
        }

        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        });

        console.log('Push subscription created:', subscription);
      }

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPushNotifications(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      
      if (subscription) {
        const success = await subscription.unsubscribe();
        console.log('Push subscription removed:', success);
        return success;
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Send message to Service Worker
   */
  private async sendMessage(message: any): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No active Service Worker');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        reject(new Error('Service Worker message timeout'));
      }, 10000);

      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data);
      };

      navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Add sync event listener
   */
  addEventListener(listener: SyncEventListener): void {
    this.eventListeners.add(listener);
  }

  /**
   * Remove sync event listener
   */
  removeEventListener(listener: SyncEventListener): void {
    this.eventListeners.delete(listener);
  }

  /**
   * Emit sync event to all listeners
   */
  private emitSyncEvent(event: SyncEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Sync event listener error:', error);
      }
    });
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Check if Service Worker is supported and active
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && this.isInitialized;
  }

  /**
   * Check if background sync is supported
   */
  isBackgroundSyncSupported(): boolean {
    return 'serviceWorker' in navigator && 'sync' in window;
  }

  /**
   * Check if push notifications are supported
   */
  isPushNotificationSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Get Service Worker registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Dispose of the manager
   */
  dispose(): void {
    this.eventListeners.clear();
    
    if (this.messageChannel) {
      this.messageChannel.port1.close();
      this.messageChannel.port2.close();
      this.messageChannel = null;
    }
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();