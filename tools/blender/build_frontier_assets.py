# WestWard Frontier asset builders. Run through the Blender MCP (see README):
#   import sys; sys.path.insert(0, ".../tools/blender")
#   import westward_kit, build_frontier_assets, importlib
#   importlib.reload(westward_kit); importlib.reload(build_frontier_assets)
#   result = build_frontier_assets.build_all()
#
# Each builder clears the scene, constructs one low-poly asset from the shared
# kit, and exports a .glb to public/models/. Flat-shaded, chunky silhouettes for
# the ink-edge + cel NPR pass; flat palette colours (loader re-skins to toon).

import math
import random

import bpy

from westward_kit import (
    PALETTE,
    add_box,
    bake_albedo,
    clear_scene,
    export_glb,
    join_as,
    make_mat,
    origin_to_base,
    shade_flat,
)


def _cyl(verts, radius, depth, location, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=location)
    o = bpy.context.active_object
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


# --- Western false-front building -------------------------------------------
def build_building(name, width=1.4, depth=1.55, body_h=1.85, front_h=2.55, windows=2, wall_key="wall"):
    clear_scene()
    wall = make_mat("wall", PALETTE[wall_key])
    roof = make_mat("roof", PALETTE["roof"])
    trim = make_mat("trim", PALETTE["wood_dark"])
    parts = []

    body = add_box((width, depth, body_h), (0, 0, body_h / 2), wall, "body")
    parts.append(body)

    # shed roof slab, sloped toward the back
    roof_slab = add_box((width * 1.04, depth * 1.04, 0.12), (0, -0.05, body_h + 0.02), roof, "roof")
    roof_slab.rotation_euler = (math.radians(7), 0, 0)
    parts.append(roof_slab)

    # tall flat false front facing +Y, taller than the body (the western look)
    ff = add_box((width * 1.02, 0.16, front_h), (0, depth / 2 - 0.02, front_h / 2), wall, "falsefront")
    parts.append(ff)
    cornice = add_box((width * 1.1, 0.24, 0.14), (0, depth / 2, front_h - 0.08), trim, "cornice")
    parts.append(cornice)

    # door + windows as recessed dark panels on the facade
    parts.append(add_box((0.36, 0.06, 0.95), (0, depth / 2 + 0.06, 0.49), trim, "door"))
    if windows >= 1:
        xs = [-0.44, 0.44] if windows >= 2 else [0.0]
        for dx in xs:
            parts.append(add_box((0.32, 0.06, 0.36), (dx, depth / 2 + 0.06, 1.2), trim, "win"))

    # porch awning + two posts
    parts.append(add_box((width * 1.16, 0.55, 0.06), (0, depth / 2 + 0.33, body_h * 0.8), roof, "awning"))
    for dx in (-width * 0.5, width * 0.5):
        parts.append(add_box((0.08, 0.08, body_h * 0.8), (dx, depth / 2 + 0.56, body_h * 0.4), trim, "post"))

    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    bake_albedo(obj)  # UV + baked weathering/grime → textured-cel walls
    return export_glb(obj, name)


# --- Broken wagon (hero) ----------------------------------------------------
def build_wagon(name="wagon"):
    clear_scene()
    wood = make_mat("wagonwood", PALETTE["wagon"])
    dark = make_mat("wagondark", PALETTE["wheel"])
    parts = []

    parts.append(add_box((1.3, 0.72, 0.32), (0, 0, 0.52), wood, "bed"))
    for sy in (-0.34, 0.34):
        parts.append(add_box((1.3, 0.06, 0.24), (0, sy, 0.74), wood, "rail"))
    parts.append(add_box((0.06, 0.72, 0.34), (-0.62, 0, 0.7), wood, "headboard"))
    parts.append(add_box((0.9, 0.08, 0.08), (0.95, 0, 0.34), wood, "tongue"))  # wagon tongue

    # 3 wheels mounted (axle along Y), 1 broken wheel splayed on the ground
    for x, y in ((0.45, -0.4), (0.45, 0.4), (-0.45, -0.4)):
        _cyl(12, 0.4, 0.09, (x, y, 0.4), dark, rot=(math.radians(90), 0, 0))
        parts.append(bpy.context.active_object)
    broken = _cyl(12, 0.4, 0.09, (-0.78, 0.62, 0.12), dark, rot=(math.radians(18), math.radians(74), 0))
    parts.append(broken)

    obj = join_as(parts, name)
    obj.rotation_euler = (0, math.radians(-7), 0)  # tilt: stuck/broken
    bpy.ops.object.transform_apply(rotation=True)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


