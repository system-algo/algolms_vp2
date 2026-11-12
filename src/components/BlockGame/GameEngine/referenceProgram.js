import { compileProgram, getNextPosition } from './gameInterpreter.js';
export function evaluateCondition(c, level, state) {
  if (!c) return false;
  if(c.kind==='and') return evaluateCondition(c.a,level,state)&&evaluateCondition(c.b,level,state);
  if(c.kind==='or') return evaluateCondition(c.a,level,state)||evaluateCondition(c.b,level,state);
  if(c.kind==='not') return !evaluateCondition(c.a,level,state);
  if(c.kind==='cargo_color') return state.carriedBox?.color===c.value;
  if(c.kind==='cargo_shape') return state.carriedBox?.shape===c.value;
  const fruit=level.fruits?.[state.fruitIndex];
  if(['color','shape','size','fruit'].includes(c.kind)) return fruit?.[c.kind=== 'fruit'?'name':c.kind]===c.value;
  const direction=(state.direction+(c.value==='left'?270:c.value==='right'?90:0))%360;
  const next=getNextPosition(state.x,state.y,direction);
  if(c.kind==='path') return level.cells.some(cell=>!cell.blocked&&cell.x===next.x&&cell.y===next.y);
  if(c.kind==='finish') return c.value==='crossed' ? state.x===level.target.x&&state.y===level.target.y : next.x===level.target.x&&next.y===level.target.y;
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
      }else if(['repeat_until','forever','repeat'].includes(b.type)){
        let i=0;
        while(b.type==='repeat'?i<Number(b.params?.times||2):b.type==='forever'||!evaluateCondition(b.params?.condition,level,readState())){
          if(++operations>3000)throw new Error('The loop did not finish. Check its condition.');
          yield {action:'repeat_iteration',blockId:b.id};
          yield* walk(b.children||[],depth+1);
          if(b.type==='forever'&&level.mode==='chef')yield {action:'advance_item',blockId:b.id};
          i++;
        }
      }else if(b.type==='cook')yield {action:'cook',blockId:b.id};
      else for(const step of compileProgram([b]))yield step;
    }
  }
  yield* walk(blocks);
}
