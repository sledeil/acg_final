import * as THREE from 'three';

/**
 * CelestialBodyManager - 负责管理所有天体（太阳、行星、卫星）的创建和更新
 */
export class CelestialBodyManager {
  constructor(game) {
    this.game = game;

    // Celestial body references
    this.celestialBodies = [];
    this.sunBody = null;
    this.mercuryBody = null;
    this.venusBody = null;
    this.earthBody = null;
    this.moonBody = null;
    this.marsBody = null;
    this.phobosBody = null;
    this.jupiterBody = null;
    this.halleyBody = null;
    this.sunLight = null;

    // Label management
    this.labelElements = new Map();
  }

  /**
   * Create label DOM element
   */
  createLabel(text, offsetY, fontSize = 128) {
    const labelElement = document.createElement('div');
    labelElement.className = 'space-label';
    labelElement.textContent = text;
    labelElement.style.cssText = `
      position: absolute;
      color: #ffffff;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
      z-index: 1000;
      transform: translate(-50%, -100%);
    `;
    document.body.appendChild(labelElement);

    return {
      element: labelElement,
      offsetY: offsetY,
      text: text
    };
  }

  /**
   * Register a label to a mesh
   */
  registerLabel(mesh, labelData) {
    this.labelElements.set(mesh, labelData);
  }

  /**
   * Update label positions based on camera view
   */
  updateLabelPositions() {
    const camera = this.game.camera;
    const renderer = this.game.renderer;
    if (!camera || !renderer) return;

    const vector = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);

    // UI panel bounds
    const leftPanelRight = 300;
    const rightPanelLeft = renderer.domElement.clientWidth - 320;
    const topMargin = 40;
    const screenOffsetY = -25;

    for (const [mesh, labelData] of this.labelElements.entries()) {
      if (!mesh || !labelData || !labelData.element) continue;

      mesh.getWorldPosition(vector);
      const distanceToCamera = vector.distanceTo(cameraPosition);
      const objectScreenPos = vector.clone().project(camera);

      // Check if in view frustum
      const isInViewFrustum = objectScreenPos.z >= -1 && objectScreenPos.z <= 1 &&
                              objectScreenPos.x >= -2 && objectScreenPos.x <= 2 &&
                              objectScreenPos.y >= -2 && objectScreenPos.y <= 2;

      if (!isInViewFrustum) {
        labelData.element.style.display = 'none';
        continue;
      }

      // Convert to screen coordinates
      const objectX = (objectScreenPos.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
      const objectY = (objectScreenPos.y * -0.5 + 0.5) * renderer.domElement.clientHeight;
      const labelX = objectX;
      const labelY = objectY + screenOffsetY;

      // Check label bounds
      const estimatedCharWidth = 9;
      const labelWidth = Math.max(60, labelData.text.length * estimatedCharWidth);
      const labelHeight = 20;
      const labelLeft = labelX - labelWidth / 2;
      const labelRight = labelX + labelWidth / 2;
      const labelTop = labelY - labelHeight;
      const labelBottom = labelY;

      // Check overlap with UI panels
      const overlapsLeftPanel = labelRight > 0 && labelLeft < leftPanelRight;
      const overlapsRightPanel = labelRight > rightPanelLeft && labelLeft < renderer.domElement.clientWidth;
      const overlapsTop = labelBottom < topMargin;

      if (overlapsLeftPanel || overlapsRightPanel || overlapsTop) {
        labelData.element.style.display = 'none';
        continue;
      }

      // Calculate opacity based on distance
      const minDistance = 2000;
      const maxDistance = 50000;
      const minOpacity = 0.2;
      const maxOpacity = 1.0;

      let opacity = maxOpacity;
      if (distanceToCamera > minDistance) {
        const t = Math.min(1, (distanceToCamera - minDistance) / (maxDistance - minDistance));
        opacity = maxOpacity * (1 - t) + minOpacity * t;
      }

      labelData.element.style.display = 'block';
      labelData.element.style.left = `${labelX}px`;
      labelData.element.style.top = `${labelY}px`;
      labelData.element.style.opacity = opacity.toString();
    }
  }

  /**
   * Update label scales (deprecated - kept for compatibility)
   */
  updateLabelScales() {
    // Labels are now CSS elements with fixed size
  }

  /**
   * Get trail color for a celestial body
   */
  getTrailColor(bodyName) {
    const colors = {
      spaceship: 0xff0000,
      mercury: 0x8c7853,
      venus: 0xffc649,
      earth: 0x4169e1,
      moon: 0xaaaaaa,
      mars: 0xff6347,
      phobos: 0x888888,
      jupiter: 0xffa500,
      halley: 0x00ffff
    };
    return colors[bodyName.toLowerCase()] || 0xffffff;
  }

