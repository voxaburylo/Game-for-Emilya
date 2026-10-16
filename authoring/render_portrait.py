import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'models/characters.blend'))
bpy.context.scene.render.filepath=str(ROOT/'models/portrait.png')
bpy.ops.render.render(write_still=True)
