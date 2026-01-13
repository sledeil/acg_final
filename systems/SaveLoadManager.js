/**
 * SaveLoadManager.js
 *
 * Manages all save/load operations including:
 * - Serialization/deserialization of game state
 * - Orbit trail persistence
 * - Component-based save system
 * - Save/Load UI coordination
 */

import * as THREE from 'three';
import {
  SaveManager,
  GameStateSaveComponent,
  SpaceshipSaveComponent,
  CelestialBodySaveComponent
} from '../save_system/index.js';

export class SaveLoadManager {
  /**
   * @param {Object} game - Reference to main game instance
   */
  constructor(game) {
    this.game = game;

    // Save system components
    this.saveManager = new SaveManager();
    this.saveableComponents = new Map();
    this.saveLoadUI = null;

    // Initialize
    this.initializeSaveableComponents();
  }

  /**
   * Initialize saveable components for all game objects
   */
  initializeSaveableComponents() {
    console.log('🔧 Initializing saveable components...');

    // 1. Game state component (overall game state)
    const gameStateSave = new GameStateSaveComponent(this.game);
    this.saveableComponents.set('game_state', gameStateSave);

    // 2. Spaceship component
    if (this.game.spaceship && this.game.physics.spacecraft) {
      // Store reference to physics spacecraft in spaceship userData for save component
      this.game.spaceship.userData = this.game.spaceship.userData || {};
      this.game.spaceship.userData.velocity = this.game.shipVelocity;
      this.game.spaceship.userData.fuel = this.game.fuel;
      this.game.spaceship.userData.fuelMass = this.game.fuelMass;
      this.game.spaceship.userData.maxFuelMass = this.game.maxFuelMass;
      this.game.spaceship.userData.health = 100;
      this.game.spaceship.userData.score = this.game.score;
      this.game.spaceship.userData.physicsBody = this.game.physics.spacecraft;

      const spaceshipSave = new SpaceshipSaveComponent(this.game.spaceship);
      this.saveableComponents.set('spaceship', spaceshipSave);
    }

    // 3. Celestial bodies components
    const celestialBodies = [
      { body: this.game.sunBody, name: 'sun' },
      { body: this.game.mercuryBody, name: 'mercury' },
      { body: this.game.venusBody, name: 'venus' },
      { body: this.game.earthBody, name: 'earth' },
      { body: this.game.moonBody, name: 'moon' },
      { body: this.game.marsBody, name: 'mars' },
      { body: this.game.phobosBody, name: 'phobos' },
      { body: this.game.jupiterBody, name: 'jupiter' },
      { body: this.game.halleyBody, name: 'halley' }
    ];

    for (const { body, name } of celestialBodies) {
      if (body) {
        const bodySave = new CelestialBodySaveComponent(body, name);
        this.saveableComponents.set(`celestial_${name}`, bodySave);
      }
    }

    const componentCount = this.saveableComponents.size;
    console.log(`✅ Initialized ${componentCount} saveable components`);
    console.log('   - 1 game state');
    console.log('   - 1 spaceship');
    console.log(`   - ${componentCount - 2} celestial bodies`);
  }

