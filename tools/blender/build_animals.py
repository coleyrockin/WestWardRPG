# WestWard R4.6 animal asset builders — horse_hitched + cattle.
# Run headless:
#   /Applications/Blender.app/Contents/MacOS/Blender --background --python tools/blender/build_animals.py
#
# Each builder clears the scene, constructs one low-poly animal from the shared
# kit, and exports a .glb to public/models/.  Flat-shaded, two materials max;
# origin at ground-level centre; +Y up (export_yup=True matches the kit).
# Scale conventions: hero ≈ 1.8u; horse ≈ 1.5u tall / 1.9u long; cattle ≈ 1.1u tall / 1.7u long.

import math
import sys

import bpy

# Import the shared kit (script may be run from repo root or tools/blender/ dir).
import importlib
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import westward_kit as kit
importlib.reload(kit)

from westward_kit import (
    PALETTE,
    add_box,
    clear_scene,
    export_glb,
    join_as,
    make_mat,
    origin_to_base,
    shade_flat,
)


def _cyl(verts, radius, depth, location, mat, rot=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=radius, depth=depth, location=location
    )
    o = bpy.context.active_object
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(rotation=True)
    o.data.materials.append(mat)
    return o


def _hex_prism(radius, depth, location, mat, rot=(0.0, 0.0, 0.0)):
    """Hexagonal prism — chunky leg substitute."""
    return _cyl(6, radius, depth, location, mat, rot=rot)


