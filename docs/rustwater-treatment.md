# RUSTWATER
### A Cyberpunk Western — Design Treatment v0.1
*Working title. Open world action-RPG with deep life simulation. Single player.*

> Canonical design document — authored by the owner (Boyd), adopted as project direction
> 2026-06-11. The engine roadmap that implements this lives in [`roadmap.md`](roadmap.md).
> Per the author: *"v0.1 — everything is a proposal. Kill what doesn't earn its place."*

---

## THE PITCH

You inherit everything in the first hour. The rest of the game is finding out what it costs.

**Rustwater** is *Red Dead* geography with *Cyberpunk* flesh and *Fable* bones. You play Ezra Cross, heir to the largest water-and-land empire in the Meridian Territory — and the game inverts the standard RPG power curve. You don't grind toward wealth. You start at the top, and the world starts taking bites out of you. Money solves your small problems and *creates* every large one.

---

## THE WORLD

**The Meridian Territory**, 2117. After the Severance — the year the federal grid went dark and Washington sold the dry states to cover its debts — the American Southwest became open territory again. Megacorps bought the cities. Everyone else rode out into the dust.

Out here, **water is currency**. Aquifer shares trade like gold. Towns live or die by who holds the pipe rights. Technology is frontier-grade: smart-linked revolvers, gene-modded horses alongside steel mustangs (robotic mounts), chrome augments installed by traveling "iron doctors" in the backs of wagons. The aesthetic rule: **nothing is sleek**. Every piece of chrome is sun-bleached, sand-scoured, repaired with baling wire. Neon signs on clapboard saloons. Server farms cooled in mineshafts.

### Key Regions
1. **Providence** — The company town. A Helios-Pacific corporate spire grown out of an old mining settlement like a glass tumor. Wealth, law, surveillance. Your penthouse is here. So is your bank.
2. **Calico Flats** — The free town. No corp charter, elected sheriff, the territory's only neutral saloon row. Where deals get made and bodies get found.
3. **The Caldera** — A drowned valley, now a salt flat with a dark history (see: The Founding Crime). Freeholder camps cling to its rim. Off-grid, devout, armed.
4. **The Drift** — Open badlands. Bounty country. Dead satellites, buried data vaults, rogue agricultural machines gone feral.
5. **Crossline Ranch** — Your family seat. The largest private holding in the territory. Beautiful, fortified, and mortgaged to the rafters — though you don't know that yet.

### Factions
| Faction | What they want | What they want *from you* |
|---|---|---|
| **Helios-Pacific** | Annex the territory under corporate charter | Your debt. Then your land. Then your name on their letterhead. |
| **The Tally Men** | A bounty/debt syndicate. They collect — money, people, secrets | Your father's unpaid marker. They don't take scrip. |
| **Caldera Freeholders** | Water rights, recognition, justice for the Drowning | A confession. Your empire was built on their graves. |
| **The Circuit Riders** | Techno-preacher network; part church, part darknet | Your father's implant — and what's stored on it. |
| **Providence Civic** | Sheriff, mayor, merchants. Keep the town breathing | A patron. Or a scapegoat. Your choice. |

---

## THE PREMISE

### Opening: The Funeral
The game opens at the burial of **Abram Cross**, your father — the man who tamed the territory and owned a piece of everyone in it. You are his only acknowledged heir. Before the casket closes, the family iron doctor installs your inheritance directly into your skull: **the Executor** — a neural implant containing your father's business empire (every deed, account, and access key)... and a partial copy of *him*. His voice. His judgment. His ghost, riding shotgun in your head for the whole game.

This is the core narrative engine: **you didn't just inherit the money. You inherited the man.** The Executor gives real mechanical benefits (see Progression) and constant editorial — he approves when you act like him, needles you when you don't. The central question of the game: *do you become your father, or break the line?*

### The Three Problems (why wealth doesn't save you)
1. **The Debt.** The audit reveals the empire is leveraged to Helios-Pacific. Your father borrowed catastrophically to win the last Water War. They've been waiting for him to die. Now the note is due.
2. **The Marker.** Abram owed the Tally Men something that isn't money. They won't say what. They will collect it from you instead.
3. **The Truth.** A drifter preacher named **Josiah** arrives claiming to be your half-brother — carrying proof of **the Founding Crime**: forty years ago, Abram seized the territory's master aquifer by deliberately flooding the freeholder settlement of Caldera. Three hundred people drowned. Your fortune is their headstone.

---

## STORY STRUCTURE — THREE ACTS

### ACT 1 — THE INHERITANCE (Levels 1–15)
*You own everything. Learn what that means. Watch it crack.*

The ownership tutorial: instead of starting with nothing, your first quests are running an empire — and every system tutorial is diegetic.

