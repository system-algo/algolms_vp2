import { BLOCK_TYPES, createBlockInstance } from '../BlockWorkspace/blockDefinitions.js';

/**
 * Laser and Plants (VP2 Module 2 Lesson 3) Game Levels
 */
export const PLANT_LEVEL_1 = {
  id: 'plant_level_1',
  levelNumber: 1,
  title: 'Laser & Plants: Destroy Pest',
  mode: 'radial',
  hint: 'Turn the robot and destroy the pest plant!',
  targetDestroyedCount: 1,
  maxCommands: 4,

  garden: {
    angles: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
  },

  initialRobot: {
    direction: 90, // Facing 90 deg East
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'p0', angle: 0, isEvil: true, destroyed: false },
    { id: 'p30', angle: 30, isEvil: false, destroyed: false },
    { id: 'p60', angle: 60, isEvil: false, destroyed: false },
    { id: 'p90', angle: 90, isEvil: false, destroyed: false },
    { id: 'p120', angle: 120, isEvil: false, destroyed: false },
    { id: 'p150', angle: 150, isEvil: false, destroyed: false },
    { id: 'p180', angle: 180, isEvil: false, destroyed: false },
    { id: 'p210', angle: 210, isEvil: false, destroyed: false },
    { id: 'p240', angle: 240, isEvil: false, destroyed: false },
    { id: 'p270', angle: 270, isEvil: false, destroyed: false },
    { id: 'p300', angle: 300, isEvil: false, destroyed: false },
    { id: 'p330', angle: 330, isEvil: false, destroyed: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.DESTROY,
    BLOCK_TYPES.WATER,
    BLOCK_TYPES.REPEAT,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
    createBlockInstance(BLOCK_TYPES.TURN_COUNTERCLOCKWISE, { angle: 90 }),
    createBlockInstance(BLOCK_TYPES.DESTROY),
  ],
};

export const PLANT_LEVELS = [PLANT_LEVEL_1];
