import { BLOCK_TYPES, createBlockInstance } from '../BlockWorkspace/blockDefinitions.js';

/**
 * Laser and Plants (VP2 Module 2 Lesson 3) Complete Game Levels (1 to 11)
 * Derived exactly from Algo LMS curriculum captures (VP2_M2L3_1).
 */

export const PLANT_LEVEL_1 = {
  id: 'plant_level_1',
  levelNumber: 1,
  title: 'Level 1: Destroy one pest plant',
  instruction: 'Destroy one pest plant',
  hint: 'To destroy a pest plant, use the destroy command.',
  mode: 'radial',
  targetDestroyedCount: 1,
  targetWateredCount: 0,
  maxCommands: 3,
  hasTutorial: true,
  tutorialGif: '/courses/VP2/M2-Control-Structures/pages/VP2_M2L3_1/workspace/images/level_02_task_21714_actual_2_static_image_02_img.gif',
  tutorialText: 'To destroy a pest plant, use the destroy command.',

  initialRobot: {
    direction: 0, // Facing 0° Up directly at pest plant
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'pest_0', angle: 0, type: 'pest', isEvil: true, destroyed: false },
    { id: 'bush_30', angle: 30, type: 'bush', isEvil: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'bush_90', angle: 90, type: 'bush', isEvil: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
    { id: 'bush_150', angle: 150, type: 'bush', isEvil: false },
    { id: 'bush_180', angle: 180, type: 'bush', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
    { id: 'bush_240', angle: 240, type: 'bush', isEvil: false },
    { id: 'bush_270', angle: 270, type: 'bush', isEvil: false },
    { id: 'bush_300', angle: 300, type: 'bush', isEvil: false },
    { id: 'bush_330', angle: 330, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.DESTROY,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
    createBlockInstance(BLOCK_TYPES.DESTROY),
  ],
};

export const PLANT_LEVEL_2 = {
  id: 'plant_level_2',
  levelNumber: 2,
  title: 'Level 2: Find the small sprout and water it',
  instruction: 'Find the small sprout and water it',
  hint: 'Turn clockwise to 30° and water the sprout so it grows!',
  mode: 'radial',
  targetDestroyedCount: 0,
  targetWateredCount: 1,
  maxCommands: 4,
  hasTutorial: true,
  tutorialText: 'Find the small sprout and water it with the water command to make it grow!',

  initialRobot: {
    direction: 0,
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'sprout_30', angle: 30, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'bush_0', angle: 0, type: 'bush', isEvil: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'bush_90', angle: 90, type: 'bush', isEvil: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
    { id: 'bush_150', angle: 150, type: 'bush', isEvil: false },
    { id: 'bush_180', angle: 180, type: 'bush', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
    { id: 'bush_240', angle: 240, type: 'bush', isEvil: false },
    { id: 'bush_270', angle: 270, type: 'bush', isEvil: false },
    { id: 'bush_300', angle: 300, type: 'bush', isEvil: false },
    { id: 'bush_330', angle: 330, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.WATER,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
    createBlockInstance(BLOCK_TYPES.TURN_CLOCKWISE, { angle: 30 }),
    createBlockInstance(BLOCK_TYPES.WATER),
  ],
};

export const PLANT_LEVEL_3 = {
  id: 'plant_level_3',
  levelNumber: 3,
  title: 'Level 3: Destroy one pest plant and grow one good one',
  instruction: 'Destroy one pest plant and grow one good one',
  hint: 'Destroy one pest plant at 270° and grow one good plant at 240°.',
  mode: 'radial',
  targetDestroyedCount: 1,
  targetWateredCount: 1,
  hasTutorial: false,
  maxCommands: 6,

  initialRobot: {
    direction: 270, // Facing 270° Left directly at pest plant
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'pest_270', angle: 270, type: 'pest', isEvil: true, destroyed: false },
    { id: 'sprout_240', angle: 240, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'bush_0', angle: 0, type: 'bush', isEvil: false },
    { id: 'bush_30', angle: 30, type: 'bush', isEvil: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'bush_90', angle: 90, type: 'bush', isEvil: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
    { id: 'bush_150', angle: 150, type: 'bush', isEvil: false },
    { id: 'bush_180', angle: 180, type: 'bush', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
    { id: 'bush_300', angle: 300, type: 'bush', isEvil: false },
    { id: 'bush_330', angle: 330, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.DESTROY,
    BLOCK_TYPES.WATER,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
    createBlockInstance(BLOCK_TYPES.DESTROY),
    createBlockInstance(BLOCK_TYPES.TURN_COUNTERCLOCKWISE, { angle: 30 }),
    createBlockInstance(BLOCK_TYPES.WATER),
  ],
};

export const PLANT_LEVEL_4 = {
  id: 'plant_level_4',
  levelNumber: 4,
  title: 'Level 4: Help with the greenhouse',
  instruction: 'Help with the greenhouse',
  hint: 'Turn counterclockwise to 30° and destroy the pest plant at 330°.',
  mode: 'radial',
  targetDestroyedCount: 1,
  targetWateredCount: 0,
  maxCommands: 4,

  initialRobot: {
    direction: 0,
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'pest_330', angle: 330, type: 'pest', isEvil: true, destroyed: false },
    { id: 'bush_0', angle: 0, type: 'bush', isEvil: false },
    { id: 'bush_30', angle: 30, type: 'bush', isEvil: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'bush_90', angle: 90, type: 'bush', isEvil: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
    { id: 'bush_150', angle: 150, type: 'bush', isEvil: false },
    { id: 'bush_180', angle: 180, type: 'bush', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
    { id: 'bush_240', angle: 240, type: 'bush', isEvil: false },
    { id: 'bush_270', angle: 270, type: 'bush', isEvil: false },
    { id: 'bush_300', angle: 300, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.DESTROY,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
    createBlockInstance(BLOCK_TYPES.TURN_COUNTERCLOCKWISE, { angle: 30 }),
    createBlockInstance(BLOCK_TYPES.DESTROY),
  ],
};

export const PLANT_LEVEL_5 = {
  id: 'plant_level_5',
  levelNumber: 5,
  title: 'Level 5: The greenhouse needs plants',
  instruction: 'The greenhouse needs plants',
  hint: 'Destroy the pest plant at 330° and water the sprout at 150°.',
  mode: 'radial',
  targetDestroyedCount: 1,
  targetWateredCount: 1,
  maxCommands: 6,

  initialRobot: {
    direction: 0,
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'pest_330', angle: 330, type: 'pest', isEvil: true, destroyed: false },
    { id: 'sprout_150', angle: 150, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'bush_0', angle: 0, type: 'bush', isEvil: false },
    { id: 'bush_30', angle: 30, type: 'bush', isEvil: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'bush_90', angle: 90, type: 'bush', isEvil: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
    { id: 'bush_180', angle: 180, type: 'bush', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
    { id: 'bush_240', angle: 240, type: 'bush', isEvil: false },
    { id: 'bush_270', angle: 270, type: 'bush', isEvil: false },
    { id: 'bush_300', angle: 300, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.DESTROY,
    BLOCK_TYPES.WATER,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
  ],
};

export const PLANT_LEVEL_6 = {
  id: 'plant_level_6',
  levelNumber: 6,
  title: 'Level 6: Help with the greenhouse',
  instruction: 'Help with the greenhouse',
  hint: 'Use a repeat loop: water each sprout and turn 90°!',
  mode: 'radial',
  targetDestroyedCount: 0,
  targetWateredCount: 4,
  maxCommands: 5,
  hasTutorial: true,
  tutorialText: 'Water all 4 sprouts around the greenhouse! Use a repeat loop to repeat the water and turn actions.',

  initialRobot: {
    direction: 0,
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'sprout_0', angle: 0, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_90', angle: 90, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_180', angle: 180, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_270', angle: 270, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'bush_30', angle: 30, type: 'bush', isEvil: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
    { id: 'bush_150', angle: 150, type: 'bush', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
    { id: 'bush_240', angle: 240, type: 'bush', isEvil: false },
    { id: 'bush_300', angle: 300, type: 'bush', isEvil: false },
    { id: 'bush_330', angle: 330, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.WATER,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
    createBlockInstance(BLOCK_TYPES.REPEAT, { times: 4 }),
  ],
};

export const PLANT_LEVEL_7 = {
  id: 'plant_level_7',
  levelNumber: 7,
  title: 'Level 7: Sprout all the plants',
  instruction: 'Sprout all the plants',
  hint: 'Water all 5 sprouts positioned at 0°, 120°, 180°, 240°, and 300°.',
  mode: 'radial',
  targetDestroyedCount: 0,
  targetWateredCount: 5,
  maxCommands: 10,

  initialRobot: {
    direction: 0,
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'sprout_0', angle: 0, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_120', angle: 120, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_180', angle: 180, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_240', angle: 240, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_300', angle: 300, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'bush_30', angle: 30, type: 'bush', isEvil: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'bush_90', angle: 90, type: 'bush', isEvil: false },
    { id: 'bush_150', angle: 150, type: 'bush', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
    { id: 'bush_270', angle: 270, type: 'bush', isEvil: false },
    { id: 'bush_330', angle: 330, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.WATER,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
  ],
};

export const PLANT_LEVEL_8 = {
  id: 'plant_level_8',
  levelNumber: 8,
  title: 'Bonus 1: The hordes are coming!',
  instruction: 'The hordes are coming! Destroy the enemies and protect the little ones.',
  hint: 'Destroy all 5 enemies in a row (180° to 300°) while keeping sprouts safe!',
  mode: 'radial',
  targetDestroyedCount: 5,
  targetWateredCount: 0,
  maxCommands: 6,
  hasTutorial: true,
  tutorialText: 'The hordes are coming! Use a repeat loop to destroy all 5 enemies in a row without hitting the sprouts.',

  initialRobot: {
    direction: 180,
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'pest_180', angle: 180, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_210', angle: 210, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_240', angle: 240, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_270', angle: 270, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_300', angle: 300, type: 'pest', isEvil: true, destroyed: false },
    { id: 'sprout_60', angle: 60, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_150', angle: 150, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_330', angle: 330, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'bush_0', angle: 0, type: 'bush', isEvil: false },
    { id: 'bush_30', angle: 30, type: 'bush', isEvil: false },
    { id: 'bush_90', angle: 90, type: 'bush', isEvil: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.DESTROY,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
    createBlockInstance(BLOCK_TYPES.REPEAT, { times: 5 }),
  ],
};

export const PLANT_LEVEL_9 = {
  id: 'plant_level_9',
  levelNumber: 9,
  title: 'Bonus 2: Help with the plants',
  instruction: 'Help with the plants',
  hint: 'Eliminate all 9 pest plants and water the 3 sprouts!',
  mode: 'radial',
  targetDestroyedCount: 9,
  targetWateredCount: 3,
  maxCommands: 8,

  initialRobot: {
    direction: 0,
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'sprout_0', angle: 0, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_120', angle: 120, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_240', angle: 240, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'pest_30', angle: 30, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_60', angle: 60, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_90', angle: 90, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_150', angle: 150, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_180', angle: 180, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_210', angle: 210, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_270', angle: 270, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_300', angle: 300, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_330', angle: 330, type: 'pest', isEvil: true, destroyed: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.DESTROY,
    BLOCK_TYPES.WATER,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
  ],
};

export const PLANT_LEVEL_10 = {
  id: 'plant_level_10',
  levelNumber: 10,
  title: 'Bonus 3: Sometimes the long way is faster than the shortcut',
  instruction: 'Sometimes the long way is faster than the shortcut',
  hint: 'Think carefully about turn directions to minimize commands!',
  mode: 'radial',
  targetDestroyedCount: 2,
  targetWateredCount: 2,
  maxCommands: 7,

  initialRobot: {
    direction: 0,
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'sprout_0', angle: 0, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'sprout_30', angle: 30, type: 'sprout', stage: 1, isEvil: false, isWatered: false },
    { id: 'pest_150', angle: 150, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_180', angle: 180, type: 'pest', isEvil: true, destroyed: false },
    { id: 'bush_60', angle: 60, type: 'bush', isEvil: false },
    { id: 'bush_90', angle: 90, type: 'bush', isEvil: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
    { id: 'bush_210', angle: 210, type: 'bush', isEvil: false },
    { id: 'bush_240', angle: 240, type: 'bush', isEvil: false },
    { id: 'bush_270', angle: 270, type: 'bush', isEvil: false },
    { id: 'bush_300', angle: 300, type: 'bush', isEvil: false },
    { id: 'bush_330', angle: 330, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.DESTROY,
    BLOCK_TYPES.WATER,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
  ],
};

export const PLANT_LEVEL_11 = {
  id: 'plant_level_11',
  levelNumber: 11,
  title: 'Bonus 4: Build a loop. No more than 3 commands!',
  instruction: 'Build a loop. No more than 3 commands!',
  hint: 'Build a loop with no more than 3 commands to destroy all 10 pest plants!',
  mode: 'radial',
  targetDestroyedCount: 10,
  targetWateredCount: 0,
  maxCommands: 3,
  hasTutorial: true,
  tutorialText: 'Build a loop. No more than 3 commands! Combine repeat with turn and destroy.',

  initialRobot: {
    direction: 0,
    carriedCargo: 0,
  },

  initialPlants: [
    { id: 'pest_0', angle: 0, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_30', angle: 30, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_60', angle: 60, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_90', angle: 90, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_150', angle: 150, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_180', angle: 180, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_210', angle: 210, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_240', angle: 240, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_270', angle: 270, type: 'pest', isEvil: true, destroyed: false },
    { id: 'pest_300', angle: 300, type: 'pest', isEvil: true, destroyed: false },
    { id: 'bush_120', angle: 120, type: 'bush', isEvil: false },
    { id: 'bush_330', angle: 330, type: 'bush', isEvil: false },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.TURN_CLOCKWISE,
    BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    BLOCK_TYPES.REPEAT,
    BLOCK_TYPES.DESTROY,
  ],

  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
    createBlockInstance(BLOCK_TYPES.REPEAT, { times: 10 }),
  ],
};

export const PLANT_LEVELS = [
  PLANT_LEVEL_1,
  PLANT_LEVEL_2,
  PLANT_LEVEL_3,
  PLANT_LEVEL_4,
  PLANT_LEVEL_5,
  PLANT_LEVEL_6,
  PLANT_LEVEL_7,
  PLANT_LEVEL_8,
  PLANT_LEVEL_9,
  PLANT_LEVEL_10,
  PLANT_LEVEL_11,
];
