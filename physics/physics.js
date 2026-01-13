import * as THREE from 'three';

/**
 * Physics Engine for Space Navigation Game
 * Implements Newtonian mechanics with gravitational forces
 */

export class PhysicsEngine {
  constructor(config = {}) {
    // Physics constants - matching simple_test working values
    this.G = config.gravityConstant || 1.0; // Universal gravity constant (scaled)
    this.timeScale = config.timeScale || 0.1; // Time scaling factor
    this.maxSpeed = config.maxSpeed || 10000; // Maximum velocity magnitude (much higher for realistic orbits)
    this.drag = config.drag || 1.0; // No drag in space!
    this.subSteps = config.subSteps || 200; // Number of sub-steps per update for stability

    // Collections - ALL bodies are simulated dynamically
    this.celestialBodies = []; // ALL objects: planets, stars, moons, spacecraft
    this.spacecraft = null; // Reference to spacecraft body

    // HPOP (High Precision Orbit Propagator) Configuration
    this.useHPOP = config.useHPOP || false; // Enable/disable high-precision perturbations
    this.hpopConfig = {
      // Spacecraft physical properties
      area: config.spacecraftArea || 10.0, // Cross-sectional area (m²)
      mass: config.spacecraftMass || 1000, // Mass (kg) - will be updated when spacecraft is set
      Cd: config.dragCoefficient || 2.2, // Drag coefficient (dimensionless)
      reflectivity: config.reflectivity || 0.3, // Surface reflectivity (0=black, 1=mirror)

      // Enable/disable individual perturbations
      enableHarmonics: config.enableHarmonics !== false, // J2-J6 gravity harmonics
      enableThirdBody: config.enableThirdBody !== false, // Sun/Moon perturbations
      enableDrag: config.enableDrag !== false, // Atmospheric drag
      enableSRP: config.enableSRP !== false, // Solar radiation pressure

      // Reference bodies (will be set later)
      earth: null,
      sun: null,
      moon: null
    };

    console.log(`Physics Engine initialized - HPOP: ${this.useHPOP ? 'ENABLED' : 'DISABLED'}`);
    if (this.useHPOP) {
      console.log('  ✓ J2-J6 Gravity Harmonics: ' + (this.hpopConfig.enableHarmonics ? 'ON' : 'OFF'));
      console.log('  ✓ Third-Body Perturbations: ' + (this.hpopConfig.enableThirdBody ? 'ON' : 'OFF'));
      console.log('  ✓ Atmospheric Drag: ' + (this.hpopConfig.enableDrag ? 'ON' : 'OFF'));
      console.log('  ✓ Solar Radiation Pressure: ' + (this.hpopConfig.enableSRP ? 'ON' : 'OFF'));
    }
  }

  /**
   * Add a celestial body to the physics simulation
   * @param {Object} body - {position: Vector3, velocity: Vector3, mass: number, radius: number, type: string, fixed: boolean}
   */
  addCelestialBody(body) {
    const newBody = {
      position: body.position.clone(),
      velocity: body.velocity ? body.velocity.clone() : new THREE.Vector3(0, 0, 0),
      mass: body.mass,
      radius: body.radius,
      type: body.type || 'planet', // planet, star, blackhole, moon, spacecraft
      mesh: body.mesh,
      fixed: body.fixed || false, // If true, position doesn't update (for stars)
      acceleration: new THREE.Vector3(0, 0, 0) // Current frame acceleration
    };
    this.celestialBodies.push(newBody);
    return newBody;
  }

  /**
   * Set the spacecraft for physics calculations
   * @param {Object} craft - {position: Vector3, velocity: Vector3, mass: number}
   */
  setSpacecraft(craft) {
    // Add spacecraft as a celestial body that can be affected by gravity
    this.spacecraft = this.addCelestialBody({
      position: craft.position,
      velocity: craft.velocity,
      mass: craft.mass || 1,
      radius: 0.4, // Small radius for collision (scaled down from 2)
      type: 'spacecraft',
      mesh: null,
      fixed: false
    });
    this.spacecraft.rotation = craft.rotation;
  }

