"""Re-export tablet geometry from the editable .blend without rebuilding sculptures."""
import bpy, json, struct
from pathlib import Path
from collections import defaultdict
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'models'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'characters.blend'))
for col in bpy.data.collections:col.hide_viewport=False
bpy.context.view_layer.update()
old=json.loads((OUT/'characters.json').read_text(encoding='utf8'))
PIVOTS=old['pivots'];PARENTS=old['parents']
def gv(p):return (p[0],p[2],-p[1])
for model,nodes in PIVOTS.items():
    root=bpy.data.objects[model+' · root']
    for name in nodes:
        nodes[name]=gv(root.matrix_world.inverted() @ bpy.data.objects[model+' · '+name].matrix_world.translation)
MATS={name:bpy.data.materials[name] for name in old['materials']}
PARTS=[o for o in bpy.data.objects if o.type=='MESH' and o.get('model')]
for o in PARTS:
    name=o.data.materials[0].name.removesuffix(' painted')
    o.data.materials[0]=MATS[name]
source=(ROOT/'authoring/build_characters.py').read_text(encoding='utf8')
start=source.index('groups=defaultdict(list)');end=source.index('# Native vertex paint')
exec(compile(source[start:end],'runtime-export','exec'))
print('RUNTIME EXPORT:',len(blob),'bytes;',len(entries),'batches')
