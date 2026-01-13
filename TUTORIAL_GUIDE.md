# 🎓 Tutorial System Guide

## Overview

The tutorial system provides an interactive, step-by-step introduction to the space navigation game. It guides players through all essential controls and teaches them how to perform an Earth-to-Moon orbital transfer.

## Features

### 🎯 Tutorial Steps

The tutorial consists of 11 progressive steps:

1. **Welcome & Solar System Overview**
   - Introduces the mission objective (Earth → Moon transfer)
   - Emphasizes limited fuel and the need for gravity assists
   - Shows wide view of the solar system

2. **Camera Navigation - Number Keys**
   - Teaches number keys [1-9, 0] to view different celestial bodies
   - [H] key to return to solar system overview
   - Prompts player to press [4] to view Earth

3. **Spacecraft Close-up**
   - Auto-focuses on the player's spacecraft
   - Shows the red trail (past path) and green line (predicted trajectory)
   - Demonstrates spacecraft appearance

4. **Camera Controls**
   - Mouse wheel zoom in/out
   - Arrow keys to rotate camera
   - [C] quick zoom to spaceship
   - [Z] zoom out (wide view)

5. **Reference Frames**
   - Introduces [F] key to cycle through reference frames
   - Sun Frame (inertial)
   - Earth Frame (rotating with Earth)
   - Moon Frame (rotating with Moon)
   - Switches view to Earth for demonstration

6. **View Target: The Moon**
   - Auto-focuses on the Moon
   - Shows the glowing checkpoint (tutorial objective)
   - Emphasizes distance and fuel constraints

7. **Thrust Controls**
   - [W] Forward, [S] Backward
   - [A] Left, [D] Right
   - [Space] Up, [V] Down
   - [Shift] Boost (2.5x thrust, higher fuel consumption)
   - Focuses camera back on spaceship

8. **Pause & Trajectory Planning**
   - [P] key to pause simulation
   - Shows predicted trajectory (green line)
   - Enables trajectory planning without wasting fuel

9. **Velocity Adjustment**
   - Arrow keys to adjust velocity while paused
   - [↑] Forward, [↓] Backward
   - [←] Left, [→] Right
   - [PgUp/PgDn] Up/Down
   - Green trajectory line updates in real-time

10. **Apply Velocity Changes**
    - [Enter] to apply planned velocity change
    - [P] to resume without applying
    - Fuel consumption based on Tsiolkovsky rocket equation

11. **Mission: Earth to Moon**
    - Combines all learned skills
    - Guides player to reach the Moon checkpoint
    - Tutorial completes when checkpoint is collected

12. **Tutorial Complete**
    - Congratulatory message
    - Summary of learned skills
    - Additional tips (ESC menu, F5/F9 save/load)
    - Transitions to free flight mode

## Technical Implementation

### File Structure

```
spacedemo/
├── tutorial_manager.js    # Tutorial system implementation
├── game_v2.js            # Main game (tutorial integrated)
└── start_screen.js       # Start screen (triggers tutorial)
```

### Key Classes

#### `TutorialManager`

**Location:** `tutorial_manager.js`

**Properties:**
- `currentStep` - Current tutorial step index
- `isActive` - Whether tutorial is running
- `completedActions` - Set of completed user actions
- `steps` - Array of tutorial step configurations

**Methods:**
- `startTutorial()` - Begins the tutorial sequence
- `endTutorial()` - Ends tutorial and transitions to free flight
- `showStep(stepIndex)` - Displays a specific tutorial step
- `update(deltaTime)` - Updates tutorial state each frame
- `pause()/resume()` - Pause/resume tutorial (e.g., when menu opens)
- `skipTutorial()` - Skip tutorial for advanced users

**Step Configuration:**

Each step has:
- `id` - Unique identifier
- `title` - Step title (displayed in cyan)
- `message` - Instructional text (supports **bold** markup)
- `hint` - Action hint (displayed in yellow)
- `cameraSetup` - Function to position camera (optional)
- `checkCompletion` - Function to check if step is complete
- `onComplete` - Callback when step completes (optional)

### Integration Points

#### game_v2.js

**Import:**
```javascript
import { TutorialManager } from './tutorial_manager.js';
```

**Initialization:**
```javascript
// In constructor:
this.tutorialManager = null;

// In init():
this.tutorialManager = new TutorialManager(this);

// In startGame():
if (this.tutorialMode && this.tutorialManager) {
  this.tutorialManager.startTutorial();
}

// In animate():
if (this.tutorialManager) {
  this.tutorialManager.update(deltaTime);
}
```

#### start_screen.js

No changes needed - tutorial starts automatically when `game.startGame()` is called if `tutorialMode === true`.

## UI Styling

The tutorial UI matches the game's tech-style aesthetic:

