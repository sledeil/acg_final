# HPOP 单位转换分析 (Unit Conversion Analysis)

## 问题描述 (Problem Description)

启用 HPOP 后，飞船沿径向高速飞离，这是因为 HPOP 算法使用真实物理单位（SI 单位），而游戏使用归一化单位系统（G=1, M_earth=1），导致加速度量级不匹配。

After enabling HPOP, the spacecraft flies away radially at high speed because HPOP uses real physical units (SI units) while the game uses a normalized unit system (G=1, M_earth=1), causing acceleration magnitude mismatch.

## 游戏单位系统 (Game Unit System)

游戏中采用归一化单位：

```
G_game = 1.0          (引力常数)
M_earth_game = 1.0    (地球质量)
R_earth_game = 2.0    (地球半径)
```

## 量纲分析 (Dimensional Analysis)

### 1. 加速度标度 (Acceleration Scale)

从地球表面重力加速度：

```
游戏单位：g_game = G * M / R² = 1.0 * 1.0 / 2.0² = 0.25 (游戏加速度单位)
真实单位：g_real = 9.82 m/s²

因此：1 游戏加速度单位 = 39.28 m/s²
```

### 2. 长度标度 (Length Scale)

从地球半径：

```
R_earth_game = 2.0
R_earth_real = 6.371 × 10⁶ m

因此：1 游戏长度单位 = 3.186 × 10⁶ m
```

### 3. 速度标度 (Velocity Scale)

从轨道速度 v² = GM/R：

```
v_orbital_game = sqrt(1.0 * 1.0 / 2.0) = 0.707 (游戏速度单位)
v_orbital_real = sqrt(9.82 × 6.371×10⁶) = 7905 m/s

因此：1 游戏速度单位 = 11183 m/s
```

### 4. 时间标度 (Time Scale)

从 v = L/T：

```
T_scale = L_scale / v_scale = 3.186×10⁶ / 11183 = 285 秒

因此：1 游戏时间单位 = 285 秒 ≈ 4.75 分钟
```

## 单位转换常数总结 (Unit Conversion Summary)

| 物理量 | 游戏单位 | SI 单位 | 转换因子 |
|--------|---------|---------|---------|
| 长度 Length | 1 | 3.186 × 10⁶ m | L_scale = 3.186e6 |
| 时间 Time | 1 | 285 s | T_scale = 285 |
| 质量 Mass | 1 | 5.972 × 10²⁴ kg | M_scale = 5.972e24 |
| 速度 Velocity | 1 | 11183 m/s | v_scale = 11183 |
| 加速度 Acceleration | 1 | 39.28 m/s² | a_scale = 39.28 |

## 修正方法 (Correction Method)

### 1. 重力谐波项 (Gravity Harmonics)

J2-J6 系数是**无量纲的**，不需要单位转换。公式内部使用游戏单位（G=1, M=1），因此结果自然是游戏加速度单位。

**无需修改**。

### 2. 大气阻力 (Atmospheric Drag)

**问题**：密度使用 kg/m³，面积使用 m²，质量使用 kg，但速度在游戏单位中。

**修正**：
```javascript
// 1. 将速度从游戏单位转换为 SI 单位
v_SI = v_game * 11183  // m/s

// 2. 使用 SI 单位计算阻力加速度
a_drag_SI = 0.5 * ρ * v_SI² * C_d * A / m  // m/s²

// 3. 转换回游戏单位
a_drag_game = a_drag_SI / 39.28
```

**代码修改**：
- 添加常数 `VELOCITY_SCALE = 11183` 和 `ACCEL_SCALE = 39.28`
- 移除任意的 `gameScale = 1e6` 因子
- 使用物理正确的单位转换

### 3. 太阳辐射压 (Solar Radiation Pressure)

**问题**：同样混合了 SI 单位（太阳通量、光速、面积、质量）和游戏单位（位置、距离）。

**修正**：
```javascript
// 1. 计算距离（游戏单位）
distance_game = position - sun.position

// 2. 转换为 AU
distance_AU = distance_game / 15000

// 3. 使用 SI 单位计算 SRP
flux = 1367 / (distance_AU)²  // W/m²
pressure = flux / c * (1 + R)  // Pa
a_SRP_SI = pressure * A / m    // m/s²

// 4. 转换回游戏单位
a_SRP_game = a_SRP_SI / 39.28
```

**代码修改**：
- 添加常数 `ACCEL_SCALE = 39.28`
- 移除任意的 `gameScale = 1e6` 因子
- 使用物理正确的单位转换

## 物理正确性验证 (Physical Correctness Verification)

### 大气阻力量级估算

在 200 km 高度，国际空间站轨道：

```
ρ = 2.5 × 10⁻¹⁰ kg/m³
v ≈ 7800 m/s
A = 10 m²
m = 1000 kg
C_d = 2.2

a_drag = 0.5 * 2.5e-10 * 7800² * 2.2 * 10 / 1000
       = 1.67 × 10⁻⁴ m/s²

游戏单位：a_drag_game = 1.67e-4 / 39.28 = 4.25 × 10⁻⁶ 游戏加速度单位
```

这是一个非常小的效应，符合现实！国际空间站每天损失约 2 km 高度。

### 太阳辐射压量级估算

在 1 AU 距离：

```
flux = 1367 W/m²
c = 3 × 10⁸ m/s
R = 0.3 (反射率)
A = 10 m²
m = 1000 kg

pressure = 1367 / (3e8) * (1 + 0.3) = 5.92 × 10⁻⁶ Pa
force = 5.92e-6 * 10 = 5.92 × 10⁻⁵ N
a_SRP = 5.92e-5 / 1000 = 5.92 × 10⁻⁸ m/s²

游戏单位：a_SRP_game = 5.92e-8 / 39.28 = 1.51 × 10⁻⁹ 游戏加速度单位
```

这也是一个极小的效应，对于小质量航天器（如太阳帆）才明显。

## 结论 (Conclusion)

1. **所有 HPOP 摄动项现在使用物理正确的单位转换**
2. **移除了所有任意的缩放因子**（如 gameScale = 1e6）
3. **保持了物理一致性**：真实世界中的微小摄动在游戏中也是微小的
4. **飞船不应再高速飞离**：所有加速度现在都在正确的量级上

如果需要让摄动效果更明显（用于教学或游戏性），应该：
- 增加飞船面积（A）或减少质量（m）
- 提高轨道高度以测试 J2 效应
- 接近太阳以测试太阳辐射压
- **不应该**修改物理常数或使用任意缩放因子
