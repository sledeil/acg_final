import * as THREE from 'three';

/**
 * 火焰效果管理器
 * 负责管理所有火箭引擎的火焰粒子特效
 */
class FlameManager {
  constructor(game) {
    this.game = game;
    
    // 火焰粒子系统
    this.engineFlames = []; // 所有火焰粒子系统的数组
    this.engineGlowRefs = []; // 所有 engineGlow 引用的数组
    this.engineFlame = null; // 保持向后兼容（第一个火焰）
    this.flameParticleSystem = null; // 粒子系统引用（向后兼容）
    this.flameAnimationTime = 0; // 火焰动画时间
    this.engineFlameScale = 1;
    
    // 火焰配置
    this.currentFlameRotationOffset = new THREE.Euler(0, 0, 0, 'XYZ'); // 当前火箭模型的火焰旋转偏移（欧拉角）
    this.currentFlamePositionOffset = new THREE.Vector3(0, 0, 0); // 当前火箭模型的火焰位置偏移
    
    // 状态跟踪
    this._lastFlameState = null;
    
    // 淡出效果
    this.isFadingOut = false;
    this.fadeOutStartTime = 0;
    this.fadeOutDuration = 0.5; // 0.3秒淡出时间
  }

  /**
   * 创建火焰纹理
   */
  createFlameTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
      size * 0.5,
      size * 0.3,
      0,
      size * 0.5,
      size * 0.7,
      size * 0.6
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.25, 'rgba(255,200,80,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,120,30,0.55)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * 创建一个火焰粒子系统
   */
  createFlameParticleSystem() {
    const flameTexture = this.createFlameTexture();
    
    // 创建粒子几何体
    const particleCount = 100; // 粒子数量
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    
    // 初始化粒子数据
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const spreadRadius = 0.15;
      positions[i3] = (Math.random() - 0.5) * spreadRadius;
      positions[i3 + 1] = (Math.random() - 0.5) * spreadRadius;
      positions[i3 + 2] = Math.random() * 0.1;
      
      velocities[i3] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 2] = 0.05 + Math.random() * 0.05;
      
      const colorFactor = Math.random();
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.2 + colorFactor * 0.3;
      colors[i3 + 2] = colorFactor * 0.1;
      
      sizes[i] = 0.2 + Math.random() * 0.4;
      lifetimes[i] = Math.random();
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    geometry.userData.velocities = velocities;
    geometry.userData.lifetimes = lifetimes;
    geometry.userData.positions = positions;
    
