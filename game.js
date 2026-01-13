import * as THREE from 'three';
import { PhysicsEngine } from './physics/physics.js';
import { FlameManager } from './utils/flame_manager.js';
import {
  SaveManager,
  GameStateSaveComponent,
  SpaceshipSaveComponent,
  CelestialBodySaveComponent,
  JsonSerializer
} from './save_system/index.js';
import { UIManager } from './ui/ui_manager.js';
import { TutorialManager } from './ui/tutorial_manager.js';

// Configuration imports
import { PhysicsConstants } from './config/PhysicsConstants.js';
import { GameConfig } from './config/GameConfig.js';
import { CelestialBodies, calculateOrbitalPosition, calculateOrbitalVelocity } from './config/CelestialConfig.js';
import { UIConfig } from './config/UIConfig.js';

// Entity factories
import { CelestialBodyFactory } from './entities/CelestialBodyFactory.js';

// System managers
import { SaveLoadManager } from './systems/SaveLoadManager.js';
import { InputManager } from './systems/InputManager.js';
import { LabelManager } from './systems/LabelManager.js';
import { CheckpointManager } from './systems/CheckpointManager.js';
import { TrajectoryManager } from './systems/TrajectoryManager.js';
import { AudioManager } from './systems/AudioManager.js';
import { ReferenceFrameManager } from './systems/ReferenceFrameManager.js';

// Rendering managers
import { VisualEffects } from './rendering/VisualEffects.js';

/**
 * Educational Space Navigation Game v2
 * Features: Realistic gravity, orbital mechanics, gravitational slingshot
 *
 * FIXES:
 * - Mouse wheel zoom to see whole scene
 * - Camera rotates independently from spaceship
 * - Spaceship only rotates from thrust/velocity
 * - Much more limited fuel for realistic gameplay
 */

class SpaceGame {
  constructor() {
    // Core Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Game objects
    this.spaceship = null;             // physics anchor (exact state)
    this.spaceshipRender = null;       // smoothed visual root
    this.spaceshipVisual = null;       // current rocket mesh holder (child of spaceshipRender)
    this.spaceshipSmoothPos = new THREE.Vector3(); // smoothed position for rendering
    this.spaceshipSmoothQuat = new THREE.Quaternion(); // smoothed rotation for rendering
    this.celestialBodies = [];
    this.checkpoints = [];
    this.trajectoryLine = null;

    // Physics
    this.physics = null;
    this.shipVelocity = new THREE.Vector3(0, 0, 0); // Will be set based on orbital velocity

    // Camera controls (scaled for larger distances)
    this.keys = {};
    this.cameraYaw = GameConfig.initialCameraYaw;
    this.cameraPitch = GameConfig.initialCameraPitch;
    this.cameraDistance = GameConfig.initialCameraDistance;
    // 当前相机跟随的目标（任意天体 Mesh 或飞船），为空则使用默认行为
    this.cameraFollowTarget = null;
    this.minCameraDistance = GameConfig.minCameraDistance;
    this.maxCameraDistance = GameConfig.maxCameraDistance;
    this.recentCollisionTime = 0; // Track time since last collision to prevent camera jumps
    this.isPointerLocked = false;
    this.cameraLookAtPoint = new THREE.Vector3(0, 0, 0); // What camera is looking at

    // Game state
    this.gameStarted = false; // Game doesn't start until player clicks
    this.gameTime = 0;

    // physics related params
    this.G = PhysicsConstants.G;
    this.earthMass = PhysicsConstants.earthMass;
    this.sunMass = PhysicsConstants.sunMass;
    this.AU = PhysicsConstants.AU;
    this.earthRadius = PhysicsConstants.earthRadius;
    this.firstCosmicVelocity = PhysicsConstants.firstCosmicVelocity;

    // Tsiolkovsky rocket equation parameters
    this.dryMass = GameConfig.dryMass;
    this.fuelMass = GameConfig.initialFuelMass;
    this.maxFuelMass = GameConfig.maxFuelMass;
    //this.specificImpulse = 300; // seconds - typical chemical rocket Isp | FAIL!: contains dimension
    this.exhaustVelocity = GameConfig.exhaustVelocity;
    this.massFlowRate = GameConfig.massFlowRate;

    // Legacy fuel display (0-100 scale for HUD)
    this.fuel = GameConfig.initialFuel;
    this.maxFuel = GameConfig.maxFuel;
    this.fuelConsumptionRate = GameConfig.fuelConsumptionRate;
    this.thrustPower = GameConfig.thrustPower;
    this.score = GameConfig.initialScore;

    // Tutorial mode
    this.tutorialMode = true; // Start in tutorial mode
    this.tutorialCompleted = false;
    this.tutorialObjective = 'moon'; // Objective: reach the Moon

    // Second mission mode
    this.secondMission = false; // Activates after tutorial completion
    this.secondMissionCompleted = false;

    // Reference Frame System (managed by ReferenceFrameManager)
    this.referenceFrameManager = null; // Will be initialized in init()

    // Trajectory prediction system
    this.isPaused = false;
    this.predictedTrajectory = [];
    this.velocityAdjustment = new THREE.Vector3(0, 0, 0); // Delta V to apply
    this.showPrediction = false;

    // Prediction parameters (adjustable)
    this.deltaVMagnitude = GameConfig.deltaVMagnitude;
    this.predictionSteps = GameConfig.predictionSteps;
    this.predictionStepSize = GameConfig.predictionStepSize;

    // References to celestial bodies (for distance calculations, etc.)
    this.earthBody = null;
    this.marsBody = null;

    // Orbit trails for visualization
    this.orbitTrails = new Map(); // Map of body -> {positions: [], line: THREE.Line}
    this.maxTrailPoints = 50000; // Keep last 50000 points (full orbital history!)
    this.trailUpdateCounter = 0; // Update trails every N frames

    // Future position markers
    this.futureMarkers = [];

    // Engine VFX & SFX
    this.flameManager = new FlameManager(this); // 火焰效果管理器

    // Audio System (managed by AudioManager)
    this.audioManager = null; // Will be initialized in init()
    
    // 向后兼容属性（委托给 flameManager）
    Object.defineProperty(this, 'engineFlame', {
      get() { return this.flameManager.engineFlame; }
    });
    Object.defineProperty(this, 'engineFlames', {
      get() { return this.flameManager.engineFlames; }
    });
    Object.defineProperty(this, 'engineGlowRef', {
      get() { return this.flameManager.engineGlowRefs[0] || null; }
    });
    Object.defineProperty(this, 'currentFlameRotationOffset', {
      get() { return this.flameManager.currentFlameRotationOffset; },
      set(value) { this.flameManager.currentFlameRotationOffset = value; }
    });
    Object.defineProperty(this, 'currentFlamePositionOffset', {
      get() { return this.flameManager.currentFlamePositionOffset; },
      set(value) { this.flameManager.currentFlamePositionOffset = value; }
    });

    // 向后兼容属性（委托给 audioManager）
    Object.defineProperty(this, 'audioListener', {
      get() { return this.audioManager ? this.audioManager.audioListener : null; }
    });
    Object.defineProperty(this, 'engineSound', {
      get() { return this.audioManager ? this.audioManager.engineSound : null; }
    });
    Object.defineProperty(this, 'engineSoundBuffer', {
      get() { return this.audioManager ? this.audioManager.engineSoundBuffer : null; }
    });
    Object.defineProperty(this, 'engineSoundStopTimer', {
      get() { return this.audioManager ? this.audioManager.engineSoundStopTimer : null; },
      set(value) { if (this.audioManager) this.audioManager.engineSoundStopTimer = value; }
    });
    Object.defineProperty(this, 'backgroundMusic', {
      get() { return this.audioManager ? this.audioManager.backgroundMusic : null; }
    });
    Object.defineProperty(this, 'isMuted', {
      get() { return this.audioManager ? this.audioManager.isMuted : false; },
      set(value) { if (this.audioManager) this.audioManager.isMuted = value; }
    });

    // 向后兼容属性（委托给 referenceFrameManager）
    Object.defineProperty(this, 'referenceFrame', {
      get() { return this.referenceFrameManager ? this.referenceFrameManager.referenceFrame : 'sun'; },
      set(value) { if (this.referenceFrameManager) this.referenceFrameManager.referenceFrame = value; }
    });
    Object.defineProperty(this, 'frameOffset', {
      get() { return this.referenceFrameManager ? this.referenceFrameManager.frameOffset : new THREE.Vector3(0, 0, 0); }
    });
    Object.defineProperty(this, 'frameRotation', {
      get() { return this.referenceFrameManager ? this.referenceFrameManager.frameRotation : new THREE.Vector3(0, 0, 0); }
    });
    Object.defineProperty(this, 'referenceFrameJustChanged', {
      get() { return this.referenceFrameManager ? this.referenceFrameManager.referenceFrameJustChanged : false; },
      set(value) { if (this.referenceFrameManager) this.referenceFrameManager.referenceFrameJustChanged = value; }
    });

    // Save/Load System (managed by SaveLoadManager)
    this.saveLoadManager = null; // Will be initialized in init()
    this.isLoading = false;

    // Legacy references (for backward compatibility)
    this.saveManager = null; // Will point to saveLoadManager.saveManager
    this.saveableComponents = null; // Will point to saveLoadManager.saveableComponents
    this.saveLoadUI = null; // Will point to saveLoadManager.saveLoadUI

    // Input System (managed by InputManager)
    this.inputManager = null; // Will be initialized in init()

    // Label System (managed by LabelManager)
    this.labelManager = null; // Will be initialized in init()
    this.labelElements = new Map(); // Legacy reference, will point to labelManager.labelElements

    // Visual Effects (managed by VisualEffects)
    this.visualEffects = null; // Will be initialized in init()

    // Checkpoint System (managed by CheckpointManager)
    this.checkpointManager = null; // Will be initialized in init()
    // Legacy reference (will point to checkpointManager.checkpoints after init)

    // Trajectory System (managed by TrajectoryManager)
    this.trajectoryManager = null; // Will be initialized in init()

    // UI Manager
    this.uiManager = null; // Will be initialized in setupHUD

    // Tutorial Manager
    this.tutorialManager = null; // Will be initialized after scene setup

    this.init();
  }