  /**
   * Initialize Save/Load UI
   */
  async initializeSaveLoadUI() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // Dynamically import SaveLoadUI to avoid circular dependencies
    try {
      const { SaveLoadUI } = await import('../ui/save_load_ui.js');
      this.saveLoadUI = new SaveLoadUI(this.game);
      console.log('✅ Save/Load UI initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Save/Load UI:', error);
    }
  }

  /**
   * Get current location name based on spaceship position
   */
  getCurrentLocationName() {
    if (!this.game.spaceship) return 'Unknown';

    const position = this.game.physics.spacecraft.position;
    const distances = [
      { name: 'Sun', body: this.game.sunBody },
      { name: 'Mercury', body: this.game.mercuryBody },
      { name: 'Venus', body: this.game.venusBody },
      { name: 'Earth', body: this.game.earthBody },
      { name: 'Moon', body: this.game.moonBody },
      { name: 'Mars', body: this.game.marsBody },
      { name: 'Phobos', body: this.game.phobosBody },
      { name: 'Jupiter', body: this.game.jupiterBody },
      { name: 'Halley\'s Comet', body: this.game.halleyBody }
    ].filter(item => item.body)
     .map(item => ({
       name: item.name,
       distance: position.distanceTo(item.body.position)
     }))
     .sort((a, b) => a.distance - b.distance);

    return distances.length > 0 ? `Near ${distances[0].name}` : 'Deep Space';
  }

  /**
   * Serialize orbit trails for saving
   */
  serializeOrbitTrails() {
    const trails = {};

    if (this.game.orbitTrails && this.game.orbitTrails.size > 0) {
      for (const [bodyName, trailData] of this.game.orbitTrails.entries()) {
        if (trailData.positions && trailData.positions.length > 0) {
          trails[bodyName] = {
            positions: trailData.positions.map(pos => ({
              x: pos.x,
              y: pos.y,
              z: pos.z
            })),
            count: trailData.positions.length
          };
        }
      }
    }

    console.log(`📊 Serialized ${Object.keys(trails).length} orbit trails`);
    return trails;
  }

  /**
   * Save the current game state to a slot
   */
  async saveGame(slotIndex = 0, saveName = null) {
    try {
      console.log(`💾 Saving game to slot ${slotIndex}...`);

      if (slotIndex < 0 || slotIndex > 9) {
        console.error('Invalid save slot. Must be 0-9.');
        return false;
      }

      // Collect state from all saveable components
      const gameState = {};
      for (const [key, component] of this.saveableComponents) {
        gameState[key] = component.toSaveData();
      }

      // Add additional game state
      gameState.orbitTrails = this.serializeOrbitTrails();
      gameState.currentTimeScale = this.game.timeScale;
      gameState.referenceFrame = this.game.referenceFrame;
      gameState.cameraState = {
        position: this.game.camera.position.toArray(),
        rotation: this.game.camera.rotation.toArray(),
        fov: this.game.camera.fov
      };

      gameState.fuelData = {
        fuelMass: this.game.fuelMass,
        maxFuelMass: this.game.maxFuelMass,
        fuel: this.game.fuel,
        dryMass: this.game.dryMass,
        exhaustVelocity: this.game.exhaustVelocity
      };

      const additionalMetadata = {
        currentLocation: this.getCurrentLocationName(),
        gameTime: this.game.gameTime || 0,
        fuelRemaining: this.game.fuelMass,
        score: this.game.score
      };

      await this.saveManager.saveToSlot(
        slotIndex,
        saveName || `Save ${slotIndex + 1}`,
        gameState,
        additionalMetadata
      );

      console.log(`✅ Game saved successfully to slot ${slotIndex}`);
      return true;
    } catch (error) {
      console.error('Error saving game:', error);
      return false;
    }
  }

  /**
   * Deserialize orbit trail data from save format
   */
  deserializeOrbitTrails(serializedTrails) {
    const trails = new Map();

    for (const [bodyName, trailData] of Object.entries(serializedTrails)) {
      // Get reference to the body for this trail
      let bodyRef = null;
      if (bodyName === 'Spaceship') {
        bodyRef = { mesh: this.game.spaceship };
      } else if (bodyName === 'Sun' && this.game.sunBody) {
        bodyRef = this.game.sunBody;
      } else if (bodyName === 'Mercury' && this.game.mercuryBody) {
        bodyRef = this.game.mercuryBody;
      } else if (bodyName === 'Venus' && this.game.venusBody) {
        bodyRef = this.game.venusBody;
      } else if (bodyName === 'Earth' && this.game.earthBody) {
        bodyRef = this.game.earthBody;
      } else if (bodyName === 'Moon' && this.game.moonBody) {
        bodyRef = this.game.moonBody;
      } else if (bodyName === 'Mars' && this.game.marsBody) {
        bodyRef = this.game.marsBody;
      } else if (bodyName === 'Phobos' && this.game.phobosBody) {
        bodyRef = this.game.phobosBody;
      } else if (bodyName === 'Jupiter' && this.game.jupiterBody) {
        bodyRef = this.game.jupiterBody;
      } else if (bodyName === 'Halley\'s Commet' && this.game.halleyBody) {
        bodyRef = this.game.halleyBody;
      }

      trails.set(bodyName, {
        body: bodyRef,
        positions: trailData.positions.map(pos =>
          new THREE.Vector3(pos.x, pos.y, pos.z)
        ),
        line: null,
        geometry: null
      });
    }

    return trails;
  }

  /**
   * Recreate orbit trail visual for a celestial body
   */
  recreateOrbitTrail(bodyName) {
    const trailData = this.game.orbitTrails.get(bodyName);
    if (!trailData || !trailData.positions || trailData.positions.length === 0) {
      return;
    }

    // Remove old trail line if it exists
    if (trailData.line) {
      this.game.scene.remove(trailData.line);
      if (trailData.line.geometry) {
        trailData.line.geometry.dispose();
      }
      if (trailData.line.material) {
        trailData.line.material.dispose();
      }
    }

    // Create geometry with FULL buffer size
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.game.maxTrailPoints * 3);

    // Copy existing trail positions
    for (let i = 0; i < trailData.positions.length; i++) {
      const pos = trailData.positions[i];
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, trailData.positions.length);

    const material = new THREE.LineBasicMaterial({
      color: this.getTrailColor(bodyName),
      transparent: true,
      opacity: 0.8,
      linewidth: 5,
      depthWrite: false
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 999;
    line.frustumCulled = false;

    this.game.scene.add(line);

    trailData.line = line;
    trailData.geometry = geometry;

    console.log(`   Recreated trail for ${bodyName}: ${trailData.positions.length} points`);
  }

  /**
   * Get trail color for a celestial body
   */
  getTrailColor(bodyName) {
    const colors = {
      spaceship: 0xff0000,
      mercury: 0x8c7853,
      venus: 0xffc649,
      earth: 0x4169e1,
      moon: 0xaaaaaa,
      mars: 0xff6347,
      phobos: 0x888888,
      jupiter: 0xffa500,
      halley: 0x00ffff
    };
    return colors[bodyName.toLowerCase()] || 0xffffff;
  }

  /**
   * Load a saved game from a slot
   */
  async loadGame(slotIndex = 0) {
    try {
      console.log(`📂 Loading game from slot ${slotIndex}...`);

      if (slotIndex < 0 || slotIndex > 9) {
        console.error('Invalid save slot. Must be 0-9.');
        return false;
      }

      const saveGame = await this.saveManager.loadFromSlot(slotIndex);

      if (!saveGame) {
        console.log(`No save found in slot ${slotIndex}`);
        return false;
      }

      const { gameState, metadata } = saveGame;

      console.log(`   Loading save: ${metadata.name}`);
      console.log(`   Saved at: ${new Date(metadata.timestamp).toLocaleString()}`);
      console.log(`   Location: ${metadata.location}`);

      // Restore component states
      for (const [key, component] of this.saveableComponents) {
        if (gameState[key]) {
          component.fromSaveData(gameState[key]);
        }
      }

      // Restore spaceship userData
      if (this.game.spaceship && this.game.spaceship.userData) {
        if (typeof this.game.spaceship.userData.score !== 'undefined') {
          this.game.score = this.game.spaceship.userData.score;
        }

        if (this.game.physics.spacecraft && this.game.spaceship.userData.velocity) {
          this.game.shipVelocity.copy(this.game.spaceship.userData.velocity);
          this.game.physics.spacecraft.velocity.copy(this.game.spaceship.userData.velocity);
        }

        if (this.game.physics.spacecraft) {
          this.game.physics.spacecraft.position.copy(this.game.spaceship.position);
        }

        if (this.game.spaceshipRender && this.game.physics.spacecraft) {
          this.game.spaceshipRender.position.copy(this.game.physics.spacecraft.position);
        }
      }

      // Restore orbit trails
      if (gameState.orbitTrails) {
        for (const [bodyName, trailData] of this.game.orbitTrails.entries()) {
          if (trailData.line) {
            this.game.scene.remove(trailData.line);
            if (trailData.line.geometry) {
              trailData.line.geometry.dispose();
            }
            if (trailData.line.material) {
              trailData.line.material.dispose();
            }
          }
        }

        this.game.orbitTrails = this.deserializeOrbitTrails(gameState.orbitTrails);

        for (const bodyName of this.game.orbitTrails.keys()) {
          this.recreateOrbitTrail(bodyName);
        }

        console.log(`   Restored ${this.game.orbitTrails.size} orbit trails`);
      }

      // Restore time scale
      if (gameState.currentTimeScale !== undefined) {
        this.game.timeScale = gameState.currentTimeScale;
      }

      // Restore fuel data
      if (gameState.fuelData) {
        if (typeof gameState.fuelData.fuelMass !== 'undefined') {
          this.game.fuelMass = gameState.fuelData.fuelMass;
        }
        if (typeof gameState.fuelData.maxFuelMass !== 'undefined') {
          this.game.maxFuelMass = gameState.fuelData.maxFuelMass;
        }
        if (typeof gameState.fuelData.dryMass !== 'undefined') {
          this.game.dryMass = gameState.fuelData.dryMass;
        }
        if (typeof gameState.fuelData.exhaustVelocity !== 'undefined') {
          this.game.exhaustVelocity = gameState.fuelData.exhaustVelocity;
        }

        this.game.fuel = (this.game.fuelMass / this.game.maxFuelMass) * 100;
      }

      // Restore reference frame
      if (gameState.referenceFrame !== undefined) {
        this.game.referenceFrame = gameState.referenceFrame;
      }

      // Restore camera state
      if (gameState.cameraState) {
        this.game.camera.position.fromArray(gameState.cameraState.position);
        this.game.camera.rotation.fromArray(gameState.cameraState.rotation);
      }

      // Update HUD displays
      if (this.game.fuelDisplay) {
        this.game.fuelDisplay.textContent = this.game.fuel.toFixed(1);
      }
      if (this.game.scoreDisplay) {
        this.game.scoreDisplay.textContent = this.game.score;
      }

      console.log(`✅ Game loaded successfully from slot ${slotIndex}`);
      console.log(`   Fuel restored: ${this.game.fuel.toFixed(1)}%`);
      console.log(`   Score restored: ${this.game.score}`);
      console.log(`   Time scale: ${this.game.timeScale}x`);
      return true;
    } catch (error) {
      console.error('Error loading game:', error);
      return false;
    }
  }

  /**
   * Delete a saved game from a slot
   */
  async deleteGame(slotIndex = 0) {
    try {
      console.log(`🗑️ Deleting save from slot ${slotIndex}...`);

      if (slotIndex < 0 || slotIndex > 9) {
        console.error('Invalid save slot. Must be 0-9.');
        return false;
      }

      const hasSave = await this.saveManager.hasSave(slotIndex);
      if (!hasSave) {
        console.log(`No save found in slot ${slotIndex}`);
        return false;
      }

      await this.saveManager.deleteSlot(slotIndex);
      console.log(`✅ Save deleted from slot ${slotIndex}`);
      return true;
    } catch (error) {
      console.error('Error deleting save:', error);
      return false;
    }
  }
}
