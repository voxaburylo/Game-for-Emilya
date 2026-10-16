"""Original Bukvomisto characters. Run with Blender 4.5 --background --python this_file.

All dimensions are authored in game coordinates (Y up, +Z forward). Surfaces,
painted skin/fur, garment patterns and articulated pivots are exported together.
No downloaded character, AI image, or external texture is used.
"""
import bpy, bmesh, math, json, struct, os
from mathutils import Vector
from collections import defaultdict
from pathlib import Path
from math import sin, cos, pi, exp, sqrt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'models'
OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
PARTS = []
MATS = {}
PIVOTS = {'girl': {'root': (0,0,0), 'head': (0,2.65,0),
    'legL':(-.22,.89,0),'legR':(.22,.89,0),
    'armL':(-.41,1.87,0),'armR':(.41,1.87,0)},
    'dog': {'root':(0,0,0),'head':(0,.99,.35),'tail':(0,.7,-.65),
    'legL':(-.25,.57,.28),'legR':(.25,.57,.28),
    'backL':(-.26,.56,-.43),'backR':(.26,.56,-.43)}}
for model,y,z,x in [('girl',2.724,.435,.191),('dog',1.26,.685,.165)]:
    PIVOTS[model].update({'eyeL':(-x,y,z),'eyeR':(x,y,z)})
PIVOTS['dog'].update({'earL':(-.29,1.40,.27),'earR':(.29,1.40,.27)})
PARENTS={'eyeL':'head','eyeR':'head','earL':'head','earR':'head'}

def linear(v): return v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4
def rgb(h): return tuple(linear(int(h[i:i+2],16)/255) for i in (1,3,5))
def mat(name, color, rough=.6, metal=0, tint=False):
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb(color),1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=m.diffuse_color
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    m['roughness']=rough; m['metalness']=metal; m['tint']=tint
    MATS[name]=m
    return m
mat('skin','#edbd9f',.6); mat('lip','#b97067',.67); mat('earInner','#dca18b',.72)
mat('hair','#634032',.43); mat('hairLight','#79503b',.47); mat('hairDark','#503329',.52)
mat('ivory','#fff2db',.82); mat('cloth','#be7186',.88,tint=True)
mat('thread','#e3bdad',.9); mat('denim','#6f929b',.86); mat('denimDark','#597d87',.88)
mat('leather','#8c5b3b',.58); mat('sole','#d6b794',.86); mat('gold','#ceaa65',.35,.55)
mat('white','#fff9ef',.31); mat('iris','#79552f',.3); mat('irisLight','#af854b',.35)
mat('irisDark','#3b3027',.3); mat('pupil','#171b20',.23); mat('glint','#ffffff',.15)
mat('fur','#c78e50',.88); mat('furDark','#92582f',.83); mat('furLight','#e4b67a',.9)
mat('furCream','#f5e5c8',.9); mat('nose','#42342d',.42); mat('collar','#6a9695',.72)

def bv(p): return (p[0],-p[2],p[1])
def gv(p): return (p[0],p[2],-p[1])
def tag(o, model='girl', node='root', variant='base'):
    o['model']=model; o['node']=node; o['variant']=variant
    PARTS.append(o); return o
def mesh(name, verts, faces, material, model='girl', node='root', variant='base', paint=None):
    me=bpy.data.meshes.new(name); me.from_pydata([bv(v) for v in verts],[],faces); me.update()
    bm=bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o); me.materials.append(MATS[material])
    for p in me.polygons: p.use_smooth=True
    if paint:
        ca=me.color_attributes.new(name='paint',type='FLOAT_COLOR',domain='POINT')
        for i,v in enumerate(verts): ca.data[i].color=(*paint(v),1)
    return tag(o,model,node,variant)

def ell(name,c,r,material,model='girl',node='root',variant='base', deform=None, paint=None, n=32,k=20):
    vs=[]; fs=[]
    for j in range(k+1):
        p=pi*j/k
        for i in range(n):
            a=2*pi*i/n; v=(c[0]+r[0]*sin(p)*sin(a),c[1]+r[1]*cos(p),c[2]+r[2]*sin(p)*cos(a))
            vs.append(deform(v) if deform else v)
    for j in range(k):
        for i in range(n): fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    return mesh(name,vs,fs,material,model,node,variant,paint)

def interp(points, steps=5):
    out=[]
    for i in range(len(points)-1):
        a=points[max(0,i-1)]; b=points[i]; c=points[i+1]; d=points[min(len(points)-1,i+2)]
        for j in range(steps):
            t=j/steps
            out.append(tuple(.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t) for k in range(len(b))))
    return out+[points[-1]]

def loft(name, rings, material, model='girl',node='root',variant='base', folds=0, n=40,steps=4):
    # ring = y, radius X, radius Z, centre X, centre Z
    rs=interp(rings,steps); vs=[]; fs=[]
    for j,(y,rx,rz,cx,cz) in enumerate(rs):
        t=j/max(1,len(rs)-1)
        for i in range(n):
            a=2*pi*i/n; f=1+folds*(.35+.65*sin(pi*t/2))*(sin(a*10+.25*sin(t*4))+.25*sin(a*20))
            vs.append((cx+rx*sin(a)*f,y,cz+rz*cos(a)*f))
    for j in range(len(rs)-1):
        for i in range(n): fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    fs.extend([tuple(range(n-1,-1,-1)),tuple((len(rs)-1)*n+i for i in range(n))])
    return mesh(name,vs,fs,material,model,node,variant)