  /**
   * Set time scale for simulation speed
   * @param {number} scale - Time multiplier (e.g., 10 = 10x faster)
   */
  setTimeScale(scale) {
    this.timeScale = scale;
  }

  /**
   * Set reference bodies for HPOP calculations
   * @param {Object} bodies - {earth, sun, moon}
   */
  setHPOPReferences(bodies) {
    if (this.useHPOP) {
      this.hpopConfig.earth = bodies.earth || null;
      this.hpopConfig.sun = bodies.sun || null;
      this.hpopConfig.moon = bodies.moon || null;
      console.log('HPOP reference bodies set:', {
        earth: !!this.hpopConfig.earth,
        sun: !!this.hpopConfig.sun,
        moon: !!this.hpopConfig.moon
      });
    }
  }

  /**
   * Enable/disable HPOP mode at runtime
   * @param {boolean} enabled - Enable HPOP
   */
  setHPOPEnabled(enabled) {
    this.useHPOP = enabled;
    console.log(`HPOP mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Calculate gravitational forces between ALL bodies (N-body simulation)
   * F = G * (m1 * m2) / r²
   * Updates acceleration for each body
   */
  calculateGravitationalForces() {
    // Reset all accelerations
    for (const body of this.celestialBodies) {
      body.acceleration.set(0, 0, 0);
    }

    // Calculate pairwise forces (N-body problem)
    for (let i = 0; i < this.celestialBodies.length; i++) {
      const body1 = this.celestialBodies[i];

      // Skip fixed bodies (they don't move)
      if (body1.fixed) continue;

      for (let j = 0; j < this.celestialBodies.length; j++) {
        if (i === j) continue; // Don't calculate force on self

        const body2 = this.celestialBodies[j];

        // Direction vector from body1 to body2
        const direction = new THREE.Vector3()
          .subVectors(body2.position, body1.position);

        const distanceSquared = direction.lengthSq();
        const distance = Math.sqrt(distanceSquared);

        // Prevent singularity at very close distances
        const minDistance = Math.max(body1.radius + body2.radius, 1.0);
        const effectiveDistance = Math.max(distance, minDistance);
        const effectiveDistanceSquared = effectiveDistance * effectiveDistance;

        // Calculate acceleration magnitude: a = G * M / r²
        // For body1 being affected by body2's gravity
        const accelerationMagnitude = (this.G * body2.mass) / effectiveDistanceSquared;

        // Apply direction
        direction.normalize();
        const acceleration = direction.clone().multiplyScalar(accelerationMagnitude);

        body1.acceleration.add(acceleration);
      }
    }
  }

  /**
   * Calculate HPOP perturbations for spacecraft
   * Adds high-fidelity perturbation accelerations to spacecraft
   */
  calculateHPOPPerturbations() {
    if (!this.useHPOP || !this.spacecraft) return;

    const cfg = this.hpopConfig;
    let totalPerturbation = new THREE.Vector3(0, 0, 0);

    // 1. J2-J6 Gravity Harmonics (Earth's non-spherical gravity)
    if (cfg.enableHarmonics && cfg.earth) {
      const r_earth_sc = this.spacecraft.position.clone().sub(cfg.earth.position);
      const harmonicAccel = GravityHarmonics.calculateHarmonicAcceleration(
        r_earth_sc,
        cfg.earth.radius,
        cfg.earth.mass,
        this.G
      );
      totalPerturbation.add(harmonicAccel);
    }

    // 2. Third-Body Perturbations (Sun and Moon)
    if (cfg.enableThirdBody && cfg.earth) {
      // Sun perturbation
      if (cfg.sun) {
        const sunPerturb = ThirdBodyPerturbation.calculatePerturbation(
          this.spacecraft,
          cfg.sun,
          cfg.earth,
          this.G
        );
        totalPerturbation.add(sunPerturb);
      }

      // Moon perturbation
      if (cfg.moon) {
        const moonPerturb = ThirdBodyPerturbation.calculatePerturbation(
          this.spacecraft,
          cfg.moon,
          cfg.earth,
          this.G
        );
        totalPerturbation.add(moonPerturb);
      }
    }

    // 3. Atmospheric Drag
    if (cfg.enableDrag && cfg.earth) {
      const dragAccel = AtmosphericDrag.calculateDrag(
        this.spacecraft.position,
        this.spacecraft.velocity,
        cfg.earth,
        cfg.area,
        this.spacecraft.mass,
        cfg.Cd
      );
      totalPerturbation.add(dragAccel);
    }

    // 4. Solar Radiation Pressure
    if (cfg.enableSRP && cfg.sun) {
      const srpAccel = SolarRadiationPressure.calculateSRP(
        this.spacecraft.position,
        cfg.sun,
        cfg.earth,
        cfg.area,
        this.spacecraft.mass,
        cfg.reflectivity
      );
      totalPerturbation.add(srpAccel);
    }

    // Add HPOP perturbations to spacecraft acceleration
    this.spacecraft.acceleration.add(totalPerturbation);
  }

  /**
   * Apply thrust force from spacecraft engines
   * @param {THREE.Vector3} thrustDirection - Direction of thrust in world space
   * @param {number} thrustPower - Magnitude of thrust
   */
  applyThrust(thrustDirection, thrustPower) {
    if (!this.spacecraft || thrustPower <= 0) return;

    const acceleration = thrustDirection.clone()
      .normalize()
      .multiplyScalar(thrustPower);

    this.spacecraft.velocity.add(acceleration);
  }

  /**
   * Check collision with celestial bodies
   * Returns {collided: boolean, body: Object|null, penetration: number}
   */
  checkCollisions() {
    if (!this.spacecraft) return { collided: false, body: null, penetration: 0 };

    for (const body of this.celestialBodies) {
      const distance = this.spacecraft.position.distanceTo(body.position);
      const collisionDistance = body.radius + this.spacecraft.radius; // Use actual spacecraft radius

      if (distance < collisionDistance) {
        return {
          collided: true,
          body: body,
          penetration: collisionDistance - distance
        };
      }
    }

    return { collided: false, body: null, penetration: 0 };
  }

  /**
   * Handle collision response (elastic bounce)
   */
  resolveCollision(collision) {
    if (!collision.collided || !this.spacecraft) return;

    const body = collision.body;

    // Push spacecraft out of the planet
    const pushDirection = new THREE.Vector3()
      .subVectors(this.spacecraft.position, body.position)
      .normalize();

    this.spacecraft.position.add(
      pushDirection.clone().multiplyScalar(collision.penetration)
    );

    // Reflect velocity (elastic collision with damping)
    const velocityDotNormal = this.spacecraft.velocity.dot(pushDirection);

    if (velocityDotNormal < 0) { // Moving toward planet
      const reflection = pushDirection.multiplyScalar(velocityDotNormal * -1.5);
      this.spacecraft.velocity.add(reflection);

      // Energy loss from collision
      this.spacecraft.velocity.multiplyScalar(0.6);
    }
  }

  /**
   * Update physics state for ALL bodies (N-body simulation with sub-stepping)
   * @param {number} deltaTime - Time step in seconds
   */
  update(deltaTime) {
    if (this.celestialBodies.length === 0) return;

    // Clamp delta time to prevent instability
    deltaTime = Math.min(deltaTime, 0.05);

    // Apply time scale and divide into sub-steps for stability
    const scaledDeltaTime = deltaTime * this.timeScale;
    const subStepDt = scaledDeltaTime / this.subSteps;

    // Perform multiple sub-steps for numerical stability
    for (let step = 0; step < this.subSteps; step++) {
      // 1. Calculate gravitational forces for ALL bodies
      this.calculateGravitationalForces();

      // 1.5. Calculate HPOP perturbations (if enabled)
      if (this.useHPOP) {
        this.calculateHPOPPerturbations();
      }

      // 2. Update velocity and position for ALL bodies
      for (const body of this.celestialBodies) {
        // Skip fixed bodies (like the Sun)
        if (body.fixed) continue;

        // Update velocity: v = v + a * dt
        body.velocity.add(
          body.acceleration.clone().multiplyScalar(subStepDt)
        );

        // Apply drag only to spacecraft (no drag in space for planets!)
        if (body.type === 'spacecraft' && this.drag < 1.0) {
          body.velocity.multiplyScalar(Math.pow(this.drag, subStepDt * 60));
        }

        // Limit maximum speed (only for spacecraft)
        if (body.type === 'spacecraft') {
          const speed = body.velocity.length();
          if (speed > this.maxSpeed) {
            body.velocity.setLength(this.maxSpeed);
          }
        }

        // Update position: p = p + v * dt
        body.position.add(
          body.velocity.clone().multiplyScalar(subStepDt)
        );
      }
    }

    // 3. Update mesh positions (once after all sub-steps)
    for (const body of this.celestialBodies) {
      if (body.mesh) {
        body.mesh.position.copy(body.position);
      }
    }

    // 4. Check and resolve collisions (only for spacecraft)
    if (this.spacecraft) {
      const collision = this.checkCollisions();
      if (collision.collided) {
        this.resolveCollision(collision);
      }
    }
  }

  /**
   * Predict future trajectory for visualization (simplified - only spacecraft vs other bodies)
   * @param {number} steps - Number of steps to simulate
   * @param {number} stepSize - Time per step
   * @returns {Array<Vector3>} Array of future positions
   */
  predictTrajectory(steps = 200, stepSize = 0.1) {
    if (!this.spacecraft) return [];

    // Save current state
    const savedPos = this.spacecraft.position.clone();
    const savedVel = this.spacecraft.velocity.clone();

    // Simulate forward (simplified - assume other bodies don't move much)
    const trajectory = [];
    const simPos = savedPos.clone();
    const simVel = savedVel.clone();

    for (let i = 0; i < steps; i++) {
      trajectory.push(simPos.clone());

      // Calculate acceleration from all other bodies
      const accel = new THREE.Vector3(0, 0, 0);
      for (const body of this.celestialBodies) {
        if (body === this.spacecraft) continue;

        const direction = new THREE.Vector3()
          .subVectors(body.position, simPos);

        const distance = direction.length();
        const minDistance = Math.max(body.radius * 1.2, 1.0);
        const effectiveDistance = Math.max(distance, minDistance);
        const effectiveDistanceSquared = effectiveDistance * effectiveDistance;

        const accelerationMagnitude = (this.G * body.mass) / effectiveDistanceSquared;
        direction.normalize();
        accel.add(direction.multiplyScalar(accelerationMagnitude));
      }

      // Update velocity and position
      simVel.add(accel.multiplyScalar(stepSize * this.timeScale));
      simPos.add(simVel.clone().multiplyScalar(stepSize * this.timeScale));

      // Stop if collision predicted
      let collided = false;
      for (const body of this.celestialBodies) {
        if (body === this.spacecraft) continue;
        const dist = simPos.distanceTo(body.position);
        if (dist < body.radius + this.spacecraft.radius) {
          collided = true;
          break;
        }
      }
      if (collided) break;
    }

    return trajectory;
  }

  /**
   * Get spacecraft velocity magnitude
   */
  getSpeed() {
    return this.spacecraft ? this.spacecraft.velocity.length() : 0;
  }

  /**
   * Get distance to nearest celestial body
   */
  getNearestBody() {
    if (!this.spacecraft || this.celestialBodies.length === 0) return null;

    let nearest = this.celestialBodies[0];
    let minDist = this.spacecraft.position.distanceTo(nearest.position);

    for (let i = 1; i < this.celestialBodies.length; i++) {
      const dist = this.spacecraft.position.distanceTo(this.celestialBodies[i].position);
      if (dist < minDist) {
        minDist = dist;
        nearest = this.celestialBodies[i];
      }
    }

    return { body: nearest, distance: minDist };
  }
}

/**
 * ========================================================================
 * HPOP (High Precision Orbit Propagator) Components
 * ========================================================================
 * These classes implement high-fidelity perturbation models for precise
 * orbital mechanics simulation.
 */

/**
 * Gravity Harmonics - Earth's non-spherical gravity field (J2-J6)
 * Based on WGS84/EGM96 gravitational model
 */
export class GravityHarmonics {
  // Earth gravitational field coefficients (dimensionless)
  // These values are from real Earth measurements and don't need unit conversion
  static J2 = 1.08263e-3;   // Oblateness (dominant term)
  static J3 = -2.53266e-6;  // Pear-shaped asymmetry
  static J4 = -1.61962e-6;  // Higher order oblateness
  static J5 = -2.28e-7;     // Higher order asymmetry
  static J6 = 5.41e-7;      // Higher order oblateness

  /**
   * Calculate harmonic acceleration on spacecraft
   * @param {THREE.Vector3} position - Position relative to Earth center (game units)
   * @param {number} earthRadius - Earth's radius in game units
   * @param {number} earthMass - Earth's mass
   * @param {number} G - Gravitational constant
   * @returns {THREE.Vector3} Harmonic perturbation acceleration
   */
  static calculateHarmonicAcceleration(position, earthRadius, earthMass, G) {
    const r = position.length();

    // Only apply harmonics when close to Earth (within 10x Earth radius)
    if (r > earthRadius * 10) {
      return new THREE.Vector3(0, 0, 0);
    }

    // Convert to spherical coordinates
    const x = position.x;
    const y = position.y;
    const z = position.z;

    // sin(latitude) = z/r
    const sinPhi = z / r;
    const sinPhi2 = sinPhi * sinPhi;
    const sinPhi3 = sinPhi2 * sinPhi;
    const sinPhi4 = sinPhi3 * sinPhi;
    const sinPhi5 = sinPhi4 * sinPhi;
    const sinPhi6 = sinPhi5 * sinPhi;

    // Ratio (R_earth / r)
    const Re_r = earthRadius / r;
    const Re_r2 = Re_r * Re_r;
    const Re_r3 = Re_r2 * Re_r;
    const Re_r4 = Re_r3 * Re_r;
    const Re_r5 = Re_r4 * Re_r;
    const Re_r6 = Re_r5 * Re_r;

    // Base acceleration magnitude
    const mu = G * earthMass; // Standard gravitational parameter
    const a0 = mu / (r * r);

    // Legendre polynomials P_n(sin(phi))
    const P2 = (3 * sinPhi2 - 1) / 2;
    const P3 = (5 * sinPhi3 - 3 * sinPhi) / 2;
    const P4 = (35 * sinPhi4 - 30 * sinPhi2 + 3) / 8;
    const P5 = (63 * sinPhi5 - 70 * sinPhi3 + 15 * sinPhi) / 8;
    const P6 = (231 * sinPhi6 - 315 * sinPhi4 + 105 * sinPhi2 - 5) / 16;

    // Derivatives dP_n/d(sin(phi))
    const dP2 = 3 * sinPhi;
    const dP3 = (15 * sinPhi2 - 3) / 2;
    const dP4 = (35 * sinPhi3 - 15 * sinPhi) / 2;
    const dP5 = (315 * sinPhi4 - 210 * sinPhi2 + 15) / 8;
    const dP6 = (693 * sinPhi5 - 630 * sinPhi3 + 105 * sinPhi) / 8;

    // Radial component (toward Earth center)
    const a_r = -a0 * (
      this.J2 * Re_r2 * (3 * P2) +
      this.J3 * Re_r3 * (4 * P3) +
      this.J4 * Re_r4 * (5 * P4) +
      this.J5 * Re_r5 * (6 * P5) +
      this.J6 * Re_r6 * (7 * P6)
    );

    // Latitudinal component (north-south)
    const cosPhi = Math.sqrt(1 - sinPhi2);
    const a_phi = (a0 / r) * (
      this.J2 * Re_r2 * dP2 +
      this.J3 * Re_r3 * dP3 +
      this.J4 * Re_r4 * dP4 +
      this.J5 * Re_r5 * dP5 +
      this.J6 * Re_r6 * dP6
    ) * cosPhi;

    // Convert spherical acceleration to Cartesian
    // Radial direction
    const r_hat = position.clone().normalize();

    // Latitudinal direction (pointing north)
    // phi_hat = (z_hat - sin(phi) * r_hat) / cos(phi)
    const z_hat = new THREE.Vector3(0, 0, 1);
    const phi_hat = z_hat.clone()
      .sub(r_hat.clone().multiplyScalar(sinPhi))
      .divideScalar(cosPhi + 1e-10); // Avoid division by zero at poles

    // Total harmonic acceleration
    const a_harmonic = new THREE.Vector3()
      .addScaledVector(r_hat, a_r)
      .addScaledVector(phi_hat, a_phi);

    return a_harmonic;
  }
}

/**
 * Third-Body Perturbations - Gravitational influence of Sun and Moon
 */
export class ThirdBodyPerturbation {
  /**
   * Calculate third-body perturbation on spacecraft
   * @param {Object} spacecraft - Spacecraft body
   * @param {Object} thirdBody - Perturbing body (Sun or Moon)
   * @param {Object} centralBody - Central body (Earth)
   * @param {number} G - Gravitational constant
   * @returns {THREE.Vector3} Perturbation acceleration
   */
  static calculatePerturbation(spacecraft, thirdBody, centralBody, G) {
    if (!thirdBody || !centralBody) {
      return new THREE.Vector3(0, 0, 0);
    }

    const r_sc = spacecraft.position.clone(); // Spacecraft position (inertial)
    const r_tb = thirdBody.position.clone(); // Third body position (inertial)
    const r_cb = centralBody.position.clone(); // Central body position (inertial)

    // Direct attraction: third body -> spacecraft
    const r_tb_sc = new THREE.Vector3().subVectors(r_tb, r_sc);
    const d_tb_sc = r_tb_sc.length();
    const a_direct = r_tb_sc.normalize().multiplyScalar(
      G * thirdBody.mass / (d_tb_sc * d_tb_sc)
    );

    // Indirect effect: third body -> central body (differential acceleration)
    const r_tb_cb = new THREE.Vector3().subVectors(r_tb, r_cb);
    const d_tb_cb = r_tb_cb.length();
    const a_indirect = r_tb_cb.normalize().multiplyScalar(
      G * thirdBody.mass / (d_tb_cb * d_tb_cb)
    );

    // Net perturbation = direct - indirect
    return a_direct.sub(a_indirect);
  }
}

/**
 * Atmospheric Drag - Harris-Priester atmospheric density model
 *
 * Unit Conversion Constants:
 * Game units: G=1, M_earth=1, R_earth=2
 * Derived scales:
 *   - Length: 1 game unit = 3.186e6 m (R_earth_real / R_earth_game)
 *   - Velocity: 1 game unit = 11183 m/s (L_scale / T_scale)
 *   - Acceleration: 1 game unit = 39.28 m/s² (derived from g_earth)
 */
export class AtmosphericDrag {
  // Unit conversion constants
  static VELOCITY_SCALE = 11183;      // m/s per game velocity unit
  static ACCEL_SCALE = 39.28;         // m/s² per game acceleration unit

  // Harris-Priester density model (simplified)
  // Altitude bins (km) and corresponding densities (kg/m³)
  static densityTable = [
    { altitude: 100, density: 5.6e-7 },
    { altitude: 150, density: 2.1e-9 },
    { altitude: 200, density: 2.5e-10 },
    { altitude: 300, density: 1.9e-11 },
    { altitude: 400, density: 3.0e-12 },
    { altitude: 500, density: 7.2e-13 },
    { altitude: 600, density: 2.2e-13 },
    { altitude: 800, density: 3.1e-14 },
    { altitude: 1000, density: 7.0e-15 }
  ];

  /**
   * Get atmospheric density at altitude (exponential interpolation)
   * @param {number} altitude - Altitude above Earth surface (game units)
   * @param {number} earthRadius - Earth radius (game units)
   * @returns {number} Atmospheric density (arbitrary units, scaled)
   */
  static getDensity(altitude, earthRadius) {
    // Convert game altitude to km equivalent
    // Assume game units where Earth radius ~ 2 units = 6371 km
    const altitudeKm = (altitude / earthRadius) * 6371;

    // Below 100 km: very dense (not simulated accurately, spacecraft would burn up)
    if (altitudeKm < 100) {
      return this.densityTable[0].density * Math.exp((100 - altitudeKm) / 10);
    }

    // Above 1000 km: negligible drag
    if (altitudeKm > 1000) {
      return this.densityTable[this.densityTable.length - 1].density *
             Math.exp(-(altitudeKm - 1000) / 200);
    }

    // Interpolate between table values
    for (let i = 0; i < this.densityTable.length - 1; i++) {
      const lower = this.densityTable[i];
      const upper = this.densityTable[i + 1];

      if (altitudeKm >= lower.altitude && altitudeKm <= upper.altitude) {
        // Exponential interpolation
        const t = (altitudeKm - lower.altitude) / (upper.altitude - lower.altitude);
        const logDensity = Math.log(lower.density) * (1 - t) + Math.log(upper.density) * t;
        return Math.exp(logDensity);
      }
    }

    return 0;
  }

  /**
   * Calculate drag acceleration
   * @param {THREE.Vector3} position - Spacecraft position (game units)
   * @param {THREE.Vector3} velocity - Spacecraft velocity (game units)
   * @param {Object} earth - Earth body reference
   * @param {number} area - Spacecraft cross-sectional area (m²)
   * @param {number} mass - Spacecraft mass (kg)
   * @param {number} Cd - Drag coefficient (dimensionless, typically 2.0-2.5)
   * @returns {THREE.Vector3} Drag acceleration (game units)
   */
  static calculateDrag(position, velocity, earth, area, mass, Cd) {
    if (!earth) {
      return new THREE.Vector3(0, 0, 0);
    }

    // Calculate altitude above Earth surface
    const r_earth = position.clone().sub(earth.position);
    const altitude = r_earth.length() - earth.radius;

    // Get atmospheric density (kg/m³)
    const rho = this.getDensity(altitude, earth.radius);

    // Convert velocity from game units to SI units (m/s)
    const v_rel_game = velocity.clone();
    const v_speed_game = v_rel_game.length();

    if (v_speed_game < 1e-6) {
      return new THREE.Vector3(0, 0, 0);
    }

    const v_speed_SI = v_speed_game * this.VELOCITY_SCALE; // Convert to m/s

    // Drag force in SI units: F = -0.5 * rho * v² * Cd * A * v_hat
    // Acceleration in SI units: a = F / m (m/s²)
    const dragMagnitude_SI = 0.5 * rho * v_speed_SI * v_speed_SI * Cd * area / mass;

    // Convert acceleration from SI (m/s²) to game units
    const dragMagnitude_game = dragMagnitude_SI / this.ACCEL_SCALE;

    // Apply in opposite direction of velocity
    const dragAccel = v_rel_game.normalize().multiplyScalar(-dragMagnitude_game);

    return dragAccel;
  }
}

/**
 * Solar Radiation Pressure - Photon pressure from sunlight
 *
 * Unit Conversion Constants:
 * Same as AtmosphericDrag - uses proper dimensional analysis
 */
export class SolarRadiationPressure {
  // Physical constants (SI units)
  static SOLAR_FLUX = 1367;           // W/m² at 1 AU
  static SPEED_OF_LIGHT = 299792458;  // m/s
  static AU_TO_GAME_UNITS = 15000;    // 1 AU = 15000 game units
  static ACCEL_SCALE = 39.28;         // m/s² per game acceleration unit

  /**
   * Calculate solar radiation pressure acceleration
   * @param {THREE.Vector3} position - Spacecraft position (game units)
   * @param {Object} sun - Sun body reference
   * @param {Object} earth - Earth body reference (for shadow calculation)
   * @param {number} area - Spacecraft cross-sectional area (m²)
   * @param {number} mass - Spacecraft mass (kg)
   * @param {number} reflectivity - Surface reflectivity (0=absorb, 1=reflect)
   * @returns {THREE.Vector3} SRP acceleration (game units)
   */
  static calculateSRP(position, sun, earth, area, mass, reflectivity) {
    if (!sun) {
      return new THREE.Vector3(0, 0, 0);
    }

    // Vector from Sun to spacecraft (game units)
    const r_sun_sc = position.clone().sub(sun.position);
    const distance = r_sun_sc.length();

    // Solar flux at spacecraft distance (inverse square law)
    const distanceAU = distance / this.AU_TO_GAME_UNITS;
    const flux = this.SOLAR_FLUX / (distanceAU * distanceAU);

    // Radiation pressure in SI units: P = Flux / c * (1 + reflectivity)
    // Force in SI units: F = P * Area
    // Acceleration in SI units: a = F / mass (m/s²)
    const pressure = flux / this.SPEED_OF_LIGHT * (1 + reflectivity);
    const force = pressure * area;
    const accelMagnitude_SI = force / mass;

    // Convert acceleration from SI (m/s²) to game units
    const accelMagnitude_game = accelMagnitude_SI / this.ACCEL_SCALE;

    // Direction: away from Sun
    const accel = r_sun_sc.normalize().multiplyScalar(accelMagnitude_game);

    // Check for Earth shadow (umbra and penumbra)
    if (earth) {
      const shadowFactor = this.calculateShadowFactor(position, sun, earth);
      accel.multiplyScalar(shadowFactor);
    }

    return accel;
  }

  /**
   * Calculate shadow factor (0 = full shadow, 1 = full sunlight)
   * @param {THREE.Vector3} scPos - Spacecraft position
   * @param {Object} sun - Sun body
   * @param {Object} earth - Earth body
   * @returns {number} Shadow factor [0, 1]
   */
  static calculateShadowFactor(scPos, sun, earth) {
    // Vector from Earth to spacecraft
    const r_earth_sc = scPos.clone().sub(earth.position);

    // Vector from Earth to Sun
    const r_earth_sun = sun.position.clone().sub(earth.position);

    // Check if spacecraft is on night side of Earth
    const cosAngle = r_earth_sc.dot(r_earth_sun) /
                     (r_earth_sc.length() * r_earth_sun.length());

    if (cosAngle >= 0) {
      // Day side - full sunlight
      return 1.0;
    }

    // Night side - check if in shadow cone
    // Project spacecraft onto Sun-Earth line
    const r_earth_sc_proj = r_earth_sun.clone()
      .normalize()
      .multiplyScalar(r_earth_sc.dot(r_earth_sun.clone().normalize()));

    // Perpendicular distance from shadow axis
    const r_perp = r_earth_sc.clone().sub(r_earth_sc_proj);
    const perpDist = r_perp.length();

    // Shadow cone radius at spacecraft distance
    const distAlongAxis = r_earth_sc_proj.length();
    const sunRadius = sun.radius;
    const earthRadius = earth.radius;

    // Umbra cone angle: tan(theta) = (R_earth - R_sun) / d_earth_sun
    // Penumbra cone angle: tan(theta) = (R_earth + R_sun) / d_earth_sun
    const d_earth_sun = r_earth_sun.length();
    const umbraRadius = Math.max(0, earthRadius - (sunRadius / d_earth_sun) * distAlongAxis);
    const penumbraRadius = earthRadius + (sunRadius / d_earth_sun) * distAlongAxis;

    if (perpDist < umbraRadius) {
      // Full shadow (umbra)
      return 0.0;
    } else if (perpDist < penumbraRadius) {
      // Partial shadow (penumbra) - linear approximation
      const t = (perpDist - umbraRadius) / (penumbraRadius - umbraRadius);
      return t; // 0 at umbra edge, 1 at penumbra edge
    } else {
      // Full sunlight
      return 1.0;
    }
  }
}
