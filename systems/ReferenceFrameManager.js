import * as THREE from 'three';

/**
 * ReferenceFrameManager - 负责参考系管理（太阳系、地球系、月球系）
 */
export class ReferenceFrameManager {
  constructor(game) {
    this.game = game;

    // Reference frame state
    this.referenceFrame = 'sun'; // 'sun', 'earth', 'moon'
    this.frameOffset = new THREE.Vector3(0, 0, 0);
    this.frameRotation = new THREE.Vector3(0, 0, 0);
    this.referenceFrameJustChanged = false; // Flag for instant position update after frame change
  }

  /**
   * Setup reference frame controls
   */
  setupControls() {
    // 'F' key to toggle reference frame
    window.addEventListener('keydown', (e) => {
      // Skip when save/load menu is open
      if (this.game.saveLoadUI && this.game.saveLoadUI.isOpen) {
        return;
      }

      if (e.code === 'KeyF') {
        const frames = ['sun', 'earth', 'moon'];
        const currentIndex = frames.indexOf(this.referenceFrame);
        const nextIndex = (currentIndex + 1) % frames.length;
        this.referenceFrame = frames[nextIndex];

        // Set flag to indicate reference frame just changed (for instant position update)
        this.referenceFrameJustChanged = true;

        // Don't clear trails - the updateOrbitTrails function handles reference frame transformation
        // by using time-matched positions from reference body's trail

        // If we're paused with trajectory showing, recalculate for new frame
        if (this.game.isPaused && this.game.trajectoryManager.trajectoryLine.visible) {
          this.game.trajectoryManager.updateTrajectoryPrediction();
        }

        console.log(`🌍 Reference frame switched to: ${this.referenceFrame.toUpperCase()}`);
        if (this.referenceFrame === 'earth') {
          console.log('   → Earth is now stationary, everything moves relative to Earth');
          console.log('   → Watch how the Moon orbits around Earth!');
        } else if (this.referenceFrame === 'moon') {
          console.log('   → Moon is now stationary, everything moves relative to Moon');
          console.log('   → Perfect for seeing Moon capture trajectories!');
        } else {
          console.log('   → Sun is stationary (inertial frame)');
          console.log('   → Everything orbits the Sun');
        }
      }
    });
  }

