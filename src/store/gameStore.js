import { create } from 'zustand';
import {
  PIPE_SLOTS, MATERIALS, NODE_MIN_PRESSURE,
  REPAIR_COST, REPLACE_COST, GASKET_CRAFT_COST,
} from '../data/pipeSystem';

const DAY_TICKS   = 480;
const NIGHT_TICKS = 240;
const TOTAL_CYCLE = DAY_TICKS + NIGHT_TICKS;
const AMBIENT_TEMP = 10; // °C, zima

export const FUEL_TYPES = {
  chips: { label: 'Štěpky', heatPerTick: 2,  burnTicks: 25,  cost: { chips: 5 } },
  wood:  { label: 'Dřevo',  heatPerTick: 6,  burnTicks: 60,  cost: { wood: 1  } },
  coal:  { label: 'Uhlí',   heatPerTick: 18, burnTicks: 180, cost: { coal: 1  } },
};

const BASE_NIGHT_LOOT = { scrap: 22, wood: 10, coal: 3, parts: 2, chips: 18 };

const WEATHER_LOOT_MOD = {
  clear: { scrap: 1.1, wood: 1.0, coal: 1.0, parts: 1.2, chemBonus: 0.0 },
  frost: { scrap: 0.7, wood: 1.9, coal: 0.5, parts: 0.8, chemBonus: 0.0 },
  rain:  { scrap: 0.9, wood: 0.8, coal: 1.0, parts: 1.0, chemBonus: 0.5 },
  storm: { scrap: 0.5, wood: 0.5, coal: 0.4, parts: 0.4, chemBonus: 0.0 },
};
const WEATHER_LABELS = {
  clear: 'Jasná noc ☀', frost: 'Mrazivá noc ❄',
  rain: 'Deštivá noc 🌧', storm: 'Bouřlivá noc ⛈',
};
function rollWeather() {
  const r = Math.random();
  if (r < 0.40) return 'clear';
  if (r < 0.70) return 'frost';
  if (r < 0.90) return 'rain';
  return 'storm';
}

const RADIO_POOL = [
  'Tady Lelek, tady Lelek... Vysíláme na vlnách 87.4. Přijímáte?',
  '— Kde jsou ti, co šli před námi? Ticho. —',
  'Zpráva ze severu: skupina přeživších hledá palivo. Dejte pozor na cestu.',
  'Varování: pohyb neznámých skupin v sektoru D3. Zůstaňte uvnitř.',
  'Palivo dochází. Jsou noci, kdy ticho říká víc než slova.',
  '... ☐ ▪ ▪ ▪ ☐ ▪ ☐ ☐ ... (signál nepřeložen)',
  'Hledám kohokoliv. Je tady někdo? Odpovězte na 87.4.',
  'Kódová zpráva: Brambory jsou uvařené. Opakuji — brambory jsou uvařené.',
];

function processTrade(offer, trust) {
  const mult = 0.5 + trust / 100;
  const result = {};
  if (offer.scrap > 0) result.coal  = Math.max(1, Math.floor((offer.scrap / 5) * mult));
  if (offer.wood  > 0) result.scrap = Math.floor(offer.wood * 1.5 * mult);
  if (offer.parts > 0) result.scrap = (result.scrap ?? 0) + Math.floor(offer.parts * 7 * mult);
  if (offer.coal  > 0) result.wood  = Math.floor(offer.coal * 2);
  return result;
}

function newWoodPipe() {
  return { material: 'wood', integrity: 100, maxIntegrityCap: 100, isLeaking: false, pressure: 0 };
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
  greenhouse: 3, workshop: 4,
};

