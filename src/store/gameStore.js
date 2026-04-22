import { create } from 'zustand';
import {
  PIPE_SLOTS, MATERIALS, NODE_MIN_PRESSURE,
  REPAIR_COST, REPLACE_COST, GASKET_CRAFT_COST,
} from '../data/pipeSystem';

const DAY_TICKS   = 480;
const NIGHT_TICKS = 240;
const TOTAL_CYCLE = DAY_TICKS + NIGHT_TICKS;

// Základní loot pro jasnou noc; modifikátory níže
const BASE_NIGHT_LOOT = { scrap: 30, wood: 15, coal: 6, parts: 3 };

// Multiplikátory lootu podle počasí
const WEATHER_LOOT_MOD = {
  clear: { scrap: 1.1, wood: 1.0, coal: 1.0, parts: 1.2, chemBonus: 0.0 },
  frost: { scrap: 0.7, wood: 1.9, coal: 0.5, parts: 0.8, chemBonus: 0.0 },
  rain:  { scrap: 0.9, wood: 0.8, coal: 1.0, parts: 1.0, chemBonus: 0.5 },
  storm: { scrap: 0.5, wood: 0.5, coal: 0.4, parts: 0.4, chemBonus: 0.0 },
};

const WEATHER_LABELS = {
  clear: 'Jasná noc ☀',
  frost: 'Mrazivá noc ❄',
  rain:  'Deštivá noc 🌧',
  storm: 'Bouřlivá noc ⛈',
};

function rollWeather() {
  const r = Math.random();
  if (r < 0.40) return 'clear';
  if (r < 0.70) return 'frost';
  if (r < 0.90) return 'rain';
  return 'storm';
}

export const TECH_PHASE_LABELS = [
  { phase: 1, label: 'Teplo',    fromDay: 1  },
  { phase: 2, label: 'Stabilit', fromDay: 4  },
  { phase: 3, label: 'Výživa',   fromDay: 8  },
  { phase: 4, label: 'Výpočet',  fromDay: 15 },
];

export const BUILDING_PHASE = {
  boiler: 1, collector: 1,
  dynamo: 2, distillery: 2,
  greenhouse: 3,
  workshop: 4,
};

function processTrade(offer, trust) {
  const mult = 0.5 + trust / 100;
  const result = {};
  if (offer.scrap > 0) result.coal  = Math.max(1, Math.floor((offer.scrap / 5) * mult));
  if (offer.wood  > 0) result.scrap = Math.floor(offer.wood * 1.5 * mult);
  if (offer.parts > 0) result.scrap = (result.scrap ?? 0) + Math.floor(offer.parts * 7 * mult);
  if (offer.coal  > 0) result.wood  = Math.floor(offer.coal * 2);
  return result;
}

// Vytvoří novou dřevěnou trubku
function newWoodPipe() {
  return { material: 'wood', integrity: 100, maxIntegrityCap: 100, isLeaking: false, pressure: 0 };
}

