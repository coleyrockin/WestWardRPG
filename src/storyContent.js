export const NPC_DIALOGUE = {
  elder: {
    idle: [
      "Mayor Clem: Every slogan says 'for everyone.' Read the footnotes and it says 'terms apply.'",
      "Mayor Clem: I used to do stage magic. Politics is the same trick with slower applause.",
      "Mayor Clem: If truth causes panic, is silence mercy or control?",
      "Mayor Clem: We promised equality. Then somebody printed premium tiers for hope.",
    ],
    questActive: [
      "Mayor Clem: Crystal ledgers at ${p}/${n}. Publish facts and panic, or hide facts and rot.",
      "Mayor Clem: Numbers don't lie. People do, especially when numbers are inconvenient.",
    ],
  },
  warden: {
    idle: [
      "Marshal Boone: I wrote a sonnet about curfew permits. It rhymes 'order' with 'order'.",
      "Marshal Boone: Freedom sounds great until the night patrol hears screaming.",
      "Marshal Boone: Everyone asks for safety. Nobody agrees on the price.",
      "Marshal Boone: Law is a shield. Also a mirror. Depends who is holding it.",
    ],
    questActive: [
      "Marshal Boone: Threats neutralized ${p}/${n}. Security rises, trust negotiates.",
      "Marshal Boone: Keep pressure on. Fear spreads faster than my paperwork.",
    ],
  },
  smith: {
    idle: [
      "Professor Cogwheel: My prototypes are neutral. The contracts attached to them are not.",
      "Professor Cogwheel: Open tools build communities. Closed tools build empires.",
      "Professor Cogwheel: I made a machine that predicts shortages. The rich called it 'market insight.'",
      "Professor Cogwheel: Please ignore the steam leak. It's only philosophically dangerous.",
    ],
    questActive: [
      "Professor Cogwheel: Materials ${wp}/${wn} wood, ${sp}/${sn} stone. Infrastructure is ideology with nails.",
      "Professor Cogwheel: Bring supplies. Every house built is one less debt trap.",
    ],
  },
  merchant: {
    idle: [
      "Reverend Quill: Blessings come in three plans: basic, premium, and investor class.",
      "Reverend Quill: Rumor is the only currency that compounds hourly.",
      "Reverend Quill: I don't distort truth. I package it for audience fit.",
      "Reverend Quill: People call it manipulation. I call it narrative logistics.",
    ],
  },
  innkeeper: {
    idle: [
      "Nora Knuckles: Welcome in. The stew is honest, the politics less so.",
      "Nora Knuckles: I retired from crime. The town outsourced it to policy.",
      "Nora Knuckles: Everyone wants peace until peace hurts profits.",
      "Nora Knuckles: Room, board, and one free warning: no faction owns your conscience.",
    ],
  },
  bard: {
    idle: [
      "Bard Jingles: Verse of the day: same pigs, new wigs, identical gig economy rigs.",
      "Bard Jingles: I sing protest songs at lunch and compliance jingles by dinner.",
      "Bard Jingles: My lute has two modes: satire and louder satire.",
      "Bard Jingles: They asked me to stop singing truths, so I added a catchy chorus.",
    ],
  },
  cat: {
    idle: [
      "Whiskers the Cat: *stares through your ideology*",
      "Whiskers the Cat: *meows in dialectical materialism*",
      "Whiskers the Cat: *knocks propaganda pamphlet off shelf*",
      "Whiskers the Cat: *purrs as if auditing your moral framework*",
    ],
  },
};

export const DEATH_MESSAGES = [
  "You got absolutely slimed. The factions release competing statements.",
  "Defeat report filed. Every side blames your policy choices.",
  "Game over. The curfew siren and protest drums sync perfectly.",
  "You were defeated. The market sold commemorative merch instantly.",
  "K.O. The blob offered no comment on governance reform.",
  "Flattened by gelatin. History will call it a 'necessary correction.'",
];

// Job-board UI strings — extracted from jobBoard.js so all player-facing copy
// lives next to the rest of the narrative content. jobBoard.js consumes this
// via getJobBoardPresentation().
export const JOB_BOARD_PRESENTATION = {
  frontier: {
    title: "Marshal Boone's Job Board",
    subtitle: "Westward Frontier work: road law, town defense, rescue, and escort pay.",
    emptyLine: "No posted work in Westward Frontier.",
    openLine: "Marshal Boone opens the job board.",
  },
  ashfall: {
    title: "Ashfall Warrant Board",
    subtitle: "Ashfall Basin work: salvage warrants, cooling patrols, and heat-risk bonuses.",
    emptyLine: "No Ashfall warrants are posted.",
    openLine: "Marshal Boone checks the Ashfall warrant board.",
  },
  ironlantern: {
    title: "Lantern Quiet Board",
    subtitle: "Iron Lantern work: watched routes, quiet couriers, and signal-risk pay.",
    emptyLine: "No Iron Lantern quiet work is posted.",
    openLine: "Marshal Boone lowers his voice at the Lantern board.",
  },
};
