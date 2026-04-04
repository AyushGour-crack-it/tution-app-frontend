import { openDB } from 'idb';

const DB_NAME = 'OurTuition_Offline_DB';
const DB_VERSION = 1;

// Initialize IndexedDB
const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // User data store
      if (!db.objectStoreNames.contains('userData')) {
        const userStore = db.createObjectStore('userData', { keyPath: 'id' });
        userStore.createIndex('userId', 'userId', { unique: false });
        userStore.createIndex('type', 'type', { unique: false });
      }

      // API responses store
      if (!db.objectStoreNames.contains('apiCache')) {
        const apiStore = db.createObjectStore('apiCache', { keyPath: 'cacheKey' });
        apiStore.createIndex('endpoint', 'endpoint', { unique: false });
        apiStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Pending requests store (for background sync)
      if (!db.objectStoreNames.contains('pendingRequests')) {
        const pendingStore = db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('endpoint', 'endpoint', { unique: false });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Chat messages store
      if (!db.objectStoreNames.contains('chatMessages')) {
        const chatStore = db.createObjectStore('chatMessages', { keyPath: 'id' });
        chatStore.createIndex('conversationId', 'conversationId', { unique: false });
        chatStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Marks store
      if (!db.objectStoreNames.contains('marks')) {
        const marksStore = db.createObjectStore('marks', { keyPath: 'id' });
        marksStore.createIndex('studentId', 'studentId', { unique: false });
        marksStore.createIndex('subject', 'subject', { unique: false });
        marksStore.createIndex('timestamp', 'timestamp', { unique: false });
        marksStore.createIndex('synced', 'synced', { unique: false });
      }
    },
  });
};

// User Data Management
export const saveUserData = async (userId, type, data) => {
  try {
    const db = await initDB();
    const userData = {
      id: `${userId}_${type}`,
      userId,
      type,
      data,
      timestamp: Date.now(),
      synced: false
    };
    await db.put('userData', userData);
    return true;
  } catch (error) {
    console.error('Failed to save user data:', error);
    return false;
  }
};

