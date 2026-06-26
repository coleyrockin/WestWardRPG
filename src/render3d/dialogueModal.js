// Dialogue runner — the minimal conversation primitive for Dustwater. A character
// speaks one or more lines, then (optionally) offers a choice that fires an
// OUTCOME the caller acts on (e.g. "accept_bounty"). This is the missing RPG
// primitive: a person gives you purpose instead of a bulletin board.
//
// Pure + renderer-agnostic (no DOM / Three.js) so the conversation flow is
// unit-tested in isolation. `dialogueDom.js` binds the prompt-bar / choice
// buttons / E-key to this runner; spike.js wires an interaction to open it. The
// model is deliberately small (a flat SCRIPT, not a branching graph) — the larger
// game can grow it into node-linked trees later without changing this contract.
//
// SCRIPT = ordered beats:
//   { speaker, text }                                  — a spoken line
//   { speaker, text, choices: [{ id, label, outcome }] } — a terminal choice node

export function createDialogueRunner(script = [], { onOutcome = () => {}, onEnd = () => {} } = {}) {
  const beats = Array.isArray(script) ? script : [];
  let index = 0;
  let open = false;

  const current = () => (open && index >= 0 && index < beats.length ? beats[index] : null);
  const atChoice = () => Array.isArray(current()?.choices) && current().choices.length > 0;

  function end() {
    open = false;
    onEnd();
  }

  function show() {
    index = 0;
    open = true;
    if (!current()) end(); // empty script: nothing to say
  }

  // Advance to the next spoken line. No-op at a choice node (the player must
  // choose). Past the last line, the conversation ends. Returns the new beat (or
  // null when it ended).
  function advance() {
    if (!open) return null;
    if (atChoice()) return current();
    if (index + 1 < beats.length) {
      index += 1;
      return current();
    }
    end();
    return null;
  }

  // Pick a choice at a choice node — fires its outcome, then ends the conversation.
  // Unknown ids are ignored (the conversation stays open).
  function choose(choiceId) {
    if (!open || !atChoice()) return;
    const choice = current().choices.find((c) => c.id === choiceId);
    if (!choice) return;
    onOutcome(choice.outcome, choice.id);
    end();
  }

  return {
    open: show,
    advance,
    choose,
    current,
    atChoice,
    close: end,
    isOpen: () => open,
  };
}
