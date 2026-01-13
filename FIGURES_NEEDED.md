# Final Report - Required Figures

## 需要收集的图片列表

### 1. Figure 1: Game Overview (fig:overview)
**位置:** Introduction section
**内容:** Solar system overview with trajectory lines
**建议截图内容:**
- 显示完整太阳系（Sun, Earth, Moon, Mars, Jupiter等）
- 有轨道轨迹线（orbit trails）
- 飞船可见
- HUD显示在屏幕上

**如何获取:** 启动游戏，按 Z 键缩放到太阳系视图，截图

---

### 2. Figure 2: Physics Pipeline (fig:physics_pipeline)
**位置:** Method - Physics Engine Architecture
**内容:** Physics update loop flowchart
**建议内容:**
- 可以用流程图工具绘制
- 显示：calculateGravitationalForces → calculateHPOPPerturbations → update velocity → update position
- 或者直接用文字描述框图

---

### 3. Figure 3: J2 Effect Visualization (fig:j2_effect)
**位置:** Method - HPOP section
**内容:** J2 perturbation effect on orbit
**建议内容:**
- 显示地球轨道上飞船经过多圈后的轨道进动（precession）
- 可以用长时间暂停后显示的轨迹预测线
- 或者用 orbit trails 显示多圈轨道的变化

**如何获取:**
1. 启动游戏，进入低地球轨道
2. 长时间运行让 orbit trail 积累
3. 切换到 Earth-centric view (按 F)
4. 截图显示轨道进动

---

### 4. Figure 4: HPOP Contributions Comparison (fig:hpop_comparison)
**位置:** Method - HPOP section
**内容:** Bar chart comparing magnitude of different perturbations
**建议内容:**
- X轴：不同高度（LEO 200km, MEO 1000km, GEO 36000km, Lunar orbit）
- Y轴：加速度大小（对数坐标）
- 多个柱子：J2, Third-body, Drag, SRP
- 可以用浏览器控制台的调试输出数据手动绘制
- 或者用 Python matplotlib 生成

**数据来源:**
- 在 physics.js 中添加临时 console.log
- 记录不同高度下各个摄动项的加速度大小
- 用 Excel 或 Python 绘制

---

### 5. Figure 5: Trajectory Prediction (fig:trajectory_pred)
**位置:** Method - Trajectory Prediction System
**内容:** Screenshot showing yellow predicted trajectory
**建议截图内容:**
- 按 P 键暂停游戏
- 黄色的轨迹预测线清晰可见
- 显示 Hohmann transfer 轨迹
- UI 显示 "TRAJECTORY PLANNING MODE"

**如何获取:**
1. 启动游戏，Earth-Moon mission
2. 按 P 暂停
3. 用箭头键调整速度，观察黄色轨迹
4. 截图

---

### 6. Figure 6: Reference Frame Switching (fig:ref_frames)
**位置:** Method - Reference Frame Transformations
**内容:** Three views showing Sun/Earth/Moon frames
**建议内容:**
- 三张截图并排显示
- 左：Sun-centric view
- 中：Earth-centric view
- 右：Moon-centric view
- 同一个飞船轨迹在不同参考系下的显示

**如何获取:**
1. 进入 Earth-Moon mission
2. 截图 Sun view (默认)
3. 按 F 切换到 Earth view，截图
4. 再按 F 切换到 Moon view，截图
5. 用图片编辑软件拼接成一行

---

### 7. Figure 7: System Architecture Diagram (fig:architecture)
**位置:** Method - Game Systems Architecture
**内容:** Modular architecture diagram
**建议内容:**
- 用画图工具（draw.io, PowerPoint等）绘制
- 分层显示：Core → Systems → Rendering → Entities → UI → Config
- 每层列出主要的类/文件名

**工具推荐:** draw.io (免费在线工具)

---

### 8. Figure 8: Save/Load UI (fig:saveload)
**位置:** Method - Save/Load System
**内容:** Save/load interface screenshot
**建议截图内容:**
- 按 ESC 打开 pause menu
- 点击 "Save/Load"
- 显示多个 save slots
- 有时间戳和预览信息

**如何获取:**
1. 游戏中按 ESC
2. 点击 Save/Load 按钮
3. 截图

---

### 9. Figure 9: Hohmann Transfer (fig:hohmann)
**位置:** Results - Mission Completion
**内容:** Earth-Moon Hohmann transfer showing optimal two-burn trajectory
**建议截图内容:**
- Earth-centric view
- 清晰显示椭圆转移轨道
- 起始点在低地球轨道
- 目标点在月球轨道

**如何获取:**
1. 完成 Earth-Moon mission
2. Earth-centric view
3. orbit trail 显示完整轨迹
4. 截图

---

### 10. Figure 10: Gravity Assist (fig:gravity_assist)
**位置:** Results - Mission Completion
**内容:** Gravity assist maneuver using Moon
**建议截图内容:**
- Moon-centric view 更好
- 显示飞船接近月球时轨迹的弯曲
- 显示速度增加（可以从 HUD 看出）

**如何获取:**
1. Lunar Gravity Assist mission
2. 接近月球时切换到 Moon-centric view
3. orbit trail 显示弯曲轨迹
4. 截图

---

### 11. Figure 11: Halley Mission (fig:halley)
**位置:** Results - Mission Completion
**内容:** Halley's Comet orbit and intercept trajectory
**建议截图内容:**
- Sun-centric view
- 显示 Halley 的椭圆轨道（非常扁）
- 飞船的拦截轨迹
- Halley's Comet 可见

**如何获取:**
1. Halley mission
2. Sun-centric view (按 H)
3. 缩放到能看到 Halley 完整轨道
4. 截图

---

### 12. Figure 12: Accuracy Validation (fig:accuracy)
**位置:** Results - Performance Analysis
**内容:** Graph showing orbital period comparison
**建议内容:**
- 柱状图或表格
- 比较：Moon (27.3 vs 27.2 days), Mars (687 vs 685 days)
- 显示误差百分比 < 0.5%

**如何制作:**
- 用 Excel 或 Python matplotlib
- 数据来自 README 中的天体配置

---

## 图片格式要求

- **格式:** PNG 或 JPG
- **分辨率:** 至少 1920x1080
- **文件大小:** 每张 < 2MB
- **命名规范:** fig1_overview.png, fig2_pipeline.png, etc.
- **存放位置:** `space-navigation-game/pics/` 文件夹

## 插入图片的步骤

1. 收集所有图片，保存到 `pics/` 文件夹
2. 在 LaTeX 中，替换 `\fbox{\textit{[INSERT: ...]}}` 为：
   ```latex
   \includegraphics[width=0.9\linewidth]{pics/fig1_overview.png}
   ```
3. 编译 LaTeX 查看效果

## 可选：额外的图片

如果需要更多视觉效果，可以添加：
- Tutorial system 截图
- Mission selector 界面
- Rocket selector 界面
- HUD 特写
- 控制台调试输出（HPOP DEBUG logs）
- 性能监控图表

## 快速截图技巧

1. 启动游戏后按 F11 进入全屏（更好的截图效果）
2. 使用 Windows 截图工具（Win + Shift + S）或 Snipping Tool
3. 或者使用浏览器内置的截图功能（F12 → Console → 右键截图）
4. 调整游戏画质设置到最高（如果需要）
