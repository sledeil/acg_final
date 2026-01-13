import * as THREE from 'three';

/**
 * CameraController - 负责相机控制（跟随、缩放、旋转、平移）
 */
export class CameraController {
  constructor(game) {
    this.game = game;

    // Camera control state
    this.cameraYaw = 0;
    this.cameraPitch = Math.PI / 4; // Start at 45 degree angle
    this.cameraDistance = 200; // Start closer to see spaceship
    this.cameraFollowTarget = null; // Current camera follow target (any celestial body mesh or spaceship)
    this.cameraManualControl = false; // Whether camera is manually controlled
    this.cameraLookAtPoint = new THREE.Vector3(0, 0, 0);
    this.minCameraDistance = 5;
    this.maxCameraDistance = 50000;
    this.recentCollisionTime = 0; // Track time since last collision to prevent camera jumps

    // Mouse state
    this.isDragging = false;
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
  }

  /**
   * Setup camera controls
   */
  setupControls() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      // Skip all handling when save/load menu is open
      if (this.game.saveLoadUI && this.game.saveLoadUI.isOpen) {
        return;
      }

      // ========== Camera Controls ==========
      // 'C' key to focus/zoom on spaceship
      if (e.code === 'KeyC') {
        this.cameraDistance = 100; // Zoom closer
        // 显式跟随飞船
        if (this.game.spaceship) {
          this.cameraFollowTarget = this.game.spaceship;
          this.cameraManualControl = false;
          this.cameraLookAtPoint.copy(this.game.spaceship.position);
        }
        console.log('Camera focused on spaceship');
      }

      // 'Z' key to zoom out far
      if (e.code === 'KeyZ') {
        this.cameraDistance = 5000; // Zoom way out
        console.log('Camera zoomed out');
      }

      // 'H' key to look at Sun (home/center)
      if (e.code === 'KeyH') {
        this.cameraLookAtPoint.set(0, 0, 0); // Sun at origin
        this.cameraManualControl = true;
        // 回到总览，取消跟随
        this.cameraFollowTarget = null;
        this.cameraDistance = 20000; // Far view
        console.log('Camera looking at Sun (center)');
      }

