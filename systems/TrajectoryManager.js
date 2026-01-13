import * as THREE from 'three';

/**
 * TrajectoryManager - 负责轨道预测、轨迹线、轨道尾迹管理
 */
export class TrajectoryManager {
  constructor(game) {
    this.game = game;

    // Trajectory visualization
    this.trajectoryLine = null;
    this.orbitTrails = new Map();
    this.maxTrailPoints = 3000;
    this.trailUpdateCounter = 0;

    // Prediction parameters
    this.predictionSteps = 1000;
    this.predictionStepSize = 0.05;
    this.showPrediction = false;
  }

  /**
   * Create trajectory prediction line
   */
  createTrajectoryLine() {
    const material = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9,
      linewidth: 3
    });
    const geometry = new THREE.BufferGeometry();
    this.trajectoryLine = new THREE.Line(geometry, material);
    this.trajectoryLine.renderOrder = 1000;
    this.trajectoryLine.frustumCulled = false;
    this.trajectoryLine.visible = false;
    this.game.scene.add(this.trajectoryLine);
  }

  /**
   * Create orbit trails for all celestial bodies
   */
  createOrbitTrails() {
    // Access celestial bodies directly from game instance
    const bodies = [
      { body: this.game.sunBody, color: 0xffff00, name: 'Sun' },
      { body: this.game.mercuryBody, color: 0xaaaaaa, name: 'Mercury' },
      { body: this.game.venusBody, color: 0xffaa66, name: 'Venus' },
      { body: this.game.earthBody, color: 0x4488ff, name: 'Earth' },
      { body: this.game.moonBody, color: 0xcccccc, name: 'Moon' },
      { body: this.game.marsBody, color: 0xff6644, name: 'Mars' },
      { body: this.game.phobosBody, color: 0xaa8866, name: 'Phobos' },
      { body: this.game.jupiterBody, color: 0xccaa88, name: 'Jupiter' },
      { body: this.game.halleyBody, color: 0x999999, name: 'Halley\'s Commet' }
    ];

    for (const { body, color, name } of bodies) {
      if (body && body.mesh) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxTrailPoints * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setDrawRange(0, 0);

        const material = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.8,
          linewidth: 5,
          depthWrite: false
        });

        const line = new THREE.Line(geometry, material);
        line.renderOrder = 999;
        line.frustumCulled = false;
        this.game.scene.add(line);

        this.orbitTrails.set(name, {
          body: body,
          positions: [],
          line: line,
          geometry: geometry
        });
      }
    }

    // Add spaceship trail
    if (this.game.spaceship) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.maxTrailPoints * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setDrawRange(0, 0);

      const material = new THREE.LineBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.95,
        linewidth: 5,
        depthWrite: false
      });

      const line = new THREE.Line(geometry, material);
      line.renderOrder = 999;
      line.frustumCulled = false;
      this.game.scene.add(line);

      this.orbitTrails.set('Spaceship', {
        body: { mesh: this.game.spaceship },
        positions: [],
        line: line,
        geometry: geometry
      });
    }
  }

  /**
   * Create orbit circle (helper for visualization)
   */
  createOrbitCircle(radius, color) {
    const segments = 128;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 3);

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3
    });

    const circle = new THREE.Line(geometry, material);
    circle.renderOrder = 998;
    this.game.scene.add(circle);

    return circle;
  }

  /**
   * Update trajectory prediction
   */
  updateTrajectoryPrediction() {
    if (!this.game.showPrediction || !this.game.physics.spacecraft) {
      this.trajectoryLine.visible = false;
      return;
    }

    const predictionSteps = this.predictionSteps;
    const stepSize = this.predictionStepSize;
    const recordInterval = 5;

    // Deep copy all body states
    const bodiesCopy = this.game.physics.celestialBodies.map(body => ({
      position: body.position.clone(),
      velocity: body.velocity.clone(),
      mass: body.mass,
      radius: body.radius,
      fixed: body.fixed,
      acceleration: new THREE.Vector3(0, 0, 0)
    }));

    const spacecraftCopy = bodiesCopy.find(b =>
      b.position.distanceTo(this.game.physics.spacecraft.position) < 0.1
    );

    if (!spacecraftCopy) {
      console.warn('Could not find spacecraft in physics bodies');
      return;
    }

    // Apply velocity adjustment
    spacecraftCopy.velocity.add(this.game.velocityAdjustment);

    const trajectoryPoints = [];
    const referenceBodyPositions = [];
    trajectoryPoints.push(spacecraftCopy.position.clone());

    // Find reference body for frame transformation
    let referenceBodyCopy = null;
    if (this.game.referenceFrame === 'earth') {
      referenceBodyCopy = bodiesCopy.find(b => Math.abs(b.mass - 1.0) < 0.001 && !b.fixed);
    } else if (this.game.referenceFrame === 'moon') {
      referenceBodyCopy = bodiesCopy.find(b => Math.abs(b.mass - 0.0123) < 0.001 && !b.fixed);
    }

    if (referenceBodyCopy) {
      referenceBodyPositions.push(referenceBodyCopy.position.clone());
    } else {
      referenceBodyPositions.push(new THREE.Vector3(0, 0, 0));
    }

    // Simulate forward with N-body physics
    for (let step = 0; step < predictionSteps; step++) {
      // Calculate gravitational forces
      for (let i = 0; i < bodiesCopy.length; i++) {
        const body1 = bodiesCopy[i];
        if (body1.fixed) continue;

        body1.acceleration.set(0, 0, 0);

        for (let j = 0; j < bodiesCopy.length; j++) {
          if (i === j) continue;
          const body2 = bodiesCopy[j];

          const direction = new THREE.Vector3().subVectors(body2.position, body1.position);
          const distance = direction.length();
          const minDistance = Math.max(body1.radius + body2.radius, 1.0);
          const effectiveDistance = Math.max(distance, minDistance);

          const accelerationMagnitude = (this.game.physics.G * body2.mass) /
                                        (effectiveDistance * effectiveDistance);
          direction.normalize();
          body1.acceleration.add(direction.multiplyScalar(accelerationMagnitude));
        }
      }

      // Update velocities and positions
      for (const body of bodiesCopy) {
        if (body.fixed) continue;

        body.velocity.add(
          body.acceleration.clone().multiplyScalar(stepSize * this.game.physics.timeScale)
        );
        body.position.add(
          body.velocity.clone().multiplyScalar(stepSize * this.game.physics.timeScale)
        );
      }

      // Record positions
      if (step % recordInterval === 0) {
        trajectoryPoints.push(spacecraftCopy.position.clone());
        if (referenceBodyCopy) {
          referenceBodyPositions.push(referenceBodyCopy.position.clone());
        } else {
          referenceBodyPositions.push(new THREE.Vector3(0, 0, 0));
        }
      }

      // Check for collision
      let collided = false;
      for (const body of bodiesCopy) {
        if (body === spacecraftCopy) continue;
        const dist = spacecraftCopy.position.distanceTo(body.position);
        if (dist < body.radius + 0.4) {
          collided = true;
          break;
        }
      }
      if (collided) break;
    }

    // Update trajectory line
    if (trajectoryPoints.length > 1) {
      try {
        const visualTrajectoryPoints = trajectoryPoints.map((pt, i) => {
          if (referenceBodyPositions[i]) {
            return pt.clone().sub(referenceBodyPositions[i]);
          } else {
            return pt.clone();
          }
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(visualTrajectoryPoints);
        if (this.trajectoryLine.geometry) {
          this.trajectoryLine.geometry.dispose();
        }
        this.trajectoryLine.geometry = geometry;
        this.trajectoryLine.visible = true;
        this.trajectoryLine.frustumCulled = false;
      } catch (error) {
        console.error('Error updating trajectory:', error);
        this.trajectoryLine.visible = false;
      }
    } else {
      this.trajectoryLine.visible = false;
    }
  }

  /**
   * Update simple trajectory (fast version)
   */
  updateTrajectory() {
    const trajectory = this.game.physics.predictTrajectory(150, 0.15);

    if (trajectory.length > 0) {
      const points = trajectory.map(p => new THREE.Vector3(p.x, p.y, p.z));
      this.trajectoryLine.geometry.setFromPoints(points);
    }
  }

  /**
   * Update orbit trails
   */
  updateOrbitTrails() {
    for (const [name, trail] of this.orbitTrails.entries()) {
      if (!trail.body || !trail.body.mesh) continue;

      // Get current position in physics frame
      let currentPos;
      if (name === 'Spaceship') {
        if (!this.game.physics.spacecraft) continue;
        currentPos = this.game.physics.spacecraft.position.clone();
      } else {
        if (!trail.body.position) continue;
        currentPos = trail.body.position.clone();
      }

      trail.positions.push(currentPos);

      // Keep only last maxTrailPoints
      if (trail.positions.length > this.maxTrailPoints) {
        trail.positions.shift();
      }

      // Update line geometry with reference frame offset
      const positions = trail.geometry.attributes.position.array;

      // Get reference body's trail
      let referenceTrail = null;
      if (this.game.referenceFrame === 'earth') {
        referenceTrail = this.orbitTrails.get('Earth');
      } else if (this.game.referenceFrame === 'moon') {
        referenceTrail = this.orbitTrails.get('Moon');
      }

      // Minimum points before showing trail
      const minTrailPoints = 20;
      if (trail.positions.length < minTrailPoints) {
        trail.geometry.setDrawRange(0, 0);
        continue;
      }

      // Calculate renderable points
      let renderablePoints = trail.positions.length;
      if (referenceTrail && referenceTrail.positions.length > 0) {
        renderablePoints = Math.min(trail.positions.length, referenceTrail.positions.length);
      }

      for (let i = 0; i < renderablePoints; i++) {
        let visualPos;
        if (referenceTrail && i < referenceTrail.positions.length) {
          visualPos = trail.positions[i].clone().sub(referenceTrail.positions[i]);
        } else if (referenceTrail && this.game.referenceFrame === 'earth' && this.game.earthBody) {
          visualPos = trail.positions[i].clone().sub(this.game.earthBody.position);
        } else if (referenceTrail && this.game.referenceFrame === 'moon' && this.game.moonBody) {
          visualPos = trail.positions[i].clone().sub(this.game.moonBody.position);
        } else {
          visualPos = trail.positions[i].clone();
        }
        positions[i * 3] = visualPos.x;
        positions[i * 3 + 1] = visualPos.y;
        positions[i * 3 + 2] = visualPos.z;
      }

      trail.geometry.setDrawRange(0, renderablePoints);
      trail.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Serialize orbit trails for saving
   */
  serializeOrbitTrails() {
    const trails = {};

    if (this.orbitTrails && this.orbitTrails.size > 0) {
      for (const [bodyName, trailData] of this.orbitTrails.entries()) {
        if (trailData.positions && trailData.positions.length > 0) {
          trails[bodyName] = {
            positions: trailData.positions.map(pos => ({
              x: pos.x,
              y: pos.y,
              z: pos.z
            })),
            count: trailData.positions.length
          };
        }
      }
    }

    console.log(`📊 Serialized ${Object.keys(trails).length} orbit trails`);
    return trails;
  }

  /**
   * Deserialize orbit trails from save data
   */
  deserializeOrbitTrails(serializedTrails) {
    const trails = new Map();

    for (const [bodyName, trailData] of Object.entries(serializedTrails)) {
      let bodyRef = null;
      if (bodyName === 'Spaceship') {
        bodyRef = { mesh: this.game.spaceship };
      } else if (bodyName === 'Sun' && this.game.sunBody) {
        bodyRef = this.game.sunBody;
      } else if (bodyName === 'Mercury' && this.game.mercuryBody) {
        bodyRef = this.game.mercuryBody;
      } else if (bodyName === 'Venus' && this.game.venusBody) {
        bodyRef = this.game.venusBody;
      } else if (bodyName === 'Earth' && this.game.earthBody) {
        bodyRef = this.game.earthBody;
      } else if (bodyName === 'Moon' && this.game.moonBody) {
        bodyRef = this.game.moonBody;
      } else if (bodyName === 'Mars' && this.game.marsBody) {
        bodyRef = this.game.marsBody;
      } else if (bodyName === 'Phobos' && this.game.phobosBody) {
        bodyRef = this.game.phobosBody;
      } else if (bodyName === 'Jupiter' && this.game.jupiterBody) {
        bodyRef = this.game.jupiterBody;
      } else if (bodyName === 'Halley\'s Commet' && this.game.halleyBody) {
        bodyRef = this.game.halleyBody;
      }

      trails.set(bodyName, {
        body: bodyRef,
        positions: trailData.positions.map(pos =>
          new THREE.Vector3(pos.x, pos.y, pos.z)
        ),
        line: null,
        geometry: null
      });
    }

    return trails;
  }

  /**
   * Recreate orbit trail visual
   */
  recreateOrbitTrail(bodyName) {
    const trailData = this.orbitTrails.get(bodyName);
    if (!trailData || !trailData.positions || trailData.positions.length === 0) {
      return;
    }

    // Remove old trail
    if (trailData.line) {
      this.game.scene.remove(trailData.line);
      if (trailData.line.geometry) {
        trailData.line.geometry.dispose();
      }
      if (trailData.line.material) {
        trailData.line.material.dispose();
      }
    }

    // Create new trail
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrailPoints * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));

    // Map body names to colors
    const colorMap = {
      'Sun': 0xffff00,
      'Mercury': 0xaaaaaa,
      'Venus': 0xffaa66,
      'Earth': 0x4488ff,
      'Moon': 0xcccccc,
      'Mars': 0xff6644,
      'Phobos': 0xaa8866,
      'Jupiter': 0xccaa88,
      'Halley\'s Commet': 0x999999,
      'Spaceship': 0xff0000
    };
    const color = colorMap[bodyName] || 0xffffff;

    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: bodyName === 'Spaceship' ? 0.95 : 0.8,
      linewidth: 5,
      depthWrite: false
    });

    const line = new THREE.Line(geometry, material);
    line.renderOrder = 999;
    line.frustumCulled = false;
    this.game.scene.add(line);

    trailData.line = line;
    trailData.geometry = geometry;
  }
}