export const getUserData = async (userId, type) => {
  try {
    const db = await initDB();
    const data = await db.get('userData', `${userId}_${type}`);
    return data ? data.data : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
};

export const getAllUserData = async (userId) => {
  try {
    const db = await initDB();
    const index = db.transaction('userData').store.index('userId');
    const data = await index.getAll(userId);
    return data.reduce((acc, item) => {
      acc[item.type] = item.data;
      return acc;
    }, {});
  } catch (error) {
    console.error('Failed to get all user data:', error);
    return {};
  }
};

// API Cache Management
export const saveApiResponse = async (cacheKey, endpoint, data, ttl = 24 * 60 * 60 * 1000) => {
  try {
    const db = await initDB();
    const cacheData = {
      cacheKey,
      endpoint,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };
    await db.put('apiCache', cacheData);
    return true;
  } catch (error) {
    console.error('Failed to save API response:', error);
    return false;
  }
};

export const getApiResponse = async (cacheKey) => {
  try {
    const db = await initDB();
    const data = await db.get('apiCache', cacheKey);

    if (!data) return null;

    // Check if expired
    if (Date.now() > data.expiresAt) {
      await db.delete('apiCache', cacheKey);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Failed to get API response:', error);
    return null;
  }
};

export const clearExpiredCache = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('apiCache', 'readwrite');
    const store = tx.objectStore('apiCache');
    const index = store.index('timestamp');

    const now = Date.now();
    let cursor = await index.openCursor();

    while (cursor) {
      if (cursor.value.expiresAt < now) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;
  } catch (error) {
    console.error('Failed to clear expired cache:', error);
  }
};

// Pending Requests Management (for background sync)
export const savePendingRequest = async (endpoint, method, data, headers = {}) => {
  try {
    const db = await initDB();
    const pendingRequest = {
      endpoint,
      method: method.toUpperCase(),
      data,
      headers,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3
    };
    await db.add('pendingRequests', pendingRequest);
    return true;
  } catch (error) {
    console.error('Failed to save pending request:', error);
    return false;
  }
};

export const getPendingRequests = async () => {
  try {
    const db = await initDB();
    return await db.getAll('pendingRequests');
  } catch (error) {
    console.error('Failed to get pending requests:', error);
    return [];
  }
};

export const removePendingRequest = async (id) => {
  try {
    const db = await initDB();
    await db.delete('pendingRequests', id);
    return true;
  } catch (error) {
    console.error('Failed to remove pending request:', error);
    return false;
  }
};

export const updatePendingRequest = async (id, updates) => {
  try {
    const db = await initDB();
    const request = await db.get('pendingRequests', id);
    if (request) {
      await db.put('pendingRequests', { ...request, ...updates });
    }
    return true;
  } catch (error) {
    console.error('Failed to update pending request:', error);
    return false;
  }
};

// Chat Messages Management
export const saveChatMessage = async (message) => {
  try {
    const db = await initDB();
    await db.put('chatMessages', {
      ...message,
      timestamp: Date.now(),
      synced: false
    });
    return true;
  } catch (error) {
    console.error('Failed to save chat message:', error);
    return false;
  }
};

export const getChatMessages = async (conversationId, limit = 50) => {
  try {
    const db = await initDB();
    const index = db.transaction('chatMessages').store.index('conversationId');
    const messages = await index.getAll(conversationId);

    // Sort by timestamp and return latest messages
    return messages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .reverse();
  } catch (error) {
    console.error('Failed to get chat messages:', error);
    return [];
  }
};

export const markChatMessagesSynced = async (messageIds) => {
  try {
    const db = await initDB();
    const tx = db.transaction('chatMessages', 'readwrite');

    for (const id of messageIds) {
      const message = await tx.store.get(id);
      if (message) {
        await tx.store.put({ ...message, synced: true });
      }
    }

    await tx.done;
    return true;
  } catch (error) {
    console.error('Failed to mark chat messages synced:', error);
    return false;
  }
};

// Notifications Management
export const saveNotification = async (notification) => {
  try {
    const db = await initDB();
    await db.put('notifications', {
      ...notification,
      timestamp: Date.now(),
      read: false,
      synced: false
    });
    return true;
  } catch (error) {
    console.error('Failed to save notification:', error);
    return false;
  }
};

export const getNotifications = async (userId, limit = 50) => {
  try {
    const db = await initDB();
    const index = db.transaction('notifications').store.index('userId');
    const notifications = await index.getAll(userId);

    return notifications
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    const db = await initDB();
    const notification = await db.get('notifications', notificationId);
    if (notification) {
      await db.put('notifications', { ...notification, read: true });
    }
    return true;
  } catch (error) {
    console.error('Failed to mark notification read:', error);
    return false;
  }
};

// Marks Management
export const saveMark = async (mark) => {
  try {
    const db = await initDB();
    await db.put('marks', {
      ...mark,
      timestamp: Date.now(),
      synced: false
    });
    return true;
  } catch (error) {
    console.error('Failed to save mark:', error);
    return false;
  }
};

export const getMarks = async (studentId = null, subject = null) => {
  try {
    const db = await initDB();
    let marks = [];

    if (studentId) {
      const index = db.transaction('marks').store.index('studentId');
      marks = await index.getAll(studentId);
    } else {
      marks = await db.getAll('marks');
    }

    // Filter by subject if specified
    if (subject) {
      marks = marks.filter(mark => mark.subject === subject);
    }

    // Sort by date descending
    return marks.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error('Failed to get marks:', error);
    return [];
  }
};

export const updateMark = async (markId, updates) => {
  try {
    const db = await initDB();
    const mark = await db.get('marks', markId);
    if (mark) {
      await db.put('marks', {
        ...mark,
        ...updates,
        timestamp: Date.now(),
        synced: false
      });
    }
    return true;
  } catch (error) {
    console.error('Failed to update mark:', error);
    return false;
  }
};

export const deleteMark = async (markId) => {
  try {
    const db = await initDB();
    await db.delete('marks', markId);
    return true;
  } catch (error) {
    console.error('Failed to delete mark:', error);
    return false;
  }
};

export const clearMarks = async (studentId = null) => {
  try {
    const db = await initDB();
    if (studentId) {
      // Clear marks for specific student
      const index = db.transaction('marks', 'readwrite').store.index('studentId');
      let cursor = await index.openCursor(IDBKeyRange.only(studentId));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    } else {
      // Clear all marks
      await db.clear('marks');
    }
    return true;
  } catch (error) {
    console.error('Failed to clear marks:', error);
    return false;
  }
};

export const getUnsyncedMarks = async () => {
  try {
    const db = await initDB();
    const index = db.transaction('marks').store.index('synced');
    return await index.getAll(false);
  } catch (error) {
    console.error('Failed to get unsynced marks:', error);
    return [];
  }
};

export const markMarksSynced = async (markIds) => {
  try {
    const db = await initDB();
    const tx = db.transaction('marks', 'readwrite');

    for (const id of markIds) {
      const mark = await tx.store.get(id);
      if (mark) {
        await tx.store.put({ ...mark, synced: true });
      }
    }

    await tx.done;
    return true;
  } catch (error) {
    console.error('Failed to mark marks synced:', error);
    return false;
  }
};

// Utility functions
export const clearAllData = async () => {
  try {
    const db = await initDB();
    const stores = ['userData', 'apiCache', 'pendingRequests', 'chatMessages', 'notifications', 'marks'];

    for (const storeName of stores) {
      await db.clear(storeName);
    }

    return true;
  } catch (error) {
    console.error('Failed to clear all data:', error);
    return false;
  }
};

export const getStorageStats = async () => {
  try {
    const db = await initDB();
    const stats = {};

    for (const storeName of db.objectStoreNames) {
      const count = await db.count(storeName);
      stats[storeName] = count;
    }

    return stats;
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return {};
  }
};

// Background sync functionality
export const syncPendingRequests = async () => {
  if (!navigator.onLine) return;

  try {
    const pendingRequests = await getPendingRequests();

    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.endpoint, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...request.headers
          },
          body: request.data ? JSON.stringify(request.data) : undefined
        });

        if (response.ok) {
          await removePendingRequest(request.id);
        } else {
          // Increment retry count
          const newRetries = request.retries + 1;
          if (newRetries >= request.maxRetries) {
            await removePendingRequest(request.id);
          } else {
            await updatePendingRequest(request.id, { retries: newRetries });
          }
        }
      } catch (error) {
        console.error('Failed to sync request:', error);
        const newRetries = request.retries + 1;
        if (newRetries >= request.maxRetries) {
          await removePendingRequest(request.id);
        } else {
          await updatePendingRequest(request.id, { retries: newRetries });
        }
      }
    }
  } catch (error) {
    console.error('Failed to sync pending requests:', error);
  }
};

// Periodic cleanup
setInterval(clearExpiredCache, 60 * 60 * 1000); // Clean expired cache every hour

// Listen for online events to trigger sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingRequests();
  });
}