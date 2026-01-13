# Save System Integration Guide

## Overview

This document explains how to integrate the save/load system into your space navigation game's main loop and object lifecycle.

## Architecture Summary

The save system consists of:
- **ISaveable Interface / SaveableComponent**: Base class for all saveable objects
- **SaveMetadata**: Lightweight metadata for UI display
- **SaveGame**: Container for metadata + game state
- **SaveManager**: Singleton that handles all I/O operations
- **JsonSerializer**: Helper for THREE.js types and complex objects
- **VersionMigrator**: Handles loading from older save versions
- **SaveableComponents**: Concrete implementations for Spaceship, CelestialBody, GameState

## Integration Steps

### 1. Initialize SaveManager at Game Startup

In your `SpaceGame` constructor or `init()` method:

```javascript
import { SaveManager } from './save_system/SaveManager.js';

class SpaceGame {
  constructor() {
    // ... existing initialization ...
    
    // Initialize save manager
    this.saveManager = SaveManager.getInstance();
    
    // Optional: Create saveable components for key objects
    this.saveableComponents = new Map();
  }
}
```

### 2. Create Saveable Components for Game Objects

When creating game objects (spaceship, planets), wrap them in saveable components:

```javascript
import { SpaceshipSaveComponent, CelestialBodySaveComponent, GameStateSaveComponent } 
  from './save_system/SaveableComponents.js';

// In createSpaceship():
createSpaceship() {
  this.spaceship = new THREE.Group();
  // ... setup spaceship ...
  
  // Create saveable component
  const spaceshipSave = new SpaceshipSaveComponent(this.spaceship);
  this.saveableComponents.set('spaceship', spaceshipSave);
}

// In createPlanet() or similar:
createCelestialBody(name, config) {
  const body = this.physics.addCelestialBody(config);
  
  // Create saveable component
  const bodySave = new CelestialBodySaveComponent(body, name);
  this.saveableComponents.set(`celestial_${name}`, bodySave);
  
  return body;
}

// In init():
init() {
  // ... existing setup ...
  
  // Create game state saveable
  const gameStateSave = new GameStateSaveComponent(this);
  this.saveableComponents.set('game_state', gameStateSave);
}
```

### 3. Implement Save Game Function

Add a method to serialize the entire game state:

```javascript
async saveGame(slot, saveName) {
  try {
    // Collect all saveable data
    const gameState = {
      spaceship: this.saveableComponents.get('spaceship')?.toSaveData(),
      gameState: this.saveableComponents.get('game_state')?.toSaveData(),
      celestialBodies: [],
      orbitTrails: this.serializeOrbitTrails() // Custom method
    };

    // Serialize all celestial bodies
    for (const [key, component] of this.saveableComponents.entries()) {
      if (key.startsWith('celestial_')) {
        gameState.celestialBodies.push(component.toSaveData());
      }
    }

    // Additional metadata for save slot UI
    const additionalMetadata = {
      playerName: 'Commander',
      gameTime: this.gameTime,
      currentLocation: this.getCurrentLocationName(),
      fuelRemaining: this.fuel,
      score: this.score,
      checkpointsReached: this.checkpoints.filter(c => c.reached).length
    };

    // Save to slot
    await this.saveManager.saveToSlot(slot, saveName, gameState, additionalMetadata);
    
    console.log(`Game saved to slot ${slot}!`);
    return true;

  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}
```

### 4. Implement Load Game Function

Add a method to deserialize and restore game state:

```javascript
async loadGame(slot) {
  try {
    // Load save data
    const saveGame = await this.saveManager.loadFromSlot(slot);
    const gameState = saveGame.gameState;

    // Pause game during load
    const wasPaused = this.isPaused;
    this.isPaused = true;

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

    // Restore pause state
    this.isPaused = wasPaused;

    console.log(`Game loaded from slot ${slot}!`);
    return true;

  } catch (error) {
    console.error('Failed to load game:', error);
    return false;
  }
}
```

### 5. Add UI Controls

Bind keyboard shortcuts or UI buttons to save/load:

```javascript
setupControls() {
  // ... existing controls ...

  window.addEventListener('keydown', (e) => {
    // F5 - Quick save to slot 0
    if (e.code === 'F5') {
      e.preventDefault();
      this.saveGame(0, 'Quick Save');
    }

    // F9 - Quick load from slot 0
    if (e.code === 'F9') {
      e.preventDefault();
      this.loadGame(0);
    }

    // ESC - Open save/load menu (implement your UI)
    if (e.code === 'Escape') {
      this.openSaveLoadMenu();
    }
  });
}
```

