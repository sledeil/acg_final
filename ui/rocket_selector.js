import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/DRACOLoader.js';

class RocketSelector {
  constructor(game) {
    this.game = game;

    // Rocket configs
    this.rocketConfigs = [
      {
        id: 'explorer',
        name: 'Explorer Jupiter-C Rocket',
        path: 'assets/rocket_with_glow.glb',
        // 火焰旋转偏移（欧拉角，单位：弧度）
        // 格式：[x, y, z] 分别对应绕 X、Y、Z 轴的旋转（弧度）
        // 例如：[Math.PI / 2, 0, 0] 表示绕 X 轴旋转 90 度
        // 例如：[0, Math.PI / 2, 0] 表示绕 Y 轴旋转 90 度
        // 例如：[0, 0, Math.PI / 2] 表示绕 Z 轴旋转 90 度
        flameRotationOffset: [0, 0, 0], // 默认无旋转，可根据需要调整
        // 火焰位置偏移（相对于 engineGlow 的位置，单位：模型单位）
        // 格式：[x, y, z] 分别对应 X、Y、Z 轴的偏移
        // 例如：[0, 0, -0.5] 表示沿 Z 轴向后偏移 0.5 单位
        flamePositionOffset: [0, 0, 0] // 默认无偏移，可根据需要调整
      },
      {
        id: 'saturnV',
        name: 'Saturn V',
        path: 'assets/saturn_with_glow.glb',
        flameRotationOffset: [0, Math.PI,  Math.PI], // 默认无旋转，可根据需要调整
        flamePositionOffset: [0, 0, 0] // 默认无偏移，可根据需要调整
      },
      {
        id: 'shuttle',
        name: 'Space Shuttle',
        path: 'assets/shuttle_with_glow.glb',
        flameRotationOffset: [0, 0, 0], // 默认无旋转，可根据需要调整
        flamePositionOffset: [0, 0, 0] // 默认无偏移，可根据需要调整
      },
      {
        id: 'generic',
        name: 'Generic Spaceship',
        path: 'assets/spaceship_with_glow.glb',
        flameRotationOffset: [0, Math.PI, 0], // 默认无旋转，可根据需要调整
        flamePositionOffset: [0, 0, 0] // 默认无偏移，可根据需要调整
      }
    ];
    // 默认使用 explorer rocket (索引0)
    this.currentRocketIndex = 0;
    this.loadedRocketModels = new Map(); // id -> {scene, scale, center}

    // GLTF + Draco loader
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
    dracoLoader.preload();
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(dracoLoader);

    // UI / state
    this._isOpen = false;
    this.pendingStartAfterRocketSelect = false;
    this.prevPausedState = false;

    // Preview scene
    this.rocketPreviewScene = null;
    this.rocketPreviewCamera = null;
    this.rocketPreviewRenderer = null;
    this.rocketPreviewRoot = null;
    this.rocketPreviewCurrentMesh = null;
    this.rocketPreviewRotation = { yaw: 0, pitch: 0 };
    this.rocketPreviewIsDragging = false;
    this.rocketPreviewLastX = 0;
    this.rocketPreviewLastY = 0;
    
    // 保存游戏场景的相机状态，用于恢复
    this.savedCameraState = null;
    
    // 鼠标事件处理函数引用，用于移除监听器
    this.previewMouseMoveHandler = null;
    this.previewMouseUpHandler = null;
  }

  isOpen() {
    return this._isOpen;
  }

