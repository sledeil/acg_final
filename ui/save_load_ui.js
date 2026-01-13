/**
 * Save/Load UI Controller
 * Manages the save/load menu interface for the space game
 */
class SaveLoadUI {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.currentSlot = 0;
    this.mode = 'save'; // 'save' or 'load'
    
    this.init();
  }

  /**
   * Initialize UI and event listeners
   */
  init() {
    // Create UI elements
    this.createMenuHTML();
    
    // Get references to DOM elements
    this.menuOverlay = document.getElementById('save-load-menu');
    this.slotContainer = document.getElementById('slot-container');
    this.saveBtn = document.getElementById('save-btn');
    this.loadBtn = document.getElementById('load-btn');
    this.deleteBtn = document.getElementById('delete-btn');
    this.cancelBtn = document.getElementById('cancel-btn');
    this.modeTitle = document.getElementById('mode-title');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize slots
    this.refreshSlots();
  }

  /**
   * Create the menu HTML structure
   */
  createMenuHTML() {
    const menuHTML = `
      <div id="save-load-menu" class="save-load-menu" style="display: none;">
        <div class="menu-backdrop"></div>
        <div class="menu-container">
          <div class="menu-header">
            <h2 id="mode-title">SAVE / LOAD GAME</h2>
            <button class="close-btn" id="menu-close-btn">×</button>
          </div>
          
          <div class="menu-content">
            <div id="slot-container" class="slot-container">
              <!-- Slots will be generated here -->
            </div>
          </div>
          
          <div class="menu-footer">
            <div class="button-group">
              <button id="save-btn" class="menu-btn save-btn">Save</button>
              <button id="load-btn" class="menu-btn load-btn">Load</button>
              <button id="delete-btn" class="menu-btn delete-btn">Delete</button>
              <button id="cancel-btn" class="menu-btn cancel-btn">Cancel</button>
            </div>
            <div class="help-text">
              <span>F5: Quick Save</span>
              <span>F9: Quick Load</span>
              <span>ESC: Close</span>
              <span>Arrow Keys: Navigate</span>
            </div>
          </div>
        </div>
      </div>
      
      <div id="notification-container" class="notification-container"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', menuHTML);
  }

  /**
   * Set up event listeners for UI elements
   */
  setupEventListeners() {
    // Close button
    document.getElementById('menu-close-btn').addEventListener('click', () => this.close());
    
    // Cancel button
    this.cancelBtn.addEventListener('click', () => this.close());
    
    // Save button
    this.saveBtn.addEventListener('click', () => this.handleSave());
    
    // Load button
    this.loadBtn.addEventListener('click', () => this.handleLoad());
    
    // Delete button
    this.deleteBtn.addEventListener('click', () => this.handleDelete());
    
    // Click outside to close
    this.menuOverlay.addEventListener('click', (e) => {
      if (e.target.classList.contains('menu-backdrop')) {
        this.close();
      }
    });
    
    // Keyboard navigation (only when menu is open)
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      
      switch(e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.navigateSlots(-2); // Up one row (2 slots per row)
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.navigateSlots(2); // Down one row
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.navigateSlots(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.navigateSlots(1);
          break;
        case 'Enter':
          e.preventDefault();
          if (this.mode === 'save') {
            this.handleSave();
          } else {
            this.handleLoad();
          }
          break;
        case 'Delete':
          e.preventDefault();
          this.handleDelete();
          break;
        case 'Tab':
          e.preventDefault();
          this.switchMode();
          break;
      }
    });
  }

  /**
   * Navigate between slots
   */
  navigateSlots(offset) {
    this.currentSlot = (this.currentSlot + offset + 6) % 6;
    this.refreshSlots();
  }

  /**
   * Switch between save and load modes
   */
  switchMode() {
    this.mode = this.mode === 'save' ? 'load' : 'save';
    this.modeTitle.textContent = this.mode === 'save' ? 'SAVE GAME' : 'LOAD GAME';
    this.refreshSlots();
  }

  /**
   * Open the menu
   */
  async open(mode = 'save') {
    this.mode = mode;
    this.isOpen = true;
    this.modeTitle.textContent = mode === 'save' ? 'SAVE GAME' : 'LOAD GAME';
    this.menuOverlay.style.display = 'flex';
    
    // Pause game
    if (this.game) {
      this.game.isPaused = true;
    }
    
    // Refresh slot display
    await this.refreshSlots();
    
    // Fade in animation
    setTimeout(() => {
      this.menuOverlay.classList.add('active');
    }, 10);
  }

  /**
   * Close the menu
   */
  close() {
    this.isOpen = false;
    this.menuOverlay.classList.remove('active');
    
    // Resume game
    if (this.game) {
      this.game.isPaused = false;
    }
    
    setTimeout(() => {
      this.menuOverlay.style.display = 'none';
    }, 300);
  }

  /**
   * Refresh the slot display
   */
  async refreshSlots() {
    // Get all save metadata (returns array with null for empty slots)
    const metadataList = await this.game.saveManager.getAllSaveMetadata();
    
    // Generate HTML for each slot
    let slotsHTML = '';
    for (let i = 0; i < 6; i++) {
      const metadata = metadataList[i]; // Will be null if slot is empty
      const isSelected = i === this.currentSlot;
      
      if (metadata) {
        // Slot has a save
        const date = new Date(metadata.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        slotsHTML += `
          <div class="save-slot ${isSelected ? 'selected' : ''}" data-slot="${i}">
            <div class="slot-header">
              <span class="slot-number">Slot ${i + 1}</span>
              <span class="slot-date">${dateStr}</span>
            </div>
            <div class="slot-name">${metadata.saveName || `Save ${i + 1}`}</div>
            <div class="slot-info">
              <span class="slot-time">${timeStr}</span>
              <span class="slot-location">${metadata.currentLocation || 'Unknown'}</span>
            </div>
            <div class="slot-stats">
              <span>Fuel: ${metadata.fuelRemaining?.toFixed(0) || '?'}%</span>
              <span>Score: ${metadata.score || 0}</span>
            </div>
          </div>
        `;
      } else {
        // Empty slot
        slotsHTML += `
          <div class="save-slot empty ${isSelected ? 'selected' : ''}" data-slot="${i}">
            <div class="slot-header">
              <span class="slot-number">Slot ${i + 1}</span>
            </div>
            <div class="empty-text">Empty Slot</div>
            <div class="empty-hint">Click to ${this.mode}</div>
          </div>
        `;
      }
    }
    
    this.slotContainer.innerHTML = slotsHTML;
    
    // Add click handlers to slots
    document.querySelectorAll('.save-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const slotIndex = parseInt(slot.dataset.slot);
        this.currentSlot = slotIndex;
        this.refreshSlots();
      });
      
      slot.addEventListener('dblclick', () => {
        const slotIndex = parseInt(slot.dataset.slot);
        this.currentSlot = slotIndex;
        if (this.mode === 'save') {
          this.handleSave();
        } else {
          this.handleLoad();
        }
      });
    });
  }

  /**
   * Handle save operation
   */
  async handleSave() {
    try {
      // Get save name (could be edited in future enhancement)
      const saveName = `Save ${this.currentSlot + 1} - ${new Date().toLocaleString()}`;
      
      // Save the game
      const success = await this.game.saveGame(this.currentSlot, saveName);
      
      if (success) {
        this.showNotification(`Game saved to slot ${this.currentSlot + 1}`, 'success');
        await this.refreshSlots();
      } else {
        this.showNotification(`Failed to save game`, 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Handle load operation
   */
  async handleLoad() {
    try {
      // Check if slot has a save
      const hasSave = await this.game.saveManager.hasSaveInSlot(this.currentSlot);
      
      if (!hasSave) {
        this.showNotification(`No save in slot ${this.currentSlot + 1}`, 'error');
        return;
      }
      
      // Load the game
      const success = await this.game.loadGame(this.currentSlot);
      
      if (success) {
        this.showNotification(`Game loaded from slot ${this.currentSlot + 1}`, 'success');
        this.close(); // Close menu after successful load
      } else {
        this.showNotification(`Failed to load game`, 'error');
      }
    } catch (error) {
      console.error('Load error:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Handle delete operation
   */
  async handleDelete() {
    try {
      // Check if slot has a save
      const hasSave = await this.game.saveManager.hasSaveInSlot(this.currentSlot);
      
      if (!hasSave) {
        this.showNotification(`No save in slot ${this.currentSlot + 1}`, 'error');
        return;
      }
      
      // Confirm deletion
      if (!confirm(`Delete save from slot ${this.currentSlot + 1}?\nThis cannot be undone.`)) {
        return;
      }
      
      // Delete the save using game's wrapper method (falls back to saveManager if not available)
      if (typeof this.game.deleteGame === 'function') {
        await this.game.deleteGame(this.currentSlot);
      } else {
        await this.game.saveManager.deleteSaveSlot(this.currentSlot);
      }
      
      this.showNotification(`Save deleted from slot ${this.currentSlot + 1}`, 'success');
      await this.refreshSlots();
    } catch (error) {
      console.error('Delete error:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Show a notification
   */
  showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Fade in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Quick save to current slot
   */
  async quickSave() {
    try {
      const saveName = `Quick Save ${this.currentSlot + 1}`;
      const success = await this.game.saveGame(this.currentSlot, saveName);
      
      if (success) {
        this.showNotification(`Quick saved to slot ${this.currentSlot + 1}`, 'success');
      } else {
        this.showNotification(`Quick save failed`, 'error');
      }
    } catch (error) {
      console.error('Quick save error:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Quick load from current slot
   */
  async quickLoad() {
    try {
      const hasSave = await this.game.saveManager.hasSaveInSlot(this.currentSlot);
      
      if (!hasSave) {
        this.showNotification(`No save in slot ${this.currentSlot + 1}`, 'error');
        return;
      }
      
      const success = await this.game.loadGame(this.currentSlot);
      
      if (success) {
        this.showNotification(`Quick loaded from slot ${this.currentSlot + 1}`, 'success');
      } else {
        this.showNotification(`Quick load failed`, 'error');
      }
    } catch (error) {
      console.error('Quick load error:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    }
  }
}

// Export the class
export { SaveLoadUI };