export const useGameStore = create((set, get) => ({
  // --- ČAS ---
  tick: 0,
  dayNumber: 1,
  phase: 'day',
  timeOfDay: 360,
  nightLootGiven: false,
  techPhase: 1,
  weather: 'clear',

  // --- PAVEL ---
  hero: { name: 'Pavel', morale: 70, energy: 90 },

  // --- NADIA ---
  nadia: {
    met: false, trust: 60, status: 'unknown', capacity: 40,
    tradeOffer: { scrap: 0, wood: 0, coal: 0, parts: 0 },
    pendingReturn: null, notification: false,
  },

  // --- STAVY ---
  stats: { health: 82, food: 70, heat: 60, water: 65, power: 40 },

  // --- SUROVINY ---
  resources: { scrap: 312, wood: 145, coal: 24, parts: 12, gaskets: 8, chemicals: 0 },

  // --- BUDOVY ---
  buildings: {
    boiler:     { built: true,  level: 1, fuel: 24, scale: 0 },
    collector:  { built: false, level: 0 },
    dynamo:     { built: false, level: 0 },
    distillery: { built: false, level: 0 },
    greenhouse: { built: false, level: 0 },
    workshop:   { built: false, level: 0 },
  },

  // --- TRUBKY (null = nepostavena, object = existuje) ---
  pipes: {},

  // --- LOG & INVENTÁŘ ---
  messages: [],
  inventory: [],

  // --- ÚKOLY ---
  tasks: [
    { id: 1, text: 'Přiložit do kotle', done: false },
    { id: 2, text: 'Postavit sběrač kondenzátu', done: false },
    { id: 3, text: 'Počkat na Nadiu (přijde den 3)', done: false },
  ],

  // --- UI ---
  activeModal: null,
  activeLeftTab: 'tasks',
  paused: false,
  speed: 1,

  // ─── AKCE ──────────────────────────────────────────────────────────────────

  setActiveModal:  (m) => set({ activeModal: m }),
  setActiveLeftTab:(t) => set({ activeLeftTab: t }),
  togglePause:     ()  => set(s => ({ paused: !s.paused })),
  toggleFF:        ()  => set(s => ({ speed: s.speed === 1 ? 5 : 1 })),
  setTradeOffer:   (o) => set(s => ({ nadia: { ...s.nadia, tradeOffer: { ...s.nadia.tradeOffer, ...o } } })),
  clearNadiaNotification: () => set(s => ({ nadia: { ...s.nadia, notification: false } })),
  toggleTask: (id) => set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })),

  // Výroba těsnění: 3× šrot + 2× dřevo → 1× těsnění
  craftGaskets: () => set(s => {
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(GASKET_CRAFT_COST)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    return { resources: { ...res, gaskets: (res.gaskets ?? 0) + 1 } };
  }),

  // Vyčistit kotel chemikálií: 1× chemikálie → scale = 0
  cleanBoiler: () => set(s => {
    if ((s.resources.chemicals ?? 0) < 1) return s;
    return {
      resources: { ...s.resources, chemicals: s.resources.chemicals - 1 },
      buildings: { ...s.buildings, boiler: { ...s.buildings.boiler, scale: 0 } },
    };
  }),

  stokeCoal: () => set(s => {
    if (s.resources.coal < 1) return s;
    return {
      resources: { ...s.resources, coal: s.resources.coal - 1 },
      buildings: { ...s.buildings, boiler: { ...s.buildings.boiler, fuel: Math.min(s.buildings.boiler.fuel + 10, 100) } },
    };
  }),

  stokeWood: () => set(s => {
    if (s.resources.wood < 2) return s;
    return {
      resources: { ...s.resources, wood: s.resources.wood - 2 },
      buildings: { ...s.buildings, boiler: { ...s.buildings.boiler, fuel: Math.min(s.buildings.boiler.fuel + 6, 100) } },
    };
  }),

  buildBuilding: (name) => set(s => {
    const costs = {
      collector:  { scrap: 15 },
      dynamo:     { scrap: 50, parts: 10 },
      distillery: { scrap: 30, parts: 8, wood: 10 },
      greenhouse: { wood: 30, scrap: 15 },
      workshop:   { scrap: 40, wood: 20, parts: 8 },
    };
    const cost = costs[name];
    if (!cost) return s;
    if (s.techPhase < (BUILDING_PHASE[name] ?? 1)) return s;

    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(cost)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }

    // Auto-vytvoř dřevěnou trubku k novému uzlu
    const pipeId = `boiler_${name}`;
    const newPipes = { ...s.pipes };
    if (PIPE_SLOTS[pipeId] && !newPipes[pipeId]) {
      newPipes[pipeId] = newWoodPipe();
    }

    return {
      resources: res,
      buildings: { ...s.buildings, [name]: { built: true, level: 1 } },
      pipes: newPipes,
    };
  }),

  // Záplata: levná, sníží maxIntegrityCap o 5 %
  repairPipe: (pipeId) => set(s => {
    const pipe = s.pipes[pipeId];
    if (!pipe) return s;
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(REPAIR_COST)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    const newCap = Math.max(50, pipe.maxIntegrityCap - 5);
    return {
      resources: res,
      pipes: {
        ...s.pipes,
        [pipeId]: { ...pipe, integrity: Math.min(newCap, pipe.integrity + 45), maxIntegrityCap: newCap, isLeaking: false },
      },
    };
  }),

  // Plná výměna: drahší, plný reset integrity
  replacePipe: (pipeId) => set(s => {
    const pipe = s.pipes[pipeId];
    if (!pipe) return s;
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(REPLACE_COST)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    return {
      resources: res,
      pipes: { ...s.pipes, [pipeId]: { ...pipe, integrity: 100, maxIntegrityCap: 100, isLeaking: false } },
    };
  }),

  // Upgrade materiálu trubky
  upgradePipe: (pipeId, newMaterial) => set(s => {
    const pipe = s.pipes[pipeId];
    if (!pipe || pipe.material === newMaterial) return s;
    const mat = MATERIALS[newMaterial];
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(mat.buildCost)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    return {
      resources: res,
      pipes: {
        ...s.pipes,
        [pipeId]: { material: newMaterial, integrity: 100, maxIntegrityCap: 100, isLeaking: false, pressure: pipe.pressure },
      },
    };
  }),

  skipPhase: () => set(s => {
    const cyclePos = s.tick % TOTAL_CYCLE;
    const inDay    = cyclePos < DAY_TICKS;
    const remaining = inDay ? DAY_TICKS - cyclePos : TOTAL_CYCLE - cyclePos;

    const stats = { ...s.stats };
    const { boiler, greenhouse } = s.buildings;
    const boilerActive = boiler.fuel > 0;
    stats.food  = Math.max(0, stats.food  - (greenhouse.built ? 0.015 : 0.03) * remaining);
    stats.water = Math.max(0, stats.water - 0.025 * remaining);
    stats.heat  = Math.min(100, Math.max(0, stats.heat + (boilerActive ? 0.04 : -0.08) * remaining));

    const hero = { ...s.hero };
    hero.energy = inDay
      ? Math.max(0,   hero.energy - 0.015 * remaining)
      : Math.min(100, hero.energy + 0.04  * remaining);

    const newTick     = s.tick + remaining;
    const newCyclePos = newTick % TOTAL_CYCLE;
    const newPhase    = newCyclePos < DAY_TICKS ? 'day' : 'night';
    const dayNumber   = s.dayNumber + (inDay ? 0 : 1);
    let timeOfDay;
    if (newPhase === 'day') {
      timeOfDay = 360 + Math.floor((newCyclePos / DAY_TICKS) * 960);
    } else {
      timeOfDay = (1320 + Math.floor(((newCyclePos - DAY_TICKS) / NIGHT_TICKS) * 480)) % 1440;
    }

    const messages = [
      { id: Date.now(), text: inDay ? 'Den přeskočen — nastává noc.' : 'Noc přeskočena — nový den.', type: 'info' },
      ...s.messages,
    ].slice(0, 12);

    return { tick: newTick, phase: newPhase, timeOfDay, dayNumber, stats, hero, messages, nightLootGiven: false };
  }),

  // ─── HERNÍ TICK ────────────────────────────────────────────────────────────

  gameTick: () => set(s => {
    if (s.paused) return s;

    const tick        = s.tick + 1;
    const cyclePos    = tick % TOTAL_CYCLE;
    const prevCyclePos = (tick - 1) % TOTAL_CYCLE;
    const phase       = cyclePos    < DAY_TICKS ? 'day' : 'night';
    const prevPhase   = prevCyclePos < DAY_TICKS ? 'day' : 'night';
    const phaseJustChanged = phase !== prevPhase;

    let timeOfDay;
    if (phase === 'day') {
      timeOfDay = 360 + Math.floor((cyclePos / DAY_TICKS) * 960);
    } else {
      timeOfDay = (1320 + Math.floor(((cyclePos - DAY_TICKS) / NIGHT_TICKS) * 480)) % 1440;
    }

    const dayNumber = s.dayNumber + (cyclePos === 0 ? 1 : 0);

    // Tech fáze
    let techPhase = s.techPhase;
    for (const tp of TECH_PHASE_LABELS) {
      if (dayNumber >= tp.fromDay && techPhase < tp.phase) techPhase = tp.phase;
    }

    // Kotel
    const boiler = { ...s.buildings.boiler };
    if (tick % 30 === 0 && boiler.fuel > 0) boiler.fuel = Math.max(0, boiler.fuel - 1);
    const boilerActive = boiler.fuel > 0;

    // Zanášení (scale 0–100): každých 20 ticků +0.5 při provozu → max za ~5 dní
    if (tick % 20 === 0 && boilerActive) boiler.scale = Math.min(100, (boiler.scale ?? 0) + 0.5);
    // Efektivní tlak kotle je snížen zanášením (při scale 100 = 50 % výkonu)
    const rawPressure    = boilerActive ? boiler.fuel : 0;
    const boilerPressure = rawPressure * (1 - (boiler.scale ?? 0) * 0.005);

    let resources      = { ...s.resources };
    let nadia          = { ...s.nadia };
    let hero           = { ...s.hero };
    let nightLootGiven = s.nightLootGiven;
    const messages     = [...s.messages];
    let inventory      = [...s.inventory];
    let weather        = s.weather;
    const { dynamo, collector, distillery, greenhouse } = s.buildings;

    // Počasí: generuje se na začátku každé noci
    if (phaseJustChanged && phase === 'night') {
      weather = rollWeather();
      messages.unshift({ id: Date.now() + 20, text: `${WEATHER_LABELS[weather]} — Nadia vyrazila.`, type: 'info' });
    }

    // ── Trubky: tlak + degradace ──────────────────────────────────────────────
    const newPipes = { ...s.pipes };
    const pipeEfficiency = {}; // efektivita 0–1 pro každý uzel

    for (const [pipeId, pipe] of Object.entries(newPipes)) {
      if (!pipe) continue;
      const slot = PIPE_SLOTS[pipeId];
      const mat  = MATERIALS[pipe.material];
      if (!slot || !mat) continue;

      // Tlak na konci trubky
      let pressureLoss = slot.segments * mat.resistance;
      if (pipe.isLeaking) pressureLoss *= 1.8; // leak zdvojí ztráty
      const destPressure = Math.max(0, boilerPressure - pressureLoss);
      const minPress = NODE_MIN_PRESSURE[slot.to] ?? 1;
      pipeEfficiency[slot.to] = pipe.integrity > 0 ? Math.min(1.0, destPressure / minPress) : 0;

      // Degradace integrity (jen při provozu)
      let updatedPipe = { ...pipe, pressure: destPressure };
      if (boilerActive) {
        let dmg = mat.degradation;
        if (boilerPressure > mat.maxPressure) dmg *= 3; // přetlak — rychlé ničení

        const newIntegrity = Math.max(0, pipe.integrity - dmg);
        const wasLeaking   = pipe.isLeaking;
        const nowLeaking   = newIntegrity < 30;

        if (nowLeaking && !wasLeaking) {
          messages.unshift({ id: Date.now() + 50, text: `Trubka ke ${slot.to} začala netěsit! (integrita ${Math.round(newIntegrity)} %)`, type: 'warning' });
        }
        if (newIntegrity === 0 && pipe.integrity > 0) {
          messages.unshift({ id: Date.now() + 51, text: `Trubka ke ${slot.to} PRASKLA! Okamžitě opravte.`, type: 'warning' });
        }
        updatedPipe = { ...updatedPipe, integrity: newIntegrity, isLeaking: nowLeaking };
      }
      newPipes[pipeId] = updatedPipe;
    }

    // ── Nadia ─────────────────────────────────────────────────────────────────
    if (dayNumber >= 3 && !nadia.met && phase === 'day') {
      nadia = { ...nadia, met: true, status: 'home' };
      messages.unshift({ id: Date.now() + 10, text: 'Nadia zaklepala na dveře. Kulhá, ale nabídla pomoc s obstaráváním.', type: 'info' });
    }

    if (phaseJustChanged && phase === 'night' && nadia.met && nadia.status === 'home') {
      const offer      = nadia.tradeOffer;
      const totalOffered = Object.values(offer).reduce((a, b) => a + b, 0);
      let pendingReturn = null;
      if (totalOffered > 0 && totalOffered <= nadia.capacity) {
        for (const [k, v] of Object.entries(offer)) resources[k] = Math.max(0, (resources[k] ?? 0) - v);
        pendingReturn = processTrade(offer, nadia.trust);
        messages.unshift({ id: Date.now() + 11, text: 'Nadia odešla — vezme tvoji nabídku a přinese zásoby.', type: 'info' });
      } else {
        messages.unshift({ id: Date.now() + 11, text: 'Nadia odešla do města.', type: 'info' });
      }
      nadia = { ...nadia, status: 'out', pendingReturn, tradeOffer: { scrap: 0, wood: 0, coal: 0, parts: 0 } };
    }

    if (phaseJustChanged && phase === 'day' && nadia.met && nadia.status === 'out') {
      const mod = WEATHER_LOOT_MOD[weather] ?? WEATHER_LOOT_MOD.clear;
      const v   = () => 0.8 + Math.random() * 0.4;
      const loot = {
        scrap: Math.round(BASE_NIGHT_LOOT.scrap * mod.scrap * v()),
        wood:  Math.round(BASE_NIGHT_LOOT.wood  * mod.wood  * v()),
        coal:  Math.round(BASE_NIGHT_LOOT.coal  * mod.coal  * v()),
        parts: Math.round(BASE_NIGHT_LOOT.parts * mod.parts * v()),
      };
      for (const [k, v2] of Object.entries(loot)) resources[k] = (resources[k] ?? 0) + v2;

      // Chemikálie — bonusová šance za deštivou noc
      let chemMsg = '';
      if (mod.chemBonus > 0 && Math.random() < mod.chemBonus) {
        resources.chemicals = (resources.chemicals ?? 0) + 1;
        chemMsg = ', +1 chemikálie';
      }

      // Mrazivá noc: Pavel prochladl
      if (weather === 'frost' && boiler.fuel === 0) {
        hero = { ...hero };
      }

      let tradeMsg = '';
      if (nadia.pendingReturn) {
        for (const [k, v2] of Object.entries(nadia.pendingReturn)) resources[k] = (resources[k] ?? 0) + v2;
        tradeMsg = ` | Obchod: ${Object.entries(nadia.pendingReturn).map(([k, v2]) => `+${v2} ${k}`).join(', ')}`;
        nadia = { ...nadia, trust: Math.min(100, nadia.trust + 2) };
      }

      if (Math.random() > 0.5) {
        const finds = [
          { name: 'Lékárnička', icon: '🩹', key: 'medkit'  },
          { name: 'Konzerva',   icon: '🥫', key: 'can'     },
          { name: 'Svíčka',     icon: '🕯',  key: 'candle'  },
          { name: 'Nůž',        icon: '🔪', key: 'knife'   },
          { name: 'Deka',       icon: '🛏',  key: 'blanket' },
        ];
        const found = finds[Math.floor(Math.random() * finds.length)];
        const existing = inventory.find(i => i.key === found.key);
        inventory = existing
          ? inventory.map(i => i.key === found.key ? { ...i, qty: i.qty + 1 } : i)
          : [...inventory, { id: Date.now(), ...found, qty: 1 }];
      }

      const weatherLabel = { clear: 'Jasná', frost: 'Mrazivá', rain: 'Deštivá', storm: 'Bouřlivá' }[weather];
      messages.unshift({
        id: Date.now() + 12,
        text: `[${weatherLabel}] Nadia se vrátila: +${loot.scrap} šrot, +${loot.wood} dřevo, +${loot.coal} uhlí, +${loot.parts} souč.${chemMsg}${tradeMsg}`,
        type: 'loot',
      });
      nadia = { ...nadia, status: 'home', pendingReturn: null, notification: true };
      nightLootGiven = true;
    }

    if (phase === 'night' && !nightLootGiven && !nadia.met) {
      const mod = WEATHER_LOOT_MOD[weather] ?? WEATHER_LOOT_MOD.clear;
      const v   = () => 0.8 + Math.random() * 0.4;
      const loot = {
        scrap: Math.round(BASE_NIGHT_LOOT.scrap * mod.scrap * v()),
        wood:  Math.round(BASE_NIGHT_LOOT.wood  * mod.wood  * v()),
        coal:  Math.round(BASE_NIGHT_LOOT.coal  * mod.coal  * v()),
        parts: Math.round(BASE_NIGHT_LOOT.parts * mod.parts * v()),
      };
      for (const [k, v2] of Object.entries(loot)) resources[k] = (resources[k] ?? 0) + v2;
      nightLootGiven = true;
      messages.unshift({ id: Date.now(), text: `Sám jsi sehnal: +${loot.scrap} šrot, +${loot.wood} dřevo, +${loot.coal} uhlí`, type: 'loot' });
    }
    if (phase === 'day' && nightLootGiven && !nadia.met) nightLootGiven = false;

    const lootWater = (messages[0]?.waterGain && phaseJustChanged && phase === 'day') ? messages[0].waterGain : 0;

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = { ...s.stats };

    stats.heat = boilerActive
      ? Math.min(100, stats.heat + 0.04)
      : Math.max(0,   stats.heat - 0.08);

    // Jídlo — pěstírna škáluje podle efektivity pipe
    const foodDecay = greenhouse.built
      ? 0.03 * (1 - 0.5 * (pipeEfficiency.greenhouse ?? 0))
      : 0.03;
    stats.food = Math.max(0, stats.food - foodDecay);

    // Voda — sběrač + destilérka škálují podle efektivity pipe
    const waterSources =
      (collector.built  ? 0.02  * (pipeEfficiency.collector  ?? 0) : 0) +
      (distillery.built ? 0.035 * (pipeEfficiency.distillery ?? 0) : 0);
    stats.water = Math.min(100, Math.max(0, stats.water + waterSources - 0.025 + lootWater));

    // Energie — dynamo škáluje
    if (dynamo.built) {
      stats.power = Math.min(100, stats.power + 0.03 * (pipeEfficiency.dynamo ?? 0));
    } else {
      stats.power = Math.max(0, stats.power - 0.01);
    }

    // Zdraví
    const hDecay =
      (stats.heat  < 20 ? 0.05 : 0) +
      (stats.food  < 10 ? 0.08 : 0) +
      (stats.water < 10 ? 0.06 : 0);
    if (hDecay > 0) {
      stats.health = Math.max(0, stats.health - hDecay);
    } else if (stats.heat > 40 && stats.food > 30 && stats.water > 30) {
      stats.health = Math.min(100, stats.health + 0.005);
    }

    // Pavel
    hero.energy = phase === 'day'
      ? Math.max(0,   hero.energy - 0.015)
      : Math.min(100, hero.energy + 0.04);

    const moraleDelta =
      (stats.heat  > 50 ? 0.01 : -0.02) +
      (stats.food  > 50 ? 0.005 : (stats.food  < 15 ? -0.03 : 0)) +
      (stats.water > 50 ? 0.005 : (stats.water < 15 ? -0.02 : 0)) +
      (nadia.met && nadia.status === 'home' ? 0.01 : -0.005);
    hero.morale = Math.min(100, Math.max(0, hero.morale + moraleDelta));

    // Varování
    if (boiler.fuel === 10 && s.buildings.boiler.fuel > 10)
      messages.unshift({ id: Date.now() + 1, text: 'Kotel má málo paliva!', type: 'warning' });
    if (!boilerActive && s.buildings.boiler.fuel > 0)
      messages.unshift({ id: Date.now() + 2, text: 'Kotel zhasl! Teplo začíná klesat.', type: 'warning' });
    if (stats.water < 15 && s.stats.water >= 15)
      messages.unshift({ id: Date.now() + 3, text: 'Dochází voda! Postav sběrač kondenzátu.', type: 'warning' });
    if (hero.morale < 20 && s.hero.morale >= 20)
      messages.unshift({ id: Date.now() + 4, text: 'Pavel je na dně. Potřebuje teplo a společnost.', type: 'warning' });
    if (techPhase > s.techPhase)
      messages.unshift({ id: Date.now() + 5, text: `Nová fáze: ${TECH_PHASE_LABELS.find(t => t.phase === techPhase)?.label} — nové stavby dostupné!`, type: 'info' });
    // Zanášení kotle
    const prevScale = s.buildings.boiler.scale ?? 0;
    if (boiler.scale >= 40 && prevScale < 40)
      messages.unshift({ id: Date.now() + 6, text: 'Kotel se zanáší! Výkon klesl — vyčisti ho chemikáliemi.', type: 'warning' });
    if (boiler.scale >= 80 && prevScale < 80)
      messages.unshift({ id: Date.now() + 7, text: 'Kotel vážně zanesen! Tlak páry snížen na 60 % — naléhavé čištění!', type: 'warning' });

    return {
      tick, dayNumber, phase, timeOfDay, nightLootGiven, techPhase, weather,
      stats, hero, nadia, resources, inventory, pipes: newPipes,
      messages: messages.slice(0, 12),
      buildings: { ...s.buildings, boiler },
    };
  }),
}));
