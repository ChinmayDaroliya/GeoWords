// Core geohashing logic for converting between coordinates and grid cells
// India bounding box constants
const INDIA_BOUNDS = {
    minLat: 6.5,
    maxLat: 37.6,
    minLng: 68.7,
    maxLng: 97.25
  };
  
  const GRID_SIZE_METERS = 3; // 3x3 meter cells
  const METERS_PER_DEGREE_LAT = 111320; // Approximate meters per degree latitude
  const METERS_PER_DEGREE_LNG = 111320; // Approximate at equator, varies by latitude
  
  /**
   * Simple hash function for deterministic word selection
   */
  function simpleHash(str: string, seed: number = 0): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Convert latitude/longitude to grid coordinates
   */
  export function coordsToGrid(lat: number, lng: number): { gridX: number, gridY: number } {
    // Ensure coordinates are within India bounds
    if (lat < INDIA_BOUNDS.minLat || lat > INDIA_BOUNDS.maxLat ||
        lng < INDIA_BOUNDS.minLng || lng > INDIA_BOUNDS.maxLng) {
      throw new Error('Coordinates are outside India bounds');
    }
  
    // Calculate grid position
    const latRange = INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat;
    const lngRange = INDIA_BOUNDS.maxLng - INDIA_BOUNDS.minLng;
    
    const latMeters = latRange * METERS_PER_DEGREE_LAT;
    const lngMeters = lngRange * METERS_PER_DEGREE_LNG * Math.cos(lat * Math.PI / 180);
    
    const totalLatCells = Math.floor(latMeters / GRID_SIZE_METERS);
    const totalLngCells = Math.floor(lngMeters / GRID_SIZE_METERS);
    
    const gridX = Math.floor(((lng - INDIA_BOUNDS.minLng) / lngRange) * totalLngCells);
    const gridY = Math.floor(((lat - INDIA_BOUNDS.minLat) / latRange) * totalLatCells);
    
    return { gridX, gridY };
  }
  
  /**
   * Convert grid coordinates back to latitude/longitude (center of cell)
   */
  export function gridToCoords(gridX: number, gridY: number): { lat: number, lng: number } {
    const latRange = INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat;
    const lngRange = INDIA_BOUNDS.maxLng - INDIA_BOUNDS.minLng;
    
    const latMeters = latRange * METERS_PER_DEGREE_LAT;
    const lngMeters = lngRange * METERS_PER_DEGREE_LNG;
    
    const totalLatCells = Math.floor(latMeters / GRID_SIZE_METERS);
    const totalLngCells = Math.floor(lngMeters / GRID_SIZE_METERS);
    
    // Get center of cell
    const lat = INDIA_BOUNDS.minLat + (gridY + 0.5) * (latRange / totalLatCells);
    const lng = INDIA_BOUNDS.minLng + (gridX + 0.5) * (lngRange / totalLngCells);
    
    return { lat, lng };
  }
  
  /**
   * Convert grid coordinates to 3 words using deterministic hashing
   */
  export function gridToWords(gridX: number, gridY: number, wordList: string[]): string[] {
    const gridKey = `${gridX},${gridY}`;
    const words: string[] = [];
    
    // Generate 3 words using different seeds for each position
    for (let i = 0; i < 3; i++) {
      const hash = simpleHash(gridKey, i * 999983); // Use prime number as seed multiplier
      const wordIndex = hash % wordList.length;
      words.push(wordList[wordIndex]);
    }
    
    return words;
  }
  
  /**
   * Convert coordinates directly to words
   */
  export function coordsToWords(lat: number, lng: number, wordList: string[]): string[] {
    const { gridX, gridY } = coordsToGrid(lat, lng);
    return gridToWords(gridX, gridY, wordList);
  }
  
  /**
   * Reverse lookup: find grid coordinates from 3 words
   * This uses a brute force approach within reasonable bounds
   */
  export function wordsToGrid(words: string[], wordList: string[]): { gridX: number, gridY: number } | null {
    const targetWords = words.join(',');
    
    // Calculate reasonable search bounds based on India's size
    const latRange = INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat;
    const lngRange = INDIA_BOUNDS.maxLng - INDIA_BOUNDS.minLng;
    const latMeters = latRange * METERS_PER_DEGREE_LAT;
    const lngMeters = lngRange * METERS_PER_DEGREE_LNG;
    const maxGridX = Math.floor(lngMeters / GRID_SIZE_METERS);
    const maxGridY = Math.floor(latMeters / GRID_SIZE_METERS);
    
    // Deterministic full search over all grid cells
    for (let gridX = 0; gridX < maxGridX; gridX++) {
      for (let gridY = 0; gridY < maxGridY; gridY++) {
        const testWords = gridToWords(gridX, gridY, wordList);
        if (testWords.join(',') === targetWords) {
          return { gridX, gridY };
        }
      }
    }
    
    return null; // Not found
  }
  
  /**
   * Convert words directly to coordinates
   */
  export function wordsToCoords(words: string[], wordList: string[]): { lat: number, lng: number } | null {
    const gridCoords = wordsToGrid(words, wordList);
    if (!gridCoords) return null;
    
    return gridToCoords(gridCoords.gridX, gridCoords.gridY);
  }