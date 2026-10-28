/**
 * Block definitions for Algo LMS Block Programming Game
 * Styles, colors, and connectors match Scratch / Google Blockly as used in Algo LMS.
 */

export const BLOCK_TYPES = {
  // Hat block (program entry point)
  START_HAT: 'start_hat',

  // Basic statements (purple)
  MOVE_FORWARD: 'move_forward',
  POINT_DIRECTION: 'point_direction',
  TAKE_CARGO: 'take_cargo',
  PUT_CARGO: 'put_cargo',

  // Flow control (green)
  REPEAT: 'repeat',

  // Rotation & Plants / Laser statements
  TURN_CLOCKWISE: 'turn_clockwise',
  TURN_COUNTERCLOCKWISE: 'turn_counterclockwise',
  DESTROY: 'destroy',
  WATER: 'water',
};

export const BLOCK_DEFINITIONS = {
  [BLOCK_TYPES.START_HAT]: {
    type: BLOCK_TYPES.START_HAT,
    kind: 'hat',
    label: 'When Start clicked',
    category: 'events',
    color: '#FF6300',
    darkColor: '#CC4F00',
    lightColor: '#FFA366',
    canDelete: false,
    canClone: false,
  },

  [BLOCK_TYPES.MOVE_FORWARD]: {
    type: BLOCK_TYPES.MOVE_FORWARD,
    kind: 'statement',
    label: 'move forward',
    category: 'motion',
    color: '#8A5BA7',
    darkColor: '#6B4284',
    lightColor: '#B488CE',
    icon: 'arrow-forward',
  },

  [BLOCK_TYPES.POINT_DIRECTION]: {
    type: BLOCK_TYPES.POINT_DIRECTION,
    kind: 'statement',
    label: 'point in direction',
    category: 'motion',
    color: '#8A5BA7',
    darkColor: '#6B4284',
    lightColor: '#B488CE',
    params: [
      {
        name: 'direction',
        type: 'select',
        default: 90,
        options: [
          { value: 0, label: '(0) up' },
          { value: 90, label: '(90) to the right' },
          { value: 180, label: '(180) down' },
          { value: -90, label: '(-90) to the left' },
        ],
      },
    ],
  },

  [BLOCK_TYPES.TAKE_CARGO]: {
    type: BLOCK_TYPES.TAKE_CARGO,
    kind: 'statement',
    label: 'take the cargo',
    category: 'actions',
    color: '#8A5BA7',
    darkColor: '#6B4284',
    lightColor: '#B488CE',
    icon: 'box',
  },

  [BLOCK_TYPES.PUT_CARGO]: {
    type: BLOCK_TYPES.PUT_CARGO,
    kind: 'statement',
    label: 'put the cargo down',
    category: 'actions',
    color: '#8A5BA7',
    darkColor: '#6B4284',
    lightColor: '#B488CE',
    icon: 'box-down',
  },

  [BLOCK_TYPES.REPEAT]: {
    type: BLOCK_TYPES.REPEAT,
    kind: 'c_block',
    labelPrefix: 'repeat',
    labelSuffix: 'times',
    category: 'control',
    color: '#5BA55B',
    darkColor: '#447C44',
    lightColor: '#84C784',
    params: [
      {
        name: 'times',
        type: 'number_select',
        default: 4,
        options: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      },
    ],
  },

  [BLOCK_TYPES.TURN_CLOCKWISE]: {
    type: BLOCK_TYPES.TURN_CLOCKWISE,
    kind: 'statement',
    label: 'turn clockwise to',
    category: 'motion',
    color: '#8A5BA7',
    darkColor: '#6B4284',
    lightColor: '#B488CE',
    params: [
      {
        name: 'angle',
        type: 'select',
        default: 30,
        options: [
          { value: 30, label: '30' },
          { value: 60, label: '60' },
          { value: 90, label: '90' },
          { value: 120, label: '120' },
          { value: 180, label: '180' },
        ],
      },
    ],
  },

  [BLOCK_TYPES.TURN_COUNTERCLOCKWISE]: {
    type: BLOCK_TYPES.TURN_COUNTERCLOCKWISE,
    kind: 'statement',
    label: 'turn counterclockwise to',
    category: 'motion',
    color: '#8A5BA7',
    darkColor: '#6B4284',
    lightColor: '#B488CE',
    params: [
      {
        name: 'angle',
        type: 'select',
        default: 30,
        options: [
          { value: 30, label: '30' },
          { value: 60, label: '60' },
          { value: 90, label: '90' },
          { value: 120, label: '120' },
          { value: 180, label: '180' },
        ],
      },
    ],
  },

  [BLOCK_TYPES.DESTROY]: {
    type: BLOCK_TYPES.DESTROY,
    kind: 'statement',
    label: 'destroy',
    category: 'actions',
    color: '#EF4444',
    darkColor: '#B91C1C',
    lightColor: '#F87171',
    icon: 'laser',
  },

  [BLOCK_TYPES.WATER]: {
    type: BLOCK_TYPES.WATER,
    kind: 'statement',
    label: 'water',
    category: 'actions',
    color: '#10B981',
    darkColor: '#047857',
    lightColor: '#34D399',
    icon: 'droplet',
  },
};

export function createBlockInstance(type, customParams = {}) {
  const def = BLOCK_DEFINITIONS[type];
  if (!def) throw new Error(`Unknown block type: ${type}`);

  const defaultParams = {};
  if (Array.isArray(def.params)) {
    def.params.forEach((p) => {
      defaultParams[p.name] = p.default;
    });
  }

  const id = `blk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const instance = {
    id,
    type,
    params: { ...defaultParams, ...customParams },
  };

  if (def.kind === 'c_block') {
    instance.children = [];
  }

  return instance;
}

export function countCommands(blocks = []) {
  let count = 0;
  for (const block of blocks) {
    if (block.type !== BLOCK_TYPES.START_HAT) {
      count += 1;
    }
    if (Array.isArray(block.children)) {
      count += countCommands(block.children);
    }
  }
  return count;
}
