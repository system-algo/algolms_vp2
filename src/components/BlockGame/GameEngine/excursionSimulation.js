import { getNextPosition } from './gameInterpreter.js';

export function stepExcursion(level, robot, step) {
  if (step.action === 'repeat_iteration') return robot;
  if (step.action === 'take_cargo') throw new Error('There is no cargo here to take.');
  if (step.action === 'put_cargo') throw new Error('The robot is not carrying cargo.');
  if (step.action === 'turn_direction') {
    return { ...robot, direction: (robot.direction + (step.direction === 'left' ? 270 : 90)) % 360 };
  }
  if (step.action !== 'move_forward') throw new Error('Use the commands provided for this task.');
  const next = getNextPosition(robot.x, robot.y, robot.direction);
  const tile = level.cells.find(cell => cell.x === next.x && cell.y === next.y);
  if (!tile || tile.blocked) throw new Error(tile?.blocked ? 'There is an obstacle ahead. Try another route.' : 'The robot went off the path. Check your commands and try again.');
  return { ...robot, ...next };
}

