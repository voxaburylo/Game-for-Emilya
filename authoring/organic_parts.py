"""Additional sculpted pets, botanical meshes and cottage. Executed by build_characters.py."""
import random
rng=random.Random(8127)
mat('rabbitFur','#e3dbce',.92);mat('rabbitPink','#c99698',.8)
mat('catFur','#baa087',.9);mat('catStripe','#846951',.9)
mat('foxFur','#d48b48',.9);mat('foxSock','#6c4937',.9)
mat('bark','#806045',.95);mat('barkLight','#a27c57',.95)
mat('leaf','#76945c',.9);mat('leafDark','#54754e',.92);mat('apple','#b75e4c',.5)
mat('plaster','#e7c9aa',.95);mat('stone','#b8aa91',.96);mat('stoneLight','#cdc1a8',.95)
mat('timber','#aa8159',.9);mat('paintWood','#66887e',.8)
mat('roof','#ad7267',.86);mat('roofLight','#bd8273',.86);mat('roofDark','#966056',.9)
mat('windowGlass','#779caa',.22,.13)

for model in ['rabbit','cat','fox']:
    rabbit=model=='rabbit'; fox=model=='fox'; fm=model+'Fur'
    hy,hz=(1.04,.30) if rabbit else (1.12,.35)
    ey,ez=(1.12,.575) if rabbit else (1.26,.655) if fox else (1.17,.615)
    PIVOTS[model]={'root':(0,0,0),'head':(0,hy,hz),'tail':(0,.60,-.60),
        'legL':(-.23,.53,.27),'legR':(.23,.53,.27),'backL':(-.25,.55,-.40),'backR':(.25,.55,-.40),
        'eyeL':(-.14,ey,ez),'eyeR':(.14,ey,ez),'earL':(-.22,hy+.25,hz-.06),'earR':(.22,hy+.25,hz-.06)}
    base=rgb('#e3dbce' if rabbit else '#d48b48' if fox else '#baa087');light=rgb('#f7ecda');dark=rgb('#846951')
    def furpaint(v,base=base,light=light,dark=dark,model=model):
        x,y,z=v
        if model=='rabbit':return mix(base,light,.65*exp(-(x/.24)**2-((z-.35)/.35)**2))
        cream=exp(-(x/.27)**4-((z-.39)/.28)**4)*.9
        result=mix(base,light,cream)
        if model=='cat':
            stripes=max(0,sin(z*24+sin(y*8)*.55))**6*max(0,min(1,(abs(x)-.16)*6))
            result=mix(result,dark,stripes*.58)
        return result
    union(model+' organic body',[
        ell('Ribs',(0,.59,-.18),(.31,.32,.47),fm,model),
        ell('Chest',(0,.66,.19),(.28,.33,.28),fm,model),
        ell('Neck',(0,.85,.28),(.21,.27,.20),fm,model),
        ell('Rump',(0,.58,-.43),(.34 if rabbit else .29,.34,.29),fm,model)
    ],fm,model,voxel=.021,paint=furpaint)
    for s,label in [(-1,'L'),(1,'R')]:
        for rear in [False,True]:
            z=-.40 if rear else .27;node=('back' if rear else 'leg')+label
            if rabbit and rear:
                objects=[ell('Hind haunch',(s*.25,.39,z),(.21,.29,.25),fm,model,node),ell('Long rabbit foot',(s*.25,.10,z+.16),(.15,.095,.25),fm,model,node)]
            else:
                objects=[sweep('Tapered leg',[(s*.20,.70,z,.065,.07),(s*.24,.49,z,.10,.105),(s*.24,.18,z+.03,.07,.075)],fm,model,node,n=20),ell('Paw',(s*.24,.09,z+.09),(.10,.08,.145),fm,model,node)]
            def pawpaint(v,base=base,light=light,fox=fox):return mix(base,rgb('#6c4937') if fox else light,1/(1+exp((v[1]-.21)*35)))
            union(model+' leg and paw',objects,fm,model,node,voxel=.012,paint=pawpaint)
            for dx in [-.031,.031]:line('Toe separation',[(s*.24+dx,.08,z+.225),(s*.24+dx,.13,z+.20)],.003,'rabbitPink' if rabbit else 'catStripe',model=model,node=node)
    def facepaint(v,base=base,light=light,model=model):
        x,y,z=v;amount=exp(-(x/.31)**4-((y-.98)/.17)**4-((z-.63)/.31)**4)*.85
        col=mix(base,light,amount)
        if model=='cat':
            stripe=max(0,cos(x*38+((y-1.27)*8)**2))**8*exp(-((y-1.33)/.12)**2)*max(0,min(1,(z-.45)*5))
            col=mix(col,rgb('#846951'),stripe*.6)
        return col
    objects=[ell('Rounded skull',(0,hy+.04,hz),(.335,.32,.30),fm,model,'head')]
    if fox:
        objects.extend([ell('Cheeks',(0,hy-.08,.53),(.30,.20,.24),fm,model,'head'),ell('Tapered muzzle',(0,hy-.12,.72),(.17,.13,.25),fm,model,'head')])
    else:
        for s in [-1,1]:objects.append(ell('Muzzle cheek',(s*.10,hy-.08,.55),(.14,.12,.17),fm,model,'head'))
        objects.append(ell('Chin',(0,hy-.15,.52),(.15,.08,.13),fm,model,'head'))
    union(model+' continuous face',objects,fm,model,'head',voxel=.012,paint=facepaint)
    for s,label in [(-1,'L'),(1,'R')]:
        start=len(PARTS);eye(model,s,s*.14,ey,ez,.102,.073 if rabbit else .08)
        for o in PARTS[start:]:
            if o.name.startswith('Sculpted eyelid'):o.data.materials[0]=MATS[fm]
            if model=='cat' and o.name.startswith('Pupil'):
                for v in o.data.vertices:v.co.x=s*.14+(v.co.x-s*.14)*.48
        node='ear'+label
        if rabbit:
            top=1.98 if s<0 else 1.88
            sweep('Long soft ear',[(s*.20,1.29,.23,.075,.055),(s*.25,1.59,.20,.12,.065),(s*.27,top-.10,.16,.075,.05),(s*.30,top,.22,.006,.009)],fm,model,node,n=28,steps=7)
            sweep('Inner ear',[(s*.21,1.38,.283,.025,.009),(s*.25,1.62,.266,.065,.012),(s*.27,top-.12,.208,.038,.008),(s*.29,top-.035,.24,.003,.003)],'rabbitPink',model,node,n=20,steps=6)
        else:
            sweep('Sculpted pointed ear',[(s*.22,1.35,.25,.12,.075),(s*.29,1.53,.22,.095,.06),(s*.31,1.69 if fox else 1.61,.20,.005,.005)],fm,model,node,n=28,steps=6)
            sweep('Ear hollow',[(s*.23,1.40,.319,.055,.012),(s*.285,1.53,.279,.047,.012),(s*.30,1.61 if fox else 1.56,.241,.002,.002)],'foxSock' if fox else 'rabbitPink',model,node,n=16,steps=5)
        for j in range(3 if not rabbit else 2):
            yy=hy-.06-j*.032
            line('Fine whisker',[(s*.16,yy,.687),(s*.28,yy+.015,.71),(s*(.39+j*.025),yy+.035-j*.025,.69)],.0022,'ivory',model=model,node='head')
    nz=.956 if fox else .723;ny=hy-.08
    loft('Small sculpted nose',[(ny+.028,.046,.023,0,nz),(ny,.051,.027,0,nz),(ny-.035,.012,.013,0,nz+.006)],'nose' if fox else 'rabbitPink',model,'head',n=24)
    line('Philtrum',[(0,ny-.018,nz+.025),(0,ny-.065,nz-.01)],.003,'nose' if fox else 'catStripe',model=model,node='head')
    for s in [-1,1]:line('Smile',[(0,ny-.064,nz-.01),(s*.055,ny-.079,nz-.035),(s*.10,ny-.06,nz-.065)],.003,'catStripe',model=model,node='head')
    if rabbit:
        ell('Rabbit cotton tail',(0,.58,-.73),(.18,.18,.18),'ivory',model,'tail',deform=lambda v:(v[0]*(1+.035*sin(v[1]*70)),v[1],v[2]),n=40,k=24)
    else:
        points=[(0,.60,-.62,.09,.085),(.08,.72,-.88,.15 if fox else .075,.13 if fox else .07),(.19,.98,-1.03,.18 if fox else .065,.15 if fox else .06),(.27,1.23,-.97,.11 if fox else .06,.10 if fox else .06),(.30,1.33,-.84,.009,.009)]
        sweep('Curved fluffy tail',points,fm,model,'tail',n=28,steps=6,groove=.025)
        if fox:sweep('Ivory tail tip',[(.23,1.10,-1.02,.15,.13),(.27,1.24,-.96,.10,.09),(.30,1.33,-.84,.005,.005)],'ivory',model,'tail',n=24,steps=5)
    if fox:
        for i in range(7):
            a=(i-3)*.19
            sweep('Fox chest ruff',[(sin(a)*.20,.91,.45,.06,.035),(sin(a)*.28,.70,.49,.065,.03),(sin(a)*.30,.53,.44,.004,.004)],'ivory',model,n=14)