  /**
   * Update reference frame offset and apply to all objects
   */
  updateReferenceFrame() {
    // Calculate frame offset based on reference body
    // Physics stays in Sun frame, but we translate everything for visualization
    // IMPORTANT: Use physics position, not mesh position!
    if (this.referenceFrame === 'earth' && this.game.earthBody) {
      this.frameOffset.copy(this.game.earthBody.position).negate();
      /*
      const earthSunRelativePos = this.game.earthBody.position.clone().sub(this.game.sunBody.position);
      const earthSunRelativeVel = this.game.earthBody.velocity.clone().sub(this.game.sunBody.velocity);
      this.frameRotation.copy(earthSunRelativeVel).cross(earthSunRelativePos).divideScalar(earthSunRelativePos.lengthSq());
      this.frameOffset.copy(this.frameRotation).cross(earthSunRelativePos).sub(this.game.sunBody.velocity);
      */
    } else if (this.referenceFrame === 'moon' && this.game.moonBody) {
      this.frameOffset.copy(this.game.moonBody.position).negate();
      /*
      const moonEarthRelativePos = this.game.moonBody.position.clone().sub(this.game.earthBody.position);
      const moonEarthRelativeVel = this.game.moonBody.velocity.clone().sub(this.game.earthBody.velocity);
      this.frameRotation.copy(moonEarthRelativeVel).cross(moonEarthRelativePos).divideScalar(moonEarthRelativePos.lengthSq());
      this.frameOffset.copy(this.frameRotation).cross(moonEarthRelativePos).sub(this.game.earthBody.velocity);
      */
    } else {
      // Sun frame (inertial)
      this.frameOffset.set(0, 0, 0);
      // this.frameRotation.set(0, 0, 0);
    }

    // Apply offset to all celestial bodies (visual only, physics positions unchanged)
    for (const body of this.game.physics.celestialBodies) {
      if (body.mesh) {
        // Store the physics position temporarily
        const physicsPos = body.position.clone();
        // Set visual position = physics position + frame offset
        body.mesh.position.copy(physicsPos).add(this.frameOffset);
      }
    }

    // 同步更新太阳光源位置，使其始终跟随太阳mesh的位置
    // 太阳光源不应该因为参考系切换而移动，应该始终在太阳的位置
    if (this.game.sunLight && this.game.sunBody && this.game.sunBody.mesh) {
      this.game.sunLight.position.copy(this.game.sunBody.mesh.position);
    }

    // Apply offset to spaceship physics anchor (for HUD logic)
    if (this.game.spaceship && this.game.physics.spacecraft) {
      const physicsPos = this.game.physics.spacecraft.position.clone();
      this.game.spaceship.position.copy(physicsPos).add(this.frameOffset);
    }

    // Update checkpoints that follow celestial bodies, then apply offset
    for (const checkpoint of this.game.checkpointManager.checkpoints) {
      // If checkpoint follows a celestial body, update its position to match the body
      if (checkpoint.followBody && checkpoint.followBody.position) {
        checkpoint.position.copy(checkpoint.followBody.position);
      }

      // Apply reference frame offset to mesh position
      if (checkpoint.mesh && checkpoint.position) {
        checkpoint.mesh.position.copy(checkpoint.position).add(this.frameOffset);
      }
    }

    // Apply offset to smoothed render node
    if (this.game.spaceshipRender) {
      this.game.spaceshipRender.position.copy(this.game.spaceshipSmoothPos).add(this.frameOffset);
      this.game.spaceshipRender.quaternion.copy(this.game.spaceshipSmoothQuat);
    }

    // NOTE: cameraLookAtPoint is updated in updateCameraPosition(), not here
    // to avoid duplicate updates that can cause camera jitter
  }

  /**
   * Get current location name based on nearest celestial body
   */
  getCurrentLocationName() {
    if (!this.game.spaceship || !this.game.physics.spacecraft) {
      return 'Unknown';
    }

    const shipPos = this.game.physics.spacecraft.position.clone();

    // Check distance to each body
    const bodies = [
      { name: 'Sun', body: this.game.sunBody },
      { name: 'Mercury', body: this.game.mercuryBody },
      { name: 'Venus', body: this.game.venusBody },
      { name: 'Earth', body: this.game.earthBody },
      { name: 'Moon', body: this.game.moonBody },
      { name: 'Mars', body: this.game.marsBody },
      { name: 'Phobos', body: this.game.phobosBody },
      { name: 'Jupiter', body: this.game.jupiterBody },
      { name: 'Halley\'s Comet', body: this.game.halleyBody }
    ];

    let nearestName = 'Deep Space';
    let nearestDist = Infinity;

    for (const { name, body } of bodies) {
      if (body && body.position) {
        const dist = shipPos.distanceTo(body.position);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestName = name;
        }
      }
    }

    // If very far from everything, return "Deep Space"
    if (nearestDist > 10000) {
      return 'Deep Space';
    }

    // Add "near" prefix if not too close
    if (nearestDist > 100) {
      return `Near ${nearestName}`;
    }

    return nearestName;
  }

  /**
   * Get reference frame offset
   */
  getFrameOffset() {
    return this.frameOffset;
  }

  /**
   * Get current reference frame
   */
  getReferenceFrame() {
    return this.referenceFrame;
  }

  /**
   * Get and reset frame just changed flag
   */
  checkAndResetFrameChanged() {
    const changed = this.referenceFrameJustChanged;
    this.referenceFrameJustChanged = false;
    return changed;
  }
}
