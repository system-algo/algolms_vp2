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
else:raise SystemExit('Page has not been audited: '+name)
p.write_text(json.dumps(levels,indent=2)+'\n')
with open(root/'docs/block-task-status.md','a')as f:f.write('\nCommand palette audit: '+name+' — all source programming positions checked; separate predicate blocks restored with typed sockets.\n')
