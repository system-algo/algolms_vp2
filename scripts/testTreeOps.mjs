import assert from 'node:assert';
import { makeBlock, withIds } from '../src/vp/maze/blockDefs.js';
import { detach, insert, removeOne, appendToMain, contains } from '../src/vp/maze/treeOps.js';
import { runProgram, settingsFromConfig } from '../src/vp/maze/mazeEngine.js';
let root = makeBlock('maze_start');
const rep = makeBlock('maze_repeat_internal', { TIMES: '3' });
const mv = makeBlock('maze_moveForward');
root = appendToMain(root, rep);
root = insert(root, { parentId: rep.id, kind: 'stmt', name: 'DO' }, mv);
assert(root.next.statements.DO.id === mv.id);
const mv2 = makeBlock('maze_moveForward');
root = insert(root, { parentId: rep.id, kind: 'stmt', name: 'DO' }, mv2); // inserted before existing
assert(root.next.statements.DO.id === mv2.id && root.next.statements.DO.next.id === mv.id);
const { root: r2, stack } = detach(root, mv.id);
assert(stack.id === mv.id && !contains(r2, mv.id));
assert(insert(r2, { parentId: mv.id, kind: 'next' }, mv2) === null);
const r3 = removeOne(root, mv2.id); assert(r3.next.statements.DO.id === mv.id);
// run: straight corridor of length 4, east, repeat 3 forward
const cfg = { map: [[2,1,1,3]], startDirection: 'EAST', commands: ['repeat'] };
const res = runProgram(settingsFromConfig(cfg), r3.next);
assert(res.done, JSON.stringify(res.error)); 
console.log('treeOps ok', res.steps, res.state.frames.length);