export const useGameStore = create((set, get) => ({
  // --- ČAS ---
  tick: 0, dayNumber: 1, phase: 'day', timeOfDay: 360,
  nightLootGiven: false, techPhase: 1, weather: 'clear',

  // --- DÉŠŤ & RÁDIO ---
  rain: { isRaining: false, timeRemaining: 0, nextRainIn: 80, announced: false },
  radioMessages: [
    { id: 1, text: 'Tady Lelek... Dobrý večer. Teploty klesají, mějte kotel v chodu.', type: 'weather' },
    { id: 2, text: '— Milá zásilka ztroskotala na cestě. Marně čekáme. —', type: 'signal' },
  ],

  // --- POSTAVY ---
  hero:  { name: 'Pavel', morale: 70, energy: 90 },
  nadia: { met: false, trust: 60, status: 'unknown', capacity: 40,
           tradeOffer: { scrap: 0, wood: 0, coal: 0, parts: 0 },
           pendingReturn: null, notification: false },

  // --- INTRO ---
  introStep: 0,   // 0 = intro běží, -1 = přeskočeno/hotovo

  // --- STAVY ---
  stats: { health: 82, food: 65, heat: 15, water: 65, power: 30 },

  // --- SUROVINY --- (testovací zásoby — dost na stavbu všeho)
  resources: { scrap: 200, wood: 80, coal: 20, parts: 20, gaskets: 10, chemicals: 5, chips: 60 },

  // --- ZÁSOBNÍK VODY (sudy) ---
  reservoirWater: 40,
  waterBarrels: 1,

  // --- BUDOVY ---
  buildings: {
    boiler: {
      built: true, level: 1,
      temp: 12,        // °C — studený kotel
      pressure: 0,     // bar (0-15)
      water: 20,       // litrů — málo vody
      integrity: 100,
      fuelType: null,
      fuelTimer: 0,
      scale: 0,
    },
    collector:  { built: false, level: 1 },
    dynamo:     { built: false, level: 1 },
    distillery: { built: false, level: 1 },
    greenhouse: { built: false, level: 1 },
    workshop:   { built: false, level: 1 },
    defense_vent: { built: false, level: 1 },
  },

  // --- TRUBKY ---
  pipes: {},

  // --- LOG & INVENTÁŘ ---
  messages: [],
  inventory: [],

  // --- ÚKOLY ---
  tasks: [
    { id: 1, text: 'Přečerpat vodu ze sudu do kotle',          done: false },
    { id: 2, text: 'Přiložit do kotle (dřevo nebo štěpky)',    done: false },
    { id: 3, text: 'Dočkat se teploty nad 100 °C',             done: false },
    { id: 4, text: 'Udržet tlak v ideální zóně 2–5 bar',       done: false },
    { id: 5, text: 'Postavit sběrač dešťové vody',             done: false },
  ],

  // --- VENTILY ---
  valves: { heating: true, dynamo: false, workshop: false, defense_vent: false },

  // --- PLOVOUCÍ PANELY ---
  floatingPanels: {
    distributor: { open: false, x: 200, y: 80 },
  },

  // --- ROZDĚLOVAČ (live data z gameTick) ---
  distributorPressure: 0,
  branchDrop: {},

  // --- UI ---
  activeModal: null, activeLeftTab: 'radio', paused: false, speed: 1,

  // ─── AKCE ──────────────────────────────────────────────────────────────────

  advanceIntro: () => set(s => ({ introStep: s.introStep + 1 })),
  skipIntro:    () => set({ introStep: -1, paused: false }),

  toggleFloatingPanel: (id) => set(s => ({
    floatingPanels: {
      ...s.floatingPanels,
      [id]: { ...s.floatingPanels[id], open: !s.floatingPanels[id]?.open },
    },
  })),
  moveFloatingPanel: (id, x, y) => set(s => ({
    floatingPanels: {
      ...s.floatingPanels,
      [id]: { ...s.floatingPanels[id], x, y },
    },
  })),

  setActiveModal:   (m) => set({ activeModal: m }),
  setActiveLeftTab: (t) => set({ activeLeftTab: t }),
  togglePause:      ()  => set(s => ({ paused: !s.paused })),
  toggleFF:         ()  => set(s => ({ speed: s.speed === 1 ? 5 : 1 })),
  toggleValve:      (v) => set(s => ({ valves: { ...s.valves, [v]: !s.valves[v] } })),
  setTradeOffer:    (o) => set(s => ({ nadia: { ...s.nadia, tradeOffer: { ...s.nadia.tradeOffer, ...o } } })),
  clearNadiaNotification: () => set(s => ({ nadia: { ...s.nadia, notification: false } })),
  toggleTask: (id) => set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })),

  addFuel: (type) => set(s => {
    const fuelDef = FUEL_TYPES[type];
    if (!fuelDef) return s;
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(fuelDef.cost)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    const boiler = { ...s.buildings.boiler };
    boiler.fuelType  = type;
    boiler.fuelTimer = Math.min(boiler.fuelTimer + fuelDef.burnTicks, fuelDef.burnTicks * 4);
    return { resources: res, buildings: { ...s.buildings, boiler } };
  }),

  pumpWater: () => set(s => {
    if (s.reservoirWater < 2) return s;
    const boiler = s.buildings.boiler;
    if (boiler.water >= 100) return s;
    const amount = Math.min(10, s.reservoirWater, 100 - boiler.water);
    return {
      reservoirWater: Math.max(0, s.reservoirWater - amount),
      buildings: { ...s.buildings, boiler: { ...boiler, water: Math.min(100, boiler.water + amount) } },
    };
  }),

  ventPressure: () => set(s => {
    const boiler = s.buildings.boiler;
    if (boiler.pressure < 0.5) return s;
    return {
      buildings: { ...s.buildings, boiler: { ...boiler, pressure: Math.max(0, boiler.pressure - 2.5) } },
    };
  }),

  craftGaskets: () => set(s => {
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(GASKET_CRAFT_COST)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    return { resources: { ...res, gaskets: (res.gaskets ?? 0) + 1 } };
  }),

  cleanBoiler: () => set(s => {
    if ((s.resources.chemicals ?? 0) < 1) return s;
    return {
      resources: { ...s.resources, chemicals: s.resources.chemicals - 1 },
      buildings: { ...s.buildings, boiler: { ...s.buildings.boiler, scale: 0 } },
    };
  }),

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
      pipes: { ...s.pipes, [pipeId]: { ...pipe, integrity: Math.min(newCap, pipe.integrity + 45), maxIntegrityCap: newCap, isLeaking: false } },
    };
  }),

  replacePipe: (pipeId) => set(s => {
    const pipe = s.pipes[pipeId];
    if (!pipe) return s;
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(REPLACE_COST)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    return { resources: res, pipes: { ...s.pipes, [pipeId]: { ...pipe, integrity: 100, maxIntegrityCap: 100, isLeaking: false } } };
  }),

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
      pipes: { ...s.pipes, [pipeId]: { material: newMaterial, integrity: 100, maxIntegrityCap: 100, isLeaking: false, pressure: pipe.pressure } },
    };
  }),

  buildBuilding: (name) => set(s => {
    const newWoodPipe = () => ({ material: 'wood', integrity: 100, maxIntegrityCap: 100, isLeaking: false, pressure: 0 });
    const costs = {
      collector:  { scrap: 15 },
      dynamo:     { scrap: 50, parts: 10 },
      distillery: { scrap: 30, parts: 8, wood: 10 },
      greenhouse: { wood: 30, scrap: 15 },
      workshop:   { scrap: 40, wood: 20, parts: 8 },
      defense_vent: { scrap: 25, parts: 5, wood: 10 },
    };
    const cost = costs[name];
    if (!cost) return s;
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(cost)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    const pipeId   = `boiler_${name}`;
    const newPipes = { ...s.pipes };
    if (PIPE_SLOTS[pipeId] && !newPipes[pipeId]) newPipes[pipeId] = newWoodPipe();
    const newLevel = name === 'collector' ? 1 : 1;
    return { resources: res, buildings: { ...s.buildings, [name]: { built: true, level: newLevel } }, pipes: newPipes };
  }),

  buildBarrel: () => set(s => {
    const cost = { scrap: 20, wood: 10 };
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(cost)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    return { resources: res, waterBarrels: s.waterBarrels + 1 };
  }),

  upgradeCollector: () => set(s => {
    const collector = s.buildings.collector;
    if (!collector.built) return s;
    const cost = { scrap: 20, parts: 5 };
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(cost)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    return { 
      resources: res, 
      buildings: { ...s.buildings, collector: { ...collector, level: collector.level + 1 } }
    };
  }),

  scavengeWoodOutside: () => set(s => {
    const TicksCost = 90; // 3 hours
    if (s.hero.energy < 20) return s; // Not enough energy

    // Fast forward time
    const cyclePos  = s.tick % TOTAL_CYCLE;
    const inDay     = cyclePos < DAY_TICKS;
    const remaining = inDay ? Math.min(TicksCost, DAY_TICKS - cyclePos) : Math.min(TicksCost, TOTAL_CYCLE - cyclePos);
    
    // Decrease energy drastically
    const hero = { ...s.hero, energy: Math.max(0, s.hero.energy - 35) };
    
    // Loot
    const lootWood = 2 + Math.floor(Math.random() * 4);
    const lootChips = 5 + Math.floor(Math.random() * 10);
    const resources = { ...s.resources, wood: (s.resources.wood ?? 0) + lootWood, chips: (s.resources.chips ?? 0) + lootChips };
    
    // Weather effects if bad weather
    const stats = { ...s.stats };
    if (s.phase === 'night' && (s.weather === 'frost' || s.weather === 'storm')) {
      stats.health = Math.max(0, stats.health - 15);
      stats.heat = Math.max(0, stats.heat - 20);
    }

    const messages = [{ id: Date.now(), text: `Návrat z výpravy: +${lootWood} dřevo, +${lootChips} štěpky (-3 hodiny).`, type: 'loot' }, ...s.messages].slice(0, 12);

    return { 
      tick: s.tick + remaining,
      hero, resources, stats, messages
    };
  }),

  skipPhase: () => set(s => {
    const cyclePos  = s.tick % TOTAL_CYCLE;
    const inDay     = cyclePos < DAY_TICKS;
    const remaining = inDay ? DAY_TICKS - cyclePos : TOTAL_CYCLE - cyclePos;
    const stats     = { ...s.stats };
    const { greenhouse } = s.buildings;
    stats.food  = Math.max(0, stats.food  - (greenhouse.built ? 0.015 : 0.03) * remaining);
    stats.water = Math.max(0, stats.water - 0.015 * remaining);
    const hero      = { ...s.hero };
    hero.energy = inDay ? Math.max(0, hero.energy - 0.015 * remaining) : Math.min(100, hero.energy + 0.04 * remaining);
    const newTick     = s.tick + remaining;
    const newCyclePos = newTick % TOTAL_CYCLE;
    const newPhase    = newCyclePos < DAY_TICKS ? 'day' : 'night';
    const dayNumber   = s.dayNumber + (inDay ? 0 : 1);
    const timeOfDay   = newPhase === 'day'
      ? 360 + Math.floor((newCyclePos / DAY_TICKS) * 960)
      : (1320 + Math.floor(((newCyclePos - DAY_TICKS) / NIGHT_TICKS) * 480)) % 1440;
    return { tick: newTick, phase: newPhase, timeOfDay, dayNumber, stats, hero,
      messages: [{ id: Date.now(), text: inDay ? 'Den přeskočen.' : 'Noc přeskočena.', type: 'info' }, ...s.messages].slice(0, 12),
      nightLootGiven: false };
  }),

  // ─── HERNÍ TICK ────────────────────────────────────────────────────────────
  gameTick: () => set(s => {
    if (s.paused) return s;

    const tick         = s.tick + 1;
    const cyclePos     = tick % TOTAL_CYCLE;
    const prevCyclePos = (tick - 1) % TOTAL_CYCLE;
    const phase        = cyclePos     < DAY_TICKS ? 'day' : 'night';
    const prevPhase    = prevCyclePos < DAY_TICKS ? 'day' : 'night';
    const phaseJustChanged = phase !== prevPhase;

    const timeOfDay = phase === 'day'
      ? 360 + Math.floor((cyclePos / DAY_TICKS) * 960)
      : (1320 + Math.floor(((cyclePos - DAY_TICKS) / NIGHT_TICKS) * 480)) % 1440;

    const dayNumber = s.dayNumber + (cyclePos === 0 ? 1 : 0);
    let techPhase = s.techPhase;
    for (const tp of TECH_PHASE_LABELS) {
      if (dayNumber >= tp.fromDay && techPhase < tp.phase) techPhase = tp.phase;
    }

    // Mutable state
    const messages      = [...s.messages];
    const radioMessages = [...s.radioMessages];
    let inventory       = [...s.inventory];
    let resources       = { ...s.resources };
    let nadia           = { ...s.nadia };
    let hero            = { ...s.hero };
    let weather         = s.weather;
    let nightLootGiven  = s.nightLootGiven;
    let reservoirWater  = s.reservoirWater;
    let rain            = { ...s.rain };
    let stats           = { ...s.stats };
    const newPipes      = { ...s.pipes };
    let valves          = { ...s.valves };

    // ── KOTEL — termostatika ─────────────────────────────────────────────────
    const boiler  = { ...s.buildings.boiler };
    const fuelDef = boiler.fuelType ? FUEL_TYPES[boiler.fuelType] : null;

    if (boiler.fuelTimer > 0 && fuelDef) {
      boiler.temp     = Math.min(350, boiler.temp + fuelDef.heatPerTick);
      boiler.fuelTimer = Math.max(0, boiler.fuelTimer - 1);
      if (boiler.fuelTimer === 0) boiler.fuelType = null;
    } else {
      boiler.temp = Math.max(AMBIENT_TEMP, boiler.temp - 0.5);
    }

    // Zanášení (scale)
    if (tick % 20 === 0 && boiler.fuelTimer > 0) boiler.scale = Math.min(100, (boiler.scale ?? 0) + 0.5);

    // Odpaření vody a tlak
    const scaleEff = 1 - (boiler.scale ?? 0) * 0.005;
    if (boiler.temp > 100 && boiler.water > 0) {
      const evapRate   = 0.04 * (1 + (boiler.temp - 100) / 200);
      boiler.water     = Math.max(0, boiler.water - evapRate);
      const pressGain  = (boiler.temp - 100) * 0.003 * scaleEff;
      boiler.pressure  = Math.min(15, boiler.pressure + pressGain);
    }
    // Coal extra pressure kick
    if (boiler.fuelType === 'coal' && boiler.temp > 160) {
      boiler.pressure = Math.min(15, boiler.pressure + 0.025);
    }
    // Přirozený pokles tlaku
    boiler.pressure = Math.max(0, boiler.pressure - 0.018);

    // Integrita a poškození
    if (boiler.pressure > 12) boiler.integrity = Math.max(0, (boiler.integrity ?? 100) - 0.2);
    if (boiler.water === 0 && boiler.temp > 200) boiler.integrity = Math.max(0, (boiler.integrity ?? 100) - 0.5);

    // ── ROZDĚLOVAČ PÁRY — odběr per větev ───────────────────────────────────
    const boilerActive = boiler.temp > 100 && boiler.pressure > 0.5;

    // Definice větví: [id, tlakOdběr/tick, kondenzace, efekt]
    const BRANCHES = [
      { id: 'heating',      cost: 0.04, cond: 0.035, label: 'Topení',    alwaysBuilt: true  },
      { id: 'dynamo',       cost: 0.06, cond: 0.040, label: 'Dynamo',    alwaysBuilt: false },
      { id: 'collector',    cost: 0.02, cond: 0.060, label: 'Sběrač',    alwaysBuilt: false },
      { id: 'distillery',   cost: 0.05, cond: 0.080, label: 'Destilérka',alwaysBuilt: false },
      { id: 'greenhouse',   cost: 0.03, cond: 0.020, label: 'Pěstírna',  alwaysBuilt: false },
      { id: 'workshop',     cost: 0.02, cond: 0.000, label: 'Dílna',     alwaysBuilt: false },
      { id: 'defense_vent', cost: 0.20, cond: 0.000, label: 'Odfuk',     alwaysBuilt: false },
    ];

    // Spočítej celkový odběr otevřených ventilů
    let totalDrop   = 0;
    const branchDrop = {};
    for (const br of BRANCHES) {
      const isBuilt = br.alwaysBuilt || s.buildings[br.id]?.built;
      const isOpen  = valves[br.id];
      if (boilerActive && isOpen && isBuilt) {
        branchDrop[br.id] = br.cost;
        totalDrop += br.cost;
      } else {
        branchDrop[br.id] = 0;
      }
    }

    // Distributor pressure = co dorazí do rozdělovače (po odporu od kotle)
    const distributorPressure = boilerActive ? Math.max(0, boiler.pressure - 0.3) : 0;

    if (boilerActive && totalDrop > 0) {
      if (boiler.pressure >= totalDrop) {
        boiler.pressure -= totalDrop;
      } else {
        boiler.pressure = Math.max(0, boiler.pressure * 0.85);
      }
      // Efekty aktivních větví
      if (branchDrop.heating   > 0) { stats.heat  = Math.min(100, stats.heat  + 0.06); }
      if (branchDrop.dynamo    > 0 && s.buildings.dynamo.built)    { stats.power = Math.min(100, stats.power + 0.08); }
      if (branchDrop.collector > 0 && s.buildings.collector.built) { stats.water = Math.min(100, stats.water + 0.03); }
      if (branchDrop.distillery> 0 && s.buildings.distillery.built){ stats.water = Math.min(100, stats.water + 0.05); }
      if (branchDrop.greenhouse> 0 && s.buildings.greenhouse.built){ stats.food  = Math.min(100, stats.food  + 0.02); }

      // Kondenzace → sudy
      let condensation = 0;
      for (const br of BRANCHES) condensation += (branchDrop[br.id] ?? 0) > 0 ? br.cond : 0;
      reservoirWater = Math.min(s.waterBarrels * 100, reservoirWater + condensation);

      // Odfuk — poškozuje trubku
      if (branchDrop.defense_vent > 0) {
        const defPipe = newPipes['boiler_defense_vent'];
        if (defPipe) {
          defPipe.integrity = Math.max(0, defPipe.integrity - 0.4);
          if (defPipe.integrity === 0) valves.defense_vent = false;
        }
      }
    }

    const boilerPressure = boiler.pressure * scaleEff;

    // ── DÉŠŤ & RÁDIO ─────────────────────────────────────────────────────────
    const maxReservoir = s.waterBarrels * 100;

    if (!rain.isRaining) {
      const next = rain.nextRainIn - 1;
      if (next === 180 && !rain.announced) {
        rain = { ...rain, nextRainIn: next, announced: true };
        radioMessages.unshift({ id: Date.now() + 30, text: 'Tady Lelek... obloha se zatahuje. Za chvíli déšť. Připravte nádoby!', type: 'weather' });
      } else if (next <= 0) {
        rain = { isRaining: true, timeRemaining: 80 + Math.floor(Math.random() * 120), nextRainIn: 0, announced: false };
        radioMessages.unshift({ id: Date.now() + 31, text: 'Déšť začal! Sudy se plní.', type: 'weather' });
      } else {
        rain = { ...rain, nextRainIn: next };
      }
    } else {
      // Plnění sudů během deště
      const colBuilt = s.buildings.collector?.built;
      const colLvl   = s.buildings.collector?.level || 0;
      const rate     = colBuilt ? 0.4 + colLvl * 0.2 : 0.2;
      reservoirWater = Math.min(maxReservoir, reservoirWater + rate);

      const remaining = rain.timeRemaining - 1;
      if (remaining <= 0) {
        rain = { isRaining: false, timeRemaining: 0, nextRainIn: 600 + Math.floor(Math.random() * 800), announced: false };
        radioMessages.unshift({ id: Date.now() + 32, text: 'Déšť přestal. Hlídejte zásobu v sudech.', type: 'info' });
      } else {
        rain = { ...rain, timeRemaining: remaining };
      }
    }

    // Noční kondenzát — malý bonus i bez deště
    if (phaseJustChanged && phase === 'night') reservoirWater = Math.min(maxReservoir, reservoirWater + 5);

    // Atmosférické rádiové zprávy (jednou denně)
    if (tick % DAY_TICKS === Math.floor(DAY_TICKS / 2)) {
      const msg = RADIO_POOL[Math.floor(Math.random() * RADIO_POOL.length)];
      radioMessages.unshift({ id: Date.now() + 40, text: msg, type: 'signal' });
    }

    // ── TRUBKY ──────────────────────────────────────────────────────────────
    const pipeEfficiency = {};

    for (const [pipeId, pipe] of Object.entries(newPipes)) {
      if (!pipe) continue;
      const slot = PIPE_SLOTS[pipeId];
      const mat  = MATERIALS[pipe.material];
      if (!slot || !mat) continue;

      let pressureLoss = slot.segments * mat.resistance;
      if (pipe.isLeaking) pressureLoss *= 1.8;
      const destPressure = Math.max(0, boilerPressure - pressureLoss);
      pipeEfficiency[slot.to] = pipe.integrity > 0 ? Math.min(1.0, destPressure / (NODE_MIN_PRESSURE[slot.to] ?? 1)) : 0;

      let updatedPipe = { ...pipe, pressure: destPressure };
      if (boilerActive) {
        let dmg = mat.degradation;
        if (boilerPressure > mat.maxPressure) dmg *= 3;
        const newIntegrity = Math.max(0, pipe.integrity - dmg);
        const nowLeaking   = newIntegrity < 30;
        if (nowLeaking && !pipe.isLeaking)
          messages.unshift({ id: Date.now() + 50, text: `Trubka ke ${slot.to} začala netěsit! (${Math.round(newIntegrity)} %)`, type: 'warning' });
        if (newIntegrity === 0 && pipe.integrity > 0)
          messages.unshift({ id: Date.now() + 51, text: `Trubka ke ${slot.to} PRASKLA!`, type: 'warning' });
        updatedPipe = { ...updatedPipe, integrity: newIntegrity, isLeaking: nowLeaking };
      }
      newPipes[pipeId] = updatedPipe;
    }

    // ── NADIA ───────────────────────────────────────────────────────────────
    if (dayNumber >= 3 && !nadia.met && phase === 'day') {
      nadia = { ...nadia, met: true, status: 'home' };
      messages.unshift({ id: Date.now() + 10, text: 'Nadia zaklepala na dveře. Kulhá, ale nabídla pomoc s obstaráváním.', type: 'info' });
    }

    if (phaseJustChanged && phase === 'night') {
      weather = rollWeather();
      messages.unshift({ id: Date.now() + 20, text: `${WEATHER_LABELS[weather]} — Nadia vyrazila.`, type: 'info' });
    }

    if (phaseJustChanged && phase === 'night' && nadia.met && nadia.status === 'home') {
      const offer        = nadia.tradeOffer;
      const totalOffered = Object.values(offer).reduce((a, b) => a + b, 0);
      let pendingReturn  = null;
      if (totalOffered > 0 && totalOffered <= nadia.capacity) {
        for (const [k, v] of Object.entries(offer)) resources[k] = Math.max(0, (resources[k] ?? 0) - v);
        pendingReturn = processTrade(offer, nadia.trust);
        messages.unshift({ id: Date.now() + 11, text: 'Nadia odešla — vezme zásoby a přinese výměnu.', type: 'info' });
      } else {
        messages.unshift({ id: Date.now() + 11, text: 'Nadia odešla do města.', type: 'info' });
      }
      nadia = { ...nadia, status: 'out', pendingReturn, tradeOffer: { scrap: 0, wood: 0, coal: 0, parts: 0 } };
    }

    if (phaseJustChanged && phase === 'day' && nadia.met && nadia.status === 'out') {
      const mod  = WEATHER_LOOT_MOD[weather] ?? WEATHER_LOOT_MOD.clear;
      const v    = () => 0.8 + Math.random() * 0.4;
      const loot = {
        scrap: Math.round(BASE_NIGHT_LOOT.scrap * mod.scrap * v()),
        wood:  Math.round(BASE_NIGHT_LOOT.wood  * mod.wood  * v()),
        coal:  Math.round(BASE_NIGHT_LOOT.coal  * mod.coal  * v()),
        parts: Math.round(BASE_NIGHT_LOOT.parts * mod.parts * v()),
        chips: Math.round(BASE_NIGHT_LOOT.chips * v()),
      };
      for (const [k, v2] of Object.entries(loot)) resources[k] = (resources[k] ?? 0) + v2;

      let chemMsg = '';
      if (mod.chemBonus > 0 && Math.random() < mod.chemBonus) {
        resources.chemicals = (resources.chemicals ?? 0) + 1;
        chemMsg = ', +1 chemikálie';
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
        const found    = finds[Math.floor(Math.random() * finds.length)];
        const existing = inventory.find(i => i.key === found.key);
        inventory = existing
          ? inventory.map(i => i.key === found.key ? { ...i, qty: i.qty + 1 } : i)
          : [...inventory, { id: Date.now(), ...found, qty: 1 }];
      }
      const wl = { clear: 'Jasná', frost: 'Mrazivá', rain: 'Deštivá', storm: 'Bouřlivá' }[weather];
      messages.unshift({
        id: Date.now() + 12,
        text: `[${wl}] Nadia: +${loot.scrap} šrot, +${loot.wood} dřevo, +${loot.coal} uhlí, +${loot.chips} štěpky${chemMsg}${tradeMsg}`,
        type: 'loot',
      });
      nadia = { ...nadia, status: 'home', pendingReturn: null, notification: true };
      nightLootGiven = true;
    }

    if (phase === 'night' && !nightLootGiven && !nadia.met) {
      const mod  = WEATHER_LOOT_MOD[weather] ?? WEATHER_LOOT_MOD.clear;
      const v    = () => 0.8 + Math.random() * 0.4;
      const loot = {
        scrap: Math.round(BASE_NIGHT_LOOT.scrap * mod.scrap * v()),
        wood:  Math.round(BASE_NIGHT_LOOT.wood  * mod.wood  * v()),
        chips: Math.round(BASE_NIGHT_LOOT.chips * v()),
      };
      for (const [k, v2] of Object.entries(loot)) resources[k] = (resources[k] ?? 0) + v2;
      nightLootGiven = true;
      messages.unshift({ id: Date.now(), text: `Nasbíral jsi: +${loot.scrap} šrot, +${loot.wood} dřevo, +${loot.chips} štěpky`, type: 'loot' });
    }
    if (phase === 'day' && nightLootGiven && !nadia.met) nightLootGiven = false;

    // Auto-pití ze sudu každou hodinu
    if (tick % 60 === 0 && reservoirWater >= 1 && s.stats.water < 95) {
      reservoirWater = Math.max(0, reservoirWater - 1);
    }

    // ── STATS ───────────────────────────────────────────────────────────────
    const { dynamo, collector, distillery, greenhouse } = s.buildings;

    // Teplo místnosti ← kotelní tlak
    const targetHeat = Math.min(100, boiler.pressure / 5 * 100);
    stats.heat += (targetHeat - stats.heat) * 0.008;
    stats.heat  = Math.max(0, Math.min(100, stats.heat));

    // Jídlo
    stats.food = Math.max(0, stats.food - (greenhouse.built ? 0.03 * (1 - 0.5 * (pipeEfficiency.greenhouse ?? 0)) : 0.03));

    // Pitná voda z kondenzátu
    if (collector.built) stats.water = Math.min(100, stats.water + 0.015 * (pipeEfficiency.collector ?? 0));
    if (distillery.built) stats.water = Math.min(100, stats.water + 0.025 * (pipeEfficiency.distillery ?? 0));
    stats.water = Math.max(0, stats.water - 0.015);

    // Energie
    if (dynamo.built) stats.power = Math.min(100, stats.power + 0.03 * (pipeEfficiency.dynamo ?? 0));
    else              stats.power = Math.max(0, stats.power - 0.01);

    // Zdraví
    const hDecay = (stats.heat < 20 ? 0.05 : 0) + (stats.food < 10 ? 0.08 : 0) + (stats.water < 10 ? 0.06 : 0);
    if (hDecay > 0) stats.health = Math.max(0, stats.health - hDecay);
    else if (stats.heat > 40 && stats.food > 30 && stats.water > 30) stats.health = Math.min(100, stats.health + 0.005);

    // Pavel
    hero.energy = phase === 'day' ? Math.max(0, hero.energy - 0.015) : Math.min(100, hero.energy + 0.04);
    hero.morale = Math.min(100, Math.max(0, hero.morale +
      (stats.heat > 50 ? 0.01 : -0.02) +
      (stats.food > 50 ? 0.005 : stats.food < 15 ? -0.03 : 0) +
      (stats.water > 50 ? 0.005 : stats.water < 15 ? -0.02 : 0) +
      (nadia.met && nadia.status === 'home' ? 0.01 : -0.005)));

    // ── VAROVÁNÍ ────────────────────────────────────────────────────────────
    const pb = s.buildings.boiler;
    if (boiler.temp < 100 && pb.temp >= 100)
      messages.unshift({ id: Date.now() + 1, text: 'Teplota klesla pod 100 °C — pára přestala vznikat.', type: 'warning' });
    if (boiler.pressure > 8 && pb.pressure <= 8)
      messages.unshift({ id: Date.now() + 2, text: '⚠ TLAK V NEBEZPEČNÉ ZÓNĚ (>8 bar)! Vypusťte ventil nebo uberte palivo!', type: 'warning' });
    if (boiler.water < 10 && pb.water >= 10)
      messages.unshift({ id: Date.now() + 3, text: 'Hladina vody v kotli kritická! Přečerpejte ze sudu.', type: 'warning' });
    if (boiler.water === 0 && pb.water > 0)
      messages.unshift({ id: Date.now() + 4, text: 'KOTEL BEZ VODY — dochází k poškození!', type: 'warning' });
    if (boiler.scale >= 40 && (pb.scale ?? 0) < 40)
      messages.unshift({ id: Date.now() + 5, text: 'Kotel se zanáší — výkon klesá. Vyčisti chemikáliemi.', type: 'warning' });
    if (stats.water < 15 && s.stats.water >= 15)
      messages.unshift({ id: Date.now() + 6, text: 'Dochází pitná voda!', type: 'warning' });
    if (hero.morale < 20 && s.hero.morale >= 20)
      messages.unshift({ id: Date.now() + 7, text: 'Pavel je na dně. Potřebuje teplo a společnost.', type: 'warning' });
    if (techPhase > s.techPhase)
      messages.unshift({ id: Date.now() + 8, text: `Nová fáze: ${TECH_PHASE_LABELS.find(t => t.phase === techPhase)?.label} — nové stavby dostupné!`, type: 'info' });

    return {
      tick, dayNumber, phase, timeOfDay, nightLootGiven, techPhase, weather,
      rain, radioMessages: radioMessages.slice(0, 15),
      stats, hero, nadia, resources, inventory, reservoirWater, pipes: newPipes,
      messages: messages.slice(0, 12),
      buildings: { ...s.buildings, boiler },
      distributorPressure, branchDrop, valves,
    };
  }),
}));