def sweep(name, points, material, model='girl',node='root',variant='base', n=12,steps=4,groove=0):
    # points = x,y,z,width,depth. Cross sections follow the curve.
    ps=interp(points,steps); vs=[]; fs=[]
    for j,p in enumerate(ps):
        tangent=Vector(ps[min(j+1,len(ps)-1)][:3])-Vector(ps[max(j-1,0)][:3]); tangent.normalize()
        ref=Vector((0,0,1)) if abs(tangent.z)<.95 else Vector((0,1,0))
        axis=tangent.cross(ref).normalized(); other=axis.cross(tangent).normalized()
        for i in range(n):
            a=2*pi*i/n; ripple=1+groove*cos(a*5)
            v=Vector(p[:3])+axis*(p[3]*cos(a)*ripple)+other*(p[4]*sin(a)*ripple)
            vs.append(tuple(v))
    for j in range(len(ps)-1):
        for i in range(n): fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    fs.extend([tuple(range(n-1,-1,-1)),tuple((len(ps)-1)*n+i for i in range(n))])
    return mesh(name,vs,fs,material,model,node,variant)

def line(name,points,r,material,**kw):
    return sweep(name,[(*p,r,r) for p in points],material,n=8,**kw)

def union(name, objects, material,model='girl',node='root',voxel=.022,paint=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True); PARTS.remove(o)
    bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join(); o=objects[0]; o.name=name
    o.data.materials.clear(); o.data.materials.append(MATS[material])
    rem=o.modifiers.new('Sculpted continuous surface','REMESH'); rem.mode='VOXEL'; rem.voxel_size=voxel; rem.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=o.modifiers.new('Relaxed sculpt','SMOOTH'); sm.factor=1.2; sm.iterations=5; bpy.ops.object.modifier_apply(modifier=sm.name)
    de=o.modifiers.new('Mobile topology','DECIMATE'); de.ratio=.6; bpy.ops.object.modifier_apply(modifier=de.name)
    for f in o.data.polygons:f.use_smooth=True
    if paint:
        ca=o.data.color_attributes.new(name='paint',type='FLOAT_COLOR',domain='POINT')
        for i,v in enumerate(o.data.vertices):ca.data[i].color=(*paint(gv(v.co)),1)
    return tag(o,model,node)

def mix(a,b,t): return tuple(a[i]*(1-t)+b[i]*t for i in range(3))
skin=rgb('#edbd9f'); blush=rgb('#d78d7f')
def skinpaint(v):
    x,y,z=v; amount=.5*exp(-((abs(x)-.32)/.14)**2-((y-2.56)/.11)**2)*max(0,z/.45)
    return mix(skin,blush,amount)
def face(v):
    x,y,z=v; t=(y-2.71)/.58
    x*=.84+.16*(t+1)/2+.08*exp(-((t+.24)/.35)**2)
    if z>0:
        z+=.035*exp(-(x/.075)**2-((y-2.67)/.12)**2)
        z+=.075*exp(-(x/.105)**2-((y-2.575)/.060)**2)
        z+=.025*exp(-((abs(x)-.29)/.13)**2-((y-2.54)/.13)**2)
        z-=.027*exp(-((abs(x)-.19)/.115)**2-((y-2.73)/.10)**2)
    return x,y,z
ell('Sculpted face', (0,2.71,0),(.55,.58,.47),'skin',node='head',deform=face,paint=skinpaint,n=80,k=56)
for s in [-1,1]:
    ell('Ear', (s*.487,2.64,-.005),(.095,.14,.065),'skin',node='head')
    ell('Ear concha',(s*.525,2.64,.043),(.039,.079,.014),'earInner',node='head',n=20,k=12)
    line('Ear fold',[(s*.53,2.70,.05),(s*.55,2.66,.053),(s*.53,2.60,.05)],.008,'skin',node='head')

def eye(model, side, cx,cy,cz,width,height,node='head'):
    first_part=len(PARTS)
    node='eyeL' if side<0 else 'eyeR'
    # Almond-shaped sculpted sclera, with flush lids and a layered iris.
    vs=[(cx,cy,cz+.034)]; fs=[]; rings=8; n=40
    for j in range(1,rings+1):
        r=j/rings
        for i in range(n):
            a=2*pi*i/n; x=width*cos(a)*r; y=height*sin(a)*(.82+.18*abs(sin(a)))*r
            vs.append((cx+x,cy+y+side*x*.05,cz+.034*(1-r*r)-.025*(x/width)**2))
    for i in range(n):fs.append((0,1+i,1+(i+1)%n))
    for j in range(rings-1):
        for i in range(n):fs.append((1+j*n+i,1+j*n+(i+1)%n,1+(j+1)*n+(i+1)%n,1+(j+1)*n+i))
    mesh('Almond eye',vs,fs,'white',model,node)
    rr=height*.72
    ell('Limbal ring',(cx,cy,cz+.037),(rr*1.09,rr*1.09,.012),'irisDark',model,node,n=32,k=16)
    ell('Hazel iris',(cx,cy,cz+.046),(rr,rr,.009),'iris',model,node,n=40,k=16)
    for i in range(20):
        a=i*2*pi/20; r1=rr*.6; r2=rr*.92
        line('Iris fibre',[(cx+cos(a)*r1,cy+sin(a)*r1,cz+.055),(cx+cos(a+.025)*r2,cy+sin(a+.025)*r2,cz+.051)],.0018,'irisLight',model=model,node=node,steps=1)
    ell('Pupil',(cx,cy,cz+.057),(rr*.55,rr*.64,.006),'pupil',model,node,n=24,k=12)
    ell('Catchlight',(cx-rr*.26,cy+rr*.32,cz+.065),(rr*.22,rr*.22,.005),'glint',model,node,n=16,k=8)
    ell('Tiny catchlight',(cx+rr*.3,cy-rr*.24,cz+.064),(rr*.08,rr*.08,.004),'glint',model,node,n=12,k=8)
    for upper in [True,False]:
        pts=[]
        for i in range(13):
            a=(pi*i/12) if upper else pi+pi*i/12
            x=width*cos(a); y=height*sin(a)*(.82+.18*abs(sin(a)))
            pts.append((cx+x,cy+y+side*x*.05,cz-.025*(x/width)**2))
        line('Sculpted eyelid',pts,.014 if upper else .009,'skin' if model=='girl' else 'furDark',model=model,node=node,steps=2)
        if upper: line('Lash line',[(x,y-.003,z+.011) for x,y,z in pts],.0055 if model=='girl' else .008,'hairDark' if model=='girl' else 'nose',model=model,node=node,steps=2)
    if model=='dog':
        for o in PARTS[first_part:]:
            for v in o.data.vertices:v.co.y=-cz+(v.co.y+cz)*.65
            o.data.update()

