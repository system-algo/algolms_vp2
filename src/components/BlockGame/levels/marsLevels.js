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
  title: 'Level 1: Excursion Station',
  mode: 'grid',
  hint: 'Lead the robot to the living compartment of the station.',
  hasTutorial: true,
  maxCommands: 10,

  grid: {
    cols: 6,
    rows: 4,
    tiles: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 }, // Target X tile
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ],
  },

  stationBuilding: {
    x: 3,
    y: 0,
  },

  targetTile: {
    x: 3,
    y: 1,
  },

  initialRobot: {
    x: 1,
    y: 1,
    direction: 90, // Facing East (to the right)
    carriedCargo: 0,
  },

  initialCargos: [],

  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    { type: BLOCK_TYPES.TURN_DIRECTION, params: { direction: 'left' } },
    { type: BLOCK_TYPES.TURN_DIRECTION, params: { direction: 'right' } },
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

export const MARS_LEVEL_3 = {
  id: 'mars_level_3',
  levelNumber: 3,
  title: 'Level 3: Long Corridor',
  mode: 'grid',
  hint: 'Move forward along the path and collect the supply crate.',
  targetCargoCount: 1,
  maxCommands: 8,
  grid: {
    cols: 7,
    rows: 5,
    tiles: [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
      { x: 5, y: 1 },
    ],
  },
  initialRobot: { x: 1, y: 2, direction: 90, carriedCargo: 0 },
  initialCargos: [{ id: 'cargo_1', x: 5, y: 1 }],
  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_4 = {
  id: 'mars_level_4',
  levelNumber: 4,
  title: 'Level 4: Zigzag Path',
  mode: 'grid',
  hint: 'Navigate the zigzag corridor and collect the sample container.',
  targetCargoCount: 1,
  maxCommands: 10,
  grid: {
    cols: 6,
    rows: 6,
    tiles: [
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 1 },
    ],
  },
  initialRobot: { x: 1, y: 4, direction: 90, carriedCargo: 0 },
  initialCargos: [{ id: 'cargo_1', x: 4, y: 1 }],
  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_5 = {
  id: 'mars_level_5',
  levelNumber: 5,
  title: 'Level 5: Dual Cargo Pickup',
  mode: 'grid',
  hint: 'Pick up both cargo boxes along the branching route.',
  targetCargoCount: 2,
  maxCommands: 12,
  grid: {
    cols: 7,
    rows: 6,
    tiles: [
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 },
      { x: 3, y: 1 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ],
  },
  initialRobot: { x: 1, y: 3, direction: 90, carriedCargo: 0 },
  initialCargos: [
    { id: 'cargo_1', x: 3, y: 1 },
    { id: 'cargo_2', x: 5, y: 3 },
  ],
  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_6 = {
  id: 'mars_level_6',
  levelNumber: 6,
  title: 'Level 6: Station Entrance',
  mode: 'grid',
  hint: 'Collect the maintenance pack and reach the station living quarters.',
  targetCargoCount: 1,
  maxCommands: 10,
  grid: {
    cols: 6,
    rows: 5,
    tiles: [
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 1 },
    ],
  },
  stationBuilding: { x: 4, y: 0 },
  targetTile: { x: 4, y: 1 },
  initialRobot: { x: 1, y: 3, direction: 90, carriedCargo: 0 },
  initialCargos: [{ id: 'cargo_1', x: 3, y: 2 }],
  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_8 = {
  id: 'mars_level_8',
  levelNumber: 8,
  title: 'Level 8: Rocket Refuel',
  mode: 'grid',
  hint: 'Collect the fuel canisters and deliver them to the launch pad.',
  targetCargoCount: 2,
  maxCommands: 14,
  grid: {
    cols: 8,
    rows: 6,
    tiles: [
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 },
      { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 1 },
      { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 },
    ],
  },
  initialRobot: { x: 1, y: 4, direction: 90, carriedCargo: 0 },
  initialCargos: [
    { id: 'cargo_1', x: 3, y: 1 },
    { id: 'cargo_2', x: 6, y: 1 },
  ],
  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_9 = {
  id: 'mars_level_9',
  levelNumber: 9,
  title: 'Level 9: Crater Avoidance',
  mode: 'grid',
  hint: 'Navigate carefully around craters to reach the station.',
  targetCargoCount: 1,
  maxCommands: 12,
  grid: {
    cols: 7,
    rows: 6,
    tiles: [
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
      { x: 3, y: 3 }, { x: 3, y: 2 },
      { x: 4, y: 2 }, { x: 5, y: 2 },
      { x: 5, y: 1 },
    ],
  },
  stationBuilding: { x: 5, y: 0 },
  targetTile: { x: 5, y: 1 },
  initialRobot: { x: 1, y: 4, direction: 90, carriedCargo: 0 },
  initialCargos: [{ id: 'cargo_1', x: 3, y: 3 }],
  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_10 = {
  id: 'mars_level_10',
  levelNumber: 10,
  title: 'Level 10: Excavations',
  mode: 'grid',
  hint: 'Collect the 3 geological mineral samples hidden in the excavation trench.',
  targetCargoCount: 3,
  maxCommands: 16,
  grid: {
    cols: 8,
    rows: 7,
    tiles: [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 },
      { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 2 },
      { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
    ],
  },
  initialRobot: { x: 1, y: 1, direction: 90, carriedCargo: 0 },
  initialCargos: [
    { id: 'cargo_1', x: 3, y: 1 },
    { id: 'cargo_2', x: 5, y: 1 },
    { id: 'cargo_3', x: 3, y: 3 },
  ],
  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_11 = {
  id: 'mars_level_11',
  levelNumber: 11,
  title: 'Level 11: Base Expansion',
  mode: 'grid',
  hint: 'Collect the equipment modules using a repeat loop.',
  targetCargoCount: 3,
  maxCommands: 14,
  grid: {
    cols: 8,
    rows: 6,
    tiles: [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 },
      { x: 6, y: 2 }, { x: 6, y: 3 },
      { x: 5, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 },
      { x: 1, y: 2 },
    ],
  },
  initialRobot: { x: 1, y: 1, direction: 90, carriedCargo: 0 },
  initialCargos: [
    { id: 'cargo_1', x: 4, y: 1 },
    { id: 'cargo_2', x: 6, y: 3 },
    { id: 'cargo_3', x: 2, y: 3 },
  ],
  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_12 = {
  id: 'mars_level_12',
  levelNumber: 12,
  title: 'Level 12: Mars Surveyor',
  mode: 'grid',
  hint: 'Reach the outpost station building within the command limit.',
  targetCargoCount: 2,
  maxCommands: 14,
  grid: {
    cols: 7,
    rows: 6,
    tiles: [
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
      { x: 4, y: 3 }, { x: 4, y: 2 },
      { x: 3, y: 2 }, { x: 2, y: 2 },
      { x: 2, y: 1 },
    ],
  },
  stationBuilding: { x: 2, y: 0 },
  targetTile: { x: 2, y: 1 },
  initialRobot: { x: 1, y: 4, direction: 90, carriedCargo: 0 },
  initialCargos: [
    { id: 'cargo_1', x: 3, y: 4 },
    { id: 'cargo_2', x: 3, y: 2 },
  ],
  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_13 = {
  id: 'mars_level_13',
  levelNumber: 13,
  title: 'Level 13: Emergency Protocol',
  mode: 'grid',
  hint: 'Collect the backup battery and reach the communication dish.',
  targetCargoCount: 1,
  maxCommands: 10,
  grid: {
    cols: 8,
    rows: 5,
    tiles: [
      { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 },
      { x: 6, y: 1 },
    ],
  },
  stationBuilding: { x: 6, y: 0 },
  targetTile: { x: 6, y: 1 },
  initialRobot: { x: 1, y: 2, direction: 90, carriedCargo: 0 },
  initialCargos: [{ id: 'cargo_1', x: 4, y: 2 }],
  toolboxBlocks: [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  initialBlocks: [createBlockInstance(BLOCK_TYPES.START_HAT)],
};

export const MARS_LEVEL_14 = {
  id: 'mars_level_14',
  levelNumber: 14,
  title: 'Level 14: Final Rocket Load',
  mode: 'grid',
  hint: 'Load all 4 cargo pods onto the supply transporter using loops!',
  targetCargoCount: 4,
  maxCommands: 18,
  grid: {
    cols: 8,
    rows: 8,
    tiles: [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 },
      { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 },
      { x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }, { x: 1, y: 5 },
      { x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 2 },
    ],
  },
  initialRobot: { x: 1, y: 1, direction: 90, carriedCargo: 0 },
  initialCargos: [
    { id: 'cargo_1', x: 3, y: 1 },
    { id: 'cargo_2', x: 5, y: 3 },
    { id: 'cargo_3', x: 3, y: 5 },
    { id: 'cargo_4', x: 1, y: 3 },
  ],
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
  MARS_LEVEL_3,
  MARS_LEVEL_4,
  MARS_LEVEL_5,
  MARS_LEVEL_6,
  MARS_LEVEL_7,
  MARS_LEVEL_8,
  MARS_LEVEL_9,
  MARS_LEVEL_10,
  MARS_LEVEL_11,
  MARS_LEVEL_12,
  MARS_LEVEL_13,
  MARS_LEVEL_14,
];
