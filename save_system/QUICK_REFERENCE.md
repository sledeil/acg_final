# Save System - Quick Reference Card

## 📦 Installation

```javascript
import { 
  SaveManager, 
  GameStateSaveComponent,
  SpaceshipSaveComponent 
} from './save_system/index.js';
```

## 🚀 Quick Start (3 Steps)

### 1. Initialize
```javascript
class SpaceGame {
  constructor() {
    this.saveManager = SaveManager.getInstance();
    this.saveableComponents = new Map();
  }
}
```

### 2. Wrap Game Objects
```javascript
// After creating game objects
const gameStateSave = new GameStateSaveComponent(this);
this.saveableComponents.set('game_state', gameStateSave);

const spaceshipSave = new SpaceshipSaveComponent(this.spaceship);
this.saveableComponents.set('spaceship', spaceshipSave);
```

### 3. Save/Load
```javascript
// Save
async saveGame(slot, name) {
  const gameState = {
    gameState: this.saveableComponents.get('game_state').toSaveData(),
    spaceship: this.saveableComponents.get('spaceship').toSaveData()
  };
  await this.saveManager.saveToSlot(slot, name, gameState);
}

// Load
async loadGame(slot) {
  const save = await this.saveManager.loadFromSlot(slot);
  this.saveableComponents.get('game_state').fromSaveData(save.gameState.gameState);
  this.saveableComponents.get('spaceship').fromSaveData(save.gameState.spaceship);
}
```

## 🎮 Keyboard Controls

Add these to your game:

```javascript
window.addEventListener('keydown', (e) => {
  if (e.code === 'F5') {
    e.preventDefault();
    this.saveGame(0, 'Quick Save');  // Quick save
  }
  if (e.code === 'F9') {
    e.preventDefault();
    this.loadGame(0);                // Quick load
  }
  if (e.code === 'Escape') {
    this.toggleSaveMenu();           // Save menu
  }
});
```

## 📝 SaveManager API

```javascript
const sm = SaveManager.getInstance();

// Core methods
await sm.saveToSlot(slot, name, gameState, metadata);
await sm.loadFromSlot(slot);
await sm.getAllSaveMetadata();
await sm.deleteSaveSlot(slot);
await sm.hasSaveInSlot(slot);
await sm.clearAllSaves();

// Import/Export
await sm.exportSaveToFile(slot);
await sm.importSaveFromFile(file, slot);
```

## 🔧 Creating Custom Saveable Components

```javascript
import { SaveableComponent } from './save_system/ISaveable.js';
import { JsonSerializer } from './save_system/JsonSerializer.js';

class MyComponentSave extends SaveableComponent {
  constructor(gameObject) {
    super();
    this.gameObject = gameObject;
  }

  getSaveId() {
    return 'my_component';
  }

  toSaveData() {
    return {
      position: JsonSerializer.serializeVector3(this.gameObject.position),
      customData: this.gameObject.myProperty
    };
  }

  fromSaveData(data) {
    this.gameObject.position.copy(
      JsonSerializer.deserializeVector3(data.position)
    );
    this.gameObject.myProperty = data.customData;
  }

  validateSaveData(data) {
    return data && data.position && data.customData !== undefined;
  }
}
```

## 🛠️ JsonSerializer Utilities

```javascript
// THREE.js objects
JsonSerializer.serializeVector3(vector);
JsonSerializer.deserializeVector3(data);
JsonSerializer.serializeQuaternion(quat);
JsonSerializer.deserializeQuaternion(data);

// Arrays
JsonSerializer.serializeArray(array, itemSerializer);
JsonSerializer.deserializeArray(data, itemDeserializer);

// Maps
JsonSerializer.serializeMap(map, keySerializer, valueSerializer);
JsonSerializer.deserializeMap(data, keyDeserializer, valueDeserializer);

// Compression
JsonSerializer.compressFloatingPoint(data, decimals);
```

## 📊 Save Metadata

```javascript
const metadata = new SaveMetadata({
  slotId: 0,
  saveName: 'My Save',
  playerName: 'Commander',
  gameTime: 1234.5,
  currentLocation: 'Earth Orbit',
  fuelRemaining: 75,
  score: 9999
});

metadata.getFormattedTimestamp();  // "12/24/2025, 10:30:45 AM"
metadata.getFormattedGameTime();   // "20m 34s"
metadata.isValid();                // true
```

## 🔄 Version Migration

```javascript
// In VersionMigrator.js, add migration when save format changes:
versionMigrator.registerMigration(1, 2, (data) => {
  // Transform v1 data to v2
  data.gameState.newField = defaultValue;
  data.metadata.saveVersion = 2;
  return data;
});

// Increment version in SaveManager.js:
static CURRENT_SAVE_VERSION = 2;
```

## ⚠️ Error Handling

```javascript
try {
  await this.saveManager.saveToSlot(0, 'My Save', gameState);
  console.log('✅ Save successful!');
} catch (error) {
  console.error('❌ Save failed:', error);
  // Show error to user
}
```

## 🎨 UI Example (Save Menu)

```javascript
async function showSaveMenu() {
  const saves = await this.saveManager.getAllSaveMetadata();
  
  saves.forEach((meta, slot) => {
    if (meta) {
      console.log(`Slot ${slot}: ${meta.saveName}`);
      console.log(`  Time: ${meta.getFormattedGameTime()}`);
      console.log(`  Saved: ${meta.getFormattedTimestamp()}`);
      // Create UI buttons for Load/Save/Delete
    } else {
      console.log(`Slot ${slot}: Empty`);
      // Create UI button for Save
    }
  });
}
```

## ⏰ Auto-Save

```javascript
// Auto-save every 5 minutes to slot 9
setInterval(() => {
  if (this.gameStarted && !this.isPaused) {
    this.saveGame(9, 'Auto Save');
  }
}, 5 * 60 * 1000);
```

## 🧪 Testing

Open `test.html` in browser to test the save system:

```bash
# Serve the directory
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/save_system/test.html
```

Or run demo suite:

```javascript
import { runAllDemos } from './save_system/demo.js';
await runAllDemos();
```

## 📁 File Structure

```
save_system/
├── ISaveable.js              # Base class
├── SaveMetadata.js           # Metadata
├── SaveGame.js               # Container
├── JsonSerializer.js         # Utilities
├── VersionMigrator.js        # Migration
├── SaveManager.js            # Manager
├── SaveableComponents.js     # Examples
├── index.js                  # Exports
├── game_integration_example.js  # Full example
├── test.html                 # Test page
├── demo.js                   # Test suite
├── README.md                 # Full docs
├── INTEGRATION_GUIDE.md      # Integration
└── DELIVERABLES.md           # Summary
```

## 🔗 Resources

- **Full Documentation**: `README.md`
- **Integration Guide**: `INTEGRATION_GUIDE.md`
- **Complete Example**: `game_integration_example.js`
- **Test Page**: `test.html`
- **Deliverables**: `DELIVERABLES.md`

## 💡 Tips

1. ✅ Always wrap save/load in try-catch
2. ✅ Validate data before loading
3. ✅ Save at safe points (paused state)
4. ✅ Use compression for large saves
5. ✅ Implement version migration for updates
6. ✅ Show user feedback (notifications)
7. ✅ Test save/load after changes
8. ✅ Enable auto-save for better UX

## 🐛 Common Issues

**Save too large?** → Use IndexedDB (automatic) or compress data  
**Load fails?** → Check validation, ensure all fields exist  
**Old save won't load?** → Add migration in VersionMigrator  
**No persistence?** → Check browser storage permissions  

---

Made with ❤️ for Educational Space Navigation Game
