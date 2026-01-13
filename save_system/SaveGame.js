import { SaveMetadata } from './SaveMetadata.js';

/**
 * SaveGame Class
 * 
 * Container for a complete save game, including both metadata and the actual game state.
 * This is the top-level structure that gets serialized to disk.
 */

export class SaveGame {
  constructor(metadata = null, gameState = null) {
    this.metadata = metadata || new SaveMetadata();
    this.gameState = gameState || {};
  }

  /**
   * Convert entire save game to JSON-serializable object
   * @returns {Object} Complete save data
   */
  toJSON() {
    return {
      metadata: this.metadata.toJSON(),
      gameState: this.gameState
    };
  }

  /**
   * Create SaveGame from JSON object
   * @param {Object} json - JSON object
   * @returns {SaveGame} New SaveGame instance
   */
  static fromJSON(json) {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid save data: expected object');
    }

    const metadata = json.metadata ? SaveMetadata.fromJSON(json.metadata) : new SaveMetadata();
    const gameState = json.gameState || {};

    return new SaveGame(metadata, gameState);
  }

  /**
   * Validate that this save game is complete and valid
   * @returns {boolean} True if valid
   */
  isValid() {
    return this.metadata && this.metadata.isValid() && this.gameState !== null;
  }

  /**
   * Get a summary of this save for debugging
   * @returns {string} Summary string
   */
  toString() {
    return `SaveGame[${this.metadata.saveName}] - ` +
           `Version: ${this.metadata.saveVersion}, ` +
           `Time: ${this.metadata.getFormattedGameTime()}, ` +
           `Saved: ${this.metadata.getFormattedTimestamp()}`;
  }
}
