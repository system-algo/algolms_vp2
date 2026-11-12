import json,pathlib,sys
course=pathlib.Path('public/courses/VP2');module,page,title,reference=sys.argv[1:]
levels=json.loads(pathlib.Path(reference).read_text())
for alias in ['VP2','VP']:
 pageid=page.replace('VP2_',alias+'_',1);base=course/module/'pages'/pageid;base.mkdir(parents=True,exist_ok=True)
 for name in ['manifest.json','page.instance.json']:
  p=base/name;d=json.loads(p.read_text()) if p.exists() else {'schemaVersion':2,'id':pageid}
  d.update(title=title,taskCount=len(levels),type='block-game-task',level_type='block_game',activityType='block_game');d['tasks']=[]
  for l in levels:
   n=l['number'];id=f'{pageid}_{n}';d['tasks'].append(dict(id=id,taskId=id,position=n,level_position=n,levelPosition=n,title=f'{title} - {n}',instruction=l['hint'],activityType='block_game',level_type='block_game',selectedType='block_game',states=[dict(id=id+'_state_1',stateId=id+'_state_1',position=1,type='block_game',selectedType='block_game')]))
  p.write_text(json.dumps(d,indent=2)+'\n')
p=course/'index.json';d=json.loads(p.read_text())
for m in d['lessons']:
 for pageobj in m.get('pages',[]):
  if pageobj['id']==page:pageobj.update(title=title,taskCount=len(levels))
p.write_text(json.dumps(d,indent=2)+'\n')
