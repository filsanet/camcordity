/**
 * Storage abstraction layer for Camcordity
 * Provides a unified interface that matches chrome.storage.local API
 * but works with web APIs (localStorage + IndexedDB)
 */

class WebStorage {
  constructor() {
    this.DB_NAME = 'camcordity-storage';
    this.DB_VERSION = 1;
    this.STORE_NAME = 'settings';
    this.dbPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  /**
   * Get values from storage
   * @param {string|string[]|Object|null} keys - Keys to retrieve
   * @returns {Promise<Object>} - Object with key-value pairs
   */
  async get(keys = null) {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      if (keys === null) {
        // Get all items
        return new Promise((resolve, reject) => {
          const request = store.getAll();
          const keyRequest = store.getAllKeys();
          
          Promise.all([
            new Promise(res => { request.onsuccess = () => res(request.result); }),
            new Promise(res => { keyRequest.onsuccess = () => res(keyRequest.result); })
          ]).then(([values, allKeys]) => {
            const result = {};
            allKeys.forEach((key, index) => {
              result[key] = values[index];
            });
            resolve(result);
          }).catch(reject);
        });
      }
      
      // Handle single key (string)
      if (typeof keys === 'string') {
        return new Promise((resolve, reject) => {
          const request = store.get(keys);
          request.onsuccess = () => {
            const result = {};
            if (request.result !== undefined) {
              result[keys] = request.result;
            }
            resolve(result);
          };
          request.onerror = () => reject(request.error);
        });
      }
      
      // Handle array of keys
      if (Array.isArray(keys)) {
        const result = {};
        await Promise.all(keys.map(key => {
          return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
              if (request.result !== undefined) {
                result[key] = request.result;
              }
              resolve();
            };
            request.onerror = () => reject(request.error);
          });
        }));
        return result;
      }
      
      // Handle object with default values
      if (typeof keys === 'object') {
        const result = { ...keys }; // Start with defaults
        await Promise.all(Object.keys(keys).map(key => {
          return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
              if (request.result !== undefined) {
                result[key] = request.result;
              }
              resolve();
            };
            request.onerror = () => reject(request.error);
          });
        }));
        return result;
      }
      
      return {};
    } catch (error) {
      console.error('Storage get error:', error);
      // Fallback to localStorage for critical errors
      return this.getFromLocalStorage(keys);
    }
  }

  /**
   * Set values in storage
   * @param {Object} items - Key-value pairs to store
   * @returns {Promise<void>}
   */
  async set(items) {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const promises = Object.entries(items).map(([key, value]) => {
        return new Promise((resolve, reject) => {
          const request = store.put(value, key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });
      
      await Promise.all(promises);
      
      // Also sync to localStorage for faster access to frequently used items
      this.syncToLocalStorage(items);
    } catch (error) {
      console.error('Storage set error:', error);
      // Fallback to localStorage
      this.setToLocalStorage(items);
    }
  }

  /**
   * Remove keys from storage
   * @param {string|string[]} keys - Keys to remove
   * @returns {Promise<void>}
   */
  async remove(keys) {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const keysArray = Array.isArray(keys) ? keys : [keys];
      
      const promises = keysArray.map(key => {
        return new Promise((resolve, reject) => {
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });
      
      await Promise.all(promises);
      
      // Also remove from localStorage
      keysArray.forEach(key => localStorage.removeItem(`camcordity_${key}`));
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }

  /**
   * Clear all storage
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Also clear localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('camcordity_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  // localStorage fallback methods
  getFromLocalStorage(keys) {
    if (keys === null) {
      const result = {};
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('camcordity_')) {
          const actualKey = key.replace('camcordity_', '');
          try {
            result[actualKey] = JSON.parse(localStorage.getItem(key));
          } catch {
            result[actualKey] = localStorage.getItem(key);
          }
        }
      });
      return result;
    }
    
    if (typeof keys === 'string') {
      const result = {};
      const value = localStorage.getItem(`camcordity_${keys}`);
      if (value !== null) {
        try {
          result[keys] = JSON.parse(value);
        } catch {
          result[keys] = value;
        }
      }
      return result;
    }
    
    if (Array.isArray(keys)) {
      const result = {};
      keys.forEach(key => {
        const value = localStorage.getItem(`camcordity_${key}`);
        if (value !== null) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      });
      return result;
    }
    
    if (typeof keys === 'object') {
      const result = { ...keys };
      Object.keys(keys).forEach(key => {
        const value = localStorage.getItem(`camcordity_${key}`);
        if (value !== null) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      });
      return result;
    }
    
    return {};
  }

  setToLocalStorage(items) {
    Object.entries(items).forEach(([key, value]) => {
      try {
        localStorage.setItem(`camcordity_${key}`, JSON.stringify(value));
      } catch (error) {
        console.error(`Failed to set localStorage item ${key}:`, error);
      }
    });
  }

  syncToLocalStorage(items) {
    // Sync frequently accessed items to localStorage for faster retrieval
    const fastAccessKeys = [
      'recording', 'pendingRecording', 'restarting', 'micActive', 
      'cameraActive', 'recordingType', 'qualityValue', 'fpsValue'
    ];
    
    Object.entries(items).forEach(([key, value]) => {
      if (fastAccessKeys.includes(key)) {
        try {
          localStorage.setItem(`camcordity_${key}`, JSON.stringify(value));
        } catch (error) {
          console.error(`Failed to sync localStorage item ${key}:`, error);
        }
      }
    });
  }
}

// Create the storage instance
const storage = new WebStorage();

// Export a chrome.storage.local compatible API
export const local = {
  get: (keys) => storage.get(keys),
  set: (items) => storage.set(items),
  remove: (keys) => storage.remove(keys),
  clear: () => storage.clear()
};

// For backwards compatibility, also export the main storage object
export default { local };