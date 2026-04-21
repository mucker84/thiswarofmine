import { create } from 'zustand';

// 1 real sekunda = 1 herní minuta
// Den: 480 tiků (8 hodin = 8 real minut)
// Noc: 240 tiků (4 hodiny = 4 real minuty)
const DAY_TICKS = 480;
const NIGHT_TICKS = 240;
const TOTAL_CYCLE = DAY_TICKS + NIGHT_TICKS; // 720 tiků = 12 real minut / cyklus

export const useGameStore = create((set, get) => ({
  // --- ČAS ---
  tick: 0,          // celkový počet tiků od začátku
  dayNumber: 1,
  phase: 'day',     // 'day' | 'night'
  timeOfDay: 360,   // 0–1439 (minuty v 24h), začínáme v 6:00

  // --- STAVY PŘEŽITÍ (0–100) ---
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
  // built: true = postaveno, level: 1/2/3
  buildings: {
    boiler: { built: true, level: 1, fuel: 24 },   // uhlí v kotli
    dynamo: { built: false, level: 0 },
    greenhouse: { built: false, level: 0 },
    distillery: { built: false, level: 0 },
    workshop: { built: false, level: 0 },
  },

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

  // Přiložit uhlí do kotle (přidá 10 jednotek paliva)
  stokeBoiler: () => set(s => {
    const coal = s.resources.coal;
    if (coal < 1) return s;
    return {
      resources: { ...s.resources, coal: coal - 1 },
      buildings: {
        ...s.buildings,
        boiler: { ...s.buildings.boiler, fuel: Math.min(s.buildings.boiler.fuel + 10, 100) },
      },
    };
  }),

  // Postavit budovu za suroviny
  buildBuilding: (name) => set(s => {
    const costs = {
      dynamo:      { scrap: 50, parts: 10 },
      greenhouse:  { wood: 30, scrap: 15 },
      distillery:  { scrap: 20, parts: 5 },
      workshop:    { scrap: 40, wood: 20, parts: 8 },
    };
    const cost = costs[name];
    if (!cost) return s;
    const res = { ...s.resources };
    for (const [item, amount] of Object.entries(cost)) {
      if ((res[item] ?? 0) < amount) return s; // nedostatek surovin
      res[item] -= amount;
    }
    return {
      resources: res,
      buildings: {
        ...s.buildings,
        [name]: { built: true, level: 1, fuel: 0 },
      },
    };
  }),

  // Hlavní herní tick — volaný každou sekundu
  gameTick: () => set(s => {
    if (s.paused) return s;

    const tick = s.tick + 1;
    const cyclePos = tick % TOTAL_CYCLE;

    // Fáze a čas
    const phase = cyclePos < DAY_TICKS ? 'day' : 'night';
    // Den začíná v 6:00 (360 min), noc ve 22:00 (1320 min)
    let timeOfDay;
    if (phase === 'day') {
      timeOfDay = 360 + Math.floor((cyclePos / DAY_TICKS) * 960); // 6:00–22:00
    } else {
      const nightPos = cyclePos - DAY_TICKS;
      timeOfDay = 1320 + Math.floor((nightPos / NIGHT_TICKS) * 480); // 22:00–6:00
      if (timeOfDay >= 1440) timeOfDay -= 1440;
    }

    // Nový den když cyklus restartuje
    const dayNumber = s.dayNumber + (cyclePos === 0 ? 1 : 0);

    // Kotel: spotřebovává 1 palivo každých 30 tiků (30 herních minut)
    const boiler = { ...s.buildings.boiler };
    if (tick % 30 === 0 && boiler.fuel > 0) {
      boiler.fuel = Math.max(0, boiler.fuel - 1);
    }
    const boilerActive = boiler.fuel > 0;

    // Decay statů (každý tick)
    const stats = { ...s.stats };

    // Teplo: klesá 0.05/tick bez kotle, stoupá 0.03/tick s kotlem
    if (boilerActive) {
      stats.heat = Math.min(100, stats.heat + 0.03);
    } else {
      stats.heat = Math.max(0, stats.heat - 0.08);
    }

    // Jídlo: klesá 0.03/tick
    stats.food = Math.max(0, stats.food - 0.03);

    // Voda: klesá 0.025/tick
    stats.water = Math.max(0, stats.water - 0.025);

    // Zdraví: klesá pokud teplo < 20, jídlo < 10, nebo voda < 10
    const healthDecay =
      (stats.heat < 20 ? 0.05 : 0) +
      (stats.food < 10 ? 0.08 : 0) +
      (stats.water < 10 ? 0.06 : 0);
    if (healthDecay > 0) {
      stats.health = Math.max(0, stats.health - healthDecay);
    } else if (stats.heat > 40 && stats.food > 30 && stats.water > 30) {
      // Pomalá regenerace pokud jsou podmínky dobré
      stats.health = Math.min(100, stats.health + 0.005);
    }

    // Energie: dynamo generuje power, jinak klesá
    if (s.buildings.dynamo.built) {
      stats.power = Math.min(100, stats.power + 0.02);
    } else {
      stats.power = Math.max(0, stats.power - 0.01);
    }

    return {
      tick,
      dayNumber,
      phase,
      timeOfDay,
      stats,
      buildings: { ...s.buildings, boiler },
    };
  }),
}));
