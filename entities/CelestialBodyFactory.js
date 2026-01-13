/**
 * CelestialBodyFactory.js
 *
 * Factory class for creating celestial bodies with proper configuration.
 * Replaces the monolithic createCelestialBodies() method with modular,
 * testable functions for each celestial body.
 */

import * as THREE from 'three';
import { PhysicsConstants } from '../config/PhysicsConstants.js';
import {
  CelestialBodies,
  calculateOrbitalPosition,
  calculateOrbitalVelocity
} from '../config/CelestialConfig.js';

/**
 * CelestialBodyFactory - Creates celestial bodies from configuration
 */
export class CelestialBodyFactory {
  /**
   * @param {Object} game - Reference to main game instance for accessing methods
   */
  constructor(game) {
    this.game = game;
  }

  /**
   * Helper function to calculate circular orbital velocity: v = sqrt(GM/r)
   * @param {number} centerMass - Mass of the central body
   * @param {number} orbitRadius - Orbital radius
   * @param {number} angle - Orbital angle in radians
   * @returns {THREE.Vector3} Velocity vector perpendicular to radius
   */
  getOrbitalVelocity(centerMass, orbitRadius, angle) {
    const speed = Math.sqrt((PhysicsConstants.G * centerMass) / orbitRadius);
    // Velocity is perpendicular to radius (tangent to orbit)
    // At angle θ, position is (r*cos(θ), 0, r*sin(θ))
    // Tangent direction is (-sin(θ), 0, cos(θ))
    return new THREE.Vector3(
      -Math.sin(angle) * speed,
      0,
      Math.cos(angle) * speed
    );
  }

  /**
   * Create all celestial bodies and register them with the game
   * @returns {Object} Object containing references to all created bodies
   */
  createAllBodies() {
    const bodies = {};

    // Create bodies in order (some depend on others)
    bodies.sun = this.createSun();
    bodies.mercury = this.createMercury();
    bodies.venus = this.createVenus();
    bodies.earth = this.createEarth();
    bodies.moon = this.createMoon(bodies.earth);
    bodies.mars = this.createMars();
    bodies.phobos = this.createPhobos(bodies.mars);
    bodies.jupiter = this.createJupiter();
    bodies.halley = this.createHalley();

    return bodies;
  }

  /**
   * Create the Sun at the center of the solar system
   * @returns {Object} Sun body object
   */
  createSun() {
    const config = CelestialBodies.sun;

    const sunBody = this.game.createPlanetWithVelocity({
      position: new THREE.Vector3(
        config.position.x,
        config.position.y,
        config.position.z
      ),
      velocity: new THREE.Vector3(
        config.velocity.x,
        config.velocity.y,
        config.velocity.z
      ),
      radius: config.radius,
      color: config.color,
      mass: config.mass,
      type: config.type,
      emissiveIntensity: config.emissiveIntensity,
      name: config.name,
      fixed: config.fixed,
      texture: config.texture
    });

    const sunLabel = this.game.createLabel('SUN', config.labelOffset);
    this.game.registerLabel(sunBody.mesh, sunLabel);

    return sunBody;
  }

  /**
   * Create Mercury orbiting the Sun
   * @returns {Object} Mercury body object
   */
  createMercury() {
    const config = CelestialBodies.mercury;
    const sunMass = PhysicsConstants.sunMass;

    const angle = config.orbitAngle;
    const radius = config.orbitRadius;

    const mercuryBody = this.game.createPlanetWithVelocity({
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ),
      velocity: this.getOrbitalVelocity(sunMass, radius, angle),
      radius: config.radius,
      color: config.color,
      mass: config.mass,
      name: config.name,
      texture: config.texture
    });

    const mercuryLabel = this.game.createLabel('MERCURY', config.labelOffset);
    this.game.registerLabel(mercuryBody.mesh, mercuryLabel);

