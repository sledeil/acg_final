/**
 * ISaveable Interface
 * 
 * Defines the contract that all saveable game objects must implement.
 * This ensures consistent serialization/deserialization across all game components.
 */

/**
 * Base class for all saveable components in the game.
 * Any game object that needs to persist its state should extend this class.
 */
export class SaveableComponent {
  /**
   * Serialize this component to a plain JavaScript object
   * @returns {Object} Plain object containing all state that should be saved
   */
  toSaveData() {
    throw new Error('SaveableComponent.toSaveData() must be implemented by subclass');
  }

  /**
   * Restore this component's state from saved data
   * @param {Object} data - The saved state data
   */
  fromSaveData(data) {
    throw new Error('SaveableComponent.fromSaveData() must be implemented by subclass');
  }

  /**
   * Get a unique identifier for this component (used for save/load matching)
   * @returns {string} Unique identifier
   */
  getSaveId() {
    throw new Error('SaveableComponent.getSaveId() must be implemented by subclass');
  }

  /**
   * Get the version of this component's save data format
   * Used for handling data migrations when the save format changes
   * @returns {number} Version number (e.g., 1, 2, 3...)
   */
  getSaveVersion() {
    return 1;
  }

  /**
   * Validate that the loaded data is compatible with this component
   * @param {Object} data - The data to validate
   * @returns {boolean} True if data is valid, false otherwise
   */
  validateSaveData(data) {
    return data !== null && typeof data === 'object';
  }
}

/**
 * Helper function to check if an object implements the ISaveable interface
 * @param {Object} obj - Object to check
 * @returns {boolean} True if object is saveable
 */
export function isSaveable(obj) {
  return obj instanceof SaveableComponent ||
         (typeof obj.toSaveData === 'function' &&
          typeof obj.fromSaveData === 'function' &&
          typeof obj.getSaveId === 'function');
}
