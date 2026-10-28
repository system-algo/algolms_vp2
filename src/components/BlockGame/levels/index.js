import { MARS_LEVELS, MARS_LEVEL_7 } from './marsLevels.js';
import { PLANT_LEVELS, PLANT_LEVEL_3 } from './plantLevels.js';

export const ALL_LEVELS = [...MARS_LEVELS, ...PLANT_LEVELS];

export { MARS_LEVELS, PLANT_LEVELS };

export function getLevelById(id) {
  return ALL_LEVELS.find((l) => l.id === id) || PLANT_LEVEL_3;
}

export function getDefaultLevel(gameType = 'plants') {
  if (gameType === 'mars') return MARS_LEVEL_7;
  return PLANT_LEVEL_3;
}
