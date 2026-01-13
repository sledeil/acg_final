# 🚀 Space Navigation Game

An educational Three.js-based space navigation game featuring **realistic Newtonian physics**, gravitational mechanics, and orbital slingshot maneuvers. Master the art of orbital mechanics to navigate through the solar system!

## ✨ Features

- **Realistic N-body Physics**: Full gravitational simulation of all celestial bodies
- **Multiple Reference Frames**: Switch between Sun, Earth, and Moon coordinate systems
- **Trajectory Prediction**: Plan your maneuvers with real-time trajectory visualization
- **Orbital Mechanics**: Learn Hohmann transfers, gravity assists, and orbital insertion
- **Save/Load System**: Save your progress with 10 save slots
- **Interactive Tutorial**: Step-by-step guide to master orbital mechanics
- **Multiple Spacecraft**: Choose from different rocket designs with unique characteristics

## 🎮 Controls

### Flight Controls
- **WASD**: Thrust in camera-relative directions
- **Space**: Thrust upward
- **V**: Thrust downward
- **Shift**: Boost mode (2.5x thrust)

### Camera Controls
- **Left Mouse Drag**: Rotate camera around spacecraft
- **Middle Mouse Drag**: Pan camera
- **Mouse Wheel**: Zoom in/out
- **C**: Focus on spacecraft
- **H**: View from Sun
- **Z**: Zoom out to solar system view
- **1-9, 0**: Quick view of celestial bodies

### Game Controls
- **P**: Pause and enter trajectory planning mode
- **Arrow Keys**: Adjust planned velocity (when paused)
- **PageUp/PageDown**: Adjust vertical velocity
- **Enter**: Apply planned trajectory and resume
- **Backspace**: Reset velocity adjustment
- **F**: Toggle reference frame (Sun → Earth → Moon)
- **X**: Clear orbit trails
- **U**: Toggle mute
- **ESC**: Open pause menu

### Save/Load
- **F5**: Quick save to slot 0
- **F9**: Quick load from slot 0
- **F1-F4**: Quick save to slots 1-4
- **Ctrl+F1-F4**: Quick load from slots 1-4

## 🌍 Celestial Bodies

The game features a scientifically accurate (scaled) solar system:
- **Sun**: The center of the solar system
- **Mercury**: Innermost planet with fast orbit
- **Venus**: Second planet with retrograde rotation
- **Earth**: Our home planet
- **Moon**: Earth's natural satellite
- **Mars**: The Red Planet
- **Phobos**: Mars' largest moon
- **Jupiter**: Gas giant with massive gravity
- **Halley's Comet**: Periodic comet with eccentric orbit

## 🚀 Getting Started

### Prerequisites
You need a local web server to run the game (ES6 modules requirement):

```bash
# Using Python 3
python -m http.server 8080

# Using Node.js
npx http-server -p 8080

# Using PHP
php -S localhost:8080
```

### Running the Game

1. Start a local web server in the project directory
2. Open your browser and navigate to `http://localhost:8080`
3. Click "Start Mission" to begin
4. Follow the interactive tutorial to learn the controls

## 📁 Project Structure

```
space-navigation-game/
├── config/              # Game configuration files
│   ├── CelestialConfig.js    # Celestial body parameters
│   ├── GameConfig.js         # Game settings
│   ├── PhysicsConstants.js   # Physical constants
│   └── UIConfig.js           # UI configuration
├── entities/            # Game entities
│   ├── CelestialBodyFactory.js
│   └── CelestialBodyManager.js
├── physics/             # Physics engine
│   └── physics.js
├── rendering/           # Rendering systems
│   ├── SceneSetup.js
│   └── VisualEffects.js
├── systems/             # Game systems
│   ├── AudioManager.js
│   ├── CameraController.js
│   ├── CheckpointManager.js
│   ├── InputManager.js
│   ├── LabelManager.js
│   ├── ReferenceFrameManager.js
│   ├── SaveLoadManager.js
│   ├── SpaceshipController.js
│   └── TrajectoryManager.js
├── ui/                  # User interface
│   ├── mission_selector.js
│   ├── rocket_selector.js
│   ├── save_load_ui.js
│   ├── start_screen.js
│   ├── tutorial_manager.js
│   └── ui_manager.js
├── utils/               # Utility functions
│   └── flame_manager.js
├── assets/              # 3D models and sprites
├── textures/            # Planet textures
├── save_system/         # Save/load system
├── index.html           # Main entry point
├── start.html           # Start screen
└── game.js              # Main game logic

```

## 🎓 Educational Value

This game teaches:
- **Orbital Mechanics**: Understanding how objects move in space
- **Gravity Assists**: Using planetary gravity to change trajectory
- **Delta-V Budgeting**: Managing limited fuel resources
- **Reference Frames**: Understanding motion in different coordinate systems
- **Hohmann Transfers**: Efficient orbital maneuvers
- **N-body Physics**: Complex gravitational interactions

## 🛠️ Technology Stack

- **Three.js**: 3D graphics rendering
- **Vanilla JavaScript**: ES6 modules
- **Web Audio API**: Sound effects and music
- **LocalStorage**: Save game persistence
- **CSS3**: User interface styling

## 📊 Code Quality

- **Modular Architecture**: Clean separation of concerns
- **62.5% Code Reduction**: Refactored from 3655 to 1370 lines
- **Manager Pattern**: Specialized systems for different game aspects
- **Factory Pattern**: Efficient entity creation
- **Component-based Saving**: Flexible save/load system

## 🎮 Gameplay Tips

1. **Start in Orbit**: You begin in a stable orbit around Earth
2. **Plan Ahead**: Use the trajectory prediction (P key) before major burns
3. **Save Often**: Use F5 to quick-save your progress
4. **Reference Frames**: Press F to see motion from different perspectives
5. **Fuel Management**: Boost mode is powerful but burns fuel quickly
6. **Gravity Assists**: Use planetary flybys to gain speed without fuel

## 🐛 Known Issues

- High time scales (>10x) may cause physics instability
- Very close approaches to massive bodies may cause unexpected behavior
- Save files are stored in browser localStorage (cleared if you clear browser data)

## 📝 License

This project is for educational purposes. Feel free to use and modify for learning.

## 🤝 Contributing

Contributions are welcome! This is an educational project aimed at teaching orbital mechanics through interactive gameplay.

## 🌟 Acknowledgments

- NASA for planetary data and inspiration
- Three.js community for excellent 3D library
- KSP (Kerbal Space Program) for gameplay inspiration
- Physics textbooks for accurate orbital mechanics formulas

## 📞 Contact

For questions, suggestions, or feedback, please open an issue on GitHub.

---

**Happy Space Traveling! 🚀🌌**
