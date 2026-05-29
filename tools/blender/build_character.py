# WestWard player/NPC character — a low-poly western drifter, rigged + skinned
# with Idle and Walk clips, exported as glTF (character.glb). Run through the
# Blender MCP (see README). Built facing Blender +Y so it faces -Z (forward) in
# the engine, matching the controller's rotation.y = heading-yaw convention.
#
# Skeletal animation is confirmed to render on the WebGPURenderer WebGL2 backend
# (see memory). The web loader uses SkeletonUtils.clone + a per-instance
# AnimationMixer to play/blend these clips.

import bpy
import math
import os

OUT = "/Users/boydroberts/Documents/projects/WestWardRPG/public/models"


def _clean():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions):
        for b in list(coll):
            if b.users == 0:
                coll.remove(b)


def _mat(name, rgb):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (*rgb, 1.0)
    return m


def _box(name, size, loc, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat)
    return o


def build_character(name="character"):
    _clean()
    skin = _mat("skin", (0.79, 0.66, 0.51))
    coat = _mat("coat", (0.42, 0.29, 0.18))
    dark = _mat("dark", (0.17, 0.12, 0.08))
    hat = _mat("hat", (0.16, 0.10, 0.06))

    # body parts (front = +Y). Joined into one mesh for a single SkinnedMesh.
    parts = [
        _box("legL", (0.17, 0.18, 0.72), (-0.12, 0, 0.36), dark),
        _box("legR", (0.17, 0.18, 0.72), (0.12, 0, 0.36), dark),
        _box("torso", (0.44, 0.27, 0.62), (0, 0, 1.02), coat),
        _box("belt", (0.46, 0.29, 0.1), (0, 0, 0.74), dark),
        _box("armL", (0.13, 0.15, 0.56), (-0.3, 0, 1.04), coat),
        _box("armR", (0.13, 0.15, 0.56), (0.3, 0, 1.04), coat),
        _box("head", (0.25, 0.25, 0.25), (0, 0, 1.46), skin),
        _box("hatbrim", (0.54, 0.54, 0.06), (0, 0, 1.58), hat),
        _box("hatcrown", (0.32, 0.32, 0.18), (0, 0, 1.69), hat),
    ]
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.active_object
    body.name = name + "_mesh"

    # armature
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm = bpy.context.active_object
    arm.name = name
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    hips = eb[0]
    hips.name = "hips"
    hips.head = (0, 0, 0.74)
    hips.tail = (0, 0, 0.95)

    def bone(nm, head, tail, parent):
        b = eb.new(nm)
        b.head = head
        b.tail = tail
        b.parent = parent
        b.use_connect = False
        return b

    bone("spine", (0, 0, 0.95), (0, 0, 1.34), hips)
    bone("head", (0, 0, 1.34), (0, 0, 1.6), eb["spine"])
    bone("legL", (-0.12, 0, 0.72), (-0.12, 0, 0.0), hips)
    bone("legR", (0.12, 0, 0.72), (0.12, 0, 0.0), hips)
    bone("armL", (-0.3, 0, 1.3), (-0.3, 0, 0.76), eb["spine"])
    bone("armR", (0.3, 0, 1.3), (0.3, 0, 0.76), eb["spine"])
    bpy.ops.object.mode_set(mode="OBJECT")

    # skin (auto weights)
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")

    # --- animation clips -----------------------------------------------------
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    pb = arm.pose.bones
    for b in pb:
        b.rotation_mode = "XYZ"

    def key(frame, poses):
        bpy.context.scene.frame_set(frame)
        for bn, rot in poses.items():
            pb[bn].rotation_euler = rot
            pb[bn].keyframe_insert("rotation_euler")

    def new_action(nm):
        arm.animation_data_create()
        act = bpy.data.actions.new(nm)
        arm.animation_data.action = act
        return act

    # Walk: legs + arms swing in opposition over 24 frames (one full cycle).
    walk = new_action("Walk")
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 1, 24
    sw = 0.6
    key(1, {"legL": (sw, 0, 0), "legR": (-sw, 0, 0), "armL": (-sw, 0, 0), "armR": (sw, 0, 0), "spine": (0.05, 0, 0)})
    key(12, {"legL": (-sw, 0, 0), "legR": (sw, 0, 0), "armL": (sw, 0, 0), "armR": (-sw, 0, 0), "spine": (0.05, 0, 0)})
    key(24, {"legL": (sw, 0, 0), "legR": (-sw, 0, 0), "armL": (-sw, 0, 0), "armR": (sw, 0, 0), "spine": (0.05, 0, 0)})

    # Idle: gentle spine sway + arm settle over 48 frames.
    idle = new_action("Idle")
    key(1, {"spine": (0, 0, 0), "armL": (0.08, 0, 0.05), "armR": (0.08, 0, -0.05), "legL": (0, 0, 0), "legR": (0, 0, 0)})
    key(24, {"spine": (0.04, 0, 0.02), "armL": (0.02, 0, 0.05), "armR": (0.14, 0, -0.05)})
    key(48, {"spine": (0, 0, 0), "armL": (0.08, 0, 0.05), "armR": (0.08, 0, -0.05)})

    # stash both clips on NLA tracks so the exporter emits both animations
    for act in (idle, walk):
        track = arm.animation_data.nla_tracks.new()
        track.name = act.name
        track.strips.new(act.name, 1, act)
    arm.animation_data.action = None
    bpy.ops.object.mode_set(mode="OBJECT")

    bpy.ops.object.select_all(action="SELECT")
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        use_selection=True,
    )
    return {"path": path, "exists": os.path.exists(path), "actions": [a.name for a in bpy.data.actions]}
