import {
  TAU,
  FOV,
  MAX_RAY_DIST,
  TEXTURE_SIZE,
  PLAYER_COLLISION_RADIUS,
  WALL_RENDER_NEAR_CLIP,
  WALL_TEXTURE_NEAR_CLIP,
  PLAYER_SPEED,
  PLAYER_ROT_SPEED,
  PLAYER_MAX_HP,
  SAVE_KEY,
  LEGACY_SAVE_KEYS,
  LOCALE_KEY,
  LEGACY_LOCALE_KEYS,
  AUTOSAVE_INTERVAL,
  QUEST_STATUSES,
  WESTERN_PIG_ROLES,
} from "./constants.js";
import {
  clamp,
  lerp,
  easeOutCubic,
  normalizeAngle,
  dist,
  vecLength,
  normalizeVec,
  clampVec,
  choice,
  numberOr,
  noise2D,
  shadeHex,
} from "./math.js";
import {
  STORY_CHAPTERS,
  MAJOR_NPCS,
  createInitialNarrativeState,
  syncChapterFromProgress,
  applyMajorDecision,
  createDecisionRecap,
  resolveNarrativeEnding,
  migrateNarrativeState,
} from "./decisionEngine.js";
import {
  chooseEnemyType,
  createEnemyStats,
  createEnemyCombatProfile,
  resolveBehaviorMove,
} from "./enemyArchetypes.js";
import {
  resolveCombatProgression,
  applySwingLoadout,
  resolveIncomingDamage,
  getSprintModifier,
} from "./combatLoadout.js";
import { buildVisualMood } from "./visualProfile.js";
import {
  createInitialQuestState,
  updateQuestProgressFromInventoryDataDriven,
} from "./questDefinitions.js";
import { NPC_DIALOGUE, DEATH_MESSAGES } from "./storyContent.js";
import { migrateSaveToV3 } from "./saveMigration.js";
import {
  createInitialProgressionState,
  unlockSkill,
  canUnlockSkill,
  upgradeWeaponTier,
  addArmorModifier,
  resolveIdeologyTraits,
  buildProgressionModifiers,
  ARMOR_MODIFIERS,
  WEAPON_TIERS,
} from "./progressionSystem.js";
import { REGIONS, createInitialRegionState, unlockRegion, rollRegionEvent, resolveRegionEventModifiers } from "./regionSystem.js";
import {
  createParticlePool,
  spawnParticleInto,
  updateParticlePool,
  forEachActive as forEachActiveParticle,
  clearPool as clearParticlePool,
  DEFAULT_PARTICLE_CAP,
} from "./particlePool.js";
import {
  createSpatialHash,
  rebuildSpatialHash,
  queryRadius as queryEnemyRadius,
} from "./spatialHash.js";
import {
  createAudioBuses,
  setAmbientRegion,
  stopAmbient,
} from "./audio.js";
import {
  hexToRgba as hexToRgbaUtil,
  gradientBucket as gradientBucketUtil,
  createGradientCache,
  createRenderHelpers,
} from "./render.js";
import {
  GRAPHICS_PRESETS,
  createInitialGraphicsState,
  resolveRecommendedPreset,
  applyGraphicsAccessibility,
  getColorblindPalette,
  SETTINGS_ROWS,
  readSettingValue,
  stepSetting,
} from "./graphicsSettings.js";

