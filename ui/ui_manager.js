/**
 * UI Manager - Handles all UI layout and interactions
 * Separated from game_v2.js to keep code organized
 */

import * as THREE from 'three';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.activeTab = 'camera'; // Default tab
    this.selectedCameraOption = null;
    this.init();
  }

  init() {
    this.createStyles();
    this.createLayout();
    this.attachEventListeners();
    // Set default hover on first option after layout is created
    setTimeout(() => {
      this.setDefaultHover(this.activeTab);
    }, 0);
  }

  createStyles() {
    if (document.getElementById('ui-manager-styles')) return;

    const style = document.createElement('style');
    style.id = 'ui-manager-styles';
    style.textContent = `
      /* Left Panel - Info and Mission */
      #left-panel {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 280px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        z-index: 100;
      }

      .info-window, .mission-window {
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #00ff00;
        border-radius: 8px;
        padding: 15px;
        color: #00ff00;
        font-family: 'Courier New', Courier, monospace;
        font-size: 14px;
        text-shadow: 0 0 10px #00ff00;
        pointer-events: none;
      }

      .info-window > div {
        font-size: 14px;
      }

      .info-window > div > div {
        font-size: 14px;
      }

      .info-window h3, .mission-window h3 {
        margin: 0 0 10px 0;
        color: #00ffff;
        font-size: 16px;
        text-shadow: 0 0 10px #00ffff;
        border-bottom: 1px solid #00ff00;
        padding-bottom: 5px;
      }

      .mission-window {
        color: #ffaa00;
        border-color: #ffaa00;
        text-shadow: 0 0 10px #ffaa00;
      }

      .mission-window h3 {
        color: #ffaa00;
        text-shadow: 0 0 10px #ffaa00;
        border-bottom-color: #ffaa00;
      }

      .mission-window .mission-text {
        font-size: 13px;
        line-height: 1.6;
        margin: 0;
      }

      /* Right Panel - Menu */
      #right-menu {
        position: absolute;
        top: 20px;
        right: 20px;
        bottom: 20px;
        width: 300px;
        background: #0A0A0A;
        border: 1px solid #00aaff;
        border-radius: 8px;
        padding: 15px;
        color: #ffffff;
        font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
        z-index: 100;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        overflow-x: hidden;
      }

      /* Menu Header with Toggle Button */
      .menu-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 1px solid #00aaff;
        flex-shrink: 0;
      }

      .menu-header h3 {
        margin: 0;
        color: #ffffff;
        font-size: 18px;
        text-shadow: none;
        border: none;
        padding: 0;
        text-align: left;
      }

      .menu-toggle-btn {
        background: rgba(0, 170, 255, 0.1);
        border: 1px solid #00aaff;
        border-radius: 4px;
        color: #00aaff;
        cursor: pointer;
        font-size: 16px;
        padding: 4px 8px;
        transition: all 0.3s;
        font-family: monospace;
      }

      .menu-toggle-btn:hover {
        background: rgba(0, 170, 255, 0.3);
        transform: scale(1.1);
      }

      .menu-content {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        overflow-x: hidden;
      }

      /* Collapsed state */
      #right-menu.collapsed {
        width: 50px;
        padding: 15px 10px;
      }

      #right-menu.collapsed .menu-header h3 {
        display: none;
      }

      #right-menu.collapsed .menu-toggle-btn {
        animation: spin360 0.5s ease-in-out;
      }

      #right-menu.collapsed .menu-content {
        display: none;
      }

      @keyframes spin360 {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      /* Tab Buttons */
      .tab-buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        margin-bottom: 15px;
        padding-bottom: 15px;
        border-bottom: 1px solid #00aaff;
        flex-shrink: 0;
        font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
      }

      .tab-button {
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        color: #ffffff;
        font-size: 15px;
        font-weight: normal;
        cursor: pointer;
        transition: all 0.2s;
        pointer-events: auto;
        font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
      }

      .tab-button .tab-text {
        display: inline-block;
        padding: 4px 8px;
        background: #ffffff;
        color: #000000;
        transition: all 0.2s;
      }

      .tab-button:hover .tab-text {
        background: #00aaff;
        color: #ffffff;
      }

      .tab-button.active .tab-text {
        background: #00aaff;
        color: #ffffff;
      }

      .tab-separator {
        color: #ffffff;
        margin: 0 4px;
        font-size: 15px;
      }

      /* Tab Content */
      .tab-content {
        display: none;
        pointer-events: auto;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .tab-content.active {
        display: flex;
        flex-direction: column;
      }

      /* Camera Options */
      .camera-option {
        width: 100%;
        padding: 6px 0;
        margin-bottom: 4px;
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 14px;
        font-weight: normal;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
      }

      .camera-option:hover {
        color: #00aaff;
      }

      /* Action Controls */
      .action-button {
        width: 100%;
        padding: 6px 0;
        margin-bottom: 4px;
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 14px;
        font-weight: normal;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
      }

      .action-button:hover {
        color: #00aaff;
      }

      /* Slider Container */
      .slider-container {
        margin-bottom: 15px;
      }

      .slider-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
        color: #ffffff;
        font-size: 14px;
        font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
      }

      .slider-value {
        color: #ffffff;
        font-weight: bold;
        font-size: 14px;
        font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
      }

      .slider-input {
        width: 100%;
        height: 6px;
        background: rgba(0, 100, 255, 0.3);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        transition: all 0.3s;
        -webkit-appearance: none;
      }

      .slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #00aaff;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s;
      }

      .slider-input::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #00aaff;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        transition: all 0.3s;
      }

      .slider-input:hover {
        background: rgba(255, 140, 0, 0.4);
      }

      .slider-input:hover::-webkit-slider-thumb {
        background: #ff8c00;
        box-shadow: 0 0 10px rgba(255, 140, 0, 0.6);
      }

      .slider-input:hover::-moz-range-thumb {
        background: #ff8c00;
        box-shadow: 0 0 10px rgba(255, 140, 0, 0.6);
      }

      /* Setting Buttons */
      .setting-button {
        width: 100%;
        padding: 6px 0;
        margin-bottom: 4px;
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 14px;
        font-weight: normal;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
      }

      .setting-button:hover {
        color: #00aaff;
      }

      /* Quick Maneuver Buttons */
      .maneuver-button {
        width: 100%;
        padding: 6px 0;
        margin-bottom: 4px;
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 14px;
        font-weight: normal;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
      }

      .maneuver-button:hover {
        color: #00aaff;
      }

      .maneuver-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .maneuver-button:disabled:hover {
        color: #ffffff;
      }

      /* Fuel Warning */
      #fuel-warning {
        color: #ff0000;
        font-weight: bold;
        margin-top: 10px;
        display: none;
        animation: blink 1s infinite;
      }

      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }

      /* Orbit Status */
      #orbit-status {
        color: #00ffff;
        margin-top: 10px;
        font-size: 14px;
        display: none;
      }

      #orbit-status div {
        margin: 3px 0;
      }

      /* Mars Orbit Status */
      #mars-orbit-status {
        color: #ff6600;
        margin-top: 10px;
        font-size: 14px;
        display: none;
      }

      #mars-orbit-status div {
        margin: 3px 0;
      }
    `;
    document.head.appendChild(style);
  }

  createLayout() {
    // Remove old HUD and physics controls if they exist
    const oldHud = document.getElementById('hud');
    const oldControls = document.getElementById('physics-controls');
    if (oldHud) oldHud.remove();
    if (oldControls) oldControls.remove();

    // Create left panel
    const leftPanel = document.createElement('div');
    leftPanel.id = 'left-panel';
    leftPanel.innerHTML = `
      <div class="info-window">
        <h3>INFO</h3>
        <div id="info-content">
          <div>FUEL: <span id="fuel-display-kg">50</span>/<span id="fuel-max-kg">50</span> kg</div>
          <div style="color: #88ff88;">ΔV Budget: <span id="deltav-display">0</span> units/s</div>
          <div>SPEED: <span id="speed-display">0</span> units/s</div>
          <div style="color: #ffaa00;">RELATIVE TO EARTH: <span id="relative-speed-display">0</span> units/s</div>
          <div id="velocity-adjustment-display" style="color: #ffff00; font-weight: bold; margin-top: 5px; display: none;">
            ΔV ADJUSTMENT: <span id="deltav-adjustment-mag">0.000</span> units/s
          </div>
          <div style="margin-top: 5px; color: #00ffff;">
            <div>Distance from Earth: <span id="earth-distance">--</span> m</div>
            <div>Distance to Target: <span id="objective-distance">--</span> m</div>
          </div>
          <div style="margin-top: 5px; color: #aaaaaa;">
            <div>Camera Zoom: <span id="zoom-display">100</span> m</div>
            <div style="color: #ffff00; margin-top: 3px;">Frame: <span id="reference-frame">SUN</span></div>
          </div>
          <div id="fuel-warning">
            ⚠ CRITICAL: FUEL LOW!<br>Use gravity slingshot!
          </div>
          <div id="orbit-status">
            <div style="font-weight: bold;">Moon Orbit Status:</div>
            <div>Altitude: <span id="orbit-altitude">--</span> units</div>
            <div>Orbit Quality: <span id="orbit-speed">--</span>%</div>
            <div>Time in Orbit: <span id="orbit-stability">--</span>%</div>
            <div style="color: #88ffff; margin-top: 3px;">Need 50s at 0.5-2.0 units (stable orbit)</div>
          </div>
          <div id="mars-orbit-status">
            <div style="font-weight: bold;">Mars Orbit Status:</div>
            <div>Altitude: <span id="mars-orbit-altitude">--</span> units</div>
            <div>In Range: <span id="mars-orbit-speed">--</span>%</div>
            <div>Time in Orbit: <span id="mars-orbit-stability">--</span>%</div>
            <div style="color: #ff6600; margin-top: 3px;">Need 60s at 1.5-4.0 units</div>
          </div>
        </div>
      </div>
      <div class="mission-window">
        <h3>MISSION</h3>
        <div class="mission-text" id="mission-text">
          I. The Earth–Moon Gateway<br><br>Leave low Earth orbit and slip into the Moon's embrace. Learn to exploit gravity instead of fighting it. Find the balance point where Earth lets go and the Moon takes over.
        </div>
      </div>
    `;
    document.body.appendChild(leftPanel);

    // Create right menu
    const rightMenu = document.createElement('div');
    rightMenu.id = 'right-menu';
    rightMenu.innerHTML = `
      <div class="menu-header">
        <h3>MENU</h3>
        <button id="menu-toggle-btn" class="menu-toggle-btn" title="Collapse menu">▶</button>
      </div>
      <div id="menu-content" class="menu-content">
      <div class="tab-buttons">
        <button class="tab-button active" data-tab="camera"><span class="tab-text">Camera</span></button>
        <span class="tab-separator">/</span>
        <button class="tab-button" data-tab="action"><span class="tab-text">Physics</span></button>
        <span class="tab-separator">/</span>
        <button class="tab-button" data-tab="setting"><span class="tab-text">Setting</span></button>
      </div>
      
      <!-- Camera Tab -->
      <div class="tab-content active" id="camera-tab">
        <div style="margin: 0 0 10px 0; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 10px;">
          <div style="font-size: 11px; color: #ffffff; margin-bottom: 10px; text-align: center;">General Actions</div>
        </div>
        <button class="camera-option" data-camera="zoom-out">Zoom out</button>
        <button class="camera-option" data-camera="toggle-frame">Toggle Reference Frame</button>
        <button class="camera-option" data-camera="clear-trails">Clear Orbit Trails</button>
        <div style="margin: 15px 0 10px 0; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 10px;">
          <div style="font-size: 11px; color: #ffffff; margin-bottom: 10px; text-align: center;">Camera View</div>
        </div>
        <button class="camera-option" data-camera="spaceship">Spaceship</button>
        <button class="camera-option" data-camera="sun">Sun</button>
        <button class="camera-option" data-camera="mercury">Mercury</button>
        <button class="camera-option" data-camera="venus">Venus</button>
        <button class="camera-option" data-camera="earth">Earth</button>
        <button class="camera-option" data-camera="moon">Moon</button>
        <button class="camera-option" data-camera="mars">Mars</button>
        <button class="camera-option" data-camera="phobos">Phobos</button>
        <button class="camera-option" data-camera="jupiter">Jupiter</button>
        <button class="camera-option" data-camera="halley">Halley's Commet</button>
      </div>
      
      <!-- Action Tab -->
      <div class="tab-content" id="action-tab">
        <button class="action-button" id="pause-button">Pause</button>
        <div style="margin: 15px 0 10px 0; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 10px;">
          <div style="font-size: 11px; color: #ffffff; margin-bottom: 10px; text-align: center;">Physics Controls</div>
          <div class="slider-container">
            <div class="slider-label">
              <span>TimeScale</span>
              <span class="slider-value" id="timescale-display">0.10</span>
            </div>
            <input type="range" class="slider-input" id="timescale-slider" min="0.01" max="20" value="0.1" step="0.01">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>SubSteps</span>
              <span class="slider-value" id="substeps-display">200</span>
            </div>
            <input type="range" class="slider-input" id="substeps-slider" min="10" max="1000" value="200" step="10">
          </div>
        </div>
        <div style="margin: 15px 0 10px 0; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 10px;">
          <div style="font-size: 11px; color: #ffffff; margin-bottom: 10px; text-align: center;">Trajectory Prediction</div>
          <div class="slider-container">
            <div class="slider-label">
              <span>ΔV Magnitude</span>
              <span class="slider-value" id="deltav-magnitude">0.05</span>
            </div>
            <input type="range" class="slider-input" id="deltav-slider" min="0.01" max="2.0" value="0.05" step="0.01">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>Steps</span>
              <span class="slider-value" id="pred-steps">10000</span>
            </div>
            <input type="range" class="slider-input" id="pred-steps-slider" min="1000" max="100000" value="10000" step="1000">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>Step Size</span>
              <span class="slider-value" id="pred-stepsize">0.05</span>
            </div>
            <input type="range" class="slider-input" id="pred-stepsize-slider" min="0.01" max="2.0" value="0.05" step="0.01">
          </div>
        </div>
      </div>
      
      <!-- Setting Tab -->
      <div class="tab-content" id="setting-tab">
        <button class="setting-button" id="choose-mission-button">Choose Mission</button>
        <button class="setting-button" id="save-load-button">Save/Load</button>
        <button class="setting-button" id="choose-rocket-button">Choose Rocket</button>
        <button class="setting-button" id="music-button">Music</button>
        <button class="setting-button" id="background-info-button">Background Info</button>
        <button class="setting-button" id="controls-guide-button">Controls Guide</button>
      </div>
      </div>
    `;
    document.body.appendChild(rightMenu);
  }

  attachEventListeners() {
    // Menu toggle button
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const rightMenu = document.getElementById('right-menu');
    if (menuToggleBtn && rightMenu) {
      menuToggleBtn.addEventListener('click', () => {
        rightMenu.classList.toggle('collapsed');
        // Update button text based on collapsed state (reversed direction)
        if (rightMenu.classList.contains('collapsed')) {
          menuToggleBtn.textContent = '◀';
          menuToggleBtn.title = 'Expand menu';
        } else {
          menuToggleBtn.textContent = '▶';
          menuToggleBtn.title = 'Collapse menu';
        }
      });
    }

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Use currentTarget to get the button element, not the clicked child
        const tab = e.currentTarget.dataset.tab || btn.dataset.tab;
        if (tab) {
          this.switchTab(tab);
        }
      });
    });

    // Camera options
    const cameraOptions = document.querySelectorAll('.camera-option');
    cameraOptions.forEach(btn => {
      // Add hover effect with ">> " prefix
      btn.addEventListener('mouseenter', () => {
        this.addHoverPrefix(btn);
      });
      btn.addEventListener('mouseleave', () => {
        this.removeHoverPrefix(btn);
      });
      btn.addEventListener('click', (e) => {
        // Use currentTarget to get the button element, not the clicked child
        const option = e.currentTarget.dataset.camera || btn.dataset.camera;
        if (option) {
          this.handleCameraAction(option);
        }
      });
    });

    // Action buttons
    const actionButtons = document.querySelectorAll('.action-button');
    actionButtons.forEach(btn => {
      // Add hover effect with ">> " prefix
      btn.addEventListener('mouseenter', () => {
        this.addHoverPrefix(btn);
      });
      btn.addEventListener('mouseleave', () => {
        this.removeHoverPrefix(btn);
      });
    });

    // Pause button
    const pauseButton = document.getElementById('pause-button');
    if (pauseButton) {
      pauseButton.addEventListener('click', () => {
        this.togglePause();
      });
    }

    // Sliders
    const timescaleSlider = document.getElementById('timescale-slider');
    if (timescaleSlider) {
      timescaleSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.game.physics.setTimeScale(value);
        document.getElementById('timescale-display').textContent = value.toFixed(2);
      });
    }

    const substepsSlider = document.getElementById('substeps-slider');
    if (substepsSlider) {
      substepsSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        this.game.physics.subSteps = value;
        document.getElementById('substeps-display').textContent = value;
      });
    }

    const deltaVSlider = document.getElementById('deltav-slider');
    if (deltaVSlider) {
      deltaVSlider.addEventListener('input', (e) => {
        this.game.deltaVMagnitude = parseFloat(e.target.value);
        document.getElementById('deltav-magnitude').textContent = this.game.deltaVMagnitude.toFixed(2);
      });
    }

    const predStepsSlider = document.getElementById('pred-steps-slider');
    if (predStepsSlider) {
      predStepsSlider.addEventListener('input', (e) => {
        this.game.predictionSteps = parseInt(e.target.value);
        document.getElementById('pred-steps').textContent = this.game.predictionSteps;
        if (this.game.isPaused) {
          this.game.updateTrajectoryPrediction();
        }
      });
    }

    const predStepSizeSlider = document.getElementById('pred-stepsize-slider');
    if (predStepSizeSlider) {
      predStepSizeSlider.addEventListener('input', (e) => {
        this.game.predictionStepSize = parseFloat(e.target.value);
        document.getElementById('pred-stepsize').textContent = this.game.predictionStepSize.toFixed(2);
        if (this.game.isPaused) {
          this.game.updateTrajectoryPrediction();
        }
      });
    }

    // Setting buttons
    const settingButtons = document.querySelectorAll('.setting-button');
    settingButtons.forEach(btn => {
      // Add hover effect with ">> " prefix
      btn.addEventListener('mouseenter', () => {
        this.addHoverPrefix(btn);
      });
      btn.addEventListener('mouseleave', () => {
        this.removeHoverPrefix(btn);
      });
    });

    const saveLoadButton = document.getElementById('save-load-button');
    if (saveLoadButton) {
      saveLoadButton.addEventListener('click', () => {
        if (this.game.saveLoadUI) {
          this.game.saveLoadUI.open();
        }
      });
    }

    const chooseMissionButton = document.getElementById('choose-mission-button');
    if (chooseMissionButton) {
      chooseMissionButton.addEventListener('click', () => {
        // 首先尝试从window获取
        if (window.__missionSelector) {
          window.__missionSelector.open();
          return;
        }
        
        // 如果window中没有，尝试从game获取
        if (this.game && this.game.missionSelector) {
          this.game.missionSelector.open();
          return;
        }
        
        // 如果都没有，尝试立即初始化
        const game = window.__spaceGame || this.game;
        if (game) {
          // 动态导入并初始化任务选择器
          import('./mission_selector.js').then((module) => {
            const { MissionSelector } = module;
            const missionSelector = new MissionSelector(game);
            game.missionSelector = missionSelector;
            window.__missionSelector = missionSelector;
            missionSelector.open();
          }).catch(err => {
            console.error('Failed to load mission selector:', err);
            alert('无法加载任务选择器。请刷新页面。');
          });
        } else {
          // 如果游戏实例也没有，等待并重试
          let attempts = 0;
          const checkSelector = setInterval(() => {
            attempts++;
            if (window.__missionSelector) {
              clearInterval(checkSelector);
              window.__missionSelector.open();
            } else if (attempts > 50) {
              clearInterval(checkSelector);
              console.error('Failed to initialize mission selector after 5 seconds');
              alert('任务选择器不可用。请刷新页面。');
            }
          }, 100);
        }
      });
    }

    const chooseRocketButton = document.getElementById('choose-rocket-button');
    if (chooseRocketButton) {
      chooseRocketButton.addEventListener('click', () => {
        console.log('Choose Rocket button clicked');
        console.log('window.__rocketSelector:', window.__rocketSelector);
        console.log('this.game:', this.game);
        
        // 首先尝试从window获取
        if (window.__rocketSelector) {
          console.log('Opening rocket selector from window.__rocketSelector');
          window.__rocketSelector.open();
          return;
        }
        
        // 如果window中没有，尝试从game获取
        if (this.game && this.game.rocketSelector) {
          console.log('Opening rocket selector from game.rocketSelector');
          this.game.rocketSelector.open();
          return;
        }
        
        // 如果都没有，尝试立即初始化
        console.warn('Rocket selector not found, attempting to initialize...');
        const game = window.__spaceGame || this.game;
        if (game) {
          // 动态导入并初始化火箭选择器
          import('./rocket_selector.js').then(() => {
            // 等待一下让初始化完成
            setTimeout(() => {
              if (window.__rocketSelector) {
                console.log('Rocket selector initialized, opening...');
                window.__rocketSelector.open();
              } else {
                console.error('Failed to initialize rocket selector');
                alert('无法初始化火箭选择器。请刷新页面。');
              }
            }, 200);
          }).catch(err => {
            console.error('Failed to load rocket selector:', err);
            alert('无法加载火箭选择器。请刷新页面。');
          });
        } else {
          // 如果游戏实例也没有，等待并重试
          let attempts = 0;
          const checkSelector = setInterval(() => {
            attempts++;
            if (window.__rocketSelector) {
              clearInterval(checkSelector);
              window.__rocketSelector.open();
            } else if (attempts > 50) {
              clearInterval(checkSelector);
              console.error('Failed to initialize rocket selector after 5 seconds');
              alert('火箭选择器不可用。请刷新页面。');
            }
          }, 100);
        }
      });
    }

    const musicButton = document.getElementById('music-button');
    if (musicButton) {
      musicButton.addEventListener('click', () => {
        this.game.toggleMute();
        this.updateMusicButton();
      });
      // Initialize music button state
      this.updateMusicButton();
    }

    // Quick maneuver buttons (only enabled when paused)
    const maneuverButtons = document.querySelectorAll('.maneuver-button');
    maneuverButtons.forEach(btn => {
      // Add hover effect with ">> " prefix
      btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) {
          this.addHoverPrefix(btn);
        }
      });
      btn.addEventListener('mouseleave', () => {
        this.removeHoverPrefix(btn);
      });
    });

    const hohmannButton = document.getElementById('hohmann-transfer-button');
    if (hohmannButton) {
      hohmannButton.addEventListener('click', () => {
        if (this.game.isPaused) {
          this.handleQuickManeuver('hohmann');
        }
      });
    }

    const moonInterceptButton = document.getElementById('moon-intercept-button');
    if (moonInterceptButton) {
      moonInterceptButton.addEventListener('click', () => {
        if (this.game.isPaused) {
          this.handleQuickManeuver('moon-intercept');
        }
      });
    }

    const earthEscapeButton = document.getElementById('earth-escape-button');
    if (earthEscapeButton) {
      earthEscapeButton.addEventListener('click', () => {
        if (this.game.isPaused) {
          this.handleQuickManeuver('earth-escape');
        }
      });
    }

    const retrogradeButton = document.getElementById('retrograde-button');
    if (retrogradeButton) {
      retrogradeButton.addEventListener('click', () => {
        if (this.game.isPaused) {
          this.handleQuickManeuver('retrograde');
        }
      });
    }

    // Setting buttons
    // Update maneuver button states based on pause state
    this.updateManeuverButtons();
  }

  updateMusicButton() {
    const musicButton = document.getElementById('music-button');
    if (musicButton) {
      const isHovered = musicButton.textContent.trim().startsWith('>> ');
      if (this.game.isMuted) {
        musicButton.dataset.originalText = 'Music: OFF';
        musicButton.textContent = isHovered ? '>> Music: OFF' : 'Music: OFF';
      } else {
        musicButton.dataset.originalText = 'Music: ON';
        musicButton.textContent = isHovered ? '>> Music: ON' : 'Music: ON';
      }
    }
  }

  switchTab(tab) {
    this.activeTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
      }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    const activeContent = document.getElementById(`${tab}-tab`);
    if (activeContent) {
      activeContent.classList.add('active');
    }

    // Set default hover on first option in the active tab
    this.setDefaultHover(tab);
  }

  setDefaultHover(tab) {
    // Clear all hover prefixes first
    document.querySelectorAll('.camera-option, .action-button, .setting-button, .maneuver-button').forEach(btn => {
      this.removeHoverPrefix(btn);
    });

    const activeContent = document.getElementById(`${tab}-tab`);
    if (!activeContent) return;

    let firstOption = null;

    if (tab === 'camera') {
      // Find first camera-option
      firstOption = activeContent.querySelector('.camera-option');
    } else if (tab === 'action') {
      // Find first action-button (pause-button)
      firstOption = activeContent.querySelector('.action-button');
    } else if (tab === 'setting') {
      // Find first setting-button
      firstOption = activeContent.querySelector('.setting-button');
    }

    if (firstOption) {
      // Simulate hover by adding prefix
      this.addHoverPrefix(firstOption);
    }
  }

  addHoverPrefix(button) {
    if (!button) return;
    const text = button.textContent.trim();
    // Only add prefix if not already present
    if (!text.startsWith('>> ')) {
      // Store original text if not already stored
      if (!button.dataset.originalText) {
        button.dataset.originalText = text;
      }
      button.textContent = '>> ' + button.dataset.originalText;
      button.style.color = '#00aaff';
    }
  }

  removeHoverPrefix(button) {
    if (!button) return;
    const originalText = button.dataset.originalText;
    if (originalText) {
      button.textContent = originalText;
      button.style.color = '#ffffff';
    } else {
      // Fallback: remove prefix if present
      const text = button.textContent.trim();
      if (text.startsWith('>> ')) {
        button.textContent = text.substring(3);
        button.style.color = '#ffffff';
      }
    }
  }

  handleCameraAction(option) {
    const game = this.game;

    switch(option) {
      case 'zoom-out':
        game.cameraDistance = 5000;
        console.log('Camera zoomed out');
        break;
      case 'spaceship':
        game.cameraDistance = 100;
        if (game.spaceship) {
          game.cameraFollowTarget = game.spaceship;
          game.cameraManualControl = false;
          game.cameraLookAtPoint.copy(game.spaceship.position);
        }
        console.log('Camera focused on spaceship');
        break;
      case 'sun':
        if (game.sunBody) {
          game.cameraFollowTarget = game.sunBody.mesh;
          game.cameraLookAtPoint.copy(game.sunBody.mesh.position);
          game.cameraManualControl = false;
          game.cameraDistance = 1000;
        }
        break;
      case 'mercury':
        if (game.mercuryBody) {
          game.cameraFollowTarget = game.mercuryBody.mesh;
          game.cameraLookAtPoint.copy(game.mercuryBody.mesh.position);
          game.cameraManualControl = false;
          game.cameraDistance = 200;
        }
        break;
      case 'venus':
        if (game.venusBody) {
          game.cameraFollowTarget = game.venusBody.mesh;
          game.cameraLookAtPoint.copy(game.venusBody.mesh.position);
          game.cameraManualControl = false;
          game.cameraDistance = 300;
        }
        break;
      case 'earth':
        if (game.earthBody) {
          game.cameraFollowTarget = game.earthBody.mesh;
          game.cameraLookAtPoint.copy(game.earthBody.mesh.position);
          game.cameraManualControl = false;
          game.cameraDistance = 300;
        }
        break;
      case 'moon':
        if (game.moonBody) {
          game.cameraFollowTarget = game.moonBody.mesh;
          game.cameraLookAtPoint.copy(game.moonBody.mesh.position);
          game.cameraManualControl = false;
          game.cameraDistance = 100;
        }
        break;
      case 'mars':
        if (game.marsBody) {
          game.cameraFollowTarget = game.marsBody.mesh;
          game.cameraLookAtPoint.copy(game.marsBody.mesh.position);
          game.cameraManualControl = false;
          game.cameraDistance = 250;
        }
        break;
      case 'phobos':
        if (game.phobosBody) {
          game.cameraFollowTarget = game.phobosBody.mesh;
          game.cameraLookAtPoint.copy(game.phobosBody.mesh.position);
          game.cameraManualControl = false;
          game.cameraDistance = 80;
        }
        break;
      case 'jupiter':
        if (game.jupiterBody) {
          game.cameraFollowTarget = game.jupiterBody.mesh;
          game.cameraLookAtPoint.copy(game.jupiterBody.mesh.position);
          game.cameraManualControl = false;
          game.cameraDistance = 600;
        }
        break;
      case 'halley':
        if (game.halleyBody) {
          game.cameraFollowTarget = game.halleyBody.mesh;
          game.cameraLookAtPoint.copy(game.halleyBody.mesh.position);
          game.cameraManualControl = false;
          game.cameraDistance = 300;
        }
        break;
      case 'toggle-frame':
        this.toggleReferenceFrame();
        break;
      case 'clear-trails':
        this.clearOrbitTrails();
        break;
    }
  }

  togglePause() {
    this.game.isPaused = !this.game.isPaused;
    const pauseButton = document.getElementById('pause-button');
    
    if (!pauseButton) return;
    
    // Check if button is currently hovered (has ">> " prefix)
    const isHovered = pauseButton.textContent.trim().startsWith('>> ');
    
    if (this.game.isPaused) {
      this.game.showPrediction = true;
      this.game.velocityAdjustment.set(0, 0, 0);
      if (this.game.updateTrajectoryPrediction) {
        this.game.updateTrajectoryPrediction();
      }
      // When pausing, directly set spaceship position to physics position (no smoothing)
      if (this.game.spaceship && this.game.spaceshipRender && this.game.physics && this.game.physics.spacecraft) {
        this.game.spaceshipSmoothPos.copy(this.game.physics.spacecraft.position);
        this.game.spaceshipSmoothQuat.copy(this.game.spaceship.quaternion);
      }
      // Update original text and current text
      pauseButton.dataset.originalText = 'Resume';
      pauseButton.textContent = isHovered ? '>> Resume' : 'Resume';
      console.log('⏸ PAUSED - Use arrow keys to adjust velocity, Enter to apply');
    } else {
      this.game.showPrediction = false;
      if (this.game.trajectoryLine) {
        this.game.trajectoryLine.visible = false;
      }
      // Update original text and current text
      pauseButton.dataset.originalText = 'Pause';
      pauseButton.textContent = isHovered ? '>> Pause' : 'Pause';
      console.log('▶ RESUMED');
    }
    
    // Update maneuver button states
    this.updateManeuverButtons();
  }

  updateManeuverButtons() {
    const buttons = [
      document.getElementById('hohmann-transfer-button'),
      document.getElementById('moon-intercept-button'),
      document.getElementById('earth-escape-button'),
      document.getElementById('retrograde-button')
    ];
    
    buttons.forEach(btn => {
      if (btn) {
        if (this.game.isPaused) {
          btn.disabled = false;
        } else {
          btn.disabled = true;
        }
      }
    });
  }

  handleQuickManeuver(type) {
    if (!this.game.isPaused || !this.game.spaceship) return;

    switch(type) {
      case 'hohmann':
        // Hohmann Transfer to Moon
        if (this.game.moonBody && this.game.moonBody.mesh && this.game.earthBody) {
          const earthPos = this.game.earthBody.mesh.position;
          const shipToEarth = new THREE.Vector3().subVectors(this.game.spaceship.position, earthPos);
          const r1 = shipToEarth.length();
          const r2 = 40;

          const progradeDir = this.game.shipVelocity.clone().normalize();
          const v_circular = Math.sqrt(1.0 * 1.0 / r1);
          const a = (r1 + r2) / 2;
          const v_transfer = Math.sqrt(1.0 * 1.0 * (2/r1 - 1/a));
          const deltaV_magnitude = v_transfer - v_circular;

          this.game.velocityAdjustment.copy(progradeDir).multiplyScalar(deltaV_magnitude);
          if (this.game.updateTrajectoryPrediction) {
            this.game.updateTrajectoryPrediction();
          }
          console.log(`🌙 HOHMANN TRANSFER TO MOON: ΔV = ${deltaV_magnitude.toFixed(4)} units/s`);
        }
        break;

      case 'moon-intercept':
        // Moon intercept
        if (this.game.moonBody && this.game.moonBody.mesh) {
          const toMoon = new THREE.Vector3()
            .subVectors(this.game.moonBody.mesh.position, this.game.spaceship.position)
            .normalize();
          const dist = this.game.spaceship.position.distanceTo(this.game.moonBody.mesh.position);
          const deltaVMag = Math.min(0.15, dist * 0.003);

          this.game.velocityAdjustment.copy(toMoon).multiplyScalar(deltaVMag);
          if (this.game.updateTrajectoryPrediction) {
            this.game.updateTrajectoryPrediction();
          }
          console.log(`🌙 MOON INTERCEPT: ΔV = ${deltaVMag.toFixed(4)} units/s`);
        }
        break;

      case 'earth-escape':
        // Earth escape
        const earthPos = this.game.earthBody ? this.game.earthBody.mesh.position : new THREE.Vector3(15000, 0, 0);
        const toEarth = new THREE.Vector3()
          .subVectors(this.game.spaceship.position, earthPos);
        const tangent = new THREE.Vector3(-toEarth.z, 0, toEarth.x).normalize();

        this.game.velocityAdjustment.copy(tangent).multiplyScalar(2.0);
        if (this.game.updateTrajectoryPrediction) {
          this.game.updateTrajectoryPrediction();
        }
        console.log(`🚀 EARTH ESCAPE: Added ΔV tangent to orbit`);
        break;

      case 'retrograde':
        // Retrograde (reverse velocity)
        const currentVel = this.game.shipVelocity.clone();
        this.game.velocityAdjustment.copy(currentVel).multiplyScalar(-2.0);
        if (this.game.updateTrajectoryPrediction) {
          this.game.updateTrajectoryPrediction();
        }
        console.log(`🔄 RETROGRADE: Velocity reversal maneuver`);
        break;
    }
  }

  toggleReferenceFrame() {
    const frames = ['sun', 'earth', 'moon'];
    const currentIndex = frames.indexOf(this.game.referenceFrame);
    const nextIndex = (currentIndex + 1) % frames.length;
    this.game.referenceFrame = frames[nextIndex];
    
    // Set flag to indicate reference frame just changed (for instant position update)
    this.game.referenceFrameJustChanged = true;

    if (this.game.isPaused && this.game.trajectoryLine && this.game.trajectoryLine.visible) {
      if (this.game.updateTrajectoryPrediction) {
        this.game.updateTrajectoryPrediction();
      }
    }

    console.log(`🌍 Reference frame switched to: ${this.game.referenceFrame.toUpperCase()}`);
  }

  clearOrbitTrails() {
    for (const [name, trail] of this.game.orbitTrails.entries()) {
      trail.positions = [];
      trail.geometry.setDrawRange(0, 0);
      trail.geometry.attributes.position.needsUpdate = true;
    }
    console.log('Orbit trails cleared');
  }


  updateMissionText(text) {
    const missionText = document.getElementById('mission-text');
    if (missionText) {
      // Convert newlines to <br> tags for proper display
      const htmlText = text.replace(/\n/g, '<br>');
      missionText.innerHTML = htmlText;
    }
  }

  updateHUD() {
    // Update fuel display in kg
    const fuelDisplayKg = document.getElementById('fuel-display-kg');
    const fuelMaxKg = document.getElementById('fuel-max-kg');
    if (fuelDisplayKg) fuelDisplayKg.textContent = Math.round(this.game.fuelMass * 10) / 10;
    if (fuelMaxKg) fuelMaxKg.textContent = this.game.maxFuelMass;

    // Update delta-V budget
    const deltaVDisplay = document.getElementById('deltav-display');
    if (deltaVDisplay) {
      const remainingDeltaV = this.game.calculateRemainingDeltaV();
      deltaVDisplay.textContent = Math.round(remainingDeltaV * 100); // scaled 100 times cuz value is too small
    }

    const speedDisplay = document.getElementById('speed-display');
    if (speedDisplay) speedDisplay.textContent = Math.round(this.game.shipVelocity.length() * 100);
    
    const zoomDisplay = document.getElementById('zoom-display');
    if (zoomDisplay) zoomDisplay.textContent = Math.round(this.game.cameraDistance);

    // Update reference frame display
    const frameDisplay = document.getElementById('reference-frame');
    if (frameDisplay) {
      frameDisplay.textContent = this.game.referenceFrame.toUpperCase();
    }

    // Calculate velocity relative to Earth
    if (this.game.earthBody && this.game.earthBody.mesh) {
      const earthPos = this.game.earthBody.mesh.position;
      const earthVel = this.game.earthBody.velocity;

      // Ship velocity relative to Earth
      const relativeVel = new THREE.Vector3().subVectors(this.game.shipVelocity, earthVel);
      const relativeSpeed = relativeVel.length();

      const relativeSpeedDisplay = document.getElementById('relative-speed-display');
      if (relativeSpeedDisplay) relativeSpeedDisplay.textContent = Math.round(relativeSpeed * 100);

      // Distance from Earth
      const earthDist = this.game.spaceship.position.distanceTo(earthPos);
      const earthDistanceDisplay = document.getElementById('earth-distance');
      if (earthDistanceDisplay) earthDistanceDisplay.textContent = Math.round(earthDist);
    }

    // Show fuel warning at 50% and below
    const fuelWarning = document.getElementById('fuel-warning');
    if (fuelWarning) {
      if (this.game.fuel < this.game.maxFuel * 0.5) {
        fuelWarning.style.display = 'block';
      } else {
        fuelWarning.style.display = 'none';
      }
    }

    // Update velocity adjustment display (only show when paused and adjusting)
    const velocityAdjustmentDisplay = document.getElementById('velocity-adjustment-display');
    const deltaVAdjustmentMag = document.getElementById('deltav-adjustment-mag');
    if (velocityAdjustmentDisplay && deltaVAdjustmentMag && this.game.velocityAdjustment) {
      const adjustmentMagnitude = this.game.velocityAdjustment.length();
      if (this.game.isPaused && adjustmentMagnitude > 0.001) {
        velocityAdjustmentDisplay.style.display = 'block';
        deltaVAdjustmentMag.textContent = adjustmentMagnitude.toFixed(3);
      } else {
        velocityAdjustmentDisplay.style.display = 'none';
      }
    }

    // Distance to nearest checkpoint
    if (this.game.checkpoints.length > 0 && !this.game.checkpoints[0].collected) {
      // Use checkpoint.position which is updated each frame to follow its target
      const dist = this.game.spaceship.position.distanceTo(this.game.checkpoints[0].position);
      const objectiveDistance = document.getElementById('objective-distance');
      if (objectiveDistance) objectiveDistance.textContent = Math.round(dist);
    }
  }
}

