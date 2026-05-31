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
    frame = make_mat("frame", PALETTE["wood"])  # lighter window/door frames
    glass = make_mat("glass", "#202b33")  # dark window glass
    doorw = make_mat("doorw", PALETTE["post"])
    bsign = make_mat("bsign", PALETTE["board"])
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

    fy = depth / 2 + 0.05  # facade front plane

    # board-and-batten siding: thin vertical battens across the false front (the
    # ink-edge pass traces them → reads as wood siding, not a flat box)
    for i in range(5):
        bx = (-0.5 + i / 4.0) * width * 0.98
        parts.append(add_box((0.045, 0.04, front_h * 0.94), (bx, fy + 0.02, front_h / 2), trim, "batten"))

    # framed door with a handle
    parts.append(add_box((0.46, 0.05, 1.04), (0, fy, 0.52), frame, "doorframe"))
    parts.append(add_box((0.36, 0.05, 0.92), (0, fy + 0.02, 0.49), doorw, "door"))
    parts.append(add_box((0.05, 0.06, 0.05), (0.12, fy + 0.05, 0.5), frame, "handle"))

    # framed windows: light frame + dark glass + a mullion cross
    if windows >= 1:
        xs = [-0.44, 0.44] if windows >= 2 else [0.0]
        for dx in xs:
            parts.append(add_box((0.4, 0.05, 0.46), (dx, fy, 1.2), frame, "winframe"))
            parts.append(add_box((0.3, 0.05, 0.36), (dx, fy + 0.02, 1.2), glass, "winglass"))
            parts.append(add_box((0.04, 0.06, 0.36), (dx, fy + 0.04, 1.2), frame, "winmullV"))
            parts.append(add_box((0.3, 0.06, 0.04), (dx, fy + 0.04, 1.2), frame, "winmullH"))

    # hanging shop sign for the larger fronts (saloon / store)
    if windows >= 2:
        parts.append(add_box((width * 0.7, 0.05, 0.26), (0, depth / 2 + 0.52, body_h * 0.74), bsign, "sign"))

    # porch awning + two posts
    parts.append(add_box((width * 1.16, 0.55, 0.06), (0, depth / 2 + 0.33, body_h * 0.8), roof, "awning"))
    for dx in (-width * 0.5, width * 0.5):
        parts.append(add_box((0.08, 0.08, body_h * 0.8), (dx, depth / 2 + 0.56, body_h * 0.4), trim, "post"))

    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)  # UV + baked weathering/grime → textured-cel walls


# --- Broken wagon (hero) ----------------------------------------------------
def build_wagon(name="wagon"):
    clear_scene()
    wood = make_mat("wagonwood", PALETTE["wagon"])
    dark = make_mat("wagondark", PALETTE["wheel"])
    parts = []

    parts.append(add_box((1.3, 0.72, 0.32), (0, 0, 0.52), wood, "bed"))
    # plank seams across the bed top
    for bx in (-0.45, -0.15, 0.15, 0.45):
        parts.append(add_box((0.03, 0.7, 0.02), (bx, 0, 0.69), dark, "plank"))
    for sy in (-0.34, 0.34):
        parts.append(add_box((1.3, 0.06, 0.24), (0, sy, 0.74), wood, "rail"))
    parts.append(add_box((0.06, 0.72, 0.34), (-0.62, 0, 0.7), wood, "headboard"))
    parts.append(add_box((0.9, 0.08, 0.08), (0.95, 0, 0.34), wood, "tongue"))  # wagon tongue

    # wheels: rim + hub + crossed spokes; one broken wheel splayed on the ground
    def wheel(x, y, broken=False):
        rot = (math.radians(18), math.radians(74), 0) if broken else (math.radians(90), 0, 0)
        z = 0.12 if broken else 0.4
        _cyl(12, 0.4, 0.09, (x, y, z), dark, rot=rot)
        parts.append(bpy.context.active_object)
        if not broken:
            _cyl(8, 0.12, 0.11, (x, y, z), wood, rot=rot)  # hub
            parts.append(bpy.context.active_object)
            for a in (0.0, math.radians(90)):  # crossed spokes in the wheel plane
                sp = add_box((0.045, 0.045, 0.72), (x, y, z), wood, "spoke")
                sp.rotation_euler = (0, a, 0)
                parts.append(sp)

    for x, y in ((0.45, -0.4), (0.45, 0.4), (-0.45, -0.4)):
        wheel(x, y)
    wheel(-0.78, 0.62, broken=True)

    obj = join_as(parts, name)
    obj.rotation_euler = (0, math.radians(-7), 0)  # tilt: stuck/broken
    bpy.ops.object.transform_apply(rotation=True)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


