import { BLOCK_TYPES } from '../BlockWorkspace/blockDefinitions.js';

/**
 * Traverses the block AST and expands loops into a sequence of atomic steps.
 * Includes blockId for highlighting in the workspace.
 */
export function compileProgram(blocks, maxSteps = 400) {
  const steps = [];

  // Find start hat
  const startHatIndex = blocks.findIndex((b) => b.type === BLOCK_TYPES.START_HAT);
  const executableBlocks = startHatIndex >= 0 ? blocks.slice(startHatIndex + 1) : blocks;

  function traverse(list, depth = 0) {
    if (depth > 12) {
      throw new Error('Maximum loop nesting depth exceeded');
    }

    for (const blk of list) {
      if (steps.length >= maxSteps) {
        throw new Error(`Program exceeded maximum execution limit of ${maxSteps} steps.`);
      }

      if (blk.type === BLOCK_TYPES.REPEAT) {
        const times = Math.max(1, Math.min(20, Number(blk.params?.times ?? 4)));
        const children = blk.children || [];

        for (let i = 0; i < times; i++) {
          // Add marker for repeat block entry
          steps.push({
            blockId: blk.id,
            action: 'repeat_iteration',
            iteration: i + 1,
            totalIterations: times,
          });

          traverse(children, depth + 1);
        }
      } else if (blk.type === BLOCK_TYPES.MOVE_FORWARD) {
        steps.push({
          blockId: blk.id,
          action: 'move_forward',
        });
      } else if (blk.type === BLOCK_TYPES.POINT_DIRECTION) {
        const direction = Number(blk.params?.direction ?? 90);
        steps.push({
          blockId: blk.id,
          action: 'point_direction',
          direction,
        });
      } else if (blk.type === BLOCK_TYPES.TAKE_CARGO) {
        steps.push({
          blockId: blk.id,
          action: 'take_cargo',
        });
      } else if (blk.type === BLOCK_TYPES.PUT_CARGO) {
        steps.push({
          blockId: blk.id,
          action: 'put_cargo',
        });
      } else if (blk.type === BLOCK_TYPES.TURN_CLOCKWISE) {
        const angle = Number(blk.params?.angle ?? 30);
        steps.push({
          blockId: blk.id,
          action: 'turn_clockwise',
          angle,
        });
      } else if (blk.type === BLOCK_TYPES.TURN_COUNTERCLOCKWISE) {
        const angle = Number(blk.params?.angle ?? 30);
        steps.push({
          blockId: blk.id,
          action: 'turn_counterclockwise',
          angle,
        });
      } else if (blk.type === BLOCK_TYPES.DESTROY) {
        steps.push({
          blockId: blk.id,
          action: 'destroy',
        });
      } else if (blk.type === BLOCK_TYPES.WATER) {
        steps.push({
          blockId: blk.id,
          action: 'water',
        });
      }
    }
  }

  traverse(executableBlocks);
  return steps;
}

/**
 * Calculates next tile coordinates based on direction:
 * 0 = Up, 90 = Right, 180 = Down, -90 or 270 = Left
 */
export function getNextPosition(x, y, direction) {
  // Normalize angle to [0, 360)
  let norm = ((direction % 360) + 360) % 360;

  if (norm >= 315 || norm < 45) {
    // Up / North
    return { x, y: y - 1 };
  } else if (norm >= 45 && norm < 135) {
    // Right / East
    return { x: x + 1, y };
  } else if (norm >= 135 && norm < 225) {
    // Down / South
    return { x, y: y + 1 };
  } else {
    // Left / West
    return { x: x - 1, y };
  }
}