| # | Mission | Teaches | Beats |
|---|---|---|---|
| 1.1 | **Dust to Dust** | Movement, dialogue, the Executor | The funeral. The implant. First conversation with your dead father. |
| 1.2 | **The Reading** | Map, holdings UI, Standing | The will. Tour of everything you now own. Establishes scale — and the half-glimpsed rider clause nobody explains. |
| 1.3 | **Lord of the Manor** | Business management, staffing | Your saloon manager is skimming. Fire him, forgive him, or make an example — first morality fork, witnessed, sets your Legend. |
| 1.4 | **Smart Money** | Combat, smart-link revolvers | Kidnap attempt on the road to Providence. Being rich makes you a target — the game says it out loud. |
| 1.5 | **The Tally** | Factions, intimidation, Tongue skill | Three Tally Men walk into your saloon and sit down. They want the marker. You learn you can't buy everything. |
| 1.6 | **The Preacher's Proof** | Investigation, Wire skill | Josiah arrives. The Caldera evidence. Bury it, verify it, or burn it — each option opens a different Act 2 thread. |
| 1.7 | **The Audit** | Economy systems, Helios intro | Your accountant, white-faced, lays out the debt. The empire is paper. Helios sends a "transition consultant" — the game's main antagonist, **Director Vance**. |
| 1.8 | **THE SEIZURE** (Act finale) | Loss | Helios freezes the estate at a Providence gala. Shootout or signing — either way, you walk out with **one asset of your choice**. The saloon, the ranch, the bounty office, the penthouse, or the stable. Everything else goes behind corporate glass. |

> **The Seizure is the signature design move.** The player chooses what survives into Act 2, which reshapes their economy, home base, and available questlines. Five different Act 2 openings. Massive replay value for one branching decision.

### ACT 2 — THE RECKONING (Levels 15–35)
*Rich on paper, broke in fact. Rebuild leverage your way.*

The open-world heart of the game. Wide structure: four faction questlines run in parallel, and the player needs leverage from at least two to force the Act 3 confrontation. This is also where the life sim blooms — courtship, marriage, rebuilding businesses, buying back (or stealing back) your seized properties one by one.

Faction throughlines:
- **Helios-Pacific:** Vance offers a path back to the top — as their man. Infiltrate or collaborate. Ends with access to the spire's data vault: proof Helios *engineered* your father's debt.
- **The Tally Men:** Work off the marker as their collector. Morally filthy, mechanically lucrative. Ends with learning what the marker actually is: your father sold them *Josiah*, as a child, to cover a debt. Your brother was the payment.
- **Caldera Freeholders:** Earn trust by force or penance. Ends at the drowned town itself — diving the flooded ruin, recovering the dead, and the original sabotage charges with Crossline serial numbers.
- **Circuit Riders:** They want the Executor. They can do things with it — talk to your father's ghost directly, expand it, or (whisper) give it a body. The transhumanist thread, and the source of the game's strangest ending.

**Act 2 finale — The Caldera Hearing:** Josiah forces a territorial tribunal over the Founding Crime. You are the key witness. Confess the empire's sin publicly, perjure yourself to protect the name, or buy the judge. The verdict sets the political board for Act 3 and locks your ending branch.

### ACT 3 — THE WATER WAR (Levels 35–50)
*Helios moves to annex the territory. Everyone reaches for a gun.*

Vance triggers the charter vote backed by private military. The factions you built (or burned) in Act 2 determine your army, your intel, and your options. Open warfare across all five regions, culminating at the **Master Valve** — the aquifer control station your father built, accessible only by Cross blood... or a Cross implant.

### ENDINGS (driven by: tribunal verdict + faction standings + spouse + the Executor's fate)
- **THE BARON** — Crush Helios, keep the monopoly, bury the truth. You win everything and the Executor goes quiet — because you don't need his voice anymore. You *are* it. Your child's epilogue mirrors your own opening scene.
- **THE FOUNDER** — Break the monopoly. Open the aquifer as a commons, deed the Caldera back, dissolve the empire. Poorest ending, brightest epilogue.
- **THE GHOST** — Let the Circuit Riders complete the Executor. Your father returns in full — in your body, or a new one, depending on a final choice you may not get to make. Horror ending.
- **THE OUTLAW** — Blow the Master Valve. No one gets the water. Ride into the Drift with whoever still loves you. The territory's fate plays out in radio broadcasts over the credits.

---

## PROGRESSION SYSTEMS

### Levels & Skills
Classless. XP from everything (combat, deals, courtship, business profit). Each level grants skill points across five trees — every tree has combat, social, and economic applications so no build locks out content:

| Tree | Theme | Sample perks |
|---|---|---|
| **GUN** | Revolvers, rifles, the duel | *Deadeye Protocol* (smart-link slow-mo), *Fan the Hammer*, *Reputation Precedes You* (low-rank enemies flee) |
| **IRON** | Body, augments, durability | More augment slots, *Overclock* (burst strength, costs health), *Faraday Skin* (hack resist) |
| **WIRE** | Hacking, drones, surveillance | Breach turrets/locks/ledgers, *Whisper Network* (intel on NPCs), combat drone companion |
| **TONGUE** | Charm, menace, dealcraft | Better prices, *Silver Bullet* (talk down a duel), *Hostile Takeover* (acquire businesses below market) |
| **TRAIL** | Riding, survival, craft | Mount bond perks, gunsmithing/brewing/augment maintenance, Drift navigation |

