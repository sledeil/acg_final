/**
 * Game Integration Example for Save System
 * 
 * This file shows how to integrate the save system into your existing SpaceGame class.
 * Copy these methods into your game_v2.js file and adapt as needed.
 */

import { 
  SaveManager, 
  GameStateSaveComponent,
  SpaceshipSaveComponent,
  CelestialBodySaveComponent,
  JsonSerializer
} from './index.js';

/**
 * Example: Add these properties to your SpaceGame constructor
 */
function exampleConstructorAdditions() {
  // Add to constructor in game_v2.js:
  this.saveManager = SaveManager.getInstance();
  this.saveableComponents = new Map();
  
  // Track if we're loading (to prevent conflicts)
  this.isLoading = false;
}

/**
 * Example: Initialize saveable components after game objects are created
 * Call this in your init() method after creating spaceship, planets, etc.
 */
function initializeSaveableComponents(game) {
  console.log('Initializing saveable components...');

  // Game state component
  const gameStateSave = new GameStateSaveComponent(game);
  game.saveableComponents.set('game_state', gameStateSave);

  // Spaceship component
  if (game.spaceship) {
    const spaceshipSave = new SpaceshipSaveComponent(game.spaceship);
    game.saveableComponents.set('spaceship', spaceshipSave);
  }

  // Celestial bodies
  const bodyNames = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'phobos', 'jupiter'];
  for (const name of bodyNames) {
    const body = game.physics.celestialBodies.find(b => 
      b.name && b.name.toLowerCase() === name
    );
    if (body) {
      const bodySave = new CelestialBodySaveComponent(body, name);
      game.saveableComponents.set(`celestial_${name}`, bodySave);
    }
  }

  console.log(`✅ Initialized ${game.saveableComponents.size} saveable components`);
}

/**
 * Save game to a specific slot
 * Add this method to your SpaceGame class
 */
