import { MARS_LEVELS, MARS_LEVEL_7 } from './marsLevels.js';
import { PLANT_LEVELS } from './plantLevels.js';

export const ALL_LEVELS = [...MARS_LEVELS, ...PLANT_LEVELS];

export function getLevelById(id) {
  return ALL_LEVELS.find((l) => l.id === id) || MARS_LEVEL_7;
}

export function getDefaultLevel() {
  return MARS_LEVEL_7;
}
