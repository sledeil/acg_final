/**
 * LabelManager.js
 *
 * Manages 3D labels for celestial bodies and spaceship.
 * Creates fixed-size CSS labels that overlay 3D objects.
 * Extracted from game_v2.js (~120 lines).
 */

import * as THREE from 'three';

export class LabelManager {
  /**
   * @param {Object} game - Reference to main game instance
   */
  constructor(game) {
    this.game = game;

    // Map: mesh -> {element: DOMElement, offsetY: number, text: string}
    this.labelElements = new Map();
  }

  /**
   * Create a CSS label element
   * @param {string} text - Label text
   * @param {number} offsetY - Vertical offset (not used in current implementation)
   * @param {number} fontSize - Font size (not used, fixed at 14px)
   * @returns {Object} Label data object {element, offsetY, text}
   */
  createLabel(text, offsetY, fontSize = 128) {
    // Create a CSS div element for the label
    const labelElement = document.createElement('div');
    labelElement.className = 'space-label';
    labelElement.textContent = text;
    labelElement.style.cssText = `
      position: absolute;
      color: #ffffff;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
      z-index: 1000;
      transform: translate(-50%, -100%);
    `;
    document.body.appendChild(labelElement);

    // Return an object that can be used to register the label
    return {
      element: labelElement,
      offsetY: offsetY,
      text: text
    };
  }

  /**
   * Register a label to a mesh
   * @param {THREE.Mesh} mesh - The 3D mesh to attach label to
   * @param {Object} labelData - Label data from createLabel()
   */
  registerLabel(mesh, labelData) {
    this.labelElements.set(mesh, labelData);
  }

  /**
   * Update label positions based on 3D world coordinates
   * Converts 3D positions to screen coordinates for fixed-size CSS labels
   */
  updateLabelPositions() {
    if (!this.game.camera || !this.game.renderer) return;

    const vector = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    this.game.camera.getWorldPosition(cameraPosition);

    // UI panel bounds (from ui_manager.js)
    const leftPanelRight = 300; // left: 20px, width: 280px
    const rightPanelLeft = this.game.renderer.domElement.clientWidth - 320; // right: 20px, width: 300px
    const topMargin = 40; // Top margin to avoid overlapping with panels

    // Fixed screen-space offset (pixels above the object)
    // Using negative value because transform: translate(-50%, -100%) places label above
    const screenOffsetY = -25;

    // Update all registered labels
    for (const [mesh, labelData] of this.labelElements.entries()) {
      if (!mesh || !labelData || !labelData.element) continue;

      // Get world position of the mesh (center of the object)
      mesh.getWorldPosition(vector);

      // Calculate distance from camera for opacity calculation
      const distanceToCamera = vector.distanceTo(cameraPosition);

      // Project 3D position to screen coordinates (object center)
      const objectScreenPos = vector.clone().project(this.game.camera);

      // Check if the object is within the view frustum
      const isInViewFrustum = objectScreenPos.z >= -1 && objectScreenPos.z <= 1 &&
                             objectScreenPos.x >= -2 && objectScreenPos.x <= 2 &&
                             objectScreenPos.y >= -2 && objectScreenPos.y <= 2;

      if (!isInViewFrustum) {
        labelData.element.style.display = 'none';
        continue;
      }

      // Convert normalized device coordinates (-1 to +1) to screen pixels
      const objectX = (objectScreenPos.x * 0.5 + 0.5) * this.game.renderer.domElement.clientWidth;
      const objectY = (objectScreenPos.y * -0.5 + 0.5) * this.game.renderer.domElement.clientHeight;

      // Apply fixed screen-space offset (pixels, not world units)
      const labelX = objectX;
      const labelY = objectY + screenOffsetY;

      // Estimate label dimensions (text length * approximate char width)
      // Font is 14px Arial bold, approximately 8-9px per character
      const estimatedCharWidth = 9;
      const labelWidth = Math.max(60, labelData.text.length * estimatedCharWidth); // Minimum 60px
      const labelHeight = 20; // Approximate height for 14px font

      // Calculate label bounds (transform: translate(-50%, -100%) means label center is at (labelX, labelY))
      const labelLeft = labelX - labelWidth / 2;
      const labelRight = labelX + labelWidth / 2;
      const labelTop = labelY - labelHeight; // Label is above the point
      const labelBottom = labelY;

      // Check if label overlaps with UI panels
      // Left panel: 0 to leftPanelRight (300px)
      // Right panel: rightPanelLeft to screen width
      // Top margin: 0 to topMargin (40px)
      const overlapsLeftPanel = labelRight > 0 && labelLeft < leftPanelRight;
      const overlapsRightPanel = labelRight > rightPanelLeft && labelLeft < this.game.renderer.domElement.clientWidth;
      const overlapsTop = labelBottom < topMargin;

      if (overlapsLeftPanel || overlapsRightPanel || overlapsTop) {
        labelData.element.style.display = 'none';
        continue;
      }

      // Calculate opacity based on distance
      // Closer objects (distance < 2000) have full opacity
      // Farther objects fade out (distance > 50000 have 0.2 opacity)
      const minDistance = 2000;
      const maxDistance = 50000;
      const minOpacity = 0.2;
      const maxOpacity = 1.0;

      let opacity = maxOpacity;
      if (distanceToCamera > minDistance) {
        const t = Math.min(1, (distanceToCamera - minDistance) / (maxDistance - minDistance));
        opacity = maxOpacity * (1 - t) + minOpacity * t;
      }

      // Show label with calculated opacity
      labelData.element.style.display = 'block';
      labelData.element.style.left = `${labelX}px`;
      labelData.element.style.top = `${labelY}px`;
      labelData.element.style.opacity = opacity.toString();
    }
  }

  /**
   * Update label scales based on distance from camera
   * DEPRECATED: No longer used - labels are now fixed-size CSS elements
   */
  updateLabelScales() {
    // This function is deprecated - labels are now CSS elements with fixed 14px size
    // Kept for backward compatibility but does nothing
  }

  /**
   * Clean up all labels (remove from DOM)
   */
  dispose() {
    for (const [mesh, labelData] of this.labelElements.entries()) {
      if (labelData.element && labelData.element.parentNode) {
        labelData.element.parentNode.removeChild(labelData.element);
      }
    }
    this.labelElements.clear();
  }
}
