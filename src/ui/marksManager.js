import React from 'react';
import { api } from './api.js';
import {
  saveMark,
  getMarks,
  updateMark,
  deleteMark,
  clearMarks,
  getUnsyncedMarks,
  markMarksSynced
} from './offlineStorage.js';
import { offlineManager } from './offlineManager.jsx';

// Marks API with offline support
class MarksManager {
  constructor() {
    this.syncInProgress = false;
    this.listeners = new Set();

    // Auto-sync when coming online
    window.addEventListener('online', () => {
      this.syncUnsyncedMarks();
    });

    // Periodic sync
    setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.syncUnsyncedMarks();
      }
    }, 60000); // Sync every minute
  }

  // Get marks with offline support
  async getMarks(studentId = null, subject = null, forceRefresh = false) {
    try {
      // Try online first if not forcing offline
      if (navigator.onLine && !forceRefresh) {
        try {
          const params = {};
          if (studentId) params.studentId = studentId;
          if (subject) params.subject = subject;

          const response = await api.get('/marks', { params });
          const marks = response.data;

          // Cache marks locally
          for (const mark of marks) {
            await saveMark({ ...mark, synced: true });
          }

          this.notifyListeners('marks_loaded', marks);
          return marks;
        } catch (error) {
          console.warn('Failed to fetch marks online, using offline cache:', error);
        }
      }

      // Use offline cache
      const cachedMarks = await getMarks(studentId, subject);
      this.notifyListeners('marks_loaded_offline', cachedMarks);
      return cachedMarks;
    } catch (error) {
      console.error('Failed to get marks:', error);
      return [];
    }
  }

  // Create mark with offline support
  async createMark(markData) {
    try {
      // Save locally first
      const localMark = {
        ...markData,
        id: `temp_${Date.now()}_${Math.random()}`,
        _id: `temp_${Date.now()}_${Math.random()}`,
        createdAt: new Date().toISOString(),
        synced: false
      };

      await saveMark(localMark);

      // Try to sync online
      if (navigator.onLine) {
        try {
          const response = await api.post('/marks', markData);
          const serverMark = response.data;

          // Update local with server data
          await updateMark(localMark.id, { ...serverMark, synced: true });
          await markMarksSynced([localMark.id]);

          this.notifyListeners('mark_created', serverMark);
          return serverMark;
        } catch (error) {
          console.warn('Failed to sync mark creation, saved locally:', error);
          this.notifyListeners('mark_created_offline', localMark);
          return localMark;
        }
      } else {
        this.notifyListeners('mark_created_offline', localMark);
        return localMark;
      }
    } catch (error) {
      console.error('Failed to create mark:', error);
      throw error;
    }
  }

  // Update mark with offline support
  async updateMark(markId, updates) {
    try {
      // Update locally first
      await updateMark(markId, { ...updates, synced: false });

      // Try to sync online
      if (navigator.onLine) {
        try {
          const response = await api.put(`/marks/${markId}`, updates);
          const updatedMark = response.data;

          // Mark as synced
          await markMarksSynced([markId]);

          this.notifyListeners('mark_updated', updatedMark);
          return updatedMark;
        } catch (error) {
          console.warn('Failed to sync mark update, saved locally:', error);
        }
      }

      const localMark = await getMarks().find(m => m.id === markId || m._id === markId);
      this.notifyListeners('mark_updated_offline', { ...localMark, ...updates });
      return { ...localMark, ...updates };
    } catch (error) {
      console.error('Failed to update mark:', error);
      throw error;
    }
  }

  // Delete mark with offline support
  async deleteMark(markId) {
    try {
      // Mark for deletion locally
      await updateMark(markId, { deleted: true, synced: false });

      // Try to sync online
      if (navigator.onLine) {
        try {
          await api.delete(`/marks/${markId}`);
          await deleteMark(markId); // Remove from local storage
          this.notifyListeners('mark_deleted', markId);
          return true;
        } catch (error) {
          console.warn('Failed to sync mark deletion, marked locally:', error);
        }
      }

      this.notifyListeners('mark_deleted_offline', markId);
      return true;
    } catch (error) {
      console.error('Failed to delete mark:', error);
      throw error;
    }
  }

  // Clear marks with offline support
  async clearMarks(studentId = null) {
    try {
      // Clear locally first
      await clearMarks(studentId);

      // Try to sync online
      if (navigator.onLine) {
        try {
          const endpoint = studentId ? `/marks/clear/${studentId}` : '/marks/clear';
          await api.delete(endpoint);
          this.notifyListeners('marks_cleared', { studentId });
          return true;
        } catch (error) {
          console.warn('Failed to sync marks clearing, cleared locally:', error);
        }
      }

      this.notifyListeners('marks_cleared_offline', { studentId });
      return true;
    } catch (error) {
      console.error('Failed to clear marks:', error);
      throw error;
    }
  }

  // Sync unsynced marks
  async syncUnsyncedMarks() {
    if (this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;
    try {
      const unsyncedMarks = await getUnsyncedMarks();
      const syncedIds = [];

      for (const mark of unsyncedMarks) {
        try {
          if (mark.deleted) {
            // Delete on server
            await api.delete(`/marks/${mark._id || mark.id}`);
            await deleteMark(mark.id);
          } else if (mark._id && mark._id.startsWith('temp_')) {
            // Create new mark on server
            const response = await api.post('/marks', {
              studentId: mark.studentId,
              subject: mark.subject,
              marks: mark.marks,
              totalMarks: mark.totalMarks,
              date: mark.date,
              class: mark.class,
              remarks: mark.remarks
            });
            const serverMark = response.data;

            // Replace temp ID with server ID
            await deleteMark(mark.id);
            await saveMark({ ...serverMark, synced: true });
          } else {
            // Update existing mark
            await api.put(`/marks/${mark._id || mark.id}`, {
              studentId: mark.studentId,
              subject: mark.subject,
              marks: mark.marks,
              totalMarks: mark.totalMarks,
              date: mark.date,
              class: mark.class,
              remarks: mark.remarks
            });
            await markMarksSynced([mark.id]);
          }

          syncedIds.push(mark.id);
        } catch (error) {
          console.error(`Failed to sync mark ${mark.id}:`, error);
        }
      }

      if (syncedIds.length > 0) {
        this.notifyListeners('marks_synced', syncedIds);
      }
    } catch (error) {
      console.error('Failed to sync marks:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Subscribe to marks events
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(listener => listener(event, data));
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: navigator.onLine,
      syncInProgress: this.syncInProgress
    };
  }
}

// Create singleton instance
export const marksManager = new MarksManager();

// React hook for marks management
export const useMarks = (studentId = null, subject = null) => {
  const [marks, setMarks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const loadMarks = async () => {
      try {
        setLoading(true);
        const data = await marksManager.getMarks(studentId, subject);
        setMarks(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadMarks();

    // Subscribe to updates
    const unsubscribe = marksManager.subscribe((event, data) => {
      if (event === 'marks_loaded' || event === 'marks_loaded_offline') {
        setMarks(data);
      } else if (event.includes('mark_')) {
        // Refresh marks on any mark change
        loadMarks();
      }
    });

    return unsubscribe;
  }, [studentId, subject]);

  return { marks, loading, error, refetch: () => marksManager.getMarks(studentId, subject, true) };
};

// Export individual functions for direct use
export const getMarksOffline = (studentId, subject) => marksManager.getMarks(studentId, subject);
export const createMarkOffline = (markData) => marksManager.createMark(markData);
export const updateMarkOffline = (markId, updates) => marksManager.updateMark(markId, updates);
export const deleteMarkOffline = (markId) => marksManager.deleteMark(markId);
export const clearMarksOffline = (studentId) => marksManager.clearMarks(studentId);
export const syncMarks = () => marksManager.syncUnsyncedMarks();