/**
 * Tutorial Manager - Interactive step-by-step tutorial system
 * Guides players through basic controls and Earth-to-Moon transfer
 * Matches the tech-style UI of the game
 */

import * as THREE from 'three';

export class TutorialManager {
  constructor(game) {
    this.game = game;
    this.currentStep = 0;
    this.isActive = false;
    this.isPaused = false;
    this.isTransitioning = false; // Prevent multiple step transitions
    this.stepCompleted = false; // Track if current step action is completed (waiting for Enter)

    // Tutorial completion trackers
    this.completedActions = new Set();
    this.stepStartTime = 0;

    // UI elements
    this.container = null;
    this.messageBox = null;
    this.highlightOverlay = null;

    // Drag state
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // Minimize/Maximize state
    this.isMinimized = false;

    // Tutorial steps configuration
    this.steps = this.defineTutorialSteps();

    this.init();
  }

  init() {
    this.createUI();
  }

  /**
   * Define all tutorial steps with conditions and instructions
   */
  defineTutorialSteps() {
    return [
      // Step 0: Welcome and solar system overview
      {
        id: 'welcome',
        title: 'WELCOME TO ORBITAL MECHANICS',
        message: `You are commanding a spacecraft in our solar system.

Your mission: **Transfer from Earth orbit to the Moon.**

But there's a problem — your fuel is **limited**.
Direct flight won't work. You'll need to use **gravity** wisely.

First, let's get familiar with the controls.`,
        hint: 'Press [ENTER] to continue\nPress [TAB] to skip (I\'m a genius!)',
        cameraSetup: () => {
          // Wide view of solar system
          this.game.cameraDistance = 25000;
          this.game.cameraFollowTarget = null;
          this.game.cameraLookAtPoint.set(0, 0, 0);
          this.game.cameraYaw = 0;
          this.game.cameraPitch = Math.PI / 4;
        },
        checkCompletion: () => {
          return this.completedActions.has('pressedEnter_welcome');
        }
      },

      // Step 1: Physics panel introduction
      {
        id: 'physics_panel',
        title: 'PHYSICS SIMULATION CONTROLS',
        message: `Before we begin, let's learn about the simulation controls.

Look at the **right side panel** and click **"Physics"** to open it.

Inside, you'll find:

**Timescale**: Controls simulation speed
• Higher = faster simulation (good for long journeys)
• Lower = slower, more precise control

**Substeps**: Simulation precision per frame
• Higher = more accurate physics (use for close approaches)
• Lower = faster performance

Try adjusting these values to see how they work.`,
        hint: 'Click "Physics" on the right, then press [ENTER]',
        cameraSetup: () => {
          // Keep wide view
          this.game.cameraDistance = 25000;
          this.game.cameraFollowTarget = null;
        },
        checkCompletion: () => {
          return this.completedActions.has('confirmedStep');
        }
      },

      // Step 2: Camera controls - View planets with number keys
      {
        id: 'camera_numbers',
        title: 'NAVIGATION: CELESTIAL BODIES',
        message: `Use **number keys** to view different celestial bodies:

[1] Sun      [2] Mercury   [3] Venus
[4] Earth    [5] Moon      [6] Mars
[7] Phobos   [8] Jupiter   [9] Spaceship
[0] Halley's Comet

[H] Return to solar system overview`,
        hint: 'Try pressing [4] to view Earth',
        cameraSetup: null,
        checkCompletion: () => {
          return this.completedActions.has('confirmedStep');
        }
      },

      // Step 2: View the spaceship up close
      {
        id: 'view_spaceship',
        title: 'YOUR SPACECRAFT',
        message: `This is your spacecraft.

The **red trail** shows where you've been.
The **yellow line** (when visible) shows your predicted trajectory.

Now let's focus on your spacecraft.`,
        hint: 'Press [9] to focus on your spaceship',
        cameraSetup: () => {
          // Show spaceship close up
          this.game.cameraFollowTarget = this.game.spaceship;
          this.game.cameraLookAtPoint.copy(this.game.spaceship.position);
          this.game.cameraDistance = 20;
        },
        checkCompletion: () => {
          return this.completedActions.has('confirmedStep');
        }
      },

      // Step 3: Mouse camera control
      {
        id: 'camera_mouse',
        title: 'CAMERA CONTROL',
        message: `Control the camera view:

**Mouse Wheel**: Zoom in/out
**Arrow Keys**: Rotate camera angle

You can also use:
[C] Quick zoom to spaceship
[Z] Zoom out (wide view)`,
        hint: 'Try zooming with your mouse wheel',
        cameraSetup: null,
        checkCompletion: () => {
          return this.completedActions.has('confirmedStep');
        }
      },

      // Step 4: Reference frames (F key)
      {
        id: 'reference_frames',
        title: 'REFERENCE FRAMES',
        message: `In space, motion is relative.

Press **[F]** to cycle through reference frames:
• **Sun Frame** (inertial)
• **Earth Frame** (rotating with Earth)
• **Moon Frame** (rotating with Moon)

This helps visualize your motion relative to your target.`,
        hint: 'Press [F] to switch reference frame',
        cameraSetup: () => {
          // Switch to Earth view
          if (this.game.earthBody) {
            this.game.cameraFollowTarget = this.game.earthBody.mesh;
            this.game.cameraLookAtPoint.copy(this.game.earthBody.mesh.position);
            this.game.cameraDistance = 20;
          }
        },
        checkCompletion: () => {
          return this.completedActions.has('confirmedStep');
        }
      },

      // Step 5: View the Moon (target)
      {
        id: 'view_moon',
        title: 'YOUR TARGET: THE MOON',
        message: `There it is — the **Moon**.

You'll see a **glowing checkpoint** near the Moon.
That's your destination.

Notice the distance. A direct flight would consume too much fuel.
You'll need a more elegant solution.`,
        hint: 'Press [5] to focus on the Moon',
        cameraSetup: null,
        checkCompletion: () => {
          return this.completedActions.has('confirmedStep');
        }
      },

      // Step 6: Thrust controls
      {
        id: 'thrust_controls',
        title: 'THRUST CONTROLS',
        message: `Your spacecraft has directional thrusters:

**[W]** Forward    **[S]** Backward
**[A]** Left       **[D]** Right
**[Space]** Up     **[V]** Down

**[Shift]** Boost (2.5x thrust, higher fuel consumption)

Watch your **fuel gauge** (top-left panel).`,
        hint: 'Try pressing [W] to activate thrusters (optional: press [9] for ship view)',
        cameraSetup: () => {
          // Only adjust camera if user is following the spaceship
          // If user focused on Moon (or other body), leave camera alone
          if (!this.game.cameraFollowTarget || this.game.cameraFollowTarget === this.game.spaceship) {
            this.game.cameraDistance = 20;
          }
          // Otherwise preserve user's camera choice (e.g., viewing Moon with [5])
        },
        checkCompletion: () => {
          return this.completedActions.has('confirmedStep');
        }
      },

      // Step 7: Pause and trajectory planning (P key)
      {
        id: 'pause_planning',
        title: 'ORBITAL PLANNING',
        message: `The **[P]** key is your most important tool.

Press **[P]** to **PAUSE** the simulation.

While paused, you can:
• View your predicted trajectory (yellow line)
• Plan velocity changes without wasting fuel
• Adjust your velocity vector using arrow keys
• Adjust **Physics Timescale** and **Steps** on the right panel to control simulation speed and precision`,
        hint: 'Press [P] to pause',
        cameraSetup: null, // Preserve current camera state
        checkCompletion: () => {
          return this.completedActions.has('confirmedStep');
        }
      },

      // Step 8: Velocity adjustment with arrow keys
      {
        id: 'velocity_adjustment',
        title: 'PLANNING MODE: VELOCITY ADJUSTMENT',
        message: `Good! The simulation is **PAUSED**.

While paused, use **arrow keys** to adjust your velocity:

**[↑]** Increase Z velocity (forward in view)
**[↓]** Decrease Z velocity
**[←]** Decrease X velocity (left)
**[→]** Increase X velocity (right)
**[PgUp/PgDn]** Adjust Y velocity (up/down)

The **yellow line** shows your predicted path.
Try adjusting to see how it changes.`,
        hint: 'Use arrow keys to adjust trajectory, then press [ENTER]',
        cameraSetup: () => {
          // Ensure game stays paused (don't change pause state if already paused)
          if (!this.game.isPaused) {
            this.game.isPaused = true;
          }
        },
        checkCompletion: () => {
          return this.completedActions.has('confirmedStep');
        }
      },

      // Step 9: Apply velocity change
      {
        id: 'apply_velocity',
        title: 'APPLYING VELOCITY CHANGES',
        message: `When you're happy with your planned trajectory:

Press **[Enter]** to **APPLY** the velocity change
Press **[P]** again to **RESUME** without applying

The velocity adjustment will consume fuel based on the
**Tsiolkovsky rocket equation** (realistic physics!).`,
        hint: 'Press [Enter] to apply, or [P] to resume simulation',
        cameraSetup: null,
        checkCompletion: () => {
          return !this.game.isPaused || this.completedActions.has('appliedVelocity');
        }
      },

      // Step 10: Plan Earth-to-Moon transfer
      {
        id: 'plan_transfer',
        title: 'YOUR MISSION: EARTH TO MOON',
        message: `Now it's time to plan your transfer.

**Strategy:**
1. Press [P] to pause
2. Adjust velocity to aim toward the Moon
3. Use minimal fuel — let gravity do the work
4. Press [Enter] to apply the burn
5. Coast to the Moon checkpoint

The **checkpoint** is the glowing octahedron near the Moon.

Remember: You can pause **[P]** anytime to replan!`,
        hint: 'Reach the Moon checkpoint to complete the tutorial',
        cameraSetup: () => {
          // Preserve user's camera target choice (may be focused on Moon)
          // Only ensure camera is at reasonable distance if too far
          if (this.game.cameraDistance > 1000) {
            this.game.cameraDistance = 200;
          }
        },
        checkCompletion: () => {
          // Check if tutorial checkpoint is collected
          return this.game.tutorialCompleted;
        }
      },

      // Step 11: Tutorial complete
      {
        id: 'complete',
        title: 'READY FOR FREE FLIGHT',
        message: `**TUTORIAL COMPLETE!**

You've learned the essentials:
✓ Camera navigation
✓ Reference frames
✓ Trajectory planning
✓ Orbital mechanics

The Mars mission is now active!

**Next Steps:**
• Navigate to Mars and maintain orbit for 60 seconds
• Press [ESC] to access the menu
• Use [F5]/[F9] for quick save/load
• Experiment with gravity assists!

Press [ENTER] when ready to begin free flight.`,
        hint: 'Press [ENTER] to start free flight',
        cameraSetup: () => {
          this.game.cameraFollowTarget = this.game.spaceship;
          this.game.cameraDistance = 200;
        },
        checkCompletion: () => {
          return this.completedActions.has('completedTutorial');
        },
        onComplete: () => {
          this.game.tutorialMode = false;
          this.endTutorial();
        }
      }
    ];
  }

