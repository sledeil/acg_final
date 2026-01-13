/**
 * Save System Demo/Test
 * 
 * This file demonstrates how to use the save/load system.
 * Run this in a browser console to test functionality.
 */

import { 
  SaveManager, 
  GameStateSaveComponent,
  SpaceshipSaveComponent,
  CelestialBodySaveComponent,
  JsonSerializer
} from './index.js';

/**
 * Demo: Basic Save/Load Cycle
 */
async function demoBasicSaveLoad() {
  console.log('=== Demo: Basic Save/Load ===');
  
  const saveManager = SaveManager.getInstance();

  // Create mock game state
  const gameState = {
    player: {
      position: { x: 100, y: 200, z: 300 },
      velocity: { x: 1, y: 2, z: 3 },
      fuel: 75,
      health: 100
    },
    gameTime: 1234.5,
    score: 9999
  };

  // Save to slot 0
  console.log('Saving game...');
  await saveManager.saveToSlot(0, 'Test Save', gameState, {
    playerName: 'Test Commander',
    gameTime: 1234.5,
    currentLocation: 'Mars Orbit',
    fuelRemaining: 75,
    score: 9999
  });

  // Load from slot 0
  console.log('Loading game...');
  const loaded = await saveManager.loadFromSlot(0);
  
  console.log('Loaded save:', loaded.toString());
  console.log('Game state:', loaded.gameState);
  
  console.assert(loaded.metadata.saveName === 'Test Save', 'Save name mismatch!');
  console.assert(loaded.gameState.player.fuel === 75, 'Fuel mismatch!');
  
  console.log('✅ Basic save/load test passed!');
}

/**
 * Demo: Multiple Save Slots
 */
async function demoMultipleSlots() {
  console.log('\n=== Demo: Multiple Save Slots ===');
  
  const saveManager = SaveManager.getInstance();

  // Create 3 different saves
  for (let i = 0; i < 3; i++) {
    const gameState = {
      level: i + 1,
      timestamp: Date.now()
    };

    await saveManager.saveToSlot(i, `Save ${i + 1}`, gameState, {
      gameTime: i * 100,
      score: i * 1000
    });
  }

  // List all saves
  const metadata = await saveManager.getAllSaveMetadata();
  console.log('All save slots:');
  metadata.forEach((meta, slot) => {
    if (meta) {
      console.log(`  Slot ${slot}: ${meta.saveName} - ${meta.getFormattedTimestamp()}`);
    } else {
      console.log(`  Slot ${slot}: Empty`);
    }
  });

  console.log('✅ Multiple slots test passed!');
}

/**
 * Demo: THREE.js Object Serialization
 */
async function demoThreeJsSerialization() {
  console.log('\n=== Demo: THREE.js Serialization ===');
  
  // Mock THREE.Vector3 (for testing without THREE.js)
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  const vector = new Vector3(100, 200, 300);
  
  // Serialize
  const serialized = JsonSerializer.serializeVector3(vector);
  console.log('Serialized vector:', serialized);
  
  // Deserialize
  const deserialized = JsonSerializer.deserializeVector3(serialized);
  console.log('Deserialized vector:', deserialized);
  
  console.assert(deserialized.x === 100, 'X mismatch!');
  console.assert(deserialized.y === 200, 'Y mismatch!');
  console.assert(deserialized.z === 300, 'Z mismatch!');
  
  console.log('✅ THREE.js serialization test passed!');
}

/**
 * Demo: Save Deletion
 */
async function demoDeletion() {
  console.log('\n=== Demo: Save Deletion ===');
  
  const saveManager = SaveManager.getInstance();
  const slot = 5;

  // Create a save
  await saveManager.saveToSlot(slot, 'To Be Deleted', { test: true });
  
  // Verify it exists
  let exists = await saveManager.hasSaveInSlot(slot);
  console.assert(exists, 'Save should exist!');
  console.log(`Save exists in slot ${slot}: ${exists}`);
  
  // Delete it
  await saveManager.deleteSaveSlot(slot);
  
  // Verify it's gone
  exists = await saveManager.hasSaveInSlot(slot);
  console.assert(!exists, 'Save should not exist!');
  console.log(`Save exists in slot ${slot} after deletion: ${exists}`);
  
  console.log('✅ Deletion test passed!');
}

/**
 * Demo: Data Compression
 */
async function demoCompression() {
  console.log('\n=== Demo: Data Compression ===');
  
  const largeData = {
    positions: Array(1000).fill(0).map(() => ({
      x: Math.random() * 1000.123456789,
      y: Math.random() * 1000.123456789,
      z: Math.random() * 1000.123456789
    }))
  };

  const original = JSON.stringify(largeData);
  const compressed = JSON.stringify(
    JsonSerializer.compressFloatingPoint(largeData, 3)
  );

  console.log(`Original size: ${original.length} bytes`);
  console.log(`Compressed size: ${compressed.length} bytes`);
  console.log(`Reduction: ${((1 - compressed.length / original.length) * 100).toFixed(1)}%`);
  
  console.log('✅ Compression test passed!');
}

/**
 * Demo: Error Handling
 */
async function demoErrorHandling() {
  console.log('\n=== Demo: Error Handling ===');
  
  const saveManager = SaveManager.getInstance();

  // Test 1: Invalid slot number
  try {
    await saveManager.saveToSlot(999, 'Invalid', {});
    console.error('❌ Should have thrown error for invalid slot!');
  } catch (error) {
    console.log('✅ Correctly caught invalid slot error:', error.message);
  }

  // Test 2: Load from empty slot
  try {
    await saveManager.deleteSaveSlot(8); // Ensure it's empty
    await saveManager.loadFromSlot(8);
    console.error('❌ Should have thrown error for empty slot!');
  } catch (error) {
    console.log('✅ Correctly caught empty slot error:', error.message);
  }

  console.log('✅ Error handling test passed!');
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  console.log('🚀 Starting Save System Demo Suite...\n');
  
  try {
    await demoBasicSaveLoad();
    await demoMultipleSlots();
    await demoThreeJsSerialization();
    await demoDeletion();
    await demoCompression();
    await demoErrorHandling();
    
    console.log('\n✅ All demos completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
  }
}

// Auto-run if loaded directly
if (typeof window !== 'undefined') {
  console.log('Save System Demo loaded. Run runAllDemos() to test.');
}

export {
  demoBasicSaveLoad,
  demoMultipleSlots,
  demoThreeJsSerialization,
  demoDeletion,
  demoCompression,
  demoErrorHandling
};
