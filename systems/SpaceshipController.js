import * as THREE from 'three';

/**
 * SpaceshipController - 负责飞船创建、输入处理、平滑渲染
 */
export class SpaceshipController {
  constructor(game) {
    this.game = game;

    // Spaceship references
    this.spaceship = null; // Physics anchor
    this.spaceshipRender = null; // Visual root (smoothed)
    this.spaceshipVisual = null; // Actual visual model

    // Smooth rendering
    this.spaceshipSmoothPos = new THREE.Vector3();
    this.spaceshipSmoothQuat = new THREE.Quaternion();
  }

  /**
   * Create spaceship geometry and setup physics
   */
  createSpaceship() {
    // Simple spaceship geometry - 临时占位模型，稍后会被Generic Spaceship替换
    this.spaceship = new THREE.Group();
    this.spaceshipRender = new THREE.Group(); // smoothed visual root
    this.spaceshipVisual = new THREE.Group();

    // 创建一个非常小的占位模型（几乎不可见），避免显示红色锥形
    // 真正的模型会在游戏启动时由rocket selector加载
    const placeholderGeom = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    const placeholderMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.01 // 几乎完全透明
    });
    const placeholder = new THREE.Mesh(placeholderGeom, placeholderMat);
    placeholder.name = 'placeholder';
    this.spaceshipVisual.add(placeholder);

    // Engine glow placeholder (用于火焰效果)
    const glowGeom = new THREE.SphereGeometry(0.2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0
    });
    const engineGlow = new THREE.Mesh(glowGeom, glowMat);
    engineGlow.position.z = 0.6;
    engineGlow.name = 'engineGlow';
    this.spaceshipVisual.add(engineGlow);

    // Visuals live under smoothed render root
    // Hide the visual until rocket selector loads the actual model
    this.spaceshipVisual.visible = false;
    this.spaceshipRender.add(this.spaceshipVisual);

    // Start in orbit around Earth with PROPER ANGULAR MOMENTUM
    // REALISTIC RATIOS from simple_test!
    const shipOrbitAroundEarth = 4.22; // Reduced from 25 to 4.22 (approximate synchronous orbit)
    const spaceshipAngle = Math.PI / 4; // 45 degrees from Earth's +X

    // Calculate velocities with PROPER ANGULAR MOMENTUM
    // 1. Earth's velocity around the Sun (tangent to orbit, in +Z direction at angle=0)
    const earthOrbitalSpeed = Math.sqrt((this.game.G * this.game.sunMass) / this.game.AU);
    const earthVelocity = new THREE.Vector3(0, 0, earthOrbitalSpeed);

    // 2. Spaceship position: relative to Earth
    // Earth is at angle=0, position (15000, 0, 0)
    const earthPos = new THREE.Vector3(this.game.AU, 0, 0);
    this.spaceship.position.set(
      earthPos.x + Math.cos(spaceshipAngle) * shipOrbitAroundEarth,
      0,
      earthPos.z + Math.sin(spaceshipAngle) * shipOrbitAroundEarth
    );

    // 3. Ship's velocity relative to Earth
    // First cosmic velocity (circular orbit velocity around Earth)
    const shipOrbitVelocity = Math.sqrt((this.game.G * this.game.earthMass) / shipOrbitAroundEarth);

    // Velocity perpendicular to radius: (-sin(θ), 0, cos(θ)) * speed
    const shipRelativeVelocity = new THREE.Vector3(
      -Math.sin(spaceshipAngle) * shipOrbitVelocity,
      0,
      Math.cos(spaceshipAngle) * shipOrbitVelocity
    );

    // 4. Ship's absolute velocity = Earth's velocity + Ship's velocity relative to Earth
    this.game.shipVelocity.copy(earthVelocity).add(shipRelativeVelocity);

    console.log('=== INITIAL ORBITAL PARAMETERS ===');
    console.log(`Sun mass: ${this.game.sunMass}, Earth mass: ${this.game.earthMass}, G: ${this.game.G}`);
    console.log(`Mass ratio (Earth/Sun): ${(this.game.earthMass / this.game.sunMass).toExponential(2)}`);
    console.log(`Earth position: (${this.game.AU}, 0, 0)`);
    console.log(`Ship position: (${this.spaceship.position.toArray().map(v => v.toFixed(0)).join(', ')})`);
    console.log(`Distance from Earth: ${shipOrbitAroundEarth} units`);
    console.log(`FIRST COSMIC VELOCITY (circular orbit around Earth): ${this.game.firstCosmicVelocity.toFixed(3)} units/s`);
    console.log(`Ship velocity relative to Earth: [${shipRelativeVelocity.toArray().map(v => v.toFixed(3)).join(', ')}]`);
    console.log(`Earth orbital velocity: [${earthVelocity.toArray().map(v => v.toFixed(3)).join(', ')}]`);
    console.log(`Ship absolute velocity: [${this.game.shipVelocity.toArray().map(v => v.toFixed(3)).join(', ')}]`);
    console.log(`Total ship speed: ${this.game.shipVelocity.length().toFixed(3)}`);

    // Register label for spaceship (using spaceshipRender as the mesh)
    const spaceshipLabel = this.game.celestialManager.createLabel('SPACESHIP', 3);
    this.game.celestialManager.registerLabel(this.spaceshipRender, spaceshipLabel);

    // Add both physics anchor and visual root to scene
    this.game.scene.add(this.spaceship);
    this.game.scene.add(this.spaceshipRender);

    // Setup physics for spaceship with negligible mass
    const spaceshipMass = this.game.earthMass * 1e-20; // Tiny mass
    console.log(`Spaceship mass: ${spaceshipMass.toExponential(2)} (${(spaceshipMass / this.game.earthMass).toExponential(2)}x Earth)`);

    this.game.physics.setSpacecraft({
      position: this.spaceship.position,
      velocity: this.game.shipVelocity,
      mass: spaceshipMass,
      rotation: this.spaceship.rotation
    });

    // Initialize smoothed pose with exact pose
    this.spaceshipSmoothPos.copy(this.spaceship.position);
    this.spaceshipSmoothQuat.copy(this.spaceship.quaternion);

    // Initialize camera position
    this.game.cameraController.updateCameraPosition();

    // Recompute engine FX anchor after any model changes
    this.game.flameManager.refreshEngineEffects();

    // Expose spaceship references to game
    this.game.spaceship = this.spaceship;
    this.game.spaceshipRender = this.spaceshipRender;
    this.game.spaceshipVisual = this.spaceshipVisual;
    this.game.spaceshipSmoothPos = this.spaceshipSmoothPos;
    this.game.spaceshipSmoothQuat = this.spaceshipSmoothQuat;
  }

  /**
   * Handle input (WASD, Space, V for thrust)
   */
  handleInput(deltaTime) {
    // Skip all handling when paused
    if (this.game.isPaused) return;

    // Visual/audio feedback for thrust inputs
    const thrustLocal = new THREE.Vector3(0, 0, 0);
    let isThrusting = false;

    if (this.game.keys['KeyW']) { thrustLocal.z -= 1; isThrusting = true; }
    if (this.game.keys['KeyS']) { thrustLocal.z += 1; isThrusting = true; }
    if (this.game.keys['KeyA']) { thrustLocal.x -= 1; isThrusting = true; }
    if (this.game.keys['KeyD']) { thrustLocal.x += 1; isThrusting = true; }
    if (this.game.keys['Space']) { thrustLocal.y += 1; isThrusting = true; }
    if (this.game.keys['KeyV']) { thrustLocal.y -= 1; isThrusting = true; }

    const boostMultiplier = (this.game.keys['ShiftLeft'] || this.game.keys['ShiftRight']) ? 2.5 : 1.0;

    // Apply real-time thrust if we have fuel
    if (isThrusting && this.game.fuelMass > 0) {
      thrustLocal.normalize();

      // Convert thrust from camera space to world space
      const thrustWorld = thrustLocal.clone();
      thrustWorld.applyEuler(new THREE.Euler(this.game.cameraController.cameraPitch, this.game.cameraController.cameraYaw, 0, 'YXZ'));

      // Real-time thrust power (in game units/s per second)
      const thrustPower_game = 0.01 * boostMultiplier; // Small thrust per frame
      const deltaV_game = thrustPower_game * deltaTime;

      // Calculate fuel consumption using Tsiolkovsky equation
      // IMPORTANT: Both deltaV and exhaustVelocity must be in the same units (game units/s)
      const m0 = this.game.dryMass + this.game.fuelMass;
      const targetMf = m0 / Math.exp(deltaV_game / this.game.exhaustVelocity);
      const fuelConsumed = m0 - targetMf;
      this.game.flameManager.triggerEngineFX(boostMultiplier);
      this.game.audioManager.playEngineSound();

      if (fuelConsumed <= this.game.fuelMass) {
        // Apply thrust
        const thrustVector = thrustWorld.clone().multiplyScalar(deltaV_game);
        this.game.shipVelocity.add(thrustVector);
        this.game.physics.spacecraft.velocity.copy(this.game.shipVelocity);

        // Consume fuel
        this.game.fuelMass -= fuelConsumed;
        if (this.game.fuelMass < 0) this.game.fuelMass = 0;
        this.game.fuel = (this.game.fuelMass / this.game.maxFuelMass) * 100;

        // Debug log (less frequent)
        if (Math.random() < 0.01) {
          console.log(`🔥 Real-time thrust: ΔV=${deltaV_game.toFixed(5)} game units/s | Fuel: ${this.game.fuelMass.toFixed(2)} kg`);
        }
      }

      // Engine glow effect
      const engineGlow = this.spaceship.getObjectByName('engineGlow');
      if (engineGlow) {
        engineGlow.material.opacity = 0.8 * boostMultiplier;
      }
    } else {
      this.game.flameManager.stopEngineFX();
      // 推力结束时对声音做淡出并停止，防止出现"断点噪音"
      if (this.game.audioManager.engineSound &&
          this.game.audioManager.engineSound.isPlaying &&
          this.game.audioManager.audioListener &&
          this.game.audioManager.audioListener.context) {
        const ctx = this.game.audioManager.audioListener.context;
        const gainNode = this.game.audioManager.engineSound.gain;
        if (gainNode && gainNode.gain) {
          const now = ctx.currentTime;
          const fadeOut = 0.2; // 尾音时间

          gainNode.gain.cancelScheduledValues(now);
          gainNode.gain.linearRampToValueAtTime(0, now + fadeOut);
          this.game.audioManager.engineSoundStopTimer = setTimeout(() => {
            if (this.game.audioManager.engineSound && this.game.audioManager.engineSound.isPlaying) {
              this.game.audioManager.engineSound.stop();
            }
            this.game.audioManager.engineSoundStopTimer = null;
          }, fadeOut * 1000);
        }
      }
    }

    // Update spaceship rotation to face velocity direction (realistic!)
    // Need to use the velocity relative to the reference object for better visual effects
    const shipRelativeVelocity = new THREE.Vector3(0, 0, 0);
    const refFrameManager = this.game.referenceFrameManager;
    if (refFrameManager.referenceFrame === 'earth' && this.game.celestialManager.earthBody) {
      shipRelativeVelocity.copy(this.game.shipVelocity).sub(this.game.celestialManager.earthBody.velocity);
    } else if (refFrameManager.referenceFrame === 'moon' && this.game.celestialManager.moonBody) {
      shipRelativeVelocity.copy(this.game.shipVelocity).sub(this.game.celestialManager.moonBody.velocity);
    } else {
      shipRelativeVelocity.copy(this.game.shipVelocity);
    }

    if (shipRelativeVelocity.lengthSq() > 1e-4) {
      const targetDirection = shipRelativeVelocity.clone().normalize();
      const currentDirection = new THREE.Vector3(0, 0, -1);
      currentDirection.applyQuaternion(this.spaceship.quaternion);

      // Smoothly rotate toward velocity direction
      const rotationSpeed = 2.0 * deltaTime;
      const cosine = currentDirection.clone().dot(targetDirection);
      if (cosine > 0.99) {
        currentDirection.lerp(targetDirection, rotationSpeed);
      } else {
        currentDirection.copy(targetDirection);
      }

      // Create rotation to face the direction
      const targetQuaternion = new THREE.Quaternion();
      const matrix = new THREE.Matrix4();
      matrix.lookAt(currentDirection, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
      targetQuaternion.setFromRotationMatrix(matrix);

      // Apply rotation
      if (cosine > 0.99) {
        this.spaceship.quaternion.slerp(targetQuaternion, rotationSpeed);
      } else {
        this.spaceship.quaternion.copy(targetQuaternion);
      }
    }
  }

  /**
   * Smooth spaceship pose for rendering (does not affect physics)
   */
  updateSpaceshipSmooth(deltaTime) {
    if (!this.spaceship || !this.spaceshipRender || !this.game.physics.spacecraft) return;

    // IMPORTANT: spaceshipSmoothPos should be based on physics position (Sun frame),
    // NOT spaceship.position which already includes frameOffset
    const physicsPos = this.game.physics.spacecraft.position;

    // Check if position jumped suddenly (collision detection)
    // Use velocity-aware threshold: normal movement should be velocity * deltaTime
    const positionDelta = physicsPos.distanceTo(this.spaceshipSmoothPos);
    const expectedMove = this.game.shipVelocity.length() * deltaTime * 1.5; // 1.5x safety margin
    const suddenJump = positionDelta > Math.max(2.0, expectedMove);

    // If paused, reference frame changed, or collision occurred, snap position without smoothing
    const frameJustChanged = this.game.referenceFrameManager.referenceFrameJustChanged;
    if (this.game.isPaused || frameJustChanged || suddenJump) {
      this.spaceshipSmoothPos.copy(physicsPos);
      this.spaceshipSmoothQuat.copy(this.spaceship.quaternion);

      if (frameJustChanged) {
        this.game.referenceFrameManager.referenceFrameJustChanged = false;
      }

      // If collision detected, ensure camera follows spaceship
      if (suddenJump) {
        this.game.cameraController.handleCollision();
        console.log(`⚠️ Collision detected! Position jump: ${positionDelta.toFixed(2)} units`);
      }
    } else {
      // Separate smoothing for position vs rotation
      const posStrength = 12.0;   // higher = follow faster (less smoothing)
      const rotStrength = 1.0;    // lower = more smoothing (slower, steadier)
      const alphaPos = 1 - Math.exp(-posStrength * deltaTime * this.game.physics.timeScale);
      const alphaRot = 1 - Math.exp(-rotStrength * deltaTime * this.game.physics.timeScale);

      // Position smoothing (faster follow, small latency)
      this.spaceshipSmoothPos.lerp(physicsPos, alphaPos);

      // Rotation smoothing (stronger smoothing to calm angular jitter)
      this.spaceshipSmoothQuat.slerp(this.spaceship.quaternion, alphaRot);
    }

    // Update collision timer
    this.game.cameraController.updateCollisionTimer(deltaTime);

    // Apply to render root (frameOffset will be added in updateReferenceFrame)
    this.spaceshipRender.position.copy(this.spaceshipSmoothPos);
    this.spaceshipRender.quaternion.copy(this.spaceshipSmoothQuat);
  }

  /**
   * Get spaceship references
   */
  getSpaceship() {
    return this.spaceship;
  }

  getSpaceshipRender() {
    return this.spaceshipRender;
  }

  getSpaceshipVisual() {
    return this.spaceshipVisual;
  }
}
