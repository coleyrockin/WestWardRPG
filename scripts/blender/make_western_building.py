"""Parametric western false-front building generator for the WestWard 3D town.

Run inside Blender (the project's asset pipeline) once the Blender MCP / a Blender
instance is available:

    blender --background --python scripts/blender/make_western_building.py

or paste into Blender's text editor and Run. It builds three storefront variants
(saloon / store / assay) as low-poly false-front buildings and exports each to
public/models/<name>.glb, ready to drop into src/game/renderer/assetManifest.js.

Design intent (see docs/3d-art-direction.md, pillar 1): a tall flat FALSE FRONT
parapet (the iconic western facade), a body behind it, a porch awning on two posts,
a recessed door, two windows, a cornice trim, and a sign band. Low-poly + strong
silhouette — NOT detailed realism. The .glb material base colours survive the
loader's NPR re-skin, so paint each part a flat colour.

Convention match (assetLoader/instanceModel): origin at the building's base centre,
+Y up, the road-facing side toward -Y (the loader yaws per placement). Keep the
model ~1 unit tall at scale 1 so the manifest `scale`/`heightMul` land it in world.
"""

import bpy
import os

# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def _clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def _mat(name, hex_color):
    """Flat-shaded material; base colour is what the WebGL NPR loader reads."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    r, g, b = (int(hex_color[i:i + 2], 16) / 255.0 for i in (1, 3, 5))
    m.use_nodes = False
    m.diffuse_color = (r, g, b, 1.0)
    return m


def _box(name, size, loc, material):
    """Add a cube scaled to `size`=(x,y,z), centred at `loc`, with a material."""
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj


def _join(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    return obj


# ---------------------------------------------------------------------------
# The building
# ---------------------------------------------------------------------------

def build_western_building(name, palette, width=1.6, depth=1.4, body_h=1.6, front_h=2.5):
    """Return one joined false-front storefront. Units: ~front_h tall at scale 1.

    palette keys: wall, trim, sign, glass, post, door.
    Road-facing side is -Y (front).
    """
    wall = _mat(f"{name}_wall", palette["wall"])
    trim = _mat(f"{name}_trim", palette["trim"])
    sign = _mat(f"{name}_sign", palette["sign"])
    glass = _mat(f"{name}_glass", palette["glass"])
    post = _mat(f"{name}_post", palette["post"])
    door = _mat(f"{name}_door", palette["door"])

    hw, hd = width / 2.0, depth / 2.0
    front_y = -hd  # road-facing face plane
    parts = []

    # 1. Body — the building behind the facade.
    parts.append(_box(f"{name}_body", (width, depth, body_h), (0, 0, body_h / 2), wall))

    # 2. Roof slab (flat, slightly proud) behind the false front.
    parts.append(_box(f"{name}_roof", (width * 1.02, depth * 1.02, 0.08),
                      (0, hd * 0.04, body_h + 0.04), trim))

    # 3. False front — a flat parapet on the front face rising above the body.
    parts.append(_box(f"{name}_falsefront", (width * 1.04, 0.12, front_h),
                      (0, front_y - 0.04, front_h / 2), wall))

    # 4. Cornice — a thin trim cap across the top of the false front.
    parts.append(_box(f"{name}_cornice", (width * 1.12, 0.2, 0.16),
                      (0, front_y - 0.06, front_h - 0.06), trim))

    # 5. Sign band — painted plank on the upper false front.
    parts.append(_box(f"{name}_sign", (width * 0.74, 0.06, front_h * 0.2),
                      (0, front_y - 0.11, front_h * 0.66), sign))

    # 6. Door — recessed dark panel, centred at the base.
    parts.append(_box(f"{name}_door", (width * 0.26, 0.06, body_h * 0.62),
                      (0, front_y - 0.04, body_h * 0.31), door))

    # 7. Two windows flanking the door.
    for sx in (-1, 1):
        parts.append(_box(f"{name}_win{sx}", (width * 0.2, 0.05, body_h * 0.3),
                          (sx * width * 0.3, front_y - 0.04, body_h * 0.55), glass))

    # 8. Porch awning over the boardwalk on two posts.
    porch_y = front_y - 0.85
    porch_z = body_h * 0.78
    parts.append(_box(f"{name}_awning", (width * 1.0, 1.7, 0.08),
                      (0, porch_y + 0.05, porch_z), trim))
    for sx in (-1, 1):
        parts.append(_box(f"{name}_post{sx}", (0.12, 0.12, porch_z),
                          (sx * width * 0.42, porch_y - 0.75, porch_z / 2), post))

    obj = _join(parts, name)
    # Origin to the base centre so the loader seats it on the ground.
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    return obj


def export_glb(obj, out_dir, filename):
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, filename)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=path, use_selection=True, export_format="GLB",
        export_apply=True, export_yup=True,
    )
    return path


VARIANTS = {
    "production_saloon_v2": {
        "palette": {"wall": "#8a5e34", "trim": "#4a3320", "sign": "#d99a48",
                    "glass": "#ffcf86", "post": "#5a3f26", "door": "#2c1d12"},
        "width": 1.8, "depth": 1.5, "body_h": 1.7, "front_h": 2.7,
    },
    "production_store_v2": {
        "palette": {"wall": "#9a7144", "trim": "#4f3826", "sign": "#e0aa68",
                    "glass": "#ffd79a", "post": "#5a3f26", "door": "#2c1d12"},
        "width": 1.7, "depth": 1.5, "body_h": 1.6, "front_h": 2.4,
    },
    "production_assay_v2": {
        "palette": {"wall": "#6a4630", "trim": "#3a281a", "sign": "#caa15a",
                    "glass": "#ffc070", "post": "#4a3320", "door": "#241710"},
        "width": 1.6, "depth": 1.4, "body_h": 1.5, "front_h": 2.3,
    },
}


def main():
    out_dir = os.path.join(os.getcwd(), "public", "models")
    _clear_scene()
    made = []
    for name, cfg in VARIANTS.items():
        obj = build_western_building(name, cfg["palette"], cfg["width"], cfg["depth"],
                                     cfg["body_h"], cfg["front_h"])
        made.append(export_glb(obj, out_dir, f"{name}.glb"))
        _clear_scene()
    print("[make_western_building] exported:")
    for p in made:
        print("  ", p)


if __name__ == "__main__":
    main()
