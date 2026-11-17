import test from 'node:test';
import assert from 'node:assert/strict';
import { referenceProgram } from '../src/components/BlockGame/GameEngine/referenceProgram.js';
import { expressionColor } from '../src/components/BlockGame/BlockWorkspace/expressionStyle.js';

test('condition trace precedes cooking and false branches skip cooking', () => {
  const state={fruitIndex:0};
  const level={mode:'chef',fruits:[{color:'orange'},{color:'green'}]};
  const program=[{id:'if',type:'if_condition',params:{condition:{kind:'color',value:'orange'}},children:[{id:'cook',type:'cook'}]}];
  const steps=[...referenceProgram(program,level,()=>state)];
  assert.deepEqual(steps,[{action:'repeat_iteration',blockId:'if',conditionResult:true},{action:'cook',blockId:'cook'}]);
  state.fruitIndex=1;
  assert.deepEqual([...referenceProgram(program,level,()=>state)],[{action:'repeat_iteration',blockId:'if',conditionResult:false}]);
});
test('nested conditions retain sensor and logical operator colors',()=>{
  assert.equal(expressionColor({kind:'color',value:'orange'}),'#5b80a5');
  assert.equal(expressionColor({kind:'not',a:{kind:'color'}}),'#5b80a5');
  assert.equal(expressionColor({kind:'and',a:{kind:'color'},b:{kind:'size'}}),'#5ba55b');
});