### Augments ("Iron")
Installed by iron doctors; quality tiers from rusted salvage to Helios prototype. Slots: **eyes, arms, spine, heart, neural**. Western-flavored chrome — *The Dead Hand* (arm: holsters an internal derringer), *Coyote Ears*, *Second Sunrise* (heart: one self-revive per day). Visible on the character; heavy chrome shifts how factions read you (Freeholders distrust it, Helios respects it).

### The Executor (unique progression track)
Your father's ghost levels up too — by you *feeding it decisions*. Acting like Abram (ruthless, acquisitive) strengthens it: powerful empire-management and combat-prediction perks, but more intrusive, occasionally seizing control in scripted moments. Starving it (mercy, divestment) weakens its grip and unlocks the *Quiet Mind* branch instead. **Your build is a moral instrument.**

### Wealth, Standing & Legend — three social meters
- **Cash** — scrip + water shares. Spendable, stealable, seizable (the player learns this the hard way in 1.8).
- **Standing** — your class position. Gates doors: high Standing opens the spire and the bank; *closes* Freeholder camps and Tally backrooms. Deliberately impossible to max with everyone. Wealth costs access.
- **Legend** — what the territory *says* you did. Deeds get retold and exaggerated by NPCs, radio, and penny-dreadful pamphlets (which you can buy the press for, and edit). Drives bounty prices, duel challenges, courtship availability.

---

## LIFE SIMULATION (the Fable layer)

### Relationships & Marriage
Eight courtable characters across factions and orientations — each a full questline whose romance is entangled with their faction politics (marrying the sheriff's deputy while running Tally collections is a *problem*, and the game makes it one). Examples:
- **Marisol Vega** — Calico Flats saloon owner, your competitor. Enemies-to-partners arc; marriage merges the businesses.
- **Deputy Ru Calhoun** — Providence law. Will not look away from what you do. The conscience romance.
- **Dr. Adaeze Okafor** — Your iron doctor. Knows the Executor better than anyone. Key to the Ghost ending — or preventing it.
- **Silas Tally** — Yes, *that* Tally. The dangerous one.

Marriage is mechanical, not decorative: spouses co-manage one business (their bonus varies), open unique dialogue in main missions, and can be leveraged against you by enemies — late-game kidnap/blackmail events scale with how publicly you love someone.

### Children & Inheritance
Kids arrive by birth or adoption, grow via time-skips at act boundaries, and develop traits from what they *witness* — bring your kid to the ranch, they learn Trail; let them see you execute a rival, that goes somewhere darker. The ending epilogue is narrated by your child. The whole game is about inheritance; the last thing you see is yours.

### Property
Penthouse (Providence), saloon rooms, Crossline Ranch, a rebuilt Caldera homestead, and a hideout in the Drift. Homes give rested bonuses, storage, family housing — and are political statements that shift Standing/faction reactions.

### Businesses
Each is a quest chain + staffing decisions + passive income + a unique mechanic:
| Business | Mechanic |
|---|---|
| **Saloon** | Information hub — gossip generates quest leads |
| **Stable/Garage** | Breed gene-mods, build steel mustangs |
| **Water-hauling outfit** | Logistics minigame; the territory's bloodstream — sabotage target in Act 3 |
| **Bounty office** | Procedural bounty board; hire crews to run jobs you don't |
| **Print shop & radio** | Edit your own Legend; propaganda in the Water War |
| **Mine share** | Raw income, ugly labor-conditions choices that feed the tribunal |

### "Trouble" — the dynamic problem engine
Wealth generates emergent events: lawsuits, audits, kidnap attempts, arson, con artists, long-lost "cousins," labor strikes, paparazzi pamphleteers. Frequency scales with Cash × Legend. **The richer and louder you are, the more the world comes for you.** This is the system that delivers the core fantasy: money is a magnet, not a shield.

---

## MISSION TAXONOMY
- **Main story** — ~24 missions across three acts (above)
- **Faction chains** — 4 lines × 6–8 missions, two completions required to unlock Act 3 properly
- **Romance chains** — 8 lines × 4–5 missions + marriage/family events
- **Business chains** — 6 lines × 3–4 missions each
- **Bounty board** — procedural, infinite
- **Trouble events** — emergent, systemic
- **Drift expeditions** — exploration content: buried data vaults, feral machines, your father's hidden caches (Executor-keyed)

## WHAT TO DESIGN NEXT
1. Act 2 mission-by-mission breakdown (the four faction lines, beat by beat)
2. Full skill trees — every perk, ranks, costs
3. The eight romance characters — bios, arcs, marriage perks
4. Economy math — income rates, property prices, the debt number
5. The Seizure scene script — the single most important hour of the game

*v0.1 — everything is a proposal. Kill what doesn't earn its place.*