async function saveGame(slot, saveName) {
  try {
    console.log(`💾 Saving game to slot ${slot}: ${saveName}...`);

    // Collect spaceship data
    const spaceshipData = this.saveableComponents.get('spaceship')?.toSaveData();

    // Collect game state data
    const gameStateData = this.saveableComponents.get('game_state')?.toSaveData();

    // Collect celestial bodies data
    const celestialBodies = [];
    for (const [key, component] of this.saveableComponents.entries()) {
      if (key.startsWith('celestial_')) {
        celestialBodies.push(component.toSaveData());
      }
    }

    // Serialize orbit trails (custom implementation)
    const orbitTrails = this.serializeOrbitTrails();

    // Collect all game state
    const gameState = {
      spaceship: spaceshipData,
      gameState: gameStateData,
      celestialBodies: celestialBodies,
      orbitTrails: orbitTrails,
      
      // Additional game-specific data
      velocityAdjustment: JsonSerializer.serializeVector3(this.velocityAdjustment),
      predictedTrajectory: this.predictedTrajectory.map(pt => ({
        position: JsonSerializer.serializeVector3(pt.position),
        time: pt.time
      }))
    };

    // Create metadata for save slot
    const metadata = {
      playerName: 'Commander',
      gameTime: this.gameTime,
      currentLocation: this.getCurrentLocationName(),
      fuelRemaining: this.fuel,
      score: this.score,
      checkpointsReached: this.checkpoints.filter(cp => cp.reached).length
    };

    // Save to slot
    await this.saveManager.saveToSlot(slot, saveName, gameState, metadata);

    console.log(`✅ Game saved successfully to slot ${slot}!`);
    this.showNotification(`Game saved: ${saveName}`, 'success');
    return true;

  } catch (error) {
    console.error('❌ Failed to save game:', error);
    this.showNotification(`Save failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Load game from a specific slot
 * Add this method to your SpaceGame class
 */
async function loadGame(slot) {
  try {
    console.log(`📂 Loading game from slot ${slot}...`);

    // Set loading flag
    this.isLoading = true;

    // Pause game during load
    const wasPaused = this.isPaused;
    this.isPaused = true;

    // Load save data
    const saveGame = await this.saveManager.loadFromSlot(slot);
    const gameState = saveGame.gameState;

    console.log('Loaded save:', saveGame.toString());

    // Restore spaceship state
    if (gameState.spaceship) {
      this.saveableComponents.get('spaceship')?.fromSaveData(gameState.spaceship);
    }

    // Restore game state
    if (gameState.gameState) {
      this.saveableComponents.get('game_state')?.fromSaveData(gameState.gameState);
    }

    // Restore celestial bodies
    if (gameState.celestialBodies && Array.isArray(gameState.celestialBodies)) {
      for (const bodyData of gameState.celestialBodies) {
        const component = this.saveableComponents.get(bodyData.saveId);
        if (component) {
          component.fromSaveData(bodyData);
        }
      }
    }

    // Restore orbit trails
    if (gameState.orbitTrails) {
      this.deserializeOrbitTrails(gameState.orbitTrails);
    }

    // Restore velocity adjustment
    if (gameState.velocityAdjustment) {
      this.velocityAdjustment.copy(
        JsonSerializer.deserializeVector3(gameState.velocityAdjustment)
      );
    }

    // Restore predicted trajectory
    if (gameState.predictedTrajectory && Array.isArray(gameState.predictedTrajectory)) {
      this.predictedTrajectory = gameState.predictedTrajectory.map(pt => ({
        position: JsonSerializer.deserializeVector3(pt.position),
        time: pt.time
      }));
      this.updateTrajectoryVisualization();
    }

    // Update HUD and visuals
    this.updateHUD();
    this.updateCameraPosition();

    // Restore pause state
    this.isPaused = wasPaused;
    this.isLoading = false;

    console.log(`✅ Game loaded successfully from slot ${slot}!`);
    this.showNotification(`Game loaded: ${saveGame.metadata.saveName}`, 'success');
    return true;

  } catch (error) {
    console.error('❌ Failed to load game:', error);
    this.showNotification(`Load failed: ${error.message}`, 'error');
    this.isLoading = false;
    return false;
  }
}

/**
 * Serialize orbit trails for saving
 * Add this helper method to your SpaceGame class
 */
function serializeOrbitTrails() {
  const trails = {};
  
  for (const [bodyName, trailData] of this.orbitTrails.entries()) {
    // Only save last N points to reduce file size
    const maxPoints = 1000;
    const positions = trailData.positions.slice(-maxPoints);
    
    trails[bodyName] = {
      positions: JsonSerializer.serializeArray(
        positions, 
        JsonSerializer.serializeVector3
      )
    };
  }
  
  return trails;
}

/**
 * Deserialize orbit trails when loading
 * Add this helper method to your SpaceGame class
 */
function deserializeOrbitTrails(trailsData) {
  // Clear existing trails
  for (const [bodyName, trailData] of this.orbitTrails.entries()) {
    if (trailData.line) {
      this.scene.remove(trailData.line);
      trailData.line.geometry.dispose();
      trailData.line.material.dispose();
    }
  }
  this.orbitTrails.clear();

  // Restore trails from save data
  for (const [bodyName, trailData] of Object.entries(trailsData)) {
    const positions = JsonSerializer.deserializeArray(
      trailData.positions,
      JsonSerializer.deserializeVector3
    );

    // Recreate trail visualization
    this.recreateOrbitTrail(bodyName, positions);
  }

  console.log(`Restored ${Object.keys(trailsData).length} orbit trails`);
}

/**
 * Recreate orbit trail line from positions
 * Add this helper method to your SpaceGame class
 */
function recreateOrbitTrail(bodyName, positions) {
  if (positions.length === 0) return;

  // Create line geometry
  const geometry = new THREE.BufferGeometry().setFromPoints(positions);
  
  // Choose color based on body name
  const colors = {
    'spaceship': 0x00ff00,
    'earth': 0x0088ff,
    'moon': 0xcccccc,
    'mars': 0xff4400,
    'default': 0x666666
  };
  const color = colors[bodyName.toLowerCase()] || colors.default;

  const material = new THREE.LineBasicMaterial({ 
    color: color,
    transparent: true,
    opacity: 0.6
  });

  const line = new THREE.Line(geometry, material);
  this.scene.add(line);

  // Store in map
  this.orbitTrails.set(bodyName, {
    positions: positions,
    line: line
  });
}

/**
 * Get current location name for save metadata
 * Add this helper method to your SpaceGame class
 */
function getCurrentLocationName() {
  if (!this.spaceship || !this.physics.spacecraft) {
    return 'Unknown';
  }

  const position = this.physics.spacecraft.position;
  let closestBody = null;
  let closestDistance = Infinity;

  // Find closest celestial body
  for (const body of this.physics.celestialBodies) {
    if (body.type === 'spacecraft') continue;
    
    const distance = position.distanceTo(body.position);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestBody = body;
    }
  }

  if (closestBody) {
    const name = closestBody.name || 'Unknown';
    const distanceKm = (closestDistance * 1000).toFixed(0); // Convert to km (scaled)
    return `Near ${name} (${distanceKm} km)`;
  }

  return 'Deep Space';
}

/**
 * Show notification to user
 * Add this helper method to your SpaceGame class
 */
function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Create notification element if it doesn't exist
  let notificationDiv = document.getElementById('notification');
  if (!notificationDiv) {
    notificationDiv = document.createElement('div');
    notificationDiv.id = 'notification';
    notificationDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 20px 40px;
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    `;
    document.body.appendChild(notificationDiv);
  }

  // Set color based on type
  const colors = {
    success: '#00ff00',
    error: '#ff0000',
    info: '#00ffff'
  };
  notificationDiv.style.background = 'rgba(0, 0, 0, 0.9)';
  notificationDiv.style.color = colors[type] || colors.info;
  notificationDiv.style.border = `2px solid ${colors[type] || colors.info}`;
  
  // Show notification
  notificationDiv.textContent = message;
  notificationDiv.style.opacity = '1';

  // Hide after 3 seconds
  setTimeout(() => {
    notificationDiv.style.opacity = '0';
  }, 3000);
}

/**
 * Setup keyboard controls for save/load
 * Add this to your setupControls() method
 */
function setupSaveLoadControls() {
  window.addEventListener('keydown', (e) => {
    // F5 - Quick Save to slot 0
    if (e.code === 'F5') {
      e.preventDefault();
      this.saveGame(0, 'Quick Save');
    }

    // F9 - Quick Load from slot 0
    if (e.code === 'F9') {
      e.preventDefault();
      this.loadGame(0);
    }

    // ESC - Open save/load menu
    if (e.code === 'Escape') {
      e.preventDefault();
      this.toggleSaveMenu();
    }
  });
}

/**
 * Toggle save/load menu
 * Add this method to your SpaceGame class
 */
async function toggleSaveMenu() {
  let menu = document.getElementById('save-load-menu');
  
  if (menu) {
    // Close menu
    menu.remove();
    this.isPaused = false;
    return;
  }

  // Open menu
  this.isPaused = true;

  // Get all save metadata
  const saves = await this.saveManager.getAllSaveMetadata();

  // Create menu HTML
  let slotsHTML = '';
  for (let slot = 0; slot < saves.length; slot++) {
    const metadata = saves[slot];
    
    if (metadata) {
      slotsHTML += `
        <div style="padding: 10px; margin: 5px 0; background: rgba(0, 100, 0, 0.3); border: 1px solid #00ff00; border-radius: 5px;">
          <div style="font-size: 16px; font-weight: bold; color: #00ff00;">Slot ${slot}: ${metadata.saveName}</div>
          <div style="font-size: 12px; color: #aaffaa; margin-top: 5px;">
            Time: ${metadata.getFormattedGameTime()} | 
            Location: ${metadata.currentLocation}<br>
            Saved: ${metadata.getFormattedTimestamp()}
          </div>
          <div style="margin-top: 8px;">
            <button onclick="window.game.loadGame(${slot})" style="margin-right: 5px; padding: 5px 15px; background: #00ff00; color: #000; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Load</button>
            <button onclick="window.game.saveGame(${slot}, prompt('Save name:', '${metadata.saveName}') || '${metadata.saveName}')" style="margin-right: 5px; padding: 5px 15px; background: #0088ff; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Overwrite</button>
            <button onclick="window.game.deleteSaveSlot(${slot})" style="padding: 5px 15px; background: #ff4444; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Delete</button>
          </div>
        </div>
      `;
    } else {
      slotsHTML += `
        <div style="padding: 10px; margin: 5px 0; background: rgba(50, 50, 50, 0.3); border: 1px solid #666; border-radius: 5px;">
          <div style="font-size: 16px; color: #666;">Slot ${slot}: <em>Empty</em></div>
          <div style="margin-top: 8px;">
            <button onclick="window.game.saveGame(${slot}, prompt('Save name:', 'Save ${slot + 1}') || 'Save ${slot + 1}')" style="padding: 5px 15px; background: #0088ff; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Save Here</button>
          </div>
        </div>
      `;
    }
  }

  menu = document.createElement('div');
  menu.id = 'save-load-menu';
  menu.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 9999; display: flex; align-items: center; justify-content: center;">
      <div style="background: rgba(0, 20, 0, 0.95); border: 2px solid #00ff00; border-radius: 10px; padding: 30px; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);">
        <h2 style="color: #00ff00; margin-top: 0; text-align: center; text-shadow: 0 0 10px #00ff00;">Save / Load Game</h2>
        <div style="color: #00ff00; font-family: 'Courier New', monospace;">
          ${slotsHTML}
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="document.getElementById('save-load-menu').remove(); window.game.isPaused = false;" style="padding: 10px 30px; background: #ff4444; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px;">Close</button>
        </div>
        <div style="color: #00ff00; font-size: 12px; text-align: center; margin-top: 15px; border-top: 1px solid #00ff00; padding-top: 10px;">
          Press ESC to close | F5: Quick Save | F9: Quick Load
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(menu);

  // Make game accessible from window for button onclick handlers
  window.game = this;
}

/**
 * Delete a save slot with confirmation
 * Add this method to your SpaceGame class
 */
async function deleteSaveSlot(slot) {
  if (confirm(`Delete save in slot ${slot}?`)) {
    await this.saveManager.deleteSaveSlot(slot);
    this.showNotification(`Deleted save slot ${slot}`, 'info');
    
    // Refresh menu if open
    const menu = document.getElementById('save-load-menu');
    if (menu) {
      menu.remove();
      this.toggleSaveMenu();
    }
  }
}

/**
 * Setup auto-save system
 * Call this in your init() method
 */
function setupAutoSave() {
  // Auto-save every 5 minutes to slot 9
  setInterval(() => {
    if (this.gameStarted && !this.isPaused && !this.isLoading) {
      console.log('⏰ Auto-saving...');
      this.saveGame(9, 'Auto Save').then(success => {
        if (success) {
          console.log('Auto-save complete');
        }
      });
    }
  }, 5 * 60 * 1000); // 5 minutes

  console.log('✅ Auto-save enabled (every 5 minutes to slot 9)');
}

// Export all methods for easy copying
export {
  exampleConstructorAdditions,
  initializeSaveableComponents,
  saveGame,
  loadGame,
  serializeOrbitTrails,
  deserializeOrbitTrails,
  recreateOrbitTrail,
  getCurrentLocationName,
  showNotification,
  setupSaveLoadControls,
  toggleSaveMenu,
  deleteSaveSlot,
  setupAutoSave
};