  init() {
    this.setupScene();
    this.setupPhysics();
    this.loadTextures(); // Load realistic planet textures

    // Initialize Label Manager BEFORE createSpaceship (which uses createLabel)
    this.labelManager = new LabelManager(this);
    this.labelElements = this.labelManager.labelElements; // Legacy reference

    this.createSpaceship();

    // Initialize Audio Manager
    this.audioManager = new AudioManager(this);
    this.audioManager.setupAudio(this.camera);

    this.flameManager.setupEngineEffects();
    this.createCelestialBodies();

    // Setup HPOP reference bodies after celestial bodies are created
    if (this.physics.useHPOP) {
      this.physics.setHPOPReferences({
        earth: this.earthBody,
        sun: this.sunBody,
        moon: this.moonBody
      });
      console.log('✅ HPOP reference bodies configured');
    }

    this.setupHUD();

    // Initialize Checkpoint Manager
    this.checkpointManager = new CheckpointManager(this);
    this.checkpointManager.createCheckpoints();
    this.checkpoints = this.checkpointManager.checkpoints; // Legacy reference

    // Initialize Visual Effects
    this.visualEffects = new VisualEffects(this);
    this.visualEffects.createStarField();

    // Initialize Trajectory Manager
    this.trajectoryManager = new TrajectoryManager(this);
    this.trajectoryManager.createOrbitTrails();
    this.trajectoryManager.createTrajectoryLine();
    // Legacy references (point to trajectoryManager properties)
    this.orbitTrails = this.trajectoryManager.orbitTrails;
    this.trajectoryLine = this.trajectoryManager.trajectoryLine;

    // Initialize Reference Frame Manager
    this.referenceFrameManager = new ReferenceFrameManager(this);

    // Initialize Input Manager
    this.inputManager = new InputManager(this);
    this.inputManager.initialize();

    // Initialize Save/Load Manager
    this.saveLoadManager = new SaveLoadManager(this);

    // Set up legacy references for backward compatibility
    this.saveManager = this.saveLoadManager.saveManager;
    this.saveableComponents = this.saveLoadManager.saveableComponents;

    // Initialize Save/Load UI (after DOM is ready)
    this.saveLoadManager.initializeSaveLoadUI().then(() => {
      this.saveLoadUI = this.saveLoadManager.saveLoadUI;
    });

    // Initialize Tutorial Manager
    this.tutorialManager = new TutorialManager(this);

    this.animate();
  }