# --- Saguaro cactus ---------------------------------------------------------
def build_cactus(name="cactus"):
    clear_scene()
    green = make_mat("cactus", PALETTE["cactus"])
    parts = [_cyl(8, 0.16, 1.3, (0, 0, 0.65), green)]

    def arm(side, basez, up_len):
        parts.append(_cyl(6, 0.075, 0.32, (side * 0.18, 0, basez), green, rot=(0, math.radians(90), 0)))
        parts.append(_cyl(6, 0.075, up_len, (side * 0.32, 0, basez + up_len / 2), green))

    arm(1, 0.82, 0.48)
    arm(-1, 0.64, 0.4)
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


# --- Bare dead tree ---------------------------------------------------------
def build_dead_tree(name="dead_tree"):
    clear_scene()
    bark = make_mat("bark", PALETTE["bark"])

    def limb(loc, rot, length, rbot, rtop, verts=6):
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=rbot, radius2=rtop, depth=length, location=loc)
        o = bpy.context.active_object
        o.rotation_euler = rot
        o.data.materials.append(bark)
        return o

    parts = [limb((0, 0, 0.85), (0, 0, 0), 1.7, 0.16, 0.07)]
    for ang, tilt, ln, h in ((0.5, 0.7, 0.8, 1.4), (3.5, 0.8, 0.7, 1.25), (1.9, 0.6, 0.9, 1.55), (5.2, 0.9, 0.55, 1.2)):
        bx, by = math.cos(ang) * 0.18, math.sin(ang) * 0.18
        parts.append(limb((bx, by, h), (tilt * math.cos(ang + 1.57), tilt * math.sin(ang + 1.57), 0), ln, 0.06, 0.015))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


# --- Angular boulder --------------------------------------------------------
def build_rock(name="rock", r=0.5, seed=1):
    clear_scene()
    stone = make_mat("rock", PALETTE["rock" if name == "rock" else "rock_dark"])
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r, location=(0, 0, r * 0.65))
    o = bpy.context.active_object
    rng = random.Random(seed)
    for v in o.data.vertices:
        v.co.x += rng.uniform(-0.14, 0.14) * r
        v.co.y += rng.uniform(-0.14, 0.14) * r
        v.co.z += rng.uniform(-0.08, 0.12) * r
    for v in o.data.vertices:  # flatten the base so it sits
        if v.co.z < -r * 0.25:
            v.co.z = -r * 0.25
    o.data.materials.append(stone)
    shade_flat(o)
    origin_to_base(o)
    return export_glb(o, name)


# ============================ Batch B ======================================

