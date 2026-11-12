import fs from 'node:fs';
import assert from 'node:assert/strict';
import {initialExcursionRobot,stepExcursion,isExcursionComplete} from '../../src/components/BlockGame/GameEngine/excursionSimulation.js';
import {referenceProgram,evaluateCondition} from '../../src/components/BlockGame/GameEngine/referenceProgram.js';
const read=name=>JSON.parse(fs.readFileSync(`src/components/BlockGame/levels/${name}Reference.json`));
function execute(level,program){let state=initialExcursionRobot(level);const iterator=referenceProgram(program,level,()=>state);for(let i=0;i<15000;i++){if(isExcursionComplete(level,state))return state;const next=iterator.next();if(next.done)break;state=stepExcursion(level,state,next.value);}assert.ok(isExcursionComplete(level,state),`Incomplete ${level.activityName} ${level.number}`);return state;}
const or=conditions=>conditions.reduce((a,b)=>a?{kind:'or',a,b}:b,null);
const and=conditions=>conditions.reduce((a,b)=>a?{kind:'and',a,b}:b,null);
let chef=0,field=0,maze=0;
for(const l of read('chef').filter(l=>l.mode==='chef')){
 const condition=or([...new Set(l.targets)].map(name=>{const f=l.fruits.find(f=>f.name===name);assert.ok(f,`Missing ingredient ${name}`);return and(['color','shape','size'].map(kind=>({kind,value:f[kind]})));}));
 execute(l,[{type:'forever',children:[{type:'if_condition',params:{condition},children:[{type:'cook'}]}]}]);
 assert.throws(()=>execute(l,[{type:'forever',children:[{type:'cook'}]}]));chef++;
}
for(const l of read('field').filter(l=>l.mode==='field')){
 const condition=or(l.objects.filter(o=>o.kind==='bad').map(o=>and(['x','y'].flatMap(axis=>[{kind:'compare',axis,op:'>',value:o[axis]-1},{kind:'compare',axis,op:'<',value:o[axis]+1}]))));
 execute(l,[{type:'forever',children:[{type:'if_condition',params:{condition},children:[{type:'destroy'}]}]}]);
 assert.throws(()=>execute(l,[{type:'forever',children:[{type:'destroy'}]}]));field++;
}
for(const name of ['unknown','training','dark'])for(const l of read(name).filter(l=>l.cells)){
 const state=initialExcursionRobot(l),seen=new Set([`${state.x},${state.y}`]),queue=[state];
 while(queue.length){const p=queue.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,k=`${x},${y}`;if(!seen.has(k)&&l.cells.some(c=>!c.blocked&&c.x===x&&c.y===y)&&!l.items?.some(i=>i.kind==='dynamite'&&i.x===x&&i.y===y)){seen.add(k);queue.push({x,y});}}}
 for(const item of [l.target,...(state.tanks||[])].filter(Boolean))assert.ok(seen.has(`${item.x},${item.y}`),`Unreachable ${name} ${l.number}: ${item.x},${item.y}`);
 if(name==='training')assert.equal(state.tanks.length,l.items.filter(i=>i.kind==='tank').length+new Set(l.items.filter(i=>i.kind==='hidden').map(i=>i.group)).size);
 maze++;
}
assert.equal(evaluateCondition({kind:'compare',axis:'x',op:'<',rhsAxis:'y'},{objects:[{x:-30,y:30}]},{fruitIndex:0}),true);
console.log(`PASS: ${chef} Chef programs and incorrect recipes; ${field} field programs and healthy-plant protection; ${maze} maze/tank reachability checks; x/y comparison.`);