      // Number keys to view different planets
      if (e.code === 'Digit1' && this.game.celestialManager.sunBody) {
        this.cameraFollowTarget = this.game.celestialManager.sunBody.mesh;
        this.cameraLookAtPoint.copy(this.game.celestialManager.sunBody.mesh.position);
        this.cameraManualControl = false;
        this.cameraDistance = 1000;
        console.log('Viewing: Sun');
      }
      if (e.code === 'Digit2' && this.game.celestialManager.mercuryBody) {
        this.cameraFollowTarget = this.game.celestialManager.mercuryBody.mesh;
        this.cameraLookAtPoint.copy(this.game.celestialManager.mercuryBody.mesh.position);
        this.cameraManualControl = false;
        this.cameraDistance = 200;
        console.log('Viewing: Mercury');
      }
      if (e.code === 'Digit3' && this.game.celestialManager.venusBody) {
        this.cameraFollowTarget = this.game.celestialManager.venusBody.mesh;
        this.cameraLookAtPoint.copy(this.game.celestialManager.venusBody.mesh.position);
        this.cameraManualControl = false;
        this.cameraDistance = 300;
        console.log('Viewing: Venus');
      }
      if (e.code === 'Digit4' && this.game.celestialManager.earthBody) {
        this.cameraFollowTarget = this.game.celestialManager.earthBody.mesh;
        this.cameraLookAtPoint.copy(this.game.celestialManager.earthBody.mesh.position);
        this.cameraManualControl = false;
        this.cameraDistance = 40;
        console.log('Viewing: Earth');
      }
      if (e.code === 'Digit5' && this.game.celestialManager.moonBody) {
        this.cameraFollowTarget = this.game.celestialManager.moonBody.mesh;
        this.cameraLookAtPoint.copy(this.game.celestialManager.moonBody.mesh.position);
        this.cameraManualControl = false;
        this.cameraDistance = 10;
        console.log('Viewing: Moon');
      }
      if (e.code === 'Digit6' && this.game.celestialManager.marsBody) {
        this.cameraFollowTarget = this.game.celestialManager.marsBody.mesh;
        this.cameraLookAtPoint.copy(this.game.celestialManager.marsBody.mesh.position);
        this.cameraManualControl = false;
        this.cameraDistance = 250;
        console.log('Viewing: Mars');
      }
      if (e.code === 'Digit7' && this.game.celestialManager.phobosBody) {
        this.cameraFollowTarget = this.game.celestialManager.phobosBody.mesh;
        this.cameraLookAtPoint.copy(this.game.celestialManager.phobosBody.mesh.position);
        this.cameraManualControl = false;
        this.cameraDistance = 80;
        console.log('Viewing: Phobos');
      }
      if (e.code === 'Digit8' && this.game.celestialManager.jupiterBody) {
        this.cameraFollowTarget = this.game.celestialManager.jupiterBody.mesh;
        this.cameraLookAtPoint.copy(this.game.celestialManager.jupiterBody.mesh.position);
        this.cameraManualControl = false;
        this.cameraDistance = 600;
        console.log('Viewing: Jupiter');
      }
      if (e.code === 'Digit9' && this.game.spaceship) {
        this.cameraFollowTarget = this.game.spaceship;
        this.cameraLookAtPoint.copy(this.game.spaceship.position);
        this.cameraManualControl = false;
        this.cameraDistance = 20;
        console.log('Viewing: Spaceship');
      }
      if (e.code === 'Digit0' && this.game.celestialManager.halleyBody) {
        this.cameraFollowTarget = this.game.celestialManager.halleyBody.mesh;
        this.cameraLookAtPoint.copy(this.game.celestialManager.halleyBody.mesh.position);
        this.cameraManualControl = false;
        this.cameraDistance = 300;
        console.log('Viewing: Halley\'s Comet');
      }
    });

    // Mouse controls: Left button = rotate, Middle button = pan
    // 辅助函数：检查事件目标是否在火箭选择模态框内
    const isInsideRocketModal = (target) => {
      if (!target) return false;
      const modalOverlay = document.getElementById('rocket-modal-overlay');
      if (!modalOverlay) return false;
      // 检查目标或其父元素是否是模态框的一部分
      let element = target;
      while (element && element !== document.body) {
        if (element === modalOverlay || element.closest('#rocket-modal-overlay')) {
          return true;
        }
        element = element.parentElement;
      }
      return false;
    };

    document.addEventListener('mousedown', (e) => {
      // 如果点击在火箭选择模态框内，忽略事件
      if (isInsideRocketModal(e.target)) {
        return;
      }

      // Don't start drag on UI elements
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

      if (e.button === 0) { // Left button - rotate
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      } else if (e.button === 1) { // Middle button - pan
        e.preventDefault(); // Prevent default middle-click behavior
        this.isPanning = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        // 中键平移视角时，切换为手动并解除自动跟随
        this.cameraManualControl = true;
        this.cameraFollowTarget = null;
      }
    });

    document.addEventListener('mousemove', (e) => {
      // 如果鼠标在火箭选择模态框内，忽略事件
      if (isInsideRocketModal(e.target)) {
        // 重置拖拽状态，防止状态不一致
        if (this.isDragging) this.isDragging = false;
        if (this.isPanning) this.isPanning = false;
        return;
      }

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      if (this.isDragging) {
        // Left button: Rotate camera
        this.cameraManualControl = true;

        const sensitivity = 0.01;
        this.cameraYaw -= deltaX * sensitivity;
        this.cameraPitch -= deltaY * sensitivity;

        // Limit pitch to prevent gimbal lock and horizontal view issues
        const maxPitch = Math.PI * 0.44; // About 80 degrees
        this.cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, this.cameraPitch));
      } else if (this.isPanning) {
        // Middle button: Pan camera (move look-at point)
        this.cameraManualControl = true;

        // Calculate camera's right and up vectors
        const forward = new THREE.Vector3()
          .subVectors(this.cameraLookAtPoint, this.game.camera.position)
          .normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        // Pan speed scales with distance (further = faster pan)
        const panSpeed = this.cameraDistance * 0.001;

        // Move look-at point based on mouse movement
        const panOffset = new THREE.Vector3();
        panOffset.add(right.multiplyScalar(-deltaX * panSpeed));
        panOffset.add(up.multiplyScalar(deltaY * panSpeed));

        this.cameraLookAtPoint.add(panOffset);
      }

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    document.addEventListener('mouseup', (e) => {
      // 如果鼠标在火箭选择模态框内，忽略事件
      if (isInsideRocketModal(e.target)) {
        return;
      }

      if (e.button === 0) this.isDragging = false;
      if (e.button === 1) this.isPanning = false;
    });

    // Mouse wheel for zoom (works ALWAYS, even without pointer lock)
    window.addEventListener('wheel', (e) => {
      // 如果鼠标在火箭选择模态框内，忽略事件
      if (isInsideRocketModal(e.target)) {
        return;
      }

      e.preventDefault();

      // Logarithmic zoom: faster when far, slower when close (more natural)
      const zoomSpeed = Math.max(1, this.cameraDistance * 0.001); // 0.1% of current distance
      this.cameraDistance += e.deltaY * zoomSpeed;

      // Clamp camera distance
      this.cameraDistance = Math.max(this.minCameraDistance,
                                      Math.min(this.maxCameraDistance, this.cameraDistance));

      console.log(`Camera distance: ${Math.round(this.cameraDistance)}`);
    }, { passive: false });
  }

  /**
   * Update camera position to follow target
   */
  updateCameraPosition() {
    // 优先跟随显式目标，其次在非手动时默认跟随飞船
    if (this.cameraFollowTarget && this.cameraFollowTarget.position) {
      this.cameraLookAtPoint.copy(this.cameraFollowTarget.position);
    } else if (!this.cameraManualControl && this.game.spaceshipRender) {
      this.cameraLookAtPoint.copy(this.game.spaceshipRender.position);
    }

    // Ensure camera distance is valid (prevent camera being at lookAt point)
    const safeCameraDistance = Math.max(this.cameraDistance, 10);

    // Calculate camera position using spherical coordinates around lookAt point
    const offset = new THREE.Vector3();
    offset.x = safeCameraDistance * Math.sin(this.cameraPitch) * Math.cos(this.cameraYaw);
    offset.y = safeCameraDistance * Math.cos(this.cameraPitch);
    offset.z = safeCameraDistance * Math.sin(this.cameraPitch) * Math.sin(this.cameraYaw);

    // IMPORTANT: Ensure minimum Y offset to prevent horizontal viewing issues
    // When looking horizontally, camera at y=0 causes rendering problems
    const minYOffset = safeCameraDistance * 0.05; // At least 5% of distance above/below
    if (Math.abs(offset.y) < minYOffset) {
      offset.y = offset.y >= 0 ? minYOffset : -minYOffset;
    }

    // Ensure offset has minimum length to prevent camera at lookAt point
    if (offset.lengthSq() < 1) {
      offset.set(0, 10, 0); // Default: camera above lookAt point
    }

    this.game.camera.position.copy(this.cameraLookAtPoint).add(offset);
    this.game.camera.lookAt(this.cameraLookAtPoint);

    // Update camera matrices
    this.game.camera.updateMatrixWorld();
  }

  /**
   * Ensure camera follows spaceship when adjusting velocity
   */
  ensureFollowingSpaceship() {
    if (!this.cameraFollowTarget || this.cameraFollowTarget !== this.game.spaceship) {
      this.cameraFollowTarget = this.game.spaceship;
      this.cameraManualControl = false;
    }
  }

  /**
   * Handle collision camera reset
   */
  handleCollision() {
    // Only reset camera if it wasn't already in manual control mode
    // (don't interrupt user's manual panning/rotation)
    if (!this.cameraManualControl) {
      if (!this.cameraFollowTarget || this.cameraFollowTarget !== this.game.spaceship) {
        this.cameraFollowTarget = this.game.spaceship;
      }
    }
    this.recentCollisionTime = 1.0; // Lock camera settings for 1 second after collision
  }

  /**
   * Update collision timer (called per frame)
   */
  updateCollisionTimer(deltaTime) {
    if (this.recentCollisionTime > 0) {
      this.recentCollisionTime = Math.max(0, this.recentCollisionTime - deltaTime);
    }
  }

  /**
   * Get camera state for saving
   */
  getCameraState() {
    return {
      position: this.game.camera.position.toArray(),
      rotation: this.game.camera.rotation.toArray(),
      fov: this.game.camera.fov
    };
  }

  /**
   * Restore camera state from save data
   */
  restoreCameraState(cameraState) {
    this.game.camera.position.fromArray(cameraState.position);
    this.game.camera.rotation.fromArray(cameraState.rotation);
    this.game.camera.fov = cameraState.fov;
    this.game.camera.updateProjectionMatrix();
  }
}
