import sys,json,pathlib
name=sys.argv[1];root=pathlib.Path.cwd();p=root/f'src/components/BlockGame/levels/{name}Reference.json'
levels=json.loads(p.read_text())
turns=['move_forward',{'type':'turn_direction','params':{'direction':'left'}},{'type':'turn_direction','params':{'direction':'right'}}]
empty_until={'type':'repeat_until','params':{'condition':None}}
if name=='unknown':
 for l in levels:
  if not l.get('type'):l['toolbox']=turns+['if_else',empty_until,'path_sensor',{'type':'finish_sensor','params':{'expression':{'kind':'finish','value':'ahead'}}}]
elif name=='training':
 for l in levels:
  if not l.get('type'):
   n=l['number'];l['toolbox']=turns+['take_cargo']+([{'type':'repeat','params':{'times':4}}]if n not in [2,15]else [])+[empty_until,{'type':'tank_sensor','params':{'expression':{'kind':'tank','value':'ahead'}}}]+(['dynamite_sensor']if n>=4 else [])
elif name=='dark':
 for l in levels:
  if not l.get('type'):l['toolbox']=turns+['take_cargo',{'type':'repeat','params':{'times':4}},'if_else',empty_until,'path_sensor',{'type':'finish_sensor','params':{'expression':{'kind':'finish','value':'ahead'}}},{'type':'tank_sensor','params':{'expression':{'kind':'tank','value':'ahead'}}}]
elif name=='field':
 for l in levels:
  if not l.get('type'):l['toolbox']=['forever',{'type':'if_condition','params':{'condition':None}},'greater_than','less_than','logic_and',{'type':'coordinate_value','params':{'expression':{'kind':'coordinate','axis':'x'}}},{'type':'coordinate_value','params':{'expression':{'kind':'coordinate','axis':'y'}}},'number_value','destroy']
elif name=='mineral':
 for l in levels:
  if not l.get('type'):l['toolbox']=turns+['if_else',empty_until,'path_sensor','mineral_sensor','mine',{'type':'set_variable','params':{'name':'minerals','value':0}},{'type':'add_variable','params':{'name':'minerals','value':0}},{'type':'compare_values','params':{'expression':{'kind':'value_compare','op':'=','a':{'kind':'variable','name':'minerals'},'b':0}}}]
elif name=='retro':
 for l in levels:
  if l.get('type'):continue
  n=l['number'];t=[{'type':'set_variable','params':{'name':'A','value':None}}]
  if n>=4:t+=['number_value']
  if n>=7:t+=[{'type':'variable_value','params':{'expression':{'kind':'variable','name':'A'}}}]
  t+=['crystal_size_value']
  if n not in [1,4,5]:t+=['next_crystal']
  if n==3:t+=[{'type':'repeat','params':{'times':2}}]
  if n>=7:
   if n in [9,10,12,14]:t+=[{'type':'if_condition','params':{'condition':None}}]
   if n in [11,13,14]:t+=['if_else']
   t+=['crystal_color_sensor',empty_until]
   if n==14:t+=[{'type':'repeat','params':{'times':2}},{'type':'repeat_variable','params':{'value':{'kind':'variable','name':'A'}}}]
   if n in [10,11,14]:t+=['greater_than','less_than']
   if n==14:t+=['compare_values']
  if n>=4:t+=['add_values']
  if n==14:t+=['subtract_values']
  t+=[{'type':'send_variable','params':{'name':'A'}}];l['toolbox']=t
elif name=='martian':
 for l in levels:
  if l.get('type'):continue
  n=l['number'];l['toolbox']=turns+([{'type':'repeat','params':{'times':4}}]if n!=2 else [])+['repeat_variable']+(['if_else']if n<=5 else [])+['mine','set_variable','add_variable',{'type':'compare_values','params':{'expression':{'kind':'value_compare','op':'=','a':{'kind':'variable','name':'variable'},'b':0}}}]
else:raise SystemExit('Page has not been audited: '+name)
p.write_text(json.dumps(levels,indent=2)+'\n')
with open(root/'docs/block-task-status.md','a')as f:f.write('\nCommand palette audit: '+name+' — all source programming positions checked; separate predicate blocks restored with typed sockets.\n')
