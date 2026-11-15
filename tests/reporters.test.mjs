import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlockInstance} from '../src/components/BlockGame/BlockWorkspace/blockDefinitions.js';
import {connectReporter,canConnect,readInputTree} from '../src/components/BlockGame/BlockWorkspace/reporterTree.js';
import {reporterValue} from '../src/components/BlockGame/BlockWorkspace/reporterBlocks.js';
import {evaluateCondition,evaluateValue,referenceProgram} from '../src/components/BlockGame/GameEngine/referenceProgram.js';
import {initialExcursionRobot,stepExcursion,isExcursionComplete} from '../src/components/BlockGame/GameEngine/excursionSimulation.js';
const hole=(blockId,param,path=[],accept='boolean')=>({blockId,param,path,accept});
const drag=(type,params={})=>({...createBlockInstance(type,params),isFromToolbox:true});
test('all nine Chef commands are present in every programming position',()=>{
 const levels=JSON.parse(fs.readFileSync('src/components/BlockGame/levels/chefReference.json'));
 for(const level of levels.filter(l=>l.mode==='chef'))assert.deepEqual(level.toolbox.map(x=>typeof x==='string'?x:x.type),['forever','if_condition','logic_and','logic_or','logic_not','color_sensor','shape_sensor','size_sensor','cook']);
});
test('drag logical and, not and sensors into typed nested condition sockets, then execute Chef',()=>{
 const iff=createBlockInstance('if_condition',{condition:null});iff.children=[createBlockInstance('cook')];
 const forever=createBlockInstance('forever');forever.children=[iff];let blocks=[forever];
 blocks=connectReporter(blocks,drag('logic_and'),hole(iff.id,'condition'));
 blocks=connectReporter(blocks,drag('color_sensor'),hole(iff.id,'condition',['a']));
 blocks=connectReporter(blocks,drag('logic_not'),hole(iff.id,'condition',['b']));
 blocks=connectReporter(blocks,drag('shape_sensor',{expression:{kind:'shape',value:'long'}}),hole(iff.id,'condition',['b','a']));
 const condition=readInputTree(blocks,hole(iff.id,'condition'));
 const level={mode:'chef',fruits:[{name:'pumpkin',color:'red',shape:'round'},{name:'carrot',color:'red',shape:'long'},{name:'apple',color:'green',shape:'round'}],targets:['pumpkin']};
 assert.equal(evaluateCondition(condition,level,{fruitIndex:0}),true);
 assert.equal(evaluateCondition(condition,level,{fruitIndex:1}),false);
 assert.equal(evaluateCondition(condition,level,{fruitIndex:2}),false);
 let state=initialExcursionRobot(level);for(const action of referenceProgram(blocks,level,()=>state)){if(isExcursionComplete(level,state))break;state=stepExcursion(level,state,action);}
 assert.ok(isExcursionComplete(level,state));assert.deepEqual(state.cooked,[0]);
});
test('incompatible types and cycles are rejected without deleting expressions',()=>{
 const iff=createBlockInstance('if_condition',{condition:{kind:'and',a:{kind:'color',value:'red'},b:null}});const blocks=[iff];
 assert.strictEqual(connectReporter(blocks,drag('number_value'),hole(iff.id,'condition')),blocks);
 const moving={...createBlockInstance('condition_expression',{expression:iff.params.condition}),sourceInput:hole(iff.id,'condition')};
 assert.equal(canConnect(blocks,moving,hole(iff.id,'condition',['b'])),false);
 assert.strictEqual(connectReporter(blocks,moving,hole(iff.id,'condition',['b'])),blocks);
});
test('a connected sensor can be detached and moved between sockets',()=>{
 const iff=createBlockInstance('if_condition',{condition:{kind:'and',a:{kind:'size',value:'large'},b:null}});let blocks=[iff];
 const moving={...createBlockInstance('condition_expression',{expression:iff.params.condition.a}),sourceInput:hole(iff.id,'condition',['a'])};
 blocks=connectReporter(blocks,moving,hole(iff.id,'condition',['b']));
 assert.equal(blocks[0].params.condition.a,null);assert.deepEqual(blocks[0].params.condition.b,{kind:'size',value:'large'});
});
test('numeric reporters connect into nested arithmetic and are evaluated live',()=>{
 const set=createBlockInstance('set_variable',{name:'A',value:0});let blocks=[set];
 blocks=connectReporter(blocks,drag('add_values'),hole(set.id,'value',[],'number'));
 blocks=connectReporter(blocks,drag('crystal_size_value'),hole(set.id,'value',['a'],'number'));
 blocks=connectReporter(blocks,drag('number_value',{expression:3}),hole(set.id,'value',['b'],'number'));
 assert.equal(evaluateValue(blocks[0].params.value,{},{crystals:[{size:4}],crystalIndex:0}),7);
});
test('empty nested sockets fail instead of silently passing not or short-circuit logic',()=>{
 assert.throws(()=>evaluateCondition({kind:'not',a:null},{},{}),/socket/);
 assert.throws(()=>evaluateCondition({kind:'and',a:{kind:'color',value:'red'},b:null},{fruits:[{color:'green'}]},{fruitIndex:0}),/socket/);
 assert.throws(()=>evaluateValue({kind:'arithmetic',op:'+',a:1,b:null},{},{}),/socket/);
});
test('detached reporters do not execute as movement commands',()=>{
 assert.deepEqual([...referenceProgram([createBlockInstance('color_sensor')],{},()=>({}))],[]);
 assert.equal(reporterValue(createBlockInstance('number_value',{expression:0})),0);
});