# ---------------------------------------------------------------------------
# horse_hitched — ~120 tri, side-profile silhouette, hitched posture
# Proportions: 1.5u tall at withers, 1.9u long body
# Two materials: body (bay dun) and mane/tail/hooves (dark)
# ---------------------------------------------------------------------------
def build_horse_hitched(name="horse_hitched"):
    clear_scene()

    # Bay / dun palette — muted warm brown, reads against the frontier ground
    body_col  = "#8a5f35"   # warm dun / bay brown
    dark_col  = "#3a2416"   # dark chocolate for mane, tail, hooves, lower legs

    body_mat  = make_mat("horse_body",  body_col)
    dark_mat  = make_mat("horse_dark",  dark_col)

    parts = []

    # ── Torso ────────────────────────────────────────────────────────────────
    # Main barrel body: wide, slightly flattened box centred at x=0
    # Body runs along the X axis (side profile = readable length)
    torso = add_box((1.9, 0.52, 0.68), (0.0, 0.0, 0.84), body_mat, "torso")
    parts.append(torso)

    # Chest bulk (slightly wider at front)
    chest = add_box((0.36, 0.54, 0.58), (0.78, 0.0, 0.78), body_mat, "chest")
    parts.append(chest)

    # Rump slight rise at rear
    rump = add_box((0.42, 0.50, 0.52), (-0.78, 0.0, 0.88), body_mat, "rump")
    parts.append(rump)

    # ── Neck (arched forward, hitched posture = head down, neck lower arc) ──
    # Neck: angled slab, front-leaning
    neck_angle = math.radians(32)   # forward lean from vertical
    neck = add_box((0.22, 0.38, 0.62), (1.02, 0.0, 1.24), body_mat, "neck")
    neck.rotation_euler = (0.0, neck_angle, 0.0)
    bpy.ops.object.transform_apply(rotation=True)
    parts.append(neck)

    # Poll / top of neck where head meets
    poll = add_box((0.26, 0.32, 0.18), (1.26, 0.0, 1.52), body_mat, "poll")
    parts.append(poll)

    # ── Head — slightly lowered (hitched horse rests head down) ──────────────
    # Head angle: tilted ~20° below horizontal
    head_x = 1.44
    head_z = 1.30   # lowered vs upright
    head = add_box((0.50, 0.24, 0.28), (head_x, 0.0, head_z), body_mat, "head")
    head.rotation_euler = (0.0, math.radians(18), 0.0)  # nose dips down
    bpy.ops.object.transform_apply(rotation=True)
    parts.append(head)

    # Muzzle / nose block — darker at the end
    muzzle = add_box((0.20, 0.20, 0.16), (1.64, 0.0, 1.18), body_mat, "muzzle")
    parts.append(muzzle)

    # Nostrils as tiny dark slabs (read in silhouette)
    nostril = add_box((0.05, 0.14, 0.05), (1.73, 0.0, 1.20), dark_mat, "nostrils")
    parts.append(nostril)

    # Small triangular ears (upright flat wedges)
    for side in (-0.09, 0.09):
        ear = add_box((0.07, 0.07, 0.14), (1.32, side, 1.60), body_mat, "ear")
        ear.rotation_euler = (0.0, 0.0, math.radians(8 if side > 0 else -8))
        bpy.ops.object.transform_apply(rotation=True)
        parts.append(ear)

    # ── Mane — dark ridge along the top of neck ───────────────────────────────
    mane = add_box((0.52, 0.12, 0.14), (1.12, 0.0, 1.52), dark_mat, "mane")
    mane.rotation_euler = (0.0, math.radians(30), 0.0)
    bpy.ops.object.transform_apply(rotation=True)
    parts.append(mane)

    # Forelock (small tuft above eye)
    forelock = add_box((0.14, 0.10, 0.16), (1.30, 0.0, 1.62), dark_mat, "forelock")
    parts.append(forelock)

    # ── Legs — 4 hexagonal prisms (chunky, readable in silhouette) ───────────
    # Front legs: paired left/right, slightly forward-angled
    front_x = 0.58
    for side in (-0.17, 0.17):
        # Upper leg (cannon + gaskin: two sections fused as one box for budget)
        upper = add_box((0.16, 0.16, 0.44), (front_x, side, 0.56), body_mat, "fleg_upper")
        upper.rotation_euler = (0.0, math.radians(-4), 0.0)
        bpy.ops.object.transform_apply(rotation=True)
        parts.append(upper)
        # Lower leg (darker)
        lower = add_box((0.13, 0.13, 0.36), (front_x + 0.03, side, 0.20), dark_mat, "fleg_lower")
        parts.append(lower)
        # Hoof (flat dark box)
        hoof = add_box((0.16, 0.15, 0.07), (front_x + 0.04, side, 0.04), dark_mat, "fhoof")
        parts.append(hoof)

    # Rear legs: slightly backward angled
    rear_x = -0.58
    for side in (-0.17, 0.17):
        upper = add_box((0.16, 0.16, 0.44), (rear_x, side, 0.56), body_mat, "rleg_upper")
        upper.rotation_euler = (0.0, math.radians(4), 0.0)
        bpy.ops.object.transform_apply(rotation=True)
        parts.append(upper)
        lower = add_box((0.13, 0.13, 0.36), (rear_x - 0.02, side, 0.20), dark_mat, "rleg_lower")
        parts.append(lower)
        hoof = add_box((0.16, 0.15, 0.07), (rear_x - 0.03, side, 0.04), dark_mat, "rhoof")
        parts.append(hoof)

    # ── Tail — dark hanging wedge at rump ────────────────────────────────────
    tail_main = add_box((0.10, 0.12, 0.62), (-1.00, 0.0, 0.80), dark_mat, "tail_main")
    tail_main.rotation_euler = (0.0, math.radians(-20), 0.0)   # hangs back and slightly down
    bpy.ops.object.transform_apply(rotation=True)
    parts.append(tail_main)

    # Tail tuft (wider at the bottom)
    tail_tuft = add_box((0.08, 0.16, 0.22), (-1.10, 0.0, 0.42), dark_mat, "tail_tuft")
    parts.append(tail_tuft)

    # ── Join, shade, origin, export ──────────────────────────────────────────
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    result = export_glb(obj, name, bake=False)
    print(f"[build_animals] {name}: tris={result['tris']}, path={result['path']}, exists={result['exists']}")
    return result


