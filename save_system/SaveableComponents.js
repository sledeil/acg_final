import { SaveableComponent } from './ISaveable.js';
import { JsonSerializer } from './JsonSerializer.js';
import * as THREE from 'three';

/**
 * SpaceshipSaveComponent
 * 
 * Concrete implementation of ISaveable for the player's spaceship.
 * Demonstrates how to implement the save/load interface for a game object.
 */

export class SpaceshipSaveComponent extends SaveableComponent {
  constructor(spaceship) {
    super();
    this.spaceship = spaceship; // Reference to the actual game object
  }

  /**
   * Get unique identifier for this component
   * @returns {string} Unique ID
   */
  getSaveId() {
    return 'player_spaceship';
  }

  /**
   * Get current save data version
   * @returns {number} Version number
   */
  getSaveVersion() {
    return 1;
  }

  /**
   * Serialize spaceship state to plain object
   * @returns {Object} Serialized spaceship data
   */
  toSaveData() {
    // CRITICAL: Save physics position (Sun frame), not visual mesh position (frame-relative)
    // The physics body position is always in the Sun (inertial) reference frame
    // Visual mesh position = physics position + frame offset (applied in updateReferenceFrame)
    const physicsBody = this.spaceship.userData.physicsBody;
    const positionToSave = physicsBody ? physicsBody.position : this.spaceship.position;
    const velocityToSave = physicsBody ? physicsBody.velocity : (this.spaceship.userData.velocity || new THREE.Vector3());
    
    return {
      // Transform data - ALWAYS in Sun (inertial) frame for physics consistency
      position: JsonSerializer.serializeVector3(positionToSave),
      rotation: JsonSerializer.serializeQuaternion(this.spaceship.quaternion),
      velocity: JsonSerializer.serializeVector3(velocityToSave),
      
      // Game state
      fuel: this.spaceship.userData.fuel || 0,
      fuelMass: this.spaceship.userData.fuelMass || 0,
      maxFuelMass: this.spaceship.userData.maxFuelMass || 50,
      health: this.spaceship.userData.health || 100,
      score: this.spaceship.userData.score || 0,
      
      // Visual state
      modelName: this.spaceship.userData.modelName || 'default',
      scale: JsonSerializer.serializeVector3(this.spaceship.scale),
      
      // Save metadata
      saveVersion: this.getSaveVersion(),
      saveId: this.getSaveId()
    };
  }

  /**
   * Restore spaceship state from saved data
   * @param {Object} data - Saved state
   */
  fromSaveData(data) {
    if (!this.validateSaveData(data)) {
      throw new Error('Invalid spaceship save data');
    }

    // CRITICAL: Restore position to physics body (Sun frame), not visual mesh
    // The saved position is in the Sun (inertial) reference frame
    // Visual mesh position will be calculated by updateReferenceFrame()
    const physicsBody = this.spaceship.userData.physicsBody;
    
    // Restore transform
    if (data.position) {
      const savedPosition = JsonSerializer.deserializeVector3(data.position);
      if (physicsBody) {
        // Restore directly to physics body (Sun frame)
        physicsBody.position.copy(savedPosition);
      } else {
        // Fallback: restore to mesh position (will be synced to physics later)
        this.spaceship.position.copy(savedPosition);
      }
    }
    if (data.rotation) {
      this.spaceship.quaternion.copy(JsonSerializer.deserializeQuaternion(data.rotation));
    }
    if (data.velocity) {
      const savedVelocity = JsonSerializer.deserializeVector3(data.velocity);
      if (physicsBody) {
        // Restore directly to physics body
        physicsBody.velocity.copy(savedVelocity);
      }
      // Also update userData for sync
      this.spaceship.userData.velocity = savedVelocity.clone();
    }

    // Restore game state
    if (typeof data.fuel !== 'undefined') {
      this.spaceship.userData.fuel = data.fuel;
    }
    if (typeof data.fuelMass !== 'undefined') {
      this.spaceship.userData.fuelMass = data.fuelMass;
    }
    if (typeof data.maxFuelMass !== 'undefined') {
      this.spaceship.userData.maxFuelMass = data.maxFuelMass;
    }
    if (typeof data.health !== 'undefined') {
      this.spaceship.userData.health = data.health;
    }
    if (typeof data.score !== 'undefined') {
      this.spaceship.userData.score = data.score;
    }

    // Restore visual state
    if (data.scale) {
      this.spaceship.scale.copy(JsonSerializer.deserializeVector3(data.scale));
    }
    if (data.modelName) {
      this.spaceship.userData.modelName = data.modelName;
    }

    console.log('Spaceship state restored from save data (physics position in Sun frame)');
  }

  /**
   * Validate saved data structure
   * @param {Object} data - Data to validate
   * @returns {boolean} True if valid
   */
  validateSaveData(data) {
    if (!super.validateSaveData(data)) {
      return false;
    }

    // Check required fields
    if (!data.position || !data.rotation) {
      console.error('Missing required fields: position, rotation');
      return false;
    }

    // Check data types
    if (typeof data.fuel !== 'number' || data.fuel < 0) {
      console.error('Invalid fuel value');
      return false;
    }

    return true;
  }
}

/**
 * CelestialBodySaveComponent
 * 
 * Saveable component for celestial bodies (planets, moons, etc.)
 */

export class CelestialBodySaveComponent extends SaveableComponent {
  constructor(body, bodyId) {
    super();
    this.body = body;
    this.bodyId = bodyId; // Unique identifier (e.g., 'earth', 'moon', 'mars')
  }

