/**
 * InputManager.js
 *
 * Manages all user input (keyboard, mouse, wheel) and dispatches to game systems.
 * Extracted from game_v2.js setupControls() method (635 lines).
 */

import * as THREE from 'three';

export class InputManager {
  /**
   * @param {Object} game - Reference to main game instance
   */
  constructor(game) {
    this.game = game;

    // Mouse state
    this.isDragging = false;
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Bind methods to preserve 'this' context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
  }

  /**
   * Initialize all input event listeners
   */
  initialize() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('wheel', this.handleWheel, { passive: false });

    console.log('✅ InputManager initialized');
  }

  /**
   * Clean up event listeners (for proper shutdown)
   */
  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('wheel', this.handleWheel);
  }

  /**
   * Check if mouse event is inside rocket selector modal
   * @param {HTMLElement} target - Event target element
   * @returns {boolean} True if inside modal
   */
  isInsideRocketModal(target) {
    if (!target) return false;
    const modalOverlay = document.getElementById('rocket-modal-overlay');
    if (!modalOverlay) return false;

    let element = target;
    while (element && element !== document.body) {
      if (element === modalOverlay || element.closest('#rocket-modal-overlay')) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  }

  /**
   * Handle keyboard key down events
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyDown(e) {
    this.game.keys[e.code] = true;

    // ========== Save/Load UI Shortcuts ==========
    if (this.handleSaveLoadShortcuts(e)) return;

    // ========== Camera Controls ==========
    this.handleCameraControls(e);

    // ========== Pause/Resume ==========
    this.handlePauseControl(e);

    // ========== Velocity Adjustment (when paused) ==========
    this.handleVelocityAdjustment(e);

    // ========== Quick Maneuver Presets (when paused) ==========
    this.handleManeuverPresets(e);

    // ========== Misc Controls ==========
    this.handleMiscControls(e);
  }

  /**
   * Handle save/load shortcuts (F5, F9, ESC)
   * @param {KeyboardEvent} e - Keyboard event
   * @returns {boolean} True if event was handled
   */
  handleSaveLoadShortcuts(e) {
    // F5: Quick Save
    if (e.code === 'F5') {
      e.preventDefault();
      if (this.game.saveLoadUI) {
        this.game.saveLoadUI.quickSave();
      }
      return true;
    }

    // F9: Quick Load
    if (e.code === 'F9') {
      e.preventDefault();
      if (this.game.saveLoadUI) {
        this.game.saveLoadUI.quickLoad();
      }
      return true;
    }

    // ESC: Toggle Save/Load Menu
    if (e.code === 'Escape') {
      e.preventDefault();
      if (this.game.saveLoadUI) {
        if (this.game.saveLoadUI.isOpen) {
          this.game.saveLoadUI.close();
        } else {
          this.game.saveLoadUI.open();
        }
      }
      return true;
    }

    return false;
  }

  /**
   * Handle camera control keys (C, Z, H, number keys)
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleCameraControls(e) {
    // 'C' key to focus on spaceship
    if (e.code === 'KeyC') {
      this.game.cameraDistance = 100;
      const target = this.game.spaceshipRender || this.game.spaceship;
      if (target) {
        this.game.cameraFollowTarget = target;
        this.game.cameraManualControl = false;
        this.game.cameraLookAtPoint.copy(target.position);
      }
      console.log('Camera focused on spaceship');
      return;
    }

    // 'Z' key to zoom out
    if (e.code === 'KeyZ') {
      this.game.cameraDistance = 5000;
      console.log('Camera zoomed out');
      return;
    }

    // 'H' key to look at Sun (home)
    if (e.code === 'KeyH') {
      this.game.cameraLookAtPoint.set(0, 0, 0);
      this.game.cameraManualControl = true;
      this.game.cameraFollowTarget = null;
      this.game.cameraDistance = 20000;
      console.log('Camera looking at Sun (center)');
      return;
    }

    // Number keys to view different celestial bodies
    const numberKeyTargets = [
      { code: 'Digit1', body: this.game.sunBody, distance: 1000, name: 'Sun' },
      { code: 'Digit2', body: this.game.mercuryBody, distance: 200, name: 'Mercury' },
      { code: 'Digit3', body: this.game.venusBody, distance: 300, name: 'Venus' },
      { code: 'Digit4', body: this.game.earthBody, distance: 40, name: 'Earth' },
      { code: 'Digit5', body: this.game.moonBody, distance: 10, name: 'Moon' },
      { code: 'Digit6', body: this.game.marsBody, distance: 250, name: 'Mars' },
      { code: 'Digit7', body: this.game.phobosBody, distance: 80, name: 'Phobos' },
      { code: 'Digit8', body: this.game.jupiterBody, distance: 600, name: 'Jupiter' },
      { code: 'Digit9', body: this.game.spaceshipRender || this.game.spaceship, distance: 20, name: 'Spaceship' },
      { code: 'Digit0', body: this.game.halleyBody, distance: 300, name: 'Halley\'s Comet' }
    ];

    for (const target of numberKeyTargets) {
      if (e.code === target.code && target.body) {
        const mesh = target.body.mesh || target.body;
        this.game.cameraFollowTarget = mesh;
        this.game.cameraLookAtPoint.copy(mesh.position);
        this.game.cameraManualControl = false;
        this.game.cameraDistance = target.distance;
        console.log(`Viewing: ${target.name}`);
        return;
      }
    }
  }

  /**
   * Handle pause/resume control (P key)
   * @param {KeyboardEvent} e - Keyboard event
   */
  handlePauseControl(e) {
    if (e.code === 'KeyP') {
      this.game.isPaused = !this.game.isPaused;

      if (this.game.isPaused) {
        this.game.showPrediction = true;
        this.game.velocityAdjustment.set(0, 0, 0);
        this.game.updateTrajectoryPrediction();

        // Sync spaceship position when pausing
        if (this.game.spaceship && this.game.spaceshipRender && this.game.physics.spacecraft) {
          this.game.spaceshipSmoothPos.copy(this.game.physics.spacecraft.position);
          this.game.spaceshipSmoothQuat.copy(this.game.spaceship.quaternion);
        }
        console.log('⏸ PAUSED - Use arrow keys to adjust velocity, Enter to apply');
      } else {
        this.game.showPrediction = false;
        this.game.trajectoryLine.visible = false;
        console.log('▶ RESUMED');
      }

      // Sync UI pause button
      this.updatePauseButton();
    }
  }

  /**
   * Update UI pause button state
   */
  updatePauseButton() {
    if (this.game.uiManager) {
      const pauseButton = document.getElementById('pause-button');
      if (pauseButton) {
        if (this.game.isPaused) {
          pauseButton.textContent = 'Resume';
          pauseButton.classList.add('active');
        } else {
          pauseButton.textContent = 'Pause';
          pauseButton.classList.remove('active');
        }
      }
      if (this.game.uiManager.updateManeuverButtons) {
        this.game.uiManager.updateManeuverButtons();
      }
    }
  }

  /**
   * Handle velocity adjustment when paused (arrow keys, Enter, Backspace)
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleVelocityAdjustment(e) {
    // Only process if paused and save/load menu is closed
    if (!this.game.isPaused || !this.game.spaceship) return;
    if (this.game.saveLoadUI && this.game.saveLoadUI.isOpen) return;

    const deltaV = 0.5 * this.game.deltaVMagnitude;
    let velocityChanged = false;

    // Arrow keys to adjust velocity
    if (e.code === 'ArrowUp') {
      this.game.velocityAdjustment.z -= deltaV;
      velocityChanged = true;
      this.ensureSpaceshipCameraFocus();
    }
    if (e.code === 'ArrowDown') {
      this.game.velocityAdjustment.z += deltaV;
      velocityChanged = true;
      this.ensureSpaceshipCameraFocus();
    }
    if (e.code === 'ArrowLeft') {
      this.game.velocityAdjustment.x -= deltaV;
      velocityChanged = true;
      this.ensureSpaceshipCameraFocus();
    }
    if (e.code === 'ArrowRight') {
      this.game.velocityAdjustment.x += deltaV;
      velocityChanged = true;
      this.ensureSpaceshipCameraFocus();
    }
    if (e.code === 'PageUp') {
      this.game.velocityAdjustment.y += deltaV;
      velocityChanged = true;
      this.ensureSpaceshipCameraFocus();
    }
    if (e.code === 'PageDown') {
      this.game.velocityAdjustment.y -= deltaV;
      velocityChanged = true;
      this.ensureSpaceshipCameraFocus();
    }

    // Backspace to reset velocity adjustment
    if (e.code === 'Backspace') {
      this.game.velocityAdjustment.set(0, 0, 0);
      velocityChanged = true;
    }

    // Enter to apply velocity change
    if (e.code === 'Enter') {
      this.applyVelocityChange();
      return;
    }

    // Display velocity info if changed
    if (velocityChanged) {
      this.displayVelocityInfo();
      this.game.updateTrajectoryPrediction();
    }
  }

  /**
   * Ensure camera follows spaceship when adjusting velocity
   */
  ensureSpaceshipCameraFocus() {
    // IMPORTANT: Follow spaceshipRender (visual root), not spaceship (physics anchor)
    const target = this.game.spaceshipRender || this.game.spaceship;
    if (!this.game.cameraFollowTarget || this.game.cameraFollowTarget !== target) {
      this.game.cameraFollowTarget = target;
      this.game.cameraManualControl = false;
    }
  }

  /**
   * Apply velocity change using Tsiolkovsky equation
   */
  applyVelocityChange() {
    if (this.game.velocityAdjustment.lengthSq() > 0) {
      const deltaVMagnitude_game = this.game.velocityAdjustment.length();

      // Calculate required fuel using Tsiolkovsky equation
      const m0 = this.game.dryMass + this.game.fuelMass;
      const targetMf = m0 / Math.exp(deltaVMagnitude_game / this.game.exhaustVelocity);
      const requiredFuelMass = m0 - targetMf;

      // Check if we have enough fuel
      if (requiredFuelMass <= this.game.fuelMass) {
        // Apply velocity change
        this.game.shipVelocity.add(this.game.velocityAdjustment);
        this.game.physics.spacecraft.velocity.copy(this.game.shipVelocity);

        // Consume fuel
        this.game.fuelMass -= requiredFuelMass;
        if (this.game.fuelMass < 0) this.game.fuelMass = 0;
        this.game.fuel = (this.game.fuelMass / this.game.maxFuelMass) * 100;

        console.log(`✓ Applied ΔV: (${this.game.velocityAdjustment.x.toFixed(2)}, ${this.game.velocityAdjustment.y.toFixed(2)}, ${this.game.velocityAdjustment.z.toFixed(2)})`);
        console.log(`  Magnitude: ${deltaVMagnitude_game.toFixed(3)} units/s`);
        console.log(`  Fuel consumed: ${requiredFuelMass.toFixed(2)} kg`);
        console.log(`  Remaining fuel: ${this.game.fuelMass.toFixed(2)} kg`);
      } else {
        // Not enough fuel!
        alert(`⚠️ INSUFFICIENT FUEL!\n\n` +
              `Required: ${requiredFuelMass.toFixed(2)} kg\n` +
              `Available: ${this.game.fuelMass.toFixed(2)} kg\n` +
              `Deficit: ${(requiredFuelMass - this.game.fuelMass).toFixed(2)} kg\n\n` +
              `Reduce your ΔV or use gravity assist!`);
        console.log(`❌ Not enough fuel! Required: ${requiredFuelMass.toFixed(2)} kg, Available: ${this.game.fuelMass.toFixed(2)} kg`);
      }
    }

    // Unpause and hide prediction
    this.game.isPaused = false;
    this.game.showPrediction = false;
    this.game.trajectoryLine.visible = false;
    this.game.velocityAdjustment.set(0, 0, 0);

    // IMPORTANT: Prevent tutorial from immediately resetting camera after velocity adjustment
    // Set recentCollisionTime to create a protection period (2 seconds)
    // This prevents tutorial's cameraSetup() from overriding user's camera settings
    this.game.recentCollisionTime = Math.max(this.game.recentCollisionTime, 2.0);
  }

  /**
   * Display detailed velocity information in console
   */
  displayVelocityInfo() {
    const currentVel = this.game.shipVelocity.clone();
    const newVel = currentVel.clone().add(this.game.velocityAdjustment);
    const currentSpeed = currentVel.length();
    const newSpeed = newVel.length();

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`ΔV Magnitude Setting: ${this.game.deltaVMagnitude.toFixed(3)}x (${(0.5 * this.game.deltaVMagnitude).toFixed(4)} units/keypress)`);
    console.log(`Current Velocity: (${currentVel.x.toFixed(3)}, ${currentVel.y.toFixed(3)}, ${currentVel.z.toFixed(3)}) | Speed: ${currentSpeed.toFixed(3)}`);
    console.log(`ΔV Adjustment:    (${this.game.velocityAdjustment.x.toFixed(3)}, ${this.game.velocityAdjustment.y.toFixed(3)}, ${this.game.velocityAdjustment.z.toFixed(3)}) | Magnitude: ${this.game.velocityAdjustment.length().toFixed(3)}`);
    console.log(`New Velocity:     (${newVel.x.toFixed(3)}, ${newVel.y.toFixed(3)}, ${newVel.z.toFixed(3)}) | Speed: ${newSpeed.toFixed(3)}`);
    console.log(`Speed Change:     ${(newSpeed - currentSpeed).toFixed(3)} (${((newSpeed - currentSpeed) / currentSpeed * 100).toFixed(2)}%)`);

    // Calculate and show required fuel
    const deltaVMag_game = this.game.velocityAdjustment.length();
    if (deltaVMag_game > 0.001) {
      const m0 = this.game.dryMass + this.game.fuelMass;
      const targetMf = m0 / Math.exp(deltaVMag_game / this.game.exhaustVelocity);
      const requiredFuel = m0 - targetMf;
      const fuelStatus = requiredFuel <= this.game.fuelMass ? '✓ OK' : '❌ INSUFFICIENT';
      console.log(`⛽ Fuel Required:  ${requiredFuel.toFixed(2)} kg | Available: ${this.game.fuelMass.toFixed(2)} kg | ${fuelStatus}`);
      console.log(`   (ΔV: ${deltaVMag_game.toFixed(3)} game units/s)`);
    }

    // Show velocity relative to Earth
    this.displayEarthRelativeVelocity(currentVel, newVel);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  /**
   * Display velocity relative to Earth in orbital frame
   * @param {THREE.Vector3} currentVel - Current velocity
   * @param {THREE.Vector3} newVel - New velocity after adjustment
   */
  displayEarthRelativeVelocity(currentVel, newVel) {
    if (this.game.earthBody && this.game.physics.spacecraft) {
      const shipPos = this.game.physics.spacecraft.position.clone();
      const earthPos = this.game.earthBody.mesh.position.clone();
      const earthVel = this.game.earthBody.velocity.clone();

      const relPos = shipPos.clone().sub(earthPos);
      const relVel = currentVel.clone().sub(earthVel);
      const newRelVel = newVel.clone().sub(earthVel);

      // Orbital reference frame
      const radial = relPos.clone().normalize();
      const normal = new THREE.Vector3().crossVectors(relPos, relVel).normalize();
      const prograde = new THREE.Vector3().crossVectors(normal, radial).normalize();

      // Decompose velocities
      const radialSpeed = relVel.dot(radial);
      const progradeSpeed = relVel.dot(prograde);
      const normalSpeed = relVel.dot(normal);

      const newRadialSpeed = newRelVel.dot(radial);
      const newProgradeSpeed = newRelVel.dot(prograde);
      const newNormalSpeed = newRelVel.dot(normal);

      console.log(`\n📍 Relative to Earth (Orbital Frame):`);
      console.log(`Distance from Earth: ${relPos.length().toFixed(1)} units`);
      console.log(`Current:  Radial: ${radialSpeed.toFixed(3)}, Prograde: ${progradeSpeed.toFixed(3)}, Normal: ${normalSpeed.toFixed(3)}`);
      console.log(`New:      Radial: ${newRadialSpeed.toFixed(3)}, Prograde: ${newProgradeSpeed.toFixed(3)}, Normal: ${newNormalSpeed.toFixed(3)}`);
      console.log(`Change:   Radial: ${(newRadialSpeed - radialSpeed).toFixed(3)}, Prograde: ${(newProgradeSpeed - progradeSpeed).toFixed(3)}, Normal: ${(newNormalSpeed - normalSpeed).toFixed(3)}`);

      console.log(`\n📐 Reference Directions:`);
      console.log(`  Prograde (+): Forward along orbit (increases orbit)`);
      console.log(`  Retrograde (-): Backward along orbit (decreases orbit)`);
      console.log(`  Radial (+): Away from Earth (raises opposite side)`);
      console.log(`  Radial (-): Toward Earth (lowers opposite side)`);
      console.log(`  Normal (+): Out of orbit plane (inclination change)`);
    }
  }

  /**
   * Handle quick maneuver presets (T, M, E, R keys when paused)
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleManeuverPresets(e) {
    // Only process if paused and save/load menu is closed
    if (!this.game.isPaused || !this.game.spaceship) return;
    if (this.game.saveLoadUI && this.game.saveLoadUI.isOpen) return;

    // 'T' key for Hohmann Transfer to Moon
    if (e.code === 'KeyT') {
      this.applyHohmannTransfer();
      return;
    }

    // 'M' key for Moon intercept
    if (e.code === 'KeyM') {
      this.applyMoonIntercept();
      return;
    }

    // 'E' key for Earth escape
    if (e.code === 'KeyE') {
      this.applyEarthEscape();
      return;
    }

    // 'R' key to reverse velocity
    if (e.code === 'KeyR') {
      this.applyRetrograde();
      return;
    }

    // 'U' key to toggle mute
    if (e.code === 'KeyU') {
      this.game.toggleMute();
      return;
    }
  }

  /**
   * Apply Hohmann transfer to Moon
   */
  applyHohmannTransfer() {
    if (this.game.moonBody && this.game.moonBody.mesh && this.game.earthBody) {
      const earthPos = this.game.earthBody.mesh.position;
      const shipToEarth = new THREE.Vector3().subVectors(this.game.spaceship.position, earthPos);
      const r1 = shipToEarth.length();
      const r2 = 40; // Moon's orbital radius

      const progradeDir = this.game.shipVelocity.clone().normalize();
      const v_circular = Math.sqrt(1.0 * 1.0 / r1);
      const a = (r1 + r2) / 2;
      const v_transfer = Math.sqrt(1.0 * 1.0 * (2/r1 - 1/a));
      const deltaV_magnitude = v_transfer - v_circular;

      this.game.velocityAdjustment.copy(progradeDir).multiplyScalar(deltaV_magnitude);
      this.game.updateTrajectoryPrediction();

      console.log(`🌙 HOHMANN TRANSFER TO MOON:`);
      console.log(`   Current radius: ${r1.toFixed(1)} → Target radius: ${r2.toFixed(1)}`);
      console.log(`   ΔV: ${deltaV_magnitude.toFixed(4)} units/s (prograde burn)`);
      console.log(`   Transfer will take you to Moon's altitude`);
      console.log(`   Watch trajectory - you'll need a 2nd burn at Moon altitude!`);
    }
  }

  /**
   * Apply Moon intercept maneuver
   */
  applyMoonIntercept() {
    if (this.game.moonBody && this.game.moonBody.mesh) {
      const toMoon = new THREE.Vector3()
        .subVectors(this.game.moonBody.mesh.position, this.game.spaceship.position)
        .normalize();

      const dist = this.game.spaceship.position.distanceTo(this.game.moonBody.mesh.position);
      const deltaVMag = Math.min(0.15, dist * 0.003);

      this.game.velocityAdjustment.copy(toMoon).multiplyScalar(deltaVMag);
      this.game.updateTrajectoryPrediction();

      console.log(`🌙 MOON INTERCEPT: Added ΔV of ${deltaVMag.toFixed(4)} units toward Moon`);
      console.log(`   Current distance to Moon: ${dist.toFixed(1)} units`);
    }
  }

  /**
   * Apply Earth escape maneuver
   */
  applyEarthEscape() {
    const earthPos = this.game.earthBody ? this.game.earthBody.mesh.position : new THREE.Vector3(15000, 0, 0);
    const toEarth = new THREE.Vector3()
      .subVectors(this.game.spaceship.position, earthPos);

    const tangent = new THREE.Vector3(-toEarth.z, 0, toEarth.x).normalize();

    this.game.velocityAdjustment.copy(tangent).multiplyScalar(2.0);
    this.game.updateTrajectoryPrediction();

    console.log(`🚀 EARTH ESCAPE: Added ΔV tangent to orbit`);
  }

  /**
   * Apply retrograde maneuver (reverse velocity)
   */
  applyRetrograde() {
    const currentVel = this.game.shipVelocity.clone();
    this.game.velocityAdjustment.copy(currentVel).multiplyScalar(-2.0);
    this.game.updateTrajectoryPrediction();

    console.log(`🔄 RETROGRADE: Velocity reversal maneuver`);
  }

  /**
   * Handle miscellaneous controls (X, F keys)
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleMiscControls(e) {
    // 'X' key to clear orbit trails
    if (e.code === 'KeyX') {
      for (const [name, trail] of this.game.orbitTrails.entries()) {
        trail.positions = [];
        trail.geometry.setDrawRange(0, 0);
        trail.geometry.attributes.position.needsUpdate = true;
      }
      console.log('Orbit trails cleared');
      return;
    }

    // 'F' key to toggle reference frame
    if (e.code === 'KeyF') {
      const frames = ['sun', 'earth', 'moon'];
      const currentIndex = frames.indexOf(this.game.referenceFrame);
      const nextIndex = (currentIndex + 1) % frames.length;
      this.game.referenceFrame = frames[nextIndex];

      this.game.referenceFrameJustChanged = true;

      if (this.game.isPaused && this.game.trajectoryLine.visible) {
        this.game.updateTrajectoryPrediction();
      }

      console.log(`🌍 Reference frame switched to: ${this.game.referenceFrame.toUpperCase()}`);
      if (this.game.referenceFrame === 'earth') {
        console.log('   → Earth is now stationary, everything moves relative to Earth');
        console.log('   → Watch how the Moon orbits around Earth!');
      } else if (this.game.referenceFrame === 'moon') {
        console.log('   → Moon is now stationary, everything moves relative to Moon');
        console.log('   → Perfect for seeing Moon capture trajectories!');
      } else {
        console.log('   → Sun is stationary (inertial frame)');
        console.log('   → Everything orbits the Sun');
      }
      return;
    }
  }

  /**
   * Handle keyboard key up events
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyUp(e) {
    this.game.keys[e.code] = false;
  }

  /**
   * Handle mouse down events
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseDown(e) {
    // Ignore if inside rocket modal
    if (this.isInsideRocketModal(e.target)) return;

    // Don't start drag on UI elements
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

    if (e.button === 0) { // Left button - rotate
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (e.button === 1) { // Middle button - pan
      e.preventDefault();
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.game.cameraManualControl = true;
      console.log('🖱️ Middle button pan started');
    }
  }

  /**
   * Handle mouse move events
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseMove(e) {
    // Ignore if inside rocket modal
    if (this.isInsideRocketModal(e.target)) {
      if (this.isDragging) this.isDragging = false;
      if (this.isPanning) this.isPanning = false;
      return;
    }

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    if (this.isDragging) {
      // Left button: Rotate camera
      const sensitivity = 0.01;
      this.game.cameraYaw -= deltaX * sensitivity;
      this.game.cameraPitch -= deltaY * sensitivity;

      // Limit pitch to prevent gimbal lock
      const maxPitch = Math.PI * 0.44;
      this.game.cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, this.game.cameraPitch));
    } else if (this.isPanning) {
      // Middle button: Pan camera
      this.game.cameraManualControl = true;

      const forward = new THREE.Vector3()
        .subVectors(this.game.cameraLookAtPoint, this.game.camera.position)
        .normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();

      const panSpeed = this.game.cameraDistance * 0.001;

      const panOffset = new THREE.Vector3();
      panOffset.add(right.multiplyScalar(-deltaX * panSpeed));
      panOffset.add(up.multiplyScalar(deltaY * panSpeed));

      this.game.cameraLookAtPoint.add(panOffset);
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  /**
   * Handle mouse up events
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseUp(e) {
    // Ignore if inside rocket modal
    if (this.isInsideRocketModal(e.target)) return;

    if (e.button === 0) this.isDragging = false;
    if (e.button === 1) this.isPanning = false;
  }

  /**
   * Handle mouse wheel events (zoom)
   * @param {WheelEvent} e - Wheel event
   */
  handleWheel(e) {
    // Ignore if inside rocket modal
    if (this.isInsideRocketModal(e.target)) return;

    // Allow scrolling in save/load menu
    if (this.game.saveLoadUI && this.game.saveLoadUI.isOpen) return;

    // Allow scrolling in scrollable UI elements
    const targetElement = e.target;
    if (targetElement && (
      targetElement.classList.contains('save-slot-list') ||
      targetElement.closest('.save-slot-list') ||
      targetElement.classList.contains('scrollable') ||
      targetElement.closest('.scrollable')
    )) {
      return;
    }

    e.preventDefault();

    // Logarithmic zoom
    const zoomSpeed = Math.max(1, this.game.cameraDistance * 0.001);
    this.game.cameraDistance += e.deltaY * zoomSpeed;

    // Clamp camera distance
    this.game.cameraDistance = Math.max(this.game.minCameraDistance,
                                        Math.min(this.game.maxCameraDistance, this.game.cameraDistance));

    console.log(`Camera distance: ${Math.round(this.game.cameraDistance)}`);
  }
}