  // ==================== Save/Load Delegation Methods ====================
  // These methods delegate to SaveLoadManager for backward compatibility

  async saveGame(slotIndex = 0, saveName = null) {
    return this.saveLoadManager.saveGame(slotIndex, saveName);
  }

  async loadGame(slotIndex = 0) {
    return this.saveLoadManager.loadGame(slotIndex);
  }

  async deleteGame(slotIndex = 0) {
    return this.saveLoadManager.deleteGame(slotIndex);
  }

  getCurrentLocationName() {
    return this.saveLoadManager.getCurrentLocationName();
  }

  serializeOrbitTrails() {
    return this.saveLoadManager.serializeOrbitTrails();
  }

  deserializeOrbitTrails(serializedTrails) {
    return this.saveLoadManager.deserializeOrbitTrails(serializedTrails);
  }

  recreateOrbitTrail(bodyName) {
    return this.saveLoadManager.recreateOrbitTrail(bodyName);
  }

  getTrailColor(bodyName) {
    return this.saveLoadManager.getTrailColor(bodyName);
  }

  // Label Manager delegation methods
  createLabel(text, offsetY, fontSize = 128) {
    return this.labelManager.createLabel(text, offsetY, fontSize);
  }

  registerLabel(mesh, labelData) {
    return this.labelManager.registerLabel(mesh, labelData);
  }

  updateLabelPositions() {
    return this.labelManager.updateLabelPositions();
  }

  updateLabelScales() {
    return this.labelManager.updateLabelScales();
  }

  // Visual Effects delegation methods (no delegation needed - called via visualEffects instance)

  // Checkpoint Manager delegation methods
  createCheckpoints() {
    return this.checkpointManager.createCheckpoints();
  }

  checkCheckpoints(deltaTime) {
    return this.checkpointManager.checkCheckpoints(deltaTime);
  }

  // Trajectory Manager delegation methods
  updateTrajectoryPrediction() {
    return this.trajectoryManager.updateTrajectoryPrediction();
  }

  updateOrbitTrails() {
    return this.trajectoryManager.updateOrbitTrails();
  }

  // Audio Manager delegation methods
  setupAudio() {
    return this.audioManager.setupAudio(this.camera);
  }

  startBackgroundMusic() {
    return this.audioManager.startBackgroundMusic();
  }

  toggleMute() {
    return this.audioManager.toggleMute();
  }

  playEngineSound() {
    return this.audioManager.playEngineSound();
  }

  // Reference Frame Manager delegation methods
  updateReferenceFrame() {
    return this.referenceFrameManager.updateReferenceFrame();
  }

  // ==================== End of Delegation Methods ====================

  /**
   * Initialize saveable components for all game objects
   * This wraps game objects in SaveableComponent instances for save/load functionality
   */

  loadTextures() {
    // Load realistic planet textures
    const textureLoader = new THREE.TextureLoader();
    this.textures = {
      earth: textureLoader.load('textures/2k_earth_daymap.jpg'),
      mars: textureLoader.load('textures/2k_mars.jpg'),
      mercury: textureLoader.load('textures/2k_mercury.jpg'),
      moon: textureLoader.load('textures/2k_moon.jpg'),
      sun: textureLoader.load('textures/2k_sun.jpg'),
      venus: textureLoader.load('textures/2k_venus_surface.jpg'),
      stars: textureLoader.load('textures/8k_stars_milky_way.jpg')
    };
  }

