import React from 'react';
const defaults = { cargo_color: 'green', cargo_shape: 'cube', color: 'red', shape: 'round', size: 'large', path: 'ahead', finish: 'crossed', fruit: 'pumpkin' };
const options = { cargo_color: ['green','yellow'], cargo_shape: ['cube','round'], color: ['red','green','orange'], shape: ['round','long'], size: ['large','small'], path: ['ahead','left','right'], finish: ['crossed','ahead','left','right'], fruit: ['pumpkin','watermelon','zucchini','carrot','tomato','cucumber','pepper','apple','orange'] };
export default function ConditionEditor({ value = {kind:'cargo_color',value:'green'}, onChange, disabled = false }) {
  const changeKind = kind => onChange({kind,...(defaults[kind] ? {value:defaults[kind]} : {a:{kind:'color',value:'red'},b:{kind:'shape',value:'round'}})});
  return <span className="reference-condition" onPointerDown={e=>e.stopPropagation()}>
    <select aria-label="Condition" value={value.kind} disabled={disabled} onChange={e=>changeKind(e.target.value)}>{['cargo_color','cargo_shape','color','shape','size','path','finish','and','or','not'].map(k=><option key={k} value={k}>{k.replaceAll('_',' ')}</option>)}</select>
    {options[value.kind] && <select aria-label="Condition value" value={value.value} disabled={disabled} onChange={e=>onChange({...value,value:e.target.value})}>{options[value.kind].map(o=><option key={o}>{o}</option>)}</select>}
    {['and','or','not'].includes(value.kind) && <><ConditionEditor value={value.a} onChange={a=>onChange({...value,a})} disabled={disabled}/>{value.kind!=='not' && <ConditionEditor value={value.b} onChange={b=>onChange({...value,b})} disabled={disabled}/>}</>}
  </span>;
}
