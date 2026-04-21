import { create } from 'zustand';

// 1 real sekunda = 1 herní minuta
// Den: 480 tiků (8 hodin), Noc: 240 tiků (4 hodiny)
const DAY_TICKS = 480;
const NIGHT_TICKS = 240;
const TOTAL_CYCLE = DAY_TICKS + NIGHT_TICKS;

// Suroviny přidané automaticky každou noc (scavenging placeholder)
const NIGHT_LOOT = { scrap: 40, wood: 20, coal: 8, parts: 4 };

export const useGameStore = create((set, get) => ({
  // --- ČAS ---
  tick: 0,
  dayNumber: 1,
  phase: 'day',        // 'day' | 'night'
  timeOfDay: 360,      // minuty 0–1439, začínáme v 6:00
  nightLootGiven: false, // aby se loot dal jen jednou za noc

  // --- STAVY PŘEŽITÍ (0–100, float) ---
  stats: {
    health: 82,
    food: 70,
    heat: 60,
    water: 65,
    power: 40,
  },

  // --- SUROVINY ---
  resources: {
    scrap: 312,
    wood: 145,
    coal: 24,
    parts: 12,
  },

  // --- BUDOVY ---
  buildings: {
    boiler:     { built: true,  level: 1, fuel: 24 },
    dynamo:     { built: false, level: 0 },
    greenhouse: { built: false, level: 0 },
    distillery: { built: false, level: 0 },
    workshop:   { built: false, level: 0 },
  },

  // --- ZPRÁVY / LOG ---
  messages: [],   // { id, text, type: 'warning'|'info'|'loot' }

  // --- ÚKOLY ---
  tasks: [
    { id: 1, text: 'Přiložit do kotle', done: false },
    { id: 2, text: 'Nasbírat vodu', done: false },
    { id: 3, text: 'Prohledat sutiny', done: true },
  ],

  // --- UI ---
  activeModal: null,
  activeLeftTab: 'tasks',
  paused: false,

  // --- AKCE ---

  setActiveModal: (modal) => set({ activeModal: modal }),
  setActiveLeftTab: (tab) => set({ activeLeftTab: tab }),
  togglePause: () => set(s => ({ paused: !s.paused })),

  toggleTask: (id) => set(s => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t),
  })),

  addMessage: (text, type = 'info') => set(s => {
    const id = Date.now();
    const messages = [{ id, text, type }, ...s.messages].slice(0, 8);
    return { messages };
  }),

  dismissMessage: (id) => set(s => ({
    messages: s.messages.filter(m => m.id !== id),
  })),

  stokeBoiler: () => set(s => {
    if (s.resources.coal < 1) return s;
    const newFuel = Math.min(s.buildings.boiler.fuel + 10, 100);
    return {
      resources: { ...s.resources, coal: s.resources.coal - 1 },
      buildings: {
        ...s.buildings,
        boiler: { ...s.buildings.boiler, fuel: newFuel },
      },
    };
  }),

  buildBuilding: (name) => set(s => {
    const costs = {
      dynamo:     { scrap: 50, parts: 10 },
      greenhouse: { wood: 30, scrap: 15 },
      distillery: { scrap: 20, parts: 5 },
      workshop:   { scrap: 40, wood: 20, parts: 8 },
    };
    const cost = costs[name];
    if (!cost) return s;
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(cost)) {
      if ((res[item] ?? 0) < amount) return s;
      res[item] -= amount;
    }
    return {
      resources: res,
      buildings: { ...s.buildings, [name]: { built: true, level: 1 } },
    };
  }),

  // Hlavní herní tick
  gameTick: () => set(s => {
    if (s.paused) return s;

    const tick = s.tick + 1;
    const cyclePos = tick % TOTAL_CYCLE;
    const prevCyclePos = (tick - 1) % TOTAL_CYCLE;

    // Fáze
    const phase = cyclePos < DAY_TICKS ? 'day' : 'night';
    const prevPhase = prevCyclePos < DAY_TICKS ? 'day' : 'night';
    const phaseChanged = phase !== prevPhase;

    // Herní čas
    let timeOfDay;
    if (phase === 'day') {
      timeOfDay = 360 + Math.floor((cyclePos / DAY_TICKS) * 960);
    } else {
      const nightPos = cyclePos - DAY_TICKS;
      timeOfDay = (1320 + Math.floor((nightPos / NIGHT_TICKS) * 480)) % 1440;
    }

    // Nový den
    const dayNumber = s.dayNumber + (cyclePos === 0 ? 1 : 0);

    // Kotel: spotřeba 1 palivo každých 30 tiků
    const boiler = { ...s.buildings.boiler };
    if (tick % 30 === 0 && boiler.fuel > 0) {
      boiler.fuel = Math.max(0, boiler.fuel - 1);
    }
    const boilerActive = boiler.fuel > 0;

    // Suroviny
    let resources = { ...s.resources };

    // Noční loot — jednou za noc, na začátku noci
    let nightLootGiven = s.nightLootGiven;
    const messages = [...s.messages];

    if (phase === 'night' && !nightLootGiven) {
      // Variace ±20%
      const variance = () => 0.8 + Math.random() * 0.4;
      const loot = {
        scrap: Math.round(NIGHT_LOOT.scrap * variance()),
        wood:  Math.round(NIGHT_LOOT.wood  * variance()),
        coal:  Math.round(NIGHT_LOOT.coal  * variance()),
        parts: Math.round(NIGHT_LOOT.parts * variance()),
      };
      resources = {
        scrap: resources.scrap + loot.scrap,
        wood:  resources.wood  + loot.wood,
        coal:  resources.coal  + loot.coal,
        parts: resources.parts + loot.parts,
      };
      nightLootGiven = true;
      const id = Date.now();
      messages.unshift({
        id,
        text: `Výprava se vrátila: +${loot.scrap} šrot, +${loot.wood} dřevo, +${loot.coal} uhlí, +${loot.parts} součástky`,
        type: 'loot',
      });
    }

    if (phase === 'day' && nightLootGiven) {
      nightLootGiven = false;
    }

    // Decay statů
    const stats = { ...s.stats };
    const { dynamo, greenhouse, distillery } = s.buildings;

    // TEPLO
    if (boilerActive) {
      stats.heat = Math.min(100, stats.heat + 0.04);
    } else {
      stats.heat = Math.max(0, stats.heat - 0.08);
    }

    // JÍDLO — pěstírna zpomaluje spotřebu
    const foodDecay = greenhouse.built ? 0.015 : 0.03;
    stats.food = Math.max(0, stats.food - foodDecay);

    // VODA — lihovar pomalu vyrábí vodu
    if (distillery.built) {
      stats.water = Math.min(100, stats.water + 0.01);
    } else {
      stats.water = Math.max(0, stats.water - 0.025);
    }

    // ENERGIE — dynamo generuje, jinak klesá
    if (dynamo.built) {
      stats.power = Math.min(100, stats.power + 0.03);
    } else {
      stats.power = Math.max(0, stats.power - 0.01);
    }

    // ZDRAVÍ
    const healthDecay =
      (stats.heat  < 20 ? 0.05 : 0) +
      (stats.food  < 10 ? 0.08 : 0) +
      (stats.water < 10 ? 0.06 : 0);
    if (healthDecay > 0) {
      stats.health = Math.max(0, stats.health - healthDecay);
    } else if (stats.heat > 40 && stats.food > 30 && stats.water > 30) {
      stats.health = Math.min(100, stats.health + 0.005);
    }

    // Varování při nízkém palivu (jednou)
    if (boiler.fuel === 10 && s.buildings.boiler.fuel > 10) {
      const id = Date.now() + 1;
      messages.unshift({ id, text: 'Kotel má málo paliva! Přiložte uhlí.', type: 'warning' });
    }
    if (!boilerActive && s.buildings.boiler.fuel > 0) {
      const id = Date.now() + 2;
      messages.unshift({ id, text: 'Kotel zhasl! Teplo začíná klesat.', type: 'warning' });
    }

    return {
      tick,
      dayNumber,
      phase,
      timeOfDay,
      nightLootGiven,
      stats,
      resources,
      messages: messages.slice(0, 8),
      buildings: { ...s.buildings, boiler },
    };
  }),
}));