  setupScene() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000510);
    this.scene.fog = new THREE.FogExp2(0x000510, 0.000001); // Much less fog for larger scale

    // Camera - NOT attached to spaceship (scaled for larger distances)
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      500000 // Much farther render distance
    );
    this.scene.add(this.camera);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // 开启阴影
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(this.renderer.domElement);

    // Only ambient lighting is realistic, all other redundant lighting causes overlapping shadows
    // Environment Lighting Setup (for grading rubric)
    // 1. Ambient light (base illumination)
    const ambientLight = new THREE.AmbientLight(0x404060, 1.0);
    this.scene.add(ambientLight);

    /*
    // 2. Directional light from "Sun" direction (key light)
    const sunDirectional = new THREE.DirectionalLight(0xffffff, 0.8);
    sunDirectional.position.set(100, 50, 100);
    this.scene.add(sunDirectional);

    // 3. Rim light (back light for edge highlighting)
    const rimLight = new THREE.DirectionalLight(0x4040ff, 0.3);
    rimLight.position.set(-100, 0, -100);
    this.scene.add(rimLight);
    */

    // Sun point light will be added when Sun is created

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setupPhysics() {
    // Using same physics parameters as simple_test (verified working)
    this.physics = new PhysicsEngine({
      gravityConstant: 1.0, // Scaled gravity constant
      maxSpeed: 10000, // Much higher for realistic orbital speeds
      drag: 1.0, // No drag in space!
      timeScale: 0.1, // Start slow for stability (can increase with sliders)
      subSteps: 200, // Many sub-steps for numerical stability

      // HPOP (High Precision Orbit Propagator) - TESTING INCREMENTALLY
      useHPOP: true,
      spacecraftArea: 10.0,        // Cross-sectional area (m²)
      spacecraftMass: 1000,        // Mass (kg) - will be updated
      dragCoefficient: 2.2,        // Drag coefficient
      reflectivity: 0.3,           // Surface reflectivity (0-1)

      // Enable specific perturbations (TESTING: J2 + Third-Body + Drag)
      enableHarmonics: true,       // J2-J6 gravity harmonics - OK
      enableThirdBody: true,       // Sun/Moon perturbations - OK
      enableDrag: true,            // Atmospheric drag - TESTING
      enableSRP: false             // Solar radiation pressure - DISABLED
    });

    console.log('🚀 Physics Engine initialized with HPOP enabled');
  }

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
    const shipOrbitAroundEarth = 4.22; // Reduced from 25 to 4.22 (apprximate synchronous orbit)
    const spaceshipAngle = Math.PI / 4; // 45 degrees from Earth's +X (like simple_test!)

    // Calculate velocities with PROPER ANGULAR MOMENTUM
    // 1. Earth's velocity around the Sun (tangent to orbit, in +Z direction at angle=0)
    const earthOrbitalSpeed = Math.sqrt((this.G * this.sunMass) / this.AU);
    const earthVelocity = new THREE.Vector3(0, 0, earthOrbitalSpeed);

    // 2. Spaceship position: relative to Earth (matches simple_test formula!)
    // Earth is at angle=0, position (15000, 0, 0)
    const earthPos = new THREE.Vector3(this.AU, 0, 0);
    this.spaceship.position.set(
      earthPos.x + Math.cos(spaceshipAngle) * shipOrbitAroundEarth,
      0,
      earthPos.z + Math.sin(spaceshipAngle) * shipOrbitAroundEarth
    );

    // 3. Ship's velocity relative to Earth (matches simple_test formula!)
    // First cosmic velocity (circular orbit velocity around Earth)
    const shipOrbitVelocity = Math.sqrt((this.G * this.earthMass) / shipOrbitAroundEarth); // appox. value: 1.2512

    // Velocity perpendicular to radius: (-sin(θ), 0, cos(θ)) * speed
    const shipRelativeVelocity = new THREE.Vector3(
      -Math.sin(spaceshipAngle) * shipOrbitVelocity,
      0,
      Math.cos(spaceshipAngle) * shipOrbitVelocity
    );

    // 4. Ship's absolute velocity = Earth's velocity + Ship's velocity relative to Earth
    this.shipVelocity.copy(earthVelocity).add(shipRelativeVelocity);

    console.log('=== INITIAL ORBITAL PARAMETERS ===');
    console.log(`Sun mass: ${this.sunMass}, Earth mass: ${this.earthMass}, G: ${this.G}`);
    console.log(`Mass ratio (Earth/Sun): ${(this.earthMass / this.sunMass).toExponential(2)}`);
    console.log(`Earth position: (${this.AU}, 0, 0)`);
    console.log(`Ship position: (${this.spaceship.position.toArray().map(v => v.toFixed(0)).join(', ')})`);
    console.log(`Distance from Earth: ${shipOrbitAroundEarth} units`);
    console.log(`FIRST COSMIC VELOCITY (circular orbit around Earth): ${this.firstCosmicVelocity.toFixed(3)} units/s`);
    console.log(`Ship velocity relative to Earth: [${shipRelativeVelocity.toArray().map(v => v.toFixed(3)).join(', ')}]`);
    console.log(`Earth orbital velocity: [${earthVelocity.toArray().map(v => v.toFixed(3)).join(', ')}]`);
    console.log(`Ship absolute velocity: [${this.shipVelocity.toArray().map(v => v.toFixed(3)).join(', ')}]`);
    console.log(`Total ship speed: ${this.shipVelocity.length().toFixed(3)}`);

    // Register label for spaceship (using spaceshipRender as the mesh)
    const spaceshipLabel = this.createLabel('SPACESHIP', 3);
    this.registerLabel(this.spaceshipRender, spaceshipLabel);

    // Add both physics anchor and visual root to scene
    this.scene.add(this.spaceship);
    this.scene.add(this.spaceshipRender);

    // Setup physics for spaceship with negligible mass
    const spaceshipMass = this.earthMass * 1e-20; // Tiny mass like in simple_test
    console.log(`Spaceship mass: ${spaceshipMass.toExponential(2)} (${(spaceshipMass / this.earthMass).toExponential(2)}x Earth)`);

    this.physics.setSpacecraft({
      position: this.spaceship.position,
      velocity: this.shipVelocity,
      mass: spaceshipMass,
      rotation: this.spaceship.rotation
    });

    // Initialize smoothed pose with exact pose
    this.spaceshipSmoothPos.copy(this.spaceship.position);
    this.spaceshipSmoothQuat.copy(this.spaceship.quaternion);

    // Initialize camera position
    this.updateCameraPosition();

    // Recompute engine FX anchor after any model changes
    this.flameManager.refreshEngineEffects();
  }


  /**
   * Update camera position - orbits around current lookAt point
   */
  updateCameraPosition() {
    // 如果用户正在手动控制相机（拖拽/平移），不要自动跟随任何目标
    if (!this.cameraManualControl) {
      // 优先跟随显式目标，其次默认跟随飞船
      if (this.cameraFollowTarget && this.cameraFollowTarget.position) {
        this.cameraLookAtPoint.copy(this.cameraFollowTarget.position);
      } else if (this.spaceshipRender) {
        this.cameraLookAtPoint.copy(this.spaceshipRender.position);
      }
    }
    // else: 手动控制时，保持用户设置的 cameraLookAtPoint，不自动更新

    // Ensure camera distance is valid (prevent camera being at lookAt point)
    const safeCameraDistance = Math.max(this.cameraDistance, 10);

    // Calculate camera position using spherical coordinates around lookAt point
    const offset = new THREE.Vector3();
    offset.x = safeCameraDistance * Math.sin(this.cameraPitch) * Math.cos(this.cameraYaw);
    offset.y = safeCameraDistance * Math.cos(this.cameraPitch);
    offset.z = safeCameraDistance * Math.sin(this.cameraPitch) * Math.sin(this.cameraYaw);

    // IMPORTANT: Ensure minimum Y offset to prevent horizontal viewing issues
    // When looking horizontally, camera at y=0 causes rendering problems
    const minYOffset = safeCameraDistance * 0.05; // At least 5% of distance above/below
    if (Math.abs(offset.y) < minYOffset) {
      offset.y = offset.y >= 0 ? minYOffset : -minYOffset;
    }

    // Ensure offset has minimum length to prevent camera at lookAt point
    if (offset.lengthSq() < 1) {
      offset.set(0, 10, 0); // Default: camera above lookAt point
    }

    this.camera.position.copy(this.cameraLookAtPoint).add(offset);
    this.camera.lookAt(this.cameraLookAtPoint);

    // Update camera matrices
    this.camera.updateMatrixWorld();
  }

  /**
   * Update label positions based on 3D world coordinates
   * Converts 3D positions to screen coordinates for fixed-size CSS labels
   */

  /**
   * Update label scales based on distance from camera
   * DEPRECATED: No longer used - labels are now fixed-size CSS elements
   */

  /**
   * Update trajectory prediction - Full N-body simulation into the future
   * Accounts for ALL celestial bodies moving and affecting the spacecraft
   */

  // Helper function to create text labels - Fixed 14px CSS labels


  createCelestialBodies() {
    // Create celestial body factory
    const factory = new CelestialBodyFactory(this);
    
    // Create all celestial bodies using the factory
    const bodies = factory.createAllBodies();
    
    // Store references to bodies (for backward compatibility)
    this.sunBody = bodies.sun;
    this.mercuryBody = bodies.mercury;
    this.venusBody = bodies.venus;
    this.earthBody = bodies.earth;
    this.moonBody = bodies.moon;
    this.marsBody = bodies.mars;
    this.phobosBody = bodies.phobos;
    this.jupiterBody = bodies.jupiter;
    this.halleyBody = bodies.halley;
    
    console.log('✅ All celestial bodies created via CelestialBodyFactory');
  }
  createPlanetWithVelocity(config) {
    // ---------- 1. 创建行星几何体 ----------
    const geometry = new THREE.SphereGeometry(config.radius, 64, 64);

    // ---------- 2. 材质配置和创建 Mesh ----------
    let material;
    let mesh;

    if (config.type === 'star') {
        // 太阳使用 MeshBasicMaterial，不会阻挡光线，因为它不受光照影响
        material = new THREE.MeshBasicMaterial({
            map: config.texture && this.textures?.[config.texture] ? this.textures[config.texture] : null,
            color: config.color || 0xffaa00
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = false;      // 太阳不投射阴影
        mesh.receiveShadow = false;   // 太阳不接收阴影
        mesh.position.copy(config.position);
        mesh.name = config.name || 'The Sun';
        this.scene.add(mesh);  // 添加到场景中，MeshBasicMaterial 不会阻挡光线
    } else {
        // 行星使用 MeshStandardMaterial，需要被光照
        const materialConfig = {
            roughness: 0.9,
            metalness: 0.1
        };
        
        // 如果有纹理就用纹理，否则用颜色
        if (config.texture && this.textures?.[config.texture]) {
            materialConfig.map = this.textures[config.texture];
            materialConfig.emissive = 0x000000; // 行星本身不发光
            materialConfig.emissiveIntensity = 0;
        } else {
            materialConfig.color = config.color;
            // 移除 emissive，让行星完全依赖光照
            materialConfig.emissive = 0x000000;
            materialConfig.emissiveIntensity = 0;
        }
        
        material = new THREE.MeshStandardMaterial(materialConfig);
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = false;      // 行星本身不投射阴影
        mesh.receiveShadow = true;    // 但接收阴影
        mesh.position.copy(config.position);
        mesh.name = config.name || 'Planet';
        this.scene.add(mesh);
    }

    // ---------- 4. 如果是太阳，创建光源 ----------
    if (config.type === 'star') {

        // PointLight 从太阳位置向四面八方发光
        // 设置轻微衰减：distance=50000（覆盖整个太阳系），decay=0.5（轻微衰减）
        const sunPointLight = new THREE.PointLight(0xffffff, 5, 40000, 0.0002); 
        // 参数：color, intensity, distance, decay
        // distance=50000 覆盖整个太阳系，decay=0.5 轻微衰减
        sunPointLight.position.copy(config.position);
        sunPointLight.castShadow = false;
        this.scene.add(sunPointLight);

        // 保存太阳光源引用
        this.sunLight = sunPointLight;
        config.light = sunPointLight;
    }

    // ---------- 5. 添加文本标签 ----------
    // redundant labels
    // this.createTextLabel(config.name, mesh, config.radius);

    // ---------- 6. 添加物理信息 ----------
    // Add to physics with velocity
    const physicsBody = this.physics.addCelestialBody({
      position: config.position,
      velocity: config.velocity || new THREE.Vector3(0, 0, 0),
      mass: config.mass,
      radius: config.radius,
      type: config.type || 'planet',
      mesh: mesh,
      fixed: config.fixed || false
    });

    // ---------- 7. 保存引用 ----------
    this.celestialBodies.push({ mesh, ...config });
    config.mesh = mesh; // Store reference

    // Return physics body reference (includes position, velocity, mass)
    return physicsBody;
  }

  // redundant label creator
  /*
  createTextLabel(text, parentMesh, offsetY) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    // Draw text
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'Bold 48px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(offsetY * 3, offsetY * 0.75, 1);
    sprite.position.set(0, offsetY + 15, 0);

    parentMesh.add(sprite);
  }
  */


  /**
   * Show tutorial completion modal with Hohmann transfer info
   */
  showTutorialCompletionModal(fuelUsed, optimalFuel, efficiency, performanceMsg, performanceColor) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'tutorial-completion-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Courier New', monospace;
    `;

    // Create modal content
    const content = document.createElement('div');
    content.style.cssText = `
      background: #0a0a0a;
      border: 2px solid #00ff00;
      border-radius: 10px;
      padding: 30px;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 0 30px #00ff00;
      color: #00ff00;
    `;

    content.innerHTML = `
      <h1 style="text-align: center; color: #00ffff; font-size: 28px; margin-bottom: 20px; text-shadow: 0 0 10px #00ffff;">
        🎉 TUTORIAL COMPLETED! 🎉
      </h1>

      <p style="text-align: center; font-size: 16px; margin-bottom: 20px;">
        You maintained stable Moon orbit for 50+ seconds!
      </p>

      <div style="border: 1px solid #00ff00; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h2 style="color: #00ffff; text-align: center; margin-bottom: 15px; font-size: 20px;">MISSION PERFORMANCE</h2>

        <div style="text-align: center; font-size: 15px; line-height: 2;">
          <div>Fuel Used: <span style="color: #ff4444; font-weight: bold;">${fuelUsed.toFixed(1)} kg</span></div>
          <div>Optimal (Hohmann): <span style="color: #88ff88; font-weight: bold;">${optimalFuel} kg</span></div>
          <div>Efficiency: <span style="color: #ffaa00; font-weight: bold;">${efficiency.toFixed(1)}%</span></div>
        </div>

        <p style="text-align: center; margin-top: 15px; font-size: 18px; font-weight: bold; color: ${performanceColor};">
          ${performanceMsg}
        </p>
      </div>

      <div style="border: 1px solid #00ff00; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h2 style="color: #00ffff; text-align: center; margin-bottom: 15px; font-size: 20px;">DID YOU KNOW?</h2>

        <p style="font-size: 14px; line-height: 1.8; margin-bottom: 15px;">
          The most fuel-efficient Earth-Moon transfer is the
          <span style="color: #ff4444; font-weight: bold;">HOHMANN TRANSFER ORBIT</span> — a two-burn maneuver:
        </p>

        <div style="font-size: 13px; line-height: 2; margin-left: 20px;">
          <div>1️⃣ <span style="color: #ffaa00;">First burn at Earth periapsis</span></div>
          <div style="margin-left: 25px;">→ Raises your apoapsis to Moon's orbit</div>

          <div style="margin-top: 10px;">2️⃣ <span style="color: #ffaa00;">Coast along elliptical path</span></div>
          <div style="margin-left: 25px;">→ Let gravity do the work (0 fuel!)</div>

          <div style="margin-top: 10px;">3️⃣ <span style="color: #ffaa00;">Second burn at Moon periapsis</span></div>
          <div style="margin-left: 25px;">→ Circularize orbit around Moon</div>
        </div>

        <p style="font-size: 13px; line-height: 1.8; margin-top: 15px;">
          Real spacecraft (Apollo, Artemis) use this technique!
        </p>

        <div style="text-align: center; margin: 20px 0;">
          <img src="assets/holman.png" alt="Walter Hohmann"
               style="max-width: 200px; border: 2px solid #00ff00; border-radius: 8px; box-shadow: 0 0 15px #00ff00;">
          <div style="color: #00ffff; font-size: 12px; margin-top: 8px;">Walter Hohmann (1880-1945)</div>
          <div style="color: #88ff88; font-size: 11px; font-style: italic;">German engineer who pioneered orbital mechanics</div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 25px;">
        <button id="close-modal-btn" style="
          background: #00ff00;
          color: #000;
          border: none;
          padding: 12px 40px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 5px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          box-shadow: 0 0 10px #00ff00;
        ">CONTINUE TO FREE FLIGHT</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close button handler
    const closeBtn = document.getElementById('close-modal-btn');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Allow closing with Enter or Escape
    const handleKeyPress = (e) => {
      if (e.code === 'Enter' || e.code === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleKeyPress);
      }
    };
    document.addEventListener('keydown', handleKeyPress);
  }

  createTrajectoryHints() {
    // Hint 1: Earth to Venus transfer
    const earthToVenus = [];
    const earthAngle = 0;
    const venusAngle = Math.PI * 0.7;
    for (let t = 0; t <= 1; t += 0.02) {
      const angle = earthAngle + (venusAngle - earthAngle) * t;
      const radius = 150 + (120 - 150) * t;
      earthToVenus.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ));
    }

    const hintMaterial1 = new THREE.LineDashedMaterial({
      color: 0x00ffff,
      dashSize: 5,
      gapSize: 3,
      transparent: true,
      opacity: 0.4
    });
    const hintGeometry1 = new THREE.BufferGeometry().setFromPoints(earthToVenus);
    const hintLine1 = new THREE.Line(hintGeometry1, hintMaterial1);
    hintLine1.computeLineDistances();
    this.scene.add(hintLine1);

    // Hint 2: Venus to Mars slingshot arc
    const venusToMars = [];
    for (let t = 0; t <= 1; t += 0.02) {
      const angle = venusAngle + (Math.PI * 0.4 - venusAngle) * t;
      const radius = 120 + (220 - 120) * t;
      venusToMars.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ));
    }

    const hintMaterial2 = new THREE.LineDashedMaterial({
      color: 0xffaa00,
      dashSize: 5,
      gapSize: 3,
      transparent: true,
      opacity: 0.4
    });
    const hintGeometry2 = new THREE.BufferGeometry().setFromPoints(venusToMars);
    const hintLine2 = new THREE.Line(hintGeometry2, hintMaterial2);
    hintLine2.computeLineDistances();
    this.scene.add(hintLine2);

    // Add orbit circles for planets (for reference)
    this.createOrbitCircle(150, 0x4488ff); // Earth orbit
    this.createOrbitCircle(120, 0xffaa66); // Venus orbit
    this.createOrbitCircle(220, 0xff6644); // Mars orbit
  }

  createOrbitCircle(radius, color) {
    const points = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15
    });
    const circle = new THREE.Line(geometry, material);
    this.scene.add(circle);
  }




  startGame() {
    this.gameStarted = true;

    // 播放背景音乐（用户交互后解锁音频上下文）
    this.startBackgroundMusic();

    // 火箭加载完全由 rocket_selector.js 处理
    // rocket_selector.js 会自动预加载并应用默认的 Explorer 火箭
    console.log('🎮 startGame: 等待 rocket_selector.js 加载火箭模型...');

    // Start tutorial if in tutorial mode
    if (this.tutorialMode && this.tutorialManager) {
      this.tutorialManager.startTutorial();
      console.log('🎓 Starting tutorial mode');
    }

    console.log('=== PHYSICS TESTING START ===');
    console.log('Watching orbital mechanics...');
    console.log('All planets and spaceship should maintain stable orbits');
  }

  setupHUD() {
    // Initialize UI Manager (creates all UI elements)
    this.uiManager = new UIManager(this);
  }

  updateHUD() {
    // Delegate to UI Manager
    if (this.uiManager) {
      this.uiManager.updateHUD();
    }
  }

  handleInput(deltaTime) {
    // Skip all handling when paused
    if (this.isPaused) return;

    // Visual/audio feedback for thrust inputs (physics thrust remains disabled)
    const thrustLocal = new THREE.Vector3(0, 0, 0);
    let isThrusting = false;

    if (this.keys['KeyW']) { thrustLocal.z -= 1; isThrusting = true; }
    if (this.keys['KeyS']) { thrustLocal.z += 1; isThrusting = true; }
    if (this.keys['KeyA']) { thrustLocal.x -= 1; isThrusting = true; }
    if (this.keys['KeyD']) { thrustLocal.x += 1; isThrusting = true; }
    if (this.keys['Space']) { thrustLocal.y += 1; isThrusting = true; }
    if (this.keys['KeyV']) { thrustLocal.y -= 1; isThrusting = true; }

    const boostMultiplier = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) ? GameConfig.boostMultiplier : 1.0;

    // Apply real-time thrust if we have fuel
    if (isThrusting && this.fuelMass > 0) {
      thrustLocal.normalize();

      // Convert thrust from camera space to world space
      const thrustWorld = thrustLocal.clone();
      thrustWorld.applyEuler(new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ'));

      // Real-time thrust power (in game units/s per second)
      const thrustPower_game = GameConfig.thrustPowerPerFrame * boostMultiplier;
      const deltaV_game = thrustPower_game * deltaTime;

      // Calculate fuel consumption using Tsiolkovsky equation
      // IMPORTANT: Both deltaV and exhaustVelocity must be in the same units (game units/s)
      const m0 = this.dryMass + this.fuelMass;
      const targetMf = m0 / Math.exp(deltaV_game / this.exhaustVelocity);
      const fuelConsumed = m0 - targetMf;
      this.flameManager.triggerEngineFX(boostMultiplier);
      this.playEngineSound();

      if (fuelConsumed <= this.fuelMass) {
        // Apply thrust
        const thrustVector = thrustWorld.clone().multiplyScalar(deltaV_game);
        this.shipVelocity.add(thrustVector);
        this.physics.spacecraft.velocity.copy(this.shipVelocity);

        // Consume fuel
        this.fuelMass -= fuelConsumed;
        if (this.fuelMass < 0) this.fuelMass = 0;
        this.fuel = (this.fuelMass / this.maxFuelMass) * 100;
        

        // Debug log (less frequent)
        if (Math.random() < 0.01) {
          console.log(`🔥 Real-time thrust: ΔV=${deltaV_game.toFixed(5)} game units/s | Fuel: ${this.fuelMass.toFixed(2)} kg`);
        }
      }

      // Engine glow effect
      const engineGlow = this.spaceship.getObjectByName('engineGlow');
      if (engineGlow) {
        engineGlow.material.opacity = 0.8 * boostMultiplier;
      }
    } else {
      this.flameManager.stopEngineFX();
      // 推力结束时对声音做淡出并停止，防止出现"断点噪音"
      if (this.engineSound && this.engineSound.isPlaying && this.audioListener && this.audioListener.context) {
        const ctx = this.audioListener.context;
        const gainNode = this.engineSound.gain;
        if (gainNode && gainNode.gain) {
          const now = ctx.currentTime;
          const fadeOut = 0.2; // 尾音时间

          gainNode.gain.cancelScheduledValues(now);
          gainNode.gain.linearRampToValueAtTime(0, now + fadeOut);
          this.engineSoundStopTimer = setTimeout(() => {
            if (this.engineSound && this.engineSound.isPlaying) {
              this.engineSound.stop();
            }
            this.engineSoundStopTimer = null;
          }, fadeOut * 1000);
        }
      }
    }

    // Update spaceship rotation to face velocity direction (realistic!)
    // Need to use the velocity relative to the reference object for better visual effects (though not that realistic)
    const shipRelativeVelocity = new THREE.Vector3(0, 0, 0);
    if (this.referenceFrame === 'earth' && this.earthBody) {
      shipRelativeVelocity.copy(this.shipVelocity).sub(this.earthBody.velocity);
    } else if (this.referenceFrame === 'moon' && this.moonBody) {
      shipRelativeVelocity.copy(this.shipVelocity).sub(this.moonBody.velocity);
    } else {
      shipRelativeVelocity.copy(this.shipVelocity);
    }
    if (shipRelativeVelocity.lengthSq() > 1e-4) { // increased the threshold
      const targetDirection = shipRelativeVelocity.clone().normalize();
      const currentDirection = new THREE.Vector3(0, 0, -1);
      currentDirection.applyQuaternion(this.spaceship.quaternion);

      // Smoothly rotate toward velocity direction if no changing of reference frame is applied (small cosine value)
      // Else, directly apply without interpolation smoothing
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
    if (!this.spaceship || !this.spaceshipRender || !this.physics.spacecraft) return;

    // IMPORTANT: spaceshipSmoothPos should be based on physics position (Sun frame),
    // NOT spaceship.position which already includes frameOffset
    const physicsPos = this.physics.spacecraft.position;

    // Check if position jumped suddenly (collision detection)
    // Use velocity-aware threshold: normal movement should be velocity * deltaTime
    // A jump much larger than that indicates collision
    const positionDelta = physicsPos.distanceTo(this.spaceshipSmoothPos);
    const expectedMove = this.shipVelocity.length() * deltaTime * 1.5; // 1.5x safety margin
    const suddenJump = positionDelta > Math.max(2.0, expectedMove); // At least 2.0 units, or 1.5x expected

    // If paused, reference frame changed, or collision occurred, snap position without smoothing
    if (this.isPaused || this.referenceFrameJustChanged || suddenJump) {
      this.spaceshipSmoothPos.copy(physicsPos);
      this.spaceshipSmoothQuat.copy(this.spaceship.quaternion);
      this.referenceFrameJustChanged = false; // Reset flag after using it

      // If collision detected, ensure camera follows spaceship
      // BUT preserve manual control if user is actively controlling camera
      if (suddenJump) {
        // REMOVED: Don't reset camera on collision if user explicitly chose a camera target
        // Users who press number keys to view planets should not have their camera hijacked
        // The old behavior was: reset camera to spaceship on collision
        // New behavior: preserve user's camera choice even during collisions

        this.recentCollisionTime = 1.0; // Lock camera settings for 1 second after collision
        console.log(`⚠️ Collision detected! Position jump: ${positionDelta.toFixed(2)} units, velocity: ${this.shipVelocity.length().toFixed(2)}, expectedMove: ${expectedMove.toFixed(2)} (camera preserved)`);
      }
    } else {
      // Separate smoothing for position vs rotation
      const posStrength = 12.0;   // higher = follow faster (less smoothing)
      const rotStrength = 1.0;    // lower = more smoothing (slower, steadier)
      const alphaPos = 1 - Math.exp(-posStrength * deltaTime * this.physics.timeScale); // Need to use the scaled deltaTime to prevent drifting
      const alphaRot = 1 - Math.exp(-rotStrength * deltaTime * this.physics.timeScale);

      // Position smoothing (faster follow, small latency)
      // Use physics position directly, not spaceship.position (which has frameOffset)
      this.spaceshipSmoothPos.lerp(physicsPos, alphaPos);

      // Rotation smoothing (stronger smoothing to calm angular jitter)
      this.spaceshipSmoothQuat.slerp(this.spaceship.quaternion, alphaRot);
    }

    // Decay recent collision timer
    if (this.recentCollisionTime > 0) {
      this.recentCollisionTime = Math.max(0, this.recentCollisionTime - deltaTime);
    }

    // Apply to render root (frameOffset will be added in updateReferenceFrame)
    // Do NOT add frameOffset here, it will be added in updateReferenceFrame
    this.spaceshipRender.position.copy(this.spaceshipSmoothPos);
    this.spaceshipRender.quaternion.copy(this.spaceshipSmoothQuat);
  }

  updateTrajectory() {
    // Predict and draw trajectory
    const trajectory = this.physics.predictTrajectory(150, 0.15);

    if (trajectory.length > 0) {
      const points = trajectory.map(p => new THREE.Vector3(p.x, p.y, p.z));
      this.trajectoryLine.geometry.setFromPoints(points);
    }
  }


  // Calculate total delta-V budget using Tsiolkovsky equation
  calculateTotalDeltaV() {
    const m0 = this.dryMass + this.maxFuelMass;
    const mf = this.dryMass + this.fuelMass;
    return this.exhaustVelocity * Math.log(m0 / mf);
  }

  // Calculate remaining delta-V budget
  calculateRemainingDeltaV() {
    if (this.fuelMass <= 0) return 0;
    const m0 = this.dryMass + this.fuelMass;
    const mf = this.dryMass;
    return this.exhaustVelocity * Math.log(m0 / mf);
  }


  animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);

    // Update physics for ALL bodies (planets, moons, spacecraft)
    // Only update if not paused
    if (!this.isPaused) {
      this.physics.update(deltaTime);

      // Sync spaceship position and velocity from physics engine
      if (this.physics.spacecraft && this.spaceship) {
        this.spaceship.position.copy(this.physics.spacecraft.position);
        this.shipVelocity.copy(this.physics.spacecraft.velocity);
      }
    }

    // Only run game logic if game has started
    if (this.gameStarted) {
      this.gameTime += deltaTime;

      // Debug spaceship orbit every second
      if (Math.floor(this.gameTime) !== Math.floor(this.gameTime - deltaTime)) {
        this.debugSpaceshipOrbit();
      }

      // Handle input / orientation (skip when paused)
      if (!this.isPaused) {
        this.handleInput(deltaTime);
      }

      // Update trajectory prediction (only when not in pause/prediction mode)
      if (!this.isPaused && !this.showPrediction) {
        if (Math.random() < 0.1) { // 10% chance per frame
          this.updateTrajectory();
        }
      }

      // Check checkpoints
      this.checkCheckpoints(deltaTime);

      // Update HUD
      this.updateHUD();

      // Update tutorial (if active)
      if (this.tutorialManager) {
        this.tutorialManager.update(deltaTime);
      }
    }

    // Smooth visual pose before applying frame offsets
    this.updateSpaceshipSmooth(deltaTime);

    // Apply reference frame offset for visualization BEFORE computing camera/labels,
    // otherwise camera and objects sit in different frames and cause jitter.
    this.updateReferenceFrame();

    // Always update camera position (orbit around ship) after frame transform
    this.updateCameraPosition();

    // Update label positions (convert 3D coordinates to screen coordinates)
    this.updateLabelPositions();

    // Update orbit trails (only every 3 frames for performance)
    this.trailUpdateCounter++;
    if (this.trailUpdateCounter % 3 === 0) {
      this.updateOrbitTrails();
    }

    // 持续更新火焰旋转，使其跟随模型旋转
    this.flameManager.updateFlameRotation();
    
    // 更新3D火焰粒子动画
    this.flameManager.updateFlameParticles(deltaTime);

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  debugSpaceshipOrbit() {
    if (!this.earthBody || !this.earthBody.mesh) return;

    const earthPos = this.earthBody.mesh.position.clone();
    const shipPos = this.spaceship.position.clone();
    const earthToShip = new THREE.Vector3().subVectors(shipPos, earthPos);

    // Get Earth's velocity from physics
    const earthVel = this.earthBody.velocity.clone();

    // Ship velocity relative to Earth
    const relVel = new THREE.Vector3().subVectors(this.shipVelocity, earthVel);

    // Check if velocity is perpendicular to radius
    const dot = earthToShip.normalize().dot(relVel.clone().normalize());

    console.log(`[T+${Math.floor(this.gameTime)}s] Distance: ${earthToShip.length().toFixed(1)}u, RelSpeed: ${relVel.length().toFixed(1)} m/s, Perpendicularity: ${(Math.abs(dot)).toFixed(3)} (0=perfect)`);
  }
}

// Start the game
const __spaceGameInstance = new SpaceGame();
// Expose to window so helper modules (e.g., rocket selector) can attach
window.__spaceGame = __spaceGameInstance;
// Also expose as 'game' for easier console access and save system testing
window.game = __spaceGameInstance;