  /**
   * Create tutorial UI elements
   */
  createUI() {
    // Add CSS animations and custom scrollbar for feedback
    if (!document.getElementById('tutorial-animations')) {
      const style = document.createElement('style');
      style.id = 'tutorial-animations';
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        /* Custom scrollbar for tutorial content */
        #tutorial-content::-webkit-scrollbar {
          width: 8px;
        }

        #tutorial-content::-webkit-scrollbar-track {
          background: rgba(0, 255, 0, 0.1);
          border-radius: 4px;
        }

        #tutorial-content::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 0, 0.5);
          border-radius: 4px;
        }

        #tutorial-content::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 0, 0.8);
        }
      `;
      document.head.appendChild(style);
    }

    // Main container
    this.container = document.createElement('div');
    this.container.id = 'tutorial-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      display: none;
    `;

    // Message box (bottom-right, draggable)
    this.messageBox = document.createElement('div');
    this.messageBox.id = 'tutorial-message';
    this.messageBox.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 500px;
      width: 500px;
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #00ff00;
      border-radius: 8px;
      padding: 0;
      color: #00ff00;
      font-family: 'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.8;
      text-shadow: 0 0 10px #00ff00;
      box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
      pointer-events: auto;
      cursor: move;
      z-index: 10000;
    `;

    // Create drag handle (title bar)
    this.dragHandle = document.createElement('div');
    this.dragHandle.id = 'tutorial-drag-handle';
    this.dragHandle.style.cssText = `
      background: linear-gradient(180deg, rgba(0, 255, 0, 0.2), rgba(0, 255, 0, 0.05));
      border-bottom: 1px solid #00ff00;
      padding: 10px 15px;
      border-radius: 6px 6px 0 0;
      cursor: move;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    // Create title text
    const titleText = document.createElement('span');
    titleText.style.cssText = 'color: #00ff00; font-weight: bold; font-size: 13px;';
    titleText.textContent = '📖 TUTORIAL';

    // Create control buttons container
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = 'display: flex; gap: 10px; align-items: center;';

    // Create minimize/maximize button
    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'tutorial-toggle-btn';
    this.toggleButton.innerHTML = '▼'; // Minimize icon
    this.toggleButton.style.cssText = `
      background: rgba(0, 255, 0, 0.2);
      border: 1px solid #00ff00;
      color: #00ff00;
      font-size: 12px;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    this.toggleButton.addEventListener('mouseenter', () => {
      this.toggleButton.style.background = 'rgba(0, 255, 0, 0.4)';
      this.toggleButton.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
    });
    this.toggleButton.addEventListener('mouseleave', () => {
      this.toggleButton.style.background = 'rgba(0, 255, 0, 0.2)';
      this.toggleButton.style.boxShadow = 'none';
    });
    this.toggleButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent dragging
      this.toggleMinimize();
    });

    // Create drag hint
    const dragHint = document.createElement('span');
    dragHint.style.cssText = 'color: #00ff00; font-size: 11px; opacity: 0.7;';
    dragHint.textContent = 'Drag to move';

    // Assemble controls
    controlsContainer.appendChild(dragHint);
    controlsContainer.appendChild(this.toggleButton);

    // Assemble drag handle
    this.dragHandle.appendChild(titleText);
    this.dragHandle.appendChild(controlsContainer);

    // Create content area
    this.messageContent = document.createElement('div');
    this.messageContent.id = 'tutorial-content';
    this.messageContent.style.cssText = `
      padding: 20px;
      max-height: 400px;
      overflow-y: auto;
    `;

    this.messageBox.appendChild(this.dragHandle);
    this.messageBox.appendChild(this.messageContent);
    this.container.appendChild(this.messageBox);
    document.body.appendChild(this.container);

    // Setup drag functionality
    this.setupDragHandlers();

    // Block wheel events on tutorial to prevent camera zoom interference
    this.messageContent.addEventListener('wheel', (e) => {
      // Allow scrolling within tutorial, but prevent propagation to game
      e.stopPropagation();
    }, { passive: false });

    // Also block wheel on the entire message box
    this.messageBox.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: false });

    // Setup keyboard listeners for tutorial
    this.setupTutorialControls();
  }

  /**
   * Setup drag handlers for moving the tutorial box
   */
  setupDragHandlers() {
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onMouseDown = (e) => {
      this.isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      // Get current position
      const rect = this.messageBox.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      // Change cursor
      this.messageBox.style.cursor = 'grabbing';
      this.dragHandle.style.cursor = 'grabbing';

      // IMPORTANT: Prevent event from reaching game camera controls
      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseMove = (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newLeft = initialLeft + deltaX;
      const newTop = initialTop + deltaY;

      // Update position (switch from bottom/right to top/left positioning)
      this.messageBox.style.bottom = 'auto';
      this.messageBox.style.right = 'auto';
      this.messageBox.style.left = `${newLeft}px`;
      this.messageBox.style.top = `${newTop}px`;

      // IMPORTANT: Prevent event from reaching game camera controls
      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseUp = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.messageBox.style.cursor = 'move';
        this.dragHandle.style.cursor = 'move';

        // IMPORTANT: Prevent event from reaching game camera controls
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Attach listeners to drag handle with capture phase to intercept early
    this.dragHandle.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);

    // Also make the whole box draggable (but not the content area to allow text selection)
    this.messageBox.addEventListener('mousedown', (e) => {
      // Only drag if clicking on the box itself, not the content
      if (e.target === this.messageBox) {
        onMouseDown(e);
      }
    }, true);

    // Prevent mouse events from reaching the game (using bubble phase)
    // This allows drag handlers (capture phase) to work first
    const preventGameInteraction = (e) => {
      // Stop propagation in bubble phase, after drag handlers have run
      e.stopPropagation();
    };

    // Attach in BUBBLE phase (false/default) so drag handlers (capture) run first
    this.messageBox.addEventListener('mousedown', preventGameInteraction);
    this.messageBox.addEventListener('mouseup', preventGameInteraction);
    this.messageBox.addEventListener('mousemove', preventGameInteraction);
    this.messageBox.addEventListener('click', preventGameInteraction);
    this.messageBox.addEventListener('dblclick', preventGameInteraction);
    this.messageBox.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
  }

  /**
   * Setup keyboard controls specific to tutorial
   */
  setupTutorialControls() {
    document.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      const step = this.steps[this.currentStep];

      // Tab key - Skip tutorial (I'm a genius!)
      if (e.code === 'Tab') {
        e.preventDefault(); // Prevent tab navigation
        this.showFeedback('🚀 Skipping tutorial - Good luck, genius!');
        setTimeout(() => {
          this.skipTutorial();
        }, 1000);
        return;
      }

      // Enter key - ONLY works on specific steps
      if (e.code === 'Enter') {
        // Welcome step - advance to next
        if (step.id === 'welcome') {
          this.completedActions.add('pressedEnter_welcome');
        }
        // Physics panel step - advance to next
        else if (step.id === 'physics_panel') {
          this.completedActions.add('confirmedStep');
        }
        // If step is completed, advance to next step
        else if (this.stepCompleted) {
          this.completedActions.add('confirmedStep');
        }
        // Apply velocity step - mark as applied
        else if (step.id === 'apply_velocity' && this.game.isPaused) {
          this.completedActions.add('appliedVelocity');
          this.showFeedback('✓ Velocity change applied!');
        }
        // Final step - complete tutorial
        else if (step.id === 'complete') {
          this.completedActions.add('completedTutorial');
        }
      }

      // Track number key presses for camera views
      if (e.code === 'Digit4') {
        if (step.id === 'camera_numbers' && !this.stepCompleted) {
          this.completedActions.add('viewedEarth');
          this.stepCompleted = true;
          this.showFeedback('✓ Well done! Earth in view.');
          this.updateHint('Press [ENTER] to continue');
          // Zoom in on Earth - 40 units distance
          this.game.cameraDistance = 40;
        }
      }
      if (e.code === 'Digit5') {
        if (step.id === 'view_moon' && !this.stepCompleted) {
          this.completedActions.add('viewedMoon');
          this.stepCompleted = true;
          this.showFeedback('✓ Moon targeted!');
          this.updateHint('Press [ENTER] to continue');
          // Don't force camera distance - let the game's number key handler manage it
          // this.game.cameraDistance = 10; // ← Removed: too close, causes camera issues
        }
      }
      if (e.code === 'Digit9') {
        if ((step.id === 'view_spaceship' || step.id === 'thrust_controls') && !this.stepCompleted) {
          this.completedActions.add('viewedSpaceship');
          this.stepCompleted = true;
          this.showFeedback('✓ Spaceship locked!');
          this.updateHint('Press [ENTER] to continue');
        }
      }

      // Track F key for reference frame - ONLY on that step
      if (e.code === 'KeyF') {
        if (step.id === 'reference_frames' && !this.stepCompleted) {
          this.completedActions.add('switchedFrame');
          this.stepCompleted = true;
          this.showFeedback('✓ Well done! Reference frame switched.');
          this.updateHint('Press [ENTER] to continue');
          // Set camera zoom to 20m
          this.game.cameraDistance = 20;
        }
      }

      // Track thrust usage - ONLY on thrust step
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyV'].includes(e.code)) {
        if (step.id === 'thrust_controls' && !this.stepCompleted) {
          this.completedActions.add('usedThrust');
          this.stepCompleted = true;
          this.showFeedback('✓ Thrust engaged! Watch your fuel.');
          this.updateHint('Press [ENTER] to continue');
        }
      }

      // Track P key for pause - ONLY on pause step
      if (e.code === 'KeyP') {
        if (step.id === 'pause_planning' && !this.stepCompleted) {
          this.completedActions.add('paused');
          this.stepCompleted = true;
          this.showFeedback('✓ Good! Simulation paused. Yellow line shows your trajectory.');
          this.updateHint('Press [ENTER] to continue');
        }
      }

      // Track mouse wheel for zoom - ONLY on camera control step
      if (e.code === 'Wheel') {
        if (step.id === 'camera_mouse' && !this.stepCompleted) {
          this.completedActions.add('usedMouseWheel');
          this.stepCompleted = true;
          this.showFeedback('✓ Nice! Camera zoom working.');
          this.updateHint('Press [ENTER] to continue');
        }
      }

      // Track arrow key usage for velocity adjustment - ONLY on that step
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'].includes(e.code)) {
        if (step.id === 'velocity_adjustment' && this.game.isPaused && !this.stepCompleted) {
          this.completedActions.add('adjustedVelocity');
          this.stepCompleted = true;
          this.showFeedback('✓ Excellent! Trajectory adjusted.');
          this.updateHint('Press [ENTER] to continue');
        }
      }
    });

    // Track mouse wheel for zoom - ONLY on camera control step
    document.addEventListener('wheel', () => {
      if (this.isActive) {
        const step = this.steps[this.currentStep];
        if (step.id === 'camera_mouse' && !this.stepCompleted) {
          this.completedActions.add('usedMouseWheel');
          this.stepCompleted = true;
          this.showFeedback('✓ Nice! Camera zoom working.');
          this.updateHint('Press [ENTER] to continue');
        }
      }
    });
  }

  /**
   * Start the tutorial
   */
  startTutorial() {
    this.isActive = true;
    this.currentStep = 0;
    this.isTransitioning = false;
    this.completedActions.clear();
    this.container.style.display = 'block';

    console.log('🎓 Tutorial started');
    this.showStep(0);
  }

  /**
   * End the tutorial
   */
  endTutorial() {
    this.isActive = false;
    this.container.style.display = 'none';
    console.log('✅ Tutorial completed');
  }

  /**
   * Show a specific tutorial step
   */
  showStep(stepIndex) {
    if (stepIndex >= this.steps.length) {
      this.endTutorial();
      return;
    }

    this.currentStep = stepIndex;
    this.stepStartTime = Date.now();
    this.stepCompleted = false; // Reset completion flag for new step
    const step = this.steps[stepIndex];

    console.log(`📖 Tutorial Step ${stepIndex + 1}/${this.steps.length}: ${step.id}`);

    // Clear step-specific actions when entering new step
    // This prevents actions from previous steps from triggering completion of future steps
    this.clearStepSpecificActions();

    // Apply camera setup if defined
    // IMPORTANT: Don't change camera if user is paused and has adjusted velocity
    // or if there was a recent collision (prevents camera zoom jumping)
    const isAdjustingVelocity = this.game.isPaused &&
                                this.game.velocityAdjustment &&
                                this.game.velocityAdjustment.lengthSq() > 0.001;
    const hadRecentCollision = this.game.recentCollisionTime > 0;

    if (step.cameraSetup && !isAdjustingVelocity && !hadRecentCollision) {
      step.cameraSetup();
    }

    // Update message box
    this.updateMessageBox(step);
  }

  /**
   * Clear actions that are specific to individual steps
   * Called when entering a new step to prevent carryover
   */
  clearStepSpecificActions() {
    // Remove step-specific action flags (keep persistent ones if any)
    const stepSpecificActions = [
      'pressedEnter_welcome',
      'confirmedStep',  // 🔑 CRITICAL: Clear confirmation to prevent skip
      'viewedEarth',
      'viewedSpaceship',
      'usedMouseWheel',
      'switchedFrame',
      'viewedMoon',
      'usedThrust',
      'paused',
      'adjustedVelocity',
      'velocityAdjustmentFeedbackShown',
      'appliedVelocity',
      'completedTutorial'
    ];

    stepSpecificActions.forEach(action => {
      this.completedActions.delete(action);
    });
  }

  /**
   * Update message box with step content
   */
  updateMessageBox(step) {
    // Get message text (can be string or function)
    const messageText = typeof step.message === 'function' ? step.message() : step.message;

    // Parse message with **bold** markers
    const formattedMessage = this.formatMessage(messageText);

    // Update content area (not the whole messageBox, to preserve drag handle)
    this.messageContent.innerHTML = `
      <div style="color: #00ffff; font-size: 16px; font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #00ff00; padding-bottom: 8px;">
        ${step.title}
      </div>
      <div style="margin-bottom: 0px; white-space: pre-line; font-size: 13px;">
        ${formattedMessage}
      </div>
      <div id="tutorial-feedback" style="color: #00ff00; font-size: 14px; font-weight: bold; text-align: center; margin: 8px 0 0 0; min-height: 0px; text-shadow: 0 0 15px #00ff00;">
      </div>
      <div class="tutorial-hint" style="color: #ffff00; font-size: 13px; font-style: italic; text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #00ff00; white-space: pre-line;">
        ${step.hint}
      </div>
    `;
  }

  /**
   * Show feedback message (like "Well done!")
   */
  showFeedback(message) {
    const feedbackDiv = document.getElementById('tutorial-feedback');
    if (feedbackDiv) {
      feedbackDiv.textContent = message;
      feedbackDiv.style.animation = 'pulse 0.5s ease-out';

      // Clear animation after it completes
      setTimeout(() => {
        feedbackDiv.style.animation = '';
      }, 500);
    }
  }

  /**
   * Update hint text dynamically
   */
  updateHint(hintText) {
    const hintDiv = this.messageContent.querySelector('.tutorial-hint');
    if (hintDiv) {
      // Add TAB skip option to all hints
      if (hintText === 'Press [ENTER] to continue') {
        hintDiv.textContent = 'Press [ENTER] to continue\nPress [TAB] to skip';
      } else {
        hintDiv.textContent = hintText;
      }
    }
  }

  /**
   * Format message text with markdown-like syntax
   * **text** becomes bold red
   * Preserves HTML tags (like <div>, <img>)
   */
  formatMessage(text) {
    // Replace **text** with styled span (but don't touch HTML tags)
    // This regex avoids replacing ** inside HTML tags
    return text.replace(/\*\*([^*<>]+)\*\*/g, '<span style="color: #ff4444; font-weight: bold;">$1</span>');
  }

  /**
   * Update tutorial state each frame
   */
  update(deltaTime) {
    if (!this.isActive || this.isTransitioning) return;

    const step = this.steps[this.currentStep];

    // Check if current step is complete
    if (step.checkCompletion()) {
      // Mark as transitioning to prevent multiple triggers
      this.isTransitioning = true;

      // Execute onComplete callback if exists
      if (step.onComplete) {
        step.onComplete();
      }

      // Move to next step after a small delay
      setTimeout(() => {
        this.showStep(this.currentStep + 1);
        this.isTransitioning = false; // Allow next transition
      }, 500); // Small delay before advancing
    }
  }

  /**
   * Pause tutorial (e.g., when menu is open)
   */
  pause() {
    this.isPaused = true;
    this.container.style.display = 'none';
  }

  /**
   * Resume tutorial
   */
  resume() {
    if (this.isActive) {
      this.isPaused = false;
      this.container.style.display = 'block';
    }
  }

  /**
   * Skip tutorial (for advanced users)
   */
  skipTutorial() {
    this.completedActions.add('completedTutorial');
    this.game.tutorialMode = false;
    this.endTutorial();
    console.log('⏭ Tutorial skipped');
  }

  /**
   * Toggle minimize/maximize tutorial window
   */
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;

    if (this.isMinimized) {
      // Minimize: Hide content, show only title bar
      this.messageContent.style.display = 'none';
      this.toggleButton.innerHTML = '▲'; // Maximize icon
      this.messageBox.style.width = '300px';
      console.log('📦 Tutorial minimized');
    } else {
      // Maximize: Show content
      this.messageContent.style.display = 'block';
      this.toggleButton.innerHTML = '▼'; // Minimize icon
      this.messageBox.style.width = '500px';
      console.log('📖 Tutorial expanded');
    }
  }
}
