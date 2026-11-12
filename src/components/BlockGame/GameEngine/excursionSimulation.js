import { getNextPosition } from './gameInterpreter.js';

export function initialExcursionRobot(level) {
  if (level.mode === 'training' || level.mode === 'dark') {
    const selected = new Map();
    for (const group of new Set((level.items || []).filter(i => i.kind === 'hidden').map(i => i.group))) {
      const candidates = level.items.filter(i => i.group === group);
      selected.set(group, candidates[Math.floor(Math.random() * candidates.length)]);
    }
    return { ...level.start, tanks: level.items.filter(i => i.kind === 'tank' || (i.kind === 'hidden' && selected.get(i.group) === i)).map(i => ({ ...i })), collected: 0, revealed: [] };
  }
  if (level.mode === 'chef') return { fruitIndex: 0, cooked: [] };
  if (level.mode === 'field') return { fruitIndex: 0, destroyed: [] };
  if (level.mode === 'sorting') return { ...level.start, boxes: level.cargo.map(b=>({...b, color: b.color === 'unknown' ? (Math.random()<.5?'green':'yellow') : b.color})), carrying:false, carriedBox:null, delivered:0 };
  if (level.mode === 'coordinates') return { ...level.start, visited: [] };
  if (level.plants) return { ...level.start, plants: level.plants.map(p => ({ ...p })), beam: null };
  if (level.buildings) return { ...level.start, built: [] };
  if (level.rocks) return { ...level.start, rocks: level.rocks.map(r => ({ ...r })) };
  return level.cargo ? { ...level.start, boxes: level.cargo.map(box => ({ ...box })), carrying: false, delivered: 0 } : { ...level.start };
}

export function isExcursionComplete(level, robot) {
  if (level.mode === 'field') return robot.fruitIndex >= level.objects.length;
  if (level.mode === 'training' || level.mode === 'dark') return robot.tanks.length === 0 && (!level.target || (robot.x === level.target.x && robot.y === level.target.y));
  if (level.mode === 'chef') return robot.fruitIndex >= level.fruits.length;
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
  if (level.mode === 'field') {
    if (step.action === 'repeat_iteration') return robot;
    const object=level.objects[robot.fruitIndex];
    if (!object) return robot;
    if (step.action === 'destroy') {
      if (object.kind !== 'bad') throw new Error('This is a healthy plant. Change the coordinate boundaries.');
      if (robot.destroyed.includes(robot.fruitIndex)) throw new Error('This weed has already been removed.');
      return { ...robot, destroyed: [...robot.destroyed, robot.fruitIndex] };
    }
    if (step.action === 'advance_item') {
      if (object.kind === 'bad' && !robot.destroyed.includes(robot.fruitIndex)) throw new Error('A weed was left on the field. Change the coordinate boundaries.');
      return { ...robot, fruitIndex: robot.fruitIndex + 1 };
    }
    throw new Error('Use the destroy command inside the coordinate condition.');
  }
  if ((level.mode === 'training' || level.mode === 'dark') && step.action === 'take_cargo') {
    const tank = robot.tanks.findIndex(i => i.x === robot.x && i.y === robot.y);
    if (tank < 0) throw new Error('There is no gas tank under the robot. Check the sensor.');
    return { ...robot, tanks: robot.tanks.filter((_,i) => i !== tank), collected: robot.collected + 1 };
  }
  if (level.mode === 'chef') {
    if (step.action === 'repeat_iteration') return robot;
    const fruit = level.fruits[robot.fruitIndex];
    if (!fruit) return robot;
    if (step.action === 'cook') {
      if (!level.targets.includes(fruit.name)) throw new Error('This ingredient is not in the recipe. Check your condition.');
      if (robot.cooked.includes(robot.fruitIndex)) throw new Error('This ingredient has already been cooked.');
      return { ...robot, cooked: [...robot.cooked, robot.fruitIndex] };
    }
    if (step.action === 'advance_item') {
      if (level.targets.includes(fruit.name) && !robot.cooked.includes(robot.fruitIndex)) throw new Error('You missed an ingredient needed for the recipe. Check your condition.');
      return { ...robot, fruitIndex: robot.fruitIndex + 1 };
    }
    throw new Error('Use the cooking commands provided for this task.');
  }
  if (level.mode === 'coordinates') {
    if (step.action === 'repeat_iteration') return robot;
    if (step.action === 'change_coordinate') {
      const x = robot.x + (step.axis === 'x' ? step.amount : 0), y = robot.y + (step.axis === 'y' ? step.amount : 0);
      if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 8 * level.unit || Math.abs(y) > 6 * level.unit) throw new Error('The rocket went outside the tablet. Check your coordinate changes.');
      const visited = new Set(robot.visited);
      level.points.forEach((p, i) => { if (Math.abs((p.x - robot.x) * (y - robot.y) - (p.y - robot.y) * (x - robot.x)) < 1e-7 && p.x >= Math.min(x, robot.x) && p.x <= Math.max(x, robot.x) && p.y >= Math.min(y, robot.y) && p.y <= Math.max(y, robot.y)) visited.add(i); });
      return { ...robot, x, y, visited: [...visited] };
    }
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
    return { ...robot, carriedBox: robot.boxes[index], carrying: !level.collectOnly, delivered: level.collectOnly ? robot.delivered + 1 : robot.delivered, boxes: robot.boxes.filter((_, i) => i !== index) };
  }
  if (step.action === 'put_cargo') {
    if (!robot.carrying) throw new Error('The robot is not carrying cargo.');
    if (level.mode === 'sorting') {
      const portal=level.portals.find(p=>p.x===robot.x&&p.y===robot.y);
      if(portal&&portal.color!==robot.carriedBox.color) throw new Error('Check the cargo colour and choose the matching portal.');
    }
    if (level.portals.some(portal => portal.x === robot.x && portal.y === robot.y)) return { ...robot, carrying: false, carriedBox: null, delivered: robot.delivered + 1 };
    if (robot.boxes.some(box => box.x === robot.x && box.y === robot.y)) throw new Error('There is already a box here.');
    return { ...robot, carrying: false, boxes: [...robot.boxes, { ...robot.carriedBox, x: robot.x, y: robot.y }] };
  }
  if (step.action === 'point_direction') return { ...robot, direction: ((step.direction % 360) + 360) % 360 };
  if (step.action === 'turn_direction') return { ...robot, direction: (robot.direction + (step.direction === 'left' ? 270 : 90)) % 360 };
  if (step.action !== 'move_forward') throw new Error('Use the commands provided for this task.');
  const next = getNextPosition(robot.x, robot.y, robot.direction);
  const tile = level.cells.find(cell => cell.x === next.x && cell.y === next.y);
  if (!tile || tile.blocked) throw new Error(tile?.blocked ? 'There is an obstacle ahead. Try another route.' : 'The robot went off the path. Check your commands and try again.');
  if (level.items?.some(i => i.kind === 'dynamite' && i.x === next.x && i.y === next.y)) throw new Error('The robot stepped on dynamite. Check the sensor before moving.');
  return { ...robot, ...next, ...(robot.revealed ? { revealed: [...new Set([...robot.revealed, `${next.x},${next.y}`])] } : {}) };
}
