import { BLOCK_TYPES, createBlockInstance } from '../BlockWorkspace/blockDefinitions.js';

/**
 * Mars Rover Cargo Game Levels
 */
export const MARS_LEVEL_7 = {
  id: 'mars_level_7',
  levelNumber: 7,
  title: 'Level 7: Cargo Loop',
  mode: 'grid',
  hint: 'I wonder which way you will lead the robot...',
  targetCargoCount: 3,
  maxCommands: 15,

  grid: {
    cols: 8,
    rows: 7,
    tiles: [
      // Top horizontal path (y=0)
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 5, y: 0 },

      // Right vertical path (x=5)
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },

      // Middle horizontal path (y=4)
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 6, y: 4 },
      { x: 7, y: 4 },

      // Left vertical path (x=1)
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 5 },
      { x: 1, y: 6 },
    ],
  },

  initialRobot: {
    x: 1,
    y: 4,
    direction: 90, // Facing East (to the right)
    carriedCargo: 0,
  },

  initialCargos: [
    { id: 'cargo_1', x: 5, y: 4 },
    { id: 'cargo_2', x: 5, y: 0 },
    { id: 'cargo_3', x: 1, y: 0 },
  ],

  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],

  // Default: only the Start Hat block. All command blocks must be dragged from BLOCKS toolbox.
  initialBlocks: [
    createBlockInstance(BLOCK_TYPES.START_HAT),
  ],
};

export const MARS_LEVEL_1 = {
  id: 'mars_level_1',
  levelNumber: 1,
  title: 'Level 1: Straight Ahead',
  mode: 'grid',
  hint: 'Lead the robot forward to take the cargo.',
  targetCargoCount: 1,
  maxCommands: 4,

  grid: {
    cols: 6,
    rows: 4,
    tiles: [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ],
  },

  initialRobot: {
    x: 1,
    y: 2,
    direction: 90,
    carriedCargo: 0,
  },

  initialCargos: [{ id: 'cargo_1', x: 4, y: 2 }],

  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],

  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_2 = {
  id: 'mars_level_2',
  levelNumber: 2,
  title: 'Level 2: Make a Turn',
  mode: 'grid',
  hint: 'Turn up and collect the cargo container.',
  targetCargoCount: 1,
  maxCommands: 6,

  grid: {
    cols: 6,
    rows: 5,
    tiles: [
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 },
      { x: 3, y: 1 },
    ],
  },

  initialRobot: {
    x: 1,
    y: 3,
    direction: 90,
    carriedCargo: 0,
  },

  initialCargos: [{ id: 'cargo_1', x: 3, y: 1 }],

  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],

  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVELS = [
  MARS_LEVEL_1,
  MARS_LEVEL_2,
  MARS_LEVEL_7,
];