for s in [-1,1]:
    eye('girl',s,s*.191,2.724,.435,.133,.087)
    sweep('Soft eyebrow',[(s*.10,2.886,.414,.012,.008),(s*.19,2.913,.431,.021,.009),(s*.30,2.885,.403,.006,.004)],'hair',node='head',n=10)
    for i in range(3):
        x=s*(.29+i*.014)
        line('Outer eyelash',[(x,2.766-i*.011,.438),(x+s*.025,2.783-i*.012,.449)],.0035,'hairDark',node='head',steps=2)
    for i in range(4):
        x=s*(.245+i*.024); y=2.579+.015*sin(i*2)
        z=face((x,y,.47*sqrt(max(0,1-(x/.55)**2-((y-2.71)/.58)**2))))[2]
        ell('Freckle',(x,y,z+.003),(.0036,.0033,.002),'lip',node='head',n=8,k=6)
line('Smile crease',[(-.105,2.435,.416),(-.052,2.413,.437),(0,2.409,.44),(.052,2.413,.437),(.105,2.435,.416)],.007,'lip',node='head')
line('Lower lip',[(-.065,2.405,.428),(0,2.394,.439),(.065,2.405,.428)],.009,'earInner',node='head')
for s in [-1,1]:
    ell('Nostril',(s*.036,2.54,.513),(.009,.004,.003),'earInner',node='head',n=12,k=8)
loft('Neck',[(1.89,.145,.13,0,0),(2.10,.135,.12,0,0),(2.22,.18,.14,0,0)],'skin')

def relax_hand(o,side):
    # Rotate the palm inward, blending the twist smoothly through the wrist.
    for v in o.data.vertices:
        x,y,z=gv(v.co);t=max(0,min(1,(1.30-y)/.15));t=t*t*(3-2*t)
        angle=side*pi*.5*t;dx=x-side*.57;dz=z-.035
        v.co=bv((side*.57+dx*cos(angle)+dz*sin(angle),y,.035-dx*sin(angle)+dz*cos(angle)))
    o.data.update()

