"""Append the downloaded CC BY Shiba to the compact character runtime.

The Sketchfab source is a static textured mesh. We split its triangles into the
existing articulated pet nodes and bake its texture to vertex colours, avoiding
a runtime GLTF loader and a 1K texture on low-memory tablets.
"""
import bpy
import json
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools" / "imports" / "shiba" / "source" / "unpacked" / "1.FBX"
TEXTURE = SOURCE.parent / "default_Base_Color.png"
MANIFEST = ROOT / "models" / "characters.json"
BINARY = ROOT / "models" / "characters.bin"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(SOURCE))
objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
for obj in objects:
    obj.scale = tuple(value * 100 for value in obj.scale)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def game_point(point):
    # FBX is Z-up and faces +Y; the game is Y-up and faces +Z.
    return Vector((point.x, point.z, point.y))


points = [game_point(obj.matrix_world @ vertex.co) for obj in objects for vertex in obj.data.vertices]
lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
center_x = (lo.x + hi.x) / 2
center_z = (lo.z + hi.z) / 2


def normalized(point):
    p = game_point(point)
    return Vector((p.x - center_x, p.y - lo.y, p.z - center_z))


height = hi.y - lo.y
length = hi.z - lo.z
width = hi.x - lo.x
PIVOTS = {
    "root": (0, 0, 0),
    "body": (0, 0, 0),
    "head": (0, height * .72, length * .31),
    "tail": (0, height * .64, -length * .34),
    "legL": (-width * .22, height * .42, length * .24),
    "legR": (width * .22, height * .42, length * .24),
    "backL": (-width * .24, height * .42, -length * .24),
    "backR": (width * .24, height * .42, -length * .24),
}


SKIN_BONES = ["body", "head", "tail", "legL", "legR", "backL", "backR"]


def smoothstep(a, b, value):
    t = min(1, max(0, (value - a) / (b - a)))
    return t * t * (3 - 2 * t)


def skin(point):
    candidates = {
        "head": smoothstep(length * .08, length * .30, point.z)
        * smoothstep(height * .30, height * .53, point.y),
        "tail": smoothstep(length * .20, length * .40, -point.z)
        * smoothstep(height * .37, height * .58, point.y),
    }
    leg = (1 - smoothstep(height * .30, height * .54, point.y)) * smoothstep(
        width * .07, width * .18, abs(point.x)
    )
    front = point.z > -length * .03
    candidates[("leg" if front else "back") + ("L" if point.x < 0 else "R")] = leg
    bone, weight = max(candidates.items(), key=lambda item: item[1])
    weight = min(.98, weight)
    if weight < .02:
        return (0, 0, 0, 0), (1, 0, 0, 0)
    return (0, SKIN_BONES.index(bone), 0, 0), (1 - weight, weight, 0, 0)


image = bpy.data.images.load(str(TEXTURE), check_existing=True)
pixels = list(image.pixels)
iw, ih = image.size


def sample(uv):
    x = min(iw - 1, max(0, int((uv.x % 1) * (iw - 1))))
    y = min(ih - 1, max(0, int((uv.y % 1) * (ih - 1))))
    i = (y * iw + x) * 4
    return pixels[i : i + 3]


runtime = {
    "position": [],
    "normal": [],
    "color": [],
    "skinIndex": [],
    "skinWeight": [],
    "index": [],
}
for obj in objects:
    mesh = obj.data
    mesh.calc_loop_triangles()
    uv_layer = mesh.uv_layers.active
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    for triangle in mesh.loop_triangles:
        world = [obj.matrix_world @ mesh.vertices[i].co for i in triangle.vertices]
        gp = [normalized(p) for p in world]
        base = len(runtime["position"]) // 3
        for loop_index, point in zip(triangle.loops, gp):
            normal = normal_matrix @ mesh.loops[loop_index].normal
            normal = Vector((normal.x, normal.z, normal.y)).normalized()
            runtime["position"].extend(point)
            runtime["normal"].extend(normal)
            uv = uv_layer.data[loop_index].uv if uv_layer else Vector((.5, .5))
            runtime["color"].extend(sample(uv))
            indices, weights = skin(point)
            runtime["skinIndex"].extend(indices)
            runtime["skinWeight"].extend(weights)
        runtime["index"].extend((base, base + 1, base + 2))

data = json.loads(MANIFEST.read_text(encoding="utf8"))
source_blob = BINARY.read_bytes()
old = [entry for entry in data["meshes"] if entry["model"] == "shiba"]
if old:
    first_offset = min(
        entry[key]["offset"]
        for entry in old
        for key in ("position", "normal", "color", "skinIndex", "skinWeight", "index")
        if key in entry
    )
    source_blob = source_blob[:first_offset]
    data["meshes"] = [entry for entry in data["meshes"] if entry["model"] != "shiba"]
    data["pivots"].pop("shiba", None)
    data["materials"].pop("shibaFur", None)
blob = bytearray(source_blob)


def pack(values, kind):
    while len(blob) % 4:
        blob.append(0)
    offset = len(blob)
    blob.extend(struct.pack("<" + kind * len(values), *values))
    return {"offset": offset, "count": len(values)}


data["meshes"].append(
    {
        "model": "shiba",
        "node": "root",
        "variant": "base",
        "material": "shibaFur",
        "position": pack(runtime["position"], "f"),
        "normal": pack(runtime["normal"], "f"),
        "color": pack(runtime["color"], "f"),
        "skinIndex": pack(runtime["skinIndex"], "H"),
        "skinWeight": pack(runtime["skinWeight"], "f"),
        "index": pack(runtime["index"], "I"),
    }
)
data["pivots"]["shiba"] = PIVOTS
data["materials"]["shibaFur"] = {
    "color": [1, 1, 1],
    "roughness": .72,
    "metalness": 0,
    "tint": False,
}
MANIFEST.write_text(json.dumps(data, separators=(",", ":")), encoding="utf8")
BINARY.write_bytes(blob)
print(
    f"SHIBA COMPLETE: {len(runtime['index']) // 3} triangles, "
    f"{len(SKIN_BONES)} smooth bones, {len(blob)} runtime bytes"
)
