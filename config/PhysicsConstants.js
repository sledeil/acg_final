/**
 * PhysicsConstants.js
 *
 * Contains all physics-related constants used in the simulation.
 * Centralizing these values makes it easy to tune the physics model
 * without searching through the codebase.
 */

export const PhysicsConstants = {
  // ========== Fundamental Constants ==========

  /** Scaled gravitational constant (dimensionless in our units) */
  G: 1.0,

  // ========== Celestial Body Masses ==========
  // All masses relative to Earth mass = 1.0

  /** Sun mass (real Sun:Earth mass ratio ≈ 333,000) */
  sunMass: 333000,

  /** Earth mass (reference unit) */
  earthMass: 1.0,

  /** Moon mass (real Moon:Earth ratio ≈ 0.0123) */
  moonMass: 0.0123,

  /** Mercury mass (relative to Earth) */
  mercuryMass: 0.055,

  /** Venus mass (relative to Earth) */
  venusMass: 0.815,

  /** Mars mass (relative to Earth) */
  marsMass: 0.107,

  /** Phobos mass (very small, Mars moon) */
  phobosMass: 1.0659e-9,

  /** Jupiter mass (relative to Earth) */
  jupiterMass: 317.8,

  // ========== Distance Units ==========

  /**
   * Astronomical Unit (AU) in game units
   * Real: 1 AU = 149,597,871 km
   * Game: 1 AU = 15,000 units (scaled for gameplay)
   */
  AU: 15000,

  /**
   * Earth radius in game units
   * Calculated from real radius: 6,371 km * (AU_game / AU_real)
   */
  earthRadius: 6371 * 15000 / 149597871, // ≈ 0.638 units

  // ========== Orbital Parameters ==========

  /** Earth's orbital radius around Sun (1 AU) */
  earthOrbitRadius: 15000,

  /** Moon's orbital radius around Earth (real: ~384,400 km) */
  moonOrbitRadius: 40, // Scaled for gameplay

  /** Mercury's orbital radius (real: 0.39 AU) */
  mercuryOrbitRadius: 5850,

  /** Venus's orbital radius (real: 0.72 AU) */
  venusOrbitRadius: 10800,

  /** Mars's orbital radius (real: 1.52 AU) */
  marsOrbitRadius: 22800,

  /** Jupiter's orbital radius (real: 5.2 AU) */
  jupiterOrbitRadius: 78000,

  // ========== Derived Physics Values ==========

  /**
   * First cosmic velocity (low Earth orbit velocity)
   * v = sqrt(G * M / r)
   * Calculated dynamically based on G, earthMass, earthRadius
   */
  get firstCosmicVelocity() {
    return Math.sqrt(this.G * this.earthMass / this.earthRadius);
  },

  // ========== Simulation Parameters ==========

  /** Default physics time scale (simulation speed multiplier) */
  defaultTimeScale: 0.1,

  /** Default physics substeps per frame (for stability) */
  defaultSubsteps: 200,

  /** Spacecraft mass (negligible compared to planets) */
  spacecraftMass: 1e-20, // Effectively massless for n-body simulation
};

/**
 * Calculate circular orbital velocity for a given mass and radius
 * @param {number} centerMass - Mass of the central body
 * @param {number} orbitRadius - Orbital radius
 * @returns {number} Orbital velocity
 */
export function calculateOrbitalVelocity(centerMass, orbitRadius) {
  return Math.sqrt((PhysicsConstants.G * centerMass) / orbitRadius);
}

/**
 * Calculate gravitational acceleration at distance r from mass M
 * @param {number} mass - Mass of the attracting body
 * @param {number} distance - Distance from the body
 * @returns {number} Gravitational acceleration magnitude
 */
export function calculateGravitationalAcceleration(mass, distance) {
  if (distance < 0.1) distance = 0.1; // Prevent singularity
  return (PhysicsConstants.G * mass) / (distance * distance);
}