# Tree: continuous roots and branches, organically lobed crowns and folded leaves.
PIVOTS['tree']={'root':(0,0,0)}
trunk=[sweep('Bent trunk',[(0,0,0,.25,.23),(.05,.7,.015,.18,.17),(-.08,1.45,.02,.14,.13),(.04,2.15,0,.08,.07),(.03,2.7,.02,.012,.012)],'bark','tree',n=24,steps=5)]
for i in range(5):
    a=i*2*pi/5
    trunk.append(sweep('Flared root',[(0,.25,0,.16,.11),(.26*sin(a),.11,.26*cos(a),.12,.075),(.52*sin(a),.025,.52*cos(a),.008,.008)],'bark','tree',n=16))
for i in range(6):
    a=i*2.4;y=1.30+i*.17
    trunk.append(sweep('Branch',[(0,y,0,.11,.1),(.36*sin(a),y+.31,.36*cos(a),.065,.06),(.75*sin(a),y+.62,.75*cos(a),.012,.012)],'bark','tree',n=16))
union('Branching trunk',trunk,'bark','tree',voxel=.025)
for i in range(14):
    a=i*2*pi/14
    line('Bark furrow',[(.21*sin(a),.13,.20*cos(a)),(.18*sin(a)+.04,.65,.17*cos(a)),(.13*sin(a)-.06,1.3,.12*cos(a)),(.10*sin(a),1.8,.10*cos(a))],.006,'barkLight',model='tree')
