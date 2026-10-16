"""Real model thumbnails, sharing the game's authored materials and silhouettes."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'models/characters.blend'))
scene=bpy.context.scene
OUT=ROOT/'models/thumbs';OUT.mkdir(exist_ok=True)
for o in bpy.data.objects:
    if o.type=='MESH' and not o.get('model'):o.hide_render=True
scene.render.film_transparent=True;scene.render.resolution_x=192;scene.render.resolution_y=192
scene.cycles.samples=20
MODELS=['girl','dog','cat','rabbit','fox','tree','cottage']
for model in MODELS:
    bpy.data.objects[model+' · root'].location.x=0
def show(model,variant):
    for name in MODELS:
        bpy.data.collections[name.title()].hide_render=model!=name
        bpy.data.collections[name.title()].hide_viewport=model!=name
    defaults={'base','dress0','shoes0','hair0'}
    if variant:
        prefix=''.join(c for c in variant if not c.isdigit())
        defaults={x for x in defaults if not x.startswith(prefix)}|{variant}
    for col in bpy.data.collections:
        if col.name.startswith(model+' '):col.hide_render=col.name.split(' ',1)[1] not in defaults
for kind,count,center,scale in [('dress',6,1.33,1.8),('shoes',4,.26,.78),('hair',5,2.64,1.65),('dog',1,.78,1.9),('cat',1,.8,2.1),('rabbit',1,1.1,2.6),('fox',1,.8,2.3)]:
    for i in range(count):
        pet=kind in ['dog','cat','rabbit','fox']
        show(kind if pet else 'girl',None if pet else kind+str(i))
        scene.camera.location=(.45,-8,center+1.15)
        scene.camera.rotation_euler=(Vector((0,0,center))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
        scene.camera.data.ortho_scale=scale
        scene.render.filepath=str(OUT/(kind+'-'+str(i)+'.png'))
        bpy.ops.render.render(write_still=True)
