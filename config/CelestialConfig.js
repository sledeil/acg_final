/**
 * CelestialConfig.js
 *
 * Contains configuration for all celestial bodies in the simulation.
 * Each body has visual properties (radius, color, texture) and
 * physical properties (mass, initial position, velocity, orbital parameters).
 */

import { PhysicsConstants } from './PhysicsConstants.js';

/**
 * Celestial body type definitions
 */
export const CelestialType = {
  STAR: 'star',
  PLANET: 'planet',
  MOON: 'moon',
  COMET: 'comet',
  BLACK_HOLE: 'blackhole',
};

/**
 * Configuration for all celestial bodies
 */
export const CelestialBodies = {
  // ========== THE SUN ==========
  sun: {
    name: 'The Sun',
    type: CelestialType.STAR,

    // Visual properties
    radius: 100,
    color: 0xffff00,
    emissiveIntensity: 3.0,
    texture: 'sun',

    // Physical properties
    mass: PhysicsConstants.sunMass,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    fixed: true, // Sun doesn't move

    // Label
    labelOffset: 150,
  },

  // ========== MERCURY ==========
  mercury: {
    name: 'Mercury',
    type: CelestialType.PLANET,

    // Visual properties
    radius: 0.8, // Mercury radius ≈ 0.38 Earth, scaled for visibility
    color: 0xaaaaaa,
    texture: 'mercury',

    // Physical properties
    mass: PhysicsConstants.mercuryMass * PhysicsConstants.earthMass,

    // Orbital parameters
    orbitRadius: PhysicsConstants.mercuryOrbitRadius,
    orbitAngle: 0, // Starting angle (radians)
    orbitCenter: 'sun', // Orbits around the sun

    // Label
    labelOffset: 5,
  },

  // ========== VENUS ==========
  venus: {
    name: 'Venus',
    type: CelestialType.PLANET,

    // Visual properties
    radius: 1.9, // Venus ≈ 0.95 Earth, almost same size
    color: 0xffaa66,
    texture: 'venus',

    // Physical properties
    mass: PhysicsConstants.venusMass * PhysicsConstants.earthMass,

    // Orbital parameters
    orbitRadius: PhysicsConstants.venusOrbitRadius,
    orbitAngle: Math.PI * 0.7,
    orbitCenter: 'sun',

    // Label
    labelOffset: 8,

    // Gameplay notes
    note: 'Critical slingshot planet!',
  },

  // ========== EARTH ==========
  earth: {
    name: 'Earth',
    type: CelestialType.PLANET,

    // Visual properties
    radius: 2, // Reduced from 15 for better spaceship orbit stability
    color: 0x4488ff,
    texture: 'earth',

    // Physical properties
    mass: PhysicsConstants.earthMass,

    // Orbital parameters
    orbitRadius: PhysicsConstants.earthOrbitRadius,
    orbitAngle: 0,
    orbitCenter: 'sun',

    // Label
    labelOffset: 10,

    // Gameplay notes
    note: 'Spaceship starting location',
  },

  // ========== MOON ==========
  moon: {
    name: 'Moon',
    type: CelestialType.MOON,

    // Visual properties
    radius: 0.5, // Reduced from 4 (Moon/Earth ratio ≈ 0.27)
    color: 0xcccccc,
    texture: 'moon',

    // Physical properties
    mass: PhysicsConstants.moonMass * PhysicsConstants.earthMass,

    // Orbital parameters
    orbitRadius: PhysicsConstants.moonOrbitRadius,
    orbitAngle: Math.PI / 4,
    orbitCenter: 'earth', // Orbits around Earth

    // Label
    labelOffset: 3,

    // Gameplay notes
    note: 'First mission target',
  },

  // ========== MARS ==========
  mars: {
    name: 'Mars',
    type: CelestialType.PLANET,

    // Visual properties
    radius: 1.1, // Mars radius ≈ 0.53 Earth
    color: 0xff6644,
    texture: 'mars',

    // Physical properties
    mass: PhysicsConstants.marsMass * PhysicsConstants.earthMass,

    // Orbital parameters
    orbitRadius: PhysicsConstants.marsOrbitRadius,
    orbitAngle: Math.PI * 0.4,
    orbitCenter: 'sun',

    // Label
    labelOffset: 6,

    // Gameplay notes
    note: 'Second mission target',
  },

  // ========== PHOBOS (Mars Moon) ==========
  phobos: {
    name: 'Phobos',
    type: CelestialType.MOON,

    // Visual properties
    radius: 0.2, // Tiny moon (Phobos is only 11km radius)
    color: 0xaa8866,

    // Physical properties
    mass: PhysicsConstants.phobosMass * PhysicsConstants.earthMass,

    // Orbital parameters
    orbitRadius: 0.9401, // Very close to Mars
    orbitAngle: 0,
    orbitCenter: 'mars', // Orbits around Mars

    // Label
    labelOffset: 2,
  },

  // ========== JUPITER ==========
  jupiter: {
    name: 'Jupiter',
    type: CelestialType.PLANET,

    // Visual properties
    radius: 22, // Jupiter radius ≈ 11 Earth radii
    color: 0xccaa88,

    // Physical properties
    mass: PhysicsConstants.jupiterMass * PhysicsConstants.earthMass,

    // Orbital parameters
    orbitRadius: PhysicsConstants.jupiterOrbitRadius,
    orbitAngle: Math.PI * 1.5,
    orbitCenter: 'sun',

    // Label
    labelOffset: 40,

    // Gameplay notes
    note: 'Massive outer planet for advanced slingshots',
  },

  // ========== HALLEY'S COMET ==========
  halley: {
    name: 'Halley\'s Comet',
    type: CelestialType.COMET,

    // Visual properties
    radius: 1, // True radius ~11 km, Earth radius 6371 km
    color: 0x999999,

    // Physical properties
    // True mass: 2.2e14 kg, Earth mass: 5.972e24 kg
    mass: 3.68e-11 * PhysicsConstants.earthMass,

    // Orbital parameters (elliptical orbit)
    eccentricity: 0.96658, // Very elliptical
    perihelion: 0.59278 * PhysicsConstants.AU, // Closest approach to sun
    inclination: Math.PI * 161.96 / 180.0, // Orbital inclination (radians)
    argumentOfPeriapsis: Math.PI * 112.05 / 180.0, // Seems redundant but kept for reference
    initialAngle: Math.PI * 0.66, // Arbitrary starting position
    orbitCenter: 'sun',

    // Label
    labelOffset: 3,

    // Note
    note: 'Elliptical orbit with high eccentricity',
  },

  // ========== BLACK HOLE (DISABLED) ==========
  // Kept for reference, can be enabled for special scenarios
  blackhole: {
    name: 'Black Hole',
    type: CelestialType.BLACK_HOLE,
    enabled: false, // Disabled by default

    // Visual properties
    radius: 25,
    color: 0x000000,
    emissiveIntensity: 0,
    glowRadius: 35,
    glowColor: 0x8800ff,
    glowOpacity: 0.3,

    // Physical properties
    mass: PhysicsConstants.sunMass * 1.5,
    position: { x: 50000, y: -10000, z: -60000 },
    velocity: { x: 0, y: 0, z: 0 },
    fixed: true,

    // Label
    labelOffset: 50,

    // Note
    note: 'Extreme gravity, enabled for advanced scenarios',
  },
};

