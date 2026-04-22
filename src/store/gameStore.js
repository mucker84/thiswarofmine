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
  rain: { isRaining: false, timeRemaining: 0, nextRainIn: 350, announced: false },
  radioMessages: [
    { id: 1, text: 'Tady Lelek... Dobrý večer. Teploty klesají, mějte kotel v chodu.', type: 'weather' },
    { id: 2, text: '— Milá zásilka ztroskotala na cestě. Marně čekáme. —', type: 'signal' },
  ],

  // --- POSTAVY ---
  hero:  { name: 'Pavel', morale: 70, energy: 90 },
  nadia: { met: false, trust: 60, status: 'unknown', capacity: 40,
           tradeOffer: { scrap: 0, wood: 0, coal: 0, parts: 0 },
           pendingReturn: null, notification: false },

  // --- STAVY ---
  stats: { health: 82, food: 70, heat: 15, water: 65, power: 40 },

  // --- SUROVINY ---
  resources: { scrap: 80, wood: 25, coal: 8, parts: 5, gaskets: 4, chemicals: 0, chips: 40 },

  // --- ZÁSOBNÍK VODY (sudy) ---
  reservoirWater: 40,

  // --- BUDOVY ---
  buildings: {
    boiler: {
      built: true, level: 1,
      temp: 18,        // °C
      pressure: 0,     // bar (0-15)
      water: 55,       // litrů interní zásoby (0-100)
      integrity: 100,
      fuelType: null,
      fuelTimer: 0,
      scale: 0,
    },
    collector:  { built: false, level: 0 },
    dynamo:     { built: false, level: 0 },
    distillery: { built: false, level: 0 },
    greenhouse: { built: false, level: 0 },
    workshop:   { built: false, level: 0 },
  },

  // --- TRUBKY ---
  pipes: {},

  // --- LOG & INVENTÁŘ ---
  messages: [],
  inventory: [],

  // --- ÚKOLY ---
  tasks: [
    { id: 1, text: 'Přiložit do kotle (dřevo nebo štěpky)',    done: false },
    { id: 2, text: 'Dočkat se teploty nad 100 °C',             done: false },
    { id: 3, text: 'Udržet tlak v ideální zóně 2–5 bar',       done: false },
    { id: 4, text: 'Přečerpat vodu ze sudu do kotle',          done: false },
    { id: 5, text: 'Postavit sběrač dešťové vody',             done: false },
  ],

  // --- UI ---
  activeModal: null, activeLeftTab: 'tasks', paused: false, speed: 1,

  // ─── AKCE ──────────────────────────────────────────────────────────────────

  setActiveModal:   (m) => set({ activeModal: m }),
  setActiveLeftTab: (t) => set({ activeLeftTab: t }),
  togglePause:      ()  => set(s => ({ paused: !s.paused })),
  toggleFF:         ()  => set(s => ({ speed: s.speed === 1 ? 5 : 1 })),
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
    const costs = {
      collector:  { scrap: 15 },
      dynamo:     { scrap: 50, parts: 10 },
      distillery: { scrap: 30, parts: 8, wood: 10 },
      greenhouse: { wood: 30, scrap: 15 },
      workshop:   { scrap: 40, wood: 20, parts: 8 },
    };
    const cost = costs[name];
    if (!cost || s.techPhase < (BUILDING_PHASE[name] ?? 1)) return s;
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(cost)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    const pipeId   = `boiler_${name}`;
    const newPipes = { ...s.pipes };
    if (PIPE_SLOTS[pipeId] && !newPipes[pipeId]) newPipes[pipeId] = newWoodPipe();
    return { resources: res, buildings: { ...s.buildings, [name]: { built: true, level: 1 } }, pipes: newPipes };
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

    // Integrity poškození
    if (boiler.pressure > 12) boiler.integrity = Math.max(0, (boiler.integrity ?? 100) - 0.2);
    if (boiler.water === 0 && boiler.temp > 200) boiler.integrity = Math.max(0, (boiler.integrity ?? 100) - 0.5);

    const boilerPressure = boiler.pressure * scaleEff;
    const boilerActive   = boiler.temp > 100 && boiler.pressure > 0;

    // ── DÉŠŤ & RÁDIO ─────────────────────────────────────────────────────────
    if (rain.nextRainIn > 0) {
      rain = { ...rain, nextRainIn: rain.nextRainIn - 1 };
      if (rain.nextRainIn === 180 && !rain.announced) {
        rain = { ...rain, announced: true };
        radioMessages.unshift({ id: Date.now() + 30, text: 'Tady Lelek... obloha se zatahuje. Za 3 minuty déšť. Připravte nádoby!', type: 'weather' });
      }
    } else if (rain.nextRainIn === 0 && !rain.isRaining) {
      rain = { ...rain, isRaining: true, timeRemaining: 60 + Math.floor(Math.random() * 120), nextRainIn: -1 };
      radioMessages.unshift({ id: Date.now() + 31, text: 'Déšť začal. Sudy se plní.', type: 'weather' });
    }

    if (rain.isRaining) {
      const rate = s.buildings.collector?.built ? 0.5 : 0.15;
      reservoirWater = Math.min(200, reservoirWater + rate);
      rain = { ...rain, timeRemaining: rain.timeRemaining - 1 };
      if (rain.timeRemaining <= 0) {
        rain = { ...rain, isRaining: false, announced: false, nextRainIn: 1200 + Math.floor(Math.random() * 1200) };
        radioMessages.unshift({ id: Date.now() + 32, text: 'Déšť přestal. Dobré zásoby — hlídejte hladinu sudu.', type: 'info' });
      }
    }

    // Noční kondenzát (základní, bez kolektoru)
    if (phaseJustChanged && phase === 'night') reservoirWater = Math.min(200, reservoirWater + 4);

    // Atmosférické rádiové zprávy (jednou denně)
    if (tick % DAY_TICKS === Math.floor(DAY_TICKS / 2)) {
      const msg = RADIO_POOL[Math.floor(Math.random() * RADIO_POOL.length)];
      radioMessages.unshift({ id: Date.now() + 40, text: msg, type: 'signal' });
    }

    // ── TRUBKY ──────────────────────────────────────────────────────────────
    const newPipes       = { ...s.pipes };
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
    const stats = { ...s.stats };
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
    };
  }),
}));
