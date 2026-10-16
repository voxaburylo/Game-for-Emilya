import bpy,json,struct,math,sys
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent.parent
DATA=ROOT/'models/park'
data=json.loads((DATA/'park.json').read_text());binary=(DATA/'park.bin').read_bytes()
jobs=json.loads((ROOT/'tools/park-render-jobs.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12
scene.render.resolution_x=192;scene.render.resolution_y=192;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.view_settings.view_transform='Standard'
world=bpy.data.worlds.new('Soft sky');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.85,.9,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6
for loc,power,size in [((4,-5,7),550,5),((-4,-1,4),250,4)]:
 d=bpy.data.lights.new('Softbox','AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new('Softbox',d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('Camera');camera=bpy.data.objects.new('Camera',cam);scene.collection.objects.link(camera);scene.camera=camera;cam.type='ORTHO'
materials=[]
for m in data['materials']:
 mat=bpy.data.materials.new('Atlas');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.75
 if m['texture']:
  tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(DATA/m['texture']),check_existing=True);mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 else:bs.inputs['Base Color'].default_value=m['color']
 materials.append(mat)
parts=[p for model in data['models'].values() for p in model['parts']]
def arr(a,kind):return struct.unpack_from('<'+str(a['count'])+kind,binary,a['offset'])
(DATA/'thumbs').mkdir(exist_ok=True)
for job in jobs:
 selection=next((a.split('=',1)[1] for a in sys.argv if a.startswith('--only=')),None)
 if selection and job['id']!=selection:continue
 objects=[]
 for record in job['parts']:
  p=parts[record['part']];pos=arr(p['position'],'f');uv=arr(p['uv'],'f');indices=arr(p['index'],'I');flat=record['matrix'];mat=Matrix([[flat[c*4+r] for c in range(4)] for r in range(4)])
  vertices=[]
  for i in range(0,len(pos),3):
   v=mat@Vector((pos[i],pos[i+1],pos[i+2],1));vertices.append((v.x,-v.z,v.y))
  mesh=bpy.data.meshes.new('Mesh');mesh.from_pydata(vertices,[],[indices[i:i+3] for i in range(0,len(indices),3)]);mesh.update();layer=mesh.uv_layers.new()
  for loop in mesh.loops:layer.data[loop.index].uv=(uv[loop.vertex_index*2],1-uv[loop.vertex_index*2+1])
  mesh.materials.append(materials[p['material']]);o=bpy.data.objects.new('Model',mesh);scene.collection.objects.link(o);objects.append(o)
 lo,hi=job['min'],job['max'];center=Vector((0,0,(hi[1]+lo[1])*.5));camera.location=center+Vector((5,-8,5));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();cam.ortho_scale=max(hi[0]-lo[0],hi[2]-lo[2],hi[1]-lo[1])*1.5+.15
 scene.render.filepath=str(DATA/'thumbs'/(job['id']+'.png'));bpy.ops.render.render(write_still=True)
 for o in objects:
  mesh=o.data;bpy.data.objects.remove(o,do_unlink=True);bpy.data.meshes.remove(mesh)
