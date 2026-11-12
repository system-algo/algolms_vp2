import { getNextPosition } from './gameInterpreter.js';

export function initialExcursionRobot(level) {
  if (level.mode === 'coordinates') return { ...level.start, visited: [] };
  if (level.plants) return { ...level.start, plants: level.plants.map(p => ({ ...p })), beam: null };
  if (level.buildings) return { ...level.start, built: [] };
  if (level.rocks) return { ...level.start, rocks: level.rocks.map(r => ({ ...r })) };
  return level.cargo ? { ...level.start, boxes: level.cargo.map(box => ({ ...box })), carrying: false, delivered: 0 } : { ...level.start };
}

export function isExcursionComplete(level, robot) {
  if (level.mode === 'coordinates') return robot.visited.length === level.points.length;
  if (level.plants) return robot.plants.every(p => p.kind === 'big' || p.removed);
  if (level.rocks) return robot.rocks.length === 0;
  if (level.collectOnly) return robot.boxes.length === 0;
  if (level.buildings) return robot.built.length === level.buildings.length;
  return level.cargo
    ? robot.boxes.length === 0 && !robot.carrying && robot.delivered === level.cargo.length
    : robot.x === level.target.x && robot.y === level.target.y;
}

export function stepExcursion(level, robot, step) {
  if (level.mode === 'coordinates') {
    if (step.action !== 'go_to') throw new Error('Use the coordinate command.');
    if (!Number.isFinite(step.x) || !Number.isFinite(step.y) || Math.abs(step.x) > 8 * level.unit || Math.abs(step.y) > 6 * level.unit) throw new Error('Choose coordinates within the tablet.');
    const index = level.points.findIndex(p => p.x === step.x && p.y === step.y);
    return { ...robot, x: step.x, y: step.y, visited: index >= 0 && !robot.visited.includes(index) ? [...robot.visited, index] : robot.visited };
  }
  if (level.plants) {
    if (step.action === 'repeat_iteration') return robot;
    if (step.action === 'turn_clockwise' || step.action === 'turn_counterclockwise') return { ...robot, beam: null, direction: ((robot.direction + (step.action === 'turn_clockwise' ? step.angle : -step.angle)) % 360 + 360) % 360 };
    if (step.action !== 'destroy' && step.action !== 'water') throw new Error('Use the laser and watering commands.');
    return { ...robot, beam: step.action, plants: robot.plants.map(p => {
      if (p.removed || p.angle !== robot.direction) return p;
      if (step.action === 'destroy' && p.kind === 'evil') return { ...p, removed: true };
      if (step.action === 'water' && p.kind === 'small') return { ...p, kind: 'big', image: p.image.replace('small', 'big') };
      return p;
    }) };
  }
  if (step.action.startsWith('build_')) {
    const target = level.buildings?.findIndex(b => b.x === robot.x && b.y === robot.y && b.kind === step.action.slice(6));
    if (target === undefined || target < 0) throw new Error('Build the matching structure on its marked site.');
    if (robot.built.includes(target)) throw new Error('This structure has already been built.');
    return { ...robot, built: [...robot.built, target] };
  }
  if (step.action === 'destroy' && level.rocks) {
    const index = robot.rocks.findIndex(r => r.x === robot.x && r.y === robot.y);
    if (index < 0) throw new Error('Stand on a stone before using Destroy.');
    return { ...robot, rocks: robot.rocks.filter((_, i) => i !== index) };
  }
  if (step.action === 'repeat_iteration') return robot;
  if (step.action === 'take_cargo') {
    if (!level.cargo) throw new Error('There is no cargo here to take.');
    if (!level.collectOnly && robot.carrying) throw new Error('The robot can only carry one box at a time.');
    const index = robot.boxes.findIndex(box => box.x === robot.x && box.y === robot.y);
    if (index < 0) throw new Error('There is no cargo here to take.');
    return { ...robot, carrying: !level.collectOnly, delivered: level.collectOnly ? robot.delivered + 1 : robot.delivered, boxes: robot.boxes.filter((_, i) => i !== index) };
  }
  if (step.action === 'put_cargo') {
    if (!robot.carrying) throw new Error('The robot is not carrying cargo.');
    if (level.portals.some(portal => portal.x === robot.x && portal.y === robot.y)) return { ...robot, carrying: false, delivered: robot.delivered + 1 };
    if (robot.boxes.some(box => box.x === robot.x && box.y === robot.y)) throw new Error('There is already a box here.');
    return { ...robot, carrying: false, boxes: [...robot.boxes, { x: robot.x, y: robot.y }] };
  }
  if (step.action === 'point_direction') return { ...robot, direction: ((step.direction % 360) + 360) % 360 };
  if (step.action === 'turn_direction') return { ...robot, direction: (robot.direction + (step.direction === 'left' ? 270 : 90)) % 360 };
  if (step.action !== 'move_forward') throw new Error('Use the commands provided for this task.');
  const next = getNextPosition(robot.x, robot.y, robot.direction);
  const tile = level.cells.find(cell => cell.x === next.x && cell.y === next.y);
  if (!tile || tile.blocked) throw new Error(tile?.blocked ? 'There is an obstacle ahead. Try another route.' : 'The robot went off the path. Check your commands and try again.');
  return { ...robot, ...next };
}