  /**
   * Create all celestial bodies
   */
  createCelestialBodies() {
    const G = 1.0;
    const sunMass = 333000;
    const earthMass = 1;

    // Helper function to calculate circular orbital velocity
    const getOrbitalVelocity = (centerMass, orbitRadius, angle) => {
      const speed = Math.sqrt((G * centerMass) / orbitRadius);
      return new THREE.Vector3(-Math.sin(angle) * speed, 0, Math.cos(angle) * speed);
    };

    // THE SUN
    this.sunBody = this.createPlanetWithVelocity({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      radius: 100,
      color: 0xffff00,
      mass: sunMass,
      type: 'star',
      emissiveIntensity: 3.0,
      name: 'The Sun',
      fixed: true,
      texture: 'sun'
    });
    const sunLabel = this.createLabel('SUN', 150);
    this.registerLabel(this.sunBody.mesh, sunLabel);

    // MERCURY
    const mercuryAngle = 0;
    const mercuryRadius = 5850;
    this.mercuryBody = this.createPlanetWithVelocity({
      position: new THREE.Vector3(Math.cos(mercuryAngle) * mercuryRadius, 0, Math.sin(mercuryAngle) * mercuryRadius),
      velocity: getOrbitalVelocity(sunMass, mercuryRadius, mercuryAngle),
      radius: 0.8,
      color: 0xaaaaaa,
      mass: earthMass * 0.055,
      name: 'Mercury',
      texture: 'mercury'
    });
    const mercuryLabel = this.createLabel('MERCURY', 5);
    this.registerLabel(this.mercuryBody.mesh, mercuryLabel);

    // VENUS
    const venusAngle = Math.PI * 0.7;
    const venusRadius = 10800;
    this.venusBody = this.createPlanetWithVelocity({
      position: new THREE.Vector3(Math.cos(venusAngle) * venusRadius, 0, Math.sin(venusAngle) * venusRadius),
      velocity: getOrbitalVelocity(sunMass, venusRadius, venusAngle),
      radius: 1.9,
      color: 0xffaa66,
      mass: earthMass * 0.815,
      name: 'Venus',
      texture: 'venus'
    });
    const venusLabel = this.createLabel('VENUS', 8);
    this.registerLabel(this.venusBody.mesh, venusLabel);

    // EARTH
    const earthAngle = 0;
    const earthRadius = 15000;
    this.earthBody = this.createPlanetWithVelocity({
      position: new THREE.Vector3(Math.cos(earthAngle) * earthRadius, 0, Math.sin(earthAngle) * earthRadius),
      velocity: getOrbitalVelocity(sunMass, earthRadius, earthAngle),
      radius: 2,
      color: 0x4488ff,
      mass: earthMass,
      name: 'Earth',
      texture: 'earth'
    });
    const earthLabel = this.createLabel('EARTH', 10);
    this.registerLabel(this.earthBody.mesh, earthLabel);

    // MOON
    const moonOrbitRadius = 38.6035;
    const moonAngle = Math.PI / 4;
    const earthPos = this.earthBody.position;
    const earthVel = this.earthBody.velocity;
    const moonRelativeVel = getOrbitalVelocity(earthMass, moonOrbitRadius, moonAngle);
    this.moonBody = this.createPlanetWithVelocity({
      position: new THREE.Vector3(
        earthPos.x + Math.cos(moonAngle) * moonOrbitRadius,
        0,
        earthPos.z + Math.sin(moonAngle) * moonOrbitRadius
      ),
      velocity: new THREE.Vector3().addVectors(earthVel, moonRelativeVel),
      radius: 0.5,
      color: 0xcccccc,
      mass: earthMass * 0.0123,
      name: 'Moon',
      texture: 'moon'
    });
    const moonLabel = this.createLabel('MOON', 3);
    this.registerLabel(this.moonBody.mesh, moonLabel);

    // MARS
    const marsAngle = Math.PI * 0.4;
    const marsRadius = 22800;
    const marsMass = earthMass * 0.107;
    this.marsBody = this.createPlanetWithVelocity({
      position: new THREE.Vector3(Math.cos(marsAngle) * marsRadius, 0, Math.sin(marsAngle) * marsRadius),
      velocity: getOrbitalVelocity(sunMass, marsRadius, marsAngle),
      radius: 1.1,
      color: 0xff6644,
      mass: marsMass,
      name: 'Mars',
      texture: 'mars'
    });
    const marsLabel = this.createLabel('MARS', 6);
    this.registerLabel(this.marsBody.mesh, marsLabel);

    // PHOBOS
    const phobosOrbitRadius = 0.9401;
    const phobosAngle = 0;
    const marsPos = this.marsBody.position;
    const marsVel = this.marsBody.velocity;
    const phobosRelativeVel = getOrbitalVelocity(marsMass, phobosOrbitRadius, phobosAngle);
    this.phobosBody = this.createPlanetWithVelocity({
      position: new THREE.Vector3(
        marsPos.x + Math.cos(phobosAngle) * phobosOrbitRadius,
        0,
        marsPos.z + Math.sin(phobosAngle) * phobosOrbitRadius
      ),
      velocity: new THREE.Vector3().addVectors(marsVel, phobosRelativeVel),
      radius: 0.2,
      color: 0xaa8866,
      mass: marsMass * 0.0000001,
      name: 'Phobos'
    });
    const phobosLabel = this.createLabel('PHOBOS', 2);
    this.registerLabel(this.phobosBody.mesh, phobosLabel);

    // JUPITER
    const jupiterAngle = Math.PI * 1.5;
    const jupiterRadius = 78000;
    this.jupiterBody = this.createPlanetWithVelocity({
      position: new THREE.Vector3(Math.cos(jupiterAngle) * jupiterRadius, 0, Math.sin(jupiterAngle) * jupiterRadius),
      velocity: getOrbitalVelocity(sunMass, jupiterRadius, jupiterAngle),
      radius: 22,
      color: 0xccaa88,
      mass: earthMass * 318,
      name: 'Jupiter'
    });
    const jupiterLabel = this.createLabel('JUPITER', 40);
    this.registerLabel(this.jupiterBody.mesh, jupiterLabel);

    // HALLEY'S COMET
    const halleyInclination = Math.PI * 161.96 / 180.0;
    const halleyMass = 3.68e-11;
    const halleyEccentricity = 0.96658;
    const halleyPerihelion = 0.59278 * 15000;
    const halleyVelocityAtPerigee = Math.sqrt(G * sunMass * (1 + halleyEccentricity) / halleyPerihelion);
    const halleyAngle = Math.PI * 0.66;
    this.halleyBody = this.createPlanetWithVelocity({
      position: new THREE.Vector3(
        halleyPerihelion * Math.cos(halleyInclination) * Math.sin(halleyAngle),
        halleyPerihelion * Math.sin(halleyInclination),
        halleyPerihelion * Math.cos(halleyInclination) * Math.cos(halleyAngle)
      ),
      velocity: new THREE.Vector3(
        halleyVelocityAtPerigee * Math.cos(halleyAngle),
        0,
        -halleyVelocityAtPerigee * Math.sin(halleyAngle)
      ),
      mass: halleyMass,
      type: 'commet',
      name: 'Halley\'s Commet',
      color: 0x999999,
      radius: 1
    });
    const halleyLabel = this.createLabel('HALLEY\'S COMMET', 3);
    this.registerLabel(this.halleyBody.mesh, halleyLabel);
  }