crowns=[(0,2.88,0,.85),(-.63,2.54,.04,.69),(.61,2.63,-.03,.73),(.10,2.55,.58,.65),(-.05,2.63,-.59,.65),(0,3.42,-.07,.58)]
for ci,(cx,cy,cz,r) in enumerate(crowns):
    def crown(v,cx=cx,cy=cy,cz=cz,ci=ci):
        x,y,z=v;noise=1+.075*sin(x*11+ci)*cos(y*9)*sin(z*13+1)+.035*cos(x*23+z*17)
        return cx+(x-cx)*noise,cy+(y-cy)*noise,cz+(z-cz)*noise
    def leafpaint(v):return mix(rgb('#54754e'),rgb('#91a86a'),max(0,min(1,(v[1]-2.0)/1.8)))
    ell('Organic leaf crown',(cx,cy,cz),(r,r*.82,r*.86),'leaf','tree',deform=crown,paint=leafpaint,n=40,k=24)
    for j in range(55):
        a=rng.random()*2*pi;p=math.acos(rng.uniform(-.8,1));c=Vector((cx+r*sin(p)*cos(a),cy+r*.82*cos(p),cz+r*.86*sin(p)*sin(a)))
        direction=Vector((cos(a),.15,sin(a))).normalized();across=Vector((-sin(a),.2,cos(a))).normalized();length=rng.uniform(.13,.22);width=length*.45
        vs=[tuple(c-direction*length*.5),tuple(c+across*width),tuple(c+Vector((0,.035,0))),tuple(c-across*width),tuple(c+direction*length*.5)]
        mesh('Folded pointed leaf',vs,[(0,1,2),(0,2,3),(2,1,4),(2,4,3),(2,1,0),(3,2,0),(4,1,2),(3,4,2)],'leaf' if j%3 else 'leafDark','tree')
for i in range(7):
    a=i*2.4;x=.82*sin(a);z=.8*cos(a);y=2.35+(i%3)*.27
    ell('Apple',(x,y,z),(.12,.135,.12),'apple','tree',variant='apple',n=20,k=14)
    line('Apple stem',[(x,y+.11,z),(x+.016,y+.18,z)],.012,'bark',model='tree',variant='apple')

def bevel_box(name,c,size,material,model='cottage',amount=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=bv(c));o=bpy.context.object;o.name=name
    o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    b=o.modifiers.new('Soft crafted edges','BEVEL');b.width=amount;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name)
    # Bake world coordinates, matching the rest of the authored mesh library.
    for v in o.data.vertices:v.co+=o.location
    o.location=(0,0,0);o.data.materials.append(MATS[material]);
    for p in o.data.polygons:p.use_smooth=False
    return tag(o,model)

PIVOTS['cottage']={'root':(0,0,0)}
bevel_box('Foundation',(0,.18,0),(5.25,.36,4.6),'stone',amount=.09)
for side in [-1,1]:
    for row in range(2):
        for i in range(9):
            x=-2.30+i*.575+(row%2)*.12
            if x>2.5:continue
            bevel_box('Limestone block',(x,.14+row*.19,side*2.28),(.55,.175,.14),'stoneLight' if i%3 else 'stone',amount=.024)
bevel_box('Lime plaster walls',(0,1.7,0),(4.8,2.95,4.1),'plaster',amount=.09)
# Front and rear gables with actual thickness.
for z in [-2.03,2.03]:
    mesh('Plaster gable',[(-2.4,3.12,z-.04),(2.4,3.12,z-.04),(0,4.70,z-.04),(-2.4,3.12,z+.04),(2.4,3.12,z+.04),(0,4.70,z+.04)],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],'plaster','cottage')
