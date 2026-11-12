import { compileProgram, getNextPosition } from './gameInterpreter.js';
export function evaluateValue(value, level, state) {
  if(typeof value==='number') {if(!Number.isFinite(value))throw new Error('Use a finite number.');return value;}
  if(value?.kind==='variable')return state.variables?.[value.name] ?? 0;
  if(value?.kind==='crystal_size')return state.crystals?.[state.crystalIndex]?.size ?? 0;
  if(value?.kind==='arithmetic'){
    const a=evaluateValue(value.a,level,state),b=evaluateValue(value.b,level,state);
    if(!['+','-'].includes(value.op))throw new Error('Choose addition or subtraction.');
    const result=value.op==='+'?a+b:a-b;
    if(!Number.isFinite(result)||Math.abs(result)>1e12)throw new Error('The calculated value is too large.');
    return result;
  }
  throw new Error('Choose a value for this command.');
}
export function evaluateCondition(c, level, state) {
  if (!c) return false;
  if(c.kind==='value_compare'){const a=evaluateValue(c.a,level,state),b=evaluateValue(c.b,level,state);return c.op==='='?a===b:c.op==='<'?a<b:a>b;}
  if(c.kind==='crystal_color')return state.crystals?.[state.crystalIndex]?.color===c.value;
  if(c.kind==='and') return evaluateCondition(c.a,level,state)&&evaluateCondition(c.b,level,state);
  if(c.kind==='or') return evaluateCondition(c.a,level,state)||evaluateCondition(c.b,level,state);
  if(c.kind==='not') return !evaluateCondition(c.a,level,state);
  if(c.kind==='cargo_color') return state.carriedBox?.color===c.value;
  if(c.kind==='cargo_shape') return state.carriedBox?.shape===c.value;
  if(c.kind==='compare') {
    const object=level.objects?.[state.fruitIndex];
    if(!object)return false;
    const left=object[c.axis || 'x'];
    const right=c.rhsAxis ? object[c.rhsAxis] : Number(c.value);
    return c.op === '<' ? left < right : left > right;
  }
  const fruit=level.fruits?.[state.fruitIndex];
  if(['color','shape','size','fruit'].includes(c.kind)) return fruit?.[c.kind=== 'fruit'?'name':c.kind]===c.value;
  const direction=(state.direction+(c.value==='left'?270:c.value==='right'?90:0))%360;
  const next=getNextPosition(state.x,state.y,direction);
  if(c.kind==='mineral') {const p=c.value==='under'?state:next;return state.minerals?.some(m=>m.x===p.x&&m.y===p.y&&m.amount>0);}
  if(c.kind==='tank' || c.kind==='dynamite') {
    const position = c.value === 'under' ? state : next;
    const items = c.kind === 'tank' ? state.tanks || [] : (level.items || []).filter(i=>i.kind==='dynamite');
    return items.some(i=>i.x===position.x&&i.y===position.y);
  }
  if(c.kind==='path') return level.cells.some(cell=>!cell.blocked&&cell.x===next.x&&cell.y===next.y);
  if(c.kind==='finish') return !!level.target && (c.value==='crossed' ? state.x===level.target.x&&state.y===level.target.y : next.x===level.target.x&&next.y===level.target.y);
  if(c.kind==='region') return state.x>=c.minX&&state.x<=c.maxX&&state.y>=c.minY&&state.y<=c.maxY;
  return false;
}
export function* referenceProgram(blocks, level, readState) {
  let operations=0;
  function* walk(list,depth=0){
    if(depth>12)throw new Error('Too many nested blocks.');
    for(const b of list){
      if(++operations>3000)throw new Error('The program did not finish. Check your loop conditions.');
      if(b.type==='start_hat')continue;
      if(b.type==='if_else'){
        yield {action:'repeat_iteration',blockId:b.id};
        const [yes,no]=b.children||[];
        yield* walk(evaluateCondition(yes?.params?.condition,level,readState())?yes?.children||[]:no?.children||[],depth+1);
      }else if(b.type==='if_condition'||b.type==='branch_if'){
        yield {action:'repeat_iteration',blockId:b.id};
        if(evaluateCondition(b.params?.condition,level,readState()))yield* walk(b.children||[],depth+1);
      }else if(['repeat_until','forever','repeat','repeat_variable'].includes(b.type)){
        const times=b.type==='repeat_variable'?evaluateValue(b.params?.value,level,readState()):Number(b.params?.times ?? 2);
        if(['repeat','repeat_variable'].includes(b.type)&&(!Number.isInteger(times)||times<0||times>1000))throw new Error('Repeat needs a whole number from 0 to 1000.');
        let i=0;
        while(['repeat','repeat_variable'].includes(b.type)?i<times:b.type==='forever'||!evaluateCondition(b.params?.condition,level,readState())){
          if(++operations>3000)throw new Error('The loop did not finish. Check its condition.');
          yield {action:'repeat_iteration',blockId:b.id};
          yield* walk(b.children||[],depth+1);
          if(b.type==='forever'&&['chef','field'].includes(level.mode))yield {action:'advance_item',blockId:b.id};
          i++;
        }
      }else if(['set_variable','add_variable','send_variable','mine','next_crystal'].includes(b.type)){
        yield {action:b.type,name:b.params?.name||'variable',value:b.type==='set_variable'||b.type==='add_variable'?evaluateValue(b.params?.value ?? 0,level,readState()):undefined,blockId:b.id};
      }else if(b.type==='cook')yield {action:'cook',blockId:b.id};
      else for(const step of compileProgram([b]))yield step;
    }
  }
  yield* walk(blocks);
}