/**
 * Get celestial body configuration by name
 * @param {string} name - Name of celestial body (sun, earth, moon, etc.)
 * @returns {Object} Configuration object
 */
export function getCelestialBody(name) {
  return CelestialBodies[name.toLowerCase()];
}

/**
 * Get all enabled celestial bodies
 * @returns {Array} Array of enabled celestial body configs
 */
export function getEnabledBodies() {
  return Object.entries(CelestialBodies)
    .filter(([name, config]) => config.enabled !== false)
    .map(([name, config]) => ({ key: name, ...config }));
}

/**
 * Calculate initial position for orbiting body
 * @param {Object} config - Celestial body config
 * @param {Object} centerPos - Position of orbital center {x, y, z}
 * @returns {Object} Position {x, y, z}
 */
export function calculateOrbitalPosition(config, centerPos = { x: 0, y: 0, z: 0 }) {
  // For Halley's Comet (elliptical orbit with inclination)
  if (config.inclination !== undefined) {
    const r = config.perihelion;
    const theta = config.initialAngle;
    const incl = config.inclination;

    return {
      x: centerPos.x + r * Math.cos(incl) * Math.sin(theta),
      y: centerPos.y + r * Math.sin(incl),
      z: centerPos.z + r * Math.cos(incl) * Math.cos(theta),
    };
  }

  // For regular circular orbits
  const r = config.orbitRadius;
  const theta = config.orbitAngle;

  return {
    x: centerPos.x + Math.cos(theta) * r,
    y: centerPos.y,
    z: centerPos.z + Math.sin(theta) * r,
  };
}

/**
 * Calculate initial velocity for orbiting body
 * @param {Object} config - Celestial body config
 * @param {number} centerMass - Mass of the body being orbited
 * @param {Object} centerVel - Velocity of orbital center {x, y, z}
 * @returns {Object} Velocity {x, y, z}
 */
export function calculateOrbitalVelocity(config, centerMass, centerVel = { x: 0, y: 0, z: 0 }) {
  // For Halley's Comet (at perihelion)
  if (config.eccentricity !== undefined) {
    const v = Math.sqrt(
      PhysicsConstants.G * centerMass * (1 + config.eccentricity) / config.perihelion
    );
    const theta = config.initialAngle;

    return {
      x: centerVel.x + v * Math.cos(theta),
      y: centerVel.y,
      z: centerVel.z - v * Math.sin(theta),
    };
  }

  // For regular circular orbits
  const r = config.orbitRadius;
  const theta = config.orbitAngle;
  const speed = Math.sqrt((PhysicsConstants.G * centerMass) / r);

  // Velocity is perpendicular to radius (tangent to orbit)
  return {
    x: centerVel.x - Math.sin(theta) * speed,
    y: centerVel.y,
    z: centerVel.z + Math.cos(theta) * speed,
  };
}
