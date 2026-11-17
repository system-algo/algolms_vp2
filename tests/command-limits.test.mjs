import test from 'node:test';
import assert from 'node:assert/strict';
import { countCommands, isWithinCommandLimit } from '../src/components/BlockGame/BlockWorkspace/blockDefinitions.js';
import { readFileSync } from 'node:fs';
const chef = JSON.parse(readFileSync(new URL('../src/components/BlockGame/levels/chefReference.json', import.meta.url)));
const program = [{type:'start_hat'},{type:'forever',children:[{type:'if_condition',params:{condition:{kind:'color',value:'orange'}},children:[{type:'cook'}]}]}];
test('Chef source example uses four blocks including the attached color sensor',()=>{
  const limit=chef.find(l=>l.number===2).maxCommands;
  assert.equal(limit,4);
  assert.equal(countCommands(program),4);
  assert.equal(isWithinCommandLimit(program,limit),true);
  assert.equal(isWithinCommandLimit([...program,{type:'cook'}],limit),false);
});
test('nested logical sensors count equally when attached or detached',()=>{
  const expression={kind:'and',a:{kind:'color',value:'orange'},b:{kind:'not',a:{kind:'size',value:'small'}}};
  assert.equal(countCommands([{type:'logic_and',params:{expression}}]),4);
  assert.equal(countCommands([{type:'if_condition',params:{condition:expression}}]),5);
});
test('if/else structural branches do not double count but their conditions count',()=>{
  assert.equal(countCommands([{type:'if_else',children:[{type:'branch_if',params:{condition:{kind:'path',value:'ahead'}},children:[{type:'move_forward'}]},{type:'branch_else',children:[{type:'turn_direction'}]}]}]),4);
});
test('loop repetitions and dropdown values do not multiply the block budget',()=>{
  const blocks=[{type:'repeat',params:{times:10},children:[{type:'move_forward'}]}];
  assert.equal(countCommands(blocks),2);
  assert.equal(isWithinCommandLimit(blocks,2),true);
  assert.equal(isWithinCommandLimit(blocks,1),false);
  assert.equal(isWithinCommandLimit(blocks,null),true);
  assert.equal(isWithinCommandLimit([],0),true);
  assert.equal(isWithinCommandLimit(blocks,0),false);
});
