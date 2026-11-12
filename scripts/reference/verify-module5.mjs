import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialExcursionRobot,stepExcursion,isExcursionComplete} from '../../src/components/BlockGame/GameEngine/excursionSimulation.js';
import {referenceProgram,evaluateValue} from '../../src/components/BlockGame/GameEngine/referenceProgram.js';
const read=n=>JSON.parse(fs.readFileSync(`src/components/BlockGame/levels/${n}Reference.json`));
const variable=name=>({kind:'variable',name});
const crystal={kind:'crystal_size'};
const arithmetic=(a,op,b)=>({kind:'arithmetic',a,op,b});
const set=(name,value)=>({type:'set_variable',params:{name,value}});
const send=name=>({type:'send_variable',params:{name}});
const next={type:'next_crystal'};
const when=(condition,children)=>({type:'if_condition',params:{condition},children});
const color=value=>({kind:'crystal_color',value});
const compare=(a,op,b)=>({kind:'value_compare',a,op,b});
const repeat=(times,children)=>({type:'repeat',params:{times},children});
const untilBlue=children=>({type:'repeat_until',params:{condition:color('blue')},children:[...children,next]});
const sum=set('A',arithmetic(variable('A'),'+',crystal));
const execute=(level,program)=>{
 let state=initialExcursionRobot(level),steps=0;
 for(const action of referenceProgram(program,level,()=>state)){
  if(++steps>20000)throw Error('Runaway program');
  state=stepExcursion(level,state,action);
 }
 assert.ok(isExcursionComplete(level,state),`Incomplete ${level.activityName} ${level.number}`);
 return state;
};
function retroProgram(l){
 if(l.goal==='position')return [...Array.from({length:l.goalIndex},()=>next),set('A',arithmetic(crystal,'+',l.addAmount)),send('A')];
 let body=[];
 if(l.goal==='sum')body=[sum];
 if(l.goal==='green_sum')body=[when(color('green'),[sum])];
 if(l.goal==='large_sum')body=[when(compare(crystal,'>',3),[sum])];
 if(l.goal==='max_color_sum')return [set('A',0),set('B',0),untilBlue([when(color('red'),[sum]),when(color('green'),[set('B',arithmetic(variable('B'),'+',crystal))])]),when(compare(variable('B'),'>',variable('A')),[set('A',variable('B'))]),send('A')];
 if(l.goal==='red_count')body=[when(color('red'),[set('A',arithmetic(variable('A'),'+',1))])];
 if(l.goal==='price')body=[when(color('red'),[set('A',arithmetic(variable('A'),'+',3))]),when(color('green'),[set('A',arithmetic(variable('A'),'+',5))])];
 if(l.goal==='product')return [set('A',1),untilBlue([set('B',variable('A')),set('A',0),{type:'repeat_variable',params:{value:crystal},children:[set('A',arithmetic(variable('A'),'+',variable('B')))]}]),send('A')];
 return [set('A',0),untilBlue(body),send('A')];
}
let retro=0;
for(const original of read('retro').filter(l=>l.mode==='retro'))for(const crystals of [undefined,[{size:3,color:'green'},{size:1,color:'red'},{size:2,color:'red'},{size:4,color:'green'},{size:1,color:'blue'}]]){
 const l={...original,...(crystals?{crystals}:{})};
 execute(l,retroProgram(l));
 assert.throws(()=>execute(l,[set('A',-999),send('A')]));
 assert.ok(!isExcursionComplete(l,initialExcursionRobot(l)));retro++;
}
assert.throws(()=>evaluateValue({kind:'arithmetic',op:'*',a:2,b:3},{},{}));
const l=read('retro').find(l=>l.goal==='sum');
assert.throws(()=>execute(l,[{type:'repeat_until',params:{condition:color('blue')},children:[]}]),/loop did not finish/);
console.log(`PASS ${retro} laboratory programs on varied crystal inputs; incorrect/premature sends; unsupported multiplication; runaway loop guard.`);
function route(level,from,to){
 const queue=[{...from,path:[]}],seen=new Set();
 while(queue.length){const p=queue.shift(),key=`${p.x},${p.y}`;if(seen.has(key))continue;seen.add(key);if(p.x===to.x&&p.y===to.y)return p.path;
 for(const [dx,dy,direction] of [[1,0,90],[-1,0,270],[0,-1,0],[0,1,180]])if(level.cells.some(c=>!c.blocked&&c.x===p.x+dx&&c.y===p.y+dy))queue.push({x:p.x+dx,y:p.y+dy,path:[...p.path,{type:'collect_direction',params:{direction}},{type:'move_forward'}]});
 }throw Error(`Unreachable ${level.activityName} ${level.number}`);
}
let minerals=0,martian=0;
for(const name of ['mineral','martian'])for(const level of read(name).filter(l=>l.minerals)){
 let p={...level.start},remaining=level.targetMinerals||level.minerals.reduce((n,m)=>n+m.amount,0),program=[];
 for(const m of level.minerals){if(!remaining)break;program.push(...route(level,p,m));p=m;const take=Math.min(remaining,m.amount);program.push(repeat(take,[{type:'mine'}]));remaining-=take;}
 if(level.target)program.push(...route(level,p,level.target));
 assert.equal(remaining,0);execute(level,program);assert.ok(!isExcursionComplete(level,initialExcursionRobot(level)));
 if(name==='mineral')minerals++;else martian++;
}
const first=read('martian').find(l=>l.number===2);
const repaired=structuredClone(first.starter);repaired[0].params.value=3;execute(first,repaired);
assert.throws(()=>execute(first,first.starter));
console.log(`PASS ${minerals} exact-count mineral routes; ${martian} Martian boards; corrected/incorrect starter; destination-only task.`);
// Verify constrained exercises using the intended nested-variable programs.
const commandCount=(await import('../../src/components/BlockGame/BlockWorkspace/blockDefinitions.js')).countCommands;
const mv={type:'move_forward'},mine={type:'mine'},right={type:'turn_direction',params:{direction:'right'}};
const rv=children=>({type:'repeat_variable',params:{value:variable('variable')},children});
const add=n=>({type:'add_variable',params:{name:'variable',value:n}});
const constrained={
 6:[set('variable',1),repeat(4,[rv([mv]),mine,add(1)])],
 7:[set('variable',1),repeat(3,[repeat(2,[mv]),rv([mine]),add(1)])],
 10:[set('variable',3),repeat(3,[mv,mv,right,rv([mv]),mine,right,right,rv([mv]),right])],
};
for(const [number,program]of Object.entries(constrained)){
 const level=read('martian').find(l=>l.number===Number(number));assert.ok(commandCount(program)<=level.maxCommands);execute(level,program);
}
console.log('PASS three Martian programs within original command caps.');
