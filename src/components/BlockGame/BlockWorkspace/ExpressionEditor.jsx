import React from 'react';
// Expressions are plain data; never execute learner text as JavaScript.
export default function ExpressionEditor({value=0,onChange,disabled=false,depth=0}) {
  const kind=typeof value==='number'?'number':value.kind;
  const update=kind=>onChange(kind==='number'?0:kind==='variable'?{kind,name:'variable'}:kind==='arithmetic'?{kind,op:'+',a:0,b:1}:{kind});
  return <span className="reference-expression" onPointerDown={e=>e.stopPropagation()}>
    <select aria-label="Value type" value={kind} disabled={disabled} onChange={e=>update(e.target.value)}>
      <option value="number">number</option><option value="variable">variable</option><option value="crystal_size">crystal size</option>{depth<4&&<option value="arithmetic">calculation</option>}
    </select>
    {kind==='number'&&<input aria-label="Number" type="number" value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))} style={{width:58}}/>}
    {kind==='variable'&&<select aria-label="Read variable" value={value.name} disabled={disabled} onChange={e=>onChange({...value,name:e.target.value})}>{['variable','minerals','A','B','C','D'].map(v=><option key={v}>{v}</option>)}</select>}
    {kind==='arithmetic'&&<><ExpressionEditor value={value.a} onChange={a=>onChange({...value,a})} disabled={disabled} depth={depth+1}/><select aria-label="Operator" value={value.op} disabled={disabled} onChange={e=>onChange({...value,op:e.target.value})}><option>+</option><option>-</option></select><ExpressionEditor value={value.b} onChange={b=>onChange({...value,b})} disabled={disabled} depth={depth+1}/></>}
  </span>;
}
