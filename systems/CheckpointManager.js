import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';

/**
 * CheckpointManager - 负责检查点创建、碰撞检测和完成判定
 */
export class CheckpointManager {
  constructor(game) {
    this.game = game;

    // Checkpoint state
    this.checkpoints = [];
    this.tutorialCompleted = false;
    this.secondMissionCompleted = false;
  }

  /**
   * Create checkpoints for tutorial and missions
   */
  createCheckpoints() {
    // Tutorial checkpoint at the Moon
    if (this.game.tutorialMode) {
      const tutorialCheckpointGeom = new THREE.OctahedronGeometry(0.04, 0); // Reduced from 2 to 0.04 (50x smaller)
      const tutorialCheckpointMat = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8,
        wireframe: true
      });
      const tutorialCheckpoint = new THREE.Mesh(tutorialCheckpointGeom, tutorialCheckpointMat);

      // Position at the Moon (will be updated each frame to follow Moon)
      tutorialCheckpoint.position.copy(this.game.moonBody.position);
      this.game.scene.add(tutorialCheckpoint);

      // Add glow
      const tutorialGlowGeom = new THREE.SphereGeometry(0.06, 16, 16); // Reduced from 3 to 0.06 (50x smaller)
      const tutorialGlowMat = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.3
      });
      const tutorialGlow = new THREE.Mesh(tutorialGlowGeom, tutorialGlowMat);
      tutorialCheckpoint.add(tutorialGlow);

      this.checkpoints.push({
        mesh: tutorialCheckpoint,
        position: tutorialCheckpoint.position,
        collected: false,
        name: 'Moon Tutorial Target',
        isTutorial: true,
        followBody: this.game.moonBody, // Track which body to follow
        orbitCheckCounter: 0,
        orbitTimeAccumulator: 0  // Track time in valid orbit
      });

      console.log('Tutorial checkpoint created at Moon orbit');
    }

    // Mars orbit checkpoint - Second mission (similar to Moon tutorial)
    if (this.game.secondMission || !this.game.tutorialMode) {
      const marsCheckpointGeom = new THREE.OctahedronGeometry(0.08, 0); // Slightly larger than Moon checkpoint
      const marsCheckpointMat = new THREE.MeshBasicMaterial({
        color: 0xff6600, // Orange/red color for Mars
        transparent: true,
        opacity: 0.8,
        wireframe: true
      });
      const marsCheckpoint = new THREE.Mesh(marsCheckpointGeom, marsCheckpointMat);

      // Position at Mars (will be updated each frame to follow Mars)
      marsCheckpoint.position.copy(this.game.marsBody.position);
      this.game.scene.add(marsCheckpoint);

      // Add glow
      const marsGlowGeom = new THREE.SphereGeometry(0.12, 16, 16);
      const marsGlowMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.3
      });
      const marsGlow = new THREE.Mesh(marsGlowGeom, marsGlowMat);
      marsCheckpoint.add(marsGlow);

      this.checkpoints.push({
        mesh: marsCheckpoint,
        position: marsCheckpoint.position,
        collected: false,
        name: 'Mars Mission Target',
        isSecondMission: true,
        followBody: this.game.marsBody, // Track which body to follow
        orbitCheckCounter: 0,
        orbitTimeAccumulator: 0  // Track time in valid orbit
      });

      console.log('Second mission checkpoint created at Mars orbit');
    }

    // Create trajectory hint lines (dashed)
    // DISABLED: These suggested orbits are not accurate for the current physics
    // this.createTrajectoryHints();
  }

  /**
   * Check checkpoints for collision and orbit stability
   */
  checkCheckpoints(deltaTime) {
    for (let checkpoint of this.checkpoints) {
      if (checkpoint.collected) continue;

      // Tutorial checkpoint: Check if trajectory stays within orbit range
      if (checkpoint.isTutorial && this.game.tutorialMode && this.game.moonBody) {
        const moonPos   = this.game.moonBody.position;
        const shipPos   = this.game.spaceship.position;
        const dist      = shipPos.distanceTo(moonPos);

        // 有效轨道范围（单位：游戏距离）
        const minAlt = GameConfig.moonOrbit.minAltitude;
        const maxAlt = GameConfig.moonOrbit.maxAltitude;
        const requiredSeconds = GameConfig.moonOrbit.requiredTime;

        // 初始化累计器
        if (checkpoint.orbitTimeAccumulator === undefined) {
          checkpoint.orbitTimeAccumulator = 0;
        }

        // 检查是否是稳定轨道（不只是飞掠）
        let isStableOrbit = false;
        if (dist >= minAlt && dist <= maxAlt) {
          // 计算相对月球的速度
          const moonVel = this.game.moonBody.velocity;
          const shipVel = this.game.shipVelocity;
          const relativeVel = new THREE.Vector3().subVectors(shipVel, moonVel);
          const relativeSpeed = relativeVel.length();

          // 计算径向方向（从月球指向飞船）
          const radialDir = new THREE.Vector3().subVectors(shipPos, moonPos).normalize();

          // 计算径向速度分量（相对速度在径向上的投影）
          const radialSpeed = relativeVel.dot(radialDir);

          // 计算切向速度（轨道速度）
          const tangentialSpeed = Math.sqrt(Math.max(0, relativeSpeed * relativeSpeed - radialSpeed * radialSpeed));

          // 稳定轨道判定：
          // 1. 切向速度要足够（说明在绕月飞行，不是径向飞过）
          // 2. 径向速度要小（说明不是快速接近或远离）
          // 3. 总速度在合理范围内（不能太快或太慢）
          // 理论轨道速度在0.5-2.0 units高度: ~0.078-0.157 units/s
          const minTangentialSpeed = 0.06; // 最小切向速度（降低以匹配实际轨道速度）
          const maxRadialSpeed = 0.15;     // 最大径向速度（更严格，确保是稳定轨道）
          const minOrbitalSpeed = 0.05;    // 最小轨道速度（允许较慢的外层轨道）
          const maxOrbitalSpeed = 0.25;    // 最大轨道速度（防止逃逸）

          isStableOrbit = tangentialSpeed >= minTangentialSpeed &&
                         Math.abs(radialSpeed) <= maxRadialSpeed &&
                         relativeSpeed >= minOrbitalSpeed &&
                         relativeSpeed <= maxOrbitalSpeed;

          // Debug: Log why orbit is not stable (only when close to meeting requirements)
          if (!isStableOrbit && dist >= minAlt && dist <= maxAlt) {
            const reasons = [];
            if (tangentialSpeed < minTangentialSpeed) reasons.push(`tangential ${tangentialSpeed.toFixed(2)} < ${minTangentialSpeed}`);
            if (Math.abs(radialSpeed) > maxRadialSpeed) reasons.push(`radial ${Math.abs(radialSpeed).toFixed(2)} > ${maxRadialSpeed}`);
            if (relativeSpeed < minOrbitalSpeed) reasons.push(`speed ${relativeSpeed.toFixed(2)} < ${minOrbitalSpeed}`);
            if (relativeSpeed > maxOrbitalSpeed) reasons.push(`speed ${relativeSpeed.toFixed(2)} > ${maxOrbitalSpeed}`);
            if (reasons.length > 0 && Math.random() < 0.02) { // Log occasionally to avoid spam
              console.log(`⚠️ Orbit not stable: ${reasons.join(', ')}`);
            }
          }
        }

        // 只有稳定轨道才累计时间
        if (isStableOrbit) {
          checkpoint.orbitTimeAccumulator += deltaTime * this.game.physics.timeScale;
        } else {
          // 出了稳定轨道就缓慢扣时间（允许短暂偏离）
          checkpoint.orbitTimeAccumulator = Math.max(0, checkpoint.orbitTimeAccumulator - deltaTime * 0.5);
        }

        // HUD 显示
        const orbitStatus = document.getElementById('orbit-status');
        if (dist <= maxAlt * 2) {          // 靠近月球时才显示
          if (orbitStatus) {
            orbitStatus.style.display = 'block';
            document.getElementById('orbit-altitude').textContent   = dist.toFixed(2);

            // "In Range" shows if altitude is in range AND velocity is stable
            const inRange = (dist >= minAlt && dist <= maxAlt); // Altitude in range
            const rangePercent = inRange ? (isStableOrbit ? 100 : 50) : 0;
            // 0% = out of range, 50% = in range but not stable, 100% = stable orbit
            document.getElementById('orbit-speed').textContent      = rangePercent;

            document.getElementById('orbit-stability').textContent  = Math.min(100, (checkpoint.orbitTimeAccumulator / requiredSeconds * 100)).toFixed(0);
          }
        } else {
          if (orbitStatus) orbitStatus.style.display = 'none';
        }

        // 判定通过
        if (checkpoint.orbitTimeAccumulator >= requiredSeconds) {
          checkpoint.collected = true;
          this.tutorialCompleted = true;

          // 计算燃料使用效率
          const fuelUsed = this.game.maxFuelMass - this.game.fuelMass;
          const optimalFuel = 48; // Hohmann transfer optimal
          const efficiency = (optimalFuel / fuelUsed * 100);

          let performanceMsg = '';
          let performanceColor = '#00ff00';
          if (fuelUsed <= optimalFuel * 1.1) {
            performanceMsg = `🏆 OUTSTANDING! Near-optimal efficiency!`;
            performanceColor = '#ffaa00';
          } else if (fuelUsed <= optimalFuel * 1.5) {
            performanceMsg = `⭐ GREAT JOB! Very efficient!`;
            performanceColor = '#00ff00';
          } else if (fuelUsed <= optimalFuel * 2.0) {
            performanceMsg = `✓ GOOD! Mission successful.`;
            performanceColor = '#88ff88';
          } else {
            performanceMsg = `✓ COMPLETED! You reached the Moon.`;
            performanceColor = '#ffffff';
          }

          // 显示自定义完成弹窗（支持HTML和图片）
          this.showTutorialCompletionModal(fuelUsed, optimalFuel, efficiency, performanceMsg, performanceColor);

          this.game.tutorialMode = false;
          this.game.secondMission = true; // Activate Mars mission
          if (orbitStatus) orbitStatus.style.display = 'none';
        }

        // 视觉反馈：checkpoint 亮度随进度增加
        const progress = Math.min(1, checkpoint.orbitTimeAccumulator / requiredSeconds);
        checkpoint.mesh.material.opacity = 0.3 + progress * 0.7;

        // 让检查点在月球周围轨道运动（更新物理位置）
        const orbitRadius = 1.0;
        const angle = Date.now() * 0.0005;
        checkpoint.position.set(
          moonPos.x + Math.cos(angle) * orbitRadius,
          moonPos.y,
          moonPos.z + Math.sin(angle) * orbitRadius
        );
      } else if (checkpoint.isSecondMission && this.game.secondMission && this.game.marsBody) {
        // Second mission: Mars orbit checkpoint (similar to Moon tutorial)
        const marsPos   = this.game.marsBody.position;
        const shipPos   = this.game.spaceship.position;
        const dist      = shipPos.distanceTo(marsPos);

        // Valid orbit range for Mars (slightly larger than Moon due to larger planet)
        const minAlt = GameConfig.marsOrbit.minAltitude;
        const maxAlt = GameConfig.marsOrbit.maxAltitude;
        const requiredSeconds = GameConfig.marsOrbit.requiredTime;

        // Initialize accumulator
        if (checkpoint.orbitTimeAccumulator === undefined) {
          checkpoint.orbitTimeAccumulator = 0;
        }

        // Accumulate time only when in valid orbit range (affected by TimeScale)
        if (dist >= minAlt && dist <= maxAlt) {
          checkpoint.orbitTimeAccumulator += deltaTime * this.game.physics.timeScale;
        } else {
          // Slowly decrease accumulated time when out of range (allow brief deviations)
          checkpoint.orbitTimeAccumulator = Math.max(0, checkpoint.orbitTimeAccumulator - deltaTime * 0.5);
        }

        // HUD display for Mars orbit status
        const marsOrbitStatus = document.getElementById('mars-orbit-status');
        if (dist <= maxAlt * 2) {  // Show when near Mars
          if (marsOrbitStatus) {
            marsOrbitStatus.style.display = 'block';
            document.getElementById('mars-orbit-altitude').textContent   = dist.toFixed(2);
            document.getElementById('mars-orbit-speed').textContent      = (dist >= minAlt && dist <= maxAlt ? 100 : 0);
            document.getElementById('mars-orbit-stability').textContent  = Math.min(100, (checkpoint.orbitTimeAccumulator / requiredSeconds * 100)).toFixed(0);
          }
        } else {
          if (marsOrbitStatus) marsOrbitStatus.style.display = 'none';
        }

        // Check completion
        if (checkpoint.orbitTimeAccumulator >= requiredSeconds) {
          checkpoint.collected = true;
          this.secondMissionCompleted = true;
          const remainingFuel = this.game.fuelMass.toFixed(1);
          const totalDeltaV = this.game.calculateTotalDeltaV();
          alert(
            `🎉 MARS MISSION COMPLETED!\n\n` +
            `Congratulations! You reached Mars and maintained orbit!\n\n` +
            `Orbit Altitude: ${dist.toFixed(2)} units\n` +
            `Orbit Time: ${checkpoint.orbitTimeAccumulator.toFixed(1)} seconds\n` +
            `Remaining Fuel: ${remainingFuel} kg\n` +
            `Total ΔV Expended: ${totalDeltaV.toFixed(0)} m/s\n\n` +
            `You've mastered:\n` +
            `✓ Interplanetary transfers\n` +
            `✓ Gravitational slingshots\n` +
            `✓ Advanced orbital mechanics\n\n` +
            `Mission Complete!`
          );
          this.game.secondMission = false;
          if (marsOrbitStatus) marsOrbitStatus.style.display = 'none';
        }

        // Visual feedback: checkpoint brightness increases with progress
        const progress = Math.min(1, checkpoint.orbitTimeAccumulator / requiredSeconds);
        checkpoint.mesh.material.opacity = 0.3 + progress * 0.7;

        // 让检查点在火星周围轨道运动（更新物理位置）
        const orbitRadius = 2.0;  // Larger orbit radius for Mars
        const angle = Date.now() * 0.0004;  // Slightly slower rotation
        checkpoint.position.set(
          marsPos.x + Math.cos(angle) * orbitRadius,
          marsPos.y,
          marsPos.z + Math.sin(angle) * orbitRadius
        );
      }
    }
  }

  /**
   * Show tutorial completion modal with Hohmann transfer info
   */
  showTutorialCompletionModal(fuelUsed, optimalFuel, efficiency, performanceMsg, performanceColor) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'tutorial-completion-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Courier New', monospace;
    `;

    // Create modal content
    const content = document.createElement('div');
    content.style.cssText = `
      background: #0a0a0a;
      border: 2px solid #00ff00;
      border-radius: 10px;
      padding: 30px;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 0 30px #00ff00;
      color: #00ff00;
    `;

    content.innerHTML = `
      <h1 style="text-align: center; color: #00ffff; font-size: 28px; margin-bottom: 20px; text-shadow: 0 0 10px #00ffff;">
        🎉 TUTORIAL COMPLETED! 🎉
      </h1>

      <p style="text-align: center; font-size: 16px; margin-bottom: 20px;">
        You maintained stable Moon orbit for 50+ seconds!
      </p>

      <div style="border: 1px solid #00ff00; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h2 style="color: #00ffff; text-align: center; margin-bottom: 15px; font-size: 20px;">MISSION PERFORMANCE</h2>

        <div style="text-align: center; font-size: 15px; line-height: 2;">
          <div>Fuel Used: <span style="color: #ff4444; font-weight: bold;">${fuelUsed.toFixed(1)} kg</span></div>
          <div>Optimal (Hohmann): <span style="color: #88ff88; font-weight: bold;">${optimalFuel} kg</span></div>
          <div>Efficiency: <span style="color: #ffaa00; font-weight: bold;">${efficiency.toFixed(1)}%</span></div>
        </div>

        <p style="text-align: center; margin-top: 15px; font-size: 18px; font-weight: bold; color: ${performanceColor};">
          ${performanceMsg}
        </p>
      </div>

      <div style="border: 1px solid #00ff00; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h2 style="color: #00ffff; text-align: center; margin-bottom: 15px; font-size: 20px;">DID YOU KNOW?</h2>

        <p style="font-size: 14px; line-height: 1.8; margin-bottom: 15px;">
          The most fuel-efficient Earth-Moon transfer is the
          <span style="color: #ff4444; font-weight: bold;">HOHMANN TRANSFER ORBIT</span> — a two-burn maneuver:
        </p>

        <div style="font-size: 13px; line-height: 2; margin-left: 20px;">
          <div>1️⃣ <span style="color: #ffaa00;">First burn at Earth periapsis</span></div>
          <div style="margin-left: 25px;">→ Raises your apoapsis to Moon's orbit</div>

          <div style="margin-top: 10px;">2️⃣ <span style="color: #ffaa00;">Coast along elliptical path</span></div>
          <div style="margin-left: 25px;">→ Let gravity do the work (0 fuel!)</div>

          <div style="margin-top: 10px;">3️⃣ <span style="color: #ffaa00;">Second burn at Moon periapsis</span></div>
          <div style="margin-left: 25px;">→ Circularize orbit around Moon</div>
        </div>

        <p style="font-size: 13px; line-height: 1.8; margin-top: 15px;">
          Real spacecraft (Apollo, Artemis) use this technique!
        </p>

        <div style="text-align: center; margin: 20px 0;">
          <img src="assets/holman.png" alt="Walter Hohmann"
               style="max-width: 200px; border: 2px solid #00ff00; border-radius: 8px; box-shadow: 0 0 15px #00ff00;">
          <div style="color: #00ffff; font-size: 12px; margin-top: 8px;">Walter Hohmann (1880-1945)</div>
          <div style="color: #88ff88; font-size: 11px; font-style: italic;">German engineer who pioneered orbital mechanics</div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 25px;">
        <button id="close-modal-btn" style="
          background: #00ff00;
          color: #000;
          border: none;
          padding: 12px 40px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 5px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          box-shadow: 0 0 10px #00ff00;
        ">CONTINUE TO FREE FLIGHT</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close button handler
    const closeBtn = document.getElementById('close-modal-btn');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Allow closing with Enter or Escape
    const handleKeyPress = (e) => {
      if (e.code === 'Enter' || e.code === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleKeyPress);
      }
    };
    document.addEventListener('keydown', handleKeyPress);
  }

  /**
   * Get checkpoints array
   */
  getCheckpoints() {
    return this.checkpoints;
  }

  /**
   * Get tutorial completed state
   */
  isTutorialCompleted() {
    return this.tutorialCompleted;
  }

  /**
   * Get second mission completed state
   */
  isSecondMissionCompleted() {
    return this.secondMissionCompleted;
  }
}