# --- Mesa / cliff (the boundary-ring backdrop) ------------------------------
def build_mesa(name="mesa", w=2.9, h=3.5):
    clear_scene()
    rock = make_mat("mesa", PALETTE["mesa"])
    rock2 = make_mat("mesa2", PALETTE["mesa_warm"])
    parts = []
    tiers = [(w, h * 0.52, 0.0), (w * 0.74, h * 0.32, h * 0.52), (w * 0.46, h * 0.24, h * 0.84)]
    for i, (tw, th, tz) in enumerate(tiers):
        jitter = 0.06 * w * (1 if i == 1 else -1)
        b = add_box((tw, tw * 0.82, th), (jitter, jitter * 0.5, tz + th / 2), rock if i % 2 == 0 else rock2, f"tier{i}")
        parts.append(b)
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_cliff(name="cliff", w=2.2, h=2.6, d=1.3):
    clear_scene()
    rock = make_mat("cliff", PALETTE["mesa"])
    parts = [add_box((w, d, h * 0.7), (0, 0, h * 0.35), rock, "base")]
    parts.append(add_box((w * 0.7, d * 0.8, h * 0.4), (w * 0.12, 0, h * 0.7 + h * 0.2), rock, "cap"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


# --- Watchtower / landmark (tall hero silhouette) ---------------------------
def build_watchtower(name="watchtower"):
    clear_scene()
    wood = make_mat("twr", PALETTE["wood"])
    dark = make_mat("twrdark", PALETTE["post"])
    roof = make_mat("twroof", PALETTE["roof"])
    glow = make_mat("beacon", PALETTE["gold"], emissive=PALETTE["amber"], emissive_strength=1.8)
    parts = []
    H, s = 4.2, 0.55
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        parts.append(add_box((0.14, 0.14, H), (sx * s, sy * s, H / 2), dark, "leg"))
    for gz in (H * 0.34, H * 0.68):
        parts.append(add_box((s * 2 + 0.14, 0.07, 0.07), (0, -s, gz), wood, "girt"))
        parts.append(add_box((s * 2 + 0.14, 0.07, 0.07), (0, s, gz), wood, "girt"))
        parts.append(add_box((0.07, s * 2 + 0.14, 0.07), (-s, 0, gz), wood, "girt"))
        parts.append(add_box((0.07, s * 2 + 0.14, 0.07), (s, 0, gz), wood, "girt"))
    parts.append(add_box((s * 2 + 0.5, s * 2 + 0.5, 0.16), (0, 0, H + 0.08), wood, "platform"))
    for ry in (-1, 1):
        parts.append(add_box((s * 2 + 0.5, 0.06, 0.34), (0, ry * (s + 0.22), H + 0.34), dark, "rail"))
    for rx in (-1, 1):
        parts.append(add_box((0.06, s * 2 + 0.5, 0.34), (rx * (s + 0.22), 0, H + 0.34), dark, "rail"))
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=s + 0.5, radius2=0, depth=0.62, location=(0, 0, H + 0.95))
    ro = bpy.context.active_object
    ro.rotation_euler = (0, 0, math.radians(45))
    ro.data.materials.append(roof)
    parts.append(ro)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.3, location=(0, 0, H + 0.55))
    bc = bpy.context.active_object
    bc.data.materials.append(glow)
    parts.append(bc)
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