### 6. Create Save/Load UI Menu

Create an HTML UI for managing save slots:

```javascript
async openSaveLoadMenu() {
  // Get all save metadata
  const saves = await this.saveManager.getAllSaveMetadata();

  // Display UI (implement based on your design)
  const menuHTML = saves.map((metadata, slot) => {
    if (metadata) {
      return `
        <div class="save-slot">
          <strong>${metadata.saveName}</strong><br>
          Time: ${metadata.getFormattedGameTime()}<br>
          Saved: ${metadata.getFormattedTimestamp()}<br>
          <button onclick="game.loadGame(${slot})">Load</button>
          <button onclick="game.deleteSave(${slot})">Delete</button>
        </div>
      `;
    } else {
      return `
        <div class="save-slot empty">
          <em>Empty Slot ${slot}</em><br>
          <button onclick="game.saveToSlotWithPrompt(${slot})">Save Here</button>
        </div>
      `;
    }
  }).join('');

  // Show menu (implement your UI logic)
  document.getElementById('save-menu').innerHTML = menuHTML;
  document.getElementById('save-menu').style.display = 'block';
}

async saveToSlotWithPrompt(slot) {
  const name = prompt('Enter save name:', `Save ${slot + 1}`);
  if (name) {
    await this.saveGame(slot, name);
    this.openSaveLoadMenu(); // Refresh UI
  }
}

async deleteSave(slot) {
  if (confirm(`Delete save in slot ${slot}?`)) {
    await this.saveManager.deleteSaveSlot(slot);
    this.openSaveLoadMenu(); // Refresh UI
  }
}
```

### 7. Handle Auto-Save

Implement periodic auto-saving:

```javascript
setupAutoSave() {
  // Auto-save every 5 minutes to slot 9
  setInterval(() => {
    if (this.gameStarted && !this.isPaused) {
      console.log('Auto-saving...');
      this.saveGame(9, 'Auto Save');
    }
  }, 5 * 60 * 1000); // 5 minutes
}
```

### 8. Custom Serialization for Complex Objects

For orbit trails or other complex data:

```javascript
serializeOrbitTrails() {
  const trails = {};
  for (const [bodyName, trailData] of this.orbitTrails.entries()) {
    trails[bodyName] = {
      positions: trailData.positions.map(pos => 
        JsonSerializer.serializeVector3(pos)
      )
    };
  }
  return trails;
}

deserializeOrbitTrails(trailsData) {
  this.orbitTrails.clear();
  for (const [bodyName, trailData] of Object.entries(trailsData)) {
    const positions = trailData.positions.map(pos => 
      JsonSerializer.deserializeVector3(pos)
    );
    // Reconstruct trail line
    this.recreateOrbitTrail(bodyName, positions);
  }
}
```

## Best Practices

1. **Save at Safe Points**: Only allow saving when the game is in a stable state (paused, not in a cutscene, etc.)

2. **Validate Before Loading**: Always validate loaded data to prevent crashes from corrupted saves

3. **Version Migration**: Update `VersionMigrator` whenever you change save data structure

4. **Compress Large Data**: Use `JsonSerializer.compressFloatingPoint()` to reduce save file size

5. **Error Handling**: Always wrap save/load operations in try-catch blocks

6. **User Feedback**: Show loading/saving indicators and success/error messages

7. **Backup Important Saves**: Implement export/import for player backups

8. **Test Thoroughly**: Test saving/loading at different game states and verify data integrity

## Performance Considerations

- **Lazy Loading**: Only load save metadata for UI, not full game state
- **Background Saving**: Use async/await to prevent frame drops
- **Throttle Auto-Save**: Don't auto-save too frequently
- **IndexedDB**: Prefer IndexedDB over localStorage for large saves

## Troubleshooting

**Issue**: Save file too large for localStorage
- **Solution**: System automatically uses IndexedDB when available. If needed, reduce orbit trail history or compress data.

**Issue**: Load fails with "Invalid save data"
- **Solution**: Check that all saveableComponents implement validation correctly. Use try-catch to handle corrupted saves gracefully.

**Issue**: Version migration fails
- **Solution**: Ensure VersionMigrator has migration functions for all version jumps. Consider adding a "reset to defaults" option for unrecoverable saves.

## Example Full Integration

See `game_v2_with_saves.js` (example file to be created) for a complete working example.
