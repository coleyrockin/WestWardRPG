// Canonical serialization + FNV-1a hashing for the determinism gate.
//
// canonicalize() sorts object keys recursively so two structurally-equal states
// always serialize identically; fnv1a() reduces that to a stable 32-bit hex
// digest. Used to assert that replaying (seed, input-log) reproduces an
// identical world — the spine of the event-sourced engine — and reused later
// by the save layer for integrity. Accident detection, not adversarial.

export function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") + "}";
}

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function hashState(state) {
  return fnv1a(canonicalize(state));
}
