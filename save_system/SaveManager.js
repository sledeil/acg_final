import { SaveGame } from './SaveGame.js';
import { SaveMetadata } from './SaveMetadata.js';
import { VersionMigrator } from './VersionMigrator.js';

/**
 * SaveManager - Singleton/Static Class
 * 
 * Central manager for all save/load operations. Handles:
 * - Saving game state to slots
 * - Loading game state from slots
 * - Managing save metadata
 * - Version migration
 * - Storage backend abstraction (localStorage, IndexedDB, file system)
 */

export class SaveManager {
  static instance = null;
  static CURRENT_SAVE_VERSION = 1;
  static MAX_SAVE_SLOTS = 10;
  static STORAGE_PREFIX = 'spacegame_save_';
  static METADATA_PREFIX = 'spacegame_meta_';

  /**
   * Get singleton instance
   * @returns {SaveManager} The singleton instance
   */
  static getInstance() {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  constructor() {
    if (SaveManager.instance) {
      throw new Error('SaveManager is a singleton. Use getInstance() instead.');
    }

    this.versionMigrator = new VersionMigrator();
    this.storageBackend = this.detectStorageBackend();
    
    console.log(`SaveManager initialized with ${this.storageBackend} storage`);
  }

  /**
   * Detect the best available storage backend
   * @returns {string} 'indexeddb', 'localstorage', or 'memory'
   */
  detectStorageBackend() {
    // Check for IndexedDB (best for large saves)
    if (typeof indexedDB !== 'undefined') {
      return 'indexeddb';
    }
    
    // Fallback to localStorage (limited to ~5MB)
    if (typeof localStorage !== 'undefined') {
      return 'localstorage';
    }
    
    // Last resort: in-memory storage (lost on reload)
    console.warn('No persistent storage available! Using in-memory storage.');
    this.memoryStorage = {};
    return 'memory';
  }

  /**
   * Save game to a specific slot
   * @param {number} slot - Save slot number (0-9)
   * @param {string} saveName - User-provided name for this save
   * @param {Object} gameState - The game state to save
   * @param {Object} additionalMetadata - Optional additional metadata
   * @returns {Promise<boolean>} True if save succeeded
   */
  async saveToSlot(slot, saveName, gameState, additionalMetadata = {}) {
    if (!this.isValidSlot(slot)) {
      throw new Error(`Invalid save slot: ${slot}. Must be 0-${SaveManager.MAX_SAVE_SLOTS - 1}`);
    }

    try {
      console.log(`Saving to slot ${slot}: ${saveName}`);

      // Create metadata
      const metadata = new SaveMetadata({
        slotId: slot,
        saveName: saveName,
        timestamp: Date.now(),
        saveVersion: SaveManager.CURRENT_SAVE_VERSION,
        ...additionalMetadata
      });

      // Create save game
      const saveGame = new SaveGame(metadata, gameState);

      // Validate save data
      if (!saveGame.isValid()) {
        throw new Error('Invalid save data - validation failed');
      }

      // Convert to JSON
      const saveData = saveGame.toJSON();
      const saveJson = JSON.stringify(saveData);

      // Save to storage
      await this.writeToStorage(
        `${SaveManager.STORAGE_PREFIX}${slot}`,
        saveJson
      );

      // Save metadata separately for quick loading
      await this.writeToStorage(
        `${SaveManager.METADATA_PREFIX}${slot}`,
        JSON.stringify(metadata.toJSON())
      );

      console.log(`✅ Save successful to slot ${slot} (${(saveJson.length / 1024).toFixed(2)} KB)`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to save to slot ${slot}:`, error);
      throw error;
    }
  }

  /**
   * Load game from a specific slot
   * @param {number} slot - Save slot number (0-9)
   * @returns {Promise<SaveGame>} The loaded save game
   */
  async loadFromSlot(slot) {
    if (!this.isValidSlot(slot)) {
      throw new Error(`Invalid save slot: ${slot}. Must be 0-${SaveManager.MAX_SAVE_SLOTS - 1}`);
    }

    try {
      console.log(`Loading from slot ${slot}...`);

      // Read from storage
      const saveJson = await this.readFromStorage(
        `${SaveManager.STORAGE_PREFIX}${slot}`
      );

      if (!saveJson) {
        throw new Error(`No save data found in slot ${slot}`);
      }

      // Parse JSON
      const saveData = JSON.parse(saveJson);

      // Create SaveGame object
      let saveGame = SaveGame.fromJSON(saveData);

      // Validate
      if (!saveGame.isValid()) {
        throw new Error('Loaded save data is invalid');
      }

      // Migrate if needed
      if (saveGame.metadata.saveVersion < SaveManager.CURRENT_SAVE_VERSION) {
        console.log('Save data needs migration...');
        const migratedData = this.versionMigrator.migrate(
          saveData,
          SaveManager.CURRENT_SAVE_VERSION
        );
        saveGame = SaveGame.fromJSON(migratedData);
      }

      console.log(`✅ Load successful from slot ${slot}`);
      console.log(saveGame.toString());
      
      return saveGame;

    } catch (error) {
      console.error(`❌ Failed to load from slot ${slot}:`, error);
      throw error;
    }
  }

  /**
   * Get metadata for all save slots (for UI display)
   * @returns {Promise<Array<SaveMetadata|null>>} Array of metadata (null for empty slots)
   */
  async getAllSaveMetadata() {
    const metadataList = [];

    for (let slot = 0; slot < SaveManager.MAX_SAVE_SLOTS; slot++) {
      try {
        const metaJson = await this.readFromStorage(
          `${SaveManager.METADATA_PREFIX}${slot}`
        );

        if (metaJson) {
          const metadata = SaveMetadata.fromJSON(JSON.parse(metaJson));
          metadataList.push(metadata);
        } else {
          metadataList.push(null);
        }
      } catch (error) {
        console.warn(`Failed to load metadata for slot ${slot}:`, error);
        metadataList.push(null);
      }
    }

    return metadataList;
  }

  /**
   * Delete a save slot
   * @param {number} slot - Save slot to delete
   * @returns {Promise<boolean>} True if deletion succeeded
   */
  async deleteSaveSlot(slot) {
    if (!this.isValidSlot(slot)) {
      throw new Error(`Invalid save slot: ${slot}`);
    }

    try {
      console.log(`Deleting save slot ${slot}...`);

      await this.removeFromStorage(`${SaveManager.STORAGE_PREFIX}${slot}`);
      await this.removeFromStorage(`${SaveManager.METADATA_PREFIX}${slot}`);

      console.log(`✅ Deleted slot ${slot}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to delete slot ${slot}:`, error);
      throw error;
    }
  }

  /**
   * Check if a save exists in a slot
   * @param {number} slot - Slot to check
   * @returns {Promise<boolean>} True if save exists
   */
  async hasSaveInSlot(slot) {
    if (!this.isValidSlot(slot)) {
      return false;
    }

    const data = await this.readFromStorage(`${SaveManager.STORAGE_PREFIX}${slot}`);
    return data !== null;
  }

  /**
   * Clear all save data (dangerous!)
   * @returns {Promise<void>}
   */
  async clearAllSaves() {
    console.warn('⚠️ Clearing all save data!');
    
    for (let slot = 0; slot < SaveManager.MAX_SAVE_SLOTS; slot++) {
      try {
        await this.deleteSaveSlot(slot);
      } catch (error) {
        console.error(`Failed to clear slot ${slot}:`, error);
      }
    }
  }

  // ===== Storage Backend Abstraction =====

  /**
   * Write data to storage (abstracts backend)
   * @private
   */
  async writeToStorage(key, value) {
    switch (this.storageBackend) {
      case 'indexeddb':
        return this.writeToIndexedDB(key, value);
      case 'localstorage':
        return this.writeToLocalStorage(key, value);
      case 'memory':
        return this.writeToMemory(key, value);
      default:
        throw new Error('No storage backend available');
    }
  }

  /**
   * Read data from storage (abstracts backend)
   * @private
   */
  async readFromStorage(key) {
    switch (this.storageBackend) {
      case 'indexeddb':
        return this.readFromIndexedDB(key);
      case 'localstorage':
        return this.readFromLocalStorage(key);
      case 'memory':
        return this.readFromMemory(key);
      default:
        throw new Error('No storage backend available');
    }
  }

  /**
   * Remove data from storage (abstracts backend)
   * @private
   */
  async removeFromStorage(key) {
    switch (this.storageBackend) {
      case 'indexeddb':
        return this.removeFromIndexedDB(key);
      case 'localstorage':
        return this.removeFromLocalStorage(key);
      case 'memory':
        return this.removeFromMemory(key);
      default:
        throw new Error('No storage backend available');
    }
  }

  // ===== LocalStorage Implementation =====

  writeToLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  readFromLocalStorage(key) {
    try {
      const value = localStorage.getItem(key);
      return Promise.resolve(value);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  removeFromLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // ===== Memory Storage Implementation =====

  writeToMemory(key, value) {
    this.memoryStorage[key] = value;
    return Promise.resolve();
  }

  readFromMemory(key) {
    const value = this.memoryStorage[key] || null;
    return Promise.resolve(value);
  }

  removeFromMemory(key) {
    delete this.memoryStorage[key];
    return Promise.resolve();
  }

  // ===== IndexedDB Implementation =====

  writeToIndexedDB(key, value) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SpaceGameSaves', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['saves'], 'readwrite');
        const store = transaction.objectStore('saves');
        const putRequest = store.put(value, key);

        putRequest.onsuccess = () => {
          db.close();
          resolve();
        };

        putRequest.onerror = () => {
          db.close();
          reject(putRequest.error);
        };
      };
    });
  }

  readFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SpaceGameSaves', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['saves'], 'readonly');
        const store = transaction.objectStore('saves');
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result || null);
        };

        getRequest.onerror = () => {
          db.close();
          reject(getRequest.error);
        };
      };
    });
  }

  removeFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SpaceGameSaves', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['saves'], 'readwrite');
        const store = transaction.objectStore('saves');
        const deleteRequest = store.delete(key);

        deleteRequest.onsuccess = () => {
          db.close();
          resolve();
        };

        deleteRequest.onerror = () => {
          db.close();
          reject(deleteRequest.error);
        };
      };
    });
  }

  // ===== Utility Methods =====

  /**
   * Check if slot number is valid
   * @private
   */
  isValidSlot(slot) {
    return Number.isInteger(slot) && slot >= 0 && slot < SaveManager.MAX_SAVE_SLOTS;
  }

  /**
   * Export save data as downloadable file (for backup)
   * @param {number} slot - Slot to export
   * @returns {Promise<void>}
   */
  async exportSaveToFile(slot) {
    const saveGame = await this.loadFromSlot(slot);
    const json = JSON.stringify(saveGame.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `spacegame_save_${slot}_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Import save data from file
   * @param {File} file - File to import
   * @param {number} slot - Slot to save to
   * @returns {Promise<void>}
   */
  async importSaveFromFile(file, slot) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const json = e.target.result;
          const data = JSON.parse(json);
          const saveGame = SaveGame.fromJSON(data);
          
          // Update slot ID and save
          saveGame.metadata.slotId = slot;
          
          await this.writeToStorage(
            `${SaveManager.STORAGE_PREFIX}${slot}`,
            JSON.stringify(saveGame.toJSON())
          );
          
          await this.writeToStorage(
            `${SaveManager.METADATA_PREFIX}${slot}`,
            JSON.stringify(saveGame.metadata.toJSON())
          );
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}
