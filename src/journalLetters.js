// Handcrafted letters and journal entries discovered at POIs, viewable in the
// codex letters tab. Each letter cross-references others via `refersTo` IDs,
// revealing lore not exposed through dialogue.

export const LETTERS = [
  {
    id: "letter_frontier_outpost",
    poiId: "frontier_wayside_shrine",
    title: "Unsigned Note — Wayside Shrine",
    author: "Unknown",
    body: `If you're reading this, the shrine still stands.
We left it for the next fool dumb enough to follow the road north after dark.
The Lantern runs patrols past the tree line now. Three torches, one rifle.
Don't engage. Go around. The eastern gully holds water.
— Someone who learned the hard way`,
    refersTo: ["letter_lantern_patrol_log"],
  },
  {
    id: "letter_frontier_wagon",
    poiId: "frontier_broken_wagon",
    title: "Hauler's Logbook — Broken Wagon",
    author: "Dunn Cartwright",
    body: `Day 12. Axle cracked on the ridge road. Cargo unsalvageable.
The Guild said the route was cleared. They lied.
Third delivery this season lost to that same stretch.
If someone finds this: the goods weren't mine. Tell Quill. He'll know what it means.
— D. Cartwright, Wharton Freight`,
    refersTo: ["letter_guild_route_dispute"],
  },
  {
    id: "letter_ashfall_shaft",
    poiId: "ashfall_mine_shaft",
    title: "Shift Report — Shaft 7",
    author: "Foreman Etta Rowe",
    body: `Vein still live but unstable. Second collapse this week.
Guild rep says keep digging. Three of mine said no.
Can't blame them. The wall sounds wrong — like it's hollow the wrong way.
Marking the eastern wall. If anything shifts, get out through the utility passage.
If you're reading this and there's no one around — I'm sorry. We tried.
— Foreman E. Rowe`,
    refersTo: ["letter_guild_safety_memo"],
  },
  {
    id: "letter_lantern_patrol_log",
    poiId: "ironlantern_relay_station",
    title: "Patrol Log — Iron Lantern District",
    author: "Officer Unnamed",
    body: `Incident 7: Unauthorized approach from western scrubland.
Individual identified, detained, processed.
Outcome: reassigned to archive duty. Efficient.
Notes: frontier shrine activity remains elevated. Recommend increased watch.
The road south remains a liability. We have asked for authorization.
Authorization pending. Routine.`,
    refersTo: ["letter_frontier_outpost"],
  },
  {
    id: "letter_guild_route_dispute",
    poiId: "ashfall_guild_post",
    title: "Guild Internal Memo — Route Certification",
    author: "Regional Director",
    body: `Effective immediately: Wharton route is provisional.
Three losses in two months cannot be absorbed.
Cartwright claims the road was cleared. Cleared by whom is under review.
Until resolved, all freight requiring the ridge pass goes through Ashfall relay.
Add two hours. Absorb the cost. Do not tell the clients why.
— R.D., Guild District Office`,
    refersTo: ["letter_frontier_wagon"],
  },
  {
    id: "letter_cursed_charm",
    poiId: "frontier_ruined_shrine",
    title: "Carved Tablet — Ancient Shrine",
    author: "Unknown — pre-settlement",
    body: `This mark keeps something out.
We do not remember what. We remember that it works.
Do not move the stone. Do not clean the mark.
Do not sleep here. The ground accepts the wrong kind of rest.
If the stone has been moved: we are sorry.
We tried to warn the next ones.`,
    refersTo: [],
  },
  {
    id: "letter_guild_safety_memo",
    poiId: "ashfall_union_hall",
    title: "Guild Safety Bulletin — Shaft 7",
    author: "Guild District Safety Board",
    body: `Shaft 7 operations suspended pending structural review.
All personnel are advised to use marked exit routes only.
Foreman Rowe has filed a formal complaint regarding timeline pressure.
The complaint is under review. Operations are paused, not cancelled.
Thank the foreman for her diligence. Resume as soon as structural clearance is granted.
— Guild District Safety Board`,
    refersTo: ["letter_ashfall_shaft"],
  },
];

export function getLetterById(id) {
  return LETTERS.find((l) => l.id === id) || null;
}

export function getLetterByPoiId(poiId) {
  return LETTERS.filter((l) => l.poiId === poiId);
}

export function resolveLetterChain(id, visited = new Set()) {
  if (visited.has(id)) return [];
  visited.add(id);
  const letter = getLetterById(id);
  if (!letter) return [];
  const chain = [letter];
  for (const refId of letter.refersTo || []) {
    chain.push(...resolveLetterChain(refId, visited));
  }
  return chain;
}