# --- Lamp post --------------------------------------------------------------
def build_lamp(name="lamp"):
    clear_scene()
    dark = make_mat("lamppost", PALETTE["wood_dark"])
    cap = make_mat("lampcap", PALETTE["post"])
    glow = make_mat("lampglow", PALETTE["lamp_glow"], emissive=PALETTE["lamp_glow"], emissive_strength=1.1)
    parts = [add_box((0.1, 0.1, 1.7), (0, 0, 0.85), dark, "post")]
    parts.append(add_box((0.46, 0.07, 0.07), (0.18, 0, 1.6), dark, "arm"))
    parts.append(add_box((0.26, 0.26, 0.05), (0.36, 0, 1.72), cap, "lidtop"))
    parts.append(add_box((0.2, 0.2, 0.28), (0.36, 0, 1.55), glow, "pane"))
    parts.append(add_box((0.28, 0.28, 0.05), (0.36, 0, 1.39), cap, "lidbot"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


# --- Job board (hero) -------------------------------------------------------
def build_jobboard(name="jobBoard"):
    clear_scene()
    wood = make_mat("jbwood", PALETTE["wood"])
    roof = make_mat("jbroof", PALETTE["roof"])
    paper = make_mat("jbpaper", "#e8dcc0")
    board = make_mat("jbboard", PALETTE["board"], emissive=PALETTE["board"], emissive_strength=0.8)
    parts = [add_box((0.12, 0.12, 1.5), (-0.6, 0, 0.75), wood, "postL"), add_box((0.12, 0.12, 1.5), (0.6, 0, 0.75), wood, "postR")]
    parts.append(add_box((1.45, 0.1, 1.0), (0, 0, 1.1), board, "board"))
    rs = add_box((1.72, 0.55, 0.08), (0, 0.04, 1.74), roof, "roof")
    rs.rotation_euler = (math.radians(12), 0, 0)
    parts.append(rs)
    parts.append(add_box((0.3, 0.02, 0.24), (-0.34, 0.07, 1.24), paper, "note"))
    parts.append(add_box((0.26, 0.02, 0.2), (0.34, 0.07, 1.0), paper, "note"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


# --- Small structures / props -----------------------------------------------
def build_fence(name="fence", length=1.8):
    clear_scene()
    wood = make_mat("fencewood", PALETTE["wood"])
    parts = [add_box((0.12, 0.12, 0.95), (-length / 2, 0, 0.47), wood, "postL"), add_box((0.12, 0.12, 0.95), (length / 2, 0, 0.47), wood, "postR")]
    for rz in (0.4, 0.72):
        parts.append(add_box((length, 0.07, 0.09), (0, 0, rz), wood, "rail"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_sign(name="sign", post_h=1.05, pw=0.7, ph=0.4):
    clear_scene()
    wood = make_mat("signwood", PALETTE["wood"])
    panel = make_mat("signpanel", PALETTE["sign"], emissive=PALETTE["sign"], emissive_strength=0.35)
    parts = [add_box((0.1, 0.1, post_h), (0, 0, post_h / 2), wood, "post"), add_box((pw, 0.06, ph), (0, 0.04, post_h * 0.86), panel, "plank")]
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_porch(name="porch"):
    clear_scene()
    wood = make_mat("porchwood", PALETTE["wood"])
    roof = make_mat("porchroof", PALETTE["roof"])
    parts = [add_box((1.4, 0.5, 0.16), (0, 0, 0.08), wood, "deck")]
    for dx in (-0.6, 0.6):
        for dy in (-0.18, 0.18):
            parts.append(add_box((0.09, 0.09, 0.55), (dx, dy, 0.3), wood, "post"))
    parts.append(add_box((1.5, 0.6, 0.06), (0, 0, 0.62), roof, "roof"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_cart(name="cart"):
    clear_scene()
    wood = make_mat("cartwood", PALETTE["wagon"])
    dark = make_mat("cartdark", PALETTE["wheel"])
    parts = [add_box((0.9, 0.6, 0.12), (0, 0, 0.4), wood, "bed")]
    for sy in (-0.3, 0.3):
        parts.append(add_box((0.9, 0.05, 0.16), (0, sy, 0.52), wood, "rail"))
    for sy in (-0.34, 0.34):
        _cyl(10, 0.3, 0.07, (0.2, sy, 0.3), dark, rot=(math.radians(90), 0, 0))
        parts.append(bpy.context.active_object)
    parts.append(add_box((0.5, 0.06, 0.06), (-0.6, 0, 0.5), wood, "handle"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_crate(name="crate"):
    clear_scene()
    wood = make_mat("cratewood", PALETTE["wagon"])
    parts = [
        add_box((0.5, 0.5, 0.5), (0, 0, 0.25), wood, "c1"),
        add_box((0.42, 0.42, 0.42), (0.12, 0.1, 0.71), wood, "c2"),
        add_box((0.36, 0.36, 0.36), (-0.14, 0.06, 0.68), wood, "c3"),
    ]
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_batch_b():
    out = {}
    out["mesa"] = build_mesa()
    out["cliff"] = build_cliff()
    out["watchtower"] = build_watchtower()
    out["lamp"] = build_lamp()
    out["jobBoard"] = build_jobboard()
    out["fence"] = build_fence()
    out["sign"] = build_sign()
    out["road"] = build_sign("road", post_h=0.7, pw=0.4, ph=0.26)
    out["porch"] = build_porch()
    out["cart"] = build_cart()
    out["crate"] = build_crate()
    return out


def build_all():
    out = {}
    out["building_saloon"] = build_building("building_saloon", width=1.6, body_h=1.95, front_h=2.7, windows=2, wall_key="saloon")
    out["building_store"] = build_building("building_store", width=1.4, body_h=1.8, front_h=2.45, windows=2, wall_key="wall")
    out["building_house"] = build_building("building_house", width=1.25, body_h=1.7, front_h=2.2, windows=1, wall_key="wall_warm")
    out["building_gate"] = build_building("building_gate", width=1.1, body_h=1.5, front_h=1.9, windows=0, wall_key="wall_dark")
    out["wagon"] = build_wagon()
    out["cactus"] = build_cactus()
    out["dead_tree"] = build_dead_tree()
    out["rock"] = build_rock("rock", r=0.5, seed=3)
    out["boulder"] = build_rock("boulder", r=0.78, seed=7)
    return out
