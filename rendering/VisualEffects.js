/**
 * VisualEffects.js
 *
 * Manages visual effects: star field, orbit trails, trajectory prediction line.
 * Extracted from game_v2.js (~120 lines).
 */

import * as THREE from 'three';

export class VisualEffects {
  /**
   * @param {Object} game - Reference to main game instance
   */
  constructor(game) {
    this.game = game;
  }

  /**
   * Create star field background
   * Uses Milky Way texture skybox or fallback to point stars
   */
  createStarField() {
    // Create skybox with Milky Way texture (MUCH BIGGER - behind all planets!)
    if (this.game.textures && this.game.textures.stars) {
      const skyboxGeometry = new THREE.SphereGeometry(100000, 60, 40); // Was 3000, now 100000!
      skyboxGeometry.scale(-1, 1, 1); // Invert so texture faces inward

      const skyboxMaterial = new THREE.MeshBasicMaterial({
        map: this.game.textures.stars,
        side: THREE.BackSide
      });

      const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
      this.game.scene.add(skybox);
    } else {
      // Fallback to point stars if texture not loaded (spread far behind planets)
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i < 5000; i++) {
        vertices.push(
          (Math.random() - 0.5) * 150000, // Was 4000, now 150000
          (Math.random() - 0.5) * 150000,
          (Math.random() - 0.5) * 150000
        );
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        sizeAttenuation: false
      });
      const stars = new THREE.Points(geometry, material);
      this.game.scene.add(stars);
    }
  }

  /**
   * Create orbit trails for all celestial bodies and spaceship
   * Trails are dynamic lines that grow as bodies move
   */
  createOrbitTrails() {
    // Create orbit trails for all celestial bodies
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
        // Create line geometry for trail with dynamic growth
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.game.maxTrailPoints * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setDrawRange(0, 0); // Start with no points visible

        // Create material with matching color - MORE VISIBLE!
        const material = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.8, // Increased from 0.6 for better visibility
          linewidth: 5, // Note: linewidth > 1 only works with WebGLRenderer and specific materials
          depthWrite: false // Don't write to depth buffer to avoid z-fighting
        });

        const line = new THREE.Line(geometry, material);
        line.renderOrder = 999; // Render trails after everything else
        line.frustumCulled = false; // Don't cull trails based on bounding box
        this.game.scene.add(line);

        // Store trail data
        this.game.orbitTrails.set(name, {
          body: body,
          positions: [],
          line: line,
          geometry: geometry
        });
      }
    }

    // Add spaceship trail (brighter and more visible)
    if (this.game.spaceship) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.game.maxTrailPoints * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setDrawRange(0, 0);

      const material = new THREE.LineBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.95, // Very bright for spaceship
        linewidth: 5,
        depthWrite: false // Don't write to depth buffer to avoid z-fighting
      });

      const line = new THREE.Line(geometry, material);
      line.renderOrder = 999; // Render trails after everything else
      line.frustumCulled = false; // Don't cull trails based on bounding box
      this.game.scene.add(line);

      this.game.orbitTrails.set('Spaceship', {
        body: { mesh: this.game.spaceship },
        positions: [],
        line: line,
        geometry: geometry
      });
    }
  }

  /**
   * Create trajectory prediction line
   * Shows predicted future path when paused
   */
  createTrajectoryLine() {
    // Predicted trajectory line - bright yellow/green dashed line
    const material = new THREE.LineBasicMaterial({
      color: 0xffff00, // Bright yellow for visibility
      transparent: true,
      opacity: 0.9,
      linewidth: 3
    });
    const geometry = new THREE.BufferGeometry();
    this.game.trajectoryLine = new THREE.Line(geometry, material);
    this.game.trajectoryLine.renderOrder = 1000; // Render on top of orbit trails
    this.game.trajectoryLine.frustumCulled = false;
    this.game.trajectoryLine.visible = false; // Hidden by default
    this.game.scene.add(this.game.trajectoryLine);
  }
}