for s,label in [(-1,'L'),(1,'R')]:
    node='leg'+label
    loft('Leg',[(.13,.09,.105,s*.22,.005),(.25,.10,.105,s*.22,0),(.44,.12,.12,s*.22,-.015),(.61,.125,.13,s*.22,.025),(.82,.15,.15,s*.22,0),(1.0,.16,.17,s*.22,0)],'skin',node=node)
    arm='arm'+label
    arm_mesh=sweep('Relaxed arm',[(s*.4,1.85,0,.125,.125),(s*.50,1.66,0,.112,.11),(s*.55,1.42,.015,.09,.095),(s*.57,1.23,.035,.075,.07)],'skin',node=arm,n=24)
    hand=[arm_mesh,ell('Palm',(s*.58,1.155,.04),(.087,.105,.058),'skin',node=arm)]
    hand.append(sweep('Thumb',[(s*.525,1.17,.055,.029,.028),(s*.48,1.115,.075,.025,.024),(s*.465,1.065,.095,.017,.018)],'skin',node=arm,n=16))
    for f in range(4):
        x=s*(.518+f*.043); tip=[.975,.94,.95,.995][f]
        hand.append(sweep('Separate finger',[(x,1.12,.045,.021,.025),(x+s*(f-1.5)*.004,1.035,.052,.018,.021),(x+s*(f-1.5)*.007,tip+.015,.069,.017,.019),(x+s*(f-1.5)*.007,tip,.077,.006,.008)],'skin',node=arm,n=16,steps=5))
        ell('Fingernail',(x+s*(f-1.5)*.007,tip+.026,.087),(.010,.016,.003),'earInner',node=arm,n=16,k=10)
    union('Soft hand with fingers',hand,'skin',node=arm,voxel=.004)
    for o in PARTS:
        if o['node']==arm and o.name.startswith(('Soft hand','Fingernail')):relax_hand(o,s)
    for i in range(4):
        variant='shoes'+str(i)
        leather='cloth' if i in [0,1] else 'ivory' if i==2 else 'leather'
        loft('Sculpted sole',[(.025,.14,.245,s*.22,.09),(.055,.16,.265,s*.22,.09),(.10,.155,.255,s*.22,.09)],'sole',node=node,variant=variant,n=40)
        loft('Shoe upper',[(.09,.151,.252,s*.22,.09),(.16,.147,.236,s*.22,.085),(.22,.125,.18,s*.22,.055),(.265,.103,.105,s*.22,0)],leather,node=node,variant=variant,n=40)
        if i==1:
            loft('Boot shaft',[(.22,.11,.13,s*.22,0),(.34,.11,.12,s*.22,0),(.52,.13,.13,s*.22,0),(.55,.135,.135,s*.22,0)],'cloth',node=node,variant=variant)
            loft('Boot cuff',[(.51,.136,.137,s*.22,0),(.54,.142,.14,s*.22,0),(.57,.137,.137,s*.22,0)],'ivory',node=node,variant=variant)
        else:
            loft('Sock',[(.23,.102,.105,s*.22,0),(.31,.106,.108,s*.22,0),(.34,.109,.111,s*.22,0)],'ivory',node=node,variant=variant,n=24)
            for y in [.29,.325]:
                line('Sock rib',[(s*.22+.106*sin(a),y,.109*cos(a)) for a in [j*2*pi/24 for j in range(25)]],.004,'thread',node=node,variant=variant,steps=1)
        if i in [0,2,3]:
            for z in ([.14] if i!=3 else [.07,.19]):
                line('Instep strap',[(s*.22-.13,.18,z),(s*.22-.08,.235,z),(s*.22,.25,z),(s*.22+.08,.235,z),(s*.22+.13,.18,z)],.018,'cloth' if i==2 else leather,node=node,variant=variant)
            ell('Shoe buckle',(s*.22+s*.135,.185,.145),(.018,.025,.024),'gold',node=node,variant=variant,n=16,k=10)
        line('Sole stitching',[(s*.22+.153*sin(a),.113,.09+.25*cos(a)) for a in [j*2*pi/48 for j in range(49)]],.003,'ivory',node=node,variant=variant,steps=1)

