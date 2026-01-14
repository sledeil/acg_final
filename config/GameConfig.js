/**
 * GameConfig.js
 *
 * Contains game-specific configuration values like fuel, thrust,
 * camera settings, and gameplay parameters.
 */

import { PhysicsConstants } from './PhysicsConstants.js';

export const GameConfig = {
  // ========== Spacecraft Configuration ==========

  /**
   * Dry mass of spacecraft (kg)
   * Mass without fuel - represents the structural mass
   */
  dryMass: 50,

  /**
   * Maximum fuel capacity (kg)
   */
  maxFuelMass: 100,

  /**
   * Initial fuel mass (kg)
   * Should be <= maxFuelMass
   */
  initialFuelMass: 100,

  /**
   * Exhaust velocity (game units/s)
   * Based on first cosmic velocity: v₁ * (4.16 / 7.91)
   * Real value: 4.16 km/s (Saturn V)
   */
  get exhaustVelocity() {
    return PhysicsConstants.firstCosmicVelocity * 4.16 / 7.91;
  },

  /**
   * Mass flow rate (kg/s)
   * Fuel consumption rate when thrusting
   */
  massFlowRate: 1.0,

  // ========== Legacy Fuel System (Percentage-based) ==========
  // TODO: These can be removed once all code uses the Tsiolkovsky equation

  /**
   * Legacy: Initial fuel percentage
   */
  initialFuel: 100,

  /**
   * Legacy: Maximum fuel percentage
   */
  maxFuel: 100,

  /**
   * Legacy: Fuel consumption rate (per second while thrusting)
   */
  fuelConsumptionRate: 3,

  /**
   * Legacy: Thrust power (acceleration)
   * Subtle thrust for realistic physics (velocities are ~5 units/s)
   */
  thrustPower: 0.5,

  // ========== Real-time Thrust Parameters ==========

  /**
   * Thrust power per frame (game units/s per second)
   * Used in updateSpaceship() for real-time control
   */
  thrustPowerPerFrame: 0.01,

  /**
   * Boost multiplier when holding Shift
   * Provides 2.5x thrust but consumes more fuel
   */
  boostMultiplier: 2.5,

  // ========== Camera Configuration ==========

  /**
   * Initial camera distance from target
   */
  initialCameraDistance: 200,

  /**
   * Minimum camera distance (prevents too close zoom)
   */
  minCameraDistance: 5,

  /**
   * Maximum camera distance (prevents too far zoom)
   */
  maxCameraDistance: 50000,

  /**
   * Initial camera pitch (angle above horizon)
   * Math.PI / 4 = 45 degrees
   */
  initialCameraPitch: Math.PI / 4,

  /**
   * Initial camera yaw (horizontal rotation)
   */
  initialCameraYaw: 0,

  /**
   * Maximum camera pitch (prevents gimbal lock)
   * 0.44π ≈ 80 degrees
   */
  maxCameraPitch: Math.PI * 0.44,

  // ========== Trajectory Prediction ==========

  /**
   * Number of prediction steps
   * Higher = more accurate but slower
   */
  predictionSteps: 10000,

  /**
   * Time step for each prediction step (seconds)
   */
  predictionStepSize: 0.05,

  /**
   * Get total prediction time (seconds)
   */
  get predictionTime() {
    return this.predictionSteps * this.predictionStepSize;
  },

  // ========== Velocity Adjustment ==========

  /**
   * Default ΔV magnitude multiplier
   * Used when adjusting velocity with arrow keys
   */
  deltaVMagnitude: 0.05,

  /**
   * Base velocity change per key press (game units/s)
   */
  velocityAdjustmentBase: 0.5,

  // ========== Scoring & Missions ==========

  /**
   * Initial player score
   */
  initialScore: 0,

  /**
   * Optimal fuel usage for Hohmann transfer to Moon (kg)
   * Used for efficiency calculation
   */
  optimalHohmannFuel: 48,

  /**
   * Fuel bonus for reaching checkpoint (kg)
   */
  checkpointFuelBonus: 50,

  // ========== Mission Configuration ==========

  /**
   * Mission 1: Moon (Hohmann Transfer Tutorial)
   */
  mission1: {
    name: 'The Earth–Moon Gateway',
    fuelCapacity: 100,  // kg - basic mission
    optimalFuel: 48,    // kg - Hohmann transfer
  },

  /**
   * Mission 2: Mars (Gravity Assist)
   */
  mission2: {
    name: 'The Martian Slingshot',
    fuelCapacity: 300,  // kg - requires gravity assist via Moon
    optimalFuel: 180,   // kg - with efficient slingshot
  },

  /**
   * Mission 3: Halley (Comet Rendezvous)
   */
  mission3: {
    name: 'The Comet Chaser',
    fuelCapacity: 500,  // kg - extreme challenge
    optimalFuel: 350,   // kg - multi-body assists
  },

  // ========== Orbit Requirements ==========

  /**
   * Moon orbit requirements
   */
  moonOrbit: {
    /** Minimum altitude (game units) */
    minAltitude: 0.5,
    /** Maximum altitude (game units) */
    maxAltitude: 2.0,
    /** Required time in orbit (seconds) */
    requiredTime: 50,
  },

  /**
   * Mars orbit requirements
   */
  marsOrbit: {
    /** Minimum altitude (game units) */
    minAltitude: 1.5,
    /** Maximum altitude (game units) */
    maxAltitude: 4.0,
    /** Required time in orbit (seconds) */
    requiredTime: 60,
  },

  /**
   * Halley orbit requirements
   */
  halleyOrbit: {
    /** Minimum approach distance (game units) */
    minApproach: 0.3,
    /** Maximum approach distance (game units) */
    maxApproach: 1.5,
    /** Required time near comet (seconds) */
    requiredTime: 30,
  },

  // ========== Audio Configuration ==========

  /**
   * Background music volume (0.0 to 1.0)
   */
  musicVolume: 0.3,

  /**
   * Engine sound volume (0.0 to 1.0)
   */
  engineSoundVolume: 0.2,

  /**
   * Engine sound fade out duration (seconds)
   */
  engineSoundFadeOut: 0.5,

  // ========== Debug & Testing ==========

  /**
   * Enable debug console logs
   */
  debugMode: false,

  /**
   * Show physics debug info in console
   */
  debugPhysics: false,
};

/**
 * Calculate fuel efficiency compared to optimal Hohmann transfer
 * @param {number} fuelUsed - Fuel consumed (kg)
 * @returns {number} Efficiency percentage
 */
export function calculateFuelEfficiency(fuelUsed) {
  return (GameConfig.optimalHohmannFuel / fuelUsed) * 100;
}

/**
 * Calculate remaining ΔV budget based on current fuel
 * @param {number} currentFuelMass - Current fuel mass (kg)
 * @returns {number} Remaining ΔV (game units/s)
 */
export function calculateRemainingDeltaV(currentFuelMass) {
  const m0 = GameConfig.dryMass + currentFuelMass;
  const mf = GameConfig.dryMass;
  return GameConfig.exhaustVelocity * Math.log(m0 / mf);
}

/**
 * Calculate total ΔV budget with full fuel tank
 * @returns {number} Total ΔV (game units/s)
 */
export function calculateTotalDeltaV() {
  const m0 = GameConfig.dryMass + GameConfig.maxFuelMass;
  const mf = GameConfig.dryMass;
  return GameConfig.exhaustVelocity * Math.log(m0 / mf);
}
