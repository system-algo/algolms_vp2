import React from 'react';
import ExpressionEditor from './ExpressionEditor.jsx';
const defaults = { mineral:'under', crystal_color:'blue', tank:'under', dynamite:'ahead', cargo_color: 'green', cargo_shape: 'cube', color: 'red', shape: 'round', size: 'large', path: 'ahead', finish: 'crossed', fruit: 'pumpkin' };
const options = { mineral:['under','ahead','left','right'], crystal_color:['red','green','blue'], tank:['under','ahead','left','right'], dynamite:['under','ahead','left','right'], cargo_color: ['green','yellow'], cargo_shape: ['cube','round'], color: ['red','green','orange'], shape: ['round','long'], size: ['large','small'], path: ['ahead','left','right'], finish: ['crossed','ahead','left','right'], fruit: ['pumpkin','watermelon','zucchini','carrot','tomato','cucumber','pepper','apple','orange'] };
export default function ConditionEditor({ value = {kind:'cargo_color',value:'green'}, onChange, disabled = false }) {
  const changeKind = kind => onChange({kind,...(kind === 'value_compare' ? {a:{kind:'variable',name:'minerals'},op:'=',b:5}: {}),...(kind === 'compare' ? {axis:'x',op:'>',value:0} : {}),...(defaults[kind] ? {value:defaults[kind]} : {a:{kind:'color',value:'red'},b:{kind:'shape',value:'round'}})});
  return <span className="reference-condition" onPointerDown={e=>e.stopPropagation()}>
    <select aria-label="Condition" value={value.kind} disabled={disabled} onChange={e=>changeKind(e.target.value)}>{['value_compare','mineral','crystal_color','cargo_color','cargo_shape','color','shape','size','compare','path','finish','tank','dynamite','and','or','not'].map(k=><option key={k} value={k}>{k.replaceAll('_',' ')}</option>)}</select>
    {value.kind === 'value_compare' && <><ExpressionEditor value={value.a} onChange={a=>onChange({...value,a})} disabled={disabled}/><select aria-label="Value comparison" value={value.op} disabled={disabled} onChange={e=>onChange({...value,op:e.target.value})}>{['=','<','>'].map(o=><option key={o}>{o}</option>)}</select><ExpressionEditor value={value.b} onChange={b=>onChange({...value,b})} disabled={disabled}/></>}
    {value.kind === 'compare' && <>
      <select aria-label="Coordinate" value={value.axis || 'x'} disabled={disabled} onChange={e=>onChange({...value,axis:e.target.value})}><option>x</option><option>y</option></select>
      <select aria-label="Comparison" value={value.op || '>'} disabled={disabled} onChange={e=>onChange({...value,op:e.target.value})}><option>{'>'}</option><option>{'<'}</option></select>
      <select aria-label="Compare against" value={value.rhsAxis || 'number'} disabled={disabled} onChange={e=>onChange({...value,rhsAxis:e.target.value==='number'?null:e.target.value})}><option value="number">number</option><option>x</option><option>y</option></select>
      {!value.rhsAxis && <input aria-label="Coordinate boundary" type="number" value={value.value ?? 0} disabled={disabled} onChange={e=>onChange({...value,value:Number(e.target.value)})} style={{width:65}} />}
    </>}
    {options[value.kind] && <select aria-label="Condition value" value={value.value} disabled={disabled} onChange={e=>onChange({...value,value:e.target.value})}>{options[value.kind].map(o=><option key={o}>{o}</option>)}</select>}
    {['and','or','not'].includes(value.kind) && <><ConditionEditor value={value.a} onChange={a=>onChange({...value,a})} disabled={disabled}/>{value.kind!=='not' && <ConditionEditor value={value.b} onChange={b=>onChange({...value,b})} disabled={disabled}/>}</>}
  </span>;
}