for d in range(6):
    variant='dress'+str(d)
    loft('Tailored bodice',[(1.27,.31,.225,0,0),(1.48,.315,.229,0,0),(1.72,.395,.245,0,0),(1.86,.34,.217,0,0),(1.94,.16,.135,0,0)],'ivory' if d==3 else 'cloth',variant=variant,folds=.012)
    for s,label in [(-1,'L'),(1,'R')]:
        sweep('Gathered sleeve',[(s*.36,1.83,0,.13,.14),(s*.45,1.79,0,.18,.18),(s*.49,1.65,0,.135,.14)],'ivory' if d==3 else 'cloth',node='arm'+label,variant=variant,n=28,groove=.035)
        line('Sleeve cuff',[(s*.49+.133*sin(a),1.65,.14*cos(a)) for a in [j*2*pi/28 for j in range(29)]],.012,'ivory',node='arm'+label,variant=variant,steps=1)
    if d!=3:
        bottom=.72 if d!=4 else .63; width=.61 if d!=4 else .73
        loft('Draped skirt',[(1.32,.31,.23,0,0),(1.15,.40,.29,0,0),(.92,width*.9,.35,0,0),(bottom,width,.40,0,0),(bottom-.025,width-.012,.395,0,0)],'cloth',variant=variant,folds=.045,n=64,steps=5)
        line('Rolled hem',[(width*sin(a)*(1+.045*(sin(a*10)+.25*sin(a*20))),bottom-.014,.40*cos(a)*(1+.045*(sin(a*10)+.25*sin(a*20)))) for a in [j*2*pi/96 for j in range(97)]],.014,'ivory' if d in [0,2,4] else 'thread',variant=variant,steps=1)
        loft('Waist piping',[(1.285,.322,.238,0,0),(1.31,.324,.239,0,0),(1.33,.32,.237,0,0)],'ivory' if d==4 else 'cloth',variant=variant)
    if d==0:
        for s in [-1,1]:
            sweep('Peter Pan collar',[(s*.025,1.94,.143,.025,.01),(s*.13,1.87,.205,.075,.022),(s*.24,1.87,.183,.05,.018),(s*.28,1.90,.135,.008,.008)],'ivory',variant=variant,n=20)
        for y in [1.75,1.59,1.43]:ell('Mother of pearl button',(0,y,.247),(.023,.023,.012),'gold',variant=variant,n=16,k=10)
    if d==1:
        # Curved apron panel conforms to skirt, with scalloped hem and stitched pocket.
        vs=[];fs=[]
        for j in range(14):
            t=j/13;y=1.7-t*.91;w=.20+.19*t;z=.252+.14*t
            for i in range(25):
                u=i/24*2-1;vs.append((u*w,y+.012*cos(i*pi/2)*(t**12),z-.065*u*u))
        for j in range(13):
            for i in range(24):a=j*25+i;fs.append((a,a+1,a+26,a+25))
        mesh('Linen apron',vs,fs,'ivory',variant=variant)
        for s in [-1,1]:line('Apron strap',[(s*.23,1.67,.23),(s*.25,1.86,.19),(s*.23,1.91,0),(s*.23,1.79,-.22)],.027,'ivory',variant=variant)
        sweep('Apron pocket',[(-.12,1.13,.35, .01,.009),(0,1.08,.38,.075,.012),(.12,1.13,.35,.01,.009)],'cloth',variant=variant,n=16)
    if d==2:
        for y,w,z in [(1.02,.53,.35),(.80,.61,.40)]:
            loft('Ruffled tier',[(y+.11,w-.07,z-.04,0,0),(y,w,z,0,0),(y-.035,w+.015,z+.01,0,0)],'cloth',variant=variant,folds=.055,n=64)
            line('Ruffle piping',[((w+.015)*sin(a)*(1+.055*sin(10*a)),y-.035,(z+.01)*cos(a)*(1+.055*sin(10*a))) for a in [j*2*pi/96 for j in range(97)]],.009,'ivory',variant=variant,steps=1)
    if d==3:
        loft('Overall seat',[(1.03,.34,.19,0,0),(1.10,.35,.22,0,0),(1.26,.30,.23,0,0)],'denim',variant=variant)
        for s,label in [(-1,'L'),(1,'R')]:
            loft('Trouser leg',[(.35,.13,.14,s*.22,0),(.44,.14,.15,s*.22,0),(.73,.16,.17,s*.22,0),(1.03,.175,.19,s*.21,0),(1.16,.11,.13,s*.20,0)],'denim',node='leg'+label,variant=variant,folds=.025)
            loft('Turned up cuff',[(.34,.14,.15,s*.22,0),(.38,.145,.155,s*.22,0),(.43,.14,.15,s*.22,0)],'denimDark',node='leg'+label,variant=variant)
            line('Overall strap',[(s*.22,1.38,.24),(s*.25,1.75,.24),(s*.24,1.91,.07),(s*.23,1.89,-.11),(s*.22,1.73,-.22),(s*.20,1.50,-.21),(s*.18,1.28,-.20)],.035,'denim',variant=variant)
            ell('Brass fastening',(s*.22,1.69,.264),(.024,.024,.012),'gold',variant=variant,n=16,k=10)
        vs=[];fs=[]
        for j in range(16):
            t=j/15;y=1.19+t*.52;w=.27-.025*t
            for i in range(25):
                u=i/24*2-1;vs.append((u*w,y,.271-.04*u*u))
        for j in range(15):
            for i in range(24):a=j*25+i;fs.append((a,a+1,a+26,a+25))
        mesh('Overall bib',vs,fs,'denim',variant=variant)
        line('Bib pocket seam',[(-.12,1.55,.258),(-.11,1.39,.261),(0,1.36,.264),(.11,1.39,.261),(.12,1.55,.258)],.005,'thread',variant=variant)
    if d==4:
        for s in [-1,1]:sweep('Sash bow',[(0,1.32,.27,.02,.02),(s*.14,1.36,.30,.085,.033),(s*.24,1.30,.29,.055,.028),(0,1.30,.28,.015,.015)],'ivory',variant=variant,n=20)
        ell('Bow knot',(0,1.32,.32),(.045,.055,.031),'cloth',variant=variant)
        for s in [-1,1]:sweep('Bow ribbon',[(s*.04,1.3,.29,.03,.01),(s*.09,1.18,.32,.045,.012),(s*.13,1.04,.36,.04,.01)],'ivory',variant=variant,n=12)
    if d==5:
        profile=interp([(1.27,.31,.225,0,0),(1.48,.315,.229,0,0),(1.72,.395,.245,0,0),(1.86,.34,.217,0,0),(1.94,.16,.135,0,0)],4)
        for y in [1.42,1.56,1.70]:
            rings=[]
            for yy in [y,y+.0175,y+.035]:
                for a,b in zip(profile,profile[1:]):
                    if a[0]<=yy<=b[0]:
                        t=(yy-a[0])/(b[0]-a[0]);rings.append((yy,a[1]*(1-t)+b[1]*t+.008,a[2]*(1-t)+b[2]*t+.008,0,0));break
            loft('Woven stripe',rings,'ivory',variant=variant,n=48,steps=2,folds=.012)