const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const startBtn = document.getElementById("start-btn");
  const continueBtn = document.getElementById("continue-btn");
  const langSelect = document.getElementById("lang-select");
  const langLabel = document.getElementById("lang-label");
  const tsAtmosphere = window.WestWardTS && typeof window.WestWardTS.computeAtmosphere === "function"
    ? window.WestWardTS
    : (window.DustwardTS && typeof window.DustwardTS.computeAtmosphere === "function"
      ? window.DustwardTS
      : null);

  const LANGUAGE_OPTIONS = {
    en: "English",
    es: "Español",
    pt: "Português",
    fr: "Français",
    de: "Deutsch",
    it: "Italiano",
    ja: "日本語",
    tr: "Türkçe",
  };

  const LANGUAGE_PACKS = {
    en: {
      menu: {
        title: "🏜️ DUSTWARD",
        subtitle: "A dusty western sandbox RPG. Revolver vibes, sword fights, and lawless pig stampedes.",
        controls: [
          "🎮 Move: WASD or Arrow keys",
          "👀 Look: Mouse (click to lock pointer) or Arrow Left/Right",
          "⚔️ Attack: Left Mouse or Space (3-hit combo!)",
          "🛡️ Block: Right Mouse or C",
          "💬 Interact / Shop: E (talk to NPCs, browse shops)",
          "🧪 Use potion: Q",
          "🗺️ Toggle map: M, 🔇 Sound: N, 📺 Fullscreen: F",
          "💾 Quick save: K, Quick load: L",
        ],
        start: "⚔️ Enter The Wilds",
        continue: "📜 Continue Journey",
        goal: "🎯 Goal: Become the weirdest hero in Dustward: finish quests, survive slime duels, and outrun outlaw pigs.",
      },
      labels: {
        language: "Language",
        hp: "HP",
        stamina: "Stamina",
        xp: "XP",
        lvl: "Lvl",
        gold: "Gold",
        potions: "Potions",
        crystals: "Crystals",
        wood: "Wood",
        stone: "Stone",
        cores: "Cores",
        locked: "Locked",
        done: "Done",
        turnIn: "(Turn in)",
        location: "Location",
        house: "House",
        weather: "Weather",
        playerHouse: "Player House",
        valley: "Valley",
        owned: "Owned",
        sheltered: "Sheltered",
        explore: "Explore the valley and shape your path.",
        defeatedTitle: "You Were Defeated",
        recover: "Press R to recover at camp.",
        deathsLine: "Deaths: {deaths}. The slimes send their regards.",
        shopTitle: "🏪 Trader Nyx's Emporium",
        shopHeader: "Your Gold: {gold}   [↑/↓ to browse, Enter/E to buy, Esc to close]",
        controlsHint: "Swing: LMB/Space  Block: RMB/C  Use: E  Potion: Q  Save/Load: K/L  Map: M  Sound: N",
        clear: "Clear",
        mist: "Mist",
        rain: "Rain",
        storm: "Storm",
      },
      quests: {
        crystal: "1) Valley Survey",
        slime: "2) Marsh Cleansing",
        wood: "3) Raise Your House",
      },
      shop: {
        healthPotionName: "Health Potion",
        healthPotionDesc: "Restores 38 HP. Tastes like feet.",
        megaPotionName: "Mega Potion",
        megaPotionDesc: "Restores 80 HP. Tastes like expensive feet.",
        crystalShardName: "Crystal Shard",
        crystalShardDesc: "Shiny rock. The Elder loves these.",
        mysteryBoxName: "Mystery Box",
        mysteryBoxDesc: "Could be anything! (It's usually rocks.)",
        sellCoresName: "Sell Slime Cores",
        sellCoresDesc: "Sell 1 core for 15 gold. Gross but profitable.",
        refineWeaponName: "Refine Weapon (Common→Refined)",
        refineWeaponDesc: "60g + 4 Ashglass. +8% damage.",
        relicWeaponName: "Relic Weapon (Refined→Relic)",
        relicWeaponDesc: "180g + 4 Cipher Lens. +16% damage total.",
        armorStaminaName: "Armor: Stamina Regen",
        armorStaminaDesc: "40g + 2 Heat Resin. +25% stamina recovery.",
        armorBlockName: "Armor: Block Efficiency",
        armorBlockDesc: "50g + 2 Scrap Coil. Better block window.",
        armorWeatherName: "Armor: Weather Resistance",
        armorWeatherDesc: "45g + 2 Pressurized Ink. Reduced weather penalty.",
      },
    },
    es: {
      menu: {
        title: "🏜️ DUSTWARD",
        subtitle: "Un RPG sandbox 3D cómicamente realista. Espadas, slimes y decisiones dudosas.",
        controls: [
          "🎮 Moverse: WASD o flechas",
          "👀 Mirar: Mouse (clic para bloquear puntero) o Flecha Izq/Der",
          "⚔️ Ataque: Clic izquierdo o Espacio (combo de 3 golpes)",
          "🛡️ Bloquear: Clic derecho o C",
          "💬 Interactuar / Tienda: E (habla con NPCs, compra)",
          "🧪 Usar poción: Q",
          "🗺️ Mapa: M, 🔇 Sonido: N, 📺 Pantalla completa: F",
          "💾 Guardado rápido: K, Carga rápida: L",
        ],
        start: "⚔️ Entrar a las Tierras",
        continue: "📜 Continuar aventura",
        goal: "🎯 Meta: Completa misiones, compra equipo, construye tu casa, acaricia al gato y sobrevive al valle.",
      },
      labels: {
        language: "Idioma",
        hp: "HP",
        stamina: "Energía",
        xp: "XP",
        lvl: "Nv",
        gold: "Oro",
        potions: "Pociones",
        crystals: "Cristales",
        wood: "Madera",
        stone: "Piedra",
        cores: "Núcleos",
        locked: "Bloqueada",
        done: "Hecha",
        turnIn: "(Entregar)",
        location: "Lugar",
        house: "Casa",
        weather: "Clima",
        playerHouse: "Casa del jugador",
        valley: "Valle",
        owned: "Propia",
        sheltered: "Resguardado",
        explore: "Explora el valle y forja tu camino.",
        defeatedTitle: "Has sido derrotado",
        recover: "Presiona R para volver al campamento.",
        deathsLine: "Muertes: {deaths}. Los slimes te mandan saludos.",
        shopTitle: "🏪 Emporio de Nyx",
        shopHeader: "Tu oro: {gold}   [↑/↓ navegar, Enter/E comprar, Esc cerrar]",
        controlsHint: "Golpe: LMB/Espacio  Bloqueo: RMB/C  Usar: E  Poción: Q  Guardar/Cargar: K/L  Mapa: M  Sonido: N",
        clear: "Despejado",
        mist: "Niebla",
        rain: "Lluvia",
        storm: "Tormenta",
      },
      quests: {
        crystal: "1) Reconocimiento del Valle",
        slime: "2) Limpieza del Pantano",
        wood: "3) Levanta tu Casa",
      },
      shop: {
        healthPotionName: "Poción de salud",
        healthPotionDesc: "Restaura 38 HP. Sabe a pies.",
        megaPotionName: "Mega poción",
        megaPotionDesc: "Restaura 80 HP. Sabe a pies caros.",
        crystalShardName: "Fragmento de cristal",
        crystalShardDesc: "Roca brillante. A la Anciana le encanta.",
        mysteryBoxName: "Caja misteriosa",
        mysteryBoxDesc: "¡Puede ser cualquier cosa! (Casi siempre son rocas.)",
        sellCoresName: "Vender núcleos slime",
        sellCoresDesc: "Vende 1 núcleo por 15 de oro.",
      },
    },
    pt: {
      menu: {
        title: "🏜️ DUSTWARD",
        subtitle: "Um RPG sandbox 3D com realismo cômico. Espadas, slimes e escolhas duvidosas.",
        controls: [
          "🎮 Mover: WASD ou setas",
          "👀 Olhar: Mouse (clique para travar ponteiro) ou Seta Esq/Dir",
          "⚔️ Ataque: Botão esquerdo ou Espaço (combo de 3 golpes)",
          "🛡️ Defesa: Botão direito ou C",
          "💬 Interagir / Loja: E (fale com NPCs, compre)",
          "🧪 Usar poção: Q",
          "🗺️ Mapa: M, 🔇 Som: N, 📺 Tela cheia: F",
          "💾 Salvar rápido: K, Carregar rápido: L",
        ],
        start: "⚔️ Entrar nas Terras",
        continue: "📜 Continuar jornada",
        goal: "🎯 Objetivo: complete missões, compre equipamentos, construa sua casa, faça carinho no gato e sobreviva no vale.",
      },
      labels: {
        language: "Idioma",
        hp: "HP",
        stamina: "Fôlego",
        xp: "XP",
        lvl: "Nv",
        gold: "Ouro",
        potions: "Poções",
        crystals: "Cristais",
        wood: "Madeira",
        stone: "Pedra",
        cores: "Núcleos",
        locked: "Bloqueada",
        done: "Concluída",
        turnIn: "(Entregar)",
        location: "Local",
        house: "Casa",
        weather: "Clima",
        playerHouse: "Casa do jogador",
        valley: "Vale",
        owned: "Sua",
        sheltered: "Abrigado",
        explore: "Explore o vale e siga seu caminho.",
        defeatedTitle: "Você foi derrotado",
        recover: "Pressione R para voltar ao acampamento.",
        deathsLine: "Mortes: {deaths}. Os slimes mandam lembranças.",
        shopTitle: "🏪 Empório da Nyx",
        shopHeader: "Seu ouro: {gold}   [↑/↓ navegar, Enter/E comprar, Esc fechar]",
        controlsHint: "Golpe: LMB/Espaço  Defesa: RMB/C  Usar: E  Poção: Q  Salvar/Carregar: K/L  Mapa: M  Som: N",
        clear: "Limpo",
        mist: "Névoa",
        rain: "Chuva",
        storm: "Tempestade",
      },
      quests: {
        crystal: "1) Levantamento do Vale",
        slime: "2) Limpeza do Pântano",
        wood: "3) Erga sua Casa",
      },
      shop: {
        healthPotionName: "Poção de vida",
        healthPotionDesc: "Restaura 38 HP. Gosto de pé.",
        megaPotionName: "Mega poção",
        megaPotionDesc: "Restaura 80 HP. Gosto de pé premium.",
        crystalShardName: "Fragmento de cristal",
        crystalShardDesc: "Pedra brilhante. A Anciã adora.",
        mysteryBoxName: "Caixa misteriosa",
        mysteryBoxDesc: "Pode ser qualquer coisa! (Normalmente pedras.)",
        sellCoresName: "Vender núcleos slime",
        sellCoresDesc: "Venda 1 núcleo por 15 de ouro.",
      },
    },
    fr: {
      menu: {
        title: "🏜️ DUSTWARD",
        subtitle: "Un RPG sandbox 3D au réalisme comique. Épées, slimes et choix discutables.",
        controls: [
          "🎮 Déplacement : WASD ou flèches",
          "👀 Regard : Souris (clic pour verrouiller le pointeur) ou Flèche Gauche/Droite",
          "⚔️ Attaque : Clic gauche ou Espace (combo de 3 coups)",
          "🛡️ Parade : Clic droit ou C",
          "💬 Interaction / Boutique : E (parler aux PNJ, acheter)",
          "🧪 Utiliser une potion : Q",
          "🗺️ Carte : M, 🔇 Son : N, 📺 Plein écran : F",
          "💾 Sauvegarde rapide : K, Chargement rapide : L",
        ],
        start: "⚔️ Entrer dans les Terres",
        continue: "📜 Reprendre l'aventure",
        goal: "🎯 Objectif : terminez des quêtes, achetez de l'équipement, construisez votre maison, caressez le chat et survivez à la vallée.",
      },
      labels: {
        language: "Langue",
        hp: "PV",
        stamina: "Endurance",
        xp: "XP",
        lvl: "Niv",
        gold: "Or",
        potions: "Potions",
        crystals: "Cristaux",
        wood: "Bois",
        stone: "Pierre",
        cores: "Noyaux",
        locked: "Bloquée",
        done: "Terminée",
        turnIn: "(Rendre)",
        location: "Lieu",
        house: "Maison",
        weather: "Météo",
        playerHouse: "Maison du joueur",
        valley: "Vallée",
        owned: "À vous",
        sheltered: "Abrité",
        explore: "Explorez la vallée et tracez votre route.",
        defeatedTitle: "Vous avez été vaincu",
        recover: "Appuyez sur R pour revenir au camp.",
        deathsLine: "Morts : {deaths}. Les slimes vous saluent.",
        shopTitle: "🏪 Emporium de Nyx",
        shopHeader: "Votre or : {gold}   [↑/↓ naviguer, Entrée/E acheter, Échap fermer]",
        controlsHint: "Frappe : LMB/Espace  Parade : RMB/C  Utiliser : E  Potion : Q  Sauver/Charger : K/L  Carte : M  Son : N",
        clear: "Clair",
        mist: "Brume",
        rain: "Pluie",
        storm: "Tempête",
      },
      quests: {
        crystal: "1) Repérage de la Vallée",
        slime: "2) Nettoyage du Marais",
        wood: "3) Construisez votre Maison",
      },
      shop: {
        healthPotionName: "Potion de soin",
        healthPotionDesc: "Rend 38 PV. Goût de chaussette.",
        megaPotionName: "Méga potion",
        megaPotionDesc: "Rend 80 PV. Goût de chaussette premium.",
        crystalShardName: "Éclat de cristal",
        crystalShardDesc: "Pierre brillante. L'Ancienne adore.",
        mysteryBoxName: "Boîte mystère",
        mysteryBoxDesc: "Ça peut être n'importe quoi ! (Souvent des pierres.)",
        sellCoresName: "Vendre des noyaux de slime",
        sellCoresDesc: "Vendez 1 noyau pour 15 or.",
      },
    },
    de: {
      menu: {
        title: "🏜️ DUSTWARD",
        subtitle: "Ein komisch-realistisches 3D-Sandbox-RPG. Schwerter, Slimes und fragwürdige Entscheidungen.",
        controls: [
          "🎮 Bewegen: WASD oder Pfeiltasten",
          "👀 Blick: Maus (Klick für Pointer-Lock) oder Pfeil Links/Rechts",
          "⚔️ Angriff: Linksklick oder Leertaste (3er-Kombo)",
          "🛡️ Blocken: Rechtsklick oder C",
          "💬 Interagieren / Shop: E (mit NPCs reden, kaufen)",
          "🧪 Trank benutzen: Q",
          "🗺️ Karte: M, 🔇 Sound: N, 📺 Vollbild: F",
          "💾 Schnell speichern: K, Schnell laden: L",
        ],
        start: "⚔️ In die Wildnis",
        continue: "📜 Reise fortsetzen",
        goal: "🎯 Ziel: Quests abschließen, Ausrüstung kaufen, dein Haus bauen, die Katze streicheln und im Tal überleben.",
      },
      labels: {
        language: "Sprache",
        hp: "LP",
        stamina: "Ausdauer",
        xp: "XP",
        lvl: "Lvl",
        gold: "Gold",
        potions: "Tränke",
        crystals: "Kristalle",
        wood: "Holz",
        stone: "Stein",
        cores: "Kerne",
        locked: "Gesperrt",
        done: "Erledigt",
        turnIn: "(Abgeben)",
        location: "Ort",
        house: "Haus",
        weather: "Wetter",
        playerHouse: "Spielerhaus",
        valley: "Tal",
        owned: "Eigen",
        sheltered: "Geschützt",
        explore: "Erkunde das Tal und bestimme deinen Weg.",
        defeatedTitle: "Du wurdest besiegt",
        recover: "Drücke R, um am Lager zu respawnen.",
        deathsLine: "Tode: {deaths}. Die Slimes grüßen freundlich.",
        shopTitle: "🏪 Nyx' Emporium",
        shopHeader: "Dein Gold: {gold}   [↑/↓ wählen, Enter/E kaufen, Esc schließen]",
        controlsHint: "Schlag: LMB/Leertaste  Block: RMB/C  Nutzen: E  Trank: Q  Speichern/Laden: K/L  Karte: M  Sound: N",
        clear: "Klar",
        mist: "Nebel",
        rain: "Regen",
        storm: "Sturm",
      },
      quests: {
        crystal: "1) Talerkundung",
        slime: "2) Sumpfreinigung",
        wood: "3) Baue dein Haus",
      },
      shop: {
        healthPotionName: "Heiltrank",
        healthPotionDesc: "Stellt 38 LP wieder her. Schmeckt nach Füßen.",
        megaPotionName: "Mega-Trank",
        megaPotionDesc: "Stellt 80 LP wieder her. Schmeckt nach teuren Füßen.",
        crystalShardName: "Kristallsplitter",
        crystalShardDesc: "Glänzender Stein. Die Älteste liebt die Dinger.",
        mysteryBoxName: "Mysteriöse Kiste",
        mysteryBoxDesc: "Kann alles sein! (Meistens Steine.)",
        sellCoresName: "Slime-Kerne verkaufen",
        sellCoresDesc: "Verkaufe 1 Kern für 15 Gold.",
      },
    },
    it: {
      menu: {
        title: "🏜️ DUSTWARD",
        subtitle: "Un RPG sandbox 3D dal realismo comico. Spade, slime e scelte discutibili.",
        controls: [
          "🎮 Muovi: WASD o frecce",
          "👀 Visuale: Mouse (clic per bloccare il puntatore) o Freccia Sinistra/Destra",
          "⚔️ Attacco: Clic sinistro o Spazio (combo da 3 colpi)",
          "🛡️ Parata: Clic destro o C",
          "💬 Interagisci / Negozio: E (parla con gli NPC, compra)",
          "🧪 Usa pozione: Q",
          "🗺️ Mappa: M, 🔇 Audio: N, 📺 Schermo intero: F",
          "💾 Salvataggio rapido: K, Caricamento rapido: L",
        ],
        start: "⚔️ Entra nelle Terre",
        continue: "📜 Continua il viaggio",
        goal: "🎯 Obiettivo: completa missioni, compra equipaggiamento, costruisci la tua casa, accarezza il gatto e sopravvivi nella valle.",
      },
      labels: {
        language: "Lingua",
        hp: "PS",
        stamina: "Stamina",
        xp: "XP",
        lvl: "Liv",
        gold: "Oro",
        potions: "Pozioni",
        crystals: "Cristalli",
        wood: "Legno",
        stone: "Pietra",
        cores: "Nuclei",
        locked: "Bloccata",
        done: "Completata",
        turnIn: "(Consegna)",
        location: "Luogo",
        house: "Casa",
        weather: "Meteo",
        playerHouse: "Casa del giocatore",
        valley: "Valle",
        owned: "Di proprietà",
        sheltered: "Al riparo",
        explore: "Esplora la valle e scegli il tuo percorso.",
        defeatedTitle: "Sei stato sconfitto",
        recover: "Premi R per recuperare al campo.",
        deathsLine: "Morti: {deaths}. Gli slime ti salutano.",
        shopTitle: "🏪 Emporio di Nyx",
        shopHeader: "Il tuo oro: {gold}   [↑/↓ naviga, Invio/E compra, Esc chiudi]",
        controlsHint: "Colpo: LMB/Spazio  Parata: RMB/C  Usa: E  Pozione: Q  Salva/Carica: K/L  Mappa: M  Audio: N",
        clear: "Sereno",
        mist: "Nebbia",
        rain: "Pioggia",
        storm: "Tempesta",
      },
      quests: {
        crystal: "1) Ricognizione della Valle",
        slime: "2) Bonifica della Palude",
        wood: "3) Costruisci la tua Casa",
      },
      shop: {
        healthPotionName: "Pozione curativa",
        healthPotionDesc: "Ripristina 38 PS. Sa di piedi.",
        megaPotionName: "Mega pozione",
        megaPotionDesc: "Ripristina 80 PS. Sa di piedi costosi.",
        crystalShardName: "Scheggia di cristallo",
        crystalShardDesc: "Roccia brillante. All'Anziana piace molto.",
        mysteryBoxName: "Scatola misteriosa",
        mysteryBoxDesc: "Può essere qualsiasi cosa! (Di solito pietre.)",
        sellCoresName: "Vendi nuclei slime",
        sellCoresDesc: "Vendi 1 nucleo per 15 oro.",
      },
    },
    ja: {
      menu: {
        title: "🏜️ DUSTWARD",
        subtitle: "コミカルでリアル寄りな3DサンドボックスRPG。剣、スライム、そして微妙な人生選択。",
        controls: [
          "🎮 移動: WASD または 矢印キー",
          "👀 視点: マウス（クリックでポインタ固定）または 左右矢印",
          "⚔️ 攻撃: 左クリック または Space（3連コンボ）",
          "🛡️ ガード: 右クリック または C",
          "💬 会話 / ショップ: E（NPCと会話、買い物）",
          "🧪 ポーション使用: Q",
          "🗺️ マップ: M、🔇 音: N、📺 全画面: F",
          "💾 クイックセーブ: K、クイックロード: L",
        ],
        start: "⚔️ 荒野へ出発",
        continue: "📜 冒険を再開",
        goal: "🎯 目標: クエスト達成、装備購入、家づくり、猫をなでて、皮肉なNPCと怒れるゼリーだらけの谷を生き延びよう。",
      },
      labels: {
        language: "言語",
        hp: "HP",
        stamina: "スタミナ",
        xp: "XP",
        lvl: "Lv",
        gold: "ゴールド",
        potions: "ポーション",
        crystals: "クリスタル",
        wood: "木材",
        stone: "石材",
        cores: "コア",
        locked: "未解放",
        done: "完了",
        turnIn: "（報告）",
        location: "場所",
        house: "家",
        weather: "天気",
        playerHouse: "プレイヤーの家",
        valley: "谷",
        owned: "所有",
        sheltered: "屋内",
        explore: "谷を探索し、自分の道を切り開こう。",
        defeatedTitle: "あなたは倒された",
        recover: "Rでキャンプに戻る。",
        deathsLine: "死亡回数: {deaths}。スライムたちが手を振っている。",
        shopTitle: "🏪 ニクス商会",
        shopHeader: "所持金: {gold}   [↑/↓ 選択, Enter/E 購入, Esc 閉じる]",
        controlsHint: "攻撃: LMB/Space  ガード: RMB/C  使用: E  ポーション: Q  セーブ/ロード: K/L  マップ: M  音: N",
        clear: "晴れ",
        mist: "霧",
        rain: "雨",
        storm: "嵐",
      },
      quests: {
        crystal: "1) 谷の調査",
        slime: "2) 沼地の浄化",
        wood: "3) 自分の家を建てる",
      },
      shop: {
        healthPotionName: "回復ポーション",
        healthPotionDesc: "HPを38回復。味は足っぽい。",
        megaPotionName: "メガポーション",
        megaPotionDesc: "HPを80回復。高級な足の味。",
        crystalShardName: "クリスタルの欠片",
        crystalShardDesc: "キラキラした石。長老が大好き。",
        mysteryBoxName: "ミステリーボックス",
        mysteryBoxDesc: "何が出るかな！（だいたい石）",
        sellCoresName: "スライムコアを売る",
        sellCoresDesc: "コア1個を15ゴールドで売却。",
      },
    },
    tr: {
      menu: {
        title: "🏜️ DUSTWARD",
        subtitle: "Komik gerçekçiliğe sahip bir 3D sandbox RPG. Kılıçlar, slime'lar ve şüpheli hayat kararları.",
        controls: [
          "🎮 Hareket: WASD veya ok tuşları",
          "👀 Bakış: Fare (işaretçiyi kilitlemek için tıkla) veya Sol/Sağ ok",
          "⚔️ Saldırı: Sol tık veya Boşluk (3 vuruşluk kombo)",
          "🛡️ Blok: Sağ tık veya C",
          "💬 Etkileşim / Dükkan: E (NPC'lerle konuş, alışveriş yap)",
          "🧪 İksir kullan: Q",
          "🗺️ Harita: M, 🔇 Ses: N, 📺 Tam ekran: F",
          "💾 Hızlı kayıt: K, Hızlı yükleme: L",
        ],
        start: "⚔️ Vahşi Topraklara Gir",
        continue: "📜 Yolculuğa devam et",
        goal: "🎯 Hedef: görevleri tamamla, ekipman al, evini inşa et, kediyi sev ve alaycı NPC'ler ile öfkeli jellerle dolu vadide hayatta kal.",
      },
      labels: {
        language: "Dil",
        hp: "CP",
        stamina: "Dayanıklılık",
        xp: "XP",
        lvl: "Sv",
        gold: "Altın",
        potions: "İksirler",
        crystals: "Kristaller",
        wood: "Odun",
        stone: "Taş",
        cores: "Çekirdek",
        locked: "Kilitli",
        done: "Tamam",
        turnIn: "(Teslim et)",
        location: "Konum",
        house: "Ev",
        weather: "Hava",
        playerHouse: "Oyuncu Evi",
        valley: "Vadi",
        owned: "Sahip",
        sheltered: "Korunaklı",
        explore: "Vadiyi keşfet ve kendi yolunu çiz.",
        defeatedTitle: "Yenildin",
        recover: "Kampa dönmek için R'ye bas.",
        deathsLine: "Ölümler: {deaths}. Slime'lar selam söylüyor.",
        shopTitle: "🏪 Nyx'in Dükkanı",
        shopHeader: "Altının: {gold}   [↑/↓ gezin, Enter/E satın al, Esc kapat]",
        controlsHint: "Vuruş: LMB/Boşluk  Blok: RMB/C  Kullan: E  İksir: Q  Kaydet/Yükle: K/L  Harita: M  Ses: N",
        clear: "Açık",
        mist: "Sis",
        rain: "Yağmur",
        storm: "Fırtına",
      },
      quests: {
        crystal: "1) Vadi Keşfi",
        slime: "2) Bataklık Temizliği",
        wood: "3) Evini Kur",
      },
      shop: {
        healthPotionName: "Can iksiri",
        healthPotionDesc: "38 CP yeniler. Tadı ayak gibi.",
        megaPotionName: "Mega iksir",
        megaPotionDesc: "80 CP yeniler. Tadı pahalı ayak gibi.",
        crystalShardName: "Kristal parçası",
        crystalShardDesc: "Parlak taş. Yaşlı bunun hastası.",
        mysteryBoxName: "Gizem kutusu",
        mysteryBoxDesc: "Her şey çıkabilir! (Genelde taş çıkar.)",
        sellCoresName: "Slime çekirdeği sat",
        sellCoresDesc: "1 çekirdeği 15 altına sat.",
      },
    },
  };

  let currentLang = "en";

  function deepGet(obj, path) {
    return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }

  function fmt(template, vars = {}) {
    return template.replace(/\{(\w+)\}/g, (_, token) => (vars[token] !== undefined ? String(vars[token]) : `{${token}}`));
  }

  function t(key, vars) {
    const active = LANGUAGE_PACKS[currentLang] || LANGUAGE_PACKS.en;
    const value = deepGet(active, key) ?? deepGet(LANGUAGE_PACKS.en, key) ?? key;
    return typeof value === "string" ? fmt(value, vars) : value;
  }

  function localizeMenu() {
    const title = document.getElementById("menu-title");
    const subtitle = document.getElementById("menu-subtitle");
    const hint = document.getElementById("hint");
    const controls = document.querySelectorAll("[data-control-index]");
    if (title) title.textContent = t("menu.title");
    if (subtitle) subtitle.textContent = t("menu.subtitle");
    if (hint) hint.textContent = t("menu.goal");
    if (startBtn) startBtn.textContent = t("menu.start");
    if (continueBtn) continueBtn.textContent = t("menu.continue");
    if (langLabel) langLabel.textContent = t("labels.language");
    controls.forEach((node) => {
      const index = Number(node.getAttribute("data-control-index"));
      const list = t("menu.controls");
      if (Array.isArray(list) && Number.isInteger(index) && list[index]) {
        node.textContent = list[index];
      }
    });
  }

  function refreshLocalizedStateText() {
    state.quests.crystal.title = t("quests.crystal");
    state.quests.slime.title = t("quests.slime");
    state.quests.wood.title = t("quests.wood");
    if (state.quests.ashfall_intro) state.quests.ashfall_intro.title = "5) Ashfall Salvage Route";
    if (state.quests.ashfall_boss) state.quests.ashfall_boss.title = "6) Sump Tyrant Shutdown";
    if (state.quests.lantern_probe) state.quests.lantern_probe.title = "7) Lantern Signal Intercept";
    if (state.quests.lantern_revolt) state.quests.lantern_revolt.title = "8) District Pressure Valve";
  }

  function readStorageWithFallback(primaryKey, legacyKeys) {
    try {
      const primaryValue = window.localStorage.getItem(primaryKey);
      if (primaryValue !== null) return { value: primaryValue, key: primaryKey };
      for (const key of legacyKeys) {
        const legacyValue = window.localStorage.getItem(key);
        if (legacyValue !== null) return { value: legacyValue, key };
      }
    } catch {
      // storage unavailable
    }
    return null;
  }

  function migrateStorageValue(nextKey, currentKey, rawValue) {
    if (!rawValue || currentKey === nextKey) return;
    try {
      window.localStorage.setItem(nextKey, rawValue);
    } catch {
      // migration is best-effort
    }
  }

  function buildLanguageOptions() {
    if (!langSelect) return;
    langSelect.textContent = "";
    for (const [code, label] of Object.entries(LANGUAGE_OPTIONS)) {
      if (!LANGUAGE_PACKS[code]) continue;
      const option = document.createElement("option");
      option.value = code;
      option.textContent = label;
      langSelect.appendChild(option);
    }
  }

  function setLanguage(langCode) {
    currentLang = LANGUAGE_PACKS[langCode] ? langCode : "en";
    try {
      window.localStorage.setItem(LOCALE_KEY, currentLang);
    } catch {
      // storage unavailable is non-fatal
    }
    localizeMenu();
    refreshLocalizedStateText();
  }

  function initLanguage() {
    let stored = null;
    const localeEntry = readStorageWithFallback(LOCALE_KEY, LEGACY_LOCALE_KEYS);
    if (localeEntry) {
      stored = localeEntry.value;
      migrateStorageValue(LOCALE_KEY, localeEntry.key, localeEntry.value);
    }
    currentLang = LANGUAGE_PACKS[stored] ? stored : "en";
    if (langSelect) {
      buildLanguageOptions();
      langSelect.value = currentLang;
      langSelect.addEventListener("change", (event) => {
        setLanguage(event.target.value);
      });
    }
    localizeMenu();
  }

  /* ─── Sound Effects System (Web Audio API) ─── */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let soundEnabled = true;
  let audioBuses = null;
  let ambientEnabled = true;
  let lastAmbientRegion = null;

  function ensureAudio() {
    if (!audioCtx && AudioCtx) {
      try { audioCtx = new AudioCtx(); } catch { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => { });
    }
    if (audioCtx && !audioBuses) {
      try { audioBuses = createAudioBuses(audioCtx); } catch { audioBuses = null; }
    }
    return audioCtx;
  }

  function syncAmbientForRegion(regionId) {
    if (!ambientEnabled || !soundEnabled) return;
    const ctx = ensureAudio();
    if (!ctx || !audioBuses) return;
    if (regionId === lastAmbientRegion) return;
    try { setAmbientRegion(audioBuses, regionId); lastAmbientRegion = regionId; } catch { /* audio not critical */ }
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
    footstep() { playTone(80 + Math.random() * 40, 0.06, "triangle", 0.04); },
    swordSwing() { playNoise(0.12, 0.07); playTone(220 + Math.random() * 60, 0.1, "sawtooth", 0.05); },
    swordHit() { playTone(160, 0.08, "square", 0.09); playNoise(0.06, 0.08); },
    playerHurt() { playTone(110, 0.15, "sawtooth", 0.08, -200); },
    enemyDie() { playTone(300, 0.06, "square", 0.06); playTone(200, 0.1, "square", 0.05); playTone(100, 0.18, "square", 0.04); },
    pickup() { playTone(523, 0.06, "sine", 0.07); playTone(659, 0.08, "sine", 0.06); },
    questDone() { playTone(392, 0.1, "sine", 0.07); playTone(523, 0.12, "sine", 0.07); playTone(659, 0.14, "sine", 0.07); },
    shopBuy() { playTone(440, 0.05, "triangle", 0.06); playTone(554, 0.08, "triangle", 0.06); },
    doorOpen() { playTone(130, 0.15, "triangle", 0.05); playTone(165, 0.12, "triangle", 0.04); },
    potionUse() { playTone(350, 0.08, "sine", 0.06); playTone(440, 0.12, "sine", 0.05); playTone(523, 0.15, "sine", 0.04); },
    levelUp() { playTone(523, 0.1, "sine", 0.08); playTone(659, 0.1, "sine", 0.08); playTone(784, 0.15, "sine", 0.08); playTone(1047, 0.2, "sine", 0.07); },
    thunder() { playNoise(0.6, 0.09); playTone(40, 0.5, "sawtooth", 0.06); },
    miss() { playNoise(0.08, 0.03); },
    blockHit() { playTone(200, 0.06, "square", 0.06); playTone(90, 0.08, "triangle", 0.05); },
    rain() { playNoise(0.3, 0.02); },
    npcChat() { playTone(280 + Math.random() * 80, 0.04, "triangle", 0.03); },
    death() { playTone(180, 0.2, "sawtooth", 0.08); playTone(120, 0.3, "sawtooth", 0.06); playTone(60, 0.5, "sawtooth", 0.04); },
  };

  let footstepTimer = 0;
  let ambientTimer = 0;

  const npcDialogue = NPC_DIALOGUE;
  const deathMessages = DEATH_MESSAGES;

  /* ─── Shop System ─── */
  let regionEventsEnabled = true;

  function getActiveRegionEventModifiers() {
    if (!regionEventsEnabled) return { priceMult: 1, spawnDensityMult: 1, banner: null };
    return resolveRegionEventModifiers(state.regions?.events);
  }

  let skillScreenOpen = false;
  let skillSelection = 0;
  let settingsOpen = false;
  let settingsSelection = 0;
  const SKILL_BRANCH_LABELS = [
    { id: "survival", label: "Survival", desc: "Stamina pool, harvest yield, weather grit." },
    { id: "combat", label: "Combat", desc: "Damage, block window, crit chance." },
    { id: "influence", label: "Influence", desc: "Faction sway, shop barter, ideology threshold." },
  ];

  let shopOpen = false;
  const shopItems = [
    {
      nameKey: "shop.healthPotionName", cost: 18, descKey: "shop.healthPotionDesc",
      action() { state.inventory.Potion += 1; }
    },
    {
      nameKey: "shop.megaPotionName", cost: 40, descKey: "shop.megaPotionDesc",
      action() { state.inventory.Potion += 3; }
    },
    {
      nameKey: "shop.crystalShardName", cost: 30, descKey: "shop.crystalShardDesc",
      action() { state.inventory["Crystal Shard"] += 1; updateQuestProgressFromInventory(); }
    },
    {
      nameKey: "shop.mysteryBoxName", cost: 25, descKey: "shop.mysteryBoxDesc",
      action() {
        const roll = Math.random();
        if (roll < 0.3) { state.inventory.Potion += 2; logMsg("Mystery Box: 2 Potions! Lucky you!"); }
        else if (roll < 0.5) { state.player.gold += 50; logMsg("Mystery Box: 50 gold! The house always wins... except now."); }
        else if (roll < 0.7) { state.inventory["Slime Core"] += 3; logMsg("Mystery Box: 3 Slime Cores! Eww but useful."); }
        else { state.inventory.Stone += 2; logMsg("Mystery Box: 2 Stones. Called it."); }
      }
    },
    {
      nameKey: "shop.sellCoresName", cost: -15, descKey: "shop.sellCoresDesc",
      action() {
        if (state.inventory["Slime Core"] <= 0) { logMsg("No Slime Cores to sell!"); return false; }
        state.inventory["Slime Core"] -= 1;
        state.player.gold += 15;
        return true;
      }
    },
    {
      nameKey: "shop.refineWeaponName", cost: 60, descKey: "shop.refineWeaponDesc",
      action() {
        if (state.progression.equipment.weaponTier !== "Common") { logMsg("Weapon already past Common."); return false; }
        if ((state.inventory.Ashglass || 0) < 4) { logMsg("Need 4 Ashglass to refine."); return false; }
        state.inventory.Ashglass -= 4;
        upgradeWeaponTier(state.progression);
        logMsg(`Weapon refined to ${state.progression.equipment.weaponTier}.`);
        return true;
      }
    },
    {
      nameKey: "shop.relicWeaponName", cost: 180, descKey: "shop.relicWeaponDesc",
      action() {
        if (state.progression.equipment.weaponTier !== "Refined") { logMsg("Refine the weapon first."); return false; }
        if ((state.inventory["Cipher Lens"] || 0) < 4) { logMsg("Need 4 Cipher Lens for relic upgrade."); return false; }
        state.inventory["Cipher Lens"] -= 4;
        upgradeWeaponTier(state.progression);
        logMsg(`Weapon ascended to ${state.progression.equipment.weaponTier}.`);
        return true;
      }
    },
    {
      nameKey: "shop.armorStaminaName", cost: 40, descKey: "shop.armorStaminaDesc",
      action() {
        if (state.progression.equipment.armorMods.includes("stamina_regen")) { logMsg("Stamina mod already fitted."); return false; }
        if ((state.inventory["Heat Resin"] || 0) < 2) { logMsg("Need 2 Heat Resin."); return false; }
        state.inventory["Heat Resin"] -= 2;
        addArmorModifier(state.progression, "stamina_regen");
        logMsg("Armor modifier installed: stamina regen.");
        return true;
      }
    },
    {
      nameKey: "shop.armorBlockName", cost: 50, descKey: "shop.armorBlockDesc",
      action() {
        if (state.progression.equipment.armorMods.includes("block_efficiency")) { logMsg("Block mod already fitted."); return false; }
        if ((state.inventory["Scrap Coil"] || 0) < 2) { logMsg("Need 2 Scrap Coil."); return false; }
        state.inventory["Scrap Coil"] -= 2;
        addArmorModifier(state.progression, "block_efficiency");
        logMsg("Armor modifier installed: block efficiency.");
        return true;
      }
    },
    {
      nameKey: "shop.armorWeatherName", cost: 45, descKey: "shop.armorWeatherDesc",
      action() {
        if (state.progression.equipment.armorMods.includes("weather_resistance")) { logMsg("Weather mod already fitted."); return false; }
        if ((state.inventory["Pressurized Ink"] || 0) < 2) { logMsg("Need 2 Pressurized Ink."); return false; }
        state.inventory["Pressurized Ink"] -= 2;
        addArmorModifier(state.progression, "weather_resistance");
        logMsg("Armor modifier installed: weather resistance.");
        return true;
      }
    },
  ];
  let shopSelection = 0;
  let latestParticleMultiplier = 1;
  let latestColorblindPalette = null;
  const _gradientCache = createGradientCache();
  const hexToRgba = hexToRgbaUtil;
  const gradientBucket = gradientBucketUtil;

  function isGradientCacheEnabled() {
    return Boolean(state?.graphics?.performance?.gradientCache);
  }

  function clearGradientCache() {
    _gradientCache.clear();
  }

  function getCachedGradient(key, buildFn, enabled) {
    return _gradientCache.fetch(key, buildFn, enabled);
  }

  /* ─── Particle System (pre-allocated pool, no per-frame alloc) ─── */
  const particlePool = createParticlePool(DEFAULT_PARTICLE_CAP);

  /* Spatial hash for enemy radius queries — rebuilt once per tick. */
  const enemyGrid = createSpatialHash(4);
  const _enemyQueryBuf = [];
  function aliveEnemy(e) { return e && e.alive; }

  function spawnParticles(x, y, count, color, speed, life, options = {}) {
    const decorative = Boolean(options.decorative);
    const spawnChance = decorative ? clamp(latestParticleMultiplier, 0, 1) : 1;
    if (spawnChance <= 0) return;
    const baseLife = life || 1;
    const baseSpeed = speed || 2;
    const fillColor = color || "#fff";
    for (let i = 0; i < count; i++) {
      if (spawnChance < 1 && Math.random() > spawnChance) continue;
      spawnParticleInto(
        particlePool,
        x, y,
        (Math.random() - 0.5) * baseSpeed,
        (Math.random() - 0.5) * baseSpeed,
        baseLife * (0.5 + Math.random() * 0.5),
        fillColor,
        2 + Math.random() * 3,
      );
    }
  }

  function updateParticles(dt) {
    updateParticlePool(particlePool, dt);
  }

  function drawParticles() {
    forEachActiveParticle(particlePool, (p) => {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      const radius = Math.max(1, p.size * 0.56);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 1.8);
      glow.addColorStop(0, p.color);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 1.7, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.92;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // Math utilities moved to ./math.js

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
          const row = Math.floor(y / 14);
          const offset = row % 2 ? 7 : 0;
          const mortar = ((x + offset) % 14) < 2 || y % 14 < 2;
          const grit = noise2D(x * 0.14, y * 0.14, 37.2);
          const tone = 0.56 + n * 0.34 + n2 * 0.2;
          r = (96 + grit * 42) * tone;
          g = (90 + grit * 36) * tone;
          b = (84 + grit * 30) * tone;

          if (mortar) {
            r *= 0.38;
            g *= 0.38;
            b *= 0.38;
          } else {
            const crack = noise2D(x * 0.33, y * 0.33, 81.7) > 0.92;
            const moss = noise2D(x * 0.09, y * 0.11, 54.1) > 0.84;
            if (crack) {
              r *= 0.6;
              g *= 0.58;
              b *= 0.58;
            }
            if (moss) {
              g += 20;
              r -= 8;
              b -= 10;
            }
          }
        } else if (kind === "water") {
          const ripple = Math.sin((x + y) * 0.14 + n * 6.5) * 0.55 + Math.sin(y * 0.28 + x * 0.11) * 0.45;
          const eddy = noise2D(x * 0.12, y * 0.12, 71.3);
          const tone = 0.5 + ripple * 0.13 + n2 * 0.25;
          r = 30 * tone + eddy * 10;
          g = 76 * tone + eddy * 22;
          b = 118 * tone + 24 + eddy * 30;
          const foam = noise2D(x * 0.4, y * 0.4, 16.4) > 0.965;
          if (foam) {
            r += 40;
            g += 45;
            b += 42;
          }
        } else if (kind === "timber") {
          const beam = x % 12 < 2;
          const grainWave = Math.sin(y * 0.18 + n2 * 3.4) * 0.08;
          const grain = 0.66 + n * 0.36 + grainWave;
          r = 136 * grain;
          g = 96 * grain;
          b = 58 * grain;
          if (beam) {
            r *= 0.58;
            g *= 0.58;
            b *= 0.58;
          } else if ((x + y) % 29 < 2) {
            r *= 1.08;
            g *= 1.04;
            b *= 0.96;
          }
        } else if (kind === "plaster") {
          const crack = (x + y) % 17 === 0 || (x * 3 + y * 2) % 31 === 0;
          const grime = noise2D(x * 0.07, y * 0.09, 93.1);
          const tone = 0.82 + n * 0.2 - grime * 0.08;
          r = 182 * tone;
          g = 168 * tone;
          b = 152 * tone;
          if (crack) {
            r *= 0.7;
            g *= 0.7;
            b *= 0.7;
          } else if (grime > 0.72) {
            r *= 0.88;
            g *= 0.9;
            b *= 0.86;
          }
        } else if (kind === "neon") {
          const stripe = (x + y) % 18 < 4;
          const pulse = 0.58 + Math.sin((x - y) * 0.14 + n * 5) * 0.24 + n2 * 0.24;
          r = 54 * pulse;
          g = 98 * pulse;
          b = 150 * pulse + 44;
          if (stripe) {
            r += 38;
            g += 30;
            b += 68;
          } else if (noise2D(x * 0.26, y * 0.26, 44.1) > 0.86) {
            r += 24;
            g += 14;
            b += 36;
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

    // Flagship biome: "Glass Gulch", a foggy industrial fringe where ranged enemies thrive.
    for (let y = 32; y <= 50; y++) {
      for (let x = 36; x <= 52; x++) {
        if (x === 36 || y === 32 || x === 52 || y === 50) {
          grid[y][x] = 1;
        } else {
          grid[y][x] = 5;
        }
      }
    }
    for (let y = 38; y <= 43; y++) {
      for (let x = 41; x <= 47; x++) {
        grid[y][x] = 0;
      }
    }
    grid[32][44] = 0;
    grid[31][44] = 0;
    grid[30][44] = 0;

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
    neon: makeTexture("neon"),
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
      quality: "balanced",
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
      screenShake: 0,
      weaponSway: 0,
      deaths: 0,
      loadout: {
        weapon: "Frontier Saber",
        stance: "balanced",
      },
      quickUtility: { active: "smoke", inventory: { smoke: 1, flare: 1, tonic: 1 } },
      perks: [],
      combatProfile: resolveCombatProgression(createInitialNarrativeState(), 1),
    },
    inventory: {
      "Crystal Shard": 0,
      Wood: 0,
      Stone: 0,
      Potion: 2,
      "Slime Core": 0,
      Ashglass: 0,
      "Scrap Coil": 0,
      "Heat Resin": 0,
      "Lantern Filament": 0,
      "Cipher Lens": 0,
      "Pressurized Ink": 0,
    },
    quests: createInitialQuestState(),
    narrative: createInitialNarrativeState(),
    progression: createInitialProgressionState(),
    regions: createInitialRegionState(),
    graphics: createInitialGraphicsState(),
    npcs: [
      {
        id: "elder",
        name: MAJOR_NPCS.elder.name,
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
        name: MAJOR_NPCS.warden.name,
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
        name: MAJOR_NPCS.smith.name,
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
        name: MAJOR_NPCS.merchant.name,
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
        name: MAJOR_NPCS.innkeeper.name,
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
    pigs: [],
    enemies: [],
    resources: [],
    pigJokeCooldown: 0,
    pigStampedeTimer: 0,
    narrativePulseTimer: 7,
    floatingTexts: [],
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

  initLanguage();
  refreshLocalizedStateText();
  syncChapterFromProgress(state.narrative, state.player.level);
  syncCombatProfileState();

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
      const type = chooseEnemyType(state.player.level, state.weather.kind);
      const stats = createEnemyStats(type, state.player.level);
      state.enemies.push({
        id: `slime-${i}`,
        type: stats.type,
        label: stats.label,
        color: stats.color,
        behavior: stats.behavior,
        x: pos.x,
        y: pos.y,
        hp: stats.hp,
        maxHp: stats.maxHp,
        speed: stats.speed + Math.random() * 0.3,
        attackReach: stats.attackReach,
        baseDamage: stats.baseDamage,
        damageVariance: stats.damageVariance,
        attackCooldown: Math.random() * 0.75,
        alive: true,
        respawn: 0,
        stagger: 0,
        flashTimer: 0,
      });
    }
  }

  function spawnResources() {
    state.resources = [];

    function addResource(type, count, opts = {}) {
      const minX = opts.minX ?? 4;
      const minY = opts.minY ?? 4;
      const maxX = opts.maxX ?? 53;
      const maxY = opts.maxY ?? 53;
      const extraCheck = opts.extraCheck ?? ((x, y) => !isInHouseLot(x, y) && Math.hypot(x - 10, y - 8) > 4);
      for (let i = 0; i < count; i++) {
        const pos = findEmptyCell(worldMap, minX, minY, maxX, maxY, extraCheck);
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
    addResource("archive-node", 4, {
      minX: 38,
      minY: 34,
      maxX: 50,
      maxY: 48,
      extraCheck: (x, y) => tileTypeAtCurrentMap(x + 0.5, y + 0.5) === 5,
    });
    addResource("ashglass", 4, { minX: 26, minY: 32, maxX: 50, maxY: 50 });
    addResource("scrap-coil", 3, { minX: 26, minY: 32, maxX: 50, maxY: 50 });
    addResource("heat-resin", 3, { minX: 26, minY: 32, maxX: 50, maxY: 50 });
    addResource("lantern-filament", 4, { minX: 4, minY: 32, maxX: 26, maxY: 50 });
    addResource("cipher-lens", 3, { minX: 4, minY: 32, maxX: 26, maxY: 50 });
    addResource("pressurized-ink", 3, { minX: 4, minY: 32, maxX: 26, maxY: 50 });
  }

  const REGION_RESOURCE_MAP = {
    ashglass: { region: "ashfall", item: "Ashglass", respawn: 36, xp: 8, label: "Ashglass" },
    "scrap-coil": { region: "ashfall", item: "Scrap Coil", respawn: 36, xp: 9, label: "Scrap Coil" },
    "heat-resin": { region: "ashfall", item: "Heat Resin", respawn: 40, xp: 9, label: "Heat Resin" },
    "lantern-filament": { region: "ironlantern", item: "Lantern Filament", respawn: 36, xp: 8, label: "Lantern Filament" },
    "cipher-lens": { region: "ironlantern", item: "Cipher Lens", respawn: 40, xp: 10, label: "Cipher Lens" },
    "pressurized-ink": { region: "ironlantern", item: "Pressurized Ink", respawn: 40, xp: 10, label: "Pressurized Ink" },
  };

  function spawnPigs() {
    state.pigs = [];
    const names = [
      "Sheriff Snout",
      "Porkchop Cassidy",
      "Ham Solo",
      "Deputy Wiggles",
      "Saddleback Sue",
      "Mud Maverick",
      "Bandana Bacon",
      "Sir Oinks-a-Lot",
    ];
    const presetPens = [
      { x: 8.2, y: 7.6 },
      { x: 10.7, y: 7.9 },
      { x: 7.1, y: 8.9 },
      { x: 11.9, y: 9.2 },
      { x: 9.3, y: 10.1 },
      { x: 7.9, y: 10.7 },
      { x: 10.9, y: 10.7 },
      { x: 9.5, y: 11.3 },
    ];
    for (let i = 0; i < 8; i++) {
      const style = WESTERN_PIG_ROLES[i % WESTERN_PIG_ROLES.length];
      const candidate = presetPens[i] || findEmptyCell(worldMap, 5, 5, 24, 15, (x, y) => !isInHouseLot(x, y));
      const fallback = findEmptyCell(worldMap, 6, 6, 15, 12, (x, y) => !isInHouseLot(x, y));
      const pos = !isBlocking(candidate.x, candidate.y) ? candidate : fallback;
      state.pigs.push({
        id: `pig-${i}`,
        name: names[i % names.length],
        role: style.role,
        hatColor: style.hat,
        bandanaColor: style.bandana,
        temper: style.temper,
        x: pos.x,
        y: pos.y,
        homeX: pos.x,
        homeY: pos.y,
        wanderRadius: 0.75 + Math.random() * 1.25,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0.25 + Math.random() * 1.8,
        zoomTimer: 0,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        heading: Math.random() * TAU,
        gaitPhase: Math.random() * TAU,
        emoteTimer: Math.random() * 4,
        pickpocketCooldown: 3 + Math.random() * 2,
      });
    }
  }

  spawnEnemies();
  spawnResources();
  spawnPigs();

  function refreshContinueButton() {
    if (!continueBtn) return;
    continueBtn.style.display = hasSaveData ? "inline-block" : "none";
  }

  function readSaveData() {
    const saveEntry = readStorageWithFallback(SAVE_KEY, LEGACY_SAVE_KEYS);
    if (!saveEntry) return null;
    try {
      const parsed = JSON.parse(saveEntry.value);
      if (!parsed || (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3)) return null;
      migrateStorageValue(SAVE_KEY, saveEntry.key, saveEntry.value);
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
    state.narrative.ending = resolveNarrativeEnding(state.narrative);
    return {
      version: 3,
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
        loadout: state.player.loadout,
        perks: state.player.perks,
        upgradePoints: state.progression.upgradePoints,
        equipment: state.progression.equipment,
        traits: state.progression.traits,
        quickUtility: state.player.quickUtility,
      },
      inventory: {
        "Crystal Shard": state.inventory["Crystal Shard"],
        Wood: state.inventory.Wood,
        Stone: state.inventory.Stone,
        Potion: state.inventory.Potion,
        "Slime Core": state.inventory["Slime Core"],
        Ashglass: state.inventory.Ashglass || 0,
        "Scrap Coil": state.inventory["Scrap Coil"] || 0,
        "Heat Resin": state.inventory["Heat Resin"] || 0,
        "Lantern Filament": state.inventory["Lantern Filament"] || 0,
        "Cipher Lens": state.inventory["Cipher Lens"] || 0,
        "Pressurized Ink": state.inventory["Pressurized Ink"] || 0,
      },
      quests: {
        crystal: { status: state.quests.crystal.status, progress: state.quests.crystal.progress },
        slime: { status: state.quests.slime.status, progress: state.quests.slime.progress },
        wood: { status: state.quests.wood.status, progress: state.quests.wood.progress },
        archive: state.quests.archive
          ? { status: state.quests.archive.status, progress: state.quests.archive.progress }
          : null,
        ashfall_intro: state.quests.ashfall_intro
          ? { status: state.quests.ashfall_intro.status, progress: state.quests.ashfall_intro.progress }
          : null,
        ashfall_boss: state.quests.ashfall_boss
          ? { status: state.quests.ashfall_boss.status, progress: state.quests.ashfall_boss.progress }
          : null,
        lantern_probe: state.quests.lantern_probe
          ? { status: state.quests.lantern_probe.status, progress: state.quests.lantern_probe.progress }
          : null,
        lantern_revolt: state.quests.lantern_revolt
          ? { status: state.quests.lantern_revolt.status, progress: state.quests.lantern_revolt.progress }
          : null,
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
      narrative: state.narrative,
      showMap: state.showMap,
      progression: state.progression,
      regions: state.regions,
      graphics: state.graphics,
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
    if (!save || (save.version !== 1 && save.version !== 2 && save.version !== 3)) return false;
    const migrated = migrateSaveToV3(save);
    if (!migrated) return false;
    save = migrated;

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
    const allowedStances = new Set(["balanced", "aggressive", "defensive"]);
    const nextStance = player?.loadout?.stance;
    state.player.loadout.stance = allowedStances.has(nextStance) ? nextStance : state.player.loadout.stance;
    state.player.loadout.weapon = typeof player?.loadout?.weapon === "string" ? player.loadout.weapon : state.player.loadout.weapon;
    state.player.perks = Array.isArray(player?.perks) ? player.perks.filter((perk) => typeof perk === "string").slice(0, 12) : state.player.perks;

    const inventory = save.inventory || {};
    state.inventory["Crystal Shard"] = Math.max(0, Math.floor(numberOr(inventory["Crystal Shard"], 0)));
    state.inventory.Wood = Math.max(0, Math.floor(numberOr(inventory.Wood, 0)));
    state.inventory.Stone = Math.max(0, Math.floor(numberOr(inventory.Stone, 0)));
    state.inventory.Potion = Math.max(0, Math.floor(numberOr(inventory.Potion, 0)));
    state.inventory["Slime Core"] = Math.max(0, Math.floor(numberOr(inventory["Slime Core"], 0)));
    for (const key of ["Ashglass", "Scrap Coil", "Heat Resin", "Lantern Filament", "Cipher Lens", "Pressurized Ink"]) {
      state.inventory[key] = Math.max(0, Math.floor(numberOr(inventory[key], 0)));
    }

    applyQuestState("crystal", save.quests?.crystal);
    applyQuestState("slime", save.quests?.slime);
    applyQuestState("wood", save.quests?.wood);
    applyQuestState("archive", save.quests?.archive);
    applyQuestState("ashfall_intro", save.quests?.ashfall_intro);
    applyQuestState("ashfall_boss", save.quests?.ashfall_boss);
    applyQuestState("lantern_probe", save.quests?.lantern_probe);
    applyQuestState("lantern_revolt", save.quests?.lantern_revolt);

    state.house.unlocked = Boolean(save.house?.unlocked);
    state.house.built = Boolean(save.house?.built || state.house.unlocked);
    state.house.visits = Math.max(0, Math.floor(numberOr(save.house?.visits, state.house.visits)));

    state.showMap = typeof save.showMap === "boolean" ? save.showMap : state.showMap;
    state.narrative = migrateNarrativeState(save);
    state.progression = save.progression || createInitialProgressionState();
    state.regions = save.regions || createInitialRegionState();
    const graphicsDefaults = createInitialGraphicsState();
    state.graphics = {
      ...graphicsDefaults,
      ...(save.graphics || {}),
      accessibility: {
        ...graphicsDefaults.accessibility,
        ...(save.graphics?.accessibility || {}),
      },
      performance: {
        ...graphicsDefaults.performance,
        ...(save.graphics?.performance || {}),
      },
    };
    state.player.quickUtility = save.player?.quickUtility || state.player.quickUtility;
    syncCombatProfileState();
    for (const regionId of state.regions.discovered) {
      ensureRegionMiniBosses(regionId);
    }

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
    syncChapterFromProgress(state.narrative, state.player.level);
    syncCombatProfileState();
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
      logMsg("Welcome to Dustward, drifter. Talk to townsfolk, duel slimes, and avoid being trampled by outlaw pigs.");
      ensureAudio();
    }
    syncAmbientForRegion(state.regions?.activeRegion || "frontier");
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

  function applyProgressionEffects() {
    const modifiers = buildProgressionModifiers(state.progression);
    state.player.progressionMods = modifiers;
    state.player.quickUtility = state.player.quickUtility || {
      active: "smoke",
      inventory: { smoke: 1, flare: 1, tonic: 1 },
    };
    if (!state.player.quickUtility.inventory) {
      state.player.quickUtility.inventory = { smoke: 1, flare: 1, tonic: 1 };
    }
    const ideologyTraits = resolveIdeologyTraits(state.narrative);
    state.progression.traits = ideologyTraits;
    state.player.traits = ideologyTraits;
    state.progression.upgradePoints = Math.max(
      state.progression.upgradePoints,
      Math.max(0, Math.floor(state.player.level / 2) - 1),
    );
  }

  function syncCombatProfileState(options = {}) {
    const { announce = false } = options;
    const previousPerks = new Set(state.player.perks || []);
    const profile = resolveCombatProgression(state.narrative, state.player.level);
    state.player.combatProfile = profile;
    state.player.perks = [...profile.perks];
    const stanceMap = {
      civicBulwark: "defensive",
      commonsDuelist: "balanced",
      cartelTrickster: "aggressive",
    };
    state.player.loadout.stance = stanceMap[profile.styleId] || "balanced";
    state.player.loadout.weapon =
      profile.styleId === "civicBulwark"
        ? "Marshal Saber"
        : profile.styleId === "cartelTrickster"
          ? "Cartel Rapier"
          : "Commons Blade";

    if (announce) {
      const unlocked = profile.perkDetails.filter((perk) => !previousPerks.has(perk.id));
      for (const perk of unlocked) {
        logMsg(`Perk unlocked: ${perk.label}. ${perk.description}`);
      }
      if (unlocked.length > 0) {
        logMsg(`Combat doctrine updated: ${profile.style.label}.`);
      }
    }
    applyProgressionEffects();
  }

  function getStanceModifiers() {
    const stance = state.player.loadout.stance;
    if (stance === "aggressive") {
      return { damageMult: 1.12, staminaMult: 1.1, cooldownMult: 1.04, blockPenalty: 1.08, sprintMult: 1.02 };
    }
    if (stance === "defensive") {
      return { damageMult: 0.92, staminaMult: 0.9, cooldownMult: 0.94, blockPenalty: 0.8, sprintMult: 0.95 };
    }
    return { damageMult: 1, staminaMult: 1, cooldownMult: 1, blockPenalty: 1, sprintMult: 1 };
  }

  function grantXp(amount) {
    state.player.xp += amount;
    const previousChapter = state.narrative.chapter;
    while (state.player.xp >= state.player.nextXp) {
      state.player.xp -= state.player.nextXp;
      state.player.level += 1;
      state.player.nextXp = Math.round(state.player.nextXp * 1.34 + 28);
      state.player.maxHp += 14;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 28);
      state.player.stamina = 100;
      logMsg(`Level up! You reached level ${state.player.level}. The valley trembles!`);
      sfx.levelUp();
      spawnParticles(canvas.width / 2, canvas.height / 2, 20, "#ffd700", 4, 1.5, { decorative: true });
      syncCombatProfileState({ announce: true });
    }
    syncChapterFromProgress(state.narrative, state.player.level);
    if (state.narrative.chapter !== previousChapter) {
      const chapterInfo = STORY_CHAPTERS[state.narrative.chapterIndex] || STORY_CHAPTERS[0];
      logMsg(`Story chapter advanced: ${chapterInfo.title}.`);
    }
  }

  const MINI_BOSS_DEFS = {
    ashfall_scrap_tyrant: { region: "ashfall", label: "Scrap Tyrant", behavior: "tank", baseType: "brute", spawnArea: { minX: 36, minY: 38, maxX: 50, maxY: 50 }, hpMult: 3.2, damageMult: 1.4, rewardGold: 80, rewardResource: { item: "Heat Resin", count: 2 } },
    ashfall_scorch_engine: { region: "ashfall", label: "Scorch Engine", behavior: "charge", baseType: "charger", spawnArea: { minX: 28, minY: 32, maxX: 42, maxY: 46 }, hpMult: 2.8, damageMult: 1.3, rewardGold: 90, rewardResource: { item: "Scrap Coil", count: 2 } },
    lantern_overseer: { region: "ironlantern", label: "Lantern Overseer", behavior: "shield", baseType: "shield_brute", spawnArea: { minX: 6, minY: 38, maxX: 22, maxY: 50 }, hpMult: 3.5, damageMult: 1.4, rewardGold: 120, rewardResource: { item: "Cipher Lens", count: 2 } },
    lantern_iron_chanter: { region: "ironlantern", label: "Iron Chanter", behavior: "control", baseType: "suppressor", spawnArea: { minX: 10, minY: 32, maxX: 24, maxY: 44 }, hpMult: 2.6, damageMult: 1.2, rewardGold: 110, rewardResource: { item: "Pressurized Ink", count: 2 } },
  };

  function spawnMiniBossById(bossId) {
    const def = MINI_BOSS_DEFS[bossId];
    if (!def) return;
    if (state.regions.miniBosses[bossId]?.defeated) return;
    if (state.enemies.some((e) => e.miniBossId === bossId && e.alive)) return;
    const pos = findEmptyCell(worldMap, def.spawnArea.minX, def.spawnArea.minY, def.spawnArea.maxX, def.spawnArea.maxY, (x, y) => !isInHouseLot(x, y));
    const stats = createEnemyStats(def.baseType, state.player.level);
    state.enemies.push({
      id: `miniboss-${bossId}`,
      miniBossId: bossId,
      type: stats.type,
      label: def.label,
      color: stats.color,
      behavior: def.behavior,
      x: pos.x,
      y: pos.y,
      hp: Math.round(stats.maxHp * def.hpMult),
      maxHp: Math.round(stats.maxHp * def.hpMult),
      speed: stats.speed * 0.95,
      attackReach: stats.attackReach + 0.2,
      baseDamage: Math.round(stats.baseDamage * def.damageMult),
      damageVariance: stats.damageVariance + 2,
      attackCooldown: 1.0,
      alive: true,
      respawn: 0,
      stagger: 0,
      flashTimer: 0,
    });
    logMsg(`Mini-boss prowling ${REGIONS[def.region]?.name || def.region}: ${def.label}.`);
  }

  function ensureRegionMiniBosses(regionId) {
    for (const [bossId, def] of Object.entries(MINI_BOSS_DEFS)) {
      if (def.region !== regionId) continue;
      spawnMiniBossById(bossId);
    }
  }

  function applyDynamicRegionProgression() {
    if (state.player.level >= 4 && !state.regions.discovered.includes("ashfall")) {
      unlockRegion(state.regions, "ashfall");
      if (state.quests.ashfall_intro && state.quests.ashfall_intro.status === "locked") {
        state.quests.ashfall_intro.status = "active";
      }
      logMsg("Region unlocked: Ashfall Basin. Heat haze now distorts the horizon.");
      ensureRegionMiniBosses("ashfall");
    }
    if (state.player.level >= 7 && !state.regions.discovered.includes("ironlantern")) {
      unlockRegion(state.regions, "ironlantern");
      if (state.quests.lantern_probe && state.quests.lantern_probe.status === "locked") {
        state.quests.lantern_probe.status = "active";
      }
      logMsg("Region unlocked: Iron Lantern District. Surveillance pressure is rising.");
      ensureRegionMiniBosses("ironlantern");
    }
  }

  function cycleRegion() {
    const order = ["frontier", "ashfall", "ironlantern"];
    const unlocked = order.filter((regionId) => state.regions.discovered.includes(regionId));
    if (unlocked.length <= 1) {
      logMsg("No other regions are unlocked yet.");
      return;
    }
    const idx = unlocked.indexOf(state.regions.activeRegion);
    const next = unlocked[(idx + 1) % unlocked.length];
    unlockRegion(state.regions, next);
    const name = REGIONS[next]?.name || next;
    logMsg(`Travelled to region: ${name}.`);
    syncAmbientForRegion(next);
  }

  function applySmokeBlind() {
    queryEnemyRadius(enemyGrid, state.player.x, state.player.y, 6.5, _enemyQueryBuf);
    for (let i = 0; i < _enemyQueryBuf.length; i++) {
      const enemy = _enemyQueryBuf[i];
      enemy.searchTimer = 3.0;
      enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, 1.4);
      enemy.stagger = Math.max(enemy.stagger || 0, 0.6);
    }
    return _enemyQueryBuf.length;
  }

  function applyFlareSlow() {
    queryEnemyRadius(enemyGrid, state.player.x, state.player.y, 9, _enemyQueryBuf);
    for (let i = 0; i < _enemyQueryBuf.length; i++) {
      _enemyQueryBuf[i].flareSlowTimer = Math.max(_enemyQueryBuf[i].flareSlowTimer || 0, 4.0);
    }
    state.player.flareRevealTimer = Math.max(state.player.flareRevealTimer || 0, 6.0);
    return _enemyQueryBuf.length;
  }

  function applyTonicHoT() {
    state.player.tonicTimer = 5.0;
    state.player.tonicTickAccum = 0;
    state.player.stamina = Math.min(100, state.player.stamina + 12);
  }

  function useQuickUtility() {
    const quick = state.player.quickUtility;
    if (!quick) return;
    const current = quick.active || "smoke";
    const available = Math.max(0, Math.floor(numberOr(quick.inventory?.[current], 0)));
    if (available <= 0) {
      logMsg(`No ${current} left in utility slot.`);
      return;
    }
    quick.inventory[current] = available - 1;
    if (current === "smoke") {
      const blinded = applySmokeBlind();
      logMsg(`Smoke canister popped. ${blinded ? `${blinded} enemies lose your trail.` : "No enemies in range."}`);
    } else if (current === "flare") {
      const slowed = applyFlareSlow();
      state.weather.lightning = Math.max(state.weather.lightning, 0.35);
      logMsg(`Flare deployed. ${slowed ? `${slowed} enemies slowed; map reveal active.` : "Map reveal active."}`);
    } else {
      applyTonicHoT();
      logMsg("Tonic ingested. Health regenerating.");
    }
  }

  function setQuickUtility(slot) {
    if (!state.player.quickUtility) return;
    if (!["smoke", "flare", "tonic"].includes(slot)) return;
    state.player.quickUtility.active = slot;
    logMsg(`Quick utility set to ${slot}.`);
  }

  function performDodgeStep() {
    if (state.mode !== "playing" || state.player.inHouse) return;
    if (state.player.dodgeCooldown > 0 || state.player.stamina < 12) {
      return;
    }
    const heading = state.player.angle;
    const dx = Math.cos(heading) * 0.82;
    const dy = Math.sin(heading) * 0.82;
    moveWithCollision(dx, dy);
    state.player.dodgeCooldown = 1.1;
    const freedomBonus = state.progression.traits.includes("freedom_strider") ? 0.78 : 1;
    state.player.stamina = Math.max(0, state.player.stamina - 12 * freedomBonus);
    logMsg("Dodge step executed.");
  }

  function performChargedAttack() {
    if (state.mode !== "playing") return;
    if (state.player.attackCooldown > 0 || state.player.stamina < 24) {
      return;
    }
    const orderKeeper = state.progression.traits.includes("order_keeper");
    const prevCombo = state.player.comboStep;
    state.player.comboStep = 3;
    attack();
    state.player.comboStep = prevCombo;
    state.player.attackCooldown += orderKeeper ? 0.05 : 0.14;
    state.player.stamina = Math.max(0, state.player.stamina - 14);
    logMsg("Charged attack unleashed.");
  }

  function isBlocking(x, y) {
    const map = currentMap();
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (ty < 0 || tx < 0 || ty >= map.length || tx >= map[0].length) return true;
    return map[ty][tx] !== 0;
  }

  function tileTypeAtCurrentMap(x, y) {
    const map = currentMap();
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (ty < 0 || tx < 0 || ty >= map.length || tx >= map[0].length) return 1;
    return map[ty][tx];
  }

  function canOccupy(x, y, radius = PLAYER_COLLISION_RADIUS) {
    const diag = radius * 0.7;
    return (
      !isBlocking(x, y) &&
      !isBlocking(x + radius, y) &&
      !isBlocking(x - radius, y) &&
      !isBlocking(x, y + radius) &&
      !isBlocking(x, y - radius) &&
      !isBlocking(x + diag, y + diag) &&
      !isBlocking(x - diag, y + diag) &&
      !isBlocking(x + diag, y - diag) &&
      !isBlocking(x - diag, y - diag)
    );
  }

  function moveWithCollision(dx, dy) {
    const px = state.player.x;
    const py = state.player.y;
    const nx = px + dx;
    const ny = py + dy;

    if (canOccupy(nx, py)) state.player.x = nx;
    if (canOccupy(state.player.x, ny)) state.player.y = ny;
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

    const wallSampleDist = Math.max(distToWall, WALL_TEXTURE_NEAR_CLIP);
    let wallX = side === 0 ? state.player.y + wallSampleDist * rayDirY : state.player.x + wallSampleDist * rayDirX;
    wallX -= Math.floor(wallX);
    if (!Number.isFinite(wallX)) wallX = 0;

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
    const logs = updateQuestProgressFromInventoryDataDriven(state.quests, state.inventory);
    for (const entry of logs) {
      logMsg(entry);
    }
  }

  function storyReactiveQuip(npcId) {
    const affinity = state.narrative.npcAffinity[npcId] || 0;
    const control = state.narrative.thematicAxes.controlVsFreedom;
    const truth = state.narrative.thematicAxes.truthVsComfort;
    const solidarity = state.narrative.thematicAxes.solidarityVsStatus;

    if (npcId === "elder" && truth > 12) {
      return "Mayor Clem: Publishing truth was brave. Also politically catastrophic. Nice work.";
    }
    if (npcId === "warden" && control > 15) {
      return "Marshal Boone: The streets are calm. The people are less so. That's governance.";
    }
    if (npcId === "smith" && solidarity > 10) {
      return "Professor Cogwheel: Shared tools, shared leverage. Funny how equality scares investors.";
    }
    if (npcId === "merchant" && truth < -8) {
      return "Reverend Quill: Information scarcity remains my most charitable product.";
    }
    if (affinity >= 18) {
      return `${state.npcs.find((npc) => npc.id === npcId)?.name || "NPC"}: You keep your word. That's rarer than ammo.`;
    }
    if (affinity <= -10) {
      return `${state.npcs.find((npc) => npc.id === npcId)?.name || "NPC"}: You talk reform, then negotiate like an accountant with a knife.`;
    }
    return null;
  }

  function describeNpcBackground(npcId) {
    const profile = MAJOR_NPCS[npcId];
    if (!profile) return;
    const affinity = state.narrative.npcAffinity[npcId] || 0;
    const stance =
      affinity >= 15 ? "allied" : affinity <= -10 ? "hostile" : "uncertain";
    logMsg(`${profile.name} profile: public "${profile.publicPersona}" | private "${profile.privateTruth}" | relationship ${stance} (${affinity}).`);
  }

  function tickNarrativeEvents(dt) {
    state.narrativePulseTimer = Math.max(0, state.narrativePulseTimer - dt);
    if (state.narrativePulseTimer > 0) return;
    state.narrativePulseTimer = 9 + Math.random() * 6;

    const flags = state.narrative.globalFlags;
    if (flags.ledgerPublished && flags.curfewNormalized && !flags.crossroad_civic_backlash) {
      flags.crossroad_civic_backlash = true;
      state.narrative.factionRep.civicCouncil = clamp(state.narrative.factionRep.civicCouncil - 6, -100, 100);
      state.narrative.npcAffinity.elder = clamp((state.narrative.npcAffinity.elder || 0) + 4, -100, 100);
      state.narrative.npcAffinity.warden = clamp((state.narrative.npcAffinity.warden || 0) - 5, -100, 100);
      logMsg("Crossroad event: public transparency collides with curfew control. The council splinters.");
      return;
    }

    if (flags.toolCommonsCreated && flags.curfewNormalized && !flags.crossroad_tools_policed) {
      flags.crossroad_tools_policed = true;
      state.narrative.thematicAxes.controlVsFreedom = clamp(state.narrative.thematicAxes.controlVsFreedom + 7, -100, 100);
      state.narrative.thematicAxes.solidarityVsStatus = clamp(state.narrative.thematicAxes.solidarityVsStatus - 5, -100, 100);
      logMsg("Crossroad event: open tooling is now permit-locked. Innovation survives, autonomy shrinks.");
      return;
    }

    if (state.narrative.decisions.length >= 3 && !state.narrative.globalFlags.midpoint_reflection) {
      state.narrative.globalFlags.midpoint_reflection = true;
      logMsg("Midpoint reflection: your choices changed who holds leverage, not just who likes you.");
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

    const pig = nearestEntity(state.pigs, () => true, 1.7);
    if (pig) {
      if (Math.random() < 0.2) {
        state.player.gold += 1;
        logMsg(`${pig.name} (${pig.role}) tips you one coin for "frontier services." +1 gold.`);
      } else {
        logMsg(choice([
          `${pig.name} (${pig.role}): OINK, partner.`,
          `${pig.name} adjusts its tiny hat and snorts with authority.`,
          `You pet ${pig.name}. The pig accepts your alliance.`,
        ]));
      }
      return;
    }

    const npc = nearestEntity(state.npcs, () => true, 1.95);
    if (npc) {
      if (npc.id === "elder") {
        const q = state.quests.crystal;
        const archiveQuest = state.quests.archive;
        if (archiveQuest && archiveQuest.status === "complete") {
          archiveQuest.status = "turned_in";
          grantXp(archiveQuest.reward.xp);
          state.player.gold += archiveQuest.reward.gold;
          const truthBias = state.narrative.thematicAxes.truthVsComfort;
          if (truthBias >= 0) {
            state.narrative.factionRep.workersGuild = clamp(state.narrative.factionRep.workersGuild + 8, -100, 100);
            state.narrative.factionRep.marketCartel = clamp(state.narrative.factionRep.marketCartel - 6, -100, 100);
          } else {
            state.narrative.factionRep.civicCouncil = clamp(state.narrative.factionRep.civicCouncil + 6, -100, 100);
          }
          state.narrative.ending = resolveNarrativeEnding(state.narrative);
          logMsg(`Quest done: ${archiveQuest.title}. +${archiveQuest.reward.xp} XP, +${archiveQuest.reward.gold} gold.`);
          logMsg(`Ending trajectory: ${state.narrative.ending.title} - ${state.narrative.ending.summary}`);
          sfx.questDone();
          return;
        }
        if (q.status === "locked") {
          q.status = "active";
          q.progress = 0;
          logMsg("Elder Nira: Bring me 4 Crystal Shards to map this frontier. I'd ride out myself, but my knees retired.");
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
          spawnParticles(canvas.width / 2, canvas.height / 2, 15, "#8fd0ff", 3, 1.2, { decorative: true });
          if (state.quests.slime.status === "locked") {
            state.quests.slime.status = "active";
            logMsg("Elder Nira: Warden Sol needs the marsh cleared.");
          }
          const decision = applyMajorDecision(state.narrative, "elder");
          if (decision) {
            logMsg(decision.immediateLog);
            logMsg(createDecisionRecap(state.narrative));
            syncCombatProfileState({ announce: true });
          }
          return;
        }
        logMsg(storyReactiveQuip("elder") || choice(npcDialogue.elder.idle));
        if (Math.random() < 0.35) describeNpcBackground("elder");
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
          logMsg("Warden Sol: Clear 3 slimes near the marsh. Frontier law says no jiggly bandits after sundown.");
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
          spawnParticles(canvas.width / 2, canvas.height / 2, 15, "#6be873", 3, 1.2, { decorative: true });
          if (state.quests.wood.status === "locked") {
            state.quests.wood.status = "active";
            logMsg("Warden Sol: Smith Varo can now build your house.");
          }
          const decision = applyMajorDecision(state.narrative, "warden");
          if (decision) {
            logMsg(decision.immediateLog);
            logMsg(createDecisionRecap(state.narrative));
            syncCombatProfileState({ announce: true });
          }
          return;
        }
        logMsg(storyReactiveQuip("warden") || choice(npcDialogue.warden.idle));
        if (Math.random() < 0.35) describeNpcBackground("warden");
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
          logMsg("Smith Varo: Bring 6 Wood and 4 Stone. We'll raise your ranch shack by sunset. No refunds.");
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
          spawnParticles(canvas.width / 2, canvas.height / 2, 25, "#d8bc6a", 4, 1.5, { decorative: true });
          const decision = applyMajorDecision(state.narrative, "smith");
          if (decision) {
            logMsg(decision.immediateLog);
            logMsg(createDecisionRecap(state.narrative));
            syncCombatProfileState({ announce: true });
          }
          if (state.quests.archive && state.quests.archive.status === "locked") {
            state.quests.archive.status = "active";
            logMsg("Professor Cogwheel: One final job. Bring me the Redacted Archive from the north watchtower.");
          }
          return;
        }
        logMsg(storyReactiveQuip("smith") || choice(npcDialogue.smith.idle));
        if (Math.random() < 0.35) describeNpcBackground("smith");
        sfx.npcChat();
        return;
      }

      if (npc.id === "merchant") {
        shopOpen = !shopOpen;
        shopSelection = 0;
        if (shopOpen) {
          sfx.npcChat();
          logMsg(storyReactiveQuip("merchant") || choice(npcDialogue.merchant.idle));
          if (Math.random() < 0.35) describeNpcBackground("merchant");
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
          if (Math.random() < 0.35) describeNpcBackground("innkeeper");
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
        if (state.quests.archive && state.quests.archive.status === "active") {
          logMsg("Bard Jingles: The watchtower in Glass Gulch hums with redacted ledgers. Bring all four pages.");
        }
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
      } else if (resource.type === "archive-node") {
        const archiveQuest = state.quests.archive;
        if (!archiveQuest || archiveQuest.status === "locked") {
          resource.harvested = false;
          logMsg("Encrypted watchtower node: locked behind Professor Cogwheel's final brief.");
          return;
        }
        resource.respawn = 45;
        archiveQuest.progress = Math.min(archiveQuest.need, archiveQuest.progress + 1);
        grantXp(12);
        logMsg(choice([
          "Recovered a redacted archive page. Truth gets heavier.",
          "Archive fragment decrypted. The supply chain suddenly looks like a power map.",
          "Watchtower node cracked. Somebody profits every time fear spikes.",
        ]));
        if (archiveQuest.progress >= archiveQuest.need && archiveQuest.status === "active") {
          archiveQuest.status = "complete";
          logMsg("Archive objective complete. Bring findings back to the town circle.");
        }
        sfx.pickup();
      } else if (REGION_RESOURCE_MAP[resource.type]) {
        const def = REGION_RESOURCE_MAP[resource.type];
        if (state.regions.activeRegion !== def.region) {
          resource.harvested = false;
          logMsg(`${def.label} can only be harvested while in ${REGIONS[def.region]?.name || def.region}.`);
          return;
        }
        resource.respawn = def.respawn;
        state.inventory[def.item] = (state.inventory[def.item] || 0) + 1;
        grantXp(def.xp);
        if (state.quests.ashfall_intro && state.quests.ashfall_intro.status === "active" && resource.type === "ashglass") {
          const q = state.quests.ashfall_intro;
          q.progress = Math.min(q.need, q.progress + 1);
          if (q.progress >= q.need) {
            q.status = "complete";
            logMsg("Ashfall salvage objective complete. Bring it to the town circle.");
          }
        }
        logMsg(`Harvested ${def.label}.`);
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
      spawnParticles(canvas.width / 2, canvas.height * 0.4, 12, "#d8bc6a", 3, 1, { decorative: true });
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

    const stance = getStanceModifiers();
    const combos = [
      { duration: 0.31, cooldown: 0.24, reach: 1.95, arc: 0.85, damage: 16, stamina: 9, lunge: 0.12, knock: 0.18 },
      { duration: 0.29, cooldown: 0.22, reach: 2.1, arc: 0.92, damage: 19, stamina: 10, lunge: 0.16, knock: 0.24 },
      { duration: 0.37, cooldown: 0.32, reach: 2.35, arc: 1.08, damage: 28, stamina: 14, lunge: 0.2, knock: 0.36 },
    ];

    if (state.player.comboWindow <= 0) {
      state.player.comboStep = 0;
    }
    state.player.comboStep = (state.player.comboStep % combos.length) + 1;

    const swing = applySwingLoadout(combos[state.player.comboStep - 1], state.player.combatProfile, {
      weatherKind: state.weather.kind,
      solidarityVsStatus: state.narrative.thematicAxes.solidarityVsStatus,
    });
    state.player.attackCooldown = swing.cooldown * stance.cooldownMult;
    state.player.comboWindow = 0.55;
    state.player.swingDuration = swing.duration;
    state.player.swingTimer = swing.duration;
    state.player.blocking = false;
    state.mouseButtons.right = false;
    state.player.stamina = Math.max(0, state.player.stamina - swing.stamina * stance.staminaMult);
    state.player.cameraKick = clamp(state.player.cameraKick + 0.14 + state.player.comboStep * 0.04, 0, 0.7);
    sfx.swordSwing();

    if (!state.player.inHouse) {
      moveWithCollision(Math.cos(state.player.angle) * swing.lunge, Math.sin(state.player.angle) * swing.lunge);
    }

    if (state.player.inHouse) {
      logMsg("Your blade whistles through the room. The furniture is unimpressed.");
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

    const maxTargets = state.narrative.globalFlags.toolCommonsCreated ? 3 : 2;
    let hitCount = 0;
    for (const enemy of targets) {
      if (hitCount >= maxTargets) break;
      const dx = enemy.x - state.player.x;
      const dy = enemy.y - state.player.y;
      const d = Math.hypot(dx, dy);
      if (d > swing.reach) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      const facingDiff = Math.abs(normalizeAngle(angleToEnemy - state.player.angle));
      if (facingDiff > swing.arc) continue;

      const damage = Math.floor((swing.damage * stance.damageMult))
        + Math.floor(state.player.level * 1.8)
        + Math.floor(Math.random() * 4) - 1;
      enemy.hp -= damage;
      enemy.attackCooldown += 0.45;
      enemy.stagger = 0.2 + state.player.comboStep * 0.05;
      enemy.flashTimer = 0.1;

      const nx = dx / (d + 1e-6);
      const ny = dy / (d + 1e-6);
      const pushX = enemy.x + nx * swing.knock;
      const pushY = enemy.y + ny * swing.knock;
      if (!isBlocking(pushX, enemy.y)) enemy.x = pushX;
      if (!isBlocking(enemy.x, pushY)) enemy.y = pushY;

      hitCount += 1;
      const isKill = enemy.hp <= 0;
      state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: isKill ? "SLAIN" : `-${damage}`, life: 0.72, maxLife: 0.72, color: isKill ? "#ff5555" : damage >= 24 ? "#ff9f3a" : "#ffe84e" });

      const eDx = enemy.x - state.player.x;
      const eDy = enemy.y - state.player.y;
      const eAng = normalizeAngle(Math.atan2(eDy, eDx) - state.player.angle);
      const eSx = clamp(((eAng + FOV / 2) / FOV) * canvas.width, 0, canvas.width);
      const eSy = canvas.height * 0.42;
      spawnParticles(eSx, eSy, 5, enemy.color || "#6be873", 2.5, 0.4);

      if (enemy.hp <= 0) {
        enemy.alive = false;
        const spawnMods = getActiveRegionEventModifiers();
        enemy.respawn = (22 + Math.random() * 8) / Math.max(0.4, spawnMods.spawnDensityMult);
        state.inventory["Slime Core"] += 1;
        const civicBounty = state.narrative.globalFlags.curfewNormalized ? 3 : 0;
        const truthBonusXp = state.narrative.globalFlags.ledgerPublished ? 4 : 0;
        state.player.gold += 10 + civicBounty;
        grantXp(22 + truthBonusXp);

        if (enemy.miniBossId) {
          const def = MINI_BOSS_DEFS[enemy.miniBossId];
          if (def) {
            if (state.regions.miniBosses[enemy.miniBossId]) state.regions.miniBosses[enemy.miniBossId].defeated = true;
            state.player.gold += def.rewardGold;
            state.inventory[def.rewardResource.item] = (state.inventory[def.rewardResource.item] || 0) + def.rewardResource.count;
            state.progression.upgradePoints += 1;
            grantXp(120);
            enemy.respawn = 1e9;
            logMsg(`Mini-boss defeated: ${def.label}! +${def.rewardGold}g, +${def.rewardResource.count} ${def.rewardResource.item}, +1 upgrade point.`);
            if (enemy.miniBossId === "ashfall_scrap_tyrant" && state.quests.ashfall_boss?.status === "active") {
              state.quests.ashfall_boss.status = "complete";
              state.quests.ashfall_boss.progress = state.quests.ashfall_boss.need;
              logMsg("Ashfall boss objective complete.");
            }
          }
        }

        logMsg(choice([
          `Slime obliterated! +${10 + civicBounty} gold, +${22 + truthBonusXp} XP, +1 Slime Core.`,
          `Splat! One less blob. +${10 + civicBounty} gold, +${22 + truthBonusXp} XP, +1 Core.`,
          `Slime defeated! It died as it lived: jiggly. +${10 + civicBounty}g, +${22 + truthBonusXp} XP.`,
          `Another slime bites the dust(ward). +${10 + civicBounty}g, +${22 + truthBonusXp} XP, +1 Core.`,
        ]));
        sfx.enemyDie();
        spawnParticles(eSx, eSy, 14, enemy.color || "#6be873", 3.5, 0.85);

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
      state.player.screenShake = clamp(state.player.screenShake + 0.1 * hitCount, 0, 0.45);
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
    spawnParticles(canvas.width / 2, canvas.height * 0.8, 8, "#5fe0b5", 2, 0.6, { decorative: true });
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
    state.player.screenShake = 0;
    state.player.weaponSway = 0;
    state.floatingTexts = [];
    clearParticlePool(particlePool);
    state.player.inHouse = false;
    state.player.blocking = false;
    state.player.stamina = 100;
    if (countDeath) state.player.deaths += 1;
    state.mouseButtons.right = false;

    spawnEnemies();
    spawnResources();
    spawnPigs();

    state.chest.opened = false;
    state.chest.respawn = 0;
    state.pigJokeCooldown = 0;
    state.narrativePulseTimer = 7;
    if (!silent) logMsg("You recover at camp. The valley reshapes itself. The slimes reset. It's like nothing happened... except your pride.");
  }

  function weatherLabel(kind) {
    if (kind === "mist") return t("labels.mist");
    if (kind === "rain") return t("labels.rain");
    if (kind === "storm") return t("labels.storm");
    if (kind === "sandstorm") return "Sandstorm";
    if (kind === "heatwave") return "Heatwave";
    if (kind === "neon_rain") return "Neon Rain";
    return t("labels.clear");
  }

  function updateWeather(dt) {
    const weather = state.weather;
    weather.timer -= dt;

    if (weather.timer <= 0) {
      const roll = Math.random();
      const region = state.regions.activeRegion;
      if (region === "ashfall") {
        if (roll < 0.36) weather.kind = "sandstorm";
        else if (roll < 0.62) weather.kind = "heatwave";
        else if (roll < 0.82) weather.kind = "mist";
        else weather.kind = "clear";
      } else if (region === "ironlantern") {
        if (roll < 0.34) weather.kind = "neon_rain";
        else if (roll < 0.62) weather.kind = "mist";
        else if (roll < 0.84) weather.kind = "storm";
        else weather.kind = "clear";
      } else if (roll < 0.45) {
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
    } else if (weather.kind === "neon_rain") {
      targetRain = 0.58;
      targetFog = 0.27;
      targetWind = 0.35;
    } else if (weather.kind === "sandstorm") {
      targetRain = 0.1;
      targetFog = 0.52;
      targetWind = 0.72;
    } else if (weather.kind === "heatwave") {
      targetRain = 0;
      targetFog = 0.2;
      targetWind = 0.48;
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

  function updatePigs(dt) {
    if (state.player.inHouse) return;

    if (state.pigs.length === 0) return;

    let nearestEnemyDist = Infinity;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const d = dist(enemy, state.player);
      if (d < nearestEnemyDist) nearestEnemyDist = d;
    }
    if (nearestEnemyDist < 2.8 || (state.weather.kind === "storm" && Math.random() < dt * 0.22)) {
      state.pigStampedeTimer = Math.max(state.pigStampedeTimer, 1.1 + Math.random() * 1.1);
    }
    state.pigStampedeTimer = Math.max(0, state.pigStampedeTimer - dt);

    const herdCenter = { x: 0, y: 0 };
    for (const pig of state.pigs) {
      herdCenter.x += pig.x;
      herdCenter.y += pig.y;
    }
    herdCenter.x /= state.pigs.length;
    herdCenter.y /= state.pigs.length;

    for (let i = 0; i < state.pigs.length; i++) {
      const pig = state.pigs[i];
      pig.wanderTimer -= dt;
      pig.zoomTimer = Math.max(0, pig.zoomTimer - dt);
      pig.emoteTimer = Math.max(0, pig.emoteTimer - dt);
      pig.pickpocketCooldown = Math.max(0, pig.pickpocketCooldown - dt);

      let separationX = 0;
      let separationY = 0;
      let alignmentX = 0;
      let alignmentY = 0;
      let cohesionX = 0;
      let cohesionY = 0;
      let neighbors = 0;

      for (let j = 0; j < state.pigs.length; j++) {
        if (i === j) continue;
        const other = state.pigs[j];
        const dx = pig.x - other.x;
        const dy = pig.y - other.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 3.6 * 3.6) continue;
        const d = Math.sqrt(d2) || 0.001;
        neighbors += 1;
        if (d < 1.35) {
          const push = (1.35 - d) / 1.35;
          separationX += (dx / d) * push;
          separationY += (dy / d) * push;
        }
        alignmentX += other.vx;
        alignmentY += other.vy;
        cohesionX += other.x;
        cohesionY += other.y;
      }

      if (neighbors > 0) {
        alignmentX /= neighbors;
        alignmentY /= neighbors;
        cohesionX = cohesionX / neighbors - pig.x;
        cohesionY = cohesionY / neighbors - pig.y;
      }

      const toHomeX = pig.homeX - pig.x;
      const toHomeY = pig.homeY - pig.y;
      const toHerdX = herdCenter.x - pig.x;
      const toHerdY = herdCenter.y - pig.y;
      const playerDx = state.player.x - pig.x;
      const playerDy = state.player.y - pig.y;
      const playerDist = Math.hypot(playerDx, playerDy) || 0.001;
      const playerAwayX = -playerDx / playerDist;
      const playerAwayY = -playerDy / playerDist;

      const noiseA = state.time * (1.2 + pig.temper * 1.8) + pig.gaitPhase + i * 0.77;
      const noiseB = state.time * (1.8 + pig.temper * 1.5) + pig.gaitPhase * 1.7 + i * 0.43;
      const wanderX = Math.cos(noiseA) * 0.75 + Math.sin(noiseB) * 0.25;
      const wanderY = Math.sin(noiseA) * 0.75 + Math.cos(noiseB) * 0.25;

      let intentX =
        separationX * 1.6 +
        alignmentX * 0.52 +
        cohesionX * 0.36 +
        toHomeX * 0.36 +
        toHerdX * 0.24 +
        wanderX * (0.33 + pig.temper * 0.16);
      let intentY =
        separationY * 1.6 +
        alignmentY * 0.52 +
        cohesionY * 0.36 +
        toHomeY * 0.36 +
        toHerdY * 0.24 +
        wanderY * (0.33 + pig.temper * 0.16);

      // Keep pigs in a readable town herd so players can find all characters.
      const homeDist = Math.hypot(toHomeX, toHomeY);
      if (homeDist > pig.wanderRadius) {
        const leash = Math.min(2, (homeDist - pig.wanderRadius) * 1.4);
        intentX += (toHomeX / homeDist) * leash;
        intentY += (toHomeY / homeDist) * leash;
      }

      if (playerDist < 2.5) {
        const panicWeight = 0.8 + (2.5 - playerDist) * 0.4;
        intentX += playerAwayX * panicWeight;
        intentY += playerAwayY * panicWeight;
        pig.zoomTimer = Math.max(pig.zoomTimer, 0.45 + pig.temper * 0.25);
      } else if (playerDist < 6.5 && pig.role === "Sheriff") {
        const tangent = normalizeVec(-playerDy, playerDx);
        intentX += tangent.x * 0.5;
        intentY += tangent.y * 0.5;
      } else if (playerDist < 5.2 && (pig.role === "Gambler" || pig.role === "Bandit")) {
        intentX += (playerDx / playerDist) * 0.32;
        intentY += (playerDy / playerDist) * 0.32;
      }

      if (state.pigStampedeTimer > 0) {
        const stampedeHeading = normalizeVec(playerAwayX + Math.cos(pig.gaitPhase), playerAwayY + Math.sin(pig.gaitPhase));
        intentX += stampedeHeading.x * (1.6 + pig.temper * 0.8);
        intentY += stampedeHeading.y * (1.6 + pig.temper * 0.8);
      }

      const intentNorm = normalizeVec(intentX, intentY);
      const calmSpeed = 0.58 + pig.temper * 0.58;
      const burst = pig.zoomTimer > 0 ? 1.02 + pig.temper * 0.58 : 0;
      const stampedeBoost = state.pigStampedeTimer > 0 ? 1.15 : 0;
      const targetSpeed = calmSpeed + burst + stampedeBoost;
      const targetVelX = intentNorm.x * targetSpeed;
      const targetVelY = intentNorm.y * targetSpeed;

      pig.vx = lerp(pig.vx, targetVelX, clamp(dt * 4.2, 0, 1));
      pig.vy = lerp(pig.vy, targetVelY, clamp(dt * 4.2, 0, 1));
      const clampedVel = clampVec(pig.vx, pig.vy, 2.95);
      pig.vx = clampedVel.x;
      pig.vy = clampedVel.y;

      const stepX = pig.vx * dt;
      const stepY = pig.vy * dt;
      const nx = pig.x + stepX;
      const ny = pig.y + stepY;
      const shoulderRoom = 0.66;

      if (!isBlocking(nx, pig.y) && dist({ x: nx, y: pig.y }, state.player) > shoulderRoom) {
        pig.x = nx;
      } else {
        pig.vx *= -0.42;
      }
      if (!isBlocking(pig.x, ny) && dist({ x: pig.x, y: ny }, state.player) > shoulderRoom) {
        pig.y = ny;
      } else {
        pig.vy *= -0.42;
      }

      if (vecLength(pig.vx, pig.vy) > 0.06) {
        pig.heading = Math.atan2(pig.vy, pig.vx);
      }
      pig.gaitPhase += dt * (5 + vecLength(pig.vx, pig.vy) * 4.5);

      if (playerDist < 1.2 && pig.role === "Bandit" && pig.pickpocketCooldown <= 0 && state.player.gold > 0) {
        const stolen = Math.min(2, state.player.gold);
        state.player.gold -= stolen;
        logMsg(`${pig.name} (${pig.role}) steals ${stolen} gold and vanishes in a cloud of dignity.`);
        pig.pickpocketCooldown = 9 + Math.random() * 7;
        pig.zoomTimer = 1.3;
        state.pigStampedeTimer = Math.max(state.pigStampedeTimer, 0.9);
      }
    }

    const nearestPig = nearestEntity(state.pigs, () => true, 7);
    if (nearestPig && state.pigJokeCooldown <= 0 && Math.random() < dt * 0.42) {
      logMsg(choice([
        "A posse of pigs stampedes across the trail like tiny furry outlaws.",
        `${nearestPig.name} yells OINK-HAW and kicks up dust.`,
        "You hear spurs jingling. It's the pig herd again.",
        "The western wind carries dramatic pig snorts across Dustward.",
      ]));
      state.pigJokeCooldown = 7 + Math.random() * 7;
    }
  }

  function updateAmbientSatire(dt) {
    state.narrative.ambientBanterTimer = Math.max(0, numberOr(state.narrative.ambientBanterTimer, 0) - dt);
    if (state.mode !== "playing" || state.player.inHouse) return;
    if (state.narrative.ambientBanterTimer > 0) return;
    if (Math.random() > dt * 0.18) return;

    const lines = [];
    if (state.weather.kind === "storm") {
      lines.push("Town notice: Lightning is now considered a motivational speaker.");
    }
    if (state.narrative.thematicAxes.controlVsFreedom > 15) {
      lines.push("Public service reminder: Curfew starts at dusk and ends when someone important feels safe.");
    }
    if (state.narrative.thematicAxes.truthVsComfort > 10) {
      lines.push("Bard bulletin: The truth has entered the chat and everyone is suddenly busy.");
    }
    if (state.narrative.thematicAxes.solidarityVsStatus > 10) {
      lines.push("Workshop update: Shared tools increased productivity and arguments by 40%.");
    }
    if (lines.length > 0) {
      logMsg(choice(lines));
      state.narrative.ambientBanterTimer = 9 + Math.random() * 7;
    }
  }

  function update(dt) {
    state.time += dt;
    state.player.dodgeCooldown = Math.max(0, numberOr(state.player.dodgeCooldown, 0) - dt);
    rebuildSpatialHash(enemyGrid, state.enemies, { filter: aliveEnemy });
    rollRegionEvent(state.regions, dt);
    applyDynamicRegionProgression();
    if (state.graphics.autoRecommended) {
      const recommended = resolveRecommendedPreset({
        width: canvas.width,
        height: canvas.height,
        deviceMemory: navigator.deviceMemory || 4,
      });
      state.graphics.preset = recommended;
      state.weather.quality = recommended === "high" ? "cinematic" : recommended === "low" ? "performance" : "balanced";
    }

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
    player.screenShake = Math.max(0, player.screenShake - dt * 7);
    const strafeDir = (state.keys.KeyD ? 1 : 0) - (state.keys.KeyA ? 1 : 0);
    player.weaponSway = lerp(player.weaponSway, strafeDir * -20, Math.min(1, dt * 9));
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.life -= dt;
      ft.wy -= 0.55 * dt;
      if (ft.life <= 0) state.floatingTexts.splice(i, 1);
    }
    state.pigJokeCooldown = Math.max(0, state.pigJokeCooldown - dt);
    updateWeather(dt);

    if (state.mode !== "playing") return;

    const turnInput = (state.keys.ArrowLeft ? -1 : 0) + (state.keys.ArrowRight ? 1 : 0);
    player.angle = normalizeAngle(player.angle + turnInput * PLAYER_ROT_SPEED * dt + state.mouseLook);
    state.mouseLook = 0;

    player.blocking = (state.mouseButtons.right || state.keys.KeyC) && player.swingTimer <= 0;

    const forward = (state.keys.KeyW || state.keys.ArrowUp ? 1 : 0) - (state.keys.KeyS || state.keys.ArrowDown ? 1 : 0);
    const strafe = (state.keys.KeyD ? 1 : 0) - (state.keys.KeyA ? 1 : 0);
    const stance = getStanceModifiers();

    const sprinting = (state.keys.ShiftLeft || state.keys.ShiftRight) && !player.blocking && !player.inHouse;
    let speedFactor = 1;
    if (sprinting && player.stamina > 4) {
      speedFactor = 1.42 * getSprintModifier(state.player.combatProfile) * stance.sprintMult;
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
    updatePigs(dt);
    updateAmbientSatire(dt);
    tickNarrativeEvents(dt);

    if (player.inHouse) {
      updateQuestProgressFromInventory();
      tickAutoSave(dt);
      return;
    }

    if ((state.player.tonicTimer || 0) > 0) {
      state.player.tonicTimer = Math.max(0, state.player.tonicTimer - dt);
      state.player.tonicTickAccum = (state.player.tonicTickAccum || 0) + dt;
      while (state.player.tonicTickAccum >= 0.5) {
        state.player.tonicTickAccum -= 0.5;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 4);
      }
    }
    if ((state.player.flareRevealTimer || 0) > 0) {
      state.player.flareRevealTimer = Math.max(0, state.player.flareRevealTimer - dt);
    }

    const weatherPursuitMult = 1 - state.weather.rain * 0.18;
    for (const enemy of state.enemies) {
      if (!enemy.alive) {
        enemy.respawn -= dt;
        if (enemy.respawn <= 0) {
          const pos = findEmptyCell(worldMap, 10, 10, 53, 53, (x, y) => !isInHouseLot(x, y));
          const nextType = chooseEnemyType(state.player.level, state.weather.kind);
          const stats = createEnemyStats(nextType, state.player.level);
          enemy.x = pos.x;
          enemy.y = pos.y;
          enemy.type = stats.type;
          enemy.label = stats.label;
          enemy.color = stats.color;
          enemy.behavior = stats.behavior;
          enemy.maxHp = stats.maxHp;
          enemy.hp = stats.maxHp;
          enemy.speed = stats.speed;
          enemy.attackReach = stats.attackReach;
          enemy.baseDamage = stats.baseDamage;
          enemy.damageVariance = stats.damageVariance;
          enemy.alive = true;
          enemy.attackCooldown = 0.7;
          enemy.stagger = 0;
        }
        continue;
      }

      if (enemy.flashTimer > 0) enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
      if (enemy.stagger > 0) {
        enemy.stagger -= dt;
      }
      if (enemy.searchTimer > 0) enemy.searchTimer = Math.max(0, enemy.searchTimer - dt);
      if (enemy.flareSlowTimer > 0) enemy.flareSlowTimer = Math.max(0, enemy.flareSlowTimer - dt);

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const d = Math.hypot(dx, dy);
      const combatProfile = createEnemyCombatProfile(enemy, player.level);
      const onGlassGulchTile = tileTypeAtCurrentMap(enemy.x, enemy.y) === 5;
      if (onGlassGulchTile && enemy.type === "spitter") {
        combatProfile.pursuitRange += 2.4;
        combatProfile.attackRange += 0.35;
      }

      if (d < combatProfile.pursuitRange && enemy.stagger <= 0 && (enemy.searchTimer || 0) <= 0) {
        // Pre-compute inverse distance to avoid division in both calculations
        const invD = 1 / (d + 1e-6);
        const nx = dx * invD;
        const ny = dy * invD;
        const behaviorMove = resolveBehaviorMove(enemy, { nx, ny, distance: d, dt });
        const flareMult = (enemy.flareSlowTimer || 0) > 0 ? 0.5 : 1;
        const move = enemy.speed * weatherPursuitMult * dt * behaviorMove.speedMult * flareMult;
        const nextX = enemy.x + behaviorMove.mx * move;
        const nextY = enemy.y + behaviorMove.my * move;

        if (!isBlocking(nextX, enemy.y)) enemy.x = nextX;
        if (!isBlocking(enemy.x, nextY)) enemy.y = nextY;

        enemy.attackCooldown -= dt;
        if (d < combatProfile.attackRange && enemy.attackCooldown <= 0) {
          enemy.attackCooldown = (1 + Math.random() * 0.5) * combatProfile.cooldownFactor;
          if (player.hurtCooldown <= 0) {
            player.hurtCooldown = 0.33;
            let damage = (enemy.baseDamage || 7) + Math.floor(Math.random() * (enemy.damageVariance || 6));

            if (player.blocking) {
              const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
              const facingDiff = Math.abs(normalizeAngle(angleToEnemy - player.angle));
              const stance = getStanceModifiers();
              const mitigated = resolveIncomingDamage(damage, state.player.combatProfile, { blocked: true });
              if (facingDiff < 1.12 && player.stamina > 10) {
                damage = Math.max(1, Math.floor(mitigated.blocked * stance.blockPenalty));
                player.stamina = Math.max(0, player.stamina - 11);
                logMsg("Block absorbed most of the hit. Your shield arm disagrees.");
                sfx.blockHit();
              } else {
                damage = Math.max(1, Math.floor(mitigated.glancing));
              }
            }

            player.hp -= damage;
            player.hitPulse = Math.max(player.hitPulse, 0.16);
            player.cameraKick = clamp(player.cameraKick + 0.18, 0, 1);
            player.screenShake = clamp(player.screenShake + 0.6, 0, 1);
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

  const _renderHelpers = createRenderHelpers(ctx);
  const roundedRectPath = _renderHelpers.roundedRectPath;
  const fillRoundedRect = _renderHelpers.fillRoundedRect;
  const strokeRoundedRect = _renderHelpers.strokeRoundedRect;
  const drawSoftPanel = _renderHelpers.drawSoftPanel;
  const fitText = _renderHelpers.fitText;
  const drawClippedText = _renderHelpers.drawClippedText;
  const drawPillLabel = _renderHelpers.drawPillLabel;

  function drawInteriorBackdrop(width, height) {
    const horizon = Math.floor(height * 0.57);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    ceilGrad.addColorStop(0, "#151b20");
    ceilGrad.addColorStop(0.5, "#2b2b28");
    ceilGrad.addColorStop(1, "#574636");
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, width, horizon);

    const floorGrad = ctx.createLinearGradient(0, horizon, 0, height);
    floorGrad.addColorStop(0, "#75614b");
    floorGrad.addColorStop(1, "#241e19");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, width, height - horizon);

    const lampX = width * 0.55 + Math.sin(state.time * 0.8) * 18;
    const lampY = horizon * 0.3;
    const lamp = ctx.createRadialGradient(lampX, lampY, 4, lampX, lampY, Math.max(width, height) * 0.48);
    lamp.addColorStop(0, "rgba(255, 206, 128, 0.28)");
    lamp.addColorStop(0.42, "rgba(184, 111, 58, 0.1)");
    lamp.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(43, 27, 18, 0.28)";
    ctx.lineWidth = 4;
    for (let x = -80; x < width + 120; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + width * 0.18, horizon + 14);
      ctx.stroke();
    }

    for (let i = 0; i < 18; i++) {
      const t = i / 18;
      const y = horizon + t * (height - horizon);
      ctx.strokeStyle = `rgba(25, 16, 11, ${0.18 * (1 - t)})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const floorX = width * (0.5 + (t - 0.5) * 1.8);
      ctx.strokeStyle = `rgba(255, 219, 156, ${0.05 + 0.05 * (1 - Math.abs(t - 0.5) * 2)})`;
      ctx.beginPath();
      ctx.moveTo(width * 0.5, horizon);
      ctx.lineTo(floorX, height);
      ctx.stroke();
    }

    return horizon;
  }

  // Cache for gradients to avoid recreation every frame
  let cachedCloudGradient = null;
  let lastCloudOpacity = -1;

  function drawSkyAndGround(width, height, day, visualMood) {
    if (state.player.inHouse) {
      return drawInteriorBackdrop(width, height);
    }

    const weather = state.weather;
    const normalizedDay = clamp(day, 0, 1);
    const horizon = Math.floor(height * 0.5);
    const atmosphere = tsAtmosphere
      ? tsAtmosphere.computeAtmosphere(normalizedDay, weather.rain, weather.fog)
      : null;
    const stormShade = atmosphere ? atmosphere.stormShade : weather.rain * 0.28 + weather.fog * 0.24;
    const skyTop = atmosphere
      ? atmosphere.skyTop
      : {
        r: Math.floor(lerp(9, 109, day) * (1 - stormShade)),
        g: Math.floor(lerp(16, 164, normalizedDay) * (1 - stormShade * 0.9)),
        b: Math.floor(lerp(32, 220, normalizedDay) * (1 - stormShade * 0.7)),
      };
    const skyBottom = atmosphere
      ? atmosphere.skyBottom
      : {
        r: Math.floor(lerp(40, 182, normalizedDay) * (1 - stormShade * 0.9)),
        g: Math.floor(lerp(62, 204, normalizedDay) * (1 - stormShade * 0.82)),
        b: Math.floor(lerp(94, 235, normalizedDay) * (1 - stormShade * 0.65)),
      };

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, `rgb(${skyTop.r}, ${skyTop.g}, ${skyTop.b})`);
    skyGrad.addColorStop(1, `rgb(${skyBottom.r}, ${skyBottom.g}, ${skyBottom.b})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizon);

    if (normalizedDay < 0.35) {
      const starAlpha = clamp((0.35 - normalizedDay) / 0.35, 0, 1) * (1 - weather.rain * 0.75);
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
    const sunR = lerp(30, 56, normalizedDay);
    if (normalizedDay > 0.16) {
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.8);
      sunGrad.addColorStop(0, `rgba(255, 247, 204, ${0.68 * normalizedDay * (1 - weather.rain * 0.7)})`);
      sunGrad.addColorStop(1, "rgba(255, 247, 204, 0)");
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, width, horizon);
      ctx.fillStyle = `rgba(255, 226, 149, ${0.46 * normalizedDay * (1 - weather.rain * 0.75)})`;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 0.34, 0, TAU);
      ctx.fill();
    } else {
      const moonGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.2);
      moonGrad.addColorStop(0, "rgba(220, 234, 255, 0.52)");
      moonGrad.addColorStop(1, "rgba(220, 234, 255, 0)");
      ctx.fillStyle = moonGrad;
      ctx.fillRect(0, 0, width, horizon);
      ctx.fillStyle = `rgba(227, 238, 255, ${0.34 * (1 - weather.rain * 0.6)})`;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 0.28, 0, TAU);
      ctx.fill();
    }

    const cloudCount = 7 + Math.floor(weather.fog * 10);
    const cloudOpacity = 0.12 + normalizedDay * 0.14 + weather.fog * 0.22;

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

    const dustLine = ctx.createLinearGradient(0, horizon - 88, 0, horizon + 22);
    dustLine.addColorStop(0, "rgba(226, 189, 130, 0)");
    dustLine.addColorStop(0.62, `rgba(226, 189, 130, ${0.08 + weather.fog * 0.08 + normalizedDay * 0.05})`);
    dustLine.addColorStop(1, "rgba(226, 189, 130, 0)");
    ctx.fillStyle = dustLine;
    ctx.fillRect(0, horizon - 88, width, 120);

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

    ridge(13, state.time * 0.03, horizon - 52, `rgba(120, 98, 78, ${0.24 + normalizedDay * 0.2 + weather.fog * 0.26})`);
    ridge(18, state.time * 0.04 + 1.4, horizon - 22, `rgba(83, 78, 72, ${0.34 + normalizedDay * 0.18 + weather.fog * 0.24})`);

    ctx.fillStyle = `rgba(45, 73, 50, ${0.32 + normalizedDay * 0.12 + weather.fog * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(0, horizon + 24);
    for (let x = 0; x <= width + 14; x += 14) {
      const treeLine = horizon + 18 + Math.sin(x * 0.02 + state.time * 0.11) * 3;
      const canopy = 7 + ((x / 14) % 3);
      ctx.lineTo(x, treeLine);
      ctx.lineTo(x + 7, treeLine - canopy);
      ctx.lineTo(x + 14, treeLine);
    }
    ctx.lineTo(width, horizon + 38);
    ctx.lineTo(0, horizon + 38);
    ctx.closePath();
    ctx.fill();

    const groundGrad = ctx.createLinearGradient(0, horizon, 0, height);
    groundGrad.addColorStop(
      0,
      `rgb(${Math.floor(lerp(48, 128, normalizedDay) * (1 - weather.rain * 0.18))}, ${Math.floor(lerp(61, 148, normalizedDay) * (1 - weather.rain * 0.22))}, ${Math.floor(
        lerp(50, 96, normalizedDay) * (1 - weather.rain * 0.16),
      )})`,
    );
    groundGrad.addColorStop(
      1,
      `rgb(${Math.floor(lerp(36, 91, normalizedDay) * (1 - weather.rain * 0.14))}, ${Math.floor(lerp(43, 107, normalizedDay) * (1 - weather.rain * 0.18))}, ${Math.floor(
        lerp(34, 68, normalizedDay) * (1 - weather.rain * 0.12),
      )})`,
    );
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizon, width, height - horizon);

    const groundDepth = height - horizon;
    const trailCenter = width * 0.5 + Math.sin(state.player.angle * 1.7) * width * 0.08;
    const trail = ctx.createLinearGradient(0, horizon, 0, height);
    trail.addColorStop(0, `rgba(190, 151, 92, ${0.015 + normalizedDay * 0.02})`);
    trail.addColorStop(1, `rgba(199, 157, 95, ${0.08 + normalizedDay * 0.06})`);
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.moveTo(trailCenter - width * 0.025, horizon + 4);
    ctx.bezierCurveTo(width * 0.38, horizon + groundDepth * 0.36, width * 0.24, height * 0.82, width * 0.12, height + 18);
    ctx.lineTo(width * 0.9, height + 18);
    ctx.bezierCurveTo(width * 0.74, height * 0.82, width * 0.62, horizon + groundDepth * 0.36, trailCenter + width * 0.025, horizon + 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(79, 61, 39, ${0.08 + normalizedDay * 0.04})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const y = horizon + Math.pow(t, 1.45) * groundDepth;
      const spread = lerp(width * 0.04, width * 0.28, t);
      ctx.beginPath();
      ctx.moveTo(trailCenter - spread, y);
      ctx.lineTo(trailCenter + spread, y + 2);
      ctx.stroke();
    }

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

    // Graphics V2: stronger cinematic grade in sky/ground pass.
    if (visualMood) {
      const tint = visualMood.skyTint;
      ctx.fillStyle = `rgba(${tint.r + 40}, ${tint.g + 20}, ${tint.b + 50}, ${Math.min(0.24, visualMood.gradeStrength * 0.46)})`;
      ctx.fillRect(0, 0, width, height);
    }

    return horizon;
  }

  function drawGroundDetails(horizon, width, height, visualMood) {
    if (state.player.inHouse) return;

    const weather = state.weather;
    const depth = height - horizon;
    const tuftCount = Math.floor(width / 7);

    for (let i = 0; i < tuftCount; i++) {
      const t = ((i * 67) % 100) / 100;
      const near = 1 - t;
      const y = horizon + Math.pow(t, 1.35) * depth;
      const x = (i * 53.7) % width;
      const sway = Math.sin(state.time * (1.7 + weather.wind * 2.4) + i * 0.93) * (1.4 + weather.wind * 7.2) * near;
      const length = 2 + near * 12;
      const tint = 55 + near * 55 - weather.rain * 16;
      const moodPush = visualMood ? visualMood.gradeStrength * 28 : 0;
      ctx.strokeStyle = `rgba(${24 + near * 20}, ${tint}, ${30 + near * 18}, ${0.12 + near * 0.3})`;
      if (moodPush > 0) {
        ctx.strokeStyle = `rgba(${28 + near * 24 + moodPush * 0.2}, ${tint + moodPush * 0.35}, ${34 + near * 16 + moodPush * 0.3}, ${0.14 + near * 0.34})`;
      }
      ctx.lineWidth = 0.8 + near * 1.05;
      ctx.beginPath();
      ctx.moveTo(x + sway, y + 1);
      ctx.lineTo(x + sway + weather.wind * 4 * near, y - length);
      ctx.stroke();
    }

    const pebbleCount = Math.floor(width / 11);
    for (let i = 0; i < pebbleCount; i++) {
      const t = ((i * 37) % 100) / 100;
      const near = 1 - t;
      const y = horizon + (0.5 + t * 0.48) * depth;
      const x = (i * 91.3 + 19) % width;
      const size = 0.7 + near * 2.2;
      ctx.fillStyle = `rgba(${78 + near * 22}, ${84 + near * 18}, ${72 + near * 15}, ${0.09 + near * 0.18})`;
      ctx.fillRect(x, y, size, size * 0.72);
    }

    const scrubCount = Math.floor(width / 64);
    for (let i = 0; i < scrubCount; i++) {
      const baseX = (i * 157 + 41) % width;
      const baseY = height - 18 - ((i * 29) % 50);
      const scale = 0.7 + ((i * 17) % 10) / 10;
      ctx.strokeStyle = `rgba(70, 91, 58, ${0.18 + scale * 0.08})`;
      ctx.lineWidth = 1.2;
      for (let branch = 0; branch < 5; branch++) {
        const angle = -Math.PI / 2 + (branch - 2) * 0.38;
        const len = (12 + branch * 3) * scale;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(baseX + Math.cos(angle) * len, baseY + Math.sin(angle) * len);
        ctx.stroke();
      }
    }
  }

  function drawWeatherOverlay(visualMood) {
    if (state.player.inHouse) return;

    const weather = state.weather;
    const dustAlpha = clamp((0.24 + weather.wind * 0.34) * (1 - weather.rain * 0.85), 0, 0.34);
    if (dustAlpha > 0.03) {
      ctx.fillStyle = `rgba(246, 214, 156, ${dustAlpha})`;
      const motes = Math.floor(canvas.width / 18);
      for (let i = 0; i < motes; i++) {
        const x = ((i * 101 + state.time * (18 + weather.wind * 64)) % (canvas.width + 80)) - 40;
        const y = ((i * 67 + Math.sin(state.time * 0.4 + i) * 30) % canvas.height);
        const size = 0.7 + ((i * 13) % 9) * 0.11;
        ctx.globalAlpha = dustAlpha * (0.35 + ((i * 7) % 10) / 20);
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1;
    }

    if (weather.rain > 0.03) {
      const depthBoost = visualMood?.rainDepthStrength || 0;
      const streaks = Math.floor(canvas.width * (0.03 + weather.rain * (0.1 + depthBoost * 0.08)));
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

    if (weather.kind === "sandstorm") {
      const bands = Math.floor(canvas.width / 14);
      for (let i = 0; i < bands; i++) {
        const x = ((i * 37 + state.time * (120 + weather.wind * 80)) % (canvas.width + 120)) - 60;
        const y = ((i * 23 + state.time * 20) % canvas.height);
        const w = 12 + (i % 5) * 4;
        const h = 1 + (i % 3);
        ctx.fillStyle = `rgba(219, 171, 114, ${0.12 + weather.wind * 0.12})`;
        ctx.fillRect(x, y, w, h);
      }
    }

    if (weather.fog > 0.08) {
      const fog = ctx.createLinearGradient(0, 0, 0, canvas.height);
      fog.addColorStop(0, `rgba(229, 221, 202, ${weather.fog * 0.07})`);
      fog.addColorStop(0.55, `rgba(220, 214, 197, ${weather.fog * 0.12})`);
      fog.addColorStop(1, `rgba(198, 180, 150, ${weather.fog * 0.22})`);
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (weather.lightning > 0.01) {
      const flash = clamp(weather.lightning, 0, 1);
      ctx.fillStyle = `rgba(242, 247, 255, ${flash * 0.28})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (visualMood?.weatherHazardTint) {
      const tint = visualMood.weatherHazardTint;
      ctx.fillStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${tint.a})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawBillboardSprite(sprite, left, top, spriteWidth, spriteHeight, lightFactor) {
    ctx.save();
    ctx.translate(left, top);
    const gradientCacheEnabled = isGradientCacheEnabled();
    const sizeKey = `${Math.max(8, Math.round(spriteWidth / 8) * 8)}x${Math.max(8, Math.round(spriteHeight / 8) * 8)}`;
    const distNorm = clamp(numberOr(sprite.distToPlayer, MAX_RAY_DIST) / MAX_RAY_DIST, 0, 0.999);
    const distBand = Math.max(0, Math.min(7, Math.floor(distNorm * 8)));

    const cbPalSprite = latestColorblindPalette;
    const enemyGlow = cbPalSprite ? hexToRgba(cbPalSprite.foe, 0.38) : "rgba(112, 246, 126, 0.38)";
    const npcGlow = cbPalSprite ? hexToRgba(cbPalSprite.friend, 0.32) : "rgba(255, 220, 163, 0.16)";
    const glowColor =
      sprite.kind === "enemy" ? enemyGlow :
        sprite.kind === "npc" ? npcGlow :
          sprite.kind === "resource" && sprite.label === "Crystal" ? "rgba(124, 205, 255, 0.35)" :
            sprite.kind === "resource" && sprite.label === "Archive" ? "rgba(218, 108, 255, 0.34)" :
              "rgba(255, 220, 163, 0.16)";
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = sprite.kind === "enemy" || sprite.label === "Crystal" || sprite.label === "Archive" ? 14 : 6;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.24 * lightFactor})`;
    ctx.beginPath();
    ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.94, spriteWidth * 0.42, spriteHeight * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.shadowOffsetY = 0;

    if (sprite.kind === "npc") {
      const robe = getCachedGradient(
        `sprite-npc-robe|${sizeKey}|${sprite.color}`,
        () => {
          const g = ctx.createLinearGradient(0, 0, 0, spriteHeight);
          g.addColorStop(0, shadeHex(sprite.color, 1.2));
          g.addColorStop(1, shadeHex(sprite.color, 0.55));
          return g;
        },
        gradientCacheEnabled,
      );
      ctx.fillStyle = robe;
      ctx.strokeStyle = "rgba(21, 18, 16, 0.34)";
      ctx.lineWidth = Math.max(1, spriteWidth * 0.025);
      ctx.fillRect(spriteWidth * 0.3, spriteHeight * 0.3, spriteWidth * 0.4, spriteHeight * 0.62);
      ctx.strokeRect(spriteWidth * 0.3, spriteHeight * 0.3, spriteWidth * 0.4, spriteHeight * 0.62);
      ctx.fillStyle = "rgba(30, 23, 18, 0.24)";
      ctx.fillRect(spriteWidth * 0.36, spriteHeight * 0.58, spriteWidth * 0.28, spriteHeight * 0.04);
      ctx.fillStyle = "#e0c0a7";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.2, Math.max(3, spriteWidth * 0.14), 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#4e3428";
      ctx.fillRect(spriteWidth * 0.38, spriteHeight * 0.08, spriteWidth * 0.24, spriteHeight * 0.06);
      ctx.fillStyle = "rgba(42, 30, 24, 0.72)";
      ctx.fillRect(spriteWidth * 0.43, spriteHeight * 0.18, spriteWidth * 0.035, spriteHeight * 0.025);
      ctx.fillRect(spriteWidth * 0.55, spriteHeight * 0.18, spriteWidth * 0.035, spriteHeight * 0.025);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(spriteWidth * 0.35, spriteHeight * 0.34, spriteWidth * 0.06, spriteHeight * 0.35);
    } else if (sprite.kind === "enemy") {
      const enemyBase = sprite.color || "#6be873";
      const enemyTypeKey = sprite.enemyType || "slime";
      const slime = getCachedGradient(
        `sprite-enemy-core|${enemyTypeKey}|band${distBand}|${sizeKey}|${enemyBase}`,
        () => {
          const g = ctx.createRadialGradient(spriteWidth * 0.45, spriteHeight * 0.34, 2, spriteWidth * 0.45, spriteHeight * 0.52, spriteHeight * 0.5);
          g.addColorStop(0, shadeHex(enemyBase, 1.72));
          g.addColorStop(0.58, enemyBase);
          g.addColorStop(1, shadeHex(enemyBase, 0.5));
          return g;
        },
        gradientCacheEnabled,
      );
      ctx.fillStyle = slime;
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.14, spriteHeight * 0.84);
      ctx.quadraticCurveTo(spriteWidth * 0.07, spriteHeight * 0.45, spriteWidth * 0.33, spriteHeight * 0.2);
      ctx.quadraticCurveTo(spriteWidth * 0.5, spriteHeight * 0.08, spriteWidth * 0.67, spriteHeight * 0.2);
      ctx.quadraticCurveTo(spriteWidth * 0.93, spriteHeight * 0.45, spriteWidth * 0.86, spriteHeight * 0.84);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(10, 32, 20, 0.42)";
      ctx.lineWidth = Math.max(1, spriteWidth * 0.028);
      ctx.stroke();
      ctx.fillStyle = shadeHex(enemyBase, 0.32);
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.43, spriteWidth * 0.08, spriteHeight * 0.06);
      ctx.fillRect(spriteWidth * 0.58, spriteHeight * 0.43, spriteWidth * 0.08, spriteHeight * 0.06);
      ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.38, spriteHeight * 0.33, spriteWidth * 0.06, 0, TAU);
      ctx.fill();
    } else if (sprite.kind === "pig") {
      const hatColor = sprite.hatColor || "#5b4129";
      const bandanaColor = sprite.bandanaColor || "#8e4040";
      const trot = Math.sin((sprite.gaitPhase || 0) + state.time * 1.4) * 0.5 + 0.5;
      const body = getCachedGradient(
        `sprite-pig-body|${sizeKey}`,
        () => {
          const g = ctx.createLinearGradient(0, spriteHeight * 0.26, 0, spriteHeight * 0.9);
          g.addColorStop(0, "#efb8b2");
          g.addColorStop(1, "#d58f8a");
          return g;
        },
        gradientCacheEnabled,
      );
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.62, spriteWidth * 0.32, spriteHeight * 0.24, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(80, 48, 48, 0.32)";
      ctx.lineWidth = Math.max(1, spriteWidth * 0.025);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.38, spriteWidth * 0.24, spriteHeight * 0.18, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = bandanaColor;
      ctx.fillRect(spriteWidth * 0.38, spriteHeight * 0.5, spriteWidth * 0.24, spriteHeight * 0.05);
      ctx.fillStyle = "#f3cbc6";
      ctx.beginPath();
      ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.45, spriteWidth * 0.16, spriteHeight * 0.1, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#7a4f50";
      ctx.fillRect(spriteWidth * 0.45, spriteHeight * 0.43, spriteWidth * 0.03, spriteHeight * 0.04);
      ctx.fillRect(spriteWidth * 0.53, spriteHeight * 0.43, spriteWidth * 0.03, spriteHeight * 0.04);
      ctx.fillStyle = "#432f35";
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.37, spriteWidth * 0.06, spriteHeight * 0.03);
      ctx.fillRect(spriteWidth * 0.6, spriteHeight * 0.37, spriteWidth * 0.06, spriteHeight * 0.03);
      ctx.fillStyle = "#d18986";
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.32, spriteHeight * 0.28);
      ctx.lineTo(spriteWidth * 0.39, spriteHeight * 0.2);
      ctx.lineTo(spriteWidth * 0.41, spriteHeight * 0.33);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.68, spriteHeight * 0.28);
      ctx.lineTo(spriteWidth * 0.61, spriteHeight * 0.2);
      ctx.lineTo(spriteWidth * 0.59, spriteHeight * 0.33);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#c97574";
      ctx.lineWidth = Math.max(1, spriteWidth * 0.03);
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.75, spriteHeight * 0.62, spriteWidth * 0.08, 0, TAU * 0.8);
      ctx.stroke();
      ctx.fillStyle = hatColor;
      ctx.fillRect(spriteWidth * 0.28, spriteHeight * 0.23, spriteWidth * 0.44, spriteHeight * 0.04);
      ctx.fillRect(spriteWidth * 0.36, spriteHeight * 0.14, spriteWidth * 0.28, spriteHeight * 0.09);
      if (sprite.role === "Sheriff") {
        ctx.fillStyle = "#d8b754";
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.18);
        ctx.lineTo(spriteWidth * 0.53, spriteHeight * 0.24);
        ctx.lineTo(spriteWidth * 0.6, spriteHeight * 0.24);
        ctx.lineTo(spriteWidth * 0.54, spriteHeight * 0.28);
        ctx.lineTo(spriteWidth * 0.56, spriteHeight * 0.35);
        ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.3);
        ctx.lineTo(spriteWidth * 0.44, spriteHeight * 0.35);
        ctx.lineTo(spriteWidth * 0.46, spriteHeight * 0.28);
        ctx.lineTo(spriteWidth * 0.4, spriteHeight * 0.24);
        ctx.lineTo(spriteWidth * 0.47, spriteHeight * 0.24);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#8f6663";
      const legLift = trot * spriteHeight * 0.025;
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.78 - legLift, spriteWidth * 0.06, spriteHeight * 0.12 + legLift);
      ctx.fillRect(spriteWidth * 0.43, spriteHeight * 0.8 + legLift * 0.3, spriteWidth * 0.06, spriteHeight * 0.1 - legLift * 0.3);
      ctx.fillRect(spriteWidth * 0.54, spriteHeight * 0.78 + legLift * 0.2, spriteWidth * 0.06, spriteHeight * 0.12 - legLift * 0.2);
      ctx.fillRect(spriteWidth * 0.63, spriteHeight * 0.8 - legLift * 0.4, spriteWidth * 0.06, spriteHeight * 0.1 + legLift * 0.4);
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
      const wood = getCachedGradient(
        `sprite-chest-wood|${sizeKey}`,
        () => {
          const g = ctx.createLinearGradient(0, 0, 0, spriteHeight);
          g.addColorStop(0, "#bc8b55");
          g.addColorStop(1, "#6c4b30");
          return g;
        },
        gradientCacheEnabled,
      );
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

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.18 * (1 - lightFactor + 0.24)})`;
    ctx.fillRect(0, 0, spriteWidth, spriteHeight);
    if (sprite.flashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${clamp(sprite.flashTimer / 0.1, 0, 1) * 0.72})`;
      ctx.fillRect(0, 0, spriteWidth, spriteHeight);
    }
    ctx.restore();
  }

  function drawWeaponOverlay() {
    if (state.mode !== "playing") return;

    const p = state.player;
    const idleBob = Math.sin(p.walkBob * 2.1) * 4;
    const swingT = p.swingTimer > 0 ? 1 - p.swingTimer / p.swingDuration : 0;
    const eased = easeOutCubic(swingT);

    let x = canvas.width * 0.74 + idleBob + p.weaponSway;
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
    const weaponScale = p.blocking ? 0.86 : 0.8;
    ctx.scale(weaponScale, weaponScale);

    if (p.swingTimer > 0) {
      ctx.strokeStyle = "rgba(229, 241, 255, 0.42)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(22, -124);
      ctx.lineTo(25, -20);
      ctx.stroke();
      ctx.lineWidth = 2;
    }

    const blade = ctx.createLinearGradient(0, -142, 0, 34);
    blade.addColorStop(0, "#ffffff");
    blade.addColorStop(0.35, "#e9f1f7");
    blade.addColorStop(1, "#8298ad");
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(17, -132);
    ctx.lineTo(33, -132);
    ctx.lineTo(31, 11);
    ctx.lineTo(19, 11);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.44)";
    ctx.fillRect(20, -126, 3, 125);

    ctx.fillStyle = "#637c95";
    ctx.beginPath();
    ctx.moveTo(7, 12);
    ctx.lineTo(44, 12);
    ctx.lineTo(40, 22);
    ctx.lineTo(11, 22);
    ctx.closePath();
    ctx.fill();

    const grip = ctx.createLinearGradient(17, 20, 33, 78);
    grip.addColorStop(0, "#845839");
    grip.addColorStop(1, "#5b3a24");
    ctx.fillStyle = grip;
    ctx.fillRect(19, 20, 12, 56);

    ctx.fillStyle = "#cba377";
    ctx.fillRect(17, 76, 16, 6);

    for (let wrap = 0; wrap < 6; wrap++) {
      const yWrap = 23 + wrap * 9;
      ctx.fillStyle = wrap % 2 === 0 ? "rgba(35, 24, 18, 0.32)" : "rgba(229, 210, 174, 0.18)";
      ctx.fillRect(19, yWrap, 12, 3);
    }

    const lowerSleeve = ctx.createLinearGradient(-8, 84, 58, 126);
    lowerSleeve.addColorStop(0, "#415975");
    lowerSleeve.addColorStop(1, "#22354e");
    ctx.fillStyle = lowerSleeve;
    ctx.beginPath();
    ctx.moveTo(-2, 85);
    ctx.lineTo(48, 83);
    ctx.lineTo(61, 118);
    ctx.lineTo(-12, 121);
    ctx.closePath();
    ctx.fill();

    const rearPalm = ctx.createLinearGradient(6, 58, 42, 94);
    rearPalm.addColorStop(0, "#e2bfa7");
    rearPalm.addColorStop(1, "#c69378");
    ctx.fillStyle = rearPalm;
    ctx.beginPath();
    ctx.moveTo(6, 58);
    ctx.lineTo(36, 56);
    ctx.lineTo(42, 84);
    ctx.lineTo(10, 92);
    ctx.closePath();
    ctx.fill();

    for (let finger = 0; finger < 4; finger++) {
      const fx = 8 + finger * 6;
      ctx.fillStyle = finger % 2 === 0 ? "#dbb69d" : "#cfaa91";
      ctx.fillRect(fx, 53, 5, 19);
      ctx.fillStyle = "rgba(96, 60, 43, 0.24)";
      ctx.fillRect(fx, 65, 5, 2);
    }
    ctx.fillStyle = "#c68f76";
    ctx.beginPath();
    ctx.moveTo(34, 62);
    ctx.lineTo(43, 68);
    ctx.lineTo(37, 77);
    ctx.lineTo(30, 71);
    ctx.closePath();
    ctx.fill();

    const upperSleeve = ctx.createLinearGradient(18, 26, 65, 60);
    upperSleeve.addColorStop(0, "#3b516b");
    upperSleeve.addColorStop(1, "#1e2f46");
    ctx.fillStyle = upperSleeve;
    ctx.beginPath();
    ctx.moveTo(29, 30);
    ctx.lineTo(58, 36);
    ctx.lineTo(63, 62);
    ctx.lineTo(35, 58);
    ctx.closePath();
    ctx.fill();

    const frontPalm = ctx.createLinearGradient(24, 27, 47, 54);
    frontPalm.addColorStop(0, "#e3c3ad");
    frontPalm.addColorStop(1, "#cb9c84");
    ctx.fillStyle = frontPalm;
    ctx.beginPath();
    ctx.moveTo(24, 30);
    ctx.lineTo(43, 34);
    ctx.lineTo(45, 54);
    ctx.lineTo(29, 54);
    ctx.closePath();
    ctx.fill();

    for (let finger = 0; finger < 3; finger++) {
      const fy = 32 + finger * 6;
      ctx.fillStyle = finger % 2 === 0 ? "#dcb8a0" : "#cda58e";
      ctx.fillRect(22, fy, 11, 4);
    }
    ctx.fillStyle = "#c89177";
    ctx.beginPath();
    ctx.moveTo(42, 41);
    ctx.lineTo(49, 46);
    ctx.lineTo(44, 54);
    ctx.lineTo(37, 50);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function render3D() {
    const width = canvas.width;
    const height = canvas.height;
    const dayForMood = 0.5 + Math.sin(state.time * 0.014) * 0.45;
    const visualMoodBase = buildVisualMood({
      weather: state.weather,
      chapterIndex: state.narrative.chapterIndex,
      day: dayForMood,
      qualitySetting: state.weather.quality,
      biome: state.regions.activeRegion,
    });
    const visualMood = applyGraphicsAccessibility(visualMoodBase, state.graphics.accessibility);
    latestParticleMultiplier = clamp(numberOr(visualMood.particleMultiplier, 1), 0, 1);
    latestColorblindPalette = getColorblindPalette(visualMood.colorblindMode);
    const gradientCacheEnabled = isGradientCacheEnabled();
    const cameraShakeStrength = clamp(visualMood.cameraShake ?? 1, 0, 1.5);

    const baseHorizon = drawSkyAndGround(width, height, dayForMood, visualMood);
    const bobOffset = Math.sin(state.player.walkBob * 2.2) * (state.player.inHouse ? 1.2 : 2.2);
    const hitJitter = Math.sin(state.time * 120) * state.player.hitPulse * 5;
    const shakeAmt = state.player.screenShake * cameraShakeStrength;
    const shakeX = shakeAmt > 0 ? Math.sin(state.time * 89 + 1.2) * shakeAmt * 14 : 0;
    const shakeY = shakeAmt > 0 ? Math.cos(state.time * 73) * shakeAmt * 9 : 0;
    const horizon = clamp(baseHorizon + bobOffset + hitJitter + shakeY, height * 0.38, height * 0.66);
    drawGroundDetails(horizon, width, height, visualMood);

    const depth = new Float32Array(width);
    ctx.imageSmoothingEnabled = false;

    for (let x = 0; x < width; x++) {
      const rayAngle = state.player.angle - FOV / 2 + (x / width) * FOV;
      const hit = castRay(rayAngle);
      const correctedDist = Math.max(0.0001, hit.dist * Math.cos(rayAngle - state.player.angle));
      depth[x] = correctedDist;
      const projectedDist = Math.max(correctedDist, WALL_RENDER_NEAR_CLIP);

      const wallScale = state.player.inHouse ? 1.07 : 0.94;
      const wallHeightCap = height * (state.player.inHouse ? 0.74 : 0.62);
      const wallHeight = Math.min(wallHeightCap, (height * wallScale) / projectedDist);
      const y = Math.floor(horizon - wallHeight * 0.64);

      let tex = textures.stone;
      if (hit.tileType === 2) tex = textures.water;
      if (hit.tileType === 3) tex = textures.timber;
      if (hit.tileType === 4) tex = textures.plaster;
      if (hit.tileType === 5) tex = textures.neon;

      let texX = Math.floor(hit.wallX * (TEXTURE_SIZE - 1));
      if (!Number.isFinite(texX)) texX = 0;
      if ((hit.side === 0 && Math.cos(rayAngle) > 0) || (hit.side === 1 && Math.sin(rayAngle) < 0)) {
        texX = TEXTURE_SIZE - 1 - texX;
      }
      texX = clamp(texX, 0, TEXTURE_SIZE - 1);

      ctx.drawImage(tex, texX, 0, 1, TEXTURE_SIZE, x, y, 1, wallHeight);

      const shade = clamp(1.24 - projectedDist / (MAX_RAY_DIST * 0.86) - (hit.side === 1 ? 0.14 : 0), 0.2, 1);
      const contrastPass = (state.player.inHouse ? 0.74 : 0.94) * clamp(visualMood.contrastBoost || 1, 0.9, 1.4);
      ctx.fillStyle = `rgba(8, 12, 18, ${(1 - shade) * contrastPass * (1 + visualMood.gradeStrength * 0.22)})`;
      ctx.fillRect(x, y, 1, wallHeight);
      const baseShadow = clamp((projectedDist / MAX_RAY_DIST) * 0.5 + 0.06, 0.08, 0.56);
      ctx.fillStyle = `rgba(9, 14, 18, ${baseShadow})`;
      ctx.fillRect(x, y + wallHeight * 0.82, 1, wallHeight * 0.18);

      if (hit.tileType === 2 && !state.player.inHouse) {
        const shimmer = (Math.sin(state.time * 3.2 + x * 0.07) * 0.5 + 0.5) * 0.2 * (1 + visualMood.shimmerStrength);
        ctx.fillStyle = `rgba(126, 188, 226, ${shimmer * 0.4})`;
        ctx.fillRect(x, y, 1, wallHeight);
      }

      if (!state.player.inHouse) {
        const fog = clamp((projectedDist - 5) / (MAX_RAY_DIST - 5), 0, 1);
        if (fog > 0) {
          const tint = visualMood.skyTint;
          ctx.fillStyle = `rgba(${tint.r + 100}, ${tint.g + 112}, ${tint.b + 120}, ${fog * (0.28 + visualMood.fogStrength)})`;
          ctx.fillRect(x, y, 1, wallHeight);
        }
      }
    }
    ctx.imageSmoothingEnabled = true;

    const sprites = [];

    if (state.player.inHouse) {
      sprites.push({ x: state.house.bed.x, y: state.house.bed.y, color: "#7f4a43", label: "Bed", size: 0.95, kind: "bed" });
      sprites.push({ x: state.house.stash.x, y: state.house.stash.y, color: "#896748", label: "Stash", size: 0.9, kind: "stash" });
      sprites.push({ x: state.house.interiorDoor.x, y: state.house.interiorDoor.y, color: "#6d5a45", label: "Exit", size: 0.95, kind: "exit-door" });
    } else {
      for (const npc of state.npcs) {
        sprites.push({ x: npc.x, y: npc.y, color: npc.color, label: npc.name, size: 1.04, kind: "npc" });
      }

      for (const pig of state.pigs) {
        sprites.push({
          x: pig.x,
          y: pig.y,
          color: "#e29da0",
          label: pig.name,
          size: 0.92,
          kind: "pig",
          role: pig.role,
          hatColor: pig.hatColor,
          bandanaColor: pig.bandanaColor,
          gaitPhase: pig.gaitPhase,
          heading: pig.heading,
        });
      }

      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        sprites.push({
          x: enemy.x,
          y: enemy.y,
          color: enemy.color || "#6be873",
          label: enemy.label || "Slime",
          enemyType: enemy.type,
          size: enemy.type === "brute" ? 1.18 : enemy.type === "spitter" ? 0.86 : 1.0,
          kind: "enemy",
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          flashTimer: enemy.flashTimer,
        });
      }

      for (const resource of state.resources) {
        if (resource.harvested) continue;
        if (resource.type === "crystal") {
          sprites.push({ x: resource.x, y: resource.y, color: "#8dc4ff", label: "Crystal", size: 0.62, kind: "resource" });
        } else if (resource.type === "archive-node") {
          sprites.push({ x: resource.x, y: resource.y, color: "#d96cff", label: "Archive", size: 0.78, kind: "resource" });
        } else if (resource.type === "rock") {
          sprites.push({ x: resource.x, y: resource.y, color: "#8f969f", label: "Stone", size: 0.72, kind: "resource" });
        } else if (resource.type === "ashglass") {
          sprites.push({ x: resource.x, y: resource.y, color: "#e2a36b", label: "Ashglass", size: 0.6, kind: "resource" });
        } else if (resource.type === "scrap-coil") {
          sprites.push({ x: resource.x, y: resource.y, color: "#b89060", label: "Scrap Coil", size: 0.66, kind: "resource" });
        } else if (resource.type === "heat-resin") {
          sprites.push({ x: resource.x, y: resource.y, color: "#ff8a4c", label: "Heat Resin", size: 0.58, kind: "resource" });
        } else if (resource.type === "lantern-filament") {
          sprites.push({ x: resource.x, y: resource.y, color: "#9bd3ff", label: "Filament", size: 0.6, kind: "resource" });
        } else if (resource.type === "cipher-lens") {
          sprites.push({ x: resource.x, y: resource.y, color: "#c8a8ff", label: "Cipher Lens", size: 0.62, kind: "resource" });
        } else if (resource.type === "pressurized-ink") {
          sprites.push({ x: resource.x, y: resource.y, color: "#7e8cff", label: "Pressure Ink", size: 0.62, kind: "resource" });
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
      const widthScale = sprite.kind === "resource" && sprite.label === "Tree" ? 0.82 : sprite.kind === "pig" ? 0.72 : 0.62;
      const nearDampen = clamp((sprite.distToPlayer - 0.35) / 1.7, 0.52, 1);
      const visualScale = sprite.scale * nearDampen;
      const maxHeight =
        sprite.kind === "npc" ? height * 0.56 :
          sprite.kind === "pig" ? height * 0.42 :
            sprite.kind === "enemy" ? height * 0.5 : height * 0.7;
      const spriteWidth = clamp(visualScale * widthScale, 6, width * 0.34);
      const spriteHeight = clamp(visualScale, 8, maxHeight);
      const left = Math.floor(sprite.sx - spriteWidth / 2 + shakeX);
      const top = Math.floor(horizon - spriteHeight * 0.67);

      const depthIdx = Math.min(Math.floor(sprite.sx), width - 1);
      if (sprite.sx >= 0 && sprite.sx < width && sprite.distToPlayer > depth[depthIdx] + 0.08) continue;

      const light = clamp(1 - sprite.distToPlayer / MAX_RAY_DIST + visualMood.dynamicLightStrength * 0.08, 0.25, 1.1);
      drawBillboardSprite(sprite, left, top, spriteWidth, spriteHeight, light);

      if (sprite.kind === "enemy") {
        if (visualMood.silhouetteStrength > 0.05) {
          ctx.strokeStyle = `rgba(255, 238, 192, ${0.18 + visualMood.silhouetteStrength * 0.35})`;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(left - 1, top - 1, spriteWidth + 2, spriteHeight + 2);
        }
        const hpRatio = clamp(sprite.hp / sprite.maxHp, 0, 1);
        const barW = spriteWidth;
        const barY = top - 6;
        fillRoundedRect(left, barY, barW, 5, 2, "rgba(22, 8, 8, 0.82)");
        fillRoundedRect(left, barY, barW * hpRatio, 5, 2, "#92f0a3");
      }

      const centeredLabel = Math.abs(sprite.sx - width / 2) < width * 0.24;
      if (state.mode === "playing" && sprite.label && centeredLabel && sprite.distToPlayer < 5.8 && sprite.kind !== "resource" && sprite.kind !== "pig") {
        ctx.font = "bold 11px Georgia";
        drawPillLabel(fitText(sprite.label, 116), left + spriteWidth / 2, top - 10);
      }
    }

    if (state.floatingTexts.length > 0) {
      const MAX_RAY_DIST_SQ_FT = MAX_RAY_DIST * MAX_RAY_DIST;
      ctx.save();
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 5;
      for (const ft of state.floatingTexts) {
        const ftDx = ft.wx - state.player.x;
        const ftDy = ft.wy - state.player.y;
        const ftDistSq = ftDx * ftDx + ftDy * ftDy;
        if (ftDistSq < 0.04 || ftDistSq > MAX_RAY_DIST_SQ_FT) continue;
        const ftAng = normalizeAngle(Math.atan2(ftDy, ftDx) - state.player.angle);
        if (Math.abs(ftAng) > FOV * 0.6) continue;
        const ftD = Math.sqrt(ftDistSq);
        const ftSx = ((ftAng + FOV / 2) / FOV) * width + shakeX;
        const rise = (1 - ft.life / ft.maxLife) * 40;
        const ftSy = horizon - (height / (ftD + 0.01)) * 0.44 - rise;
        const ftDepthIdx = clamp(Math.floor(ftSx), 0, width - 1);
        if (ftD > depth[ftDepthIdx] + 0.3) continue;
        const alpha = Math.min(1, ft.life / ft.maxLife * 2.5);
        const fontSize = clamp(height / (ftD + 0.01) * 0.2, 11, 26);
        ctx.font = `bold ${fontSize}px Georgia`;
        ctx.globalAlpha = alpha;
        let ftColor = ft.color;
        if (latestColorblindPalette) {
          if (ft.text === "SLAIN" || ft.text.startsWith("-")) ftColor = latestColorblindPalette.foe;
          else if (ft.text.startsWith("+")) ftColor = latestColorblindPalette.friend;
          else ftColor = latestColorblindPalette.neutral;
        }
        ctx.fillStyle = ftColor;
        ctx.fillText(ft.text, ftSx, ftSy);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (state.mode !== "menu") {
      const crossSize = state.player.blocking ? 6 : 4;
      const hitMarkerStrength = clamp(visualMood.hitMarkerStrength ?? 1, 0.4, 2);
      const crossColor = state.player.hitPulse > 0
        ? `rgba(255, 186, 159, ${clamp(0.56 + hitMarkerStrength * 0.22, 0.55, 1)})`
        : "rgba(255, 244, 218, 0.92)";
      const cx = width / 2;
      const cy = height / 2;
      ctx.save();
      ctx.shadowColor = "rgba(255, 219, 156, 0.32)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = crossColor;
      ctx.lineWidth = 1.2 + hitMarkerStrength * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx - crossSize - 7, cy);
      ctx.lineTo(cx - crossSize, cy);
      ctx.moveTo(cx + crossSize, cy);
      ctx.lineTo(cx + crossSize + 7, cy);
      ctx.moveTo(cx, cy - crossSize - 7);
      ctx.lineTo(cx, cy - crossSize);
      ctx.moveTo(cx, cy + crossSize);
      ctx.lineTo(cx, cy + crossSize + 7);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, state.player.blocking ? 13 : 8, 0, TAU);
      ctx.strokeStyle = state.player.blocking ? "rgba(126, 220, 255, 0.58)" : "rgba(255, 255, 255, 0.26)";
      ctx.stroke();

      if (state.player.comboWindow > 0) {
        const pipColors = ["#ffe84e", "#ff9f3a", "#ff5555"];
        const pipR = 4;
        const pipSpacing = 11;
        const totalW = 3 * pipSpacing - (pipSpacing - pipR * 2);
        let px = cx - totalW / 2 + pipR;
        for (let i = 0; i < 3; i++) {
          const filled = i < state.player.comboStep;
          ctx.beginPath();
          ctx.arc(px, cy + 22, pipR, 0, TAU);
          ctx.fillStyle = filled ? pipColors[state.player.comboStep - 1] : "rgba(255,255,255,0.18)";
          ctx.shadowColor = filled ? pipColors[state.player.comboStep - 1] : "transparent";
          ctx.shadowBlur = filled ? 8 : 0;
          ctx.fill();
          px += pipSpacing;
        }
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      if (state.player.hitPulse > 0) {
        const flash = ctx.createRadialGradient(width / 2, height / 2, 8, width / 2, height / 2, 120);
        flash.addColorStop(0, `rgba(255, 132, 132, ${state.player.hitPulse * (0.18 + hitMarkerStrength * 0.16)})`);
        flash.addColorStop(1, "rgba(255,132,132,0)");
        ctx.fillStyle = flash;
        ctx.fillRect(0, 0, width, height);
      }

      if (state.player.hurtCooldown > 0) {
        const hurtT = clamp(state.player.hurtCooldown / 0.33, 0, 1);
        const hurtBucket = gradientBucket(hurtT, 12);
        const hurtVig = getCachedGradient(
          `hurt-vig|${width}|${height}|${hurtBucket}`,
          () => {
            const g = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.14, width * 0.5, height * 0.5, width * 0.72);
            g.addColorStop(0, `rgba(190, 0, 0, ${hurtBucket * 0.06})`);
            g.addColorStop(0.55, `rgba(210, 0, 0, ${hurtBucket * 0.1})`);
            g.addColorStop(1, `rgba(230, 10, 10, ${hurtBucket * 0.58})`);
            return g;
          },
          gradientCacheEnabled,
        );
        ctx.fillStyle = hurtVig;
        ctx.fillRect(0, 0, width, height);
      }
    }

    const bloomAlpha = clamp(0.12 + visualMood.bloomStrength * 0.22, 0, 1);
    const bloomBucket = gradientBucket(bloomAlpha, 12);
    const bloom = getCachedGradient(
      `bloom|${width}|${height}|${bloomBucket}`,
      () => {
        const g = ctx.createRadialGradient(width * 0.5, height * 0.46, width * 0.06, width * 0.5, height * 0.46, width * 0.62);
        g.addColorStop(0, `rgba(255, 240, 218, ${bloomBucket})`);
        g.addColorStop(1, "rgba(255, 240, 218, 0)");
        return g;
      },
      gradientCacheEnabled,
    );
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);

    const grade = visualMood.skyTint;
    ctx.fillStyle = `rgba(${grade.r + 28}, ${grade.g + 16}, ${grade.b + 30}, ${visualMood.gradeStrength * 0.2})`;
    ctx.fillRect(0, 0, width, height);

    if (visualMood.factionCueStrength > 0.12 && !state.player.inHouse) {
      ctx.fillStyle = `rgba(122, 188, 255, ${Math.min(0.18, visualMood.factionCueStrength * 0.28)})`;
      ctx.fillRect(width * 0.18, height * 0.1, width * 0.12, height * 0.008);
      ctx.fillStyle = `rgba(255, 158, 122, ${Math.min(0.18, visualMood.factionCueStrength * 0.28)})`;
      ctx.fillRect(width * 0.7, height * 0.12, width * 0.12, height * 0.008);
    }

    const vignetteAlpha = clamp(Math.min(0.62, visualMood.vignetteStrength), 0, 1);
    const vignetteBucket = gradientBucket(vignetteAlpha, 12);
    const vignette = getCachedGradient(
      `vignette|${width}|${height}|${vignetteBucket}`,
      () => {
        const g = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.12, width * 0.5, height * 0.5, width * 0.68);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, `rgba(0,0,0,${vignetteBucket})`);
        return g;
      },
      gradientCacheEnabled,
    );
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const grainAlpha = 0.025 + visualMood.gradeStrength * 0.025;
    ctx.fillStyle = `rgba(255, 244, 218, ${grainAlpha})`;
    const grainStep = width > 900 ? 14 : 18;
    const grainTick = Math.floor(state.time * 8);
    for (let y = 0; y < height; y += grainStep) {
      for (let x = (y + grainTick) % grainStep; x < width; x += grainStep * 2) {
        if (((x * 17 + y * 31 + grainTick * 13) % 7) < 3) ctx.fillRect(x, y, 1, 1);
      }
    }

    if (state.player.hp / state.player.maxHp < 0.32) {
      const danger = 1 - state.player.hp / (state.player.maxHp * 0.32);
      const dangerBucket = gradientBucket(danger, 12);
      const hurt = getCachedGradient(
        `lowhp-hurt|${width}|${height}|${dangerBucket}`,
        () => {
          const g = ctx.createRadialGradient(width * 0.5, height * 0.48, width * 0.25, width * 0.5, height * 0.48, width * 0.72);
          g.addColorStop(0, "rgba(90, 0, 0, 0)");
          g.addColorStop(1, `rgba(143, 24, 18, ${0.22 * dangerBucket})`);
          return g;
        },
        gradientCacheEnabled,
      );
      ctx.fillStyle = hurt;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawBar(x, y, w, h, ratio, bg, fg, label) {
    fillRoundedRect(x, y, w, h, Math.min(6, h / 2), bg);
    const safeRatio = clamp(ratio, 0, 1);
    if (safeRatio > 0) {
      const fillW = Math.max(h * 0.35, w * safeRatio);
      fillRoundedRect(x, y, fillW, h, Math.min(6, h / 2), fg);
    }
    const shine = ctx.createLinearGradient(x, y, x, y + h);
    shine.addColorStop(0, "rgba(255, 255, 255, 0.28)");
    shine.addColorStop(0.45, "rgba(255, 255, 255, 0.05)");
    shine.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    fillRoundedRect(x, y, w, h, Math.min(6, h / 2), shine);
    strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, Math.min(6, h / 2), "rgba(255, 245, 216, 0.18)", 1);
    ctx.fillStyle = "#fff4d8";
    ctx.font = "bold 11px Georgia";
    ctx.fillText(fitText(label, w - 12), x + 6, y + h - 4);
  }

  function drawMiniMap() {
    if (!state.showMap) return;

    const map = currentMap();
    const tileRadius = state.player.inHouse ? 5 : 6;
    const cells = tileRadius * 2;
    const mapDiameter = canvas.width < 620 ? 116 : canvas.width < 900 ? 138 : 164;
    const mapRadius = mapDiameter / 2;
    const cell = mapDiameter / cells;
    const mapPad = canvas.width < 620 ? 10 : 16;
    const cx = canvas.width - mapRadius - mapPad;
    const cy = mapRadius + mapPad;

    ctx.save();

    // Outer shadow disc
    ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "rgba(4, 10, 14, 0.58)";
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 2, mapRadius + 6, 0, TAU);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Dark background disc
    ctx.fillStyle = "rgba(8, 18, 20, 0.78)";
    ctx.beginPath();
    ctx.arc(cx, cy, mapRadius + 4, 0, TAU);
    ctx.fill();

    // Clip to circle for terrain
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, mapRadius, 0, TAU);
    ctx.clip();

    const px = Math.floor(state.player.x);
    const py = Math.floor(state.player.y);
    const originX = cx - mapRadius;
    const originY = cy - mapRadius;

    for (let my = 0; my < cells; my++) {
      for (let mx = 0; mx < cells; mx++) {
        const wx = px - tileRadius + mx;
        const wy = py - tileRadius + my;
        const tile = map[wy]?.[wx] ?? 1;

        let color = state.player.inHouse ? "#6f6253" : "#5a915c";
        if (tile === 1) color = "#8d745a";
        if (tile === 2) color = "#548eb2";
        if (tile === 3) color = "#7a5a3a";
        if (tile === 4) color = "#ada08e";
        if (tile === 5) color = "#5f6fa3";

        ctx.fillStyle = color;
        ctx.fillRect(originX + mx * cell, originY + my * cell, cell + 0.5, cell + 0.5);
      }
    }

    // Radial fog at edges
    const edgeFog = ctx.createRadialGradient(cx, cy, mapRadius * 0.55, cx, cy, mapRadius);
    edgeFog.addColorStop(0, "rgba(8, 18, 20, 0)");
    edgeFog.addColorStop(1, "rgba(8, 18, 20, 0.6)");
    ctx.fillStyle = edgeFog;
    ctx.fillRect(originX, originY, mapDiameter, mapDiameter);

    // Entity dot helper (draws a small glowing circle)
    function withAlpha(color, alpha) {
      if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
        const full = color.length === 4
          ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
          : color;
        const r = parseInt(full.slice(1, 3), 16);
        const g = parseInt(full.slice(3, 5), 16);
        const b = parseInt(full.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      return color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
    }

    function drawDot(wx, wy, color, size) {
      const dx = wx - (px - tileRadius);
      const dy = wy - (py - tileRadius);
      const dotX = originX + dx * cell;
      const dotY = originY + dy * cell;
      const distFromCenter = Math.sqrt((dotX - cx) ** 2 + (dotY - cy) ** 2);
      if (distFromCenter > mapRadius - 2) return;
      // Glow
      ctx.fillStyle = withAlpha(color, 0.35);
      ctx.beginPath();
      ctx.arc(dotX, dotY, size + 2, 0, TAU);
      ctx.fill();
      // Core
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dotX, dotY, size, 0, TAU);
      ctx.fill();
    }

    if (!state.player.inHouse) {
      const cbPal = latestColorblindPalette;
      const enemyDot = cbPal ? cbPal.foe : "#98f39b";
      const npcDot = cbPal ? cbPal.friend : "#ffd77b";
      const pigDot = cbPal ? cbPal.neutral : "#f0adb4";
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        drawDot(enemy.x, enemy.y, enemyDot, 2.5);
      }
      for (const npc of state.npcs) {
        drawDot(npc.x, npc.y, npcDot, 2.5);
      }
      for (const pig of state.pigs) {
        drawDot(pig.x, pig.y, pigDot, 2.5);
      }
      drawDot(state.house.outsideDoor.x, state.house.outsideDoor.y,
        state.house.unlocked ? "#d8bc6a" : "#9b7b56", 3.5);
    } else {
      drawDot(state.house.bed.x, state.house.bed.y, "#d8a7a7", 3);
      drawDot(state.house.stash.x, state.house.stash.y, "#c9b372", 3);
      drawDot(state.house.interiorDoor.x, state.house.interiorDoor.y, "#d3c4a0", 3);
    }

    // Player dot + direction
    const playerX = cx + (state.player.x - px) * cell;
    const playerY = cy + (state.player.y - py) * cell;

    // Player glow
    const playerGlow = ctx.createRadialGradient(playerX, playerY, 0, playerX, playerY, 10);
    playerGlow.addColorStop(0, "rgba(255, 252, 240, 0.4)");
    playerGlow.addColorStop(1, "rgba(255, 252, 240, 0)");
    ctx.fillStyle = playerGlow;
    ctx.beginPath();
    ctx.arc(playerX, playerY, 10, 0, TAU);
    ctx.fill();

    // Direction cone (field of view wedge)
    ctx.fillStyle = "rgba(255, 252, 240, 0.1)";
    ctx.beginPath();
    ctx.moveTo(playerX, playerY);
    ctx.arc(playerX, playerY, 18, state.player.angle - FOV / 2, state.player.angle + FOV / 2);
    ctx.closePath();
    ctx.fill();

    // Player dot
    ctx.fillStyle = "#fffcf0";
    ctx.beginPath();
    ctx.arc(playerX, playerY, 3.5, 0, TAU);
    ctx.fill();

    // Direction line
    ctx.strokeStyle = "#fffcf0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playerX, playerY);
    ctx.lineTo(playerX + Math.cos(state.player.angle) * 10, playerY + Math.sin(state.player.angle) * 10);
    ctx.stroke();

    ctx.restore(); // end clip

    // Gradient ring border
    ctx.lineWidth = 2.5;
    const ringGrad = ctx.createLinearGradient(cx - mapRadius, cy - mapRadius, cx + mapRadius, cy + mapRadius);
    ringGrad.addColorStop(0, "#d8bc6a");
    ringGrad.addColorStop(0.5, "#8a7448");
    ringGrad.addColorStop(1, "#d8bc6a");
    ctx.strokeStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, mapRadius + 1, 0, TAU);
    ctx.stroke();

    // Compass cardinal directions (N/S/E/W rotated with player)
    ctx.font = `bold ${mapDiameter < 130 ? 9 : 10}px Georgia`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const compassDist = mapRadius + (mapDiameter < 130 ? 8 : 12);
    const cardinals = [
      { label: "N", angle: -Math.PI / 2 },
      { label: "E", angle: 0 },
      { label: "S", angle: Math.PI / 2 },
      { label: "W", angle: Math.PI },
    ];
    for (const c of cardinals) {
      const a = c.angle;
      const lx = cx + Math.cos(a) * compassDist;
      const ly = cy + Math.sin(a) * compassDist;
      ctx.fillStyle = c.label === "N" ? "#e8c86a" : "rgba(248, 240, 220, 0.6)";
      ctx.fillText(c.label, lx, ly);
    }

    // Tick marks around the ring
    ctx.strokeStyle = "rgba(216, 188, 106, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const inner = mapRadius - 1;
      const outer = mapRadius + 3;
      if (i % 4 === 0) continue; // skip where cardinals are
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawHud() {
    const q1 = state.quests.crystal;
    const q2 = state.quests.slime;
    const q3 = state.quests.wood;
    const q4 = state.quests.archive;
    const q5 = state.quests.ashfall_intro;
    const q6 = state.quests.ashfall_boss;
    const q7 = state.quests.lantern_probe;
    const q8 = state.quests.lantern_revolt;
    const questLines = [
      `${q1.title}: ${q1.status === "locked" ? t("labels.locked") : q1.status === "turned_in" ? t("labels.done") : `${q1.progress}/${q1.need}${q1.status === "complete" ? ` ${t("labels.turnIn")}` : ""}`}`,
      `${q2.title}: ${q2.status === "locked" ? t("labels.locked") : q2.status === "turned_in" ? t("labels.done") : `${q2.progress}/${q2.need}${q2.status === "complete" ? ` ${t("labels.turnIn")}` : ""}`}`,
      `${q3.title}: ${q3.status === "locked" ? t("labels.locked") : q3.status === "turned_in" ? t("labels.done") : `${Math.min(q3.needWood, state.inventory.Wood)}/${q3.needWood}W ${Math.min(q3.needStone, state.inventory.Stone)}/${q3.needStone}S${q3.status === "complete" ? ` ${t("labels.turnIn")}` : ""}`}`,
      q4
        ? `${q4.title}: ${q4.status === "locked" ? t("labels.locked") : q4.status === "turned_in" ? t("labels.done") : `${q4.progress}/${q4.need}${q4.status === "complete" ? ` ${t("labels.turnIn")}` : ""}`}`
        : "",
      q5
        ? `${q5.title}: ${q5.status === "locked" ? t("labels.locked") : q5.status === "turned_in" ? t("labels.done") : `${q5.progress}/${q5.need}${q5.status === "complete" ? ` ${t("labels.turnIn")}` : ""}`}`
        : "",
      q6
        ? `${q6.title}: ${q6.status === "locked" ? t("labels.locked") : q6.status === "turned_in" ? t("labels.done") : `${q6.progress}/${q6.need}${q6.status === "complete" ? ` ${t("labels.turnIn")}` : ""}`}`
        : "",
      q7
        ? `${q7.title}: ${q7.status === "locked" ? t("labels.locked") : q7.status === "turned_in" ? t("labels.done") : `${q7.progress}/${q7.need}${q7.status === "complete" ? ` ${t("labels.turnIn")}` : ""}`}`
        : "",
      q8
        ? `${q8.title}: ${q8.status === "locked" ? t("labels.locked") : q8.status === "turned_in" ? t("labels.done") : `${q8.progress}/${q8.need}${q8.status === "complete" ? ` ${t("labels.turnIn")}` : ""}`}`
        : "",
    ];

    const margin = canvas.width < 620 ? 8 : 12;
    const compact = canvas.width < 560;
    const hudW = Math.min(compact ? canvas.width - margin * 2 : 560, canvas.width - margin * 2);
    const hudH = compact ? 94 : 112;
    const hudX = margin;
    const hudY = canvas.height - hudH - margin;
    drawSoftPanel(hudX, hudY, hudW, hudH);

    const barX = hudX + 12;
    const barW = compact ? hudW - 24 : 176;
    drawBar(barX, hudY + 12, barW, 14, state.player.hp / state.player.maxHp, "rgba(62, 25, 23, 0.9)", "#ef725d", `${t("labels.hp")} ${Math.ceil(state.player.hp)}/${state.player.maxHp}`);
    drawBar(barX, hudY + 32, barW, 12, state.player.stamina / 100, "rgba(26, 43, 38, 0.9)", "#5fe0b5", `${t("labels.stamina")} ${Math.ceil(state.player.stamina)}`);
    drawBar(barX, hudY + 50, barW, 10, state.player.xp / state.player.nextXp, "rgba(28, 38, 58, 0.9)", "#7fa8ff", `${t("labels.xp")} ${state.player.xp}/${state.player.nextXp}`);

    ctx.font = "bold 11px Georgia";
    const statsX = compact ? barX : barX + barW + 16;
    const statsY = compact ? hudY + 76 : hudY + 24;
    const statsW = hudX + hudW - statsX - 12;
    drawClippedText(`${t("labels.lvl")} ${state.player.level}  ${t("labels.gold")} ${state.player.gold}  ${t("labels.potions")} ${state.inventory.Potion}`, statsX, statsY, statsW, "#fff1d0");
    const quick = state.player.quickUtility || { active: "smoke", inventory: { smoke: 0, flare: 0, tonic: 0 } };
    const quickCount = Math.max(0, Math.floor(numberOr(quick.inventory?.[quick.active], 0)));
    if (!compact) {
      ctx.font = "11px Georgia";
      drawClippedText(`${t("labels.crystals")} ${state.inventory["Crystal Shard"]}  ${t("labels.wood")} ${state.inventory.Wood}  ${t("labels.stone")} ${state.inventory.Stone}  ${t("labels.cores")} ${state.inventory["Slime Core"]}`, statsX, hudY + 41, statsW, "#d7c7a7");
      drawClippedText(`${state.player.loadout.weapon} / ${state.player.loadout.stance} / ${state.player.perks.length} perks / ${quick.active}:${quickCount}`, statsX, hudY + 57, statsW, "#d7c7a7");

      ctx.font = "10px Georgia";
      let qy = hudY + 75;
      for (const line of questLines.filter(Boolean).slice(0, 4)) {
        drawClippedText(line, statsX, qy, statsW, "#f1e5c8");
        qy += 12;
      }
    }

    const location = state.player.inHouse ? t("labels.playerHouse") : t("labels.valley");
    const houseStatus = state.house.unlocked ? t("labels.owned") : t("labels.locked");
    const weatherText = state.player.inHouse ? t("labels.sheltered") : weatherLabel(state.weather.kind);
    const mapReserve = state.showMap && canvas.width > 700 ? (canvas.width < 900 ? 176 : 214) : 0;
    const topW = Math.max(240, Math.min(730, canvas.width - margin * 2 - mapReserve));
    const topH = compact ? 78 : 92;
    const topX = margin;
    const topY = margin;
    drawSoftPanel(topX, topY, topW, topH, {
      top: "rgba(16, 25, 29, 0.78)",
      bottom: "rgba(9, 16, 20, 0.66)",
      shadowBlur: 12,
      shadowOffsetY: 5,
    });

    ctx.font = "bold 11px Georgia";
    drawClippedText(`${t("labels.location")}: ${location}   ${t("labels.house")}: ${houseStatus}   ${t("labels.weather")}: ${weatherText}`, topX + 10, topY + 20, topW - 20, "#fff1d0");
    ctx.font = "10px Georgia";
    drawClippedText(
      `Region: ${state.regions.activeRegion}  Chapter: ${state.narrative.chapterTitle}  CVF:${state.narrative.thematicAxes.controlVsFreedom}  TVC:${state.narrative.thematicAxes.truthVsComfort}  SVS:${state.narrative.thematicAxes.solidarityVsStatus}`,
      topX + 10,
      topY + 35,
      topW - 20,
      "#d4c4a4",
    );
    const eventMods = getActiveRegionEventModifiers();
    let msgY = topY + 54;
    if (eventMods.banner) {
      drawClippedText(`Event: ${eventMods.banner}`, topX + 10, topY + 50, topW - 20, "#ffb46d");
      msgY = topY + 66;
    }
    const shown = state.msg.slice(0, 2);
    ctx.font = "11px Georgia";
    if (shown.length === 0) {
      drawClippedText(t("labels.explore"), topX + 10, msgY, topW - 20, "#f3e8cf");
    }
    for (const m of shown) {
      drawClippedText(m.text, topX + 10, msgY, topW - 20, "#f3e8cf");
      msgY += 12;
    }

    if (state.mode === "gameover") {
      ctx.fillStyle = "rgba(18, 4, 5, 0.78)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const panelW = Math.min(500, canvas.width - margin * 2);
      const panelH = 150;
      const px = (canvas.width - panelW) / 2;
      const py = canvas.height * 0.38;
      drawSoftPanel(px, py, panelW, panelH, {
        top: "rgba(48, 18, 18, 0.9)",
        bottom: "rgba(18, 8, 9, 0.88)",
        border: "rgba(255, 166, 138, 0.36)",
      });
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe3d8";
      ctx.font = `bold ${compact ? 28 : 38}px Georgia`;
      ctx.fillText(t("labels.defeatedTitle"), canvas.width * 0.5, py + 48);
      ctx.font = "20px Georgia";
      ctx.fillText(t("labels.recover"), canvas.width * 0.5, py + 83);
      ctx.font = "italic 16px Georgia";
      ctx.fillStyle = "#ffa0a0";
      ctx.fillText(fitText(t("labels.deathsLine", { deaths: state.player.deaths + 1 }), panelW - 36), canvas.width * 0.5, py + 112);
      ctx.textAlign = "left";
    }

    /* Skill screen overlay */
    if (skillScreenOpen && state.mode === "playing") {
      const sw = Math.min(440, canvas.width - margin * 2);
      const sh = SKILL_BRANCH_LABELS.length * 64 + 110;
      const sx = Math.floor((canvas.width - sw) / 2);
      const sy = Math.floor((canvas.height - sh) / 2);
      drawSoftPanel(sx, sy, sw, sh, {
        top: "rgba(20, 22, 36, 0.94)",
        bottom: "rgba(8, 10, 18, 0.92)",
        border: "rgba(186, 168, 255, 0.55)",
      });
      ctx.font = "bold 20px Georgia";
      drawClippedText("Skill Tree", sx + 16, sy + 30, sw - 32, "#cdb8ff");
      ctx.font = "12px Georgia";
      drawClippedText(`Upgrade points: ${state.progression.upgradePoints}   (T to close)`, sx + 16, sy + 50, sw - 32, "#b9aedf");
      for (let i = 0; i < SKILL_BRANCH_LABELS.length; i++) {
        const branch = SKILL_BRANCH_LABELS[i];
        const ranks = state.progression.skillTree?.[branch.id] || 0;
        const iy = sy + 70 + i * 64;
        const selected = i === skillSelection;
        fillRoundedRect(sx + 8, iy, sw - 16, 56, 7, selected ? "rgba(186, 168, 255, 0.22)" : "rgba(255, 255, 255, 0.05)");
        if (selected) strokeRoundedRect(sx + 8.5, iy + 0.5, sw - 17, 55, 7, "#cdb8ff", 1);
        ctx.font = "bold 14px Georgia";
        drawClippedText(`${branch.label}  ${ranks}/5`, sx + 20, iy + 18, sw - 40, selected ? "#cdb8ff" : "#f3ecd8");
        ctx.font = "italic 12px Georgia";
        drawClippedText(branch.desc, sx + 20, iy + 36, sw - 40, "#a09cba");
      }
      ctx.font = "10px Georgia";
      drawClippedText("↑/↓ select   Enter unlock   Esc close", sx + 16, sy + sh - 14, sw - 32, "#9088b0");
    }

    /* Settings overlay */
    if (settingsOpen && state.mode === "playing") {
      const sw = Math.min(440, canvas.width - margin * 2);
      const sh = SETTINGS_ROWS.length * 44 + 110;
      const sx = Math.floor((canvas.width - sw) / 2);
      const sy = Math.floor((canvas.height - sh) / 2);
      drawSoftPanel(sx, sy, sw, sh, {
        top: "rgba(20, 26, 36, 0.94)",
        bottom: "rgba(8, 12, 18, 0.92)",
        border: "rgba(168, 215, 255, 0.55)",
      });
      ctx.font = "bold 20px Georgia";
      drawClippedText("Settings", sx + 16, sy + 30, sw - 32, "#cce4ff");
      ctx.font = "12px Georgia";
      drawClippedText("↑/↓ select  ←/→ change  Esc close", sx + 16, sy + 50, sw - 32, "#a9b8d0");
      for (let i = 0; i < SETTINGS_ROWS.length; i++) {
        const row = SETTINGS_ROWS[i];
        const iy = sy + 70 + i * 44;
        const selected = i === settingsSelection;
        fillRoundedRect(sx + 8, iy, sw - 16, 38, 7, selected ? "rgba(168, 215, 255, 0.22)" : "rgba(255, 255, 255, 0.05)");
        if (selected) strokeRoundedRect(sx + 8.5, iy + 0.5, sw - 17, 37, 7, "#cce4ff", 1);
        ctx.font = "bold 14px Georgia";
        drawClippedText(row.label, sx + 20, iy + 16, sw * 0.55, selected ? "#cce4ff" : "#f3ecd8");
        const value = readSettingValue(state.graphics, row.id);
        let valueText;
        if (row.kind === "bool") valueText = value ? "ON" : "OFF";
        else if (row.kind === "range") valueText = row.format ? row.format(value) : String(value);
        else valueText = String(value);
        ctx.font = "13px Georgia";
        ctx.textAlign = "right";
        ctx.fillStyle = selected ? "#cce4ff" : "#f3ecd8";
        ctx.fillText(`◀ ${valueText} ▶`, sx + sw - 20, iy + 24);
        ctx.textAlign = "left";
      }
    }

    /* Shop overlay */
    if (shopOpen && state.mode === "playing") {
      const sw = Math.min(420, canvas.width - margin * 2);
      const sh = shopItems.length * 52 + 80;
      const sx = Math.floor((canvas.width - sw) / 2);
      const sy = Math.floor((canvas.height - sh) / 2);

      drawSoftPanel(sx, sy, sw, sh, {
        top: "rgba(18, 28, 31, 0.94)",
        bottom: "rgba(8, 14, 18, 0.92)",
        border: "rgba(255, 215, 123, 0.5)",
      });

      ctx.fillStyle = "#ffd77b";
      ctx.font = "bold 20px Georgia";
      drawClippedText(t("labels.shopTitle"), sx + 16, sy + 30, sw - 32, "#ffd77b");
      ctx.font = "12px Georgia";
      drawClippedText(t("labels.shopHeader", { gold: state.player.gold }), sx + 16, sy + 50, sw - 32, "#c9b889");

      for (let i = 0; i < shopItems.length; i++) {
        const item = shopItems[i];
        const iy = sy + 62 + i * 52;
        const selected = i === shopSelection;

        fillRoundedRect(sx + 8, iy, sw - 16, 46, 7, selected ? "rgba(216, 188, 106, 0.24)" : "rgba(255, 255, 255, 0.05)");

        if (selected) {
          strokeRoundedRect(sx + 8.5, iy + 0.5, sw - 17, 45, 7, "#ffd77b", 1);
        }

        ctx.font = "bold 14px Georgia";
        drawClippedText(t(item.nameKey), sx + 20, iy + 18, sw - 112, selected ? "#ffd77b" : "#f3ecd8");

        ctx.fillStyle = item.cost < 0 ? "#5fe0b5" : (state.player.gold >= item.cost ? "#ffd77b" : "#ff6b6b");
        ctx.font = "14px Georgia";
        ctx.textAlign = "right";
        ctx.fillText(item.cost < 0 ? `+${Math.abs(item.cost)}g` : `${item.cost}g`, sx + sw - 20, iy + 18);
        ctx.textAlign = "left";

        ctx.font = "italic 12px Georgia";
        drawClippedText(t(item.descKey), sx + 20, iy + 36, sw - 40, "#a09880");
      }
    }

    const hintSpace = canvas.width - hudW - margin * 3;
    if (!compact && hintSpace > 300) {
      const hx = hudX + hudW + margin;
      const hy = canvas.height - 36;
      drawSoftPanel(hx, hy, hintSpace, 24, {
        top: "rgba(18, 26, 28, 0.64)",
        bottom: "rgba(8, 13, 16, 0.58)",
        shadowBlur: 8,
        shadowOffsetY: 3,
      });
      ctx.font = "10px Georgia";
      drawClippedText(t("labels.controlsHint"), hx + 10, hy + 16, hintSpace - 20, "rgba(255, 245, 220, 0.86)");
    }
  }

  function render() {
    render3D();
    if (state.mode === "menu") return;
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
    clearGradientCache();
  }

  window.addEventListener("resize", resize);
  resize();
  syncSaveStateFromStorage();

  try {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("gradientCache") === "1") {
      state.graphics.performance = state.graphics.performance || { gradientCache: false };
      state.graphics.performance.gradientCache = true;
      clearGradientCache();
    }
    const cb = params.get("colorblind");
    if (cb && ["none","deuteranopia","protanopia","tritanopia"].includes(cb)) {
      state.graphics.accessibility = state.graphics.accessibility || {};
      state.graphics.accessibility.colorblindMode = cb;
    }
  } catch {}

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

    /* Settings modal controls */
    if (settingsOpen) {
      if (event.code === "ArrowUp" || event.code === "KeyW") {
        settingsSelection = (settingsSelection - 1 + SETTINGS_ROWS.length) % SETTINGS_ROWS.length;
        event.preventDefault();
        return;
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        settingsSelection = (settingsSelection + 1) % SETTINGS_ROWS.length;
        event.preventDefault();
        return;
      }
      if (event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "Enter" || event.code === "Space" || event.code === "KeyA" || event.code === "KeyD") {
        const row = SETTINGS_ROWS[settingsSelection];
        const dir = (event.code === "ArrowLeft" || event.code === "KeyA") ? -1 : 1;
        const next = stepSetting(state.graphics, row.id, dir);
        if (row.id === "gradientCache") clearGradientCache();
        if (row.id === "preset") {
          state.weather.quality = state.graphics.preset === "high" ? "cinematic" : state.graphics.preset === "low" ? "performance" : "balanced";
        }
        logMsg(`${row.label}: ${typeof next === "boolean" ? (next ? "ON" : "OFF") : next}`);
        event.preventDefault();
        return;
      }
      if (event.code === "Escape" || event.code === "KeyO") {
        settingsOpen = false;
        event.preventDefault();
        return;
      }
    }

    /* Skill screen controls */
    if (skillScreenOpen) {
      if (event.code === "ArrowUp" || event.code === "KeyW") {
        skillSelection = (skillSelection - 1 + SKILL_BRANCH_LABELS.length) % SKILL_BRANCH_LABELS.length;
        event.preventDefault();
        return;
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        skillSelection = (skillSelection + 1) % SKILL_BRANCH_LABELS.length;
        event.preventDefault();
        return;
      }
      if (event.code === "Enter" || event.code === "KeyE" || event.code === "Space") {
        const branch = SKILL_BRANCH_LABELS[skillSelection].id;
        if (canUnlockSkill(state.progression, branch)) {
          unlockSkill(state.progression, branch);
          logMsg(`Unlocked ${branch} skill rank ${state.progression.skillTree[branch]}.`);
          sfx.shopBuy();
        } else {
          logMsg("Not enough upgrade points or branch maxed.");
        }
        event.preventDefault();
        return;
      }
      if (event.code === "Escape" || event.code === "KeyT") {
        skillScreenOpen = false;
        event.preventDefault();
        return;
      }
    }

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
        const mods = getActiveRegionEventModifiers();
        const adjustedCost = item.cost < 0 ? item.cost : Math.max(1, Math.round(item.cost * mods.priceMult));
        if (item.cost < 0) {
          const result = item.action();
          if (result !== false) sfx.shopBuy();
        } else if (state.player.gold >= adjustedCost) {
          state.player.gold -= adjustedCost;
          const result = item.action();
          if (result === false) {
            state.player.gold += adjustedCost;
          } else {
            sfx.shopBuy();
            logMsg(`Bought ${t(item.nameKey)} for ${adjustedCost}g! ${choice(["Money well spent!", "Trader Nyx grins.", "Ka-ching!", "Nyx winks."])}`);
          }
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
      if (!soundEnabled && audioBuses) {
        try { stopAmbient(audioBuses); } catch { /* not critical */ }
        lastAmbientRegion = null;
      } else if (soundEnabled && state.mode === "playing") {
        syncAmbientForRegion(state.regions?.activeRegion || "frontier");
      }
    }

    if (event.code === "KeyM" && event.shiftKey) {
      ambientEnabled = !ambientEnabled;
      logMsg(`Ambient drone: ${ambientEnabled ? "ON" : "OFF"}.`);
      if (!ambientEnabled && audioBuses) {
        try { stopAmbient(audioBuses); } catch { /* not critical */ }
        lastAmbientRegion = null;
      } else if (ambientEnabled && state.mode === "playing") {
        syncAmbientForRegion(state.regions?.activeRegion || "frontier");
      }
    }

    if (event.code === "KeyV") {
      const order = ["cinematic", "balanced", "performance"];
      const idx = order.indexOf(state.weather.quality);
      state.weather.quality = order[(idx + 1) % order.length];
      logMsg(`Visual quality profile: ${state.weather.quality}.`);
    }

    if (event.code === "BracketLeft" || event.code === "BracketRight") {
      const presetOrder = ["low", "balanced", "high"];
      const dir = event.code === "BracketRight" ? 1 : -1;
      const currentIdx = presetOrder.indexOf(state.graphics.preset);
      const nextIdx = (currentIdx + dir + presetOrder.length) % presetOrder.length;
      state.graphics.preset = presetOrder[nextIdx];
      state.weather.quality = state.graphics.preset === "high" ? "cinematic" : state.graphics.preset === "low" ? "performance" : "balanced";
      logMsg(`Graphics preset: ${state.graphics.preset}.`);
    }

    if (event.code === "KeyY") {
      state.graphics.performance = state.graphics.performance || { gradientCache: false };
      state.graphics.performance.gradientCache = !state.graphics.performance.gradientCache;
      clearGradientCache();
      logMsg(`Gradient cache: ${state.graphics.performance.gradientCache ? "ON" : "OFF"}.`);
    }

    if (event.code === "KeyG") {
      cycleRegion();
    }

    if (event.code === "KeyT" && state.mode === "playing" && !shopOpen) {
      skillScreenOpen = !skillScreenOpen;
      if (skillScreenOpen) logMsg("Skill tree opened.");
    }

    if (event.code === "KeyO" && state.mode === "playing" && !shopOpen && !skillScreenOpen) {
      settingsOpen = !settingsOpen;
      if (settingsOpen) logMsg("Settings opened.");
    }

    if (event.code === "KeyJ" && state.mode === "playing") {
      state.graphics.accessibility.motionReduction = !state.graphics.accessibility.motionReduction;
      logMsg(`Motion reduction: ${state.graphics.accessibility.motionReduction ? "ON" : "OFF"}.`);
    }

    if (event.code === "Equal" || event.code === "Minus") {
      const dir = event.code === "Equal" ? 0.1 : -0.1;
      const next = (state.graphics.accessibility.fontScale || 1) + dir;
      state.graphics.accessibility.fontScale = Math.max(0.8, Math.min(1.6, Number(next.toFixed(2))));
      logMsg(`Font scale: ${state.graphics.accessibility.fontScale.toFixed(2)}x.`);
    }

    if (event.code === "KeyX") {
      performDodgeStep();
    }

    if (event.code === "KeyB") {
      performChargedAttack();
    }

    if (event.code === "Digit1") setQuickUtility("smoke");
    if (event.code === "Digit2") setQuickUtility("flare");
    if (event.code === "Digit3") setQuickUtility("tonic");

    if (event.code === "KeyU") {
      useQuickUtility();
    }

    if (event.code === "KeyZ") {
      const stances = ["balanced", "aggressive", "defensive"];
      const idx = stances.indexOf(state.player.loadout.stance);
      state.player.loadout.stance = stances[(idx + 1) % stances.length];
      logMsg(`Combat stance: ${state.player.loadout.stance}.`);
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
          maybePromise.catch(() => { });
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
    const activeNpcs = state.npcs;
    const activePigs = state.pigs;
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
      archive: state.quests.archive
        ? {
          title: state.quests.archive.title,
          status: state.quests.archive.status,
          progress: state.quests.archive.progress,
          need: state.quests.archive.need,
        }
        : null,
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
        loadout: state.player.loadout,
        perks: state.player.perks,
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
      narrative: {
        chapter: state.narrative.chapter,
        chapterTitle: state.narrative.chapterTitle,
        factionRep: state.narrative.factionRep,
        thematicAxes: state.narrative.thematicAxes,
        decisions: state.narrative.decisions,
        ending: resolveNarrativeEnding(state.narrative),
      },
      nearby_npcs: state.player.inHouse
        ? []
        : activeNpcs
          .map((n) => ({
            id: n.id,
            name: n.name,
            x: Number(n.x.toFixed(2)),
            y: Number(n.y.toFixed(2)),
            distance: Number(dist(state.player, n).toFixed(2)),
          }))
          .filter((n) => n.distance < 8)
          .sort((a, b) => a.distance - b.distance),
      nearby_pigs: state.player.inHouse
        ? []
        : activePigs
          .map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            x: Number(p.x.toFixed(2)),
            y: Number(p.y.toFixed(2)),
            speed: Number(vecLength(p.vx || 0, p.vy || 0).toFixed(2)),
            stampeding: state.pigStampedeTimer > 0,
            distance: Number(dist(state.player, p).toFixed(2)),
          }))
          .filter((p) => p.distance < 10)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10),
      nearby_enemies: state.player.inHouse
        ? []
        : activeEnemies
          .map((e) => ({
            id: e.id,
            type: e.type,
            label: e.label,
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
