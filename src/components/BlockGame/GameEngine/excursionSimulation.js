import { getNextPosition } from './gameInterpreter.js';

export function initialExcursionRobot(level) {
  return level.cargo ? { ...level.start, boxes: level.cargo.map(box => ({ ...box })), carrying: false, delivered: 0 } : { ...level.start };
}

export function isExcursionComplete(level, robot) {
  return level.cargo
    ? robot.boxes.length === 0 && !robot.carrying && robot.delivered === level.cargo.length
    : robot.x === level.target.x && robot.y === level.target.y;
}

export function stepExcursion(level, robot, step) {
  if (step.action === 'repeat_iteration') return robot;
  if (step.action === 'take_cargo') {
    if (!level.cargo) throw new Error('There is no cargo here to take.');
    if (robot.carrying) throw new Error('The robot can only carry one box at a time.');
    const index = robot.boxes.findIndex(box => box.x === robot.x && box.y === robot.y);
    if (index < 0) throw new Error('There is no cargo here to take.');
    return { ...robot, carrying: true, boxes: robot.boxes.filter((_, i) => i !== index) };
  }
  if (step.action === 'put_cargo') {
    if (!robot.carrying) throw new Error('The robot is not carrying cargo.');
    if (level.portals.some(portal => portal.x === robot.x && portal.y === robot.y)) return { ...robot, carrying: false, delivered: robot.delivered + 1 };
    if (robot.boxes.some(box => box.x === robot.x && box.y === robot.y)) throw new Error('There is already a box here.');
    return { ...robot, carrying: false, boxes: [...robot.boxes, { x: robot.x, y: robot.y }] };
  }
  if (step.action === 'turn_direction') return { ...robot, direction: (robot.direction + (step.direction === 'left' ? 270 : 90)) % 360 };
  if (step.action !== 'move_forward') throw new Error('Use the commands provided for this task.');
  const next = getNextPosition(robot.x, robot.y, robot.direction);
  const tile = level.cells.find(cell => cell.x === next.x && cell.y === next.y);
  if (!tile || tile.blocked) throw new Error(tile?.blocked ? 'There is an obstacle ahead. Try another route.' : 'The robot went off the path. Check your commands and try again.');
  return { ...robot, ...next };
}