for h in range(5):
    variant='hair'+str(h); vs=[];fs=[];n=72;k=24
    for j in range(k+1):
        for i in range(n):
            a=2*pi*i/n; front=max(0,cos(a)); end=1.95-.90*front**2+.06*sin(a*2)
            p=end*j/k; ripple=1+.006*sin(a*23+p*3)
            vs.append((.55*sin(p)*sin(a)*ripple,2.73+.605*cos(p),.505*sin(p)*cos(a)*ripple-.018))
    for j in range(k):
        for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    mesh('Sculpted hair cap',vs,fs,'hair',node='head',variant=variant)
    # A continuous swept fringe wraps around the skull. Fine channels follow
    # the same surface instead of looking like separate tubes on the head.
    vs=[];fs=[]
    def fringe(u,t):
        a=.45-u*.75-t*.65
        p=.24+t*(.92+.20*u)
        thickness=.017+.027*sin(pi*t)*sin(pi*u)
        return ((.55+thickness)*sin(p)*sin(a),2.73+(.605+thickness)*cos(p),(.505+thickness)*sin(p)*cos(a)-.018)
    for j in range(33):
        for i in range(25):vs.append(fringe(i/24,j/32))
    for j in range(32):
        for i in range(24):a=j*25+i;fs.append((a,a+1,a+26,a+25))
    mesh('Swept sculpted fringe',vs,fs,'hair',node='head',variant=variant)
    for i in range(8):
        u=(i+.5)/8;pts=[]
        for j in range(19):
            x,y,z=fringe(u,.10+j*.9/18);pts.append((x*1.004,y+.002,z+.003))
        line('Fringe channel',pts,.0025,'hairLight' if i%3==0 else 'hairDark',node='head',variant=variant,steps=2)
    for i in range(15):
        a=.85+i*(2*pi-1.7)/14; pts=[]
        for j in range(10):
            p=.22+j*.16;pts.append((.554*sin(p)*sin(a),2.73+.610*cos(p),.511*sin(p)*cos(a)-.018))
        line('Combed hair groove',pts,.0035,'hairLight' if i%3==0 else 'hairDark',node='head',variant=variant,steps=2)
    for s in [-1,1]:
        if h in [0,2]:
            for i in range(6):
                a=s*(1.28+i*.26); length=.5 if h==0 else .94
                sweep('Flowing hair lock',[(.29*sin(a),3.24,.27*cos(a),.008,.008),(.49*sin(a),3.00,.45*cos(a),.075,.035),(.54*sin(a),2.70,.48*cos(a),.10,.05),(.51*sin(a),2.94-length,.46*cos(a),.10,.05),(.46*sin(a)+s*.035,2.85-length,.45*cos(a)+.03,.003,.003)],'hair',node='head',variant=variant,n=20,steps=6,groove=.025)
        if h==1:
            for i in range(5):
                a=i*2*pi/5
                sweep('Twisted bun',[(s*.43,3.15,-.06,.07,.06),(s*(.53+.12*cos(a)),3.24+.12*sin(a),-.07,.11,.085),(s*.49,3.22,-.19,.04,.035)],'hair' if i%2 else 'hairLight',node='head',variant=variant,n=16)
            line('Bun ribbon',[(s*.43,3.10,.02),(s*.54,3.13,.07),(s*.66,3.19,.02)],.025,'cloth',node='head',variant=variant)
        if h==3:
            sweep('Gathered hair behind ear',[(s*.39,2.94,-.25,.065,.045),(s*.49,2.76,-.24,.085,.055),(s*.50,2.60,-.15,.07,.055)],'hair',node='head',variant=variant,n=24,steps=6,groove=.02)
            for strand in range(3):
                pts=[]
                for i in range(22):
                    t=i/21;a=t*5*pi+strand*2*pi/3
                    pts.append((s*(.50+.06*t+.055*sin(a)),2.60-t*.79,-.145+.055*cos(a),.055*(1-.35*t),.045*(1-.35*t)))
                sweep('Woven braid',pts,'hairLight' if strand==0 else 'hair',node='head',variant=variant,n=12,steps=2)
            ell('Braid ribbon',(s*.56,1.83,-.15),(.10,.035,.09),'cloth',node='head',variant=variant)
            sweep('Braid tip',[(s*.56,1.80,-.15,.065,.06),(s*.57,1.69,-.14,.03,.025),(s*.54,1.65,-.12,.004,.004)],'hair',node='head',variant=variant)
    if h==4:
        ell('Ponytail tie',(0,2.99,-.48),(.12,.12,.08),'cloth',node='head',variant=variant)
        for i in range(7):
            a=i*2*pi/7
            sweep('Ponytail lock',[(.06*sin(a),3.0,-.49,.075,.06),(.12*sin(a),2.78,-.67+.08*cos(a),.09,.075),(.08*sin(a)+.06,2.36,-.62+.08*cos(a),.07,.05),(.10,2.2,-.51,.004,.004)],'hairLight' if i%3==0 else 'hair',node='head',variant=variant,n=16,steps=5,groove=.04)

# Puppy: a continuous remeshed chest/back, painted markings, four articulated legs.
fur=rgb('#c78e50'); cream=rgb('#f5e5c8')
def dogpaint(v):
    x,y,z=v; chest=exp(-(x/.29)**2-((z-.40)/.28)**2)*.94
    return mix(fur,cream,chest)
parts=[ell('Rib cage',(0,.65,-.18),(.34,.31,.54),'fur',model='dog'),
    ell('Chest',(0,.68,.24),(.33,.36,.30),'fur',model='dog'),
    ell('Neck',(0,.88,.32),(.25,.32,.25),'fur',model='dog'),
    ell('Haunch',(0,.65,-.49),(.32,.29,.28),'fur',model='dog')]
union('Sculpted puppy body',parts,'fur','dog',voxel=.024,paint=dogpaint)
for s,label in [(-1,'L'),(1,'R')]:
    for rear in [False,True]:
        z=-.43 if rear else .28; node=('back' if rear else 'leg')+label
        leg=[sweep('Tapered puppy leg',[(s*.21,.76,z,.055,.07),(s*.25,.58,z,.125,.14),(s*.27,.38,z-.02,.095,.10),(s*.27,.19,z+.02,.08,.09)],'fur','dog',node,n=24),
            ell('Paw',(s*.27,.10,z+.075),(.12,.09,.17),'fur','dog',node)]
        def pawpaint(v):return mix(fur,cream,1/(1+exp((v[1]-.20)*50)))
        union('Sculpted leg and paw',leg,'fur','dog',node,voxel=.015,paint=pawpaint)
        for dx in [-.04,.04]:line('Toe crease',[(s*.27+dx,.09,z+.225),(s*.27+dx,.14,z+.215),(s*.27+dx,.17,z+.185)],.004,'furLight',model='dog',node=node)

def headpaint(v):
    x,y,z=v
    blaze=exp(-(x/(.075+.025*max(0,1.2-y)))**4)*max(0,min(1,(z-.38)*4))
    muzzle=exp(-(x/.34)**4-((y-.95)/.19)**4-((z-.79)/.32)**4)
    return mix(fur,cream,max(blaze,muzzle)*.98)