  /**
   * Create a single planet/star with velocity
   */
  createPlanetWithVelocity(config) {
    const geometry = new THREE.SphereGeometry(config.radius, 64, 64);
    let material;
    let mesh;

    if (config.type === 'star') {
      // Sun uses MeshBasicMaterial
      material = new THREE.MeshBasicMaterial({
        map: config.texture && this.game.textures?.[config.texture] ? this.game.textures[config.texture] : null,
        color: config.color || 0xffaa00
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.position.copy(config.position);
      mesh.name = config.name || 'The Sun';
      this.game.scene.add(mesh);
    } else {
      // Planets use MeshStandardMaterial
      const materialConfig = {
        roughness: 0.9,
        metalness: 0.1
      };

      if (config.texture && this.game.textures?.[config.texture]) {
        materialConfig.map = this.game.textures[config.texture];
        materialConfig.emissive = 0x000000;
        materialConfig.emissiveIntensity = 0;
      } else {
        materialConfig.color = config.color;
        materialConfig.emissive = 0x000000;
        materialConfig.emissiveIntensity = 0;
      }

      material = new THREE.MeshStandardMaterial(materialConfig);
      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.position.copy(config.position);
      mesh.name = config.name || 'Planet';
      this.game.scene.add(mesh);
    }

    // Add light source for star
    if (config.type === 'star') {
      const sunPointLight = new THREE.PointLight(0xffffff, 5, 40000, 0.0002);
      sunPointLight.position.copy(config.position);
      sunPointLight.castShadow = false;
      this.game.scene.add(sunPointLight);
      this.sunLight = sunPointLight;
      config.light = sunPointLight;
    }

    // Add to physics
    const physicsBody = this.game.physics.addCelestialBody({
      position: config.position,
      velocity: config.velocity || new THREE.Vector3(0, 0, 0),
      mass: config.mass,
      radius: config.radius,
      type: config.type || 'planet',
      mesh: mesh,
      fixed: config.fixed || false
    });

    // Save reference
    this.celestialBodies.push({ mesh, ...config });
    config.mesh = mesh;

    return physicsBody;
  }

  /**
   * Get all celestial bodies
   */
  getCelestialBodies() {
    return this.celestialBodies;
  }

  /**
   * Get label elements map
   */
  getLabelElements() {
    return this.labelElements;
  }
}
