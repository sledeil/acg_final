/**
 * Mission Selector - Handles mission selection UI
 * Displays three missions with descriptions and images
 */

class MissionSelector {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.wasPausedBeforeOpen = false; // Track if game was paused before opening
    
    this.init();
  }

  init() {
    this.createUI();
    this.setupEventListeners();
  }

  createUI() {
    // Check if modal already exists
    if (document.getElementById('mission-modal-overlay')) {
      return;
    }

    const modalHTML = `
      <div id="mission-modal-overlay" class="mission-modal-overlay" style="display: none;">
        <div class="mission-modal-container">
          <div class="mission-modal-header">
            <h2>Choose Mission</h2>
            <button class="mission-close-btn" id="mission-modal-close-btn">×</button>
          </div>
          
          <div class="mission-modal-content">
            <div class="mission-list">
              <!-- Mission 1: The Earth–Moon Gateway -->
              <div class="mission-card" data-mission="1">
                <div class="mission-image-container">
                  <img src="missions/1.jpg" alt="The Earth–Moon Gateway" class="mission-image">
                </div>
                <div class="mission-info">
                  <h3 class="mission-title">I. The Earth–Moon Gateway</h3>
                  <p class="mission-description">
                    Leave low Earth orbit and slip into the Moon's embrace. Learn to exploit gravity instead of fighting it. Find the balance point where Earth lets go and the Moon takes over.
                  </p>
                </div>
              </div>
              
              <!-- Mission 2: The Martian Slingshot -->
              <div class="mission-card" data-mission="2">
                <div class="mission-image-container">
                  <img src="missions/2.jpg" alt="The Martian Slingshot" class="mission-image">
                </div>
                <div class="mission-info">
                  <h3 class="mission-title">II. The Martian Slingshot</h3>
                  <p class="mission-description">
                    Mars is not your destination but your engine. Skim the red planet with perfect precision to steal its momentum and launch yourself into deep space without firing a single engine.
                  </p>
                </div>
              </div>
              
              <!-- Mission 3: The Comet Chaser -->
              <div class="mission-card" data-mission="3">
                <div class="mission-image-container">
                  <img src="missions/3.jpg" alt="The Comet Chaser" class="mission-image">
                </div>
                <div class="mission-info">
                  <h3 class="mission-title">III. The Comet Chaser</h3>
                  <p class="mission-description">
                    Halley follows no planet's path. To catch the Solar System's ghost, you must weave through multiple gravity wells in a flawless orbital dance. This is the ultimate test of orbital mechanics.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mission-modal-footer">
            <button class="mission-cancel-btn" id="mission-cancel-btn">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add CSS styles
    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('mission-selector-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'mission-selector-styles';
    style.textContent = `
      /* Mission Modal Overlay */
      .mission-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
        background: rgba(0, 0, 0, 0.85);
        font-family: 'Courier New', Courier, monospace;
      }

      .mission-modal-overlay.active {
        opacity: 1;
      }

      /* Mission Modal Container */
      .mission-modal-container {
        position: relative;
        background: #000;
        border: 1px solid #fff;
        border-radius: 4px;
        max-width: 900px;
        width: 90%;
        max-height: 85vh;
        overflow: hidden;
        animation: fadeIn 0.2s ease;
        display: flex;
        flex-direction: column;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      /* Mission Modal Header */
      .mission-modal-header {
        background: #000;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #fff;
      }

      .mission-modal-header h2 {
        margin: 0;
        color: #fff;
        font-size: 16px;
        font-weight: normal;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-family: 'Courier New', Courier, monospace;
      }

      .mission-close-btn {
        background: transparent;
        border: none;
        color: #fff;
        font-size: 20px;
        width: 24px;
        height: 24px;
        cursor: pointer;
        transition: opacity 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        line-height: 1;
        font-family: 'Courier New', Courier, monospace;
      }

      .mission-close-btn:hover {
        opacity: 0.6;
      }

      /* Mission Modal Content */
      .mission-modal-content {
        flex: 1;
        padding: 12px;
        max-height: calc(85vh - 120px);
        overflow-y: auto;
      }

      /* Mission List */
      .mission-list {
        display: flex;
        flex-direction: row;
        gap: 12px;
        justify-content: center;
        align-items: stretch;
      }

      /* Mission Card */
      .mission-card {
        background: #000;
        border: 1px solid #fff;
        border-radius: 2px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
        max-width: 280px;
      }

      .mission-card:hover {
        background: #1a1a1a;
      }

      .mission-card.selected {
        border-color: #fff;
        background: #1a1a1a;
        border-width: 2px;
      }

      /* Mission Image */
      .mission-image-container {
        width: 100%;
        height: 200px;
        border-radius: 2px;
        overflow: hidden;
        border: 1px solid #fff;
        flex-shrink: 0;
      }

      .mission-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* Mission Info */
      .mission-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
      }

      .mission-title {
        margin: 0;
        color: #fff;
        font-size: 14px;
        font-weight: normal;
        font-family: 'Courier New', Courier, monospace;
      }

      .mission-description {
        margin: 0;
        color: #aaa;
        font-size: 11px;
        line-height: 1.5;
        font-family: 'Courier New', Courier, monospace;
      }

      /* Mission Modal Footer */
      .mission-modal-footer {
        background: #000;
        padding: 12px;
        border-top: 1px solid #fff;
        display: flex;
        justify-content: flex-end;
      }

      .mission-cancel-btn {
        padding: 8px 16px;
        border: 1px solid #fff;
        border-radius: 2px;
        font-size: 12px;
        font-weight: normal;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background: #000;
        color: #fff;
        font-family: 'Courier New', Courier, monospace;
      }

      .mission-cancel-btn:hover {
        background: #fff;
        color: #000;
      }

      .mission-cancel-btn:active {
        opacity: 0.8;
      }

      /* Scrollbar Styling */
      .mission-modal-content::-webkit-scrollbar {
        width: 8px;
      }

      .mission-modal-content::-webkit-scrollbar-track {
        background: #000;
      }

      .mission-modal-content::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 0;
      }

      .mission-modal-content::-webkit-scrollbar-thumb:hover {
        background: #555;
      }

      /* Responsive Design */
      @media (max-width: 1000px) {
        .mission-list {
          flex-direction: column;
        }

        .mission-card {
          max-width: 100%;
        }

        .mission-image-container {
          height: 200px;
        }

        .mission-modal-container {
          width: 95%;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  setupEventListeners() {
    const overlay = document.getElementById('mission-modal-overlay');
    const closeBtn = document.getElementById('mission-modal-close-btn');
    const cancelBtn = document.getElementById('mission-cancel-btn');
    const missionCards = document.querySelectorAll('.mission-card');

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Cancel button
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // Click outside to close
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close();
        }
      });
    }

    // Mission card selection
    missionCards.forEach(card => {
      card.addEventListener('click', () => {
        // Remove previous selection
        missionCards.forEach(c => c.classList.remove('selected'));
        // Add selection to clicked card
        card.classList.add('selected');
        
        const missionId = card.dataset.mission;
        this.selectMission(missionId);
      });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateMissions(e.key === 'ArrowUp' ? -1 : 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedCard = document.querySelector('.mission-card.selected');
        if (selectedCard) {
          const missionId = selectedCard.dataset.mission;
          this.selectMission(missionId);
        }
      }
    });
  }

  navigateMissions(direction) {
    const cards = Array.from(document.querySelectorAll('.mission-card'));
    const currentIndex = cards.findIndex(card => card.classList.contains('selected'));
    let newIndex = currentIndex + direction;
    
    if (newIndex < 0) newIndex = cards.length - 1;
    if (newIndex >= cards.length) newIndex = 0;
    
    cards.forEach(c => c.classList.remove('selected'));
    cards[newIndex].classList.add('selected');
    cards[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  selectMission(missionId) {
    console.log(`Mission ${missionId} selected`);
    
    // Define mission descriptions
    const missionDescriptions = {
      '1': 'I. The Earth–Moon Gateway\n\nLeave low Earth orbit and slip into the Moon\'s embrace. Learn to exploit gravity instead of fighting it. Find the balance point where Earth lets go and the Moon takes over.',
      '2': 'II. The Martian Slingshot\n\nMars is not your destination but your engine. Skim the red planet with perfect precision to steal its momentum and launch yourself into deep space without firing a single engine.',
      '3': 'III. The Comet Chaser\n\nHalley follows no planet\'s path. To catch the Solar System\'s ghost, you must weave through multiple gravity wells in a flawless orbital dance. This is the ultimate test of orbital mechanics.'
    };
    
    // Update mission text in left panel
    const missionText = missionDescriptions[missionId];
    if (missionText) {
      // Try to update via uiManager if available
      if (this.game.uiManager && this.game.uiManager.updateMissionText) {
        this.game.uiManager.updateMissionText(missionText);
      } else {
        // Fallback: directly update the DOM element
        const missionTextElement = document.getElementById('mission-text');
        if (missionTextElement) {
          missionTextElement.textContent = missionText;
        }
      }
    }
    
    // Close the modal
    this.close();
  }

  open() {
    if (this.isOpen) return;
    
    // Store current pause state
    this.wasPausedBeforeOpen = this.game.isPaused;
    
    // Pause the game
    if (!this.game.isPaused) {
      this.game.isPaused = true;
    }
    
    const overlay = document.getElementById('mission-modal-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      // Trigger animation
      setTimeout(() => {
        overlay.classList.add('active');
      }, 10);
      
      // Select first mission by default
      const firstCard = document.querySelector('.mission-card');
      if (firstCard) {
        document.querySelectorAll('.mission-card').forEach(c => c.classList.remove('selected'));
        firstCard.classList.add('selected');
      }
    }
    
    this.isOpen = true;
  }

  close() {
    if (!this.isOpen) return;
    
    const overlay = document.getElementById('mission-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }
    
    // Restore game pause state
    if (!this.wasPausedBeforeOpen && this.game.isPaused) {
      this.game.isPaused = false;
    }
    
    this.isOpen = false;
  }
}

// Export for use in other modules
export { MissionSelector };

// Also make it available globally for easy access
if (typeof window !== 'undefined') {
  window.MissionSelector = MissionSelector;
}