    const material = new THREE.PointsMaterial({
      map: flameTexture,
      size: 0.4,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    const flame = new THREE.Points(geometry, material);
    flame.renderOrder = 50;
    flame.visible = false;
    
    return flame;
  }

  /**
   * 设置引擎特效（清理旧火焰）
   */
  setupEngineEffects() {
    if (!this.game.spaceshipVisual) return;

    // 清理旧的火焰
    this.engineFlames.forEach(flame => {
      if (flame.parent) {
        flame.parent.remove(flame);
      }
      if (flame.geometry) flame.geometry.dispose();
      if (flame.material) flame.material.dispose();
    });
    this.engineFlames = [];
    this.engineGlowRefs = [];
    this.engineFlame = null;

    this.refreshEngineEffects();
  }

  /**
   * 刷新引擎特效（查找所有 engineGlow 并创建火焰）
   */
  refreshEngineEffects() {
    if (!this.game.spaceshipVisual) return;

    // 查找所有 engineGlow 节点（包括 engineGlow, engineGlow.002 等）
    const engineGlows = [];
    this.game.spaceshipVisual.traverse((child) => {
      if (child.name && child.name.startsWith('engineGlow')) {
        engineGlows.push(child);
      }
    });

    if (engineGlows.length === 0) {
      console.log('⚠️  refreshEngineEffects: 未找到 engineGlow 节点');
      return;
    }

    console.log(`🔥 找到 ${engineGlows.length} 个 engineGlow 节点:`, engineGlows.map(g => g.name).join(', '));

    // 清理旧的火焰（如果数量不匹配）
    while (this.engineFlames.length > engineGlows.length) {
      const oldFlame = this.engineFlames.pop();
      if (oldFlame.parent) {
        oldFlame.parent.remove(oldFlame);
      }
      if (oldFlame.geometry) oldFlame.geometry.dispose();
      if (oldFlame.material) oldFlame.material.dispose();
    }

    // 为每个 engineGlow 创建或更新火焰
    engineGlows.forEach((engineGlow, index) => {
      let flame = this.engineFlames[index];
      
      // 如果火焰不存在，创建新的
      if (!flame) {
        console.log(`🔥 创建新火焰 ${index} 用于 ${engineGlow.name}`);
        flame = this.createFlameParticleSystem();
        this.engineFlames[index] = flame;
        this.game.spaceshipVisual.add(flame);
        console.log(`  火焰 ${index} 已添加到场景，父节点: ${flame.parent ? (flame.parent.name || flame.parent.type) : 'null'}`);
      } else {
        console.log(`♻️  使用现有火焰 ${index} 用于 ${engineGlow.name}`);
      }

      // 确保火焰在正确的父节点下
      if (flame.parent !== this.game.spaceshipVisual) {
        console.log(`⚠️  火焰 ${index} 的父节点不正确，正在修复...`);
        if (flame.parent) {
          flame.parent.remove(flame);
        }
        this.game.spaceshipVisual.add(flame);
        console.log(`  ✅ 火焰 ${index} 已重新添加到 spaceshipVisual`);
      }

      // 设置第一个火焰为向后兼容的 engineFlame
      if (index === 0) {
        this.engineFlame = flame;
        this.flameParticleSystem = flame;
      }

      // 绑定火焰到 engineGlow
      this.bindFlameToEngineGlow(flame, engineGlow, index);
      
      // 验证火焰已正确添加
      const isInScene = flame.parent === this.game.spaceshipVisual;
      console.log(`✅ 火焰 ${index} 状态: visible=${flame.visible}, 在场景中=${isInScene}, 父节点=${flame.parent ? (flame.parent.name || flame.parent.type) : 'null'}`);
    });
    
    console.log(`📊 总结: 总共创建了 ${this.engineFlames.length} 个火焰，spaceshipVisual 的子节点数: ${this.game.spaceshipVisual.children.length}`);
    
    // 验证所有火焰都在场景中
    const flamesInScene = this.game.spaceshipVisual.children.filter(child => this.engineFlames.includes(child));
    console.log(`🔍 验证: ${flamesInScene.length} 个火焰在场景中`);
    if (flamesInScene.length !== this.engineFlames.length) {
      console.warn(`⚠️  警告: 火焰数量不匹配！期望 ${this.engineFlames.length} 个，实际在场景中 ${flamesInScene.length} 个`);
    }

    // 保存 engineGlow 引用
    this.engineGlowRefs = engineGlows;
    
    // 设置缩放
    const box = new THREE.Box3().setFromObject(this.game.spaceshipVisual);
    const size = new THREE.Vector3();
    box.getSize(size);
    const longest = Math.max(size.x, size.y, size.z);
    this.engineFlameScale = Math.max(0.5, longest * 0.2);
    
    // 为所有火焰设置缩放
    this.engineFlames.forEach(flame => {
      flame.scale.set(this.engineFlameScale, this.engineFlameScale, this.engineFlameScale * 1.6);
      if (flame.material) {
        flame.material.opacity = 0;
      }
      flame.visible = false;
    });
    
    console.log(`火焰特效缩放: (${this.engineFlameScale.toFixed(3)}, ${this.engineFlameScale.toFixed(3)}, ${(this.engineFlameScale * 1.6).toFixed(3)})`);
    console.log(`飞船尺寸: (${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)}), 最长边: ${longest.toFixed(3)}`);
  }

  /**
   * 将火焰绑定到指定的 engineGlow 节点
   */
  bindFlameToEngineGlow(flame, engineGlow, index) {
    if (!flame || !engineGlow || !this.game.spaceshipVisual) return;

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔥 refreshEngineEffects: 绑定火焰 ${index} 到 ${engineGlow.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // 确保变换矩阵是最新的
    engineGlow.updateMatrixWorld(true);
    this.game.spaceshipVisual.updateMatrixWorld(true);
    
    // 获取 engineGlow 的世界位置和旋转
    const engineGlowWorldPos = new THREE.Vector3();
    const engineGlowWorldQuat = new THREE.Quaternion();
    const engineGlowWorldScale = new THREE.Vector3();
    engineGlow.matrixWorld.decompose(engineGlowWorldPos, engineGlowWorldQuat, engineGlowWorldScale);
    
    console.log(`${engineGlow.name} 本地位置: (${engineGlow.position.x.toFixed(3)}, ${engineGlow.position.y.toFixed(3)}, ${engineGlow.position.z.toFixed(3)})`);
    console.log(`${engineGlow.name} 世界位置: (${engineGlowWorldPos.x.toFixed(3)}, ${engineGlowWorldPos.y.toFixed(3)}, ${engineGlowWorldPos.z.toFixed(3)})`);
    
    // 将 engineGlow 的世界位置转换为相对于 spaceshipVisual 的本地位置
    const spaceshipVisualWorldPos = new THREE.Vector3();
    const spaceshipVisualWorldQuat = new THREE.Quaternion();
    const spaceshipVisualWorldScale = new THREE.Vector3();
    this.game.spaceshipVisual.matrixWorld.decompose(spaceshipVisualWorldPos, spaceshipVisualWorldQuat, spaceshipVisualWorldScale);
    
    const relativeWorldPos = engineGlowWorldPos.clone().sub(spaceshipVisualWorldPos);
    const localPos = new THREE.Vector3();
    localPos.copy(relativeWorldPos);
    localPos.applyQuaternion(spaceshipVisualWorldQuat.clone().invert());
    localPos.divide(spaceshipVisualWorldScale);
    
    // 设置火焰位置（应用位置偏移）
    flame.position.copy(localPos);
    flame.position.add(this.currentFlamePositionOffset);
    
    // 同步旋转
    const relativeQuat = spaceshipVisualWorldQuat.clone().invert().multiply(engineGlowWorldQuat);
    const offsetQuat = new THREE.Quaternion().setFromEuler(this.currentFlameRotationOffset);
    const finalQuat = relativeQuat.clone().multiply(offsetQuat);
    flame.quaternion.copy(finalQuat);
    
    // 保存 engineGlow 引用到火焰对象上
    flame.userData.engineGlowRef = engineGlow;
    
    // 计算并打印世界位置，用于验证
    flame.updateMatrixWorld(true);
    const flameWorldPosCheck = new THREE.Vector3();
    flame.getWorldPosition(flameWorldPosCheck);
    
    console.log(`火焰 ${index} 本地位置: (${flame.position.x.toFixed(3)}, ${flame.position.y.toFixed(3)}, ${flame.position.z.toFixed(3)})`);
    console.log(`火焰 ${index} 世界位置: (${flameWorldPosCheck.x.toFixed(3)}, ${flameWorldPosCheck.y.toFixed(3)}, ${flameWorldPosCheck.z.toFixed(3)})`);
    console.log(`engineGlow ${index} 世界位置: (${engineGlowWorldPos.x.toFixed(3)}, ${engineGlowWorldPos.y.toFixed(3)}, ${engineGlowWorldPos.z.toFixed(3)})`);
    const posDiff = flameWorldPosCheck.distanceTo(engineGlowWorldPos);
    console.log(`位置差异: ${posDiff.toFixed(6)} (应该接近 0)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * 触发引擎特效
   */
  triggerEngineFX(boostMultiplier = 1) {
    // 如果正在淡出，取消淡出
    if (this.isFadingOut) {
      this.isFadingOut = false;
    }
    
    // 启用所有火焰特效
    console.log(`🔥 激活 ${this.engineFlames.length} 个火焰特效，Boost: ${boostMultiplier.toFixed(1)}x`);
    this.engineFlames.forEach((flame, index) => {
      if (!flame) {
        console.warn(`⚠️  火焰 ${index} 不存在！`);
        return;
      }
      
      flame.visible = true;
      if (flame.material) {
        flame.material.opacity = Math.min(0.9, 0.6 * boostMultiplier);
        if (flame.material.size !== undefined) {
          flame.material.size = 0.4 * boostMultiplier;
        }
      }
      const baseScale = this.engineFlameScale;
      flame.scale.set(
        baseScale * boostMultiplier,
        baseScale * boostMultiplier,
        baseScale * 1.6 * boostMultiplier
      );
      
      // 验证火焰状态
      flame.updateMatrixWorld(true);
      const flameWorldPos = new THREE.Vector3();
      flame.getWorldPosition(flameWorldPos);
      console.log(`  火焰 ${index}: visible=${flame.visible}, opacity=${flame.material ? flame.material.opacity.toFixed(2) : 'N/A'}, 位置=(${flameWorldPos.x.toFixed(2)}, ${flameWorldPos.y.toFixed(2)}, ${flameWorldPos.z.toFixed(2)})`);
    });
    
    // 打印火焰状态信息（仅在首次触发或状态变化时打印，避免刷屏）
    if (!this._lastFlameState || this._lastFlameState.boostMultiplier !== boostMultiplier) {
      if (this.engineFlames.length > 0) {
        const firstFlame = this.engineFlames[0];
        const opacity = firstFlame.material ? firstFlame.material.opacity : 0;
        console.log(`✅ ${this.engineFlames.length} 个火焰特效已激活 | Boost: ${boostMultiplier.toFixed(1)}x | 透明度: ${opacity.toFixed(2)}`);
        this._lastFlameState = { boostMultiplier, opacity };
      }
    }
  }

  /**
   * 停止引擎特效（带淡出效果）
   */
  stopEngineFX() {
    // 如果已经在淡出，不需要重复启动
    if (this.isFadingOut) return;
    
    // 启动淡出效果
    this.isFadingOut = true;
    this.fadeOutStartTime = performance.now() / 1000; // 转换为秒
    
    // 保存每个火焰的初始透明度
    this.engineFlames.forEach(flame => {
      if (flame.material) {
        flame.userData.initialOpacity = flame.material.opacity;
      }
    });
  }

  /**
   * 更新火焰旋转，使其始终跟随 engineGlow 的旋转
   */
  updateFlameRotation() {
    if (!this.game.spaceshipVisual || this.engineFlames.length === 0) return;
    
    // 更新所有火焰的旋转和位置
    this.engineFlames.forEach((flame, index) => {
      const engineGlow = flame.userData.engineGlowRef;
      if (!engineGlow) return;
      
      // 确保变换矩阵是最新的
      engineGlow.updateMatrixWorld(true);
      this.game.spaceshipVisual.updateMatrixWorld(true);
      
      // 获取 engineGlow 的世界旋转和位置
      const engineGlowWorldQuat = new THREE.Quaternion();
      const engineGlowWorldPos = new THREE.Vector3();
      const engineGlowWorldScale = new THREE.Vector3();
      engineGlow.matrixWorld.decompose(engineGlowWorldPos, engineGlowWorldQuat, engineGlowWorldScale);
      
      // 获取 spaceshipVisual 的世界旋转和位置
      const spaceshipVisualWorldQuat = new THREE.Quaternion();
      const spaceshipVisualWorldPos = new THREE.Vector3();
      const spaceshipVisualWorldScale = new THREE.Vector3();
      this.game.spaceshipVisual.matrixWorld.decompose(spaceshipVisualWorldPos, spaceshipVisualWorldQuat, spaceshipVisualWorldScale);
      
      // 计算相对旋转：将 engineGlow 的世界旋转转换为相对于 spaceshipVisual 的本地旋转
      const relativeQuat = spaceshipVisualWorldQuat.clone().invert().multiply(engineGlowWorldQuat);
      
      // 应用额外的旋转偏移（针对不同模型的自定义旋转）
      const offsetQuat = new THREE.Quaternion().setFromEuler(this.currentFlameRotationOffset);
      const finalQuat = relativeQuat.clone().multiply(offsetQuat);
      
      // 应用旋转到火焰
      flame.quaternion.copy(finalQuat);
      
      // 更新位置（考虑位置偏移）
      const relativeWorldPos = engineGlowWorldPos.clone().sub(spaceshipVisualWorldPos);
      const localPos = new THREE.Vector3();
      localPos.copy(relativeWorldPos);
      localPos.applyQuaternion(spaceshipVisualWorldQuat.clone().invert());
      localPos.divide(spaceshipVisualWorldScale);
      flame.position.copy(localPos);
      flame.position.add(this.currentFlamePositionOffset);
    });
  }

  /**
   * 更新3D火焰粒子动画
   */
  updateFlameParticles(deltaTime) {
    // 处理淡出效果
    if (this.isFadingOut) {
      const currentTime = performance.now() / 1000;
      const elapsed = currentTime - this.fadeOutStartTime;
      const fadeProgress = Math.min(elapsed / this.fadeOutDuration, 1.0);
      
      // 更新所有火焰的透明度
      this.engineFlames.forEach(flame => {
        if (flame && flame.material) {
          const initialOpacity = flame.userData.initialOpacity || 0.8;
          flame.material.opacity = initialOpacity * (1.0 - fadeProgress);
        }
      });
      
      // 淡出完成后，隐藏所有火焰
      if (fadeProgress >= 1.0) {
        this.engineFlames.forEach(flame => {
          if (flame) {
            if (flame.material) {
              flame.material.opacity = 0;
            }
            flame.visible = false;
          }
        });
        this.isFadingOut = false;
      }
    }
    
    // 更新所有火焰粒子系统
    this.engineFlames.forEach((flame, index) => {
      if (!flame) {
        console.warn(`⚠️  火焰 ${index} 不存在，跳过更新`);
        return;
      }
      if (!flame.visible) return;
      this.updateSingleFlameParticles(flame, deltaTime);
    });
  }
  
  /**
   * 更新单个火焰粒子系统的动画
   */
  updateSingleFlameParticles(flame, deltaTime) {
    if (!flame || !flame.visible) return;
    
    const geometry = flame.geometry;
    const positions = geometry.attributes.position.array;
    const colors = geometry.attributes.color.array;
    const sizes = geometry.attributes.size.array;
    const velocities = geometry.userData.velocities;
    const lifetimes = geometry.userData.lifetimes;
    
    // 更新每个粒子
    for (let i = 0; i < positions.length / 3; i++) {
      const i3 = i * 3;
      
      // 更新生命周期
      lifetimes[i] += deltaTime * 2.0; // 火焰速度
      
      // 如果粒子超出生命周期，重置到起始位置
      if (lifetimes[i] > 1.0) {
        lifetimes[i] = 0;
        // 重置位置到喷口（缩小范围，让火焰更细）
        const spreadRadius = 0.15;
        positions[i3] = (Math.random() - 0.5) * spreadRadius;
        positions[i3 + 1] = (Math.random() - 0.5) * spreadRadius;
        positions[i3 + 2] = Math.random() * 0.1;
        
        // 重置速度（减少横向扩散）
        velocities[i3] = (Math.random() - 0.5) * 0.01;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
        velocities[i3 + 2] = 0.05 + Math.random() * 0.05;
      }
      
      // 更新位置（基于速度）
      positions[i3] += velocities[i3] * deltaTime * 10;
      positions[i3 + 1] += velocities[i3 + 1] * deltaTime * 10;
      positions[i3 + 2] += velocities[i3 + 2] * deltaTime * 10;
      
      // 根据生命周期调整颜色和大小（从亮到暗）
      const lifeFactor = 1.0 - lifetimes[i];
      
      // 颜色渐变：更红，减少黄色/橙色
      colors[i3] = 1.0; // R: 保持红色
      colors[i3 + 1] = 0.2 + lifeFactor * 0.3; // G: 从0.5-1.0减少到0.2-0.5，更红
      colors[i3 + 2] = (1.0 - lifeFactor) * 0.1; // B: 从0.3减少到0.1，更红
      
      // 大小渐变：从大到小（稍微减小）
      sizes[i] = (0.2 + Math.random() * 0.4) * lifeFactor;
    }
    
    // 标记需要更新
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  }
}

export { FlameManager };

