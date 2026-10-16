"""Render the six complete looks as a visual regression/contact sheet."""
import bpy, math
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'models/characters.blend'))
source=[o for o in bpy.data.objects if o.type=='MESH' and o.get('model')=='girl']
board=bpy.data.collections.new('Wardrobe contact sheet');bpy.context.scene.collection.children.link(board)
for i in range(6):
    selected={'base','dress'+str(i),'shoes'+str(i%4),'hair'+str(i%5)}
    for o in source:
        if o['variant'] not in selected:continue
        clone=o.copy();clone.data=o.data;clone.parent=None
        # Mesh vertices are authored in world space. Hidden variant collections
        # do not evaluate parent matrices, so don't reuse their stale matrices.
        clone.matrix_world=Matrix.Identity(4);clone.location.x=(i-2.5)*1.5
        board.objects.link(clone)
for name in ['Girl','Dog']:bpy.data.collections[name].hide_render=True
scene=bpy.context.scene;cam=scene.camera;cam.location=(0,-12,3.4)
cam.rotation_euler=(Vector((0,0,1.6))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.ortho_scale=9.8
scene.render.resolution_x=2200;scene.render.resolution_y=950
scene.cycles.samples=32;scene.render.filepath=str(ROOT/'models/wardrobe-board.png')
bpy.ops.render.render(write_still=True)
