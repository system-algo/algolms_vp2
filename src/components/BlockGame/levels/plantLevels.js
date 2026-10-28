import { BLOCK_TYPES, createBlockInstance } from '../BlockWorkspace/blockDefinitions.js';

/**
 * Laser and Plants (VP2 Module 2 Lesson 3) Game Levels
 * Accurately matching the Algo LMS curriculum and screenshot.
 */

export const PLANT_LEVEL_1 = {
  id: 'plant_level_1',
  levelNumber: 1,
  title: 'Level 1: Aim & Destroy',
  mode: 'radial',
  hint: 'Turn the robot to face the pest plant and destroy it!',
  targetDestroyedCount: 1,
  targetWateredCount: 0,
  maxCommands: 4,

  initialRobot: {
    direction: 0, // Facing 0° Up
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'pest_30', angle: 30, type: 'pest', isEvil: true, destroyed: false },
    { id: 'bush_0', angle: 0, type: 'bush', isEvil: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'melon_90', angle: 90, type: 'melon', isEvil: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
    { id: 'bush_150', angle: 150, type: 'bush', isEvil: false },
    { id: 'melon_180', angle: 180, type: 'melon', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
    { id: 'bush_240', angle: 240, type: 'bush', isEvil: false },
    { id: 'bush_270', angle: 270, type: 'bush', isEvil: false },
    { id: 'bush_300', angle: 300, type: 'bush', isEvil: false },
    { id: 'bush_330', angle: 330, type: 'bush', isEvil: false },
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
  ],
};

export const PLANT_LEVEL_2 = {
  id: 'plant_level_2',
  levelNumber: 2,
  title: 'Level 2: Water the Sprout',
  mode: 'radial',
  hint: 'Turn to the sprout and water it so it grows!',
  targetDestroyedCount: 0,
  targetWateredCount: 1,
  maxCommands: 4,

  initialRobot: {
    direction: 90, // Facing 90° Right
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'sprout_120', angle: 120, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'bush_0', angle: 0, type: 'bush', isEvil: false },
    { id: 'bush_30', angle: 30, type: 'bush', isEvil: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'melon_90', angle: 90, type: 'melon', isEvil: false },
    { id: 'bush_150', angle: 150, type: 'bush', isEvil: false },
    { id: 'melon_180', angle: 180, type: 'melon', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
    { id: 'bush_240', angle: 240, type: 'bush', isEvil: false },
    { id: 'bush_270', angle: 270, type: 'bush', isEvil: false },
    { id: 'bush_300', angle: 300, type: 'bush', isEvil: false },
    { id: 'bush_330', angle: 330, type: 'bush', isEvil: false },
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
  ],
};

/**
 * EXACT LEVEL 3 FROM USER SCREENSHOT
 */
export const PLANT_LEVEL_3 = {
  id: 'plant_level_3',
  levelNumber: 3,
  title: 'Level 3: Laser & Plants',
  mode: 'radial',
  hint: 'Destroy one pest plant and grow one good one',
  targetDestroyedCount: 1,
  targetWateredCount: 1,
  hasTutorial: true,
  maxCommands: 8,

  // Robot starts pointing 270° (Left / 9 o'clock) directly at the pest plant
  initialRobot: {
    direction: 270,
    carriedCargo: 0,
  },

  initialPlants: [
    // 270° (9 o'clock): Harmful plant (Venus flytrap with sharp teeth)
    { id: 'pest_270', angle: 270, type: 'pest', isEvil: true, destroyed: false },

    // 240° (8 o'clock): Sprout seedling
    { id: 'sprout_240', angle: 240, type: 'sprout', stage: 1, isEvil: false, isWatered: false },

    // Surrounding adult garden plants
    { id: 'bush_300', angle: 300, type: 'bush', isEvil: false },
    { id: 'bush_330', angle: 330, type: 'bush', isEvil: false },
    { id: 'bush_0', angle: 0, type: 'bush', isEvil: false },
    { id: 'flower_30', angle: 30, type: 'flower', isEvil: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'melon_90', angle: 90, type: 'melon', isEvil: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
    { id: 'bush_150', angle: 150, type: 'bush', isEvil: false },
    { id: 'melon_180', angle: 180, type: 'melon', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.DESTROY,
    BLOCK_TYPES.WATER,
  ],

  // Designated starter blocks matching the screenshot
  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
    createBlockInstance(BLOCK_TYPES.DESTROY),
    createBlockInstance(BLOCK_TYPES.TURN_COUNTERCLOCKWISE, { angle: 30 }),
    createBlockInstance(BLOCK_TYPES.WATER),
  ],
};

export const PLANT_LEVELS = [
  PLANT_LEVEL_1,
  PLANT_LEVEL_2,
  PLANT_LEVEL_3,
];
