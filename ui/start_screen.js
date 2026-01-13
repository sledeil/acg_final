/**
 * Start Screen - Terminal-style introduction screen
 * Displays a terminal-style interface before the game starts
 */

// Initialize start screen when script loads
let startScreenInstance = null;

export class StartScreen {
  constructor() {
    this.container = null;
    this.contentElement = null;
    this.optionsElement = null;
    this.currentText = '';
    this.isTyping = false;
    this.typewriterQueue = [];
    this.currentOptions = [];
    this.selectedOptionIndex = 0;
    this.gameInstance = null;
    
    this.init();
  }

  init() {
    this.createUI();
    this.setupEventListeners();
    this.showMainMenu();
  }

  createUI() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'start-screen';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
    `;

    // Create terminal window
    const terminalWindow = document.createElement('div');
    terminalWindow.style.cssText = `
      background: #0A0A0A;
      padding: 40px;
      border-radius: 8px;
      max-width: 800px;
      width: 90%;
      min-height: 400px;
      color: #ffffff;
      font-size: 16px;
      line-height: 1.6;
    `;

    // Create content area
    this.contentElement = document.createElement('div');
    this.contentElement.id = 'terminal-content';
    this.contentElement.style.cssText = `
      margin-bottom: 20px;
      min-height: 200px;
    `;

    // Create options area
    this.optionsElement = document.createElement('div');
    this.optionsElement.id = 'terminal-options';
    this.optionsElement.style.cssText = `
      margin-top: 20px;
    `;

    terminalWindow.appendChild(this.contentElement);
    terminalWindow.appendChild(this.optionsElement);
    this.container.appendChild(terminalWindow);
    document.body.appendChild(this.container);
  }

  setupEventListeners() {
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.container || this.container.style.display === 'none') return;

      if (this.currentOptions.length > 0) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.selectedOptionIndex = Math.max(0, this.selectedOptionIndex - 1);
          this.updateOptionsDisplay();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectedOptionIndex = Math.min(this.currentOptions.length - 1, this.selectedOptionIndex + 1);
          this.updateOptionsDisplay();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.selectOption(this.selectedOptionIndex);
        }
      }
    });
  }

  showMainMenu() {
    this.clearContent();
    this.typeText('Gravitational Slingshot Simulator', {
      center: true,
      large: true,
      onComplete: () => {
        this.addLineBreak();
        this.addLineBreak();
        this.showOptions([
          { text: 'START', action: () => this.startTutorial() },
          { text: 'LOAD', action: () => this.showLoadMenu() }
        ]);
      }
    });
  }

  startTutorial() {
    this.clearContent();
    this.clearOptions();
    
    const texts = [
      '>> Initializing flight training module...',
      '>> Checking pilot experience level...',
      '>> Status: **UNVERIFIED**',
      '',
      'So.',
      '',
      'As a rookie pilot, let\'s start with something simple.',
      '',
      'Try transferring **from Earth to the Moon.**'
    ];

    this.typeTextSequence(texts, () => {
      this.showOptions([
        { text: 'Yeah, easy. I got this. (skip background)', action: () => this.handleEasyOption() },
        { text: 'Wait, what??', action: () => this.handleWaitOption() }
      ]);
    }, 500); // 0.5s pause after "Status: UNVERIFIED"
  }

  handleEasyOption() {
    this.clearContent();
    this.clearOptions();
    
    this.typeTextSequence(['Confidence detected.', '', 'Good luck out there, pilot.'], () => {
      setTimeout(() => {
        this.startGame();
      }, 1000);
    });
  }

  handleWaitOption() {
    this.clearContent();
    this.clearOptions();
    
    const texts = [
      'Alright. Let\'s slow down.',
      '',
      'Your task is simple — at least on paper.',
      '',
      'Using the **Tsiolkovsky rocket equation**, transfer your spacecraft from one planet to another.',
      '',
      'It looks like this:',
      '',
      'ΔV = Ve × ln(m0 / mf)',
      '',
      'ΔV: Change in velocity you can achieve',
      'Ve: Exhaust velocity (based on specific impulse)',
      'm0: Initial mass (dry mass + fuel)',
      'mf: Final mass (after fuel burn)'
    ];

    this.typeTextSequence(texts, () => {
      this.showOptions([
        { text: '...Okay.', action: () => this.showFinalMessage() },
        { text: 'What?', action: () => this.showFinalMessage() }
      ]);
    });
  }

  showFinalMessage() {
    this.clearContent();
    this.clearOptions();
    
    // Text with specified line breaks
    const text = `Doesn't matter.\nIn simple terms: You are flying a spacecraft from one planet to another.\n\nOh, one problem though.\nYour fuel?\nNot great.\nSo you probably can't just point at the Moon and burn all the way there.\n\nMaybe…\nThere's another way. Something involving **gravity**.`;

