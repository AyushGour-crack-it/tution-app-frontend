import React from 'react';
import { saveApiResponse, getApiResponse, savePendingRequest, syncPendingRequests, saveUserData, getAllUserData } from './offlineStorage.js';

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    this.syncInProgress = false;
    this.cachedData = new Map();

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Periodic sync when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.performSync();
      }
    }, 30000); // Sync every 30 seconds when online

    // Load cached data on startup
    this.loadCachedData();
  }

  async loadCachedData() {
    try {
      // Load user-specific cached data
      const userId = localStorage.getItem('auth_user');
      if (userId) {
        const userData = await getAllUserData(userId);
        this.cachedData.set('userData', userData);

        // Cache common API endpoints
        const commonEndpoints = [
          'dashboard',
          'notifications',
          'chat/conversations',
          'students',
          'classes',
          'homework',
          'fees',
          'badges',
          'marks'
        ];

        for (const endpoint of commonEndpoints) {
          const cacheKey = `get:/api/${endpoint}::${userId}`;
          const cached = await getApiResponse(cacheKey);
          if (cached) {
            this.cachedData.set(endpoint, cached);
          }
        }
      }

      console.log('Offline data loaded:', this.cachedData.size, 'items');
    } catch (error) {
      console.error('Failed to load cached data:', error);
    }
  }

  handleOnline() {
    this.isOnline = true;
    this.notifyListeners();
    this.performSync();
  }

  handleOffline() {
    this.isOnline = false;
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  async performSync() {
    if (this.syncInProgress) return;

    this.syncInProgress = true;
    try {
      await syncPendingRequests();
      // Refresh cached data after sync
      await this.loadCachedData();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Enhanced API caching with offline support
  async cacheApiResponse(cacheKey, endpoint, data, ttl) {
    return saveApiResponse(cacheKey, endpoint, data, ttl);
  }

  async getCachedApiResponse(cacheKey) {
    return getApiResponse(cacheKey);
  }

  // Get cached data for immediate UI loading
  getCachedData(key) {
    return this.cachedData.get(key);
  }

  // Queue requests for when we come back online
  async queueRequest(endpoint, method, data, headers) {
    if (this.isOnline) {
      // Try to send immediately
      try {
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: data ? JSON.stringify(data) : undefined
        });

        if (response.ok) {
          const result = await response.json();
          // Cache successful responses
          const cacheKey = `${method}:${endpoint}:${localStorage.getItem('auth_user') || 'guest'}`;
          await this.cacheApiResponse(cacheKey, endpoint, result);
          return result;
        }
      } catch (error) {
        console.warn('Request failed, queuing for later:', error);
      }
    }

    // Queue for later if offline or request failed
    await savePendingRequest(endpoint, method, data, headers);
    throw new Error('Request queued for offline sync');
  }

  destroy() {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    clearInterval(this.syncInterval);
    this.listeners.clear();
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();

// React hook for offline status
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const unsubscribe = offlineManager.subscribe(setIsOnline);
    return unsubscribe;
  }, []);

  return isOnline;
};

// Offline indicator component
export const OfflineIndicator = () => {
  const isOnline = useOfflineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      <div className="offline-indicator-content">
        <span className="offline-icon">📴</span>
        <span className="offline-text">You're offline. Some features may be limited.</span>
      </div>
    </div>
  );
};

// Enhanced API wrapper with offline support
export const createOfflineApiWrapper = (originalApi) => {
  const wrappedApi = { ...originalApi };

  // Wrap GET methods with offline caching
  const getMethods = ['get', 'request'];
  getMethods.forEach(method => {
    if (wrappedApi[method]) {
      const originalMethod = wrappedApi[method];
      wrappedApi[method] = async (url, config = {}) => {
        const cacheKey = `${method}:${url}:${JSON.stringify(config.params || {})}`;

        // Try to get from cache first (especially when offline)
        if (!navigator.onLine) {
          const cachedData = await offlineManager.getCachedApiResponse(cacheKey);
          if (cachedData) {
            return { data: cachedData, cached: true, offline: true };
          }
        }

        try {
          const response = await originalMethod(url, config);

          // Cache successful GET responses
          if (config.cache !== false && response.data) {
            const ttl = config.cacheTtlMs || 30 * 60 * 1000; // 30 minutes default
            await offlineManager.cacheApiResponse(cacheKey, url, response.data, ttl);
          }

          return { ...response, cached: false, offline: false };
        } catch (error) {
          // If request fails and we're offline, try cache
          if (!navigator.onLine) {
            const cachedData = await offlineManager.getCachedApiResponse(cacheKey);
            if (cachedData) {
              return { data: cachedData, cached: true, offline: true };
            }
          }
          throw error;
        }
      };
    }
  });

  // Wrap mutation methods (POST, PUT, DELETE) with offline queuing
  const mutationMethods = ['post', 'put', 'delete', 'patch'];
  mutationMethods.forEach(method => {
    if (wrappedApi[method]) {
      const originalMethod = wrappedApi[method];
      wrappedApi[method] = async (url, data, config = {}) => {
        try {
          const response = await originalMethod(url, data, config);
          return response;
        } catch (error) {
          // If offline or network error, queue the request
          if (!navigator.onLine || error.code === 'NETWORK_ERROR') {
            await offlineManager.queueRequest(
              url,
              method.toUpperCase(),
              data,
              config.headers
            );
            // Return a mock success response for offline operations
            return {
              data: { success: true, queued: true, message: 'Request queued for when you\'re back online' },
              status: 200,
              queued: true
            };
          }
          throw error;
        }
      };
    }
  });

  return wrappedApi;
};