(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const startBtn = document.getElementById("start-btn");

  const TAU = Math.PI * 2;
  const FOV = Math.PI / 2.75;
  const MAX_RAY_DIST = 24;
  const TEXTURE_SIZE = 64;
  const PLAYER_SPEED = 3.9;
  const PLAYER_ROT_SPEED = 2.6;
  const PLAYER_MAX_HP = 120;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
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
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
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
        const n = noise2D(x, y, 3);
        const n2 = noise2D(x * 0.4, y * 0.4, 17);

        let r = 120;
        let g = 110;
        let b = 100;

        if (kind === "stone") {
          const mortar = ((x + ((y % 14) < 7 ? 0 : 5)) % 13) < 2 || y % 11 < 2;
          const tone = 0.72 + n * 0.45;
          r = 112 * tone;
          g = 103 * tone;
          b = 94 * tone;
          if (mortar) {
            r *= 0.55;
            g *= 0.55;
            b *= 0.55;
          }
        } else if (kind === "water") {
          const ripple = Math.sin((x + y) * 0.23) * 0.5 + Math.sin(y * 0.37 + n * 8) * 0.5;
          const tone = 0.62 + ripple * 0.16 + n2 * 0.22;
          r = 48 * tone;
          g = 103 * tone;
          b = 134 * tone + 18;
        } else {
          const tone = 0.75 + n * 0.35;
          r = 88 * tone;
          g = 104 * tone;
          b = 84 * tone;
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

  function createMap(width, height) {
    const grid = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 1 : 0)),
    );

    for (let i = 0; i < 240; i++) {
      const x = 2 + Math.floor(Math.random() * (width - 4));
      const y = 2 + Math.floor(Math.random() * (height - 4));
      if (Math.random() < 0.65) {
        grid[y][x] = 1;
      }
    }

    for (let i = 0; i < 55; i++) {
      const cx = 4 + Math.floor(Math.random() * (width - 8));
      const cy = 4 + Math.floor(Math.random() * (height - 8));
      const radius = 1 + Math.floor(Math.random() * 2.2);
      for (let y = cy - radius; y <= cy + radius; y++) {
        for (let x = cx - radius; x <= cx + radius; x++) {
          if (x <= 1 || y <= 1 || x >= width - 1 || y >= height - 1) continue;
          if (Math.hypot(x - cx, y - cy) < radius + Math.random() * 0.7) {
            grid[y][x] = 2;
          }
        }
      }
    }

    const villageArea = [
      [6, 6],
      [6, 7],
      [7, 6],
      [7, 7],
      [8, 6],
      [8, 7],
      [6, 8],
      [7, 8],
      [8, 8],
      [9, 8],
      [9, 7],
      [9, 6],
      [10, 8],
      [10, 7],
      [10, 6],
      [11, 8],
      [11, 7],
      [11, 6],
      [12, 8],
      [12, 7],
      [12, 6],
    ];

    for (const [x, y] of villageArea) {
      grid[y][x] = 0;
    }

    return grid;
  }

  function findEmptyCell(map, minX = 2, minY = 2, maxX = map[0].length - 3, maxY = map.length - 3) {
    for (let attempts = 0; attempts < 1200; attempts++) {
      const x = minX + Math.floor(Math.random() * (maxX - minX + 1));
      const y = minY + Math.floor(Math.random() * (maxY - minY + 1));
      if (map[y][x] === 0) {
        return { x: x + 0.5, y: y + 0.5 };
      }
    }
    return { x: 2.5, y: 2.5 };
  }

  const worldMap = createMap(52, 52);
  const textures = {
    stone: makeTexture("stone"),
    water: makeTexture("water"),
  };

  const state = {
    mode: "menu",
    time: 0,
    keys: {},
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
      nextXp: 75,
      stamina: 100,
      gold: 20,
      attackCooldown: 0,
      hurtCooldown: 0,
      walkBob: 0,
      deaths: 0,
    },
    inventory: {
      "Crystal Shard": 0,
      Wood: 0,
      Potion: 2,
      "Slime Core": 0,
    },
    quests: {
      crystal: {
        title: "Shard Hunt",
        status: "locked",
        need: 3,
        progress: 0,
        reward: { xp: 50, gold: 25 },
      },
      slime: {
        title: "Thin the Slimes",
        status: "locked",
        need: 2,
        progress: 0,
        reward: { xp: 60, gold: 30, potion: 1 },
      },
      wood: {
        title: "Workshop Fuel",
        status: "locked",
        need: 4,
        progress: 0,
        reward: { xp: 35, gold: 20 },
      },
    },
    npcs: [
      { id: "elder", name: "Elder Nira", x: 8.5, y: 7.2, color: "#ffd08f" },
      { id: "warden", name: "Warden Sol", x: 10.3, y: 8.8, color: "#96c2ff" },
      { id: "smith", name: "Smith Varo", x: 11.5, y: 7.4, color: "#efb1a2" },
    ],
    enemies: [],
    resources: [],
    chest: { x: 9.2, y: 6.2, opened: false, respawn: 0 },
  };

  function spawnEnemies() {
    state.enemies = [];
    for (let i = 0; i < 12; i++) {
      const pos = findEmptyCell(worldMap, 6, 6, 49, 49);
      state.enemies.push({
        id: `slime-${i}`,
        type: "slime",
        x: pos.x,
        y: pos.y,
        hp: 42,
        maxHp: 42,
        speed: 1.45 + Math.random() * 0.5,
        attackCooldown: Math.random() * 0.8,
        alive: true,
        respawn: 0,
      });
    }
  }

  function spawnResources() {
    state.resources = [];
    for (let i = 0; i < 14; i++) {
      const pos = findEmptyCell(worldMap, 4, 4, 49, 49);
      state.resources.push({
        id: `crystal-${i}`,
        type: "crystal",
        x: pos.x,
        y: pos.y,
        harvested: false,
        respawn: 0,
      });
    }
    for (let i = 0; i < 18; i++) {
      const pos = findEmptyCell(worldMap, 3, 3, 49, 49);
      state.resources.push({
        id: `tree-${i}`,
        type: "tree",
        x: pos.x,
        y: pos.y,
        harvested: false,
        respawn: 0,
      });
    }
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
      state.player.nextXp = Math.round(state.player.nextXp * 1.35 + 25);
      state.player.maxHp += 14;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 30);
      state.player.stamina = 100;
      logMsg(`Level up! You are now level ${state.player.level}.`);
    }
  }

  function isBlocking(x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (ty < 0 || tx < 0 || ty >= worldMap.length || tx >= worldMap[0].length) return true;
    return worldMap[ty][tx] !== 0;
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

      if (mapY < 0 || mapX < 0 || mapY >= worldMap.length || mapX >= worldMap[0].length) {
        tileType = 1;
        break;
      }
      tileType = worldMap[mapY][mapX];
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
    for (const e of entities) {
      if (!filter(e)) continue;
      const d = dist(state.player, e);
      if (d < best) {
        best = d;
        nearest = e;
      }
    }
    return nearest;
  }

  function updateQuestProgressFromInventory() {
    const crystalQ = state.quests.crystal;
    if (crystalQ.status === "active") {
      crystalQ.progress = Math.min(crystalQ.need, state.inventory["Crystal Shard"]);
      if (crystalQ.progress >= crystalQ.need) {
        crystalQ.status = "complete";
        logMsg("Quest ready to turn in: Shard Hunt.");
      }
    }

    const woodQ = state.quests.wood;
    if (woodQ.status === "active") {
      woodQ.progress = Math.min(woodQ.need, state.inventory.Wood);
      if (woodQ.progress >= woodQ.need) {
        woodQ.status = "complete";
        logMsg("Quest ready to turn in: Workshop Fuel.");
      }
    }
  }

  function interact() {
    if (state.mode !== "playing") return;

    const npc = nearestEntity(state.npcs, () => true, 1.8);
    if (npc) {
      if (npc.id === "elder") {
        const q = state.quests.crystal;
        if (q.status === "locked") {
          q.status = "active";
          q.progress = 0;
          logMsg("Elder Nira: Bring me 3 Crystal Shards from the wild.");
          return;
        }
        if (q.status === "active") {
          logMsg(`Elder Nira: Shards ${q.progress}/${q.need}. Keep searching.`);
          return;
        }
        if (q.status === "complete") {
          q.status = "turned_in";
          state.inventory["Crystal Shard"] = Math.max(0, state.inventory["Crystal Shard"] - q.need);
          grantXp(q.reward.xp);
          state.player.gold += q.reward.gold;
          logMsg(`Quest complete: ${q.title}. +${q.reward.xp} XP, +${q.reward.gold} gold.`);
          if (state.quests.slime.status === "locked") {
            state.quests.slime.status = "active";
            logMsg("Elder Nira: Speak with Warden Sol for your next hunt.");
          }
          return;
        }
        logMsg("Elder Nira: The valley feels safer thanks to you.");
        return;
      }

      if (npc.id === "warden") {
        const q = state.quests.slime;
        if (q.status === "locked") {
          q.status = "active";
          q.progress = 0;
          logMsg("Warden Sol: Defeat 2 slimes near the marsh edges.");
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
          logMsg(`Quest complete: ${q.title}. +${q.reward.xp} XP, +${q.reward.gold} gold, +1 potion.`);
          if (state.quests.wood.status === "locked") {
            state.quests.wood.status = "active";
            logMsg("Warden Sol: Smith Varo needs wood for repairs.");
          }
          return;
        }
        logMsg("Warden Sol: Patrols are calm for now.");
        return;
      }

      if (npc.id === "smith") {
        const q = state.quests.wood;
        if (q.status === "locked") {
          q.status = "active";
          q.progress = 0;
          logMsg("Smith Varo: Gather 4 bundles of wood.");
          return;
        }
        if (q.status === "active") {
          logMsg(`Smith Varo: Wood bundles ${q.progress}/${q.need}.`);
          return;
        }
        if (q.status === "complete") {
          q.status = "turned_in";
          state.inventory.Wood = Math.max(0, state.inventory.Wood - q.need);
          grantXp(q.reward.xp);
          state.player.gold += q.reward.gold;
          state.player.maxHp += 8;
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 22);
          logMsg(`Quest complete: ${q.title}. +${q.reward.xp} XP, +${q.reward.gold} gold, max HP increased.`);
          return;
        }
        logMsg("Smith Varo: I can fortify your armor once the timber arrives.");
        return;
      }
    }

    const resource = nearestEntity(state.resources, (r) => !r.harvested, 1.55);
    if (resource) {
      resource.harvested = true;
      resource.respawn = resource.type === "crystal" ? 24 : 18;
      if (resource.type === "crystal") {
        state.inventory["Crystal Shard"] += 1;
        grantXp(6);
        logMsg("Collected Crystal Shard.");
      } else {
        state.inventory.Wood += 1;
        grantXp(4);
        logMsg("Collected Wood.");
      }
      updateQuestProgressFromInventory();
      return;
    }

    if (!state.chest.opened && dist(state.player, state.chest) < 1.7) {
      state.chest.opened = true;
      state.chest.respawn = 35;
      const loot = choice(["Potion", "Potion", "Gold", "Gold", "Gold", "Crystal"]);
      if (loot === "Potion") {
        state.inventory.Potion += 1;
        logMsg("Opened cache: found a Potion.");
      } else if (loot === "Crystal") {
        state.inventory["Crystal Shard"] += 1;
        logMsg("Opened cache: found a Crystal Shard.");
      } else {
        const coins = 8 + Math.floor(Math.random() * 14);
        state.player.gold += coins;
        logMsg(`Opened cache: found ${coins} gold.`);
      }
      updateQuestProgressFromInventory();
      return;
    }

    logMsg("Nothing to interact with.");
  }

  function attack() {
    if (state.mode !== "playing" || state.player.attackCooldown > 0) return;
    state.player.attackCooldown = 0.45;

    let hit = false;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x - state.player.x;
      const dy = enemy.y - state.player.y;
      const d = Math.hypot(dx, dy);
      if (d > 1.9) continue;
      const angleToEnemy = Math.atan2(dy, dx);
      const facingDiff = Math.abs(normalizeAngle(angleToEnemy - state.player.angle));
      if (facingDiff > 0.7) continue;

      enemy.hp -= 18 + Math.floor(state.player.level * 1.3);
      hit = true;
      if (enemy.hp <= 0) {
        enemy.alive = false;
        enemy.respawn = 20 + Math.random() * 8;
        state.inventory["Slime Core"] += 1;
        state.player.gold += 8;
        grantXp(18);
        logMsg("Slime defeated. +8 gold, +18 XP, +1 Slime Core.");

        const q = state.quests.slime;
        if (q.status === "active") {
          q.progress += 1;
          if (q.progress >= q.need) {
            q.progress = q.need;
            q.status = "complete";
            logMsg("Quest ready to turn in: Thin the Slimes.");
          }
        }
      } else {
        logMsg("Hit slime.");
      }
      break;
    }

    if (!hit) {
      logMsg("Attack missed.");
    }
  }

  function usePotion() {
    if (state.mode !== "playing") return;
    if (state.inventory.Potion <= 0) {
      logMsg("No potion left.");
      return;
    }
    if (state.player.hp >= state.player.maxHp) {
      logMsg("Health already full.");
      return;
    }
    state.inventory.Potion -= 1;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 38);
    logMsg("Used potion. Health restored.");
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
    state.player.stamina = 100;
    state.player.walkBob = 0;
    state.player.deaths += 1;
    spawnEnemies();
    spawnResources();
    state.chest.opened = false;
    state.chest.respawn = 0;
    logMsg("You awaken at camp. The world shifts anew.");
  }

  function update(dt) {
    state.time += dt;

    for (const m of state.msg) m.ttl -= dt;
    state.msg = state.msg.filter((m) => m.ttl > 0);

    const player = state.player;
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.hurtCooldown = Math.max(0, player.hurtCooldown - dt);
    player.stamina = Math.min(100, player.stamina + dt * 8.8);

    if (state.mode !== "playing") return;

    const turnInput = (state.keys.ArrowLeft ? -1 : 0) + (state.keys.ArrowRight ? 1 : 0);
    player.angle = normalizeAngle(player.angle + turnInput * PLAYER_ROT_SPEED * dt + state.mouseLook);
    state.mouseLook = 0;

    const forward = (state.keys.KeyW || state.keys.ArrowUp ? 1 : 0) - (state.keys.KeyS || state.keys.ArrowDown ? 1 : 0);
    const strafe = (state.keys.KeyD ? 1 : 0) - (state.keys.KeyA ? 1 : 0);

    const sprinting = state.keys.ShiftLeft || state.keys.ShiftRight;
    const speedFactor = sprinting && player.stamina > 1 ? 1.45 : 1;
    if (sprinting && speedFactor > 1) {
      player.stamina = Math.max(0, player.stamina - dt * 26);
    }

    const vx = (Math.cos(player.angle) * forward + Math.cos(player.angle + Math.PI / 2) * strafe) * PLAYER_SPEED * speedFactor * dt;
    const vy = (Math.sin(player.angle) * forward + Math.sin(player.angle + Math.PI / 2) * strafe) * PLAYER_SPEED * speedFactor * dt;
    moveWithCollision(vx, vy);
    const isMoving = Math.abs(forward) + Math.abs(strafe) > 0;
    player.walkBob += dt * (isMoving ? 9.5 * speedFactor : 1.8);

    for (const enemy of state.enemies) {
      if (!enemy.alive) {
        enemy.respawn -= dt;
        if (enemy.respawn <= 0) {
          const pos = findEmptyCell(worldMap, 4, 4, 49, 49);
          enemy.x = pos.x;
          enemy.y = pos.y;
          enemy.hp = enemy.maxHp;
          enemy.alive = true;
          enemy.attackCooldown = 0.6;
        }
        continue;
      }

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const d = Math.hypot(dx, dy);

      if (d < 8.2) {
        const nx = dx / (d + 1e-6);
        const ny = dy / (d + 1e-6);
        const nextX = enemy.x + nx * enemy.speed * dt;
        const nextY = enemy.y + ny * enemy.speed * dt;

        if (!isBlocking(nextX, enemy.y)) enemy.x = nextX;
        if (!isBlocking(enemy.x, nextY)) enemy.y = nextY;

        enemy.attackCooldown -= dt;
        if (d < 1.22 && enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 1 + Math.random() * 0.45;
          if (player.hurtCooldown <= 0) {
            player.hurtCooldown = 0.35;
            const dmg = 6 + Math.floor(Math.random() * 6);
            player.hp -= dmg;
            logMsg(`A slime bites you for ${dmg}.`);
            if (player.hp <= 0) {
              player.hp = 0;
              state.mode = "gameover";
              logMsg("You fell in battle. Press R to restart the world.");
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
          const pos = findEmptyCell(worldMap, 4, 4, 49, 49);
          resource.x = pos.x;
          resource.y = pos.y;
        }
      }
    }

    if (state.chest.opened) {
      state.chest.respawn -= dt;
      if (state.chest.respawn <= 0) {
        state.chest.opened = false;
        const pos = findEmptyCell(worldMap, 4, 4, 14, 14);
        state.chest.x = pos.x;
        state.chest.y = pos.y;
      }
    }

    updateQuestProgressFromInventory();
  }

  function drawSkyAndGround(width, height) {
    const dayBlend = 0.58 + Math.sin(state.time * 0.02) * 0.22;
    const horizon = Math.floor(height * 0.5);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, `rgb(${Math.floor(lerp(26, 108, dayBlend))}, ${Math.floor(lerp(40, 162, dayBlend))}, ${Math.floor(lerp(70, 215, dayBlend))})`);
    skyGrad.addColorStop(1, `rgb(${Math.floor(lerp(86, 188, dayBlend))}, ${Math.floor(lerp(110, 208, dayBlend))}, ${Math.floor(lerp(132, 236, dayBlend))})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizon);

    const sunX = width * (0.16 + (Math.sin(state.time * 0.006) * 0.5 + 0.5) * 0.68);
    const sunY = horizon * (0.23 + Math.cos(state.time * 0.006) * 0.1);
    const sunR = lerp(28, 56, dayBlend);
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.8);
    sunGrad.addColorStop(0, `rgba(255, 245, 198, ${0.68 * dayBlend})`);
    sunGrad.addColorStop(1, "rgba(255, 245, 198, 0)");
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, width, horizon);

    const ridge = (amp, offset, elev, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, elev);
      for (let x = 0; x <= width; x += 18) {
        const y = elev + Math.sin(x * 0.006 + offset) * amp + Math.sin(x * 0.012 + offset * 0.7) * amp * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, horizon + 130);
      ctx.lineTo(0, horizon + 130);
      ctx.closePath();
      ctx.fill();
    };

    ridge(14, state.time * 0.03, horizon - 48, `rgba(68, 109, 121, ${0.38 + dayBlend * 0.22})`);
    ridge(18, state.time * 0.04 + 1.2, horizon - 18, `rgba(56, 90, 102, ${0.48 + dayBlend * 0.25})`);

    const groundGrad = ctx.createLinearGradient(0, horizon, 0, height);
    groundGrad.addColorStop(0, `rgb(${Math.floor(lerp(70, 132, dayBlend))}, ${Math.floor(lerp(88, 178, dayBlend))}, ${Math.floor(lerp(72, 120, dayBlend))})`);
    groundGrad.addColorStop(1, `rgb(${Math.floor(lerp(48, 98, dayBlend))}, ${Math.floor(lerp(58, 132, dayBlend))}, ${Math.floor(lerp(54, 92, dayBlend))})`);
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizon, width, height - horizon);

    for (let i = 0; i < 28; i++) {
      const t = i / 27;
      const y = horizon + t * t * (height - horizon);
      const alpha = (1 - t) * 0.12;
      ctx.strokeStyle = `rgba(36, 68, 46, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y + (i % 2 === 0 ? 0 : 1));
      ctx.lineTo(width, y + (i % 2 === 0 ? 0 : 1));
      ctx.stroke();
    }

    return horizon;
  }

  function drawBillboardSprite(sprite, left, top, spriteWidth, spriteHeight, lightFactor) {
    ctx.save();
    ctx.translate(left, top);

    ctx.fillStyle = `rgba(0, 0, 0, ${0.12 * lightFactor})`;
    ctx.beginPath();
    ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.93, spriteWidth * 0.36, spriteHeight * 0.08, 0, 0, TAU);
    ctx.fill();

    if (sprite.kind === "npc") {
      const cloak = ctx.createLinearGradient(0, 0, 0, spriteHeight);
      cloak.addColorStop(0, shadeHex(sprite.color, 1.25));
      cloak.addColorStop(1, shadeHex(sprite.color, 0.55));
      ctx.fillStyle = cloak;
      ctx.fillRect(spriteWidth * 0.32, spriteHeight * 0.3, spriteWidth * 0.36, spriteHeight * 0.6);
      ctx.fillStyle = shadeHex(sprite.color, 0.42);
      ctx.fillRect(spriteWidth * 0.36, spriteHeight * 0.68, spriteWidth * 0.1, spriteHeight * 0.18);
      ctx.fillRect(spriteWidth * 0.54, spriteHeight * 0.68, spriteWidth * 0.1, spriteHeight * 0.18);
      ctx.fillStyle = "#e3c3ac";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.2, Math.max(3, spriteWidth * 0.14), 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.33, spriteWidth * 0.06, spriteHeight * 0.37);
    } else if (sprite.kind === "enemy") {
      const slime = ctx.createRadialGradient(spriteWidth * 0.45, spriteHeight * 0.35, 2, spriteWidth * 0.45, spriteHeight * 0.52, spriteHeight * 0.5);
      slime.addColorStop(0, "#b4ffc2");
      slime.addColorStop(1, "#3f9f55");
      ctx.fillStyle = slime;
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.15, spriteHeight * 0.82);
      ctx.quadraticCurveTo(spriteWidth * 0.08, spriteHeight * 0.42, spriteWidth * 0.34, spriteHeight * 0.2);
      ctx.quadraticCurveTo(spriteWidth * 0.5, spriteHeight * 0.07, spriteWidth * 0.66, spriteHeight * 0.2);
      ctx.quadraticCurveTo(spriteWidth * 0.92, spriteHeight * 0.42, spriteWidth * 0.85, spriteHeight * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1e5128";
      ctx.fillRect(spriteWidth * 0.35, spriteHeight * 0.42, spriteWidth * 0.08, spriteHeight * 0.06);
      ctx.fillRect(spriteWidth * 0.57, spriteHeight * 0.42, spriteWidth * 0.08, spriteHeight * 0.06);
    } else if (sprite.kind === "resource" && sprite.label === "Tree") {
      ctx.fillStyle = "#5f4430";
      ctx.fillRect(spriteWidth * 0.44, spriteHeight * 0.38, spriteWidth * 0.14, spriteHeight * 0.56);
      ctx.fillStyle = "#3f7f4d";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.34, spriteWidth * 0.27, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(177, 230, 172, 0.4)";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.43, spriteHeight * 0.27, spriteWidth * 0.12, 0, TAU);
      ctx.fill();
    } else if (sprite.kind === "resource") {
      ctx.fillStyle = "#7ec3ff";
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.1);
      ctx.lineTo(spriteWidth * 0.8, spriteHeight * 0.45);
      ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.9);
      ctx.lineTo(spriteWidth * 0.2, spriteHeight * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.2, spriteWidth * 0.08, spriteHeight * 0.52);
    } else if (sprite.kind === "chest") {
      const wood = ctx.createLinearGradient(0, 0, 0, spriteHeight);
      wood.addColorStop(0, "#b6854f");
      wood.addColorStop(1, "#6e4d31");
      ctx.fillStyle = wood;
      ctx.fillRect(spriteWidth * 0.18, spriteHeight * 0.45, spriteWidth * 0.64, spriteHeight * 0.45);
      ctx.fillStyle = "#ccb04a";
      ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.52, spriteWidth * 0.08, spriteHeight * 0.22);
      ctx.fillStyle = "#8c6a3e";
      ctx.fillRect(spriteWidth * 0.18, spriteHeight * 0.42, spriteWidth * 0.64, spriteHeight * 0.08);
    }

    ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * (1 - lightFactor + 0.2)})`;
    ctx.fillRect(0, 0, spriteWidth, spriteHeight);
    ctx.restore();
  }

  function drawWeaponOverlay() {
    if (state.mode !== "playing") return;
    const bob = Math.sin(state.player.walkBob * 2.1) * 4;
    const slash = state.player.attackCooldown > 0 ? Math.sin((1 - state.player.attackCooldown / 0.45) * Math.PI) * 20 : 0;
    const baseX = canvas.width * 0.72 + bob;
    const baseY = canvas.height * 0.84 + Math.abs(bob) * 0.5;

    ctx.save();
    ctx.translate(baseX - slash * 0.18, baseY + slash * 0.08);
    ctx.rotate(-0.24 + slash * 0.004);

    const blade = ctx.createLinearGradient(0, -120, 0, 40);
    blade.addColorStop(0, "#f5f6ff");
    blade.addColorStop(1, "#8fa5ba");
    ctx.fillStyle = blade;
    ctx.fillRect(16, -112, 18, 128);
    ctx.fillStyle = "#4c5b66";
    ctx.fillRect(11, 8, 28, 8);
    ctx.fillStyle = "#8a5d39";
    ctx.fillRect(19, 16, 12, 38);
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(19, -108, 3, 110);

    ctx.restore();
  }

  function render3D() {
    const width = canvas.width;
    const height = canvas.height;
    const horizon = drawSkyAndGround(width, height);

    const depth = new Float32Array(width);

    for (let x = 0; x < width; x++) {
      const rayAngle = state.player.angle - FOV / 2 + (x / width) * FOV;
      const hit = castRay(rayAngle);
      const correctedDist = Math.max(0.0001, hit.dist * Math.cos(rayAngle - state.player.angle));
      depth[x] = correctedDist;

      const wallHeight = Math.min(height * 0.9, (height * 0.92) / correctedDist);
      const y = Math.floor(horizon - wallHeight * 0.62);

      const tex = hit.tileType === 2 ? textures.water : textures.stone;
      let texX = Math.floor(hit.wallX * (TEXTURE_SIZE - 1));
      if ((hit.side === 0 && Math.cos(rayAngle) > 0) || (hit.side === 1 && Math.sin(rayAngle) < 0)) {
        texX = TEXTURE_SIZE - 1 - texX;
      }
      ctx.drawImage(tex, texX, 0, 1, TEXTURE_SIZE, x, y, 1, wallHeight);

      const shade = clamp(1.2 - correctedDist / (MAX_RAY_DIST * 0.9) - (hit.side === 1 ? 0.12 : 0), 0.18, 1);
      ctx.fillStyle = `rgba(13, 17, 24, ${(1 - shade) * 0.85})`;
      ctx.fillRect(x, y, 1, wallHeight);

      if (hit.tileType === 2) {
        const shimmer = (Math.sin(state.time * 3.4 + x * 0.08) * 0.5 + 0.5) * 0.2;
        ctx.fillStyle = `rgba(132, 191, 220, ${shimmer * 0.34})`;
        ctx.fillRect(x, y, 1, wallHeight);
      }

      const fog = clamp((correctedDist - 5.5) / (MAX_RAY_DIST - 5.5), 0, 1);
      if (fog > 0) {
        ctx.fillStyle = `rgba(135, 154, 170, ${fog * 0.45})`;
        ctx.fillRect(x, y, 1, wallHeight);
      }
    }

    const sprites = [];

    for (const npc of state.npcs) {
      sprites.push({ x: npc.x, y: npc.y, color: npc.color, label: npc.name, size: 1.08, kind: "npc" });
    }

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      sprites.push({ x: enemy.x, y: enemy.y, color: "#6be873", label: "Slime", size: 1.0, kind: "enemy", hp: enemy.hp, maxHp: enemy.maxHp });
    }

    for (const resource of state.resources) {
      if (resource.harvested) continue;
      if (resource.type === "crystal") {
        sprites.push({ x: resource.x, y: resource.y, color: "#8dc4ff", label: "Crystal", size: 0.62, kind: "resource" });
      } else {
        sprites.push({ x: resource.x, y: resource.y, color: "#2d6138", label: "Tree", size: 1.35, kind: "resource" });
      }
    }

    if (!state.chest.opened) {
      sprites.push({ x: state.chest.x, y: state.chest.y, color: "#bf8a4f", label: "Cache", size: 0.78, kind: "chest" });
    }

    const projected = [];
    for (const s of sprites) {
      const dx = s.x - state.player.x;
      const dy = s.y - state.player.y;
      const distToPlayer = Math.hypot(dx, dy);
      const ang = normalizeAngle(Math.atan2(dy, dx) - state.player.angle);
      if (Math.abs(ang) > FOV * 0.7) continue;
      if (distToPlayer < 0.15 || distToPlayer > MAX_RAY_DIST) continue;

      const sx = ((ang + FOV / 2) / FOV) * width;
      const scale = (height / (distToPlayer + 0.01)) * s.size * 0.56;
      projected.push({ ...s, sx, distToPlayer, scale });
    }

    projected.sort((a, b) => b.distToPlayer - a.distToPlayer);

    for (const p of projected) {
      const widthScale = p.kind === "resource" && p.label === "Tree" ? 0.8 : 0.62;
      const spriteWidth = clamp(p.scale * widthScale, 6, width * 0.42);
      const spriteHeight = clamp(p.scale, 8, height * 0.82);
      const left = Math.floor(p.sx - spriteWidth / 2);
      const top = Math.floor(horizon - spriteHeight * 0.66);

      if (p.sx >= 0 && p.sx < width && p.distToPlayer > depth[Math.floor(p.sx)] + 0.08) continue;

      const lightFactor = clamp(1 - p.distToPlayer / MAX_RAY_DIST, 0.25, 1);
      drawBillboardSprite(p, left, top, spriteWidth, spriteHeight, lightFactor);

      if (p.kind === "enemy") {
        const hpRatio = clamp(p.hp / p.maxHp, 0, 1);
        const barW = spriteWidth;
        const barY = top - 6;
        ctx.fillStyle = "#311";
        ctx.fillRect(left, barY, barW, 4);
        ctx.fillStyle = "#7cff8d";
        ctx.fillRect(left, barY, barW * hpRatio, 4);
      }
    }

    const crossSize = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - crossSize, height / 2);
    ctx.lineTo(width / 2 + crossSize, height / 2);
    ctx.moveTo(width / 2, height / 2 - crossSize);
    ctx.lineTo(width / 2, height / 2 + crossSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 7, 0, TAU);
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.stroke();

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.12, width * 0.5, height * 0.5, width * 0.68);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.36)");
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
    ctx.fillText(label, x + 8, y + h - 8);
  }

  function drawMiniMap() {
    if (!state.showMap) return;

    const mapSize = 190;
    const cell = mapSize / 14;
    const startX = canvas.width - mapSize - 16;
    const startY = 16;

    ctx.fillStyle = "rgba(8, 18, 20, 0.62)";
    ctx.fillRect(startX - 8, startY - 8, mapSize + 16, mapSize + 16);

    const px = Math.floor(state.player.x);
    const py = Math.floor(state.player.y);

    for (let my = 0; my < 14; my++) {
      for (let mx = 0; mx < 14; mx++) {
        const wx = px - 7 + mx;
        const wy = py - 7 + my;
        let color = "#5a915c";
        const tile = worldMap[wy]?.[wx] ?? 1;
        if (tile === 1) color = "#8d745a";
        if (tile === 2) color = "#548eb2";
        ctx.fillStyle = color;
        ctx.fillRect(startX + mx * cell, startY + my * cell, cell - 1, cell - 1);
      }
    }

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const ex = enemy.x - (px - 7);
      const ey = enemy.y - (py - 7);
      if (ex < 0 || ex >= 14 || ey < 0 || ey >= 14) continue;
      ctx.fillStyle = "#91f28e";
      ctx.fillRect(startX + ex * cell + 2, startY + ey * cell + 2, 4, 4);
    }

    for (const npc of state.npcs) {
      const nx = npc.x - (px - 7);
      const ny = npc.y - (py - 7);
      if (nx < 0 || nx >= 14 || ny < 0 || ny >= 14) continue;
      ctx.fillStyle = "#ffd77b";
      ctx.fillRect(startX + nx * cell + 2, startY + ny * cell + 2, 4, 4);
    }

    const playerX = startX + 7 * cell + cell * (state.player.x - px);
    const playerY = startY + 7 * cell + cell * (state.player.y - py);
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
    ctx.fillStyle = "rgba(17, 29, 33, 0.72)";
    ctx.fillRect(14, canvas.height - 142, 468, 128);

    drawBar(28, canvas.height - 122, 212, 20, state.player.hp / state.player.maxHp, "#3a1f1e", "#e96753", `HP ${Math.ceil(state.player.hp)}/${state.player.maxHp}`);
    drawBar(28, canvas.height - 96, 212, 18, state.player.stamina / 100, "#1f2f2c", "#5fe0b5", `Stamina ${Math.ceil(state.player.stamina)}`);
    drawBar(28, canvas.height - 72, 212, 16, state.player.xp / state.player.nextXp, "#233145", "#79a5ff", `XP ${state.player.xp}/${state.player.nextXp}`);

    ctx.fillStyle = "#f9f4e7";
    ctx.font = "14px Georgia";
    ctx.fillText(`Lvl ${state.player.level}   Gold ${state.player.gold}   Potions ${state.inventory.Potion}`, 262, canvas.height - 106);
    ctx.fillText(`Crystals ${state.inventory["Crystal Shard"]}   Wood ${state.inventory.Wood}   Slime Cores ${state.inventory["Slime Core"]}`, 262, canvas.height - 84);

    const activeQuests = Object.values(state.quests).filter((q) => q.status === "active" || q.status === "complete");
    ctx.fillStyle = "#f3ecd8";
    ctx.font = "15px Georgia";
    let y = canvas.height - 62;
    if (activeQuests.length === 0) {
      ctx.fillText("No active quest. Talk to villagers in camp.", 262, y);
    }
    for (const q of activeQuests) {
      const marker = q.status === "complete" ? "(Turn in)" : `${q.progress}/${q.need}`;
      ctx.fillText(`${q.title} ${marker}`, 262, y);
      y += 18;
    }

    ctx.fillStyle = "rgba(17, 29, 33, 0.68)";
    ctx.fillRect(14, 14, 440, 112);
    ctx.fillStyle = "#f9f1dd";
    ctx.font = "14px Georgia";

    let msgY = 34;
    const shown = state.msg.slice(0, 5);
    if (shown.length === 0) {
      ctx.fillText("Explore the valley and build your path.", 24, msgY);
    }
    for (const m of shown) {
      ctx.fillText(m.text, 24, msgY);
      msgY += 18;
    }

    if (state.mode === "gameover") {
      ctx.fillStyle = "rgba(18, 4, 5, 0.78)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffe3d8";
      ctx.font = "bold 42px Georgia";
      ctx.fillText("You Were Defeated", canvas.width * 0.34, canvas.height * 0.43);
      ctx.font = "20px Georgia";
      ctx.fillText("Press R to rebuild the world and continue.", canvas.width * 0.305, canvas.height * 0.49);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "12px Georgia";
    ctx.fillText("F: Fullscreen  M: Minimap  E: Interact  Space: Attack  Q: Potion", 20, canvas.height - 8);
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
    logMsg("Welcome to Dustward. Seek quests in camp.");
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
    }
  });

  canvas.addEventListener("click", () => {
    if (state.mode === "playing") {
      canvas.requestPointerLock?.();
    }
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === canvas && state.mode === "playing") {
      state.mouseLook += event.movementX * 0.0019;
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
    const quests = Object.fromEntries(
      Object.entries(state.quests).map(([k, q]) => [k, { status: q.status, progress: q.progress, need: q.need }]),
    );

    const payload = {
      coordinate_system: {
        origin: "top-left of map grid",
        x_direction: "positive x moves east/right",
        y_direction: "positive y moves south/down",
      },
      mode: state.mode,
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
      },
      inventory: state.inventory,
      quests,
      nearby_npcs: state.npcs
        .map((n) => ({ id: n.id, name: n.name, x: Number(n.x.toFixed(2)), y: Number(n.y.toFixed(2)), distance: Number(dist(state.player, n).toFixed(2)) }))
        .filter((n) => n.distance < 8)
        .sort((a, b) => a.distance - b.distance),
      nearby_enemies: activeEnemies
        .map((e) => ({ id: e.id, x: Number(e.x.toFixed(2)), y: Number(e.y.toFixed(2)), hp: e.hp, distance: Number(dist(state.player, e).toFixed(2)) }))
        .filter((e) => e.distance < 10)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 8),
      nearby_resources: activeResources
        .map((r) => ({ id: r.id, type: r.type, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), distance: Number(dist(state.player, r).toFixed(2)) }))
        .filter((r) => r.distance < 8)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10),
      messages: state.msg.slice(0, 4).map((m) => m.text),
    };

    return JSON.stringify(payload);
  };
})();