for x in [-2.35,2.35]:
    for z in [-2.04,2.04]:bevel_box('Corner timber',(x,1.76,z),(.13,2.85,.13),'ivory')
bevel_box('Front sill trim',(0,.49,2.11),(4.8,.16,.13),'ivory')
# Each roof tile is a curved, overlapping ceramic surface with a rounded lip.
for s in [-1,1]:
    for row in range(7):
        for col in range(10):
            vs=[];fs=[]
            for j in range(6):
                t=j/5;xx=(row+t*1.13)*.405;yy=4.95-xx*.64+.028*sin(pi*t)
                for i in range(7):
                    u=i/6;z=-2.55+col*.51+u*.54; arch=.035*sin(pi*u)
                    vs.append((s*xx,yy+arch,z))
            for j in range(5):
                for i in range(6):a=j*7+i;fs.append((a,a+1,a+8,a+7))
            mesh('Curved clay shingle',vs,fs,['roof','roofLight','roofDark'][(row*3+col)%3],'cottage')
    for z in [-2.62,2.62]:line('Gable fascia',[(0,4.94,z),(s*1.45,4.02,z),(s*2.88,3.12,z)],.07,'ivory',model='cottage',steps=1)
    line('Rain gutter',[(s*2.84,3.10,-2.55),(s*2.84,3.10,2.55)],.055,'timber',model='cottage',steps=1)
for i in range(11):
    sweep('Ridge cap',[(-.12,4.91,-2.65+i*.49,.028,.028),(0,5.02,-2.65+i*.49,.04,.04),(.12,4.91,-2.65+i*.49,.028,.028)],'roofLight','cottage',n=12,steps=4)
for side in [-1,1]:
    x=side*1.64
    # Arched windows and mullions.
    shape=[(x-.39,1.30,2.14),(x+.39,1.30,2.14),(x+.39,2.02,2.14)]
    shape += [(x+.39*cos(a),2.02+.39*sin(a),2.14) for a in [j*pi/16 for j in range(1,17)]]
    mesh('Arched glazing',shape,[tuple(range(len(shape)))],'windowGlass','cottage')
    line('Window frame',shape+[shape[0]],.045,'ivory',model='cottage',steps=1)
    line('Window mullion',[(x,1.32,2.18),(x,2.37,2.18)],.025,'ivory',model='cottage')
    line('Window crossbar',[(x-.38,1.91,2.18),(x+.38,1.91,2.18)],.025,'ivory',model='cottage')
    bevel_box('Window ledge',(x,1.26,2.23),(1.1,.11,.35),'ivory')
    for sx in [-1,1]:
        shutter=x+sx*.62
        bevel_box('Wooden shutter',(shutter,1.83,2.12),(.34,1.18,.09),'paintWood')
        for y in [1.39+j*.12 for j in range(8)]:bevel_box('Shutter louver',(shutter,y,2.18),(.29,.065,.055),'paintWood',amount=.012)
        for y in [1.45,2.14]:bevel_box('Shutter hinge',(shutter-sx*.11,y,2.22),(.11,.025,.025),'leather',amount=.005)
    bevel_box('Window planter',(x,1.07,2.28),(1.02,.23,.43),'timber')
for x in [-.74,.74]:bevel_box('Door jamb',(x,1.44,2.17),(.14,2.64,.22),'ivory')
bevel_box('Door lintel',(0,2.75,2.17),(1.62,.19,.22),'ivory')
bevel_box('Door threshold',(0,.27,2.45),(1.65,.16,.66),'stoneLight')
# Attic window and chimney distinguish the roof silhouette.
line('Attic round frame',[(.29*sin(a),3.77+.29*cos(a),2.12) for a in [j*2*pi/40 for j in range(41)]],.043,'ivory',model='cottage',steps=1)
mesh('Attic glass',[(.27*sin(a),3.77+.27*cos(a),2.12) for a in [j*2*pi/40 for j in range(40)]],[tuple(range(40))],'windowGlass','cottage')
line('Attic cross',[(0,3.49,2.17),(0,4.05,2.17)],.018,'ivory',model='cottage')
for row in range(6):
    bevel_box('Chimney brick course',(-1.55,4.14+row*.19,-1.25),(.65,.175,.64),'roofDark' if row%2 else 'stone',amount=.025)
bevel_box('Chimney cap',(-1.55,5.25,-1.25),(.80,.12,.79),'stoneLight',amount=.035)
bevel_box('Chimney opening',(-1.55,5.316,-1.25),(.45,.01,.44),'nose',amount=.01)
