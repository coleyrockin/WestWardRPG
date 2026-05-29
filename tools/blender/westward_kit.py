# WestWard Blender asset kit — shared helpers for authoring the Frontier model
# set. Run through the Blender MCP (see README). These functions are the
# diffable source of truth; the .glb outputs in public/models/ are regenerable.
#
# Conventions (see plan PART 2):
#   - Build Z-up in Blender; export Y-up (glTF) to match the engine (X=x,Z=y,Y=up).
#   - Origin at base-centre so ground placement at y=0 is correct.
#   - Flat-shaded, low-poly, chunky silhouettes; flat Principled base colours from
#     PALETTE (the loader re-skins to the NPR toon material; post does the rest).
#   - 1 Blender unit == 1 world unit; match placeholder dims so manifest.scale≈1.

import bpy
import os

REPO = "/Users/boydroberts/Documents/projects/WestWardRPG"
OUT_DIR = os.path.join(REPO, "public", "models")

# Canonical Frontier palette (from the scene inventory). Authored models pull
# their flat base colours from here so everything stays in-key.
PALETTE = {
    "wall": "#8a6a3e",
    "wall_dark": "#6a4a30",
    "wall_warm": "#caa66c",
    "saloon": "#7a5a36",
    "roof": "#2a1a10",
    "wood": "#4a3526",
    "wood_dark": "#2c2118",
    "post": "#3a2a1c",
    "wagon": "#7a5230",
    "wheel": "#241c10",
    "cactus": "#5c7a3a",
    "cactus_dark": "#4f6a32",
    "bark": "#3e3224",
    "rock": "#6a5f55",
    "rock_dark": "#544c44",
    "mesa": "#5a4636",
    "mesa_warm": "#63503c",
    "gold": "#ffd77b",
    "amber": "#ffb030",
    "lamp_glow": "#ffb866",
    "board": "#d8a84f",
    "sign": "#ffd77b",
}


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4))


def clear_scene():
    """Wipe all objects + orphan data so each build starts clean."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.images):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)


def make_mat(name, hexcolor, rough=0.92, emissive=None, emissive_strength=1.0):
    """Flat Principled material. emissive=hex turns on Emission (loader carries it)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*hex_to_rgb(hexcolor), 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    if emissive is not None:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*hex_to_rgb(emissive), 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emissive_strength
    return m


def add_box(size, location, mat, name="box"):
    """Add a cuboid. size=(sx,sy,sz) full dims. primitive_cube_add(size=1.0)
    makes a 1×1×1 cube, so scale == final dimension."""
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat)
    return o


def shade_flat(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = False


def join_as(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    return obj


def origin_to_base(obj):
    """Move origin to the object's base-centre (min Z, centred XY)."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    # world-space bounds
    xs, ys, zs = [], [], []
    for v in obj.bound_box:
        wv = obj.matrix_world @ __import__("mathutils").Vector(v)
        xs.append(wv.x)
        ys.append(wv.y)
        zs.append(wv.z)
    cx = (min(xs) + max(xs)) / 2.0
    cy = (min(ys) + max(ys)) / 2.0
    bz = min(zs)
    bpy.context.scene.cursor.location = (cx, cy, bz)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.context.scene.cursor.location = (0.0, 0.0, 0.0)


def bake_albedo(obj, px=1024):
    """UV-unwrap + add procedural weathering (noise mottle + a vertical grime
    gradient, darker at the base) to every material, then bake the combined
    albedo to one embedded image. Turns flat-colour kit pieces into textured-cel
    surfaces. Call before export_glb. Returns the baked image."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")

    img = bpy.data.images.new(obj.name + "_albedo", px, px)
    for slot in obj.material_slots:
        m = slot.material
        if not m or not m.use_nodes:
            continue
        nt = m.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        if not bsdf:
            continue
        base = tuple(bsdf.inputs["Base Color"].default_value)
        # vertical grime: generated-Z → ramp (dark base → light top)
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Generated"], sep.inputs[0])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
        ramp.color_ramp.elements[0].color = (0.62, 0.6, 0.58, 1.0)
        ramp.color_ramp.elements[1].color = (1.06, 1.06, 1.06, 1.0)
        grime = nt.nodes.new("ShaderNodeMixRGB")
        grime.blend_type = "MULTIPLY"
        grime.inputs["Fac"].default_value = 1.0
        grime.inputs["Color1"].default_value = base
        nt.links.new(ramp.outputs["Color"], grime.inputs["Color2"])
        # noise mottle on top
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 16.0
        noise.inputs["Detail"].default_value = 5.0
        mottle = nt.nodes.new("ShaderNodeMixRGB")
        mottle.blend_type = "MULTIPLY"
        mottle.inputs["Fac"].default_value = 0.2
        nt.links.new(grime.outputs["Color"], mottle.inputs["Color1"])
        nt.links.new(noise.outputs["Fac"], mottle.inputs["Color2"])
        nt.links.new(mottle.outputs["Color"], bsdf.inputs["Base Color"])
        # bake target (active + selected per material)
        imgn = nt.nodes.new("ShaderNodeTexImage")
        imgn.image = img
        imgn.select = True
        nt.nodes.active = imgn

    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 4
    sc.render.bake.use_pass_direct = False
    sc.render.bake.use_pass_indirect = False
    bpy.ops.object.bake(type="DIFFUSE")

    baked = bpy.data.materials.new(obj.name + "_baked")
    baked.use_nodes = True
    bn = baked.node_tree.nodes.get("Principled BSDF")
    bn.inputs["Roughness"].default_value = 0.95
    binode = baked.node_tree.nodes.new("ShaderNodeTexImage")
    binode.image = img
    baked.node_tree.links.new(binode.outputs["Color"], bn.inputs["Base Color"])
    obj.data.materials.clear()
    obj.data.materials.append(baked)
    return img


def export_glb(obj, name, bake=False):
    # bake=True: UV-unwrap + bake a weathered albedo into the .glb (textured cel).
    # Only for NON-emissive props — baking replaces materials and would drop the
    # emissive the loader turns into glow.
    if bake:
        bake_albedo(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
    )
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    return {"path": path, "exists": os.path.exists(path), "tris": tris}
