(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const startBtn = document.getElementById("start-btn");

  const TAU = Math.PI * 2;
  const FOV = Math.PI / 2.75;
  const MAX_RAY_DIST = 26;
  const TEXTURE_SIZE = 64;
  const PLAYER_SPEED = 3.95;
  const PLAYER_ROT_SPEED = 2.75;
  const PLAYER_MAX_HP = 120;

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
      logMsg(`Level up! You reached level ${state.player.level}.`);
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
    logMsg("You enter your house.");
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
    logMsg("You step back into the valley.");
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
        logMsg("You rest and recover to full strength.");
        return;
      }

      if (dist(state.player, state.house.stash) < 1.7) {
        if (state.inventory["Slime Core"] > 0) {
          state.inventory["Slime Core"] -= 1;
          state.player.gold += 18;
          logMsg("Sold one Slime Core from your stash. +18 gold.");
        } else if (state.inventory.Wood >= 2 && state.inventory.Stone >= 1) {
          state.inventory.Wood -= 2;
          state.inventory.Stone -= 1;
          state.inventory.Potion += 1;
          logMsg("Crafted one Potion at your workbench.");
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
          logMsg("Elder Nira: Bring me 4 Crystal Shards to map these lands.");
          return;
        }
        if (q.status === "active") {
          logMsg(`Elder Nira: Crystal Shards ${q.progress}/${q.need}.`);
          return;
        }
        if (q.status === "complete") {
          q.status = "turned_in";
          state.inventory["Crystal Shard"] = Math.max(0, state.inventory["Crystal Shard"] - q.need);
          grantXp(q.reward.xp);
          state.player.gold += q.reward.gold;
          logMsg(`Quest done: ${q.title}. +${q.reward.xp} XP, +${q.reward.gold} gold.`);
          if (state.quests.slime.status === "locked") {
            state.quests.slime.status = "active";
            logMsg("Elder Nira: Warden Sol needs the marsh cleared.");
          }
          return;
        }
        logMsg("Elder Nira: Keep forging your legacy.");
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
          logMsg("Warden Sol: Defeat 3 slimes near the marsh.");
          return;
        }
        if (q.status === "active") {
          logMsg(`Warden Sol: Slimes defeated ${q.progress}/${q.need}.`);
          return;
        }
        if (q.status === "complete") {
          q.status = "turned_in";
          grantXp(q.reward.xp);
          state.player.gold += q.reward.gold;
          state.inventory.Potion += q.reward.potion;
          logMsg(`Quest done: ${q.title}. +${q.reward.xp} XP, +${q.reward.gold} gold, +1 Potion.`);
          if (state.quests.wood.status === "locked") {
            state.quests.wood.status = "active";
            logMsg("Warden Sol: Smith Varo can now build your house.");
          }
          return;
        }
        logMsg("Warden Sol: The roads are safer with you around.");
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
          logMsg("Smith Varo: Bring 6 Wood and 4 Stone. We'll raise your house.");
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
          logMsg(`Quest done: ${q.title}. You now own the house.`);
          return;
        }
        logMsg("Smith Varo: Your home stands strong. Keep it supplied.");
        return;
      }

      if (npc.id === "merchant") {
        if (state.player.gold >= 18) {
          state.player.gold -= 18;
          state.inventory.Potion += 1;
          logMsg("Trader Nyx sold you a Potion for 18 gold.");
        } else {
          logMsg("Trader Nyx: Bring 18 gold for a Potion.");
        }
        return;
      }

      if (npc.id === "innkeeper") {
        if (state.player.hp < state.player.maxHp && state.player.gold >= 8) {
          state.player.gold -= 8;
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 28);
          logMsg("Innkeeper Mora patched your wounds for 8 gold.");
        } else {
          logMsg("Innkeeper Mora: Sleep in your house to recover fully.");
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
        logMsg("Collected Crystal Shard.");
      } else if (resource.type === "tree") {
        resource.respawn = 20;
        state.inventory.Wood += 1;
        grantXp(4);
        logMsg("Collected Wood.");
      } else {
        resource.respawn = 22;
        state.inventory.Stone += 1;
        grantXp(4);
        logMsg("Collected Stone.");
      }
      updateQuestProgressFromInventory();
      return;
    }

    if (!state.chest.opened && dist(state.player, state.chest) < 1.75) {
      state.chest.opened = true;
      state.chest.respawn = 38;
      const loot = choice(["Potion", "Gold", "Gold", "Stone", "Crystal"]);
      if (loot === "Potion") {
        state.inventory.Potion += 1;
        logMsg("Supply cache: found 1 Potion.");
      } else if (loot === "Stone") {
        state.inventory.Stone += 1;
        logMsg("Supply cache: found 1 Stone.");
      } else if (loot === "Crystal") {
        state.inventory["Crystal Shard"] += 1;
        logMsg("Supply cache: found 1 Crystal Shard.");
      } else {
        const coins = 10 + Math.floor(Math.random() * 14);
        state.player.gold += coins;
        logMsg(`Supply cache: found ${coins} gold.`);
      }
      updateQuestProgressFromInventory();
      return;
    }

    logMsg("Nothing useful to interact with.");
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

    if (!state.player.inHouse) {
      moveWithCollision(Math.cos(state.player.angle) * swing.lunge, Math.sin(state.player.angle) * swing.lunge);
    }

    if (state.player.inHouse) {
      logMsg("Your blade whistles through the room.");
      return;
    }

    const targets = state.enemies
      .filter((enemy) => enemy.alive)
      .sort((a, b) => dist(state.player, a) - dist(state.player, b));

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
        logMsg("Slime slain. +10 gold, +22 XP, +1 Slime Core.");

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
        logMsg(`Sword hit for ${damage}.`);
      }
    }

    if (hitCount === 0) {
      logMsg("Your strike misses.");
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
    logMsg("Potion used. Health restored.");
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function resetWorld() {
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
    state.player.deaths += 1;
    state.mouseButtons.right = false;

    spawnEnemies();
    spawnResources();

    state.chest.opened = false;
    state.chest.respawn = 0;
    logMsg("You recover at camp. The valley reshapes itself.");
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
    state.msg = state.msg.filter((m) => m.ttl > 0);

    const player = state.player;
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.hurtCooldown = Math.max(0, player.hurtCooldown - dt);
    player.comboWindow = Math.max(0, player.comboWindow - dt);
    player.swingTimer = Math.max(0, player.swingTimer - dt);
    player.hitPulse = Math.max(0, player.hitPulse - dt * 2.4);
    player.cameraKick = Math.max(0, player.cameraKick - dt * 1.8);

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

    const vx = (Math.cos(player.angle) * forward + Math.cos(player.angle + Math.PI / 2) * strafe) * PLAYER_SPEED * speedFactor * dt;
    const vy = (Math.sin(player.angle) * forward + Math.sin(player.angle + Math.PI / 2) * strafe) * PLAYER_SPEED * speedFactor * dt;
    moveWithCollision(vx, vy);

    const moving = Math.abs(forward) + Math.abs(strafe) > 0;
    player.walkBob += dt * (moving ? 9.8 * speedFactor : 1.8);

    updateNPCs(dt);

    if (player.inHouse) {
      updateQuestProgressFromInventory();
      return;
    }

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
        const nx = dx / (d + 1e-6);
        const ny = dy / (d + 1e-6);
        const nextX = enemy.x + nx * enemy.speed * dt;
        const nextY = enemy.y + ny * enemy.speed * dt;

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
                logMsg("Block absorbed most of the hit.");
              } else {
                damage = Math.max(1, Math.floor(damage * 0.85));
              }
            }

            player.hp -= damage;
            player.hitPulse = Math.max(player.hitPulse, 0.16);
            player.cameraKick = clamp(player.cameraKick + 0.18, 0, 1);
            logMsg(`A slime strikes for ${damage}.`);

            if (player.hp <= 0) {
              player.hp = 0;
              state.mode = "gameover";
              logMsg("You fell in battle. Press R to recover.");
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

    updateQuestProgressFromInventory();
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

  function drawSkyAndGround(width, height) {
    if (state.player.inHouse) {
      return drawInteriorBackdrop(width, height);
    }

    const day = 0.58 + Math.sin(state.time * 0.02) * 0.22;
    const horizon = Math.floor(height * 0.5);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, `rgb(${Math.floor(lerp(24, 109, day))}, ${Math.floor(lerp(36, 164, day))}, ${Math.floor(lerp(62, 220, day))})`);
    skyGrad.addColorStop(1, `rgb(${Math.floor(lerp(74, 182, day))}, ${Math.floor(lerp(103, 204, day))}, ${Math.floor(lerp(126, 235, day))})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizon);

    const sunX = width * (0.16 + (Math.sin(state.time * 0.006) * 0.5 + 0.5) * 0.68);
    const sunY = horizon * (0.2 + Math.cos(state.time * 0.006) * 0.08);
    const sunR = lerp(30, 56, day);
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.8);
    sunGrad.addColorStop(0, `rgba(255, 247, 204, ${0.68 * day})`);
    sunGrad.addColorStop(1, "rgba(255, 247, 204, 0)");
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, width, horizon);

    for (let i = 0; i < 7; i++) {
      const cx = ((i * 260 + state.time * (6 + i)) % (width + 320)) - 140;
      const cy = 58 + (i % 3) * 34 + Math.sin(state.time * 0.1 + i) * 8;
      const cloud = ctx.createRadialGradient(cx, cy, 4, cx, cy, 72);
      cloud.addColorStop(0, `rgba(255,255,255,${0.16 + day * 0.18})`);
      cloud.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = cloud;
      ctx.fillRect(cx - 90, cy - 55, 180, 110);
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

    ridge(13, state.time * 0.03, horizon - 44, `rgba(70, 108, 120, ${0.4 + day * 0.2})`);
    ridge(18, state.time * 0.04 + 1.4, horizon - 18, `rgba(52, 84, 98, ${0.52 + day * 0.22})`);

    const groundGrad = ctx.createLinearGradient(0, horizon, 0, height);
    groundGrad.addColorStop(0, `rgb(${Math.floor(lerp(68, 132, day))}, ${Math.floor(lerp(86, 178, day))}, ${Math.floor(lerp(68, 116, day))})`);
    groundGrad.addColorStop(1, `rgb(${Math.floor(lerp(42, 90, day))}, ${Math.floor(lerp(56, 126, day))}, ${Math.floor(lerp(48, 86, day))})`);
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

    return horizon;
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

    ctx.fillStyle = "#d2b39b";
    ctx.fillRect(12, 52, 25, 18);

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
          ctx.fillStyle = `rgba(132, 150, 164, ${fog * 0.45})`;
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
    for (const sprite of sprites) {
      const dx = sprite.x - state.player.x;
      const dy = sprite.y - state.player.y;
      const d = Math.hypot(dx, dy);
      const ang = normalizeAngle(Math.atan2(dy, dx) - state.player.angle);
      if (Math.abs(ang) > FOV * 0.72) continue;
      if (d < 0.12 || d > MAX_RAY_DIST) continue;

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
    ctx.fillText(`Location: ${location}   House: ${houseStatus}`, 24, 34);

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
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = "12px Georgia";
    ctx.fillText("LMB/Space: Swing  RMB: Block  E: Interact  Q: Potion  M: Map  F: Fullscreen", 20, canvas.height - 8);
  }

  function render() {
    render3D();
    drawWeaponOverlay();
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

  startBtn.addEventListener("click", () => {
    state.mode = "playing";
    menu.style.display = "none";
    logMsg("Welcome to Dustward. Take the 3 quests and claim your house.");
    canvas.focus();
  });

  document.addEventListener("keydown", (event) => {
    state.keys[event.code] = true;

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

    if (event.code === "KeyM") {
      state.showMap = !state.showMap;
    }

    if (event.code === "KeyF") {
      toggleFullscreen();
    }

    if (event.code === "KeyR" && state.mode === "gameover") {
      resetWorld();
      state.mode = "playing";
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
      location: state.player.inHouse ? "house" : "valley",
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
            .map((n) => ({
              id: n.id,
              name: n.name,
              x: Number(n.x.toFixed(2)),
              y: Number(n.y.toFixed(2)),
              distance: Number(dist(state.player, n).toFixed(2)),
            }))
            .filter((n) => n.distance < 8)
            .sort((a, b) => a.distance - b.distance),
      nearby_enemies: state.player.inHouse
        ? []
        : activeEnemies
            .map((e) => ({
              id: e.id,
              x: Number(e.x.toFixed(2)),
              y: Number(e.y.toFixed(2)),
              hp: e.hp,
              distance: Number(dist(state.player, e).toFixed(2)),
            }))
            .filter((e) => e.distance < 10)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 8),
      nearby_resources: state.player.inHouse
        ? [
            { id: "bed", type: "bed", x: state.house.bed.x, y: state.house.bed.y, distance: Number(dist(state.player, state.house.bed).toFixed(2)) },
            { id: "stash", type: "stash", x: state.house.stash.x, y: state.house.stash.y, distance: Number(dist(state.player, state.house.stash).toFixed(2)) },
            { id: "exit", type: "exit-door", x: state.house.interiorDoor.x, y: state.house.interiorDoor.y, distance: Number(dist(state.player, state.house.interiorDoor).toFixed(2)) },
          ]
        : activeResources
            .map((r) => ({
              id: r.id,
              type: r.type,
              x: Number(r.x.toFixed(2)),
              y: Number(r.y.toFixed(2)),
              distance: Number(dist(state.player, r).toFixed(2)),
            }))
            .filter((r) => r.distance < 9)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 12),
      messages: state.msg.slice(0, 4).map((m) => m.text),
    };

    return JSON.stringify(payload);
  };
})();
