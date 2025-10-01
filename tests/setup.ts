/**
 * Test setup file for Jest
 * Configures testing environment and global mocks
 */

import '@testing-library/jest-dom';

// Mock IndexedDB for testing
const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

Object.defineProperty(window, 'indexedDB', {
  value: new FDBFactory(),
  writable: true,
});

Object.defineProperty(window, 'IDBKeyRange', {
  value: FDBKeyRange,
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window.addEventListener for online/offline events
const originalAddEventListener = window.addEventListener;
window.addEventListener = jest.fn((event, handler) => {
  if (event === 'online' || event === 'offline') {
    // Store handlers for manual triggering in tests
    return;
  }
  return originalAddEventListener.call(window, event, handler);
});

// Mock Convex client
jest.mock('convex/browser', () => ({
  ConvexClient: jest.fn().mockImplementation(() => ({
    mutation: jest.fn(),
    query: jest.fn(),
  })),
}));

// Mock Convex React hooks
jest.mock('convex/react', () => ({
  useMutation: jest.fn(() => jest.fn()),
  useQuery: jest.fn(() => undefined),
  ConvexProvider: 'div',
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
  },
  AnimatePresence: 'div',
}));

// Mock sonner toast library
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    dismiss: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Global test utilities
global.createMockExpense = (overrides = {}) => ({
  id: 'exp-123',
  localId: 'local-123',
  amount: 25.50,
  title: 'Test Expense',
  category: ['Food'],
  for: ['Personal'],
  date: Date.now(),
  syncStatus: 'pending',
  version: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

global.createMockLocalData = (overrides = {}) => ({
  version: '2.0.0',
  exportedAt: Date.now(),
  deviceId: 'test-device',
  userId: 'test-user',
  data: {
    expenses: {},
    income: {},
    categories: {},
    cards: {},
    syncState: {
      lastSync: 0,
      pendingOperations: [],
      dataHash: '',
      conflictResolutions: [],
      totalRecords: 0,
      lastModified: Date.now(),
    },
    metadata: {
      version: '2.0.0',
      deviceId: 'test-device',
      userId: 'test-user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schemaVersion: 2,
    },
  },
  checksum: 'test-checksum',
  ...overrides,
});

global.createMockCloudData = (overrides = {}) => ({
  expenses: [],
  income: [],
  categories: [],
  cards: [],
  forValues: [],
  incomeCategories: [],
  metadata: {
    dataHash: 'cloud-hash',
    lastModified: Date.now(),
    totalRecords: 0,
  },
  ...overrides,
});

// Helper to simulate network events
global.simulateNetworkChange = (isOnline: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    value: isOnline,
    writable: true,
  });
  
  // Trigger event listeners
  const event = new Event(isOnline ? 'online' : 'offline');
  window.dispatchEvent(event);
};

// Helper to wait for async operations
global.waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  
  // Reset network status
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    writable: true,
  });
});

// Add custom matchers
expect.extend({
  toHaveValidId(received) {
    const pass = typeof received === 'string' && received.length > 0;
    return {
      message: () => `expected ${received} to be a valid ID`,
      pass,
    };
  },
  
  toHaveValidTimestamp(received) {
    const pass = typeof received === 'number' && received > 0 && received <= Date.now();
    return {
      message: () => `expected ${received} to be a valid timestamp`,
      pass,
    };
  },
  
  toHaveSyncStatus(received, expectedStatus) {
    const validStatuses = ['pending', 'syncing', 'synced', 'failed', 'conflict'];
    const hasValidStatus = validStatuses.includes(received.syncStatus);
    const hasExpectedStatus = received.syncStatus === expectedStatus;
    
    return {
      message: () => 
        `expected ${received.syncStatus} to be ${expectedStatus}`,
      pass: hasValidStatus && hasExpectedStatus,
    };
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidId(): R;
      toHaveValidTimestamp(): R;
      toHaveSyncStatus(status: string): R;
    }
  }
}