parts=[ell('Puppy skull',(0,1.17,.38),(.36,.36,.33),'fur','dog','head'),
    ell('Left cheek',(-.18,1.02,.57),(.21,.20,.21),'fur','dog','head'),
    ell('Right cheek',(.18,1.02,.57),(.21,.20,.21),'fur','dog','head'),
    ell('Soft muzzle',(0,.99,.72),(.255,.18,.25),'fur','dog','head'),
    ell('Chin',(0,.89,.68),(.20,.09,.18),'fur','dog','head')]
dog_head=union('Sculpted puppy face',parts,'fur','dog','head',voxel=.015,paint=headpaint)
# Raise the orbital rim around each eye, leaving the central socket recessed.
# This seats the eyes into the cheeks when viewed from the side.
for v in dog_head.data.vertices:
    x,y,z=gv(v.co)
    if z>.45:
        q=sqrt(((abs(x)-.165)/.12)**2+((y-1.26)/.11)**2)
        z+=.045*exp(-((q-.92)/.35)**2)
        v.co=bv((x,y,z))
dog_head.data.update()
for s in [-1,1]:
    eye('dog',s,s*.165,1.26,.685,.103,.085)
    sweep('Puppy eyebrow',[(s*.08,1.36,.625,.009,.009),(s*.17,1.39,.62,.025,.014),(s*.25,1.34,.615,.006,.006)],'furLight','dog','head',n=16)
    ear='earL' if s<0 else 'earR'
    sweep('Velvet floppy ear',[(s*.29,1.40,.27,.085,.065),(s*.41,1.26,.28,.14,.085),(s*.45,1.02,.35,.155,.08),(s*.44,.83,.40,.11,.065),(s*.39,.78,.39,.025,.025)],'furDark','dog',ear,n=28,steps=6,groove=.028)
    for i in range(4):
        line('Ear sculpt groove',[(s*(.38+i*.018),1.27,.35),(s*(.42+i*.02),1.09,.42),(s*(.40+i*.014),.89,.45)],.0025,'furDark',model='dog',node=ear)
    for i in range(3):
        x=s*(.11+i*.035)
        ell('Whisker pore',(x,.98-i*.016,.935-i*.022),(.005,.005,.003),'furDark','dog','head',n=10,k=6)
    line('Smile corner',[(0,.94,.956),(s*.10,.91,.914),(s*.18,.94,.86)],.006,'nose',model='dog',node='head')
loft('Sculpted puppy nose',[(1.075,.105,.045,0,.925),(1.045,.115,.06,0,.928),(1.0,.069,.047,0,.94),(.986,.023,.02,0,.94)],'nose','dog','head',n=40)
for s in [-1,1]:
    ell('Nostril',(s*.071,1.037,.98),(.021,.014,.008),'pupil','dog','head',n=20,k=12)
line('Nose philtrum',[(0,1.0,.979),(0,.95,.957),(0,.936,.953)],.004,'nose',model='dog',node='head')
line('Nose soft highlight',[(-.06,1.071,.969),(0,1.079,.976),(.05,1.072,.97)],.003,'furLight',model='dog',node='head')
for i in range(5):
    a=(i-2)*.27
    sweep('Chest feathering',[(sin(a)*.17,.89,.48,.055,.035),(sin(a)*.23,.68,.53,.055,.028),(sin(a)*.24,.56,.48,.008,.008)],'furCream','dog',n=12)
line('Woven collar',[(.255*sin(a),.91+.05*cos(a),.32+.237*cos(a)) for a in [j*2*pi/64 for j in range(65)]],.034,'collar',model='dog',steps=1)
line('Collar stitching',[(.26*sin(a),.924+.05*cos(a),.32+.242*cos(a)) for a in [j*2*pi/64 for j in range(65)]],.004,'ivory',model='dog',steps=1)
ell('Brass collar tag',(0,.83,.576),(.063,.077,.015),'gold','dog',n=28,k=16)
for s in [-1,1]:line('Tag engraved heart',[(0,.80,.594),(s*.034,.835,.594),(s*.025,.856,.594),(0,.84,.594)],.003,'leather',model='dog',steps=3)
sweep('Curled tail',[(0,.70,-.64,.105,.105),(.025,.84,-.85,.10,.10),(.05,1.04,-.92,.08,.08),(.07,1.20,-.85,.055,.055),(.065,1.25,-.75,.008,.008)],'fur','dog','tail',n=24,steps=5)
sweep('Cream tail tip',[(.061,1.14,-.90,.067,.067),(.07,1.21,-.85,.051,.051),(.065,1.25,-.75,.008,.008)],'furCream','dog','tail',n=24,steps=5)

exec(compile((ROOT/'authoring/organic_parts.py').read_text(encoding='utf8'), 'organic_parts.py', 'exec'))

# Export an indexed mesh pack, grouped by articulation/material/variant for fewer draw calls.
groups=defaultdict(list)
runtime_lods={}
for o in PARTS:
    groups[(o['model'],o['node'],o['variant'],o.data.materials[0].name,bool(o.data.color_attributes))].append(o)
    if len(o.data.vertices)>128:
        mobile=o.modifiers.new('Runtime LOD','DECIMATE')
        mobile.ratio=.85 if o.name.startswith('Sculpted face') else .24 if o.name.startswith('Soft hand') else .52
        runtime_lods[o.name]=mobile
