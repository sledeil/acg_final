/**
 * UIConfig.js
 *
 * Contains UI-related configuration including colors, fonts,
 * layout settings, and visual styling.
 */

export const UIConfig = {
  // ========== Color Palette ==========

  colors: {
    // Primary UI colors
    primary: '#00ff00', // Green (main HUD color)
    secondary: '#00ffff', // Cyan (secondary info)
    tertiary: '#ffaa00', // Orange (warnings, missions)
    accent: '#00aaff', // Blue (menu panels)

    // Status colors
    success: '#88ff88', // Light green
    warning: '#ffff00', // Yellow
    danger: '#ff0000', // Red
    info: '#00ffff', // Cyan

    // Text colors
    textPrimary: '#ffffff', // White
    textSecondary: '#aaaaaa', // Gray
    textDisabled: '#666666', // Dark gray

    // Background colors
    bgDark: '#0a0a0a', // Almost black
    bgMedium: 'rgba(0, 0, 0, 0.8)', // Semi-transparent black
    bgLight: 'rgba(0, 0, 0, 0.7)', // More transparent black

    // Border colors
    borderPrimary: '#00ff00',
    borderSecondary: '#00aaff',
    borderWarning: '#ffaa00',
  },

  // ========== Typography ==========

  fonts: {
    primary: "'Courier New', Courier, monospace",
    secondary: "'JetBrains Mono', 'Source Code Pro', 'Courier New', monospace",

    sizes: {
      xs: '11px',
      sm: '12px',
      md: '14px',
      lg: '16px',
      xl: '18px',
      xxl: '20px',
      huge: '28px',
    },
  },

  // ========== Shadows & Effects ==========

  effects: {
    textShadow: '0 0 10px',
    boxShadow: '0 0 30px rgba(0, 255, 0, 0.5)',
    glowIntensity: 0.5,
  },

  // ========== Layout ==========

  layout: {
    // Panel dimensions
    leftPanelWidth: '280px',
    rightPanelWidth: '300px',
    rightPanelCollapsedWidth: '50px',

    // Spacing
    panelPadding: '15px',
    panelGap: '15px',
    panelMargin: '20px',

    // Border radius
    borderRadius: '8px',
    borderRadiusSmall: '4px',
  },

  // ========== HUD Configuration ==========

  hud: {
    // Info panel (top-left)
    infoPanel: {
      background: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#00ff00',
      textColor: '#00ff00',
      accentColor: '#00ffff',
      warningColor: '#ffaa00',
    },

    // Mission panel (below info panel)
    missionPanel: {
      background: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#ffaa00',
      textColor: '#ffaa00',
    },

    // Fuel warning
    fuelWarning: {
      color: '#ff0000',
      blinkSpeed: '1s',
    },

    // Orbit status
    orbitStatus: {
      moonColor: '#88ffff',
      marsColor: '#ff6600',
    },
  },

  // ========== Menu Configuration ==========

  menu: {
    // Right side menu
    background: '#0a0a0a',
    borderColor: '#00aaff',
    textColor: '#ffffff',

    // Tabs
    tabActiveColor: '#00aaff',
    tabInactiveColor: '#666666',
    tabSeparatorColor: '#444444',

    // Buttons
    buttonBackground: 'rgba(0, 170, 255, 0.1)',
    buttonBackgroundHover: 'rgba(0, 170, 255, 0.3)',
    buttonBorderColor: '#00aaff',
    buttonTextColor: '#00aaff',

    // Sliders
    sliderTrack: 'rgba(255, 255, 255, 0.2)',
    sliderThumb: '#00aaff',
    sliderThumbHover: '#00ffff',

    // Toggle button
    toggleButtonColor: '#00aaff',
    toggleButtonHoverScale: 1.1,
  },

  // ========== Tutorial Configuration ==========

  tutorial: {
    // Container
    background: 'rgba(0, 0, 0, 0.95)',
    borderColor: '#00ff00',
    textColor: '#ffffff',
    titleColor: '#00ff00',
    hintColor: '#ffff00',

    // Progress
    progressColor: '#00ff00',
    checkmarkColor: '#00ff00',

    // Animations
    fadeInDuration: '0.3s',
    pulseSpeed: '2s',
  },

  // ========== Notifications ==========

  notifications: {
    duration: 3000, // milliseconds
    fadeInDuration: '0.3s',
    fadeOutDuration: '0.3s',

    success: {
      background: 'rgba(0, 255, 0, 0.1)',
      borderColor: '#00ff00',
      textColor: '#00ff00',
    },

    warning: {
      background: 'rgba(255, 170, 0, 0.1)',
      borderColor: '#ffaa00',
      textColor: '#ffaa00',
    },

    error: {
      background: 'rgba(255, 0, 0, 0.1)',
      borderColor: '#ff0000',
      textColor: '#ff0000',
    },
  },

  // ========== Save/Load UI ==========

  saveLoadUI: {
    overlayBackground: 'rgba(0, 0, 0, 0.95)',
    panelBackground: '#0a0a0a',
    panelBorderColor: '#00aaff',

    slotBackground: 'rgba(0, 170, 255, 0.1)',
    slotBackgroundHover: 'rgba(0, 170, 255, 0.2)',
    slotBorderColor: '#00aaff',

    emptySlotColor: '#666666',
    occupiedSlotColor: '#00aaff',
  },

  // ========== Mission Selector ==========

  missionSelector: {
    overlayBackground: 'rgba(0, 0, 0, 0.95)',
    cardBackground: 'rgba(0, 170, 255, 0.05)',
    cardBackgroundHover: 'rgba(0, 170, 255, 0.15)',
    cardBorderColor: '#00aaff',

    titleColor: '#00ffff',
    descriptionColor: '#ffffff',
    difficultyColors: {
      easy: '#00ff00',
      medium: '#ffaa00',
      hard: '#ff0000',
    },
  },

  // ========== Rocket Selector ==========

  rocketSelector: {
    overlayBackground: 'rgba(0, 0, 0, 0.95)',
    cardBackground: 'rgba(0, 170, 255, 0.05)',
    cardBackgroundHover: 'rgba(0, 170, 255, 0.15)',

    selectedBorderColor: '#00ff00',
    unselectedBorderColor: '#00aaff',
  },

  // ========== Start Screen ==========

  startScreen: {
    background: '#000000',
    textColor: '#00ff00',
    cursorColor: '#00ff00',
    typingSpeed: 30, // milliseconds per character
    lineDelay: 500, // milliseconds between lines
  },

  // ========== Labels (3D world space) ==========

  labels: {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: '14px',
    color: '#00ff00',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: '4px 8px',
    borderRadius: '4px',
    textShadow: '0 0 10px #00ff00',
  },

  // ========== Orbit Trails ==========

  orbitTrails: {
    colors: {
      sun: 0xffff00,
      mercury: 0xaaaaaa,
      venus: 0xffaa66,
      earth: 0x4488ff,
      moon: 0xcccccc,
      mars: 0xff6644,
      phobos: 0xaa8866,
      jupiter: 0xccaa88,
      halley: 0x999999,
      spaceship: 0x00ff00,
    },

    opacity: 0.6,
    lineWidth: 1,
    maxPoints: 3000,
  },

  // ========== Trajectory Prediction ==========

  trajectoryLine: {
    color: 0xffff00, // Yellow
    opacity: 0.8,
    lineWidth: 2,
  },

  // ========== Reference Frame Indicator ==========

  referenceFrame: {
    colors: {
      sun: '#ffff00',
      earth: '#4488ff',
      moon: '#cccccc',
    },
  },
};

/**
 * Get color value by name
 * @param {string} name - Color name (e.g., 'primary', 'danger')
 * @returns {string} Color hex/rgba value
 */
export function getColor(name) {
  return UIConfig.colors[name] || '#ffffff';
}

/**
 * Get font string with size
 * @param {string} size - Size name (e.g., 'md', 'lg')
 * @param {string} family - Font family name (default: 'primary')
 * @returns {string} Font CSS string
 */
export function getFont(size = 'md', family = 'primary') {
  const fontSize = UIConfig.fonts.sizes[size] || UIConfig.fonts.sizes.md;
  const fontFamily = UIConfig.fonts[family] || UIConfig.fonts.primary;
  return `${fontSize} ${fontFamily}`;
}

/**
 * Apply glow effect to element
 * @param {HTMLElement} element - DOM element
 * @param {string} color - Glow color
 */
export function applyGlow(element, color = '#00ff00') {
  element.style.textShadow = `0 0 10px ${color}`;
  element.style.boxShadow = `0 0 20px ${color}`;
}