  getSaveId() {
    return `celestial_${this.bodyId}`;
  }

  getSaveVersion() {
    return 1;
  }

  toSaveData() {
    return {
      id: this.bodyId,
      position: JsonSerializer.serializeVector3(this.body.position),
      velocity: JsonSerializer.serializeVector3(this.body.velocity),
      acceleration: JsonSerializer.serializeVector3(this.body.acceleration),
      mass: this.body.mass,
      radius: this.body.radius,
      type: this.body.type,
      fixed: this.body.fixed,
      name: this.body.name,
      saveVersion: this.getSaveVersion(),
      saveId: this.getSaveId()
    };
  }

  fromSaveData(data) {
    if (!this.validateSaveData(data)) {
      throw new Error(`Invalid celestial body save data for ${this.bodyId}`);
    }

    this.body.position.copy(JsonSerializer.deserializeVector3(data.position));
    this.body.velocity.copy(JsonSerializer.deserializeVector3(data.velocity));
    this.body.acceleration.copy(JsonSerializer.deserializeVector3(data.acceleration));
    this.body.mass = data.mass;
    this.body.radius = data.radius;
    this.body.type = data.type;
    this.body.fixed = data.fixed;
    this.body.name = data.name;

    console.log(`Celestial body '${this.bodyId}' state restored from save data`);
  }

  validateSaveData(data) {
    if (!super.validateSaveData(data)) {
      return false;
    }

    if (!data.position || !data.velocity || typeof data.mass !== 'number') {
      console.error(`Invalid celestial body data for ${this.bodyId}`);
      return false;
    }

    return true;
  }
}

/**
 * GameStateSaveComponent
 * 
 * Saveable component for overall game state (time, score, settings, etc.)
 */

export class GameStateSaveComponent extends SaveableComponent {
  constructor(game) {
    super();
    this.game = game;
  }

  getSaveId() {
    return 'game_state';
  }

  getSaveVersion() {
    return 1;
  }

  toSaveData() {
    return {
      // Game time
      gameTime: this.game.gameTime || 0,
      isPaused: this.game.isPaused || false,
      gameStarted: this.game.gameStarted || false,

      // Player stats
      fuel: this.game.fuel || 0,
      maxFuel: this.game.maxFuel || 0,
      score: this.game.score || 0,

      // Camera state
      cameraDistance: this.game.cameraDistance || 200,
      cameraYaw: this.game.cameraYaw || 0,
      cameraPitch: this.game.cameraPitch || 0,

      // Reference frame
      referenceFrame: this.game.referenceFrame || 'sun',

      // Physics settings
      physicsConfig: {
        timeScale: this.game.physics?.timeScale || 0.1,
        subSteps: this.game.physics?.subSteps || 200,
        gravityConstant: this.game.physics?.G || 1.0
      },

      // Prediction settings
      deltaVMagnitude: this.game.deltaVMagnitude || 0.05,
      predictionSteps: this.game.predictionSteps || 10000,
      predictionStepSize: this.game.predictionStepSize || 0.05,

      // Metadata
      saveVersion: this.getSaveVersion(),
      saveId: this.getSaveId()
    };
  }

  fromSaveData(data) {
    if (!this.validateSaveData(data)) {
      throw new Error('Invalid game state save data');
    }

    // Restore game time
    if (typeof data.gameTime !== 'undefined') {
      this.game.gameTime = data.gameTime;
    }
    if (typeof data.isPaused !== 'undefined') {
      this.game.isPaused = data.isPaused;
    }
    if (typeof data.gameStarted !== 'undefined') {
      this.game.gameStarted = data.gameStarted;
    }

    // Restore player stats
    if (typeof data.fuel !== 'undefined') {
      this.game.fuel = data.fuel;
    }
    if (typeof data.maxFuel !== 'undefined') {
      this.game.maxFuel = data.maxFuel;
    }
    if (typeof data.score !== 'undefined') {
      this.game.score = data.score;
    }

    // Restore camera
    if (typeof data.cameraDistance !== 'undefined') {
      this.game.cameraDistance = data.cameraDistance;
    }
    if (typeof data.cameraYaw !== 'undefined') {
      this.game.cameraYaw = data.cameraYaw;
    }
    if (typeof data.cameraPitch !== 'undefined') {
      this.game.cameraPitch = data.cameraPitch;
    }

    // Restore reference frame
    if (data.referenceFrame) {
      this.game.referenceFrame = data.referenceFrame;
    }

    // Restore physics settings
    if (data.physicsConfig && this.game.physics) {
      if (typeof data.physicsConfig.timeScale !== 'undefined') {
        this.game.physics.setTimeScale(data.physicsConfig.timeScale);
      }
      if (typeof data.physicsConfig.subSteps !== 'undefined') {
        this.game.physics.subSteps = data.physicsConfig.subSteps;
      }
    }

    // Restore prediction settings
    if (typeof data.deltaVMagnitude !== 'undefined') {
      this.game.deltaVMagnitude = data.deltaVMagnitude;
    }
    if (typeof data.predictionSteps !== 'undefined') {
      this.game.predictionSteps = data.predictionSteps;
    }
    if (typeof data.predictionStepSize !== 'undefined') {
      this.game.predictionStepSize = data.predictionStepSize;
    }

    console.log('Game state restored from save data');
  }

  validateSaveData(data) {
    if (!super.validateSaveData(data)) {
      return false;
    }

    // Basic validation - ensure critical fields exist
    if (typeof data.gameTime !== 'number' || data.gameTime < 0) {
      console.error('Invalid game time');
      return false;
    }

    return true;
  }
}