  /**
   * Called after HUD is created so we can safely query DOM
   */
  setupUI() {
    // Inject styles for modal if not present
    if (!document.getElementById('rocket-modal-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'rocket-modal-styles';
      styleEl.textContent = `
        #rocket-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: 'Courier New', Courier, monospace;
        }
        #rocket-modal {
          background: #000;
          border-radius: 4px;
          border: 1px solid #fff;
          max-width: 600px;
          width: 90%;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          color: #fff;
          font-family: 'Courier New', Courier, monospace;
        }
        #rocket-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #fff;
        }
        #rocket-modal-title {
          font-size: 16px;
          font-weight: normal;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-family: 'Courier New', Courier, monospace;
        }
        #rocket-modal-close-btn {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
          width: 24px;
          height: 24px;
          padding: 0;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }
        #rocket-modal-close-btn:hover {
          opacity: 0.6;
        }
        #rocket-modal-content {
          display: flex;
          flex-direction: column;
          padding: 12px;
          gap: 12px;
        }
        #rocket-preview-container {
          width: 100%;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          border-radius: 2px;
          border: 1px solid #fff;
        }
        #rocket-modal-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 12px;
        }
        #rocket-name-display {
          font-size: 14px;
          font-weight: normal;
          color: #fff;
          font-family: 'Courier New', Courier, monospace;
          text-align: center;
        }
        #rocket-switcher {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }
        #rocket-switcher button {
          padding: 6px 12px;
          background: #000;
          border: 1px solid #fff;
          border-radius: 2px;
          cursor: pointer;
          font-size: 12px;
          font-weight: normal;
          color: #fff;
          font-family: 'Courier New', Courier, monospace;
          transition: all 0.2s;
        }
        #rocket-switcher button:hover {
          background: #fff;
          color: #000;
        }
        #rocket-switcher button:active {
          opacity: 0.8;
        }
        #rocket-index-display {
          text-align: center;
          color: #aaa;
          font-size: 12px;
          font-family: 'Courier New', Courier, monospace;
          min-width: 80px;
        }
        #rocket-modal-tips {
          font-size: 11px;
          color: #666;
          font-family: 'Courier New', Courier, monospace;
          text-align: center;
        }
        #rocket-modal-actions {
          display: flex;
          gap: 20px;
          justify-content: center;
        }
        #rocket-modal-actions button {
          padding: 8px 16px;
          font-size: 12px;
          font-weight: normal;
          cursor: pointer;
          border-radius: 2px;
          border: 1px solid #fff;
          background: #000;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'Courier New', Courier, monospace;
          transition: all 0.2s;
        }
        #rocket-modal-actions button:hover {
          background: #fff;
          color: #000;
        }
        #rocket-modal-actions button:active {
          opacity: 0.8;
        }
      `;
      document.head.appendChild(styleEl);
    }
    // Inject modal HTML if not exists
    if (!document.getElementById('rocket-modal-overlay')) {
      const modalHTML = `
        <div id="rocket-modal-overlay" style="display: none;">
          <div id="rocket-modal">
            <div id="rocket-modal-header">
              <span id="rocket-modal-title">Select Rocket</span>
              <button id="rocket-modal-close-btn">×</button>
            </div>
            <div id="rocket-modal-content">
              <div id="rocket-preview-container">
                <div id="rocket-preview-canvas"></div>
              </div>
              <div id="rocket-modal-controls">
                <div id="rocket-name-display"></div>
                <div id="rocket-switcher">
                  <button id="rocket-prev-btn">◀</button>
                  <span id="rocket-index-display"></span>
                  <button id="rocket-next-btn">▶</button>
                </div>
                <div id="rocket-modal-tips">
                  Drag to rotate preview. Use arrows to switch rockets.
                </div>
                <div id="rocket-modal-actions">
                  <button id="rocket-confirm-btn">Confirm</button>
                  <button id="rocket-cancel-btn">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Add "Choose Rocket" button into physics controls panel
    const physicsControls = document.getElementById('physics-controls');
    if (physicsControls && !document.getElementById('rocket-select-button')) {
      const btn = document.createElement('button');
      btn.id = 'rocket-select-button';
      btn.textContent = 'Choose Rocket';
      btn.style.marginTop = '10px';
      btn.style.width = '100%';
      btn.style.padding = '6px 8px';
      btn.style.fontSize = '13px';
      btn.style.fontWeight = 'bold';
      btn.style.background = '#00ff00';
      btn.style.color = '#000';
      btn.style.border = '1px solid #00ff00';
      btn.style.borderRadius = '6px';
      btn.style.cursor = 'pointer';
      btn.style.boxShadow = '0 0 10px rgba(0,255,0,0.4)';

      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#00ffff';
        btn.style.boxShadow = '0 0 15px rgba(0,255,255,0.7)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#00ff00';
        btn.style.boxShadow = '0 0 10px rgba(0,255,0,0.4)';
      });

      btn.addEventListener('click', () => this.open(false));
      physicsControls.appendChild(btn);
    }

    // Set up preview Three.js scene
    const previewContainer = document.getElementById('rocket-preview-canvas');
    if (previewContainer && !this.rocketPreviewRenderer) {
      const width = 360;
      const height = 360;

      this.rocketPreviewScene = new THREE.Scene();
      this.rocketPreviewScene.background = new THREE.Color(0x000000);

      this.rocketPreviewCamera = new THREE.PerspectiveCamera(
        45,
        width / height,
        0.1,
        100
      );
      this.rocketPreviewCamera.position.set(0, 0, 4);

      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      this.rocketPreviewScene.add(ambient);
      const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
      dir1.position.set(5, 5, 5);
      this.rocketPreviewScene.add(dir1);
      const dir2 = new THREE.DirectionalLight(0x88aaff, 0.4);
      dir2.position.set(-3, -2, -4);
      this.rocketPreviewScene.add(dir2);

      this.rocketPreviewRoot = new THREE.Group();
      this.rocketPreviewScene.add(this.rocketPreviewRoot);

      this.rocketPreviewRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
      });
      this.rocketPreviewRenderer.setSize(width, height);
      this.rocketPreviewRenderer.setPixelRatio(window.devicePixelRatio);
      previewContainer.appendChild(this.rocketPreviewRenderer.domElement);

      const renderPreview = () => {
        requestAnimationFrame(renderPreview);
        if (this.rocketPreviewRoot) {
          this.rocketPreviewRoot.rotation.y = this.rocketPreviewRotation.yaw;
          this.rocketPreviewRoot.rotation.x = this.rocketPreviewRotation.pitch;
        }
        this.rocketPreviewRenderer.render(this.rocketPreviewScene, this.rocketPreviewCamera);
      };
      renderPreview();

      // Mouse drag to rotate preview model
      const canvasEl = this.rocketPreviewRenderer.domElement;
      canvasEl.style.cursor = 'grab';

      canvasEl.addEventListener('mousedown', (e) => {
        // 阻止事件传播到游戏场景
        e.stopPropagation();
        e.preventDefault();
        this.rocketPreviewIsDragging = true;
        this.rocketPreviewLastX = e.clientX;
        this.rocketPreviewLastY = e.clientY;
        canvasEl.style.cursor = 'grabbing';
      }, true); // 使用 capture 阶段

      // 使用命名函数以便后续移除监听器
      this.previewMouseMoveHandler = (e) => {
        // 只在预览画布内或正在拖拽时处理
        if (!this.rocketPreviewIsDragging) return;
        
        // 检查鼠标是否在预览画布内
        const rect = canvasEl.getBoundingClientRect();
        const isInsideCanvas = e.clientX >= rect.left && e.clientX <= rect.right &&
                               e.clientY >= rect.top && e.clientY <= rect.bottom;
        
        // 如果不在画布内，停止拖拽
        if (!isInsideCanvas) {
          this.rocketPreviewIsDragging = false;
          canvasEl.style.cursor = 'grab';
          return;
        }
        
        // 阻止事件传播到游戏场景
        e.stopPropagation();
        e.preventDefault();
        
        const dx = e.clientX - this.rocketPreviewLastX;
        const dy = e.clientY - this.rocketPreviewLastY;
        this.rocketPreviewLastX = e.clientX;
        this.rocketPreviewLastY = e.clientY;

        const rotSpeed = 0.01;
        this.rocketPreviewRotation.yaw += dx * rotSpeed;
        this.rocketPreviewRotation.pitch += dy * rotSpeed;
        const maxPitch = Math.PI / 2;
        this.rocketPreviewRotation.pitch = Math.max(
          -maxPitch,
          Math.min(maxPitch, this.rocketPreviewRotation.pitch)
        );
      };

      this.previewMouseUpHandler = (e) => {
        // 如果正在拖拽，无论鼠标在哪里都停止拖拽
        if (this.rocketPreviewIsDragging) {
          // 阻止事件传播到游戏场景
          e.stopPropagation();
          e.preventDefault();
          this.rocketPreviewIsDragging = false;
          canvasEl.style.cursor = 'grab';
        }
      };

      // 使用 capture 阶段捕获事件，确保先于游戏场景处理
      document.addEventListener('mousemove', this.previewMouseMoveHandler, true);
      document.addEventListener('mouseup', this.previewMouseUpHandler, true);
    }

    // Wire modal buttons
    const closeBtn = document.getElementById('rocket-modal-close-btn');
    const cancelBtn = document.getElementById('rocket-cancel-btn');
    const confirmBtn = document.getElementById('rocket-confirm-btn');
    const prevBtn = document.getElementById('rocket-prev-btn');
    const nextBtn = document.getElementById('rocket-next-btn');

    if (closeBtn) closeBtn.onclick = () => this.close(false);
    if (cancelBtn) cancelBtn.onclick = () => this.close(false);
    if (confirmBtn) confirmBtn.onclick = () => this.close(true);
    if (prevBtn) prevBtn.onclick = () => this.changeRocket(-1);
    if (nextBtn) nextBtn.onclick = () => this.changeRocket(1);

    this.updateRocketModalText();

    // Intercept first START MISSION click to open selector before game starts
    const startBtn = document.getElementById('start-button');
    if (startBtn && !startBtn.dataset.rocketSelectorBound) {
      startBtn.dataset.rocketSelectorBound = '1';
      startBtn.addEventListener('click', (e) => {
        // If game hasn't started yet, show rocket selector instead of starting immediately
        if (this.game && !this.game.gameStarted) {
          e.preventDefault();
          e.stopPropagation();
          this.open(true);
        }
      });
    }
  }

  /**
   * Open rocket selector modal
   * @param {boolean} fromStartButton
   */
  open(fromStartButton = false) {
    console.log('RocketSelector.open() called, fromStartButton:', fromStartButton);
    console.log('this._isOpen:', this._isOpen);
    console.log('this.game:', this.game);
    
    if (this._isOpen) {
      console.log('Rocket selector is already open');
      return;
    }

    // 确保setupUI已经被调用
    if (!document.getElementById('rocket-modal-overlay')) {
      console.log('Modal overlay not found, calling setupUI...');
      this.setupUI();
    }

    this._isOpen = true;
    this.pendingStartAfterRocketSelect = fromStartButton;
    
    // 只有在游戏已初始化时才设置暂停状态
    if (this.game) {
      this.prevPausedState = this.game.isPaused !== undefined ? this.game.isPaused : false;
      if (this.game.isPaused !== undefined) {
        this.game.isPaused = true;
      }
    } else {
      this.prevPausedState = false;
    }

    // 保存游戏场景的相机状态
    if (this.game) {
      this.savedCameraState = {
        cameraYaw: this.game.cameraYaw || 0,
        cameraPitch: this.game.cameraPitch || Math.PI / 4,
        cameraDistance: this.game.cameraDistance || 200,
        cameraLookAtPoint: this.game.cameraLookAtPoint ? this.game.cameraLookAtPoint.clone() : new THREE.Vector3(0, 0, 0),
        cameraFollowTarget: this.game.cameraFollowTarget || null,
        cameraManualControl: this.game.cameraManualControl !== undefined ? this.game.cameraManualControl : false
      };
    }

    const overlay = document.getElementById('rocket-modal-overlay');
    if (overlay) {
      console.log('Found modal overlay, displaying...');
      overlay.style.display = 'flex';
      this.updateRocketModalText();
      this.loadRocketModelForPreview(this.currentRocketIndex);
    } else {
      console.error('Failed to create rocket modal overlay after setupUI');
      this._isOpen = false;
      alert('无法创建火箭选择器界面。请刷新页面。');
    }
  }

  /**
   * Close rocket selector modal
   * @param {boolean} applySelection
   */
  close(applySelection) {
    const overlay = document.getElementById('rocket-modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }

    if (applySelection) {
      this.applyCurrentRocketToGame();
    }

    // 恢复游戏场景的相机状态
    if (this.game && this.savedCameraState) {
      this.game.cameraYaw = this.savedCameraState.cameraYaw;
      this.game.cameraPitch = this.savedCameraState.cameraPitch;
      this.game.cameraDistance = this.savedCameraState.cameraDistance;
      if (this.game.cameraLookAtPoint && this.savedCameraState.cameraLookAtPoint) {
        this.game.cameraLookAtPoint.copy(this.savedCameraState.cameraLookAtPoint);
      }
      this.game.cameraFollowTarget = this.savedCameraState.cameraFollowTarget;
      if (this.game.cameraManualControl !== undefined) {
        this.game.cameraManualControl = this.savedCameraState.cameraManualControl;
      }
      this.savedCameraState = null;
    }

    this._isOpen = false;
    this.game.isPaused = this.prevPausedState;

    if (applySelection && this.pendingStartAfterRocketSelect && !this.game.gameStarted) {
      this.game.startGame();
    }
    this.pendingStartAfterRocketSelect = false;
  }

  changeRocket(delta) {
    const total = this.rocketConfigs.length;
    this.currentRocketIndex = (this.currentRocketIndex + delta + total) % total;
    this.updateRocketModalText();
    this.loadRocketModelForPreview(this.currentRocketIndex);
  }

  updateRocketModalText() {
    const nameEl = document.getElementById('rocket-name-display');
    const indexEl = document.getElementById('rocket-index-display');
    const cfg = this.rocketConfigs[this.currentRocketIndex];
    if (nameEl && cfg) {
      nameEl.textContent = cfg.name;
    }
    if (indexEl) {
      indexEl.textContent = `${this.currentRocketIndex + 1} / ${this.rocketConfigs.length}`;
    }
  }

  loadRocketModelForPreview(index) {
    const cfg = this.rocketConfigs[index];
    if (!cfg) return;

    const cached = this.loadedRocketModels.get(cfg.id);
    if (cached) {
      this.setPreviewModelFromCache(cached);
      return;
    }

    this.gltfLoader.load(
      cfg.path,
      (gltf) => {
        const model = gltf.scene || gltf.scenes[0];
        if (!model) return;

        // Ensure transforms are up to date before measuring
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = 2.0;
        const scale = targetSize / maxDim;

        const cacheEntry = {
          scene: model,
          scale,
          center
        };
        this.loadedRocketModels.set(cfg.id, cacheEntry);

        this.setPreviewModelFromCache(cacheEntry);
      },
      undefined,
      (err) => {
        console.error('Failed to load rocket model:', cfg.path, err);
      }
    );
  }

  setPreviewModelFromCache(cacheEntry) {
    if (!this.rocketPreviewRoot) return;

    while (this.rocketPreviewRoot.children.length > 0) {
      this.rocketPreviewRoot.remove(this.rocketPreviewRoot.children[0]);
    }

    const previewModel = cacheEntry.scene.clone(true);
    previewModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    previewModel.scale.setScalar(cacheEntry.scale);
    // Recenter model so its bounding-box center sits at origin after scaling
    previewModel.position.copy(cacheEntry.center).multiplyScalar(-cacheEntry.scale);

    this.rocketPreviewRoot.add(previewModel);
    this.rocketPreviewCurrentMesh = previewModel;
  }

  applyCurrentRocketToGame() {
    const cfg = this.rocketConfigs[this.currentRocketIndex];
    if (!cfg) return;

    // 将当前火箭的火焰旋转偏移传递给游戏实例
    if (this.game && cfg.flameRotationOffset) {
      this.game.currentFlameRotationOffset = new THREE.Euler(
        cfg.flameRotationOffset[0],
        cfg.flameRotationOffset[1],
        cfg.flameRotationOffset[2],
        'XYZ'
      );
      console.log(`🚀 设置火箭 "${cfg.name}" 的火焰旋转偏移: (${(cfg.flameRotationOffset[0] * 180 / Math.PI).toFixed(1)}°, ${(cfg.flameRotationOffset[1] * 180 / Math.PI).toFixed(1)}°, ${(cfg.flameRotationOffset[2] * 180 / Math.PI).toFixed(1)}°)`);
    }
    
    // 将当前火箭的火焰位置偏移传递给游戏实例
    if (this.game && cfg.flamePositionOffset) {
      this.game.currentFlamePositionOffset = new THREE.Vector3(
        cfg.flamePositionOffset[0],
        cfg.flamePositionOffset[1],
        cfg.flamePositionOffset[2]
      );
      console.log(`📍 设置火箭 "${cfg.name}" 的火焰位置偏移: (${cfg.flamePositionOffset[0].toFixed(3)}, ${cfg.flamePositionOffset[1].toFixed(3)}, ${cfg.flamePositionOffset[2].toFixed(3)})`);
    }

    const cached = this.loadedRocketModels.get(cfg.id);
    if (!cached) {
      // 如果模型还没加载，先加载它，加载完成后再应用
      console.log(`📦 正在加载模型: ${cfg.name}...`);
      this.gltfLoader.load(
        cfg.path,
        (gltf) => {
          const model = gltf.scene || gltf.scenes[0];
          if (!model) return;

          // Ensure transforms are up to date before measuring
          model.updateMatrixWorld(true);

          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);

          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const targetSize = 2.0;
          const scale = targetSize / maxDim;

          const cacheEntry = {
            scene: model,
            scale,
            center
          };
          this.loadedRocketModels.set(cfg.id, cacheEntry);
          
          // 模型加载完成后，再次调用applyCurrentRocketToGame来应用
          console.log(`✅ 模型加载完成: ${cfg.name}，正在应用...`);
          this.applyCurrentRocketToGame();
        },
        undefined,
        (err) => {
          console.error('Failed to load rocket model:', cfg.path, err);
        }
      );
      return;
    }

    const spaceship = this.game.spaceship;
    const renderParent = this.game.spaceshipRender || spaceship;
    if (!renderParent || !spaceship) {
      console.warn('⚠️ applyCurrentRocketToGame: spaceship或spaceshipRender不存在，无法应用模型');
      console.warn('   spaceship存在?', !!spaceship);
      console.warn('   spaceshipRender存在?', !!this.game.spaceshipRender);
      console.warn('   renderParent存在?', !!renderParent);
      return;
    }
    
    console.log('✅ applyCurrentRocketToGame: 开始应用模型', cfg.name);

    if (this.game.spaceshipVisual) {
      renderParent.remove(this.game.spaceshipVisual);
    }

    const gameModel = cached.scene.clone(true);
    gameModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    gameModel.scale.setScalar(cached.scale);
    // Recenter model to origin after scaling so it sits at the spaceship pivot
    gameModel.position.copy(cached.center).multiplyScalar(-cached.scale);

    // Per-rocket orientation fixes so that long axis roughly对准飞船前进方向 (-Z)
    if (cfg.id === 'shuttle') {
      // Shuttle：保持竖直，只翻转朝向
      gameModel.rotation.set(0, Math.PI, 0);
    } else if (cfg.id === 'saturnV' || cfg.id === 'explorer') {
      // Saturn V / Explorer：从竖直“放倒”成水平
      gameModel.rotation.set(Math.PI / 2, 0, 0);
    }

    // After rotation, recompute bounding box center and recenter to avoid offset drift
    gameModel.updateMatrixWorld(true);
    const rotatedBox = new THREE.Box3().setFromObject(gameModel);
    const rotatedCenter = new THREE.Vector3();
    rotatedBox.getCenter(rotatedCenter);
    gameModel.position.sub(rotatedCenter);

    // 为每个导入的火箭模型准备喷口锚点：
    // 1）如果模型本身有名为 engineGlow 或 engineFlow 的节点，优先使用它（并统一重命名为 engineGlow）；
    // 2）否则自动在尾部创建一个默认的 engineGlow。
    let explicitEngine = gameModel.getObjectByName('engineGlow') || gameModel.getObjectByName('engineFlow');
    if (explicitEngine) {
      explicitEngine.name = 'engineGlow';
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔥 找到 GLB 模型中的 engineGlow 节点！');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`节点名称: ${explicitEngine.name}`);
      console.log(`节点类型: ${explicitEngine.type}`);
      console.log(`本地位置: (${explicitEngine.position.x.toFixed(3)}, ${explicitEngine.position.y.toFixed(3)}, ${explicitEngine.position.z.toFixed(3)})`);
      console.log(`本地旋转: (${explicitEngine.rotation.x.toFixed(3)}, ${explicitEngine.rotation.y.toFixed(3)}, ${explicitEngine.rotation.z.toFixed(3)})`);
      console.log(`本地缩放: (${explicitEngine.scale.x.toFixed(3)}, ${explicitEngine.scale.y.toFixed(3)}, ${explicitEngine.scale.z.toFixed(3)})`);
      
      // 计算世界坐标
      explicitEngine.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3();
      explicitEngine.getWorldPosition(worldPos);
      console.log(`世界位置: (${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)})`);
      
      // 打印父节点信息
      if (explicitEngine.parent) {
        console.log(`父节点: ${explicitEngine.parent.name || explicitEngine.parent.type}`);
      }
      
      // 打印子节点信息
      if (explicitEngine.children.length > 0) {
        console.log(`子节点数量: ${explicitEngine.children.length}`);
        explicitEngine.children.forEach((child, idx) => {
          console.log(`  子节点 ${idx}: ${child.name || child.type} (${child.type})`);
        });
      }
      
      // 如果是 Mesh，打印材质信息
      if (explicitEngine.isMesh) {
        console.log(`材质类型: ${explicitEngine.material?.type || 'N/A'}`);
        if (explicitEngine.material) {
          console.log(`材质颜色: ${explicitEngine.material.color?.getHexString() || 'N/A'}`);
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      const size = new THREE.Vector3();
      rotatedBox.getSize(size);
      const engineAnchor = new THREE.Object3D();
      engineAnchor.name = 'engineGlow';
      const tailOffset = Math.max(0.2, size.length() * 0.05);
      // 约定：长轴已经旋转到大致沿 -Z 为飞船前进方向，尾部在 -Z 方向
      engineAnchor.position.set(
        rotatedCenter.x,
        rotatedCenter.y,
        rotatedCenter.z - size.z * 0.5 - tailOffset
      );
      gameModel.add(engineAnchor);
      console.log('⚠️  未找到 GLB 模型中的 engineGlow 节点，已创建默认锚点');
      console.log(`默认锚点位置: (${engineAnchor.position.x.toFixed(3)}, ${engineAnchor.position.y.toFixed(3)}, ${engineAnchor.position.z.toFixed(3)})`);
    }

    this.game.spaceshipVisual = new THREE.Group();
    this.game.spaceshipVisual.position.set(0, 0, 0);
    this.game.spaceshipVisual.rotation.set(0, 0, 0);
    this.game.spaceshipVisual.visible = true; // Ensure it's visible when rocket is loaded
    this.game.spaceshipVisual.add(gameModel);
    renderParent.add(this.game.spaceshipVisual);

    // 立即刷新spaceship位置，跳过平滑插值（避免从屏幕外缓慢移动）
    if (this.game.spaceship && this.game.physics && this.game.physics.spacecraft) {
      // 直接设置平滑位置为当前物理位置（Sun frame），跳过lerp
      // IMPORTANT: Use physics position directly, not spaceship.position which includes frameOffset
      this.game.spaceshipSmoothPos.copy(this.game.physics.spacecraft.position);
      this.game.spaceshipSmoothQuat.copy(this.game.spaceship.quaternion);
      // 立即更新render位置（frameOffset会在updateReferenceFrame中添加）
      if (this.game.spaceshipRender) {
        // 需要先更新reference frame offset
        if (this.game.updateReferenceFrame) {
          this.game.updateReferenceFrame();
        } else {
          // 如果updateReferenceFrame还没调用，手动添加frameOffset
          this.game.spaceshipRender.position.copy(this.game.spaceshipSmoothPos).add(this.game.frameOffset || new THREE.Vector3(0, 0, 0));
          this.game.spaceshipRender.quaternion.copy(this.game.spaceshipSmoothQuat);
        }
      }
      console.log('📍 火箭位置已立即刷新到真实坐标');
    }

    if (this.game.flameManager && typeof this.game.flameManager.refreshEngineEffects === 'function') {
      this.game.flameManager.refreshEngineEffects();
    }
    
    console.log(`✅ 模型 "${cfg.name}" 已成功应用到游戏场景`);
  }
}
 
// 自动挂接到全局 SpaceGame 实例
function initializeRocketSelector() {
  const game = window.__spaceGame || window.game;
  if (!game) {
    console.warn('Game instance not found, will retry...');
    // 如果游戏还没创建，稍后重试
    setTimeout(initializeRocketSelector, 100);
    return;
  }

  // 如果已经初始化过，不再重复初始化
  if (window.__rocketSelector) {
    console.log('Rocket selector already initialized');
    return;
  }

  console.log('Initializing rocket selector...');
  const selector = new RocketSelector(game);
  window.__rocketSelector = selector;
  selector.setupUI();
  
  // 预加载默认的 Explorer 模型（无论游戏是否已启动）
  const explorerConfig = selector.rocketConfigs[0]; // Explorer
  if (explorerConfig && !selector.loadedRocketModels.get(explorerConfig.id)) {
    console.log('📦 预加载默认的 Explorer 模型...');
    selector.gltfLoader.load(
      explorerConfig.path,
      (gltf) => {
        const model = gltf.scene || gltf.scenes[0];
        if (!model) {
          console.error('❌ Explorer 模型加载失败：gltf.scene为空');
          return;
        }

        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = 2.0;
        const scale = targetSize / maxDim;

        const cacheEntry = {
          scene: model,
          scale,
          center
        };
        selector.loadedRocketModels.set(explorerConfig.id, cacheEntry);
        console.log('✅ Explorer 模型预加载完成');
        
        // 尝试应用模型（无论游戏是否已启动，只要对象存在就应用）
        const tryApply = () => {
          if (game.spaceship && game.spaceshipRender) {
            console.log('🚀 应用默认的 Explorer（替换占位模型）...');
            selector.applyCurrentRocketToGame();
            return true;
          }
          return false;
        };
        
        // 立即尝试应用
        if (!tryApply()) {
          // 如果对象还没准备好，延迟重试
          console.log('⏳ 游戏对象未准备好，延迟应用模型...');
          setTimeout(() => {
            if (!tryApply()) {
              // 再试一次
              setTimeout(() => tryApply(), 500);
            }
          }, 300);
        }
      },
      undefined,
      (err) => {
        console.error('Failed to preload Explorer model:', explorerConfig.path, err);
      }
    );
  } else if (explorerConfig && selector.loadedRocketModels.get(explorerConfig.id)) {
    // 模型已经缓存，尝试应用（无论游戏是否已启动）
    const tryApply = () => {
      if (game.spaceship && game.spaceshipRender) {
        console.log('🚀 应用默认的 Explorer（模型已缓存）...');
        selector.applyCurrentRocketToGame();
        return true;
      }
      return false;
    };
    
    if (!tryApply()) {
      // 如果对象还没准备好，延迟重试
      setTimeout(() => {
        if (!tryApply()) {
          setTimeout(() => tryApply(), 500);
        }
      }, 300);
    }
  }
  
  // 监听游戏启动事件，确保在游戏启动时应用默认飞船
  // 如果游戏还没启动，等待游戏启动后再应用
  if (!game.gameStarted) {
    const originalStartGame = game.startGame;
    if (originalStartGame) {
      game.startGame = function() {
        originalStartGame.call(this);
        // 游戏启动后，尝试应用默认的Explorer
        const tryApply = () => {
          if (window.__rocketSelector && this.spaceship && this.spaceshipRender) {
            const selector = window.__rocketSelector;
            const explorerConfig = selector.rocketConfigs[0];
            const cached = selector.loadedRocketModels.get(explorerConfig.id);
            if (cached && selector.currentRocketIndex === 0) {
              console.log('🚀 游戏启动后应用默认的 Explorer...');
              selector.applyCurrentRocketToGame();
              return true;
            }
          }
          return false;
        };
        
        setTimeout(() => {
          if (!tryApply()) {
            // 再试一次
            setTimeout(() => tryApply(), 500);
          }
        }, 200);
      };
    }
  }
}

// 尝试立即初始化（如果DOM已经加载）
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeRocketSelector);
} else {
  // DOM已经加载完成，立即初始化
  initializeRocketSelector();
}