# --- Saguaro cactus ---------------------------------------------------------
def build_cactus(name="cactus"):
    clear_scene()
    green = make_mat("cactus", PALETTE["cactus"])
    ribm = make_mat("cactusrib", PALETTE["cactus_dark"])
    parts = [_cyl(8, 0.16, 1.3, (0, 0, 0.65), green)]
    # vertical ribs down the trunk (saguaro ridges the ink pass traces)
    for k in range(6):
        ang = k * math.pi / 3
        parts.append(add_box((0.025, 0.025, 1.26), (math.cos(ang) * 0.15, math.sin(ang) * 0.15, 0.65), ribm, "rib"))

    def arm(side, basez, up_len):
        parts.append(_cyl(6, 0.075, 0.32, (side * 0.18, 0, basez), green, rot=(0, math.radians(90), 0)))
        parts.append(_cyl(6, 0.075, up_len, (side * 0.32, 0, basez + up_len / 2), green))

    arm(1, 0.82, 0.48)
    arm(-1, 0.64, 0.4)
    arm(1, 1.04, 0.28)  # third, higher arm
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


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
    return export_glb(obj, name, bake=True)


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
    return export_glb(o, name, bake=True)


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
    return export_glb(obj, name, bake=True)


def build_cliff(name="cliff", w=2.2, h=2.6, d=1.3):
    clear_scene()
    rock = make_mat("cliff", PALETTE["mesa"])
    parts = [add_box((w, d, h * 0.7), (0, 0, h * 0.35), rock, "base")]
    parts.append(add_box((w * 0.7, d * 0.8, h * 0.4), (w * 0.12, 0, h * 0.7 + h * 0.2), rock, "cap"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


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
    cx = 0.36
    parts = [add_box((0.1, 0.1, 1.7), (0, 0, 0.85), dark, "post")]
    parts.append(add_box((0.46, 0.07, 0.07), (0.18, 0, 1.6), dark, "arm"))
    parts.append(add_box((0.05, 0.05, 0.12), (cx, 0, 1.66), dark, "hook"))
    parts.append(add_box((0.28, 0.28, 0.04), (cx, 0, 1.71), cap, "lidtop"))
    # lantern cage: 4 corner posts around the glow pane
    for ox, oy in ((-0.1, -0.1), (0.1, -0.1), (-0.1, 0.1), (0.1, 0.1)):
        parts.append(add_box((0.025, 0.025, 0.3), (cx + ox, oy, 1.55), dark, "cagepost"))
    parts.append(add_box((0.2, 0.2, 0.26), (cx, 0, 1.55), glow, "pane"))
    parts.append(add_box((0.28, 0.28, 0.04), (cx, 0, 1.4), cap, "lidbot"))
    # peaked cap on top
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.2, radius2=0, depth=0.14, location=(cx, 0, 1.8))
    pk = bpy.context.active_object
    pk.rotation_euler = (0, 0, math.radians(45))
    pk.data.materials.append(cap)
    parts.append(pk)
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
    return export_glb(obj, name, bake=True)


def build_sign(name="sign", post_h=1.05, pw=0.7, ph=0.4):
    clear_scene()
    wood = make_mat("signwood", PALETTE["wood"])
    frame = make_mat("signframe", PALETTE["wood_dark"])
    panel = make_mat("signpanel", PALETTE["sign"], emissive=PALETTE["sign"], emissive_strength=0.35)
    z = post_h * 0.86
    parts = [
        add_box((0.1, 0.1, post_h), (0, 0, post_h / 2), wood, "post"),
        add_box((pw + 0.08, 0.05, ph + 0.08), (0, 0.02, z), frame, "frame"),
        add_box((pw, 0.06, ph), (0, 0.05, z), panel, "plank"),
        add_box((0.06, 0.06, 0.2), (0, 0.02, z + ph / 2 + 0.06), wood, "bracket"),
    ]
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
    return export_glb(obj, name, bake=True)


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
    return export_glb(obj, name, bake=True)


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
    return export_glb(obj, name, bake=True)


def build_road_plank(name="road_plank"):
    clear_scene()
    dust = make_mat("dustroad", "#b99461")
    rut = make_mat("rut", "#7a5f38")
    edge = make_mat("edge", "#d6bf8f")
    parts = [
        add_box((3.2, 0.92, 0.055), (0, 0, 0.027), dust, "packed_dust"),
        add_box((3.15, 0.08, 0.07), (0, -0.31, 0.06), rut, "rut_l"),
        add_box((3.15, 0.08, 0.07), (0, 0.31, 0.06), rut, "rut_r"),
        add_box((3.2, 0.04, 0.08), (0, -0.48, 0.07), edge, "edge_l"),
        add_box((3.2, 0.04, 0.08), (0, 0.48, 0.07), edge, "edge_r"),
    ]
    for x in (-1.1, 0.0, 1.1):
        parts.append(add_box((0.035, 0.82, 0.075), (x, 0, 0.078), rut, "cross_wear"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


def build_jobboard_v2(name="jobBoard_v2"):
    clear_scene()
    wood = make_mat("jbwood", PALETTE["wood"])
    dark = make_mat("jbdark", PALETTE["wood_dark"])
    roof = make_mat("jbroof", PALETTE["roof"])
    paper = make_mat("jbpaper", "#e8dcc0")
    board = make_mat("jbboard", PALETTE["board"], emissive=PALETTE["board"], emissive_strength=0.9)
    glow = make_mat("jblamp", PALETTE["lamp_glow"], emissive=PALETTE["lamp_glow"], emissive_strength=1.35)
    parts = [
        add_box((0.16, 0.16, 1.75), (-0.72, 0, 0.875), wood, "post_l"),
        add_box((0.16, 0.16, 1.75), (0.72, 0, 0.875), wood, "post_r"),
        add_box((1.72, 0.12, 1.08), (0, 0, 1.16), board, "board"),
        add_box((1.92, 0.14, 0.16), (0, 0.02, 1.78), roof, "top_beam"),
        add_box((1.85, 0.44, 0.08), (0, 0.06, 1.92), roof, "sloped_roof"),
        add_box((0.36, 0.025, 0.28), (-0.42, 0.08, 1.31), paper, "bounty_note"),
        add_box((0.3, 0.025, 0.24), (0.28, 0.08, 1.08), paper, "survey_note"),
        add_box((0.22, 0.22, 0.24), (0, 0.13, 1.78), glow, "lamp"),
        add_box((1.5, 0.06, 0.08), (0, 0.08, 0.62), dark, "lower_rail"),
    ]
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_lamp_variant(name="lamp_tall", height=2.05, arm=0.52):
    clear_scene()
    dark = make_mat("lamppost", PALETTE["wood_dark"])
    cap = make_mat("lampcap", PALETTE["post"])
    glow = make_mat("lampglow", PALETTE["lamp_glow"], emissive=PALETTE["lamp_glow"], emissive_strength=1.0)
    cx = arm
    parts = [
        add_box((0.1, 0.1, height), (0, 0, height / 2), dark, "post"),
        add_box((arm + 0.1, 0.07, 0.07), (arm / 2, 0, height - 0.14), dark, "arm"),
        add_box((0.05, 0.05, 0.14), (cx, 0, height - 0.08), dark, "hook"),
        add_box((0.25, 0.25, 0.24), (cx, 0, height - 0.28), glow, "pane"),
        add_box((0.32, 0.32, 0.05), (cx, 0, height - 0.12), cap, "cap_top"),
        add_box((0.32, 0.32, 0.05), (cx, 0, height - 0.43), cap, "cap_bottom"),
    ]
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_saloon_facade(name="saloon_facade"):
    clear_scene()
    wall = make_mat("saloonwall", PALETTE["saloon"])
    roof = make_mat("roof", PALETTE["roof"])
    trim = make_mat("trim", PALETTE["wood_dark"])
    sign = make_mat("sign", PALETTE["board"], emissive=PALETTE["board"], emissive_strength=0.45)
    parts = [
        add_box((2.2, 0.18, 2.6), (0, 0, 1.3), wall, "false_front"),
        add_box((2.4, 0.28, 0.16), (0, 0.02, 2.54), trim, "cornice"),
        add_box((2.35, 0.72, 0.08), (0, 0.34, 1.88), roof, "porch_roof"),
        add_box((1.45, 0.08, 0.32), (0, 0.48, 1.82), sign, "saloon_sign"),
    ]
    for dx in (-0.82, 0.82):
        parts.append(add_box((0.1, 0.1, 1.8), (dx, 0.62, 0.9), trim, "porch_post"))
    for dx in (-0.45, 0.45):
        parts.append(add_box((0.34, 0.06, 0.44), (dx, 0.11, 1.16), trim, "dark_window"))
    parts.append(add_box((0.5, 0.07, 1.0), (0, 0.12, 0.5), trim, "door"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


def build_wagon_salvage(name="wagon_salvage"):
    clear_scene()
    wood = make_mat("salvagewood", PALETTE["wagon"])
    paper = make_mat("survey", "#e8dcc0")
    dark = make_mat("dark", PALETTE["wheel"])
    parts = [
        add_box((0.82, 0.16, 0.12), (-0.24, 0, 0.08), wood, "loose_plank"),
        add_box((0.72, 0.12, 0.12), (0.18, 0.18, 0.1), wood, "loose_plank_2"),
        add_box((0.42, 0.03, 0.3), (0.02, 0.02, 0.22), paper, "map_scrap"),
    ]
    _cyl(10, 0.26, 0.06, (0.5, -0.22, 0.12), dark, rot=(math.radians(90), 0, 0))
    parts.append(bpy.context.active_object)
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


def build_mesa_silhouette(name="mesa_silhouette"):
    return build_mesa(name, w=4.8, h=4.4)


def build_slime_tell_asset(name="slime_tell"):
    clear_scene()
    slime = make_mat("slime", "#75d06b", emissive="#2a6820", emissive_strength=0.9)
    reed = make_mat("reed", PALETTE["cactus_dark"])
    parts = []
    for i, x in enumerate((-0.65, -0.2, 0.25, 0.7)):
        parts.append(add_box((0.56 - i * 0.05, 0.16, 0.035), (x, math.sin(i) * 0.12, 0.025), slime, "glow_slick"))
    for x, y, h in ((-0.45, 0.22, 0.6), (0.08, -0.22, 0.7), (0.55, 0.18, 0.5)):
        parts.append(add_box((0.045, 0.045, h), (x, y, h / 2), reed, "reed"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_jobboard_max(name="jobBoard_max"):
    clear_scene()
    wood = make_mat("jbwood", PALETTE["wood"])
    dark = make_mat("jbdark", PALETTE["wood_dark"])
    roof = make_mat("jbroof", PALETTE["roof"])
    paper = make_mat("jbpaper", "#eadbb8")
    red = make_mat("seal", "#9d3f2e")
    board = make_mat("jbboard", "#c78a3f", emissive="#c78a3f", emissive_strength=0.55)
    glow = make_mat("jblamp", PALETTE["lamp_glow"], emissive=PALETTE["lamp_glow"], emissive_strength=0.85)
    parts = [
        add_box((0.18, 0.18, 1.9), (-0.78, 0, 0.95), wood, "post_l"),
        add_box((0.18, 0.18, 1.9), (0.78, 0, 0.95), wood, "post_r"),
        add_box((1.86, 0.14, 1.15), (0, 0, 1.2), board, "board"),
        add_box((2.08, 0.18, 0.16), (0, 0.04, 1.9), dark, "top_beam"),
        add_box((2.0, 0.62, 0.09), (0, 0.1, 2.06), roof, "weather_awning"),
        add_box((1.62, 0.08, 0.1), (0, 0.1, 0.64), dark, "lower_rail"),
        add_box((0.62, 0.03, 0.36), (-0.44, 0.09, 1.34), paper, "bounty_note_big"),
        add_box((0.42, 0.03, 0.28), (0.38, 0.09, 1.08), paper, "survey_note"),
        add_box((0.28, 0.03, 0.2), (0.08, 0.09, 1.42), paper, "road_sketch"),
        add_box((0.07, 0.035, 0.07), (-0.18, 0.12, 1.25), red, "wax_seal"),
        add_box((0.26, 0.26, 0.28), (0, 0.18, 1.86), glow, "lamp"),
    ]
    for x in (-0.68, -0.34, 0.34, 0.68):
        parts.append(add_box((0.04, 0.04, 0.24), (x, 0.1, 2.0), dark, "awning_bracket"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_road_rut_strip(name="road_rut_strip"):
    clear_scene()
    dust = make_mat("dust", "#8f6338")
    rut = make_mat("rut", "#563d24")
    pebble = make_mat("pebble", "#6e5d4d")
    parts = [
        add_box((4.2, 0.82, 0.05), (0, 0, 0.025), dust, "packed_dust"),
        add_box((4.0, 0.1, 0.075), (0, -0.27, 0.065), rut, "wagon_rut_l"),
        add_box((4.0, 0.1, 0.075), (0, 0.27, 0.065), rut, "wagon_rut_r"),
    ]
    for x in (-1.65, -0.8, 0.2, 1.25, 1.75):
        parts.append(add_box((0.16, 0.12, 0.06), (x, random.choice([-0.42, 0.42]), 0.08), pebble, "road_stone"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


def build_broken_fence_scrap(name="broken_fence_scrap"):
    clear_scene()
    wood = make_mat("scrapwood", PALETTE["wood"])
    dark = make_mat("scrapdark", PALETTE["wood_dark"])
    parts = [
        add_box((0.13, 0.13, 0.82), (-0.6, 0, 0.41), wood, "post_a"),
        add_box((0.13, 0.13, 0.58), (0.62, 0.08, 0.29), wood, "post_b"),
        add_box((1.32, 0.08, 0.1), (0, 0, 0.55), wood, "rail_low"),
        add_box((0.92, 0.07, 0.08), (0.14, 0.04, 0.82), dark, "broken_rail"),
        add_box((0.5, 0.06, 0.08), (0.84, -0.08, 0.32), dark, "fallen_rail"),
    ]
    parts[-2].rotation_euler = (0, 0, math.radians(-8))
    parts[-1].rotation_euler = (0, 0, math.radians(15))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


def build_marsh_slime_cluster(name="marsh_slime_cluster"):
    clear_scene()
    slime = make_mat("slime", "#76d86a", emissive="#2a6820", emissive_strength=1.15)
    reed = make_mat("reed", "#536f35")
    mud = make_mat("mud", "#3c3328")
    parts = [add_box((1.6, 0.62, 0.035), (0, 0, 0.02), mud, "mud_patch")]
    for i, x in enumerate((-0.65, -0.2, 0.22, 0.66)):
        parts.append(add_box((0.58 - i * 0.04, 0.18, 0.045), (x, math.sin(i) * 0.13, 0.06), slime, "slick"))
    for x, y, h, tilt in ((-0.72, 0.3, 0.82, 9), (-0.34, -0.34, 0.62, -14), (0.12, 0.36, 0.94, 6), (0.52, -0.24, 0.72, -8), (0.8, 0.24, 0.55, 12)):
        r = add_box((0.045, 0.045, h), (x, y, h / 2), reed, "reed")
        r.rotation_euler = (math.radians(tilt), 0, 0)
        parts.append(r)
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name)


def build_wagon_wreck_hero(name="wagon_wreck_hero"):
    clear_scene()
    wood = make_mat("wreckwood", PALETTE["wagon"])
    dark = make_mat("wheel", PALETTE["wheel"])
    paper = make_mat("survey", "#e8dcc0")
    parts = [
        add_box((1.45, 0.72, 0.25), (0, 0, 0.5), wood, "tilted_bed"),
        add_box((1.38, 0.08, 0.22), (0, -0.38, 0.72), wood, "side_rail"),
        add_box((0.94, 0.08, 0.18), (0.08, 0.4, 0.72), wood, "broken_side_rail"),
        add_box((0.86, 0.08, 0.08), (0.94, 0, 0.28), wood, "tongue"),
        add_box((0.5, 0.04, 0.32), (-0.32, 0.02, 0.92), paper, "map_scrap"),
        add_box((0.8, 0.1, 0.09), (-0.72, 0.56, 0.1), wood, "fallen_plank"),
    ]
    parts[0].rotation_euler = (0, 0, math.radians(-7))
    for x, y, z, broken in ((0.52, -0.47, 0.35, False), (0.5, 0.47, 0.35, False), (-0.58, -0.45, 0.35, False), (-0.82, 0.55, 0.16, True)):
        rot = (math.radians(90), 0, 0) if not broken else (math.radians(18), math.radians(70), 0)
        _cyl(12, 0.42 if not broken else 0.35, 0.08, (x, y, z), dark, rot=rot)
        parts.append(bpy.context.active_object)
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


def build_town_facade_variant(name="town_facade_warm", wall_key="wall", width=1.8, height=2.8, sign_text=False):
    clear_scene()
    wall = make_mat("wall", PALETTE[wall_key])
    trim = make_mat("trim", PALETTE["wood_dark"])
    roof = make_mat("roof", PALETTE["roof"])
    glass = make_mat("glass", "#20252b")
    sign = make_mat("sign", PALETTE["board"], emissive=PALETTE["board"], emissive_strength=0.22)
    parts = [
        add_box((width, 0.22, height), (0, 0, height / 2), wall, "false_front"),
        add_box((width * 1.08, 0.28, 0.16), (0, 0.04, height - 0.08), trim, "cornice"),
        add_box((width * 1.05, 0.62, 0.08), (0, 0.34, height * 0.68), roof, "awning"),
        add_box((0.5, 0.08, 1.0), (0, 0.13, 0.5), trim, "door"),
    ]
    for dx in (-width * 0.28, width * 0.28):
        parts.append(add_box((0.34, 0.07, 0.42), (dx, 0.13, height * 0.48), glass, "window"))
        parts.append(add_box((0.42, 0.04, 0.5), (dx, 0.11, height * 0.48), trim, "window_frame"))
    if sign_text:
        parts.append(add_box((width * 0.66, 0.08, 0.28), (0, 0.52, height * 0.63), sign, "hanging_sign"))
    for dx in (-width * 0.45, width * 0.45):
        parts.append(add_box((0.08, 0.08, height * 0.62), (dx, 0.58, height * 0.31), trim, "porch_post"))
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


def build_mesa_skyline(name="mesa_skyline"):
    clear_scene()
    rock = make_mat("mesa", "#5b4432")
    warm = make_mat("mesa_warm", "#6a5038")
    parts = [
        add_box((2.1, 0.8, 2.6), (-1.6, 0, 1.3), rock, "spire_a"),
        add_box((2.7, 0.9, 3.2), (0.3, 0.08, 1.6), warm, "spire_b"),
        add_box((1.9, 0.75, 2.2), (2.0, -0.04, 1.1), rock, "spire_c"),
        add_box((5.2, 0.65, 0.42), (0.25, 0, 0.21), rock, "base_shelf"),
    ]
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    return export_glb(obj, name, bake=True)


def build_max_mode_kit():
    out = {}
    out["jobBoard_max"] = build_jobboard_max()
    out["road_rut_strip"] = build_road_rut_strip()
    out["broken_fence_scrap"] = build_broken_fence_scrap()
    out["marsh_slime_cluster"] = build_marsh_slime_cluster()
    out["wagon_wreck_hero"] = build_wagon_wreck_hero()
    out["town_facade_warm"] = build_town_facade_variant("town_facade_warm", "wall_warm", 1.75, 2.65, True)
    out["town_facade_store"] = build_town_facade_variant("town_facade_store", "wall", 1.55, 2.45, True)
    out["town_facade_dark"] = build_town_facade_variant("town_facade_dark", "wall_dark", 1.35, 2.3, False)
    out["mesa_skyline"] = build_mesa_skyline()
    return out


def build_recovery_kit():
    out = {}
    out["road_plank"] = build_road_plank()
    out["jobBoard_v2"] = build_jobboard_v2()
    out["lamp_tall"] = build_lamp_variant("lamp_tall", height=2.05, arm=0.52)
    out["lamp_low"] = build_lamp_variant("lamp_low", height=1.35, arm=0.34)
    out["saloon_facade"] = build_saloon_facade()
    out["wagon_salvage"] = build_wagon_salvage()
    out["mesa_silhouette"] = build_mesa_silhouette()
    out["slime_tell"] = build_slime_tell_asset()
    return out


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