    this.typeText(text, {
      onComplete: () => {
        this.showOptions([
          { text: 'I think I get it.', action: () => this.completeTutorial() }
        ]);
      }
    });
  }

  completeTutorial() {
    this.clearContent();
    this.clearOptions();
    
    this.typeTextSequence(['Good.', '', 'Let\'s see if physics agrees.'], () => {
      setTimeout(() => {
        this.startGame();
      }, 1500);
    });
  }

  async showLoadMenu() {
    // Fade out start screen
    if (this.container) {
      this.container.style.transition = 'opacity 1s ease-out';
      this.container.style.opacity = '0';
    }
    
    // Wait for fade out to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Hide start screen
    this.hide();
    
    // Dynamically load game and SaveLoadUI
    await this.loadGame();
    
    // Wait for SaveLoadUI to be fully initialized
    let attempts = 0;
    while (!this.gameInstance?.saveLoadUI && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (this.gameInstance && this.gameInstance.saveLoadUI) {
      // Set mode to load only
      this.gameInstance.saveLoadUI.mode = 'load';
      
      // Track if a save was successfully loaded (use object to share state)
      const loadState = { saveLoaded: false };
      
      // Helper function to start game and fade in canvas
      const startGameAndFadeIn = () => {
        // Ensure game is started
        if (this.gameInstance && this.gameInstance.startGame) {
          this.gameInstance.startGame();
        }
        
        // Wait a bit for game to fully initialize and render
        setTimeout(() => {
          const canvas = document.querySelector('canvas');
          if (canvas) {
            canvas.style.opacity = '0';
            canvas.style.transition = 'opacity 1s ease-in';
            setTimeout(() => {
              canvas.style.opacity = '1';
            }, 50);
          }
          
          // Destroy start screen after fade completes
          setTimeout(() => {
            this.destroy();
          }, 1100);
        }, 200);
      };
      
      // Wrap handleLoad to start game after successful load with fade in
      const originalHandleLoad = this.gameInstance.saveLoadUI.handleLoad.bind(this.gameInstance.saveLoadUI);
      this.gameInstance.saveLoadUI.handleLoad = async () => {
        try {
          await originalHandleLoad();
          // If we get here without exception, load was successful
          // handleLoad already calls close(), so we just need to start the game
          loadState.saveLoaded = true;
          
          // Start game and fade in
          startGameAndFadeIn();
        } catch (error) {
          // Load failed, let the original error handling work
          console.error('Load failed:', error);
        }
      };
      
      // Wrap close to handle case where user cancels without loading
      const originalClose = this.gameInstance.saveLoadUI.close.bind(this.gameInstance.saveLoadUI);
      this.gameInstance.saveLoadUI.close = () => {
        originalClose();
        // If user closed without loading, start a new game
        if (!loadState.saveLoaded) {
          startGameAndFadeIn();
        }
      };
      
      // Open the save/load menu
      this.gameInstance.saveLoadUI.open('load');
    } else {
      console.error('Failed to initialize SaveLoadUI');
      // If SaveLoadUI failed, show error and allow retry
      alert('Failed to load save/load menu. Please refresh the page.');
    }
  }

  async loadGame() {
    // Load the game script dynamically
    // The game.js will create an instance automatically, but we need to wait for it
    await import('../game.js');
    
    // Wait a bit for game to initialize
    let attempts = 0;
    while (!window.__spaceGame && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    this.gameInstance = window.__spaceGame || window.game;
    
    if (!this.gameInstance) {
      console.error('Failed to load game instance');
      return;
    }
    
    // Hide any instructions/tutorial that might have been created
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.style.display = 'none';
    }
    
    // Set canvas initial opacity to 0 for fade in effect
    // Wait a bit more to ensure canvas is created
    await new Promise(resolve => setTimeout(resolve, 200));
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.opacity = '0';
      canvas.style.transition = 'opacity 1s ease-in';
    }
  }

  async startGame() {
    // Load game if not loaded
    if (!this.gameInstance) {
      await this.loadGame();
    }
    
    // Fade out start screen
    if (this.container) {
      this.container.style.transition = 'opacity 1s ease-out';
      this.container.style.opacity = '0';
    }
    
    // Wait for fade out to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Hide start screen
    this.hide();
    
    // Find canvas and fade it in
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.opacity = '0';
      canvas.style.transition = 'opacity 1s ease-in';
      // Trigger fade in
      setTimeout(() => {
        canvas.style.opacity = '1';
      }, 50);
    }
    
    if (this.gameInstance && this.gameInstance.startGame) {
      this.gameInstance.startGame();
    }
    
    // Destroy start screen after fade completes
    setTimeout(() => {
      this.destroy();
    }, 1100);
  }

  /**
   * Parse text with **text** markers for bold red highlighting
   * 
   * Usage: Use **text** to mark text that should be bold and red
   * Example: "This is **important** text" will display "important" in bold red
   * 
   * @param {string} text - Text with **markers** for highlighting
   * @returns {string} - HTML string with highlighted text
   */
  parseHighlightedText(text) {
    // Replace **text** with <span style="font-weight: bold; color: #ff4444;">text</span>
    // Need to escape HTML first, then apply highlights
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Replace **text** markers with styled spans (red color: #ff4444)
    const highlighted = escaped.replace(/\*\*([^*]+)\*\*/g, '<span style="font-weight: bold; color: #ff4444;">$1</span>');
    
    // Replace newlines with <br>
    return highlighted.replace(/\n/g, '<br>');
  }

  /**
   * Count visible characters in HTML string (excluding HTML tags)
   * @param {string} html - HTML string
   * @returns {number} - Number of visible characters
   */
  countVisibleChars(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent.length;
  }

  typeText(text, options = {}) {
    return new Promise((resolve) => {
      if (this.isTyping) {
        this.typewriterQueue.push({ text, options, resolve });
        return;
      }

      this.isTyping = true;
      const element = document.createElement('div');
      
      if (options.center) {
        element.style.textAlign = 'center';
      }
      if (options.large) {
        element.style.fontSize = '32px';
        element.style.fontWeight = 'bold';
        element.style.marginBottom = '30px';
      }
      // Preserve line breaks and set line height
      element.style.lineHeight = '1.6';
      
      this.contentElement.appendChild(element);
      
      // Parse the full text to get HTML with highlights
      const fullHTML = this.parseHighlightedText(text);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fullHTML;
      const plainText = tempDiv.textContent;
      const totalChars = plainText.length;
      
      // Build a character-to-HTML mapping for efficient typing effect
      const charToHTML = [];
      for (let i = 0; i <= totalChars; i++) {
        tempDiv.innerHTML = fullHTML;
        const chars = tempDiv.textContent;
        // Find HTML substring that produces first i characters
        let htmlPos = 0;
        for (let j = 0; j <= fullHTML.length; j++) {
          tempDiv.innerHTML = fullHTML.substring(0, j);
          if (tempDiv.textContent.length >= i) {
            htmlPos = j;
            break;
          }
        }
        charToHTML.push(htmlPos);
      }
      
      let charIndex = 0;
      const cursor = document.createElement('span');
      cursor.textContent = '▮';
      cursor.style.animation = 'blink 1s infinite';
      cursor.style.color = '#ffffff';
      
      const typeChar = () => {
        if (charIndex < totalChars) {
          const htmlLength = charToHTML[charIndex + 1];
          element.innerHTML = fullHTML.substring(0, htmlLength);
          element.appendChild(cursor);
          charIndex++;
          setTimeout(typeChar, 30); // Typing speed
        } else {
          element.innerHTML = fullHTML;
          this.isTyping = false;
          if (options.onComplete) {
            options.onComplete();
          }
          resolve();
          
          // Process next in queue
          if (this.typewriterQueue.length > 0) {
            const next = this.typewriterQueue.shift();
            this.typeText(next.text, next.options).then(next.resolve);
          }
        }
      };
      
      typeChar();
    });
  }

  typeTextSequence(texts, onComplete, pauseAfterIndex = null) {
    let currentIndex = 0;
    
    const typeNext = () => {
      if (currentIndex >= texts.length) {
        if (onComplete) onComplete();
        return;
      }
      
      const text = texts[currentIndex];
      const shouldPause = pauseAfterIndex !== null && currentIndex === pauseAfterIndex;
      
      if (text === '') {
        this.addLineBreak();
        currentIndex++;
        setTimeout(typeNext, shouldPause ? 500 : 50);
      } else {
        this.typeText(text).then(() => {
          currentIndex++;
          setTimeout(typeNext, shouldPause ? 500 : 50);
        });
      }
    };
    
    typeNext();
  }

  addLineBreak() {
    const br = document.createElement('br');
    this.contentElement.appendChild(br);
  }

  clearContent() {
    this.contentElement.innerHTML = '';
    this.currentText = '';
  }

  showOptions(options) {
    this.currentOptions = options;
    this.selectedOptionIndex = 0;
    this.optionsElement.innerHTML = '';
    
    options.forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.className = 'terminal-option';
      optionElement.textContent = `> ${option.text}`;
      optionElement.style.cssText = `
        margin: 10px 0;
        cursor: pointer;
        transition: all 0.2s;
      `;
      
      optionElement.addEventListener('mouseenter', () => {
        this.selectedOptionIndex = index;
        this.updateOptionsDisplay();
      });
      
      optionElement.addEventListener('click', () => {
        this.selectOption(index);
      });
      
      optionElement.dataset.index = index;
      this.optionsElement.appendChild(optionElement);
    });
    
    this.updateOptionsDisplay();
  }

  updateOptionsDisplay() {
    const optionElements = this.optionsElement.querySelectorAll('.terminal-option');
    optionElements.forEach((el, index) => {
      if (index === this.selectedOptionIndex) {
        el.style.color = '#ffff00';
        el.style.fontWeight = 'bold';
      } else {
        el.style.color = '#ffffff';
        el.style.fontWeight = 'normal';
      }
    });
  }

  selectOption(index) {
    if (index >= 0 && index < this.currentOptions.length) {
      const option = this.currentOptions[index];
      if (option.action) {
        option.action();
      }
    }
  }

  clearOptions() {
    this.optionsElement.innerHTML = '';
    this.currentOptions = [];
    this.selectedOptionIndex = 0;
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  show() {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Add CSS for cursor blink animation
const style = document.createElement('style');
style.textContent = `
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize start screen when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startScreenInstance = new StartScreen();
  });
} else {
  startScreenInstance = new StartScreen();
}

