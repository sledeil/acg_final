import * as THREE from 'three';

/**
 * SceneSetup - 负责Three.js场景、渲染器、光照、纹理初始化
 */
export class SceneSetup {
  constructor(game) {
    this.game = game;

    // Three.js core components
    this.scene = null;
    this.renderer = null;
    this.camera = null;

    // Textures
    this.textureLoader = new THREE.TextureLoader();
    this.textures = {};
  }

  /**
   * Load planet and sky textures
   */
  loadTextures() {
    this.textures = {
      earth: this.textureLoader.load('textures/2k_earth_daymap.jpg'),
      mars: this.textureLoader.load('textures/2k_mars.jpg'),
      mercury: this.textureLoader.load('textures/2k_mercury.jpg'),
      moon: this.textureLoader.load('textures/2k_moon.jpg'),
      sun: this.textureLoader.load('textures/2k_sun.jpg'),
      venus: this.textureLoader.load('textures/2k_venus_surface.jpg'),
      stars: this.textureLoader.load('textures/8k_stars_milky_way.jpg')
    };
  }

  /**
   * Setup Three.js scene, camera, renderer, and lighting
   */
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

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Enable shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(this.renderer.domElement);

    // Lighting Setup
    // Ambient light (base illumination)
    const ambientLight = new THREE.AmbientLight(0x404060, 1.0);
    this.scene.add(ambientLight);

    // Sun point light will be added when Sun is created

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /**
   * Create star field background (skybox or point stars)
   */
  createStarField() {
    // Create skybox with Milky Way texture (MUCH BIGGER - behind all planets!)
    if (this.textures && this.textures.stars) {
      const skyboxGeometry = new THREE.SphereGeometry(100000, 60, 40);
      skyboxGeometry.scale(-1, 1, 1); // Invert so texture faces inward

      const skyboxMaterial = new THREE.MeshBasicMaterial({
        map: this.textures.stars,
        side: THREE.BackSide
      });

      const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
      this.scene.add(skybox);
    } else {
      // Fallback to point stars if texture not loaded
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i < 5000; i++) {
        vertices.push(
          (Math.random() - 0.5) * 150000,
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
      this.scene.add(stars);
    }
  }

  /**
   * Get the scene
   */
  getScene() {
    return this.scene;
  }

  /**
   * Get the camera
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Get the renderer
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * Get loaded textures
   */
  getTextures() {
    return this.textures;
  }
}
