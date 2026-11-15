// Typed, serializable expression blocks shared by the toolbox, sockets and runner.
export const REPORTERS = {
  logic_and: {label:'and',output:'boolean',color:'#5ba55b',value:{kind:'and',a:null,b:null}},
  logic_or: {label:'or',output:'boolean',color:'#5ba55b',value:{kind:'or',a:null,b:null}},
  logic_not: {label:'not',output:'boolean',color:'#5b80a5',value:{kind:'not',a:null}},
  color_sensor: {label:'color',output:'boolean',value:{kind:'color',value:'red'}},
  shape_sensor: {label:'shape',output:'boolean',value:{kind:'shape',value:'round'}},
  size_sensor: {label:'size',output:'boolean',value:{kind:'size',value:'large'}},
  cargo_color_sensor: {label:'cargo color',output:'boolean',value:{kind:'cargo_color',value:'green'}},
  cargo_shape_sensor: {label:'cargo shape',output:'boolean',value:{kind:'cargo_shape',value:'cube'}},
  path_sensor: {label:'path',output:'boolean',value:{kind:'path',value:'ahead'}},
  finish_sensor: {label:'finish line',output:'boolean',value:{kind:'finish',value:'crossed'}},
  tank_sensor: {label:'gas tank',output:'boolean',value:{kind:'tank',value:'under'}},
  dynamite_sensor: {label:'dynamite',output:'boolean',value:{kind:'dynamite',value:'ahead'}},
  mineral_sensor: {label:'mineral',output:'boolean',value:{kind:'mineral',value:'ahead'}},
  crystal_color_sensor: {label:'color',output:'boolean',value:{kind:'crystal_color',value:'red'}},
  compare_values: {label:'=',output:'boolean',value:{kind:'value_compare',op:'=',a:0,b:0}},
  greater_than: {label:'>',output:'boolean',value:{kind:'value_compare',op:'>',a:null,b:null}},
  less_than: {label:'<',output:'boolean',value:{kind:'value_compare',op:'<',a:null,b:null}},
  coordinate_compare: {label:'coordinate comparison',output:'boolean',value:{kind:'compare',axis:'x',op:'>',value:0}},
  number_value: {label:'number',output:'number',value:10},
  variable_value: {label:'variable',output:'number',value:{kind:'variable',name:'variable'}},
  crystal_size_value: {label:'crystal size',output:'number',value:{kind:'crystal_size'}},
  coordinate_value: {label:'coordinate',output:'number',value:{kind:'coordinate',axis:'x'}},
  add_values: {label:'+',output:'number',color:'#5ba55b',value:{kind:'arithmetic',op:'+',a:null,b:null}},
  subtract_values: {label:'−',output:'number',color:'#5ba55b',value:{kind:'arithmetic',op:'-',a:null,b:null}},
};
REPORTERS.condition_expression={label:'condition',output:'boolean',value:null};
REPORTERS.number_expression={label:'value',output:'number',value:null};
export const isReporter = block => !!REPORTERS[block?.type];
export const reporterOutput = value => typeof value==='number'||['variable','crystal_size','coordinate','arithmetic'].includes(value?.kind)?'number':'boolean';
export function reporterValue(block){return structuredClone(block.params?.expression ?? REPORTERS[block.type]?.value ?? null);}
export function inputAt(value,path=[]){return path.reduce((v,key)=>v?.[key],value);}
export function replaceInput(value,path,replacement){
 if(!path.length)return structuredClone(replacement);
 const [key,...rest]=path;
 if(!value || typeof value!=='object')throw new Error('The expression socket no longer exists.');
 return {...value,[key]:replaceInput(value[key],rest,replacement)};
}
export function expressionDepth(value){return value&&typeof value==='object'?1+Math.max(0,...['a','b'].map(k=>expressionDepth(value[k]))):0;}
export function canDropReporter(block,target){return isReporter(block)&&REPORTERS[block.type].output===target?.accept;}