# ---------------------------------------------------------------------------
# cattle — ~50 tri, broadside silhouette, neutral head, longhorn nod
# Proportions: 1.1u tall, 1.7u long
# Two materials: hide (dun/rust) and dark points (horns, hooves, nose)
# ---------------------------------------------------------------------------
def build_cattle(name="cattle"):
    clear_scene()

    hide_col  = "#9a6b3a"   # dun/rust hide — warm ochre-brown
    dark_col  = "#2e1c0e"   # near-black for horns, hooves, nose

    hide_mat  = make_mat("cattle_hide",  hide_col)
    dark_mat  = make_mat("cattle_dark",  dark_col)

    parts = []

    # ── Boxy body mass ────────────────────────────────────────────────────────
    # Cattle body: wide and rectangular — boxy mass is the silhouette read
    body = add_box((1.70, 0.62, 0.70), (0.0, 0.0, 0.78), hide_mat, "body")
    parts.append(body)

    # Shoulder hump (slight rise at front — zebu nod, adds silhouette break)
    hump = add_box((0.36, 0.58, 0.14), (0.60, 0.0, 1.16), hide_mat, "shoulder_hump")
    parts.append(hump)

    # ── Head — neutral (neither raised nor grazing, slightly forward) ─────────
    head = add_box((0.44, 0.36, 0.32), (1.02, 0.0, 0.96), hide_mat, "head")
    parts.append(head)

    # Muzzle / dewlap (wide flat muzzle — cattle characteristic)
    muzzle = add_box((0.22, 0.32, 0.18), (1.24, 0.0, 0.88), hide_mat, "muzzle")
    parts.append(muzzle)

    # Dark nose pad
    nose = add_box((0.07, 0.26, 0.10), (1.34, 0.0, 0.90), dark_mat, "nose")
    parts.append(nose)

    # Ear stubs (side-projected)
    for side in (-0.22, 0.22):
        ear = add_box((0.12, 0.06, 0.09), (1.0, side, 1.14), hide_mat, "ear")
        parts.append(ear)

    # ── Longhorn nod — wide swept horns ──────────────────────────────────────
    # Each horn: a box rotated to sweep outward and slightly upward
    for side, sign in ((-0.23, -1.0), (0.23, 1.0)):
        horn = add_box((0.44, 0.05, 0.05), (1.02, side, 1.20), dark_mat, "horn")
        # Sweep: outward on Y, slight upward tilt
        horn.rotation_euler = (0.0, math.radians(-8 * sign), math.radians(12 * sign))
        bpy.ops.object.transform_apply(rotation=True)
        parts.append(horn)

    # Horn tip (tapered smaller box at the outer end)
    for side, sign in ((-0.45, -1.0), (0.45, 1.0)):
        tip = add_box((0.12, 0.03, 0.03), (1.02, side, 1.22), dark_mat, "horn_tip")
        tip.rotation_euler = (0.0, math.radians(-8 * sign), math.radians(12 * sign))
        bpy.ops.object.transform_apply(rotation=True)
        parts.append(tip)

    # ── Dewlap (hanging throat pouch — silhouette read) ───────────────────────
    dewlap = add_box((0.18, 0.22, 0.28), (0.98, 0.0, 0.58), hide_mat, "dewlap")
    parts.append(dewlap)

    # ── Short stout legs — 4 hexagonal prisms ────────────────────────────────
    for lx, ly in ((0.56, -0.20), (0.56, 0.20), (-0.56, -0.20), (-0.56, 0.20)):
        leg = add_box((0.18, 0.18, 0.50), (lx, ly, 0.26), hide_mat, "leg")
        parts.append(leg)
        hoof = add_box((0.20, 0.20, 0.07), (lx, ly, 0.04), dark_mat, "hoof")
        parts.append(hoof)

    # ── Tail — thin hanging strip ─────────────────────────────────────────────
    tail = add_box((0.07, 0.08, 0.52), (-0.92, 0.0, 0.72), dark_mat, "tail")
    tail.rotation_euler = (0.0, math.radians(-15), 0.0)
    bpy.ops.object.transform_apply(rotation=True)
    parts.append(tail)

    tail_tuft = add_box((0.06, 0.12, 0.14), (-1.02, 0.0, 0.36), dark_mat, "tail_tuft")
    parts.append(tail_tuft)

    # ── Join, shade, origin, export ──────────────────────────────────────────
    obj = join_as(parts, name)
    shade_flat(obj)
    origin_to_base(obj)
    result = export_glb(obj, name, bake=False)
    print(f"[build_animals] {name}: tris={result['tris']}, path={result['path']}, exists={result['exists']}")
    return result


def build_all():
    results = {}
    results["horse_hitched"] = build_horse_hitched()
    results["cattle"]        = build_cattle()
    return results


if __name__ == "__main__":
    results = build_all()
    print("[build_animals] All done:", results)
