import * as THREE from 'three';

/**
 * JsonSerializer Helper
 * 
 * Provides utility methods for serializing and deserializing common game data types,
 * especially THREE.js objects which need special handling.
 */

export class JsonSerializer {
  /**
   * Serialize a THREE.Vector3 to plain object
   * @param {THREE.Vector3} vector - Vector to serialize
   * @returns {Object} Plain object {x, y, z}
   */
  static serializeVector3(vector) {
    if (!vector) return null;
    return {
      x: vector.x,
      y: vector.y,
      z: vector.z
    };
  }

  /**
   * Deserialize a plain object to THREE.Vector3
   * @param {Object} data - Plain object {x, y, z}
   * @returns {THREE.Vector3} New Vector3 instance
   */
  static deserializeVector3(data) {
    if (!data) return new THREE.Vector3(0, 0, 0);
    return new THREE.Vector3(data.x, data.y, data.z);
  }

  /**
   * Serialize a THREE.Quaternion to plain object
   * @param {THREE.Quaternion} quaternion - Quaternion to serialize
   * @returns {Object} Plain object {x, y, z, w}
   */
  static serializeQuaternion(quaternion) {
    if (!quaternion) return null;
    return {
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w
    };
  }

  /**
   * Deserialize a plain object to THREE.Quaternion
   * @param {Object} data - Plain object {x, y, z, w}
   * @returns {THREE.Quaternion} New Quaternion instance
   */
  static deserializeQuaternion(data) {
    if (!data) return new THREE.Quaternion();
    return new THREE.Quaternion(data.x, data.y, data.z, data.w);
  }

  /**
   * Serialize a THREE.Euler to plain object
   * @param {THREE.Euler} euler - Euler to serialize
   * @returns {Object} Plain object {x, y, z, order}
   */
  static serializeEuler(euler) {
    if (!euler) return null;
    return {
      x: euler.x,
      y: euler.y,
      z: euler.z,
      order: euler.order
    };
  }

  /**
   * Deserialize a plain object to THREE.Euler
   * @param {Object} data - Plain object {x, y, z, order}
   * @returns {THREE.Euler} New Euler instance
   */
  static deserializeEuler(data) {
    if (!data) return new THREE.Euler();
    return new THREE.Euler(data.x, data.y, data.z, data.order);
  }

  /**
   * Serialize a celestial body (planet, moon, etc.)
   * @param {Object} body - Celestial body with physics properties
   * @returns {Object} Serialized body data
   */
  static serializeCelestialBody(body) {
    return {
      position: this.serializeVector3(body.position),
      velocity: this.serializeVector3(body.velocity),
      acceleration: this.serializeVector3(body.acceleration),
      mass: body.mass,
      radius: body.radius,
      type: body.type,
      fixed: body.fixed,
      name: body.name || 'Unknown',
      // Store mesh reference by name/id for reconstruction
      meshId: body.mesh ? body.mesh.uuid : null
    };
  }

  /**
   * Deserialize a celestial body
   * @param {Object} data - Serialized body data
   * @returns {Object} Reconstructed body object (without mesh - must be reattached)
   */
  static deserializeCelestialBody(data) {
    return {
      position: this.deserializeVector3(data.position),
      velocity: this.deserializeVector3(data.velocity),
      acceleration: this.deserializeVector3(data.acceleration),
      mass: data.mass,
      radius: data.radius,
      type: data.type,
      fixed: data.fixed,
      name: data.name,
      meshId: data.meshId
    };
  }

  /**
   * Serialize an array of items using a custom serializer function
   * @param {Array} array - Array to serialize
   * @param {Function} itemSerializer - Function to serialize each item
   * @returns {Array} Serialized array
   */
  static serializeArray(array, itemSerializer) {
    if (!array || !Array.isArray(array)) return [];
    return array.map(item => itemSerializer(item));
  }

  /**
   * Deserialize an array of items using a custom deserializer function
   * @param {Array} data - Serialized array
   * @param {Function} itemDeserializer - Function to deserialize each item
   * @returns {Array} Deserialized array
   */
  static deserializeArray(data, itemDeserializer) {
    if (!data || !Array.isArray(data)) return [];
    return data.map(item => itemDeserializer(item));
  }

  /**
   * Serialize a Map object
   * @param {Map} map - Map to serialize
   * @param {Function} keySerializer - Function to serialize keys (optional)
   * @param {Function} valueSerializer - Function to serialize values (optional)
   * @returns {Array} Array of [key, value] pairs
   */
  static serializeMap(map, keySerializer = null, valueSerializer = null) {
    if (!map || !(map instanceof Map)) return [];
    
    const entries = [];
    for (const [key, value] of map.entries()) {
      const serializedKey = keySerializer ? keySerializer(key) : key;
      const serializedValue = valueSerializer ? valueSerializer(value) : value;
      entries.push([serializedKey, serializedValue]);
    }
    return entries;
  }

  /**
   * Deserialize an array of entries back into a Map
   * @param {Array} data - Array of [key, value] pairs
   * @param {Function} keyDeserializer - Function to deserialize keys (optional)
   * @param {Function} valueDeserializer - Function to deserialize values (optional)
   * @returns {Map} Reconstructed Map
   */
  static deserializeMap(data, keyDeserializer = null, valueDeserializer = null) {
    if (!data || !Array.isArray(data)) return new Map();
    
    const map = new Map();
    for (const [key, value] of data) {
      const deserializedKey = keyDeserializer ? keyDeserializer(key) : key;
      const deserializedValue = valueDeserializer ? valueDeserializer(value) : value;
      map.set(deserializedKey, deserializedValue);
    }
    return map;
  }

  /**
   * Deep clone an object using JSON serialization
   * WARNING: This loses functions, prototypes, and non-JSON-serializable data!
   * Only use for plain data objects.
   * @param {Object} obj - Object to clone
   * @returns {Object} Deep clone
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Compress save data by removing unnecessary precision from floating point numbers
   * This can significantly reduce save file size
   * @param {Object} data - Data to compress
   * @param {number} precision - Number of decimal places (default: 6)
   * @returns {Object} Compressed data
   */
  static compressFloatingPoint(data, precision = 6) {
    if (typeof data === 'number') {
      return parseFloat(data.toFixed(precision));
    } else if (Array.isArray(data)) {
      return data.map(item => this.compressFloatingPoint(item, precision));
    } else if (data && typeof data === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.compressFloatingPoint(value, precision);
      }
      return result;
    }
    return data;
  }
}