depsgraph=bpy.context.evaluated_depsgraph_get()
blob=bytearray(); entries=[]
def pack(values,typ):
    while len(blob)%4:blob.append(0)
    offset=len(blob);blob.extend(struct.pack('<'+typ*len(values),*values));return {'offset':offset,'count':len(values)}
for (model,node,variant,material,painted),objects in groups.items():
    pos=[];norm=[];colors=[];indices=[];pivot=PIVOTS[model][node]
    for o in objects:
        # Keep editable source geometry, but simplify the actual tablet payload.
        # The face receives a smaller reduction to preserve eyelid/nose contours.
        evaluated=None
        if o.name in runtime_lods:
            evaluated=o.evaluated_get(depsgraph)
            me=evaluated.to_mesh()
        else:me=o.data
        me.calc_loop_triangles();base=len(pos)//3
        ca=me.color_attributes.get('paint')
        for v in me.vertices:
            p=gv(v.co);n=gv(v.normal)
            pos.extend(p[i]-pivot[i] for i in range(3));norm.extend(n)
            if painted:colors.extend(ca.data[v.index].color[:3] if ca else (1,1,1))
        for tri in me.loop_triangles:indices.extend(base+i for i in tri.vertices)
        if evaluated:evaluated.to_mesh_clear()
    entry={'model':model,'node':node,'variant':variant,'material':material,'position':pack(pos,'f'),'normal':pack(norm,'f'),'index':pack(indices,'I')}
    if painted:entry['color']=pack(colors,'f')
    entries.append(entry)
materials={name:{'color':list(m.diffuse_color[:3]),'roughness':m['roughness'],'metalness':m['metalness'],'tint':bool(m['tint'])} for name,m in MATS.items()}
manifest={'version':1,'generator':'Blender '+bpy.app.version_string,'pivots':PIVOTS,'parents':PARENTS,'materials':materials,'meshes':entries}
(OUT/'characters.json').write_text(json.dumps(manifest,separators=(',',':')),encoding='utf8')
(OUT/'characters.bin').write_bytes(blob)
for o in PARTS:
    if o.name in runtime_lods:o.modifiers.remove(runtime_lods[o.name])

# Native vertex paint in Blender and GLB; runtime uses the same linear colors.
for name in list(MATS):
    source=MATS[name]; painted=source.copy();painted.name=name+' painted'
    nodes=painted.node_tree.nodes;attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='paint'
    painted.node_tree.links.new(attr.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
    for o in PARTS:
        if o.data.color_attributes and o.data.materials[0]==source:o.data.materials[0]=painted

defaults={'base','dress0','shoes0','hair0'}
rigs={}
for model in PIVOTS:
    rig={}
    for node,pivot in PIVOTS[model].items():
        o=bpy.data.objects.new(model+' · '+node,None);bpy.context.collection.objects.link(o)
        o.empty_display_type='PLAIN_AXES';o.empty_display_size=.08;o['model']=model
        if node=='root' and model=='girl':o['relaxed_palms']=True
        if node=='root' and model=='fox':o['orbital_refinement']=True
        parent=PARENTS.get(node,'root')
        if node!='root':
            o.parent=rig[parent];p=PIVOTS[model][parent]
            o.location=bv(tuple(pivot[i]-p[i] for i in range(3)))
        rig[node]=o
    bpy.context.view_layer.update()
    for o in [p for p in PARTS if p['model']==model]:
        matrix=o.matrix_world.copy();o.parent=rig[o['node']];o.matrix_world=matrix
    rigs[model]=rig
for model in PIVOTS:
    bpy.ops.object.select_all(action='DESELECT')
    for o in PARTS:o.select_set(o['model']==model and o['variant'] in defaults)
    for o in rigs[model].values():o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(model+'.glb')),use_selection=True,export_format='GLB',export_yup=True,export_extras=True)

# Artist-friendly source: variant collections, logical pivot empties, a lit turntable.
for model in PIVOTS:
    parent=bpy.data.collections.new(model.title());bpy.context.scene.collection.children.link(parent)
    variants={}
    for o in [p for p in PARTS if p['model']==model]:
        key=o['variant']
        if key not in variants:
            variants[key]=bpy.data.collections.new(model+' '+key);parent.children.link(variants[key])
            variants[key].hide_render=key not in defaults
            variants[key].hide_viewport=key not in defaults
        for col in list(o.users_collection):col.objects.unlink(o)
        variants[key].objects.link(o)
    rigs[model]['root'].location.x=1.45 if model=='dog' else -.55
    if model not in ['girl','dog']:parent.hide_render=True;parent.hide_viewport=True
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=40
scene.cycles.use_denoising=True
scene.world.color=(.22,.22,.22)
mat('studio','#e4dacc',.9)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.008));bpy.context.object.data.materials.append(MATS['studio'])
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size in [('Key',(-3,-4,7),550,5),('Fill',(4,-2,4),330,4),('Rim',(0,3,5),650,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,1.5))
bpy.ops.object.camera_add(location=(4,-9,3.5));cam=bpy.context.object;aim(cam,(.2,0,1.55));cam.data.type='ORTHO';cam.data.ortho_scale=5.0;scene.camera=cam
scene.render.resolution_x=1400;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'portrait.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'characters.blend'),compress=True)
bpy.ops.render.render(write_still=True)
print('CHARACTERS COMPLETE:',len(blob),'bytes;',len(entries),'mesh batches')
