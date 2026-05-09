// Minimal behavior tree runtime. Nodes return "success", "failure", or
// "running". Trees are plain objects — JSON-serializable, hot-reloadable.
//
// Node types:
//   sequence(children)  — runs children left-to-right; fails on first failure
//   selector(children)  — runs children left-to-right; succeeds on first success
//   action(fn)          — leaf: calls fn(entity, ctx); return value mapped to status
//   condition(fn)       — leaf: calls fn(entity, ctx); true → success, false → failure
//   inverter(child)     — flips success/failure of its single child

export const BT_SUCCESS = "success";
export const BT_FAILURE = "failure";
export const BT_RUNNING = "running";

function toStatus(raw) {
  if (raw === BT_SUCCESS || raw === BT_FAILURE || raw === BT_RUNNING) return raw;
  return raw ? BT_SUCCESS : BT_FAILURE;
}

export function sequence(children) {
  return { type: "sequence", children };
}

export function selector(children) {
  return { type: "selector", children };
}

export function action(fn) {
  return { type: "action", fn };
}

export function condition(fn) {
  return { type: "condition", fn };
}

export function inverter(child) {
  return { type: "inverter", child };
}

export function tick(node, entity, ctx) {
  switch (node.type) {
    case "sequence": {
      for (const child of node.children) {
        const result = tick(child, entity, ctx);
        if (result !== BT_SUCCESS) return result;
      }
      return BT_SUCCESS;
    }
    case "selector": {
      for (const child of node.children) {
        const result = tick(child, entity, ctx);
        if (result !== BT_FAILURE) return result;
      }
      return BT_FAILURE;
    }
    case "action":
      return toStatus(node.fn(entity, ctx));
    case "condition":
      return node.fn(entity, ctx) ? BT_SUCCESS : BT_FAILURE;
    case "inverter": {
      const result = tick(node.child, entity, ctx);
      if (result === BT_SUCCESS) return BT_FAILURE;
      if (result === BT_FAILURE) return BT_SUCCESS;
      return result;
    }
    default:
      return BT_FAILURE;
  }
}