    return mercuryBody;
  }

  /**
   * Create Venus orbiting the Sun
   * @returns {Object} Venus body object
   */
  createVenus() {
    const config = CelestialBodies.venus;
    const sunMass = PhysicsConstants.sunMass;

    const angle = config.orbitAngle;
    const radius = config.orbitRadius;

    const venusBody = this.game.createPlanetWithVelocity({
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ),
      velocity: this.getOrbitalVelocity(sunMass, radius, angle),
      radius: config.radius,
      color: config.color,
      mass: config.mass,
      name: config.name,
      texture: config.texture
    });

    const venusLabel = this.game.createLabel('VENUS', config.labelOffset);
    this.game.registerLabel(venusBody.mesh, venusLabel);

    return venusBody;
  }

  /**
   * Create Earth orbiting the Sun
   * @returns {Object} Earth body object
   */
  createEarth() {
    const config = CelestialBodies.earth;
    const sunMass = PhysicsConstants.sunMass;

    const angle = config.orbitAngle;
    const radius = config.orbitRadius;

    const earthBody = this.game.createPlanetWithVelocity({
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ),
      velocity: this.getOrbitalVelocity(sunMass, radius, angle),
      radius: config.radius,
      color: config.color,
      mass: config.mass,
      name: config.name,
      texture: config.texture
    });

    const earthLabel = this.game.createLabel('EARTH', config.labelOffset);
    this.game.registerLabel(earthBody.mesh, earthLabel);

    return earthBody;
  }

  /**
   * Create Moon orbiting Earth
   * @param {Object} earthBody - The Earth body that Moon orbits
   * @returns {Object} Moon body object
   */
  createMoon(earthBody) {
    const config = CelestialBodies.moon;
    const earthMass = PhysicsConstants.earthMass;

    const angle = config.orbitAngle;
    const radius = config.orbitRadius;
    const earthPos = earthBody.position;
    const earthVel = earthBody.velocity;

    const moonRelativeVel = this.getOrbitalVelocity(earthMass, radius, angle);

    const moonBody = this.game.createPlanetWithVelocity({
      position: new THREE.Vector3(
        earthPos.x + Math.cos(angle) * radius,
        0,
        earthPos.z + Math.sin(angle) * radius
      ),
      velocity: new THREE.Vector3().addVectors(earthVel, moonRelativeVel),
      radius: config.radius,
      color: config.color,
      mass: config.mass,
      name: config.name,
      texture: config.texture
    });

    const moonLabel = this.game.createLabel('MOON', config.labelOffset);
    this.game.registerLabel(moonBody.mesh, moonLabel);

    return moonBody;
  }

  /**
   * Create Mars orbiting the Sun
   * @returns {Object} Mars body object
   */
  createMars() {
    const config = CelestialBodies.mars;
    const sunMass = PhysicsConstants.sunMass;

    const angle = config.orbitAngle;
    const radius = config.orbitRadius;

    const marsBody = this.game.createPlanetWithVelocity({
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ),
      velocity: this.getOrbitalVelocity(sunMass, radius, angle),
      radius: config.radius,
      color: config.color,
      mass: config.mass,
      name: config.name,
      texture: config.texture
    });

    const marsLabel = this.game.createLabel('MARS', config.labelOffset);
    this.game.registerLabel(marsBody.mesh, marsLabel);

    return marsBody;
  }

  /**
   * Create Phobos orbiting Mars
   * @param {Object} marsBody - The Mars body that Phobos orbits
   * @returns {Object} Phobos body object
   */
  createPhobos(marsBody) {
    const config = CelestialBodies.phobos;
    const marsMass = PhysicsConstants.marsMass * PhysicsConstants.earthMass;

    const angle = config.orbitAngle;
    const radius = config.orbitRadius;
    const marsPos = marsBody.position;
    const marsVel = marsBody.velocity;

    const phobosRelativeVel = this.getOrbitalVelocity(marsMass, radius, angle);

    const phobosBody = this.game.createPlanetWithVelocity({
      position: new THREE.Vector3(
        marsPos.x + Math.cos(angle) * radius,
        0,
        marsPos.z + Math.sin(angle) * radius
      ),
      velocity: new THREE.Vector3().addVectors(marsVel, phobosRelativeVel),
      radius: config.radius,
      color: config.color,
      mass: config.mass,
      name: config.name
    });

    const phobosLabel = this.game.createLabel('PHOBOS', config.labelOffset);
    this.game.registerLabel(phobosBody.mesh, phobosLabel);

    return phobosBody;
  }

  /**
   * Create Jupiter orbiting the Sun
   * @returns {Object} Jupiter body object
   */
  createJupiter() {
    const config = CelestialBodies.jupiter;
    const sunMass = PhysicsConstants.sunMass;

    const angle = config.orbitAngle;
    const radius = config.orbitRadius;

    const jupiterBody = this.game.createPlanetWithVelocity({
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ),
      velocity: this.getOrbitalVelocity(sunMass, radius, angle),
      radius: config.radius,
      color: config.color,
      mass: config.mass,
      name: config.name
    });

    const jupiterLabel = this.game.createLabel('JUPITER', config.labelOffset);
    this.game.registerLabel(jupiterBody.mesh, jupiterLabel);

    return jupiterBody;
  }

  /**
   * Create Halley's Comet with elliptical orbit
   * @returns {Object} Halley's Comet body object
   */
  createHalley() {
    const config = CelestialBodies.halley;
    const sunMass = PhysicsConstants.sunMass;

    // Calculate position at perihelion with inclination
    const r = config.perihelion;
    const theta = config.initialAngle;
    const incl = config.inclination;

    const position = new THREE.Vector3(
      r * Math.cos(incl) * Math.sin(theta),
      r * Math.sin(incl),
      r * Math.cos(incl) * Math.cos(theta)
    );

    // Calculate velocity at perihelion (using vis-viva equation)
    const v = Math.sqrt(
      PhysicsConstants.G * sunMass * (1 + config.eccentricity) / config.perihelion
    );

    const velocity = new THREE.Vector3(
      v * Math.cos(theta),
      0,
      -v * Math.sin(theta)
    );

    const halleyBody = this.game.createPlanetWithVelocity({
      position: position,
      velocity: velocity,
      mass: config.mass,
      type: config.type,
      name: config.name,
      color: config.color,
      radius: config.radius
    });

    const halleyLabel = this.game.createLabel('HALLEY\'S COMET', config.labelOffset);
    this.game.registerLabel(halleyBody.mesh, halleyLabel);

    return halleyBody;
  }
}
