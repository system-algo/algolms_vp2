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
  TURN_DIRECTION: 'turn_direction',
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
          { value: 30, label: '(30) 30°' },
          { value: 60, label: '(60) 60°' },
          { value: 90, label: '(90) to the right' },
          { value: 120, label: '(120) 120°' },
          { value: 150, label: '(150) 150°' },
          { value: 180, label: '(180) down' },
          { value: 210, label: '(210) 210°' },
          { value: 240, label: '(240) 240°' },
          { value: 270, label: '(-90) to the left' },
          { value: 300, label: '(300) 300°' },
          { value: 330, label: '(330) 330°' },
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
        default: 2,
        options: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      },
    ],
  },

  [BLOCK_TYPES.TURN_DIRECTION]: {
    type: BLOCK_TYPES.TURN_DIRECTION,
    kind: 'statement',
    label: 'turn',
    category: 'motion',
    color: '#8A5BA7',
    darkColor: '#6B4284',
    lightColor: '#B488CE',
    params: [
      {
        name: 'direction',
        type: 'select',
        default: 'left',
        options: [
          { value: 'left', label: 'left ↺' },
          { value: 'right', label: 'right ↻' },
        ],
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
          { value: 150, label: '150' },
          { value: 180, label: '180' },
          { value: 210, label: '210' },
          { value: 240, label: '240' },
          { value: 270, label: '270' },
          { value: 300, label: '300' },
          { value: 330, label: '330' },
          { value: 360, label: '360' },
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
          { value: 150, label: '150' },
          { value: 180, label: '180' },
          { value: 210, label: '210' },
          { value: 240, label: '240' },
          { value: 270, label: '270' },
          { value: 300, label: '300' },
          { value: 330, label: '330' },
          { value: 360, label: '360' },
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

  if (type === 'if_else') { instance.children = [createBlockInstance('branch_if'), createBlockInstance('branch_else')]; }
  if (['branch_if', 'if_condition'].includes(type)) instance.params.condition = {kind:'cargo_color',value:'green'};
  if (type === 'repeat_until') instance.params.condition = {kind:'finish',value:'crossed'};
  if (['set_variable','add_variable','send_variable'].includes(type)) instance.params = {name:'variable',value:0,...customParams};
  if (type==='repeat_variable') instance.params = {value:{kind:'variable',name:'variable'},...customParams};
  return instance;
}

export function countCommands(blocks = []) {
  let count = 0;
  for (const block of blocks) {
    if (![BLOCK_TYPES.START_HAT,'branch_if','branch_else'].includes(block.type)) {
      count += 1;
    }
    if (Array.isArray(block.children)) {
      count += countCommands(block.children);
    }
  }
  return count;
}

Object.assign(BLOCK_TYPES, { BUILD_FACTORY: 'build_factory', BUILD_GREENHOUSE: 'build_greenhouse', BUILD_WINDMILL: 'build_windmill' });
for (const [kind, label] of [['factory', 'factory'], ['greenhouse', 'greenhouse'], ['windmill', 'wind generator']]) {
  BLOCK_DEFINITIONS[`build_${kind}`] = { type: `build_${kind}`, kind: 'statement', label, category: 'actions', color: '#995ba7', darkColor: '#6B4284', lightColor: '#B488CE' };
}

// The three coordinate scales used by the original Rocket flight tasks.
for (const unit of [1, 10, 30]) {
  const type = `go_to_${unit}`;
  BLOCK_DEFINITIONS[type] = {
    type, kind: 'statement', label: 'go to X', category: 'motion', color: '#995ba5', darkColor: '#7a4984',
    params: ['x', 'y'].map((name, i) => ({ name, type: 'select', default: -(i ? 6 : 8) * unit, options: Array.from({ length: i ? 13 : 17 }, (_, n) => ({ value: (n - (i ? 6 : 8)) * unit, label: String((n - (i ? 6 : 8)) * unit) })) })),
  };
}

BLOCK_DEFINITIONS.collect_direction = { ...BLOCK_DEFINITIONS.point_direction, type: 'collect_direction', params: [{ ...BLOCK_DEFINITIONS.point_direction.params[0], options: BLOCK_DEFINITIONS.point_direction.params[0].options.filter(o => [0, 90, 180, 270].includes(o.value)) }] };

for (const unit of [1, 10, 30]) for (const axis of ['x', 'y']) {
  const type = `change_${axis}_${unit}`;
  BLOCK_DEFINITIONS[type] = { type, kind: 'statement', label: `change ${axis.toUpperCase()} by`, category: 'motion', color: '#995ba5', darkColor: '#7a4984', params: [{ name: 'amount', type: 'select', default: -8 * unit, options: Array.from({ length: 17 }, (_, n) => ({ value: (n - 8) * unit, label: String((n - 8) * unit) })) }] };
}

for (const [type,label,kind] of [['if_else','if / else','branch_block'],['branch_if','if','c_block'],['branch_else','else','c_block'],['if_condition','if','c_block'],['repeat_until','repeat until','c_block'],['forever','forever','c_block'],['cook','cook','statement']]) BLOCK_DEFINITIONS[type] = { type, label, kind, category: 'control', color: '#5ba55b', darkColor: '#498449', params: [] };

for (const [type,label,kind] of [['mine','mine','statement'],['set_variable','set','statement'],['add_variable','change by','statement'],['send_variable','send value','statement'],['next_crystal','next crystal','statement'],['repeat_variable','repeat times','c_block']]) {
  BLOCK_DEFINITIONS[type] = {type,label,kind,category:'variables',color:type==='mine'?'#995ba7':'#dd8b23',darkColor:'#98601d',params:[]};
}