- **Container:** Full-screen overlay (z-index: 9999)
- **Message Box:**
  - Bottom-center position
  - Black background (95% opacity)
  - Green border (#00ff00)
  - Monospace font (JetBrains Mono / Source Code Pro / Courier New)
  - Green text with glow effect
  - Max width: 700px

- **Title:** Cyan (#00ffff), 18px, bold
- **Hint:** Yellow (#ffff00), 14px, italic, centered

- **Text Formatting:**
  - `**text**` renders as bold red (#ff4444)
  - Preserves line breaks
  - 1.8 line height for readability

## User Actions Tracked

The tutorial tracks the following user actions to determine step completion:

- `pressedEnter` - Enter key pressed
- `viewedEarth` - Pressed [4] to view Earth
- `viewedMoon` - Pressed [5] to view Moon
- `viewedSpaceship` - Pressed [9] to view spaceship
- `switchedFrame` - Pressed [F] to change reference frame
- `usedThrust` - Used any thrust key (W/A/S/D/Space/V)
- `usedMouseWheel` - Zoomed with mouse wheel
- `adjustedVelocity` - Used arrow keys while paused
- `appliedVelocity` - Pressed Enter to apply velocity change
- `completedTutorial` - Reached Moon checkpoint or pressed Enter on final step

## Auto-Advance Timers

Some steps auto-advance after a timeout if the user doesn't interact:

- Step 2 (View Spaceship): 3 seconds
- Step 3 (Camera Controls): 5 seconds
- Step 5 (View Moon): 4 seconds

This prevents players from getting stuck on passive observation steps.

## Customization

### Adding New Steps

Add a new step object to the `steps` array in `defineTutorialSteps()`:

```javascript
{
  id: 'new_step',
  title: 'STEP TITLE',
  message: `Your message here.

  Use **bold** for emphasis.`,
  hint: 'Press [KEY] to continue',
  cameraSetup: () => {
    // Optional camera positioning
    this.game.cameraDistance = 1000;
    this.game.cameraFollowTarget = null;
  },
  checkCompletion: () => {
    // Return true when step is complete
    return this.completedActions.has('someAction');
  },
  onComplete: () => {
    // Optional cleanup/setup for next step
  }
}
```

### Modifying UI Style

Edit the `createUI()` method in `tutorial_manager.js` to change:
- Colors, fonts, sizes
- Position (currently bottom-center)
- Border styles, shadows
- Animation effects

### Disabling Tutorial

In `game_v2.js`, set:

```javascript
this.tutorialMode = false; // Disable tutorial on game start
```

Or add a "Skip Tutorial" option in the start screen.

## Testing

### Manual Testing Checklist

1. ✅ Start screen appears
2. ✅ Select "START" option
3. ✅ Tutorial welcome message appears
4. ✅ Press Enter to proceed
5. ✅ Camera navigation step - press [4] for Earth
6. ✅ Spaceship view step - auto-advances
7. ✅ Camera controls - zoom with mouse wheel
8. ✅ Reference frames - press [F]
9. ✅ Moon view - press [5] or auto-advances
10. ✅ Thrust controls - press [W]
11. ✅ Pause - press [P]
12. ✅ Velocity adjustment - use arrow keys
13. ✅ Resume - press [P] or [Enter]
14. ✅ Reach Moon checkpoint
15. ✅ Tutorial complete message
16. ✅ Press Enter to start free flight
17. ✅ Tutorial UI disappears

### Integration Testing

- Tutorial doesn't interfere with save/load system
- Tutorial doesn't block menu access (ESC key)
- Tutorial pauses when menu is open
- Tutorial resumes when menu closes
- Camera controls work during tutorial
- Physics simulation runs correctly during tutorial

## Future Enhancements

Potential improvements for the tutorial system:

1. **Visual Highlights**
   - Highlight UI elements being taught
   - Animated arrows pointing to controls
   - Glow effects on relevant buttons

2. **Progressive Checkpoints**
   - Intermediate checkpoints (e.g., "achieve stable Earth orbit")
   - Branching tutorial paths based on player skill
   - Optional advanced tutorials (gravity assists, Hohmann transfers)

3. **Replay System**
   - Allow players to replay specific tutorial sections
   - In-game tutorial reference (help menu)
   - Video playback of successful maneuvers

4. **Localization**
   - Multi-language support
   - Text formatting for different character sets

5. **Accessibility**
   - Screen reader support
   - High-contrast mode
   - Keyboard-only navigation indicators

## Troubleshooting

### Tutorial Doesn't Start

**Issue:** Tutorial doesn't appear after clicking START.

**Solutions:**
1. Check browser console for errors
2. Verify `tutorialMode === true` in game constructor
3. Ensure `tutorialManager` is initialized in `init()`
4. Confirm `startTutorial()` is called in `startGame()`

### Steps Don't Advance

**Issue:** Tutorial gets stuck on a step.

**Solutions:**
1. Check `checkCompletion()` function for that step
2. Verify user action is being tracked (add console.log in event listeners)
3. Check for auto-advance timer (some steps have timeouts)
4. Ensure `update()` is being called in animation loop

### UI Not Visible

**Issue:** Tutorial messages don't appear on screen.

**Solutions:**
1. Check z-index conflicts with other UI elements
2. Verify `container.style.display !== 'none'`
3. Check browser console for CSS errors
4. Ensure DOM elements are created before game starts

### Camera Doesn't Move

**Issue:** Camera setup in steps doesn't work.

**Solutions:**
1. Verify `cameraSetup()` function is being called
2. Check if manual camera control is disabled
3. Ensure celestial bodies exist (e.g., `this.earthBody` not null)
4. Test camera controls outside tutorial mode

## Credits

**Design:** Tech-style terminal UI inspired by sci-fi interfaces
**Implementation:** TutorialManager class with step-based progression
**Integration:** Seamless integration with existing game systems

**Font:** JetBrains Mono, Source Code Pro, Courier New (monospace)
**Colors:** Matrix-style green (#00ff00), cyan (#00ffff), yellow (#ffff00), red (#ff4444)

---

**Version:** 1.0
**Last Updated:** 2025-12-30
**Author:** Space Navigation Tutorial System
