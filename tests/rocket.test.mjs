import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { initialExcursionRobot, isExcursionComplete, stepExcursion } from '../src/components/BlockGame/GameEngine/excursionSimulation.js';
import { compileProgram } from '../src/components/BlockGame/GameEngine/gameInterpreter.js';
const levels=JSON.parse(readFileSync(new URL('../src/components/BlockGame/levels/rocketReference.json',import.meta.url)));
const routes=JSON.parse(readFileSync(new URL('./rocket-routes.json',import.meta.url)));
const step=(level,robot,c)=>stepExcursion(level,robot,c==='F'?{action:'move_forward'}:c==='T'?{action:'take_cargo'}:c==='P'?{action:'put_cargo'}:{action:'turn_direction',direction:c==='L'?'left':'right'});
for(const level of levels.slice(0,13)) test(`rocket task ${level.number} delivers every source box`,()=>{
 const original=JSON.stringify(level);
 const result=[...routes[level.number]].reduce((r,c)=>step(level,r,c),initialExcursionRobot(level));
 assert(isExcursionComplete(level,result));assert.equal(result.delivered,level.cargo.length);assert.equal(result.carrying,false);assert.equal(JSON.stringify(level),original);
});
test('cargo requires an actual box and only one box can be carried',()=>{
 const level=levels[0],start=initialExcursionRobot(level);
 assert.throws(()=>step(level,start,'T'),/no cargo/);assert.throws(()=>step(level,start,'P'),/not carrying/);
 const loaded=[...'FFT'].reduce((r,c)=>step(level,r,c),start);
 assert(!isExcursionComplete(level,loaded));assert.throws(()=>step(level,loaded,'T'),/one box/);
 const dropped=step(level,loaded,'P');assert.equal(dropped.boxes.length,1);assert.equal(dropped.delivered,0);assert(!isExcursionComplete(level,dropped));
});
test('nested loop program picks up and delivers a box on task one',()=>{
 const loop=(id,times)=>({id,type:'repeat',params:{times},children:[{id:id+'f',type:'move_forward'}]});
 const blocks=[{id:'start',type:'start_hat'},loop('walk1',2),{id:'take',type:'take_cargo'},loop('walk2',2),{id:'put',type:'put_cargo'}];
 const result=compileProgram(blocks).reduce((r,s)=>stepExcursion(levels[0],r,s),initialExcursionRobot(levels[0]));
 assert(isExcursionComplete(levels[0],result));
});
test('all original winter images and feedback position exist',()=>{
 assert.equal(levels.length,14);assert.equal(levels[13].type,'rating');
 for(const l of levels.slice(0,13)) for(const key of ['tiles','pattern','scenery','boxImage','portalImage']) assert(existsSync(new URL('../public'+l[key],import.meta.url)),l[key]);
});
