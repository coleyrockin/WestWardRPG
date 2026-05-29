// Minimal, deterministic, plain-data ECS for the WestWard 3D engine.
//
// World state is fully serializable (plain objects/arrays/numbers) so it
// hashes and round-trips cleanly — the foundation for the event-sourced sim
// and its determinism gate. Operations MUTATE the world in place; the sim
// clones the world at the start of each tick (see stepSimulation), keeping the
// public sim contract pure while per-tick work stays cheap.
//
// Entity ids are monotonic integers; query() returns ids in ascending order so
// iteration is deterministic regardless of component insertion order. (An
// archetype / data-oriented layout is a later optimization — this API is the
// seam that stays.)

export function createWorld() {
  return { nextId: 1, entities: [], components: {} };
}

export function spawn(world, components = {}) {
  const id = world.nextId;
  world.nextId += 1;
  world.entities.push(id);
  for (const name of Object.keys(components)) {
    if (!world.components[name]) world.components[name] = {};
    world.components[name][id] = components[name];
  }
  return id;
}

export function addComponent(world, id, name, value) {
  if (!world.components[name]) world.components[name] = {};
  world.components[name][id] = value;
}

export function getComponent(world, id, name) {
  const map = world.components[name];
  return map ? map[id] : undefined;
}

export function removeEntity(world, id) {
  const i = world.entities.indexOf(id);
  if (i !== -1) world.entities.splice(i, 1);
  for (const name of Object.keys(world.components)) {
    delete world.components[name][id];
  }
}

// Ids (ascending) that own EVERY named component. Deterministic order.
export function query(world, ...names) {
  return world.entities.filter((id) =>
    names.every((name) => world.components[name] && id in world.components[name]),
  );
}

// Deep clone of a plain-data world. The JSON round-trip is intentional: it is
// obviously correct for serializable state and mirrors what the save layer
// persists. (Hot-path optimization lands with the archetype rewrite.)
export function cloneWorld(world) {
  return JSON.parse(JSON.stringify(world));
}
