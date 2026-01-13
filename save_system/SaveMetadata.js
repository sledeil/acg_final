/**
 * SaveMetadata Class
 * 
 * Contains metadata about a save file (display information, timestamps, etc.)
 * This is loaded separately from the full save data for quick UI display.
 */

export class SaveMetadata {
  constructor(options = {}) {
    this.slotId = options.slotId || 0;
    this.saveName = options.saveName || 'Untitled Save';
    this.timestamp = options.timestamp || Date.now();
    this.gameVersion = options.gameVersion || '1.0.0';
    this.saveVersion = options.saveVersion || 1;
    
    // Game-specific metadata for display
    this.playerName = options.playerName || 'Commander';
    this.gameTime = options.gameTime || 0;
    this.currentLocation = options.currentLocation || 'Unknown';
    this.thumbnailData = options.thumbnailData || null; // Optional: base64 encoded screenshot
    
    // Statistics
    this.fuelRemaining = options.fuelRemaining || 0;
    this.score = options.score || 0;
    this.checkpointsReached = options.checkpointsReached || 0;
  }

  /**
   * Convert metadata to JSON-serializable object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      slotId: this.slotId,
      saveName: this.saveName,
      timestamp: this.timestamp,
      gameVersion: this.gameVersion,
      saveVersion: this.saveVersion,
      playerName: this.playerName,
      gameTime: this.gameTime,
      currentLocation: this.currentLocation,
      thumbnailData: this.thumbnailData,
      fuelRemaining: this.fuelRemaining,
      score: this.score,
      checkpointsReached: this.checkpointsReached
    };
  }

  /**
   * Create metadata from JSON object
   * @param {Object} json - JSON object
   * @returns {SaveMetadata} New metadata instance
   */
  static fromJSON(json) {
    return new SaveMetadata(json);
  }

  /**
   * Get a human-readable timestamp
   * @returns {string} Formatted date/time
   */
  getFormattedTimestamp() {
    const date = new Date(this.timestamp);
    return date.toLocaleString();
  }

  /**
   * Get elapsed game time in a readable format
   * @returns {string} Formatted time (e.g., "1h 23m 45s")
   */
  getFormattedGameTime() {
    const hours = Math.floor(this.gameTime / 3600);
    const minutes = Math.floor((this.gameTime % 3600) / 60);
    const seconds = Math.floor(this.gameTime % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Validate that this metadata is complete and valid
   * @returns {boolean} True if valid
   */
  isValid() {
    return this.slotId >= 0 &&
           this.saveName &&
           this.timestamp > 0 &&
           this.saveVersion > 0;
  }
}
