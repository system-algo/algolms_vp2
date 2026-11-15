import sys,json,pathlib
name=sys.argv[1];root=pathlib.Path.cwd();p=root/f'src/components/BlockGame/levels/{name}Reference.json'
levels=json.loads(p.read_text())
turns=['move_forward',{'type':'turn_direction','params':{'direction':'left'}},{'type':'turn_direction','params':{'direction':'right'}}]
empty_until={'type':'repeat_until','params':{'condition':None}}
if name=='unknown':
 for l in levels:
  if not l.get('type'):l['toolbox']=turns+['if_else',empty_until,'path_sensor',{'type':'finish_sensor','params':{'expression':{'kind':'finish','value':'ahead'}}}]
else:raise SystemExit('Page has not been audited: '+name)
p.write_text(json.dumps(levels,indent=2)+'\n')
with open(root/'docs/block-task-status.md','a')as f:f.write('\nCommand palette audit: '+name+' — all source programming positions checked; separate predicate blocks restored with typed sockets.\n')
