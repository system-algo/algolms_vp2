import React from 'react';
const OPTIONS={color:['red','green','orange'],shape:['round','long'],size:['large','small'],cargo_color:['green','yellow'],cargo_shape:['cube','round'],path:['ahead','left','right'],finish:['crossed','ahead','left','right'],tank:['under','ahead','left','right'],dynamite:['under','ahead','left','right'],mineral:['under','ahead','left','right'],crystal_color:['red','green','blue']};
const LABELS={color:'color',shape:'shape',size:'size',cargo_color:'cargo color',cargo_shape:'cargo shape',path:'path',finish:'finish line',tank:'gas tank',dynamite:'dynamite',mineral:'mineral',crystal_color:'color',crystal_size:'crystal size'};
const variables=['variable','minerals','A','B','C','D'];
const child=(target,key)=>target?{...target,path:[...(target.path||[]),key]}:undefined;
export default function ReporterInput({value,onChange,accept='boolean',target,onStartDrag,disabled=false,dropTarget,depth=0,toolbox=false}){
 const socket=target?{...target,accept}:undefined;
 const selected=dropTarget?.position==='input'&&socket&&JSON.stringify(dropTarget.input)===JSON.stringify(socket);
 const kind=typeof value==='number'?'number':value?.kind;
 const input=(key,type)=> <ReporterInput value={value?.[key]} onChange={v=>onChange?.({...value,[key]:v})} accept={type} target={child(target,key)} onStartDrag={onStartDrag} disabled={disabled} dropTarget={dropTarget} depth={depth+1} toolbox={toolbox}/>;
 function drag(e){
  if(disabled||!socket||value===null||value===undefined||e.target.closest('select,input,button'))return;
  // A grip detaches the expression without moving its surrounding command.
  if(e.target.closest('[data-reporter-grip]')){e.stopPropagation();onStartDrag?.({type:accept==='boolean'?'condition_expression':'number_expression',params:{expression:value},sourceInput:socket},e);}
 }
 return <span className={`reporter-input reporter-${accept} ${selected?'reporter-drop-active':''} ${!kind?'reporter-empty':''}`} data-reporter-target={socket?JSON.stringify(socket):undefined} onPointerDown={e=>{if(toolbox&&!e.target.closest('select,input,button'))return;e.stopPropagation();drag(e)}}>
  {target&&kind&&!toolbox&&<span data-reporter-grip="true" className="reporter-grip" title="Drag this expression" aria-label="Drag expression">⠿</span>}
  {!kind&&<span>{accept==='boolean'?'condition':'value'}</span>}
  {kind==='number'&&<input aria-label="Number" type="number" value={value} disabled={disabled} onChange={e=>onChange?.(Number(e.target.value))}/>}
  {OPTIONS[kind]&&<><select aria-label={`${LABELS[kind]} value`} value={value.value} disabled={disabled} onChange={e=>onChange?.({...value,value:e.target.value})}>{OPTIONS[kind].map(o=><option key={o}>{o}</option>)}</select><span>{LABELS[kind]}</span></>}
  {['and','or','not'].includes(kind)&&<>{input('a','boolean')}<span>{kind}</span>{kind!=='not'&&input('b','boolean')}</>}
  {kind==='value_compare'&&<>{input('a','number')}<select aria-label="Comparison" value={value.op} disabled={disabled} onChange={e=>onChange?.({...value,op:e.target.value})}>{['=','<','>'].map(o=><option key={o}>{o}</option>)}</select>{input('b','number')}</>}
  {kind==='arithmetic'&&<>{input('a','number')}<select aria-label="Operator" value={value.op} disabled={disabled} onChange={e=>onChange?.({...value,op:e.target.value})}><option>+</option><option>-</option></select>{input('b','number')}</>}
  {kind==='variable'&&<select aria-label="Read variable" value={value.name} disabled={disabled} onChange={e=>onChange?.({...value,name:e.target.value})}>{variables.map(v=><option key={v}>{v}</option>)}</select>}
  {kind==='crystal_size'&&<span>crystal size</span>}
  {kind==='coordinate'&&<select aria-label="Coordinate value" value={value.axis} disabled={disabled} onChange={e=>onChange?.({...value,axis:e.target.value})}><option>x</option><option>y</option></select>}
  {kind==='compare'&&<><select aria-label="Coordinate" value={value.axis||'x'} disabled={disabled} onChange={e=>onChange?.({...value,axis:e.target.value})}><option>x</option><option>y</option></select><select aria-label="Comparison" value={value.op||'>'} disabled={disabled} onChange={e=>onChange?.({...value,op:e.target.value})}><option>{'>'}</option><option>{'<'}</option></select><select aria-label="Compare against" value={value.rhsAxis||'number'} disabled={disabled} onChange={e=>onChange?.({...value,rhsAxis:e.target.value==='number'?null:e.target.value})}><option value="number">number</option><option>x</option><option>y</option></select>{!value.rhsAxis&&<input aria-label="Coordinate boundary" type="number" value={value.value??0} disabled={disabled} onChange={e=>onChange?.({...value,value:Number(e.target.value)})}/>}</>}
  {target&&kind&&!disabled&&<button className="reporter-clear" type="button" aria-label="Remove expression" title="Remove expression" onClick={()=>onChange?.(null)}>×</button>}
 </span>;
}
