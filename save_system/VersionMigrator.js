/**
 * VersionMigrator
 * 
 * Handles migration of save data from older versions to newer versions.
 * Each version upgrade should have a migration function that transforms the data.
 */

export class VersionMigrator {
  constructor() {
    // Map of version -> migration function
    // Each function takes old data and returns updated data
    this.migrations = new Map();
    
    // Register built-in migrations
    this.registerDefaultMigrations();
  }

  /**
   * Register default migrations for known version changes
   */
  registerDefaultMigrations() {
    // Example: Migration from version 1 to version 2
    this.registerMigration(1, 2, (data) => {
      console.log('Migrating save data from v1 to v2...');
      
      // Example changes:
      // - Add new fields with defaults
      // - Rename fields
      // - Transform data structures
      
      if (!data.gameState.physicsConfig) {
        data.gameState.physicsConfig = {
          timeScale: 0.1,
          subSteps: 200,
          gravityConstant: 1.0
        };
      }

      // Update metadata version
      data.metadata.saveVersion = 2;
      
      return data;
    });

    // Example: Migration from version 2 to version 3
    this.registerMigration(2, 3, (data) => {
      console.log('Migrating save data from v2 to v3...');
      
      // Example: Add new camera settings
      if (!data.gameState.cameraSettings) {
        data.gameState.cameraSettings = {
          distance: 200,
          yaw: 0,
          pitch: Math.PI / 4
        };
      }

      data.metadata.saveVersion = 3;
      
      return data;
    });
  }

  /**
   * Register a migration function for a specific version upgrade
   * @param {number} fromVersion - Source version
   * @param {number} toVersion - Target version
   * @param {Function} migrationFunc - Function that transforms the data
   */
  registerMigration(fromVersion, toVersion, migrationFunc) {
    const key = `${fromVersion}->${toVersion}`;
    this.migrations.set(key, migrationFunc);
  }

  /**
   * Migrate save data from an old version to the current version
   * @param {Object} saveData - The save data to migrate
   * @param {number} currentVersion - The current/target version
   * @returns {Object} Migrated save data
   */
  migrate(saveData, currentVersion) {
    if (!saveData || !saveData.metadata) {
      throw new Error('Invalid save data: missing metadata');
    }

    const fromVersion = saveData.metadata.saveVersion;
    
    // No migration needed
    if (fromVersion === currentVersion) {
      console.log(`Save data is already at version ${currentVersion}`);
      return saveData;
    }

    // Can't migrate from future version
    if (fromVersion > currentVersion) {
      throw new Error(
        `Cannot load save from future version (save: ${fromVersion}, current: ${currentVersion})`
      );
    }

    console.log(`Migrating save data from v${fromVersion} to v${currentVersion}...`);

    // Apply migrations sequentially
    let migratedData = saveData;
    for (let version = fromVersion; version < currentVersion; version++) {
      const migrationKey = `${version}->${version + 1}`;
      const migration = this.migrations.get(migrationKey);

      if (!migration) {
        console.warn(`No migration found for ${migrationKey}, attempting direct upgrade...`);
        // If no specific migration exists, just update the version number
        // This is risky but allows some flexibility
        migratedData.metadata.saveVersion = version + 1;
        continue;
      }

      try {
        migratedData = migration(migratedData);
        console.log(`Successfully migrated to v${version + 1}`);
      } catch (error) {
        throw new Error(
          `Failed to migrate from v${version} to v${version + 1}: ${error.message}`
        );
      }
    }

    console.log('Migration complete!');
    return migratedData;
  }

  /**
   * Check if migration is possible from one version to another
   * @param {number} fromVersion - Source version
   * @param {number} toVersion - Target version
   * @returns {boolean} True if migration path exists
   */
  canMigrate(fromVersion, toVersion) {
    if (fromVersion === toVersion) return true;
    if (fromVersion > toVersion) return false;

    // Check if all intermediate migrations exist
    for (let version = fromVersion; version < toVersion; version++) {
      const key = `${version}->${version + 1}`;
      if (!this.migrations.has(key)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get a list of all registered migration paths
   * @returns {Array<string>} List of migration keys (e.g., "1->2", "2->3")
   */
  getAvailableMigrations() {
    return Array.from(this.migrations.keys());
  }
}
