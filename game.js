(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const startBtn = document.getElementById("start-btn");
  const continueBtn = document.getElementById("continue-btn");

  const TAU = Math.PI * 2;
  const FOV = Math.PI / 2.75;
  const MAX_RAY_DIST = 26;
  const TEXTURE_SIZE = 64;
  const PLAYER_SPEED = 3.95;
  const PLAYER_ROT_SPEED = 2.75;
  const PLAYER_MAX_HP = 120;
  const SAVE_KEY = "dustward-save-v1";
  const AUTOSAVE_INTERVAL = 30;
  const QUEST_STATUSES = new Set(["locked", "active", "complete", "turned_in"]);

  /* ─── Sound Effects System (Web Audio API) ─── */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let soundEnabled = true;

  function ensureAudio() {
    if (!audioCtx && AudioCtx) {
      try { audioCtx = new AudioCtx(); } catch { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playTone(freq, duration, type, volume, detune) {
    const ctx = ensureAudio();
    if (!ctx || !soundEnabled) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || "square";
      osc.frequency.value = freq;
      if (detune) osc.detune.value = detune;
      gain.gain.setValueAtTime(Math.min(volume || 0.08, 0.15), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch { /* audio not critical */ }
  }

  function playNoise(duration, volume) {
    const ctx = ensureAudio();
    if (!ctx || !soundEnabled) return;
    try {
      const bufSize = Math.floor(ctx.sampleRate * duration);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      gain.gain.setValueAtTime(Math.min(volume || 0.04, 0.1), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch { /* audio not critical */ }
  }

  const sfx = {
    footstep()   { playTone(80 + Math.random() * 40, 0.06, "triangle", 0.04); },
    swordSwing() { playNoise(0.12, 0.07); playTone(220 + Math.random() * 60, 0.1, "sawtooth", 0.05); },
    swordHit()   { playTone(160, 0.08, "square", 0.09); playNoise(0.06, 0.08); },
    playerHurt() { playTone(110, 0.15, "sawtooth", 0.08, -200); },
    enemyDie()   { playTone(300, 0.06, "square", 0.06); playTone(200, 0.1, "square", 0.05); playTone(100, 0.18, "square", 0.04); },
    pickup()     { playTone(523, 0.06, "sine", 0.07); playTone(659, 0.08, "sine", 0.06); },
    questDone()  { playTone(392, 0.1, "sine", 0.07); playTone(523, 0.12, "sine", 0.07); playTone(659, 0.14, "sine", 0.07); },
    shopBuy()    { playTone(440, 0.05, "triangle", 0.06); playTone(554, 0.08, "triangle", 0.06); },
    doorOpen()   { playTone(130, 0.15, "triangle", 0.05); playTone(165, 0.12, "triangle", 0.04); },
    potionUse()  { playTone(350, 0.08, "sine", 0.06); playTone(440, 0.12, "sine", 0.05); playTone(523, 0.15, "sine", 0.04); },
    levelUp()    { playTone(523, 0.1, "sine", 0.08); playTone(659, 0.1, "sine", 0.08); playTone(784, 0.15, "sine", 0.08); playTone(1047, 0.2, "sine", 0.07); },
    thunder()    { playNoise(0.6, 0.09); playTone(40, 0.5, "sawtooth", 0.06); },
    miss()       { playNoise(0.08, 0.03); },
    blockHit()   { playTone(200, 0.06, "square", 0.06); playTone(90, 0.08, "triangle", 0.05); },
    rain()       { playNoise(0.3, 0.02); },
    npcChat()    { playTone(280 + Math.random() * 80, 0.04, "triangle", 0.03); },
    death()      { playTone(180, 0.2, "sawtooth", 0.08); playTone(120, 0.3, "sawtooth", 0.06); playTone(60, 0.5, "sawtooth", 0.04); },
  };

  let footstepTimer = 0;
  let ambientTimer = 0;

  /* ─── Comical NPC Dialogue Lines ─── */
  const npcDialogue = {
    elder: {
      idle: [
        "Elder Nira: Back in my day, slimes were polite. They'd knock first.",
        "Elder Nira: I've read every scroll in this valley. Most were grocery lists.",
        "Elder Nira: Don't tell anyone, but I once got lost in my own settlement.",
        "Elder Nira: Wisdom comes with age. So do backaches.",
      ],
      questActive: [
        "Elder Nira: Those crystals won't collect themselves. I tried asking nicely.",
        "Elder Nira: Crystal Shards ${p}/${n}. I'm counting. Very slowly.",
      ],
    },
    warden: {
      idle: [
        "Warden Sol: I guard these lands! ...mostly from boredom.",
        "Warden Sol: Have you seen my pet slime? Wait, they all look the same.",
        "Warden Sol: My sword is sharp. My wit? Debatable.",
        "Warden Sol: I once chased a slime for three hours. Turns out it was a bush.",
      ],
      questActive: [
        "Warden Sol: Slimes defeated ${p}/${n}. They're not happy about it.",
        "Warden Sol: Keep smacking those blobs! It's therapeutic.",
      ],
    },
    smith: {
      idle: [
        "Smith Varo: I make things. Then I fix the things I made. Circle of life.",
        "Smith Varo: This anvil has seen things. Terrible, terrible things.",
        "Smith Varo: Your sword looks fine. My professional opinion? Hit harder.",
        "Smith Varo: I once forged a spoon so perfect, the Elder cried.",
      ],
      questActive: [
        "Smith Varo: Wood ${wp}/${wn}, Stone ${sp}/${sn}. My back hurts just thinking about it.",
        "Smith Varo: Bring materials! Your house won't build itself. Trust me, I asked.",
      ],
    },
    merchant: {
      idle: [
        "Trader Nyx: Everything's for sale! My morals? Also for sale.",
        "Trader Nyx: Special deal today - same price as yesterday!",
        "Trader Nyx: I've got potions, rocks, and a mysterious jar. Don't open the jar.",
        "Trader Nyx: Trade secrets? My biggest one is a 300% markup.",
      ],
    },
    innkeeper: {
      idle: [
        "Innkeeper Mora: You look terrible. That'll be 8 gold.",
        "Innkeeper Mora: Our beds have only slightly fewer bugs than the marsh.",
        "Innkeeper Mora: Hot meal? Best I can do is lukewarm and questionable.",
        "Innkeeper Mora: The secret ingredient in my stew is... ambition. And salt.",
      ],
    },
    bard: {
      idle: [
        "Bard Jingles: 🎵 Oh the slimes go splat, and the hero goes WHACK! 🎵",
        "Bard Jingles: I wrote a ballad about you. It's mostly about falling.",
        "Bard Jingles: My lute is out of tune. So is my sense of danger.",
        "Bard Jingles: Want to hear my new song? No? I'll play it anyway.",
      ],
    },
    cat: {
      idle: [
        "Whiskers the Cat: *stares at you judgmentally*",
        "Whiskers the Cat: *knocks a potion off the shelf* Meow.",
        "Whiskers the Cat: *purrs... menacingly*",
        "Whiskers the Cat: *pretends you don't exist*",
      ],
    },
  };

  /* ─── Comical Death Messages ─── */
  const deathMessages = [
    "You got absolutely slimed. Embarrassing.",
    "A slime sent you to the shadow realm. A SLIME.",
    "You fell in battle. The slimes will write songs about this.",
    "Game over. The slimes are throwing a party.",
    "You were defeated. Even the Elder is shaking her head.",
    "Wasted. Trader Nyx is already selling your stuff.",
    "You got bodied by gelatin. Let that sink in.",
    "K.O.! The slime didn't even break a sweat. Do slimes sweat?",
  ];

  /* ─── Shop System ─── */
  let shopOpen = false;
  const shopItems = [
    { name: "Health Potion",    cost: 18, desc: "Restores 38 HP. Tastes like feet.",
      action() { state.inventory.Potion += 1; } },
    { name: "Mega Potion",      cost: 40, desc: "Restores 80 HP. Tastes like expensive feet.",
      action() { state.inventory.Potion += 3; } },
    { name: "Crystal Shard",    cost: 30, desc: "Shiny rock. The Elder loves these.",
      action() { state.inventory["Crystal Shard"] += 1; updateQuestProgressFromInventory(); } },
    { name: "Mystery Box",      cost: 25, desc: "Could be anything! (It's usually rocks.)",
      action() {
        const roll = Math.random();
        if (roll < 0.3) { state.inventory.Potion += 2; logMsg("Mystery Box: 2 Potions! Lucky you!"); }
        else if (roll < 0.5) { state.player.gold += 50; logMsg("Mystery Box: 50 gold! The house always wins... except now."); }
        else if (roll < 0.7) { state.inventory["Slime Core"] += 3; logMsg("Mystery Box: 3 Slime Cores! Eww but useful."); }
        else { state.inventory.Stone += 2; logMsg("Mystery Box: 2 Stones. Called it."); }
      } },
    { name: "Sell Slime Cores",  cost: -15, desc: "Sell 1 core for 15 gold. Gross but profitable.",
      action() {
        if (state.inventory["Slime Core"] <= 0) { logMsg("No Slime Cores to sell!"); return false; }
        state.inventory["Slime Core"] -= 1;
        state.player.gold += 15;
        return true;
      } },
  ];
  let shopSelection = 0;

  /* ─── Particle System ─── */
  const particles = [];

  function spawnParticles(x, y, count, color, speed, life) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * (speed || 2),
        vy: (Math.random() - 0.5) * (speed || 2),
        life: (life || 1) * (0.5 + Math.random() * 0.5),
        maxLife: life || 1,
        color: color || "#fff",
        size: 2 + Math.random() * 3,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    const x = clamp(t, 0, 1);
    return 1 - Math.pow(1 - x, 3);
  }

  function normalizeAngle(angle) {
    let a = angle % TAU;
    if (a < -Math.PI) a += TAU;
    if (a > Math.PI) a -= TAU;
    return a;
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function choice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function numberOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function noise2D(x, y, seed) {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 73.97) * 43758.5453;
    return n - Math.floor(n);
  }

  function shadeHex(hex, mult) {
    const m = clamp(mult, 0, 2.5);
    const r = clamp(Math.floor(parseInt(hex.slice(1, 3), 16) * m), 0, 255);
    const g = clamp(Math.floor(parseInt(hex.slice(3, 5), 16) * m), 0, 255);
    const b = clamp(Math.floor(parseInt(hex.slice(5, 7), 16) * m), 0, 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function makeTexture(kind) {
    const tex = document.createElement("canvas");
    tex.width = TEXTURE_SIZE;
    tex.height = TEXTURE_SIZE;
    const tctx = tex.getContext("2d");
    const image = tctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
    const data = image.data;

    for (let y = 0; y < TEXTURE_SIZE; y++) {
      for (let x = 0; x < TEXTURE_SIZE; x++) {
        const i = (y * TEXTURE_SIZE + x) * 4;
        const n = noise2D(x, y, 4.3);
        const n2 = noise2D(x * 0.3, y * 0.3, 19.1);

        let r = 120;
        let g = 110;
        let b = 100;

        if (kind === "stone") {
          const brick = ((x + ((y % 14) < 7 ? 0 : 7)) % 14) < 2 || y % 11 < 2;
          const tone = 0.72 + n * 0.42;
          r = 118 * tone;
          g = 108 * tone;
          b = 99 * tone;
          if (brick) {
            r *= 0.5;
            g *= 0.5;
            b *= 0.5;
          }
        } else if (kind === "water") {
          const ripple = Math.sin((x + y) * 0.19) * 0.5 + Math.sin(y * 0.35 + n * 7) * 0.5;
          const tone = 0.62 + ripple * 0.16 + n2 * 0.2;
          r = 44 * tone;
          g = 96 * tone;
          b = 132 * tone + 20;
        } else if (kind === "timber") {
          const beam = x % 12 < 2;
          const grain = 0.68 + n * 0.35;
          r = 132 * grain;
          g = 95 * grain;
          b = 62 * grain;
          if (beam) {
            r *= 0.58;
            g *= 0.58;
            b *= 0.58;
          }
        } else if (kind === "plaster") {
          const crack = (x + y) % 17 === 0 || (x * 3 + y * 2) % 31 === 0;
          const tone = 0.82 + n * 0.2;
          r = 178 * tone;
          g = 166 * tone;
          b = 152 * tone;
          if (crack) {
            r *= 0.7;
            g *= 0.7;
            b *= 0.7;
          }
        } else {
          const tone = 0.76 + n * 0.34;
          r = 92 * tone;
          g = 107 * tone;
          b = 86 * tone;
        }

        data[i] = clamp(Math.floor(r), 0, 255);
        data[i + 1] = clamp(Math.floor(g), 0, 255);
        data[i + 2] = clamp(Math.floor(b), 0, 255);
        data[i + 3] = 255;
      }
    }

    tctx.putImageData(image, 0, 0);
    return tex;
  }

  function createWorldMap(width, height) {
    const grid = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 1 : 0)),
    );

    const settlementZone = { minX: 4, maxX: 26, minY: 4, maxY: 18 };

    for (let i = 0; i < 260; i++) {
      const x = 2 + Math.floor(Math.random() * (width - 4));
      const y = 2 + Math.floor(Math.random() * (height - 4));
      const inSettlement = x >= settlementZone.minX && x <= settlementZone.maxX && y >= settlementZone.minY && y <= settlementZone.maxY;
      if (!inSettlement && Math.random() < 0.66) {
        grid[y][x] = 1;
      }
    }

    for (let i = 0; i < 70; i++) {
      const cx = 4 + Math.floor(Math.random() * (width - 8));
      const cy = 4 + Math.floor(Math.random() * (height - 8));
      const inSettlement = cx >= settlementZone.minX && cx <= settlementZone.maxX && cy >= settlementZone.minY && cy <= settlementZone.maxY;
      if (inSettlement) continue;
      const radius = 1 + Math.floor(Math.random() * 3);
      for (let y = cy - radius; y <= cy + radius; y++) {
        for (let x = cx - radius; x <= cx + radius; x++) {
          if (x <= 1 || y <= 1 || x >= width - 1 || y >= height - 1) continue;
          if (Math.hypot(x - cx, y - cy) < radius + Math.random() * 0.7) {
            grid[y][x] = 2;
          }
        }
      }
    }

    for (let y = 5; y <= 13; y++) {
      for (let x = 5; x <= 15; x++) {
        grid[y][x] = 0;
      }
    }

    for (let y = 8; y <= 14; y++) {
      for (let x = 11; x <= 27; x++) {
        grid[y][x] = 0;
      }
    }

    for (let y = 5; y <= 14; y++) {
      for (let x = 15; x <= 23; x++) {
        grid[y][x] = 0;
      }
    }

    for (let x = 16; x <= 22; x++) {
      grid[6][x] = 3;
      grid[12][x] = 3;
    }
    for (let y = 6; y <= 12; y++) {
      grid[y][16] = 3;
      grid[y][22] = 3;
    }
    grid[12][19] = 0;

    for (let x = 14; x <= 24; x++) {
      grid[5][x] = 4;
      grid[14][x] = 4;
    }
    for (let y = 5; y <= 14; y++) {
      grid[y][14] = 4;
      grid[y][24] = 4;
    }
    grid[14][19] = 0;
    grid[14][20] = 0;

    for (let y = 11; y <= 14; y++) {
      for (let x = 18; x <= 21; x++) {
        grid[y][x] = 0;
      }
    }

    return grid;
  }

  function createHouseInteriorMap() {
    const width = 18;
    const height = 18;
    const map = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 3 : 0)),
    );

    map[height - 1][9] = 0;

    for (let y = 2; y <= 4; y++) {
      for (let x = 3; x <= 5; x++) {
        map[y][x] = 4;
      }
    }

    for (let y = 2; y <= 3; y++) {
      for (let x = 12; x <= 14; x++) {
        map[y][x] = 4;
      }
    }

    for (let y = 4; y <= 5; y++) {
      for (let x = 7; x <= 10; x++) {
        map[y][x] = 4;
      }
    }

    for (let x = 5; x <= 12; x++) {
      map[8][x] = 4;
    }

    return map;
  }

  function isInHouseLot(x, y) {
    return x >= 16 && x <= 22 && y >= 6 && y <= 12;
  }

  function findEmptyCell(map, minX = 2, minY = 2, maxX = map[0].length - 3, maxY = map.length - 3, extraCheck = null) {
    for (let attempts = 0; attempts < 1200; attempts++) {
      const x = minX + Math.floor(Math.random() * (maxX - minX + 1));
      const y = minY + Math.floor(Math.random() * (maxY - minY + 1));
      if (map[y][x] !== 0) continue;
      if (extraCheck && !extraCheck(x, y)) continue;
      return { x: x + 0.5, y: y + 0.5 };
    }
    return { x: minX + 0.5, y: minY + 0.5 };
  }

  const worldMap = createWorldMap(56, 56);
  const houseInteriorMap = createHouseInteriorMap();

  const textures = {
    stone: makeTexture("stone"),
    water: makeTexture("water"),
    timber: makeTexture("timber"),
    plaster: makeTexture("plaster"),
  };

  const state = {
    mode: "menu",
    time: 0,
    keys: {},
    mouseButtons: { left: false, right: false },
    mouseLook: 0,
    showMap: true,
    msg: [],
    weather: {
      kind: "clear",
      rain: 0,
      fog: 0.1,
      wind: 0.18,
      lightning: 0,
      timer: 22,
    },
    player: {
      x: 9.5,
      y: 8.5,
      angle: 0,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      level: 1,
      xp: 0,
      nextXp: 80,
      stamina: 100,
      gold: 25,
      attackCooldown: 0,
      hurtCooldown: 0,
      walkBob: 0,
      inHouse: false,
      blocking: false,
      comboStep: 0,
      comboWindow: 0,
      swingTimer: 0,
      swingDuration: 0.3,
      hitPulse: 0,
      cameraKick: 0,
      deaths: 0,
    },
    inventory: {
      "Crystal Shard": 0,
      Wood: 0,
      Stone: 0,
      Potion: 2,
      "Slime Core": 0,
    },
    quests: {
      crystal: {
        title: "1) Valley Survey",
        status: "locked",
        need: 4,
        progress: 0,
        reward: { xp: 60, gold: 25 },
      },
      slime: {
        title: "2) Marsh Cleansing",
        status: "locked",
        need: 3,
        progress: 0,
        reward: { xp: 75, gold: 35, potion: 1 },
      },
      wood: {
        title: "3) Raise Your House",
        status: "locked",
        need: 10,
        progress: 0,
        needWood: 6,
        needStone: 4,
        reward: { xp: 95, gold: 60 },
      },
    },
    npcs: [
      {
        id: "elder",
        name: "Elder Nira",
        x: 9.0,
        y: 8.2,
        homeX: 9.0,
        homeY: 8.2,
        color: "#d8bf9f",
        wanderRadius: 0.7,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "warden",
        name: "Warden Sol",
        x: 11.5,
        y: 8.8,
        homeX: 11.5,
        homeY: 8.8,
        color: "#8ab0cf",
        wanderRadius: 0.9,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "smith",
        name: "Smith Varo",
        x: 17.8,
        y: 10.8,
        homeX: 17.8,
        homeY: 10.8,
        color: "#c9937f",
        wanderRadius: 0.8,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "merchant",
        name: "Trader Nyx",
        x: 7.3,
        y: 9.6,
        homeX: 7.3,
        homeY: 9.6,
        color: "#bfa07e",
        wanderRadius: 0.85,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "innkeeper",
        name: "Innkeeper Mora",
        x: 6.4,
        y: 7.4,
        homeX: 6.4,
        homeY: 7.4,
        color: "#9f8db2",
        wanderRadius: 0.75,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "bard",
        name: "Bard Jingles",
        x: 8.5,
        y: 10.5,
        homeX: 8.5,
        homeY: 10.5,
        color: "#e8c44a",
        wanderRadius: 1.2,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "cat",
        name: "Whiskers the Cat",
        x: 12.5,
        y: 7.5,
        homeX: 12.5,
        homeY: 7.5,
        color: "#d4a574",
        wanderRadius: 1.5,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
    ],
    enemies: [],
    resources: [],
    chest: { x: 13.4, y: 7.2, opened: false, respawn: 0 },
    house: {
      unlocked: false,
      built: false,
      outsideDoor: { x: 19.5, y: 12.35 },
      outsideSpawn: { x: 19.5, y: 13.6, angle: -Math.PI / 2 },
      outsideReturn: null,
      interiorDoor: { x: 9.5, y: 15.2 },
      bed: { x: 4.4, y: 5.2 },
      stash: { x: 13.3, y: 3.4 },
      visits: 0,
    },
  };

  let hasSaveData = false;
  let lastSaveAt = null;
  let autoSaveTimer = 0;

  function currentMap() {
    return state.player.inHouse ? houseInteriorMap : worldMap;
  }

  function spawnEnemies() {
    state.enemies = [];
    for (let i = 0; i < 16; i++) {
      const pos = findEmptyCell(worldMap, 10, 10, 53, 53, (x, y) => !isInHouseLot(x, y) && Math.hypot(x - 10, y - 8) > 6);
      state.enemies.push({
        id: `slime-${i}`,
        type: "slime",
        x: pos.x,
        y: pos.y,
        hp: 48,
        maxHp: 48,
        speed: 1.35 + Math.random() * 0.45,
        attackCooldown: Math.random() * 0.75,
        alive: true,
        respawn: 0,
        stagger: 0,
      });
    }
  }

  function spawnResources() {
    state.resources = [];

    function addResource(type, count) {
      for (let i = 0; i < count; i++) {
        const pos = findEmptyCell(worldMap, 4, 4, 53, 53, (x, y) => !isInHouseLot(x, y) && Math.hypot(x - 10, y - 8) > 4);
        state.resources.push({
          id: `${type}-${i}`,
          type,
          x: pos.x,
          y: pos.y,
          harvested: false,
          respawn: 0,
        });
      }
    }

    addResource("crystal", 16);
    addResource("tree", 24);
    addResource("rock", 18);
  }

  spawnEnemies();
  spawnResources();

  function refreshContinueButton() {
    if (!continueBtn) return;
    continueBtn.style.display = hasSaveData ? "inline-block" : "none";
  }

  function readSaveData() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function syncSaveStateFromStorage() {
    const save = readSaveData();
    hasSaveData = Boolean(save);
    lastSaveAt = save ? numberOr(save.savedAt, Date.now()) : null;
    refreshContinueButton();
  }

  function captureSaveData() {
    return {
      version: 1,
      savedAt: Date.now(),
      time: state.time,
      player: {
        x: state.player.x,
        y: state.player.y,
        angle: state.player.angle,
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        level: state.player.level,
        xp: state.player.xp,
        nextXp: state.player.nextXp,
        stamina: state.player.stamina,
        gold: state.player.gold,
        deaths: state.player.deaths,
        inHouse: state.player.inHouse,
      },
      inventory: {
        "Crystal Shard": state.inventory["Crystal Shard"],
        Wood: state.inventory.Wood,
        Stone: state.inventory.Stone,
        Potion: state.inventory.Potion,
        "Slime Core": state.inventory["Slime Core"],
      },
      quests: {
        crystal: { status: state.quests.crystal.status, progress: state.quests.crystal.progress },
        slime: { status: state.quests.slime.status, progress: state.quests.slime.progress },
        wood: { status: state.quests.wood.status, progress: state.quests.wood.progress },
      },
      house: {
        unlocked: state.house.unlocked,
        built: state.house.built,
        visits: state.house.visits,
      },
      world: {
        chest: {
          x: state.chest.x,
          y: state.chest.y,
          opened: state.chest.opened,
          respawn: state.chest.respawn,
        },
        harvestedResourceIds: state.resources.filter((resource) => resource.harvested).map((resource) => resource.id),
        defeatedEnemyIds: state.enemies.filter((enemy) => !enemy.alive).map((enemy) => enemy.id),
      },
      showMap: state.showMap,
    };
  }

  function applyQuestState(key, questData) {
    const quest = state.quests[key];
    if (!quest || !questData) return;
    const nextStatus = QUEST_STATUSES.has(questData.status) ? questData.status : quest.status;
    const nextProgress = Math.floor(numberOr(questData.progress, quest.progress));
    quest.status = nextStatus;
    quest.progress = clamp(nextProgress, 0, quest.need);
  }

  function applySaveData(save) {
    if (!save || save.version !== 1) return false;

    resetWorld({ countDeath: false, silent: true });
    state.time = Math.max(0, numberOr(save.time, state.time));

    const player = save.player || {};
    state.player.maxHp = Math.max(40, Math.floor(numberOr(player.maxHp, state.player.maxHp)));
    state.player.level = Math.max(1, Math.floor(numberOr(player.level, state.player.level)));
    state.player.xp = Math.max(0, Math.floor(numberOr(player.xp, state.player.xp)));
    state.player.nextXp = Math.max(50, Math.floor(numberOr(player.nextXp, state.player.nextXp)));
    state.player.hp = clamp(numberOr(player.hp, state.player.maxHp), 0, state.player.maxHp);
    state.player.stamina = clamp(numberOr(player.stamina, 100), 0, 100);
    state.player.gold = Math.max(0, Math.floor(numberOr(player.gold, state.player.gold)));
    state.player.deaths = Math.max(0, Math.floor(numberOr(player.deaths, state.player.deaths)));

    const inventory = save.inventory || {};
    state.inventory["Crystal Shard"] = Math.max(0, Math.floor(numberOr(inventory["Crystal Shard"], 0)));
    state.inventory.Wood = Math.max(0, Math.floor(numberOr(inventory.Wood, 0)));
    state.inventory.Stone = Math.max(0, Math.floor(numberOr(inventory.Stone, 0)));
    state.inventory.Potion = Math.max(0, Math.floor(numberOr(inventory.Potion, 0)));
    state.inventory["Slime Core"] = Math.max(0, Math.floor(numberOr(inventory["Slime Core"], 0)));

    applyQuestState("crystal", save.quests?.crystal);
    applyQuestState("slime", save.quests?.slime);
    applyQuestState("wood", save.quests?.wood);

    state.house.unlocked = Boolean(save.house?.unlocked);
    state.house.built = Boolean(save.house?.built || state.house.unlocked);
    state.house.visits = Math.max(0, Math.floor(numberOr(save.house?.visits, state.house.visits)));

    state.showMap = typeof save.showMap === "boolean" ? save.showMap : state.showMap;

    const harvested = new Set(Array.isArray(save.world?.harvestedResourceIds) ? save.world.harvestedResourceIds : []);
    for (const resource of state.resources) {
      if (harvested.has(resource.id)) {
        resource.harvested = true;
        resource.respawn = Math.max(1, numberOr(resource.respawn, 14));
      }
    }

    const defeated = new Set(Array.isArray(save.world?.defeatedEnemyIds) ? save.world.defeatedEnemyIds : []);
    for (const enemy of state.enemies) {
      if (defeated.has(enemy.id)) {
        enemy.alive = false;
        enemy.hp = 0;
        enemy.stagger = 0;
        enemy.attackCooldown = 0;
        enemy.respawn = 8 + Math.random() * 8;
      }
    }

    if (save.world?.chest) {
      const chest = save.world.chest;
      state.chest.opened = Boolean(chest.opened);
      state.chest.respawn = state.chest.opened ? clamp(numberOr(chest.respawn, 24), 1, 80) : 0;
      const chestX = clamp(numberOr(chest.x, state.chest.x), 1.2, worldMap[0].length - 1.2);
      const chestY = clamp(numberOr(chest.y, state.chest.y), 1.2, worldMap.length - 1.2);
      if (!isInHouseLot(chestX, chestY)) {
        state.chest.x = chestX;
        state.chest.y = chestY;
      }
    }

    const wantsHouse = Boolean(player.inHouse && state.house.unlocked);
    state.player.inHouse = wantsHouse;

    const activeMap = state.player.inHouse ? houseInteriorMap : worldMap;
    const fallback = state.player.inHouse ? { x: 9.5, y: 14.2, angle: -Math.PI / 2 } : { x: 9.5, y: 8.5, angle: 0 };
    const px = clamp(numberOr(player.x, fallback.x), 1.2, activeMap[0].length - 1.2);
    const py = clamp(numberOr(player.y, fallback.y), 1.2, activeMap.length - 1.2);
    if (isBlocking(px, py)) {
      state.player.x = fallback.x;
      state.player.y = fallback.y;
    } else {
      state.player.x = px;
      state.player.y = py;
    }
    state.player.angle = normalizeAngle(numberOr(player.angle, fallback.angle));

    updateQuestProgressFromInventory();
    return true;
  }

  function saveGame(options = {}) {
    const { silent = false } = options;
    if (state.mode !== "playing" && state.mode !== "gameover") {
      if (!silent) logMsg("Start your journey before saving.");
      return false;
    }

    const payload = captureSaveData();
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
      if (!silent) logMsg("Save failed: local storage unavailable.");
      return false;
    }

    hasSaveData = true;
    lastSaveAt = payload.savedAt;
    autoSaveTimer = 0;
    refreshContinueButton();
    if (!silent) logMsg("Progress saved.");
    return true;
  }

  function loadGame(options = {}) {
    const { silent = false, fromMenu = false } = options;
    const payload = readSaveData();
    if (!payload) {
      hasSaveData = false;
      refreshContinueButton();
      if (!silent) logMsg("No saved journey found.");
      return false;
    }

    if (!applySaveData(payload)) {
      if (!silent) logMsg("Save file is incompatible.");
      return false;
    }

    hasSaveData = true;
    lastSaveAt = numberOr(payload.savedAt, Date.now());
    autoSaveTimer = 0;
    refreshContinueButton();

    if (fromMenu || state.mode !== "playing") {
      beginSession({ fromLoad: true });
    }

    if (!silent) logMsg("Journey loaded.");
    return true;
  }

  function beginSession(options = {}) {
    const { fromLoad = false } = options;
    state.mode = "playing";
    menu.style.display = "none";
    autoSaveTimer = 0;
    if (!fromLoad) {
      logMsg("Welcome to Dustward! Talk to NPCs, dodge slimes, and try not to die. Good luck!");
      ensureAudio();
    }
    canvas.focus();
  }

  function tickAutoSave(dt) {
    autoSaveTimer += dt;
    if (autoSaveTimer >= AUTOSAVE_INTERVAL) {
      saveGame({ silent: true });
    }
  }

  function logMsg(text) {
    state.msg.unshift({ text, ttl: 8 });
    if (state.msg.length > 8) state.msg.length = 8;
  }

  function grantXp(amount) {
    state.player.xp += amount;
    while (state.player.xp >= state.player.nextXp) {
      state.player.xp -= state.player.nextXp;
      state.player.level += 1;
      state.player.nextXp = Math.round(state.player.nextXp * 1.34 + 28);
      state.player.maxHp += 14;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 28);
      state.player.stamina = 100;
      logMsg(`Level up! You reached level ${state.player.level}. The valley trembles!`);
      sfx.levelUp();
      spawnParticles(canvas.width / 2, canvas.height / 2, 20, "#ffd700", 4, 1.5);
    }
  }

  function isBlocking(x, y) {
    const map = currentMap();
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (ty < 0 || tx < 0 || ty >= map.length || tx >= map[0].length) return true;
    return map[ty][tx] !== 0;
  }

  function moveWithCollision(dx, dy) {
    const px = state.player.x;
    const py = state.player.y;
    const nx = px + dx;
    const ny = py + dy;

    if (!isBlocking(nx, py)) state.player.x = nx;
    if (!isBlocking(state.player.x, ny)) state.player.y = ny;
  }

  function castRay(angle) {
    const map = currentMap();
    const rayDirX = Math.cos(angle);
    const rayDirY = Math.sin(angle);
    let mapX = Math.floor(state.player.x);
    let mapY = Math.floor(state.player.y);

    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let sideDistX;
    let sideDistY;
    let stepX;
    let stepY;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (state.player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - state.player.x) * deltaDistX;
    }

    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (state.player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - state.player.y) * deltaDistY;
    }

    let side = 0;
    let tileType = 0;
    let traveled = 0;

    while (traveled < MAX_RAY_DIST) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
        traveled = sideDistX - deltaDistX;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
        traveled = sideDistY - deltaDistY;
      }

      if (mapY < 0 || mapX < 0 || mapY >= map.length || mapX >= map[0].length) {
        tileType = 1;
        break;
      }

      tileType = map[mapY][mapX];
      if (tileType !== 0) break;
    }

    let distToWall;
    if (side === 0) {
      distToWall = (mapX - state.player.x + (1 - stepX) * 0.5) / (rayDirX || 1e-6);
    } else {
      distToWall = (mapY - state.player.y + (1 - stepY) * 0.5) / (rayDirY || 1e-6);
    }
    distToWall = clamp(distToWall, 0.0001, MAX_RAY_DIST);

    let wallX = side === 0 ? state.player.y + distToWall * rayDirY : state.player.x + distToWall * rayDirX;
    wallX -= Math.floor(wallX);

    return { dist: distToWall, tileType: tileType || 1, side, wallX };
  }

  function nearestEntity(entities, filter, maxDist) {
    let nearest = null;
    let best = maxDist;
    for (const entity of entities) {
      if (!filter(entity)) continue;
      const d = dist(state.player, entity);
      if (d < best) {
        best = d;
        nearest = entity;
      }
    }
    return nearest;
  }

  function updateQuestProgressFromInventory() {
    const crystalQuest = state.quests.crystal;
    if (crystalQuest.status === "active") {
      crystalQuest.progress = Math.min(crystalQuest.need, state.inventory["Crystal Shard"]);
      if (crystalQuest.progress >= crystalQuest.need) {
        crystalQuest.status = "complete";
        logMsg("Quest complete objective: Valley Survey ready to turn in.");
      }
    }

    const houseQuest = state.quests.wood;
    if (houseQuest.status === "active") {
      const woodPart = Math.min(houseQuest.needWood, state.inventory.Wood);
      const stonePart = Math.min(houseQuest.needStone, state.inventory.Stone);
      houseQuest.progress = woodPart + stonePart;
      if (houseQuest.progress >= houseQuest.need) {
        houseQuest.status = "complete";
        logMsg("Quest complete objective: Raise Your House ready to turn in.");
      }
    }
  }

  function enterHouse() {
    if (!state.house.unlocked) {
      logMsg("The cottage door is barred. Finish Smith Varo's quest.");
      return;
    }

    state.house.outsideReturn = {
      x: state.player.x,
      y: state.player.y,
      angle: state.player.angle,
    };

    state.player.inHouse = true;
    state.player.blocking = false;
    state.mouseButtons.right = false;
    state.player.x = 9.5;
    state.player.y = 14.2;
    state.player.angle = -Math.PI / 2;
    state.house.visits += 1;
    logMsg("You enter your house. Home sweet questionable home.");
    sfx.doorOpen();
  }

  function exitHouse() {
    const fallback = state.house.outsideSpawn;
    const ret = state.house.outsideReturn || fallback;
    state.player.inHouse = false;
    state.player.x = ret.x;
    state.player.y = ret.y;
    state.player.angle = ret.angle;
    state.player.blocking = false;
    state.mouseButtons.right = false;
    logMsg("You step back into the valley. Nature awaits... and so do the slimes.");
    sfx.doorOpen();
  }

  function interact() {
    if (state.mode !== "playing") return;

    if (state.player.inHouse) {
      if (dist(state.player, state.house.interiorDoor) < 1.7) {
        exitHouse();
        return;
      }

      if (dist(state.player, state.house.bed) < 1.7) {
        state.player.hp = state.player.maxHp;
        state.player.stamina = 100;
        state.player.hurtCooldown = 0;
        logMsg(choice(["You rest and recover fully. Ah, the sweet embrace of a mediocre mattress.", "Full health restored! The bed was slightly lumpy but did the job.", "You nap like a champion. All HP restored."]));
        sfx.potionUse();
        return;
      }

      if (dist(state.player, state.house.stash) < 1.7) {
        if (state.inventory["Slime Core"] > 0) {
          state.inventory["Slime Core"] -= 1;
          state.player.gold += 18;
          logMsg("Sold one Slime Core from your stash. +18 gold. It was grosser than expected.");
          sfx.shopBuy();
        } else if (state.inventory.Wood >= 2 && state.inventory.Stone >= 1) {
          state.inventory.Wood -= 2;
          state.inventory.Stone -= 1;
          state.inventory.Potion += 1;
          logMsg("Crafted one Potion at your workbench. It bubbles ominously. That's normal... right?");
          sfx.pickup();
        } else {
          logMsg("Workbench: deposit Slime Cores or 2 Wood + 1 Stone.");
        }
        updateQuestProgressFromInventory();
        return;
      }

      logMsg("You are home. Rest, craft, or head back out.");
      return;
    }

    if (dist(state.player, state.house.outsideDoor) < 1.8) {
      enterHouse();
      return;
    }

    const npc = nearestEntity(state.npcs, () => true, 1.95);
    if (npc) {
      if (npc.id === "elder") {
        const q = state.quests.crystal;
        if (q.status === "locked") {
          q.status = "active";
          q.progress = 0;
          logMsg("Elder Nira: Bring me 4 Crystal Shards to map these lands. I'd get them myself but... my knees.");
          sfx.npcChat();
          return;
        }
        if (q.status === "active") {
          logMsg(`Elder Nira: Crystal Shards ${q.progress}/${q.need}. I'm counting. Very slowly.`);
          sfx.npcChat();
          return;
        }
        if (q.status === "complete") {
          q.status = "turned_in";
          state.inventory["Crystal Shard"] = Math.max(0, state.inventory["Crystal Shard"] - q.need);
          grantXp(q.reward.xp);
          state.player.gold += q.reward.gold;
          logMsg(`Quest done: ${q.title}. +${q.reward.xp} XP, +${q.reward.gold} gold. Elder Nira nods approvingly.`);
          sfx.questDone();
          spawnParticles(canvas.width / 2, canvas.height / 2, 15, "#8fd0ff", 3, 1.2);
          if (state.quests.slime.status === "locked") {
            state.quests.slime.status = "active";
            logMsg("Elder Nira: Warden Sol needs the marsh cleared.");
          }
          return;
        }
        logMsg(choice(npcDialogue.elder.idle));
        sfx.npcChat();
        return;
      }

      if (npc.id === "warden") {
        const q = state.quests.slime;
        if (q.status === "locked") {
          if (state.quests.crystal.status !== "turned_in") {
            logMsg("Warden Sol: Earn the Elder's trust first.");
            return;
          }
          q.status = "active";
          q.progress = 0;
          logMsg("Warden Sol: Defeat 3 slimes near the marsh. Don't worry, they jiggle when scared.");
          sfx.npcChat();
          return;
        }
        if (q.status === "active") {
          logMsg(`Warden Sol: Slimes defeated ${q.progress}/${q.need}. They're not happy about it.`);
          sfx.npcChat();
          return;
        }
        if (q.status === "complete") {
          q.status = "turned_in";
          grantXp(q.reward.xp);
          state.player.gold += q.reward.gold;
          state.inventory.Potion += q.reward.potion;
          logMsg(`Quest done: ${q.title}. +${q.reward.xp} XP, +${q.reward.gold} gold, +1 Potion. The marsh smells slightly better.`);
          sfx.questDone();
          spawnParticles(canvas.width / 2, canvas.height / 2, 15, "#6be873", 3, 1.2);
          if (state.quests.wood.status === "locked") {
            state.quests.wood.status = "active";
            logMsg("Warden Sol: Smith Varo can now build your house.");
          }
          return;
        }
        logMsg(choice(npcDialogue.warden.idle));
        sfx.npcChat();
        return;
      }

      if (npc.id === "smith") {
        const q = state.quests.wood;
        if (q.status === "locked") {
          if (state.quests.slime.status !== "turned_in") {
            logMsg("Smith Varo: Help Warden Sol first.");
            return;
          }
          q.status = "active";
          q.progress = 0;
          state.house.built = true;
          logMsg("Smith Varo: Bring 6 Wood and 4 Stone. We'll raise your house. No refunds.");
          sfx.npcChat();
          return;
        }
        if (q.status === "active") {
          const woodPart = Math.min(q.needWood, state.inventory.Wood);
          const stonePart = Math.min(q.needStone, state.inventory.Stone);
          logMsg(`Smith Varo: Wood ${woodPart}/${q.needWood}, Stone ${stonePart}/${q.needStone}.`);
          return;
        }
        if (q.status === "complete") {
          q.status = "turned_in";
          state.inventory.Wood = Math.max(0, state.inventory.Wood - q.needWood);
          state.inventory.Stone = Math.max(0, state.inventory.Stone - q.needStone);
          grantXp(q.reward.xp);
          state.player.gold += q.reward.gold;
          state.house.unlocked = true;
          state.player.maxHp += 10;
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 24);
          logMsg(`Quest done: ${q.title}. You now own the house! It even has a roof. Probably.`);
          sfx.questDone();
          spawnParticles(canvas.width / 2, canvas.height / 2, 25, "#d8bc6a", 4, 1.5);
          return;
        }
        logMsg(choice(npcDialogue.smith.idle));
        sfx.npcChat();
        return;
      }

      if (npc.id === "merchant") {
        shopOpen = !shopOpen;
        shopSelection = 0;
        if (shopOpen) {
          sfx.npcChat();
          logMsg(choice(npcDialogue.merchant.idle));
        } else {
          logMsg("Trader Nyx: Come back when you have more gold... or desperation.");
        }
        return;
      }

      if (npc.id === "innkeeper") {
        if (state.player.hp < state.player.maxHp && state.player.gold >= 8) {
          state.player.gold -= 8;
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 28);
          sfx.potionUse();
          logMsg("Innkeeper Mora patched your wounds for 8 gold. 'You owe me a tip.'");
        } else if (state.player.hp >= state.player.maxHp) {
          logMsg(choice(npcDialogue.innkeeper.idle));
          sfx.npcChat();
        } else {
          logMsg("Innkeeper Mora: 8 gold for healing. I don't do charity... or quality.");
          sfx.npcChat();
        }
        return;
      }

      if (npc.id === "bard") {
        sfx.npcChat();
        logMsg(choice(npcDialogue.bard.idle));
        if (Math.random() < 0.3) {
          grantXp(3);
          logMsg("The song was oddly inspiring. +3 XP.");
        }
        return;
      }

      if (npc.id === "cat") {
        sfx.npcChat();
        logMsg(choice(npcDialogue.cat.idle));
        if (Math.random() < 0.15) {
          state.inventory.Potion += 1;
          logMsg("Whiskers coughed up... a potion? +1 Potion. Gross.");
          sfx.pickup();
        }
        return;
      }
    }

    const resource = nearestEntity(state.resources, (r) => !r.harvested, 1.6);
    if (resource) {
      resource.harvested = true;
      if (resource.type === "crystal") {
        resource.respawn = 26;
        state.inventory["Crystal Shard"] += 1;
        grantXp(6);
        logMsg(choice(["Collected Crystal Shard. Ooh, shiny!", "Crystal Shard acquired. It's warm to the touch.", "Got a Crystal Shard! The Elder will be thrilled."]));
        sfx.pickup();
      } else if (resource.type === "tree") {
        resource.respawn = 20;
        state.inventory.Wood += 1;
        grantXp(4);
        logMsg(choice(["Collected Wood. Timber!", "Wood acquired. Bob the Builder approves.", "Got Wood! ...phrasing."]));
        sfx.pickup();
      } else {
        resource.respawn = 22;
        state.inventory.Stone += 1;
        grantXp(4);
        logMsg(choice(["Collected Stone. Rock solid choice.", "Stone acquired. This one has personality.", "Got Stone! It's not just any rock. It's YOUR rock."]));
        sfx.pickup();
      }
      updateQuestProgressFromInventory();
      return;
    }

    if (!state.chest.opened && dist(state.player, state.chest) < 1.75) {
      state.chest.opened = true;
      state.chest.respawn = 38;
      sfx.pickup();
      spawnParticles(canvas.width / 2, canvas.height * 0.4, 12, "#d8bc6a", 3, 1);
      const loot = choice(["Potion", "Gold", "Gold", "Stone", "Crystal"]);
      if (loot === "Potion") {
        state.inventory.Potion += 1;
        logMsg("Supply cache: found 1 Potion! Someone left this here. Score!");
      } else if (loot === "Stone") {
        state.inventory.Stone += 1;
        logMsg("Supply cache: found 1 Stone. Not gold, but we'll take it.");
      } else if (loot === "Crystal") {
        state.inventory["Crystal Shard"] += 1;
        logMsg("Supply cache: found 1 Crystal Shard! Jackpot!");
      } else {
        const coins = 10 + Math.floor(Math.random() * 14);
        state.player.gold += coins;
        logMsg(`Supply cache: found ${coins} gold. Ka-ching!`);
      }
      updateQuestProgressFromInventory();
      return;
    }

    logMsg(choice(["Nothing useful here. Keep looking!", "You interact with the air. It's not impressed.", "Nothing to do here. The void stares back."]));
  }

  function attack() {
    if (state.mode !== "playing") return;
    if (state.player.attackCooldown > 0) return;
    if (state.player.stamina < 8) {
      logMsg("Too exhausted to swing.");
      return;
    }

    const combos = [
      { duration: 0.31, cooldown: 0.24, reach: 1.95, arc: 0.85, damage: 16, stamina: 9, lunge: 0.12, knock: 0.18 },
      { duration: 0.29, cooldown: 0.22, reach: 2.1, arc: 0.92, damage: 19, stamina: 10, lunge: 0.16, knock: 0.24 },
      { duration: 0.37, cooldown: 0.32, reach: 2.35, arc: 1.08, damage: 28, stamina: 14, lunge: 0.2, knock: 0.36 },
    ];

    if (state.player.comboWindow <= 0) {
      state.player.comboStep = 0;
    }
    state.player.comboStep = (state.player.comboStep % combos.length) + 1;

    const swing = combos[state.player.comboStep - 1];
    state.player.attackCooldown = swing.cooldown;
    state.player.comboWindow = 0.55;
    state.player.swingDuration = swing.duration;
    state.player.swingTimer = swing.duration;
    state.player.blocking = false;
    state.mouseButtons.right = false;
    state.player.stamina = Math.max(0, state.player.stamina - swing.stamina);
    state.player.cameraKick = clamp(state.player.cameraKick + 0.14 + state.player.comboStep * 0.04, 0, 0.7);
    sfx.swordSwing();

    if (!state.player.inHouse) {
      moveWithCollision(Math.cos(state.player.angle) * swing.lunge, Math.sin(state.player.angle) * swing.lunge);
    }

    if (state.player.inHouse) {
      logMsg("Your blade whistles through the room. The furniture is unimpressed.");
      sfx.swordSwing();
      return;
    }

    // Optimize enemy targeting by using squared distances to avoid sqrt
    const targets = state.enemies.filter(e => e.alive);
    const px = state.player.x;
    const py = state.player.y;
    targets.sort((a, b) => {
      const daSq = (a.x - px) * (a.x - px) + (a.y - py) * (a.y - py);
      const dbSq = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
      return daSq - dbSq;
    });

    let hitCount = 0;
    for (const enemy of targets) {
      if (hitCount >= 2) break;
      const dx = enemy.x - state.player.x;
      const dy = enemy.y - state.player.y;
      const d = Math.hypot(dx, dy);
      if (d > swing.reach) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      const facingDiff = Math.abs(normalizeAngle(angleToEnemy - state.player.angle));
      if (facingDiff > swing.arc) continue;

      const damage = swing.damage + Math.floor(state.player.level * 1.8) + Math.floor(Math.random() * 4) - 1;
      enemy.hp -= damage;
      enemy.attackCooldown += 0.45;
      enemy.stagger = 0.2 + state.player.comboStep * 0.05;

      const nx = dx / (d + 1e-6);
      const ny = dy / (d + 1e-6);
      const pushX = enemy.x + nx * swing.knock;
      const pushY = enemy.y + ny * swing.knock;
      if (!isBlocking(pushX, enemy.y)) enemy.x = pushX;
      if (!isBlocking(enemy.x, pushY)) enemy.y = pushY;

      hitCount += 1;

      if (enemy.hp <= 0) {
        enemy.alive = false;
        enemy.respawn = 22 + Math.random() * 8;
        state.inventory["Slime Core"] += 1;
        state.player.gold += 10;
        grantXp(22);
        logMsg(choice([
          "Slime obliterated! +10 gold, +22 XP, +1 Slime Core.",
          "Splat! One less blob. +10 gold, +22 XP, +1 Core.",
          "Slime defeated! It died as it lived: jiggly. +10g, +22 XP.",
          "Another slime bites the dust(ward). +10g, +22 XP, +1 Core.",
        ]));
        sfx.enemyDie();
        spawnParticles(canvas.width / 2, canvas.height * 0.4, 10, "#6be873", 3, 0.8);

        const quest = state.quests.slime;
        if (quest.status === "active") {
          quest.progress += 1;
          if (quest.progress >= quest.need) {
            quest.progress = quest.need;
            quest.status = "complete";
            logMsg("Quest complete objective: Marsh Cleansing ready to turn in.");
          }
        }
      } else {
        logMsg(`Sword hit for ${damage}. ${choice(["Ouch!", "That'll leave a mark!", "Jelly everywhere!", "Take that, blob!"])}`);
        sfx.swordHit();
      }
    }

    if (hitCount === 0) {
      logMsg(choice(["Your strike misses. The air is very dead though.", "Swing and a miss! Elegant, yet useless.", "You hit nothing. The wind is offended."]));
      sfx.miss();
    } else {
      state.player.hitPulse = 0.24;
      state.player.cameraKick = clamp(state.player.cameraKick + hitCount * 0.12, 0, 1);
      if (hitCount > 1) logMsg("Cleave strike landed on multiple targets.");
    }
  }

  function usePotion() {
    if (state.mode !== "playing") return;
    if (state.inventory.Potion <= 0) {
      logMsg("No potion left.");
      return;
    }
    if (state.player.hp >= state.player.maxHp) {
      logMsg("Health is already full.");
      return;
    }

    state.inventory.Potion -= 1;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 38);
    logMsg(choice(["Potion used. Tastes like victory... and feet.", "Glug glug. Health restored. Dignity pending.", "Potion consumed. Your taste buds will never forgive you."]));
    sfx.potionUse();
    spawnParticles(canvas.width / 2, canvas.height * 0.8, 8, "#5fe0b5", 2, 0.6);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function resetWorld(options = {}) {
    const { countDeath = true, silent = false } = options;
    state.player.x = 9.5;
    state.player.y = 8.5;
    state.player.angle = 0;
    state.player.hp = state.player.maxHp;
    state.player.attackCooldown = 0;
    state.player.hurtCooldown = 0;
    state.player.walkBob = 0;
    state.player.comboStep = 0;
    state.player.comboWindow = 0;
    state.player.swingTimer = 0;
    state.player.cameraKick = 0;
    state.player.hitPulse = 0;
    state.player.inHouse = false;
    state.player.blocking = false;
    state.player.stamina = 100;
    if (countDeath) state.player.deaths += 1;
    state.mouseButtons.right = false;

    spawnEnemies();
    spawnResources();

    state.chest.opened = false;
    state.chest.respawn = 0;
    if (!silent) logMsg("You recover at camp. The valley reshapes itself. The slimes reset. It's like nothing happened... except your pride.");
  }

  function weatherLabel(kind) {
    if (kind === "mist") return "Mist";
    if (kind === "rain") return "Rain";
    if (kind === "storm") return "Storm";
    return "Clear";
  }

  function updateWeather(dt) {
    const weather = state.weather;
    weather.timer -= dt;

    if (weather.timer <= 0) {
      const roll = Math.random();
      if (roll < 0.45) {
        weather.kind = "clear";
      } else if (roll < 0.67) {
        weather.kind = "mist";
      } else if (roll < 0.9) {
        weather.kind = "rain";
      } else {
        weather.kind = "storm";
      }
      weather.timer = 16 + Math.random() * 26;
    }

    let targetRain = 0;
    let targetFog = 0.11;
    let targetWind = 0.2;

    if (weather.kind === "mist") {
      targetRain = 0;
      targetFog = 0.32;
      targetWind = 0.12;
    } else if (weather.kind === "rain") {
      targetRain = 0.48;
      targetFog = 0.22;
      targetWind = 0.32;
    } else if (weather.kind === "storm") {
      targetRain = 0.86;
      targetFog = 0.36;
      targetWind = 0.56;
    }

    const blend = clamp(dt * 0.65, 0, 1);
    weather.rain = lerp(weather.rain, targetRain, blend);
    weather.fog = lerp(weather.fog, targetFog, blend);
    weather.wind = lerp(weather.wind, targetWind, blend * 0.8);
    weather.lightning = Math.max(0, weather.lightning - dt * 1.7);

    if (weather.kind === "storm" && weather.lightning <= 0 && Math.random() < dt * 0.08) {
      weather.lightning = 1;
    }
  }

  function updateNPCs(dt) {
    if (state.player.inHouse) return;

    for (const npc of state.npcs) {
      npc.wanderTimer -= dt;
      if (npc.wanderTimer <= 0) {
        npc.wanderAngle = Math.random() * TAU;
        npc.wanderTimer = 1.8 + Math.random() * 2.2;
      }

      const tx = npc.homeX + Math.cos(npc.wanderAngle) * npc.wanderRadius;
      const ty = npc.homeY + Math.sin(npc.wanderAngle) * npc.wanderRadius;
      const dx = tx - npc.x;
      const dy = ty - npc.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.05) continue;

      const speed = 0.42;
      const nx = npc.x + (dx / d) * speed * dt;
      const ny = npc.y + (dy / d) * speed * dt;

      if (!isBlocking(nx, npc.y) && dist({ x: nx, y: npc.y }, state.player) > 0.9) {
        npc.x = nx;
      }
      if (!isBlocking(npc.x, ny) && dist({ x: npc.x, y: ny }, state.player) > 0.9) {
        npc.y = ny;
      }
    }
  }

  function update(dt) {
    state.time += dt;

    for (const m of state.msg) {
      m.ttl -= dt;
    }
    // Use reverse loop to remove expired messages without creating new array
    for (let i = state.msg.length - 1; i >= 0; i--) {
      if (state.msg[i].ttl <= 0) {
        state.msg.splice(i, 1);
      }
    }

    const player = state.player;
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.hurtCooldown = Math.max(0, player.hurtCooldown - dt);
    player.comboWindow = Math.max(0, player.comboWindow - dt);
    player.swingTimer = Math.max(0, player.swingTimer - dt);
    player.hitPulse = Math.max(0, player.hitPulse - dt * 2.4);
    player.cameraKick = Math.max(0, player.cameraKick - dt * 1.8);
    updateWeather(dt);

    if (state.mode !== "playing") return;

    const turnInput = (state.keys.ArrowLeft ? -1 : 0) + (state.keys.ArrowRight ? 1 : 0);
    player.angle = normalizeAngle(player.angle + turnInput * PLAYER_ROT_SPEED * dt + state.mouseLook);
    state.mouseLook = 0;

    player.blocking = (state.mouseButtons.right || state.keys.KeyC) && player.swingTimer <= 0;

    const forward = (state.keys.KeyW || state.keys.ArrowUp ? 1 : 0) - (state.keys.KeyS || state.keys.ArrowDown ? 1 : 0);
    const strafe = (state.keys.KeyD ? 1 : 0) - (state.keys.KeyA ? 1 : 0);

    const sprinting = (state.keys.ShiftLeft || state.keys.ShiftRight) && !player.blocking && !player.inHouse;
    let speedFactor = 1;
    if (sprinting && player.stamina > 4) {
      speedFactor = 1.42;
      player.stamina = Math.max(0, player.stamina - dt * 24);
    } else {
      player.stamina = Math.min(100, player.stamina + dt * (player.blocking ? 5 : 8.6));
    }

    if (player.blocking) speedFactor *= 0.62;
    if (player.inHouse) speedFactor *= 0.85;
    if (!player.inHouse && state.weather.rain > 0.45) speedFactor *= 0.93;
    if (!player.inHouse && player.stamina < 20) speedFactor *= 0.9;

    // Pre-compute trigonometric values to avoid duplicate calculations
    const cosAngle = Math.cos(player.angle);
    const sinAngle = Math.sin(player.angle);
    const cos90 = -sinAngle; // cos(angle + PI/2) = -sin(angle)
    const sin90 = cosAngle;  // sin(angle + PI/2) = cos(angle)
    
    const vx = (cosAngle * forward + cos90 * strafe) * PLAYER_SPEED * speedFactor * dt;
    const vy = (sinAngle * forward + sin90 * strafe) * PLAYER_SPEED * speedFactor * dt;
    moveWithCollision(vx, vy);

    const moving = Math.abs(forward) + Math.abs(strafe) > 0;
    player.walkBob += dt * (moving ? 9.8 * speedFactor : 1.8);

    /* Footstep sounds */
    if (moving) {
      footstepTimer -= dt;
      if (footstepTimer <= 0) {
        sfx.footstep();
        footstepTimer = sprinting ? 0.25 : 0.38;
      }
    } else {
      footstepTimer = 0;
    }

    /* Ambient weather sounds */
    ambientTimer -= dt;
    if (ambientTimer <= 0 && !player.inHouse) {
      if (state.weather.rain > 0.3) sfx.rain();
      if (state.weather.lightning > 0.5) sfx.thunder();
      ambientTimer = 1.5 + Math.random();
    }

    /* Particles */
    updateParticles(dt);

    updateNPCs(dt);

    if (player.inHouse) {
      updateQuestProgressFromInventory();
      tickAutoSave(dt);
      return;
    }

    const weatherPursuitMult = 1 - state.weather.rain * 0.18;
    for (const enemy of state.enemies) {
      if (!enemy.alive) {
        enemy.respawn -= dt;
        if (enemy.respawn <= 0) {
          const pos = findEmptyCell(worldMap, 10, 10, 53, 53, (x, y) => !isInHouseLot(x, y));
          enemy.x = pos.x;
          enemy.y = pos.y;
          enemy.hp = enemy.maxHp;
          enemy.alive = true;
          enemy.attackCooldown = 0.7;
          enemy.stagger = 0;
        }
        continue;
      }

      if (enemy.stagger > 0) {
        enemy.stagger -= dt;
      }

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const d = Math.hypot(dx, dy);

      if (d < 9.5 && enemy.stagger <= 0) {
        // Pre-compute inverse distance to avoid division in both calculations
        const invD = 1 / (d + 1e-6);
        const nx = dx * invD;
        const ny = dy * invD;
        const move = enemy.speed * weatherPursuitMult * dt;
        const nextX = enemy.x + nx * move;
        const nextY = enemy.y + ny * move;

        if (!isBlocking(nextX, enemy.y)) enemy.x = nextX;
        if (!isBlocking(enemy.x, nextY)) enemy.y = nextY;

        enemy.attackCooldown -= dt;
        if (d < 1.22 && enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 1 + Math.random() * 0.5;
          if (player.hurtCooldown <= 0) {
            player.hurtCooldown = 0.33;
            let damage = 7 + Math.floor(Math.random() * 6);

            if (player.blocking) {
              const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
              const facingDiff = Math.abs(normalizeAngle(angleToEnemy - player.angle));
              if (facingDiff < 1.12 && player.stamina > 10) {
                damage = Math.max(1, Math.floor(damage * 0.35));
                player.stamina = Math.max(0, player.stamina - 11);
                logMsg("Block absorbed most of the hit. Your shield arm disagrees.");
                sfx.blockHit();
              } else {
                damage = Math.max(1, Math.floor(damage * 0.85));
              }
            }

            player.hp -= damage;
            player.hitPulse = Math.max(player.hitPulse, 0.16);
            player.cameraKick = clamp(player.cameraKick + 0.18, 0, 1);
            logMsg(`A slime strikes for ${damage}. ${choice(["Ow!", "That stings!", "Gross AND painful!", "It's so slimy!"])}`);
            sfx.playerHurt();

            if (player.hp <= 0) {
              player.hp = 0;
              state.mode = "gameover";
              logMsg(choice(deathMessages) + " Press R to recover.");
              sfx.death();
            }
          }
        }
      }
    }

    for (const resource of state.resources) {
      if (resource.harvested) {
        resource.respawn -= dt;
        if (resource.respawn <= 0) {
          resource.harvested = false;
          const pos = findEmptyCell(worldMap, 4, 4, 53, 53, (x, y) => !isInHouseLot(x, y));
          resource.x = pos.x;
          resource.y = pos.y;
        }
      }
    }

    if (state.chest.opened) {
      state.chest.respawn -= dt;
      if (state.chest.respawn <= 0) {
        state.chest.opened = false;
        const pos = findEmptyCell(worldMap, 8, 6, 20, 15, (x, y) => !isInHouseLot(x, y));
        state.chest.x = pos.x;
        state.chest.y = pos.y;
      }
    }

    /* Auto-close shop if player walks away from merchant */
    if (shopOpen) {
      const merchant = state.npcs.find(n => n.id === "merchant");
      if (!merchant || dist(state.player, merchant) > 2.5) {
        shopOpen = false;
      }
    }

    updateQuestProgressFromInventory();
    tickAutoSave(dt);
  }

  function drawInteriorBackdrop(width, height) {
    const horizon = Math.floor(height * 0.57);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    ceilGrad.addColorStop(0, "#2a2d35");
    ceilGrad.addColorStop(1, "#4b3d32");
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, width, horizon);

    const floorGrad = ctx.createLinearGradient(0, horizon, 0, height);
    floorGrad.addColorStop(0, "#5e4e3d");
    floorGrad.addColorStop(1, "#2f2822");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, width, height - horizon);

    for (let i = 0; i < 18; i++) {
      const t = i / 18;
      const y = horizon + t * (height - horizon);
      ctx.strokeStyle = `rgba(34, 23, 15, ${0.16 * (1 - t)})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    return horizon;
  }

  // Cache for gradients to avoid recreation every frame
  let cachedCloudGradient = null;
  let lastCloudOpacity = -1;

  function drawSkyAndGround(width, height) {
    if (state.player.inHouse) {
      return drawInteriorBackdrop(width, height);
    }

    const weather = state.weather;
    const day = 0.5 + Math.sin(state.time * 0.014) * 0.45;
    const horizon = Math.floor(height * 0.5);
    const stormShade = weather.rain * 0.28 + weather.fog * 0.24;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(
      0,
      `rgb(${Math.floor(lerp(9, 109, day) * (1 - stormShade))}, ${Math.floor(lerp(16, 164, day) * (1 - stormShade * 0.9))}, ${Math.floor(
        lerp(32, 220, day) * (1 - stormShade * 0.7),
      )})`,
    );
    skyGrad.addColorStop(
      1,
      `rgb(${Math.floor(lerp(40, 182, day) * (1 - stormShade * 0.9))}, ${Math.floor(lerp(62, 204, day) * (1 - stormShade * 0.82))}, ${Math.floor(
        lerp(94, 235, day) * (1 - stormShade * 0.65),
      )})`,
    );
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizon);

    if (day < 0.35) {
      const starAlpha = clamp((0.35 - day) / 0.35, 0, 1) * (1 - weather.rain * 0.75);
      ctx.fillStyle = `rgba(232, 241, 255, ${0.58 * starAlpha})`;
      for (let i = 0; i < 90; i++) {
        const sx = ((i * 137 + 53) % (width + 23)) - 12;
        const sy = (i * 97 + 31) % Math.floor(horizon * 0.85);
        const twinkle = 0.4 + Math.sin(state.time * 0.9 + i * 2.7) * 0.35;
        const size = twinkle > 0.62 ? 2 : 1;
        ctx.globalAlpha = clamp(starAlpha * twinkle, 0, 1);
        ctx.fillRect(sx, sy, size, size);
      }
      ctx.globalAlpha = 1;
    }

    const sunX = width * (0.16 + (Math.sin(state.time * 0.006) * 0.5 + 0.5) * 0.68);
    const sunY = horizon * (0.2 + Math.cos(state.time * 0.006) * 0.08);
    const sunR = lerp(30, 56, day);
    if (day > 0.16) {
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.8);
      sunGrad.addColorStop(0, `rgba(255, 247, 204, ${0.68 * day * (1 - weather.rain * 0.7)})`);
      sunGrad.addColorStop(1, "rgba(255, 247, 204, 0)");
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, width, horizon);
    } else {
      const moonGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.2);
      moonGrad.addColorStop(0, "rgba(220, 234, 255, 0.52)");
      moonGrad.addColorStop(1, "rgba(220, 234, 255, 0)");
      ctx.fillStyle = moonGrad;
      ctx.fillRect(0, 0, width, horizon);
    }

    const cloudCount = 7 + Math.floor(weather.fog * 10);
    const cloudOpacity = 0.12 + day * 0.14 + weather.fog * 0.22;
    
    // Cache cloud gradient if opacity hasn't changed significantly
    if (!cachedCloudGradient || Math.abs(lastCloudOpacity - cloudOpacity) > 0.01) {
      cachedCloudGradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 72);
      cachedCloudGradient.addColorStop(0, `rgba(255,255,255,${cloudOpacity})`);
      cachedCloudGradient.addColorStop(1, "rgba(255,255,255,0)");
      lastCloudOpacity = cloudOpacity;
    }
    
    for (let i = 0; i < cloudCount; i++) {
      const cx = ((i * 260 + state.time * (6 + i) + state.weather.wind * 230) % (width + 320)) - 140;
      const cy = 58 + (i % 3) * 34 + Math.sin(state.time * 0.1 + i) * 8;
      
      // Use cached gradient with translation
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = cachedCloudGradient;
      ctx.fillRect(-90, -55, 180, 110);
      ctx.restore();
    }

    const ridge = (amp, offset, elev, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, elev);
      for (let x = 0; x <= width; x += 18) {
        const y = elev + Math.sin(x * 0.006 + offset) * amp + Math.sin(x * 0.011 + offset * 0.75) * amp * 0.52;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, horizon + 120);
      ctx.lineTo(0, horizon + 120);
      ctx.closePath();
      ctx.fill();
    };

    ridge(13, state.time * 0.03, horizon - 44, `rgba(70, 108, 120, ${0.28 + day * 0.2 + weather.fog * 0.3})`);
    ridge(18, state.time * 0.04 + 1.4, horizon - 18, `rgba(52, 84, 98, ${0.36 + day * 0.2 + weather.fog * 0.24})`);

    const groundGrad = ctx.createLinearGradient(0, horizon, 0, height);
    groundGrad.addColorStop(
      0,
      `rgb(${Math.floor(lerp(50, 132, day) * (1 - weather.rain * 0.22))}, ${Math.floor(lerp(68, 178, day) * (1 - weather.rain * 0.28))}, ${Math.floor(
        lerp(56, 116, day) * (1 - weather.rain * 0.2),
      )})`,
    );
    groundGrad.addColorStop(
      1,
      `rgb(${Math.floor(lerp(34, 90, day) * (1 - weather.rain * 0.18))}, ${Math.floor(lerp(46, 126, day) * (1 - weather.rain * 0.2))}, ${Math.floor(
        lerp(38, 86, day) * (1 - weather.rain * 0.14),
      )})`,
    );
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizon, width, height - horizon);

    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      const y = horizon + t * t * (height - horizon);
      const alpha = (1 - t) * 0.12;
      ctx.strokeStyle = `rgba(34, 66, 42, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y + (i % 2));
      ctx.lineTo(width, y + (i % 2));
      ctx.stroke();
    }

    if (weather.fog > 0.06) {
      const haze = ctx.createLinearGradient(0, horizon - 20, 0, height);
      haze.addColorStop(0, `rgba(204, 219, 232, ${weather.fog * 0.2})`);
      haze.addColorStop(1, `rgba(204, 219, 232, ${weather.fog * 0.34})`);
      ctx.fillStyle = haze;
      ctx.fillRect(0, horizon - 20, width, height - horizon + 20);
    }

    return horizon;
  }

  function drawWeatherOverlay() {
    if (state.player.inHouse) return;

    const weather = state.weather;
    if (weather.rain > 0.03) {
      const streaks = Math.floor(canvas.width * (0.03 + weather.rain * 0.1));
      ctx.strokeStyle = `rgba(196, 218, 238, ${0.1 + weather.rain * 0.2})`;
      ctx.lineWidth = 1.1;
      for (let i = 0; i < streaks; i++) {
        const x = ((i * 29 + state.time * (300 + weather.wind * 500)) % (canvas.width + 80)) - 40;
        const y = ((i * 53 + state.time * (590 + weather.rain * 700)) % (canvas.height + 100)) - 50;
        const len = 12 + weather.rain * 11;
        const dx = 3 + weather.wind * 18;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + len);
        ctx.stroke();
      }
    }

    if (weather.fog > 0.08) {
      const fog = ctx.createLinearGradient(0, 0, 0, canvas.height);
      fog.addColorStop(0, `rgba(214, 226, 236, ${weather.fog * 0.08})`);
      fog.addColorStop(1, `rgba(214, 226, 236, ${weather.fog * 0.2})`);
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (weather.lightning > 0.01) {
      const flash = clamp(weather.lightning, 0, 1);
      ctx.fillStyle = `rgba(242, 247, 255, ${flash * 0.28})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawBillboardSprite(sprite, left, top, spriteWidth, spriteHeight, lightFactor) {
    ctx.save();
    ctx.translate(left, top);

    ctx.fillStyle = `rgba(0, 0, 0, ${0.15 * lightFactor})`;
    ctx.beginPath();
    ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.94, spriteWidth * 0.36, spriteHeight * 0.08, 0, 0, TAU);
    ctx.fill();

    if (sprite.kind === "npc") {
      const robe = ctx.createLinearGradient(0, 0, 0, spriteHeight);
      robe.addColorStop(0, shadeHex(sprite.color, 1.2));
      robe.addColorStop(1, shadeHex(sprite.color, 0.55));
      ctx.fillStyle = robe;
      ctx.fillRect(spriteWidth * 0.3, spriteHeight * 0.3, spriteWidth * 0.4, spriteHeight * 0.62);
      ctx.fillStyle = "#e0c0a7";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.2, Math.max(3, spriteWidth * 0.14), 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(spriteWidth * 0.35, spriteHeight * 0.34, spriteWidth * 0.06, spriteHeight * 0.35);
    } else if (sprite.kind === "enemy") {
      const slime = ctx.createRadialGradient(spriteWidth * 0.45, spriteHeight * 0.34, 2, spriteWidth * 0.45, spriteHeight * 0.52, spriteHeight * 0.5);
      slime.addColorStop(0, "#bcffcc");
      slime.addColorStop(1, "#3ea65a");
      ctx.fillStyle = slime;
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.14, spriteHeight * 0.84);
      ctx.quadraticCurveTo(spriteWidth * 0.07, spriteHeight * 0.45, spriteWidth * 0.33, spriteHeight * 0.2);
      ctx.quadraticCurveTo(spriteWidth * 0.5, spriteHeight * 0.08, spriteWidth * 0.67, spriteHeight * 0.2);
      ctx.quadraticCurveTo(spriteWidth * 0.93, spriteHeight * 0.45, spriteWidth * 0.86, spriteHeight * 0.84);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1f5b30";
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.43, spriteWidth * 0.08, spriteHeight * 0.06);
      ctx.fillRect(spriteWidth * 0.58, spriteHeight * 0.43, spriteWidth * 0.08, spriteHeight * 0.06);
    } else if (sprite.kind === "resource" && sprite.label === "Tree") {
      ctx.fillStyle = "#63472f";
      ctx.fillRect(spriteWidth * 0.44, spriteHeight * 0.36, spriteWidth * 0.14, spriteHeight * 0.58);
      ctx.fillStyle = "#3f824b";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.33, spriteWidth * 0.27, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(184, 231, 170, 0.38)";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.42, spriteHeight * 0.26, spriteWidth * 0.12, 0, TAU);
      ctx.fill();
    } else if (sprite.kind === "resource" && sprite.label === "Stone") {
      ctx.fillStyle = "#8f969f";
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.2, spriteHeight * 0.85);
      ctx.lineTo(spriteWidth * 0.27, spriteHeight * 0.42);
      ctx.lineTo(spriteWidth * 0.51, spriteHeight * 0.2);
      ctx.lineTo(spriteWidth * 0.77, spriteHeight * 0.45);
      ctx.lineTo(spriteWidth * 0.82, spriteHeight * 0.84);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(spriteWidth * 0.4, spriteHeight * 0.35, spriteWidth * 0.08, spriteHeight * 0.24);
    } else if (sprite.kind === "resource") {
      ctx.fillStyle = "#8fd0ff";
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.1);
      ctx.lineTo(spriteWidth * 0.8, spriteHeight * 0.44);
      ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.9);
      ctx.lineTo(spriteWidth * 0.2, spriteHeight * 0.44);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.2, spriteWidth * 0.08, spriteHeight * 0.5);
    } else if (sprite.kind === "chest") {
      const wood = ctx.createLinearGradient(0, 0, 0, spriteHeight);
      wood.addColorStop(0, "#bc8b55");
      wood.addColorStop(1, "#6c4b30");
      ctx.fillStyle = wood;
      ctx.fillRect(spriteWidth * 0.18, spriteHeight * 0.45, spriteWidth * 0.64, spriteHeight * 0.45);
      ctx.fillStyle = "#c8ac43";
      ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.52, spriteWidth * 0.08, spriteHeight * 0.22);
      ctx.fillStyle = "#8b6c3e";
      ctx.fillRect(spriteWidth * 0.18, spriteHeight * 0.42, spriteWidth * 0.64, spriteHeight * 0.08);
    } else if (sprite.kind === "house-door") {
      ctx.fillStyle = state.house.unlocked ? "#7f694a" : "#5f4f3a";
      ctx.fillRect(spriteWidth * 0.3, spriteHeight * 0.22, spriteWidth * 0.4, spriteHeight * 0.72);
      ctx.fillStyle = state.house.unlocked ? "#d8ba6d" : "#885a34";
      ctx.fillRect(spriteWidth * 0.62, spriteHeight * 0.56, spriteWidth * 0.05, spriteHeight * 0.05);
      if (state.house.unlocked) {
        ctx.fillStyle = "rgba(255, 232, 154, 0.28)";
        ctx.fillRect(spriteWidth * 0.36, spriteHeight * 0.3, spriteWidth * 0.28, spriteHeight * 0.2);
      }
    } else if (sprite.kind === "bed") {
      ctx.fillStyle = "#5f4836";
      ctx.fillRect(spriteWidth * 0.18, spriteHeight * 0.62, spriteWidth * 0.64, spriteHeight * 0.3);
      ctx.fillStyle = "#7c2f2f";
      ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.42, spriteWidth * 0.56, spriteHeight * 0.22);
      ctx.fillStyle = "#dbd2be";
      ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.34, spriteWidth * 0.2, spriteHeight * 0.1);
    } else if (sprite.kind === "stash") {
      ctx.fillStyle = "#7a5a3d";
      ctx.fillRect(spriteWidth * 0.2, spriteHeight * 0.34, spriteWidth * 0.6, spriteHeight * 0.56);
      ctx.fillStyle = "#d2b457";
      ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.56, spriteWidth * 0.08, spriteHeight * 0.16);
    } else if (sprite.kind === "exit-door") {
      ctx.fillStyle = "#6f553a";
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.2, spriteWidth * 0.32, spriteHeight * 0.74);
      ctx.fillStyle = "#e1d29f";
      ctx.fillRect(spriteWidth * 0.6, spriteHeight * 0.55, spriteWidth * 0.04, spriteHeight * 0.05);
    }

    ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * (1 - lightFactor + 0.24)})`;
    ctx.fillRect(0, 0, spriteWidth, spriteHeight);
    ctx.restore();
  }

  function drawWeaponOverlay() {
    if (state.mode !== "playing") return;

    const p = state.player;
    const idleBob = Math.sin(p.walkBob * 2.1) * 4;
    const swingT = p.swingTimer > 0 ? 1 - p.swingTimer / p.swingDuration : 0;
    const eased = easeOutCubic(swingT);

    let x = canvas.width * 0.74 + idleBob;
    let y = canvas.height * 0.86 + Math.abs(idleBob) * 0.45;
    let rot = -0.28;

    if (p.blocking) {
      x = canvas.width * 0.64 + idleBob * 0.3;
      y = canvas.height * 0.84;
      rot = -1.08;
    }

    if (p.swingTimer > 0) {
      if (p.comboStep === 1) {
        x = lerp(canvas.width * 0.87, canvas.width * 0.55, eased);
        y = lerp(canvas.height * 0.88, canvas.height * 0.7, eased);
        rot = lerp(0.95, -0.48, eased);
      } else if (p.comboStep === 2) {
        x = lerp(canvas.width * 0.54, canvas.width * 0.88, eased);
        y = lerp(canvas.height * 0.72, canvas.height * 0.86, eased);
        rot = lerp(-0.72, 0.55, eased);
      } else {
        x = lerp(canvas.width * 0.64, canvas.width * 0.74, eased);
        y = lerp(canvas.height * 0.58, canvas.height * 0.87, eased);
        rot = lerp(-1.62, -0.2, eased);
      }
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    if (p.swingTimer > 0) {
      ctx.strokeStyle = "rgba(229, 241, 255, 0.42)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(22, -124);
      ctx.lineTo(25, -20);
      ctx.stroke();
      ctx.lineWidth = 2;
    }

    const blade = ctx.createLinearGradient(0, -130, 0, 34);
    blade.addColorStop(0, "#fbfdff");
    blade.addColorStop(1, "#8fa5b9");
    ctx.fillStyle = blade;
    ctx.fillRect(16, -118, 18, 136);

    ctx.fillStyle = "#5d6b76";
    ctx.fillRect(9, 9, 32, 8);

    ctx.fillStyle = "#865837";
    ctx.fillRect(18, 17, 14, 42);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(19, -112, 3, 112);

    const forearm = ctx.createLinearGradient(4, 52, 52, 102);
    forearm.addColorStop(0, "#d7b49b");
    forearm.addColorStop(1, "#b98970");
    ctx.fillStyle = forearm;
    ctx.beginPath();
    ctx.moveTo(8, 56);
    ctx.lineTo(40, 56);
    ctx.lineTo(56, 98);
    ctx.lineTo(3, 102);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(82, 46, 30, 0.2)";
    ctx.beginPath();
    ctx.moveTo(11, 60);
    ctx.lineTo(35, 60);
    ctx.lineTo(46, 94);
    ctx.lineTo(12, 96);
    ctx.closePath();
    ctx.fill();

    const palm = ctx.createLinearGradient(8, 38, 40, 75);
    palm.addColorStop(0, "#e1bfa7");
    palm.addColorStop(1, "#c99880");
    ctx.fillStyle = palm;
    ctx.beginPath();
    ctx.moveTo(9, 44);
    ctx.lineTo(35, 44);
    ctx.lineTo(39, 64);
    ctx.lineTo(12, 70);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < 4; i++) {
      const fx = 11 + i * 6;
      ctx.fillStyle = i % 2 === 0 ? "#dcb89f" : "#d3ad94";
      ctx.fillRect(fx, 42, 5, 16);
      ctx.fillStyle = "rgba(96, 62, 45, 0.22)";
      ctx.fillRect(fx, 55, 5, 2);
    }

    ctx.fillStyle = "#c89278";
    ctx.beginPath();
    ctx.moveTo(34, 51);
    ctx.lineTo(43, 56);
    ctx.lineTo(39, 67);
    ctx.lineTo(31, 62);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#465a72";
    ctx.beginPath();
    ctx.moveTo(4, 84);
    ctx.lineTo(53, 82);
    ctx.lineTo(58, 98);
    ctx.lineTo(2, 103);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function render3D() {
    const width = canvas.width;
    const height = canvas.height;

    const baseHorizon = drawSkyAndGround(width, height);
    const bobOffset = Math.sin(state.player.walkBob * 2.2) * (state.player.inHouse ? 1.2 : 2.2);
    const hitJitter = Math.sin(state.time * 120) * state.player.hitPulse * 5;
    const horizon = clamp(baseHorizon + bobOffset + hitJitter, height * 0.38, height * 0.66);

    const depth = new Float32Array(width);

    for (let x = 0; x < width; x++) {
      const rayAngle = state.player.angle - FOV / 2 + (x / width) * FOV;
      const hit = castRay(rayAngle);
      const correctedDist = Math.max(0.0001, hit.dist * Math.cos(rayAngle - state.player.angle));
      depth[x] = correctedDist;

      const wallScale = state.player.inHouse ? 1.07 : 0.94;
      const wallHeight = Math.min(height * 0.95, (height * wallScale) / correctedDist);
      const y = Math.floor(horizon - wallHeight * 0.64);

      let tex = textures.stone;
      if (hit.tileType === 2) tex = textures.water;
      if (hit.tileType === 3) tex = textures.timber;
      if (hit.tileType === 4) tex = textures.plaster;

      let texX = Math.floor(hit.wallX * (TEXTURE_SIZE - 1));
      if ((hit.side === 0 && Math.cos(rayAngle) > 0) || (hit.side === 1 && Math.sin(rayAngle) < 0)) {
        texX = TEXTURE_SIZE - 1 - texX;
      }

      ctx.drawImage(tex, texX, 0, 1, TEXTURE_SIZE, x, y, 1, wallHeight);

      const shade = clamp(1.2 - correctedDist / (MAX_RAY_DIST * 0.85) - (hit.side === 1 ? 0.12 : 0), 0.2, 1);
      ctx.fillStyle = `rgba(10, 14, 20, ${(1 - shade) * (state.player.inHouse ? 0.7 : 0.9)})`;
      ctx.fillRect(x, y, 1, wallHeight);

      if (hit.tileType === 2 && !state.player.inHouse) {
        const shimmer = (Math.sin(state.time * 3.2 + x * 0.07) * 0.5 + 0.5) * 0.2;
        ctx.fillStyle = `rgba(126, 188, 226, ${shimmer * 0.4})`;
        ctx.fillRect(x, y, 1, wallHeight);
      }

      if (!state.player.inHouse) {
        const fog = clamp((correctedDist - 5) / (MAX_RAY_DIST - 5), 0, 1);
        if (fog > 0) {
          ctx.fillStyle = `rgba(132, 150, 164, ${fog * (0.38 + state.weather.fog * 0.5)})`;
          ctx.fillRect(x, y, 1, wallHeight);
        }
      }
    }

    const sprites = [];

    if (state.player.inHouse) {
      sprites.push({ x: state.house.bed.x, y: state.house.bed.y, color: "#7f4a43", label: "Bed", size: 0.95, kind: "bed" });
      sprites.push({ x: state.house.stash.x, y: state.house.stash.y, color: "#896748", label: "Stash", size: 0.9, kind: "stash" });
      sprites.push({ x: state.house.interiorDoor.x, y: state.house.interiorDoor.y, color: "#6d5a45", label: "Exit", size: 0.95, kind: "exit-door" });
    } else {
      for (const npc of state.npcs) {
        sprites.push({ x: npc.x, y: npc.y, color: npc.color, label: npc.name, size: 1.04, kind: "npc" });
      }

      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        sprites.push({ x: enemy.x, y: enemy.y, color: "#6be873", label: "Slime", size: 1.0, kind: "enemy", hp: enemy.hp, maxHp: enemy.maxHp });
      }

      for (const resource of state.resources) {
        if (resource.harvested) continue;
        if (resource.type === "crystal") {
          sprites.push({ x: resource.x, y: resource.y, color: "#8dc4ff", label: "Crystal", size: 0.62, kind: "resource" });
        } else if (resource.type === "rock") {
          sprites.push({ x: resource.x, y: resource.y, color: "#8f969f", label: "Stone", size: 0.72, kind: "resource" });
        } else {
          sprites.push({ x: resource.x, y: resource.y, color: "#2d6138", label: "Tree", size: 1.35, kind: "resource" });
        }
      }

      if (!state.chest.opened) {
        sprites.push({ x: state.chest.x, y: state.chest.y, color: "#bf8a4f", label: "Cache", size: 0.82, kind: "chest" });
      }

      sprites.push({ x: state.house.outsideDoor.x, y: state.house.outsideDoor.y, color: "#7f664b", label: "House", size: 1.03, kind: "house-door" });
    }

    const projected = [];
    const MAX_RAY_DIST_SQ = MAX_RAY_DIST * MAX_RAY_DIST;
    const MIN_DIST_SQ = 0.12 * 0.12;
    
    for (const sprite of sprites) {
      const dx = sprite.x - state.player.x;
      const dy = sprite.y - state.player.y;
      
      // Quick distance check using squared distance (avoids sqrt)
      const distSq = dx * dx + dy * dy;
      if (distSq < MIN_DIST_SQ || distSq > MAX_RAY_DIST_SQ) continue;
      
      const ang = normalizeAngle(Math.atan2(dy, dx) - state.player.angle);
      if (Math.abs(ang) > FOV * 0.72) continue;
      
      // Only compute actual distance when needed
      const d = Math.sqrt(distSq);
      const sx = ((ang + FOV / 2) / FOV) * width;
      const scale = (height / (d + 0.01)) * sprite.size * 0.58;
      projected.push({ ...sprite, sx, distToPlayer: d, scale });
    }

    projected.sort((a, b) => b.distToPlayer - a.distToPlayer);

    for (const sprite of projected) {
      const widthScale = sprite.kind === "resource" && sprite.label === "Tree" ? 0.82 : 0.62;
      const spriteWidth = clamp(sprite.scale * widthScale, 6, width * 0.42);
      const spriteHeight = clamp(sprite.scale, 8, height * 0.82);
      const left = Math.floor(sprite.sx - spriteWidth / 2);
      const top = Math.floor(horizon - spriteHeight * 0.67);

      if (sprite.sx >= 0 && sprite.sx < width && sprite.distToPlayer > depth[Math.floor(sprite.sx)] + 0.08) continue;

      const light = clamp(1 - sprite.distToPlayer / MAX_RAY_DIST, 0.25, 1);
      drawBillboardSprite(sprite, left, top, spriteWidth, spriteHeight, light);

      if (sprite.kind === "enemy") {
        const hpRatio = clamp(sprite.hp / sprite.maxHp, 0, 1);
        const barW = spriteWidth;
        const barY = top - 6;
        ctx.fillStyle = "#251010";
        ctx.fillRect(left, barY, barW, 4);
        ctx.fillStyle = "#86f493";
        ctx.fillRect(left, barY, barW * hpRatio, 4);
      }
    }

    const crossSize = state.player.blocking ? 6 : 4;
    const crossColor = state.player.hitPulse > 0 ? "rgba(255, 186, 186, 0.95)" : "rgba(255,255,255,0.9)";
    ctx.strokeStyle = crossColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - crossSize, height / 2);
    ctx.lineTo(width / 2 + crossSize, height / 2);
    ctx.moveTo(width / 2, height / 2 - crossSize);
    ctx.lineTo(width / 2, height / 2 + crossSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, height / 2, state.player.blocking ? 11 : 7, 0, TAU);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.stroke();

    if (state.player.hitPulse > 0) {
      const flash = ctx.createRadialGradient(width / 2, height / 2, 8, width / 2, height / 2, 120);
      flash.addColorStop(0, `rgba(255, 132, 132, ${state.player.hitPulse * 0.28})`);
      flash.addColorStop(1, "rgba(255,132,132,0)");
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, width, height);
    }

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.12, width * 0.5, height * 0.5, width * 0.68);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function drawBar(x, y, w, h, ratio, bg, fg, label) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fg;
    ctx.fillRect(x, y, w * clamp(ratio, 0, 1), h);
    ctx.fillStyle = "#fdf7ea";
    ctx.font = "14px Georgia";
    ctx.fillText(label, x + 8, y + h - 7);
  }

  function drawMiniMap() {
    if (!state.showMap) return;

    const map = currentMap();
    const radius = state.player.inHouse ? 6 : 7;
    const cells = radius * 2;
    const mapSize = 190;
    const cell = mapSize / cells;
    const startX = canvas.width - mapSize - 16;
    const startY = 16;

    ctx.fillStyle = "rgba(8, 18, 20, 0.64)";
    ctx.fillRect(startX - 8, startY - 8, mapSize + 16, mapSize + 16);

    const px = Math.floor(state.player.x);
    const py = Math.floor(state.player.y);

    for (let my = 0; my < cells; my++) {
      for (let mx = 0; mx < cells; mx++) {
        const wx = px - radius + mx;
        const wy = py - radius + my;
        const tile = map[wy]?.[wx] ?? 1;

        let color = state.player.inHouse ? "#6f6253" : "#5a915c";
        if (tile === 1) color = "#8d745a";
        if (tile === 2) color = "#548eb2";
        if (tile === 3) color = "#7a5a3a";
        if (tile === 4) color = "#ada08e";

        ctx.fillStyle = color;
        ctx.fillRect(startX + mx * cell, startY + my * cell, cell - 1, cell - 1);
      }
    }

    if (!state.player.inHouse) {
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        const ex = enemy.x - (px - radius);
        const ey = enemy.y - (py - radius);
        if (ex < 0 || ex >= cells || ey < 0 || ey >= cells) continue;
        ctx.fillStyle = "#98f39b";
        ctx.fillRect(startX + ex * cell + 2, startY + ey * cell + 2, 4, 4);
      }

      for (const npc of state.npcs) {
        const nx = npc.x - (px - radius);
        const ny = npc.y - (py - radius);
        if (nx < 0 || nx >= cells || ny < 0 || ny >= cells) continue;
        ctx.fillStyle = "#ffd77b";
        ctx.fillRect(startX + nx * cell + 2, startY + ny * cell + 2, 4, 4);
      }

      const hx = state.house.outsideDoor.x - (px - radius);
      const hy = state.house.outsideDoor.y - (py - radius);
      if (hx >= 0 && hx < cells && hy >= 0 && hy < cells) {
        ctx.fillStyle = state.house.unlocked ? "#d8bc6a" : "#9b7b56";
        ctx.fillRect(startX + hx * cell + 2, startY + hy * cell + 2, 5, 5);
      }
    } else {
      const homePoints = [
        { ...state.house.bed, color: "#d8a7a7" },
        { ...state.house.stash, color: "#c9b372" },
        { ...state.house.interiorDoor, color: "#d3c4a0" },
      ];
      for (const point of homePoints) {
        const ex = point.x - (px - radius);
        const ey = point.y - (py - radius);
        if (ex < 0 || ex >= cells || ey < 0 || ey >= cells) continue;
        ctx.fillStyle = point.color;
        ctx.fillRect(startX + ex * cell + 2, startY + ey * cell + 2, 5, 5);
      }
    }

    const playerX = startX + radius * cell + cell * (state.player.x - px);
    const playerY = startY + radius * cell + cell * (state.player.y - py);
    ctx.fillStyle = "#fffcf0";
    ctx.beginPath();
    ctx.arc(playerX, playerY, 4, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "#fffcf0";
    ctx.beginPath();
    ctx.moveTo(playerX, playerY);
    ctx.lineTo(playerX + Math.cos(state.player.angle) * 10, playerY + Math.sin(state.player.angle) * 10);
    ctx.stroke();
  }

  function drawHud() {
    const hudW = 590;
    ctx.fillStyle = "rgba(16, 29, 33, 0.75)";
    ctx.fillRect(14, canvas.height - 156, hudW, 142);

    drawBar(28, canvas.height - 134, 228, 20, state.player.hp / state.player.maxHp, "#3a1f1e", "#e76b58", `HP ${Math.ceil(state.player.hp)}/${state.player.maxHp}`);
    drawBar(28, canvas.height - 108, 228, 18, state.player.stamina / 100, "#1f2f2c", "#5fe0b5", `Stamina ${Math.ceil(state.player.stamina)}`);
    drawBar(28, canvas.height - 84, 228, 16, state.player.xp / state.player.nextXp, "#233145", "#79a5ff", `XP ${state.player.xp}/${state.player.nextXp}`);

    ctx.fillStyle = "#f8f0dc";
    ctx.font = "14px Georgia";
    ctx.fillText(`Lvl ${state.player.level}   Gold ${state.player.gold}   Potions ${state.inventory.Potion}`, 272, canvas.height - 118);
    ctx.fillText(`Crystals ${state.inventory["Crystal Shard"]}   Wood ${state.inventory.Wood}   Stone ${state.inventory.Stone}   Cores ${state.inventory["Slime Core"]}`, 272, canvas.height - 96);

    const q1 = state.quests.crystal;
    const q2 = state.quests.slime;
    const q3 = state.quests.wood;

    const questLines = [
      `${q1.title}: ${q1.status === "locked" ? "Locked" : q1.status === "turned_in" ? "Done" : `${q1.progress}/${q1.need}${q1.status === "complete" ? " (Turn in)" : ""}`}`,
      `${q2.title}: ${q2.status === "locked" ? "Locked" : q2.status === "turned_in" ? "Done" : `${q2.progress}/${q2.need}${q2.status === "complete" ? " (Turn in)" : ""}`}`,
      `${q3.title}: ${q3.status === "locked" ? "Locked" : q3.status === "turned_in" ? "Done" : `${Math.min(q3.needWood, state.inventory.Wood)}/${q3.needWood}W ${Math.min(q3.needStone, state.inventory.Stone)}/${q3.needStone}S${q3.status === "complete" ? " (Turn in)" : ""}`}`,
    ];

    ctx.fillStyle = "#f3ecd8";
    ctx.font = "14px Georgia";
    let qy = canvas.height - 74;
    for (const line of questLines) {
      ctx.fillText(line, 272, qy);
      qy += 16;
    }

    ctx.fillStyle = "rgba(16, 29, 33, 0.68)";
    ctx.fillRect(14, 14, 500, 118);
    ctx.fillStyle = "#f9f1dd";
    ctx.font = "14px Georgia";

    const location = state.player.inHouse ? "Player House" : "Valley";
    const houseStatus = state.house.unlocked ? "Owned" : "Locked";
    const weatherText = state.player.inHouse ? "Sheltered" : weatherLabel(state.weather.kind);
    ctx.fillText(`Location: ${location}   House: ${houseStatus}   Weather: ${weatherText}`, 24, 34);

    let msgY = 54;
    const shown = state.msg.slice(0, 4);
    if (shown.length === 0) {
      ctx.fillText("Explore the valley and shape your path.", 24, msgY);
    }
    for (const m of shown) {
      ctx.fillText(m.text, 24, msgY);
      msgY += 18;
    }

    if (state.mode === "gameover") {
      ctx.fillStyle = "rgba(18, 4, 5, 0.8)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffe3d8";
      ctx.font = "bold 42px Georgia";
      ctx.fillText("You Were Defeated", canvas.width * 0.34, canvas.height * 0.43);
      ctx.font = "20px Georgia";
      ctx.fillText("Press R to recover at camp.", canvas.width * 0.38, canvas.height * 0.49);
      ctx.font = "italic 16px Georgia";
      ctx.fillStyle = "#ffa0a0";
      ctx.fillText(`Deaths: ${state.player.deaths + 1}. The slimes send their regards.`, canvas.width * 0.36, canvas.height * 0.54);
    }

    /* Shop overlay */
    if (shopOpen && state.mode === "playing") {
      const sw = 380;
      const sh = shopItems.length * 52 + 80;
      const sx = Math.floor((canvas.width - sw) / 2);
      const sy = Math.floor((canvas.height - sh) / 2);

      ctx.fillStyle = "rgba(10, 18, 22, 0.88)";
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = "#d8bc6a";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);

      ctx.fillStyle = "#ffd77b";
      ctx.font = "bold 20px Georgia";
      ctx.fillText("🏪 Trader Nyx's Emporium", sx + 16, sy + 30);
      ctx.font = "12px Georgia";
      ctx.fillStyle = "#c9b889";
      ctx.fillText(`Your Gold: ${state.player.gold}   [↑/↓ to browse, Enter/E to buy, Esc to close]`, sx + 16, sy + 50);

      for (let i = 0; i < shopItems.length; i++) {
        const item = shopItems[i];
        const iy = sy + 62 + i * 52;
        const selected = i === shopSelection;

        ctx.fillStyle = selected ? "rgba(216, 188, 106, 0.2)" : "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(sx + 8, iy, sw - 16, 46);

        if (selected) {
          ctx.strokeStyle = "#ffd77b";
          ctx.lineWidth = 1;
          ctx.strokeRect(sx + 8, iy, sw - 16, 46);
        }

        ctx.fillStyle = selected ? "#ffd77b" : "#f3ecd8";
        ctx.font = "bold 14px Georgia";
        ctx.fillText(item.name, sx + 20, iy + 18);

        ctx.fillStyle = item.cost < 0 ? "#5fe0b5" : (state.player.gold >= item.cost ? "#ffd77b" : "#ff6b6b");
        ctx.font = "14px Georgia";
        ctx.fillText(item.cost < 0 ? `+${Math.abs(item.cost)}g` : `${item.cost}g`, sx + sw - 60, iy + 18);

        ctx.fillStyle = "#a09880";
        ctx.font = "italic 12px Georgia";
        ctx.fillText(item.desc, sx + 20, iy + 36);
      }
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = "12px Georgia";
    ctx.fillText("LMB/Space: Swing  RMB/C: Block  E: Interact  Q: Potion  K: Save  L: Load  M: Map  F: Fullscreen  N: Sound", 20, canvas.height - 8);
  }

  function render() {
    render3D();
    drawWeaponOverlay();
    drawWeatherOverlay();
    drawParticles();
    drawMiniMap();
    drawHud();
  }

  function resize() {
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(220, window.innerHeight);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  window.addEventListener("resize", resize);
  resize();
  syncSaveStateFromStorage();

  startBtn.addEventListener("click", () => {
    ensureAudio();
    beginSession();
  });
  continueBtn?.addEventListener("click", () => {
    ensureAudio();
    if (!loadGame({ fromMenu: true })) {
      beginSession();
    }
  });

  document.addEventListener("keydown", (event) => {
    state.keys[event.code] = true;

    /* Shop controls */
    if (shopOpen) {
      if (event.code === "ArrowUp" || event.code === "KeyW") {
        shopSelection = (shopSelection - 1 + shopItems.length) % shopItems.length;
        event.preventDefault();
        return;
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        shopSelection = (shopSelection + 1) % shopItems.length;
        event.preventDefault();
        return;
      }
      if (event.code === "Enter" || event.code === "KeyE" || event.code === "Space") {
        const item = shopItems[shopSelection];
        if (item.cost < 0) {
          const result = item.action();
          if (result !== false) sfx.shopBuy();
        } else if (state.player.gold >= item.cost) {
          state.player.gold -= item.cost;
          item.action();
          sfx.shopBuy();
          logMsg(`Bought ${item.name}! ${choice(["Money well spent!", "Trader Nyx grins.", "Ka-ching!", "Nyx winks."])}`);
        } else {
          logMsg("Trader Nyx: No gold, no goods. That's business, baby.");
        }
        event.preventDefault();
        return;
      }
      if (event.code === "Escape") {
        shopOpen = false;
        logMsg("Trader Nyx: Come back anytime! I'm always here. Literally. I live here.");
        event.preventDefault();
        return;
      }
    }

    if (event.code === "KeyE" || event.code === "Enter") {
      interact();
    }

    if (event.code === "Space") {
      attack();
      event.preventDefault();
    }

    if (event.code === "KeyQ") {
      usePotion();
    }

    if (event.code === "KeyK") {
      saveGame();
      event.preventDefault();
    }

    if (event.code === "KeyL") {
      loadGame();
      event.preventDefault();
    }

    if (event.code === "KeyM") {
      state.showMap = !state.showMap;
    }

    if (event.code === "KeyF") {
      toggleFullscreen();
    }

    if (event.code === "KeyN") {
      soundEnabled = !soundEnabled;
      logMsg(soundEnabled ? "Sound ON. Your ears will thank you. Maybe." : "Sound OFF. Blissful silence.");
    }

    if (event.code === "Escape" && shopOpen) {
      shopOpen = false;
    }

    if (event.code === "KeyR" && state.mode === "gameover") {
      resetWorld();
      state.mode = "playing";
      logMsg(choice(["You're back! The slimes look disappointed.", "Respawned. Let's try not dying this time.", "Back from the dead. Again. The valley has a generous return policy."]));
    }
  });

  document.addEventListener("keyup", (event) => {
    state.keys[event.code] = false;
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== canvas) {
      state.mouseLook = 0;
      state.mouseButtons.right = false;
    }
  });

  canvas.addEventListener("click", () => {
    if (state.mode === "playing") {
      try {
        const maybePromise = canvas.requestPointerLock?.();
        if (maybePromise && typeof maybePromise.catch === "function") {
          maybePromise.catch(() => {});
        }
      } catch {
        // Pointer lock is optional in automation/headless contexts.
      }
    }
  });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  document.addEventListener("mousedown", (event) => {
    if (state.mode !== "playing") return;
    if (event.button === 0) {
      state.mouseButtons.left = true;
      attack();
      event.preventDefault();
    } else if (event.button === 2) {
      state.mouseButtons.right = true;
      event.preventDefault();
    }
  });

  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      state.mouseButtons.left = false;
    }
    if (event.button === 2) {
      state.mouseButtons.right = false;
    }
  });

  window.addEventListener("blur", () => {
    state.mouseButtons.left = false;
    state.mouseButtons.right = false;
    state.player.blocking = false;
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === canvas && state.mode === "playing") {
      state.mouseLook += event.movementX * 0.00195;
    }
  });

  document.addEventListener("fullscreenchange", resize);

  function frame(now) {
    if (!frame.last) frame.last = now;
    const dt = Math.min(0.05, (now - frame.last) / 1000);
    frame.last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  window.advanceTime = (ms) => {
    const fixed = 1 / 60;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) {
      update(fixed);
    }
    render();
  };

  window.render_game_to_text = () => {
    const activeEnemies = state.enemies.filter((e) => e.alive);
    const activeResources = state.resources.filter((r) => !r.harvested);
    const quests = {
      crystal: {
        title: state.quests.crystal.title,
        status: state.quests.crystal.status,
        progress: state.quests.crystal.progress,
        need: state.quests.crystal.need,
      },
      slime: {
        title: state.quests.slime.title,
        status: state.quests.slime.status,
        progress: state.quests.slime.progress,
        need: state.quests.slime.need,
      },
      wood: {
        title: state.quests.wood.title,
        status: state.quests.wood.status,
        progress: state.quests.wood.progress,
        need: state.quests.wood.need,
        wood_required: state.quests.wood.needWood,
        stone_required: state.quests.wood.needStone,
      },
    };

    const payload = {
      coordinate_system: {
        origin: state.player.inHouse ? "top-left of house interior map" : "top-left of world map",
        x_direction: "positive x moves east/right",
        y_direction: "positive y moves south/down",
      },
      mode: state.mode,
      save: {
        has_save: hasSaveData,
        last_saved_at: lastSaveAt,
      },
      location: state.player.inHouse ? "house" : "valley",
      weather: {
        kind: state.player.inHouse ? "sheltered" : state.weather.kind,
        rain: Number(state.weather.rain.toFixed(2)),
        fog: Number(state.weather.fog.toFixed(2)),
        wind: Number(state.weather.wind.toFixed(2)),
      },
      player: {
        x: Number(state.player.x.toFixed(2)),
        y: Number(state.player.y.toFixed(2)),
        angle: Number(state.player.angle.toFixed(3)),
        hp: Math.round(state.player.hp),
        maxHp: state.player.maxHp,
        level: state.player.level,
        xp: state.player.xp,
        nextXp: state.player.nextXp,
        stamina: Math.round(state.player.stamina),
        gold: state.player.gold,
        blocking: state.player.blocking,
        combo_step: state.player.comboStep,
        swinging: state.player.swingTimer > 0,
      },
      inventory: state.inventory,
      house: {
        unlocked: state.house.unlocked,
        visited: state.house.visits,
        outside_door: {
          x: Number(state.house.outsideDoor.x.toFixed(2)),
          y: Number(state.house.outsideDoor.y.toFixed(2)),
          distance: state.player.inHouse ? null : Number(dist(state.player, state.house.outsideDoor).toFixed(2)),
        },
      },
      quests,
      nearby_npcs: state.player.inHouse
        ? []
        : state.npcs
            .reduce((acc, n) => {
              const distance = dist(state.player, n);
              if (distance < 8) {
                acc.push({
                  id: n.id,
                  name: n.name,
                  x: Math.round(n.x * 100) / 100,
                  y: Math.round(n.y * 100) / 100,
                  distance: Math.round(distance * 100) / 100,
                });
              }
              return acc;
            }, [])
            .sort((a, b) => a.distance - b.distance),
      nearby_enemies: state.player.inHouse
        ? []
        : activeEnemies
            .reduce((acc, e) => {
              const distance = dist(state.player, e);
              if (distance < 10) {
                acc.push({
                  id: e.id,
                  x: Math.round(e.x * 100) / 100,
                  y: Math.round(e.y * 100) / 100,
                  hp: e.hp,
                  distance: Math.round(distance * 100) / 100,
                });
              }
              return acc;
            }, [])
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 8),
      nearby_resources: state.player.inHouse
        ? [
            { id: "bed", type: "bed", x: state.house.bed.x, y: state.house.bed.y, distance: Math.round(dist(state.player, state.house.bed) * 100) / 100 },
            { id: "stash", type: "stash", x: state.house.stash.x, y: state.house.stash.y, distance: Math.round(dist(state.player, state.house.stash) * 100) / 100 },
            { id: "exit", type: "exit-door", x: state.house.interiorDoor.x, y: state.house.interiorDoor.y, distance: Math.round(dist(state.player, state.house.interiorDoor) * 100) / 100 },
          ]
        : activeResources
            .reduce((acc, r) => {
              const distance = dist(state.player, r);
              if (distance < 9) {
                acc.push({
                  id: r.id,
                  type: r.type,
                  x: Math.round(r.x * 100) / 100,
                  y: Math.round(r.y * 100) / 100,
                  distance: Math.round(distance * 100) / 100,
                });
              }
              return acc;
            }, [])
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 12),
      messages: state.msg.slice(0, 4).map((m) => m.text),
    };

    return JSON.stringify(payload);
  };
})();
