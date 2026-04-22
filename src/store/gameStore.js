import { create } from 'zustand';

const DAY_TICKS = 480;
const NIGHT_TICKS = 240;
const TOTAL_CYCLE = DAY_TICKS + NIGHT_TICKS;

// Noc přinese suroviny + trochu vody
const NIGHT_LOOT = { scrap: 40, wood: 20, coal: 8, parts: 4, water: 8 };

export const useGameStore = create((set, get) => ({
  // --- ČAS ---
  tick: 0,
  dayNumber: 1,
  phase: 'day',
  timeOfDay: 360,
  nightLootGiven: false,

  // --- STAVY (0–100 float) ---
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
    boiler:    { built: true,  level: 1, fuel: 24 },
    dynamo:    { built: false, level: 0 },
    collector: { built: false, level: 0 }, // Sběrač kondenzátu — levný, voda ze páry kotle
    distillery:{ built: false, level: 0 }, // Destilérka — pokročilejší, více vody, závisí na kotli
    greenhouse:{ built: false, level: 0 },
    workshop:  { built: false, level: 0 },
  },

  // --- LOG ---
  messages: [],

  // --- INVENTÁŘ (nalezené předměty ze scavengingu) ---
  inventory: [
    // { id, name, qty, icon } — icon je emoji nebo string
  ],

  // --- ÚKOLY ---
  tasks: [
    { id: 1, text: 'Přiložit do kotle', done: false },
    { id: 2, text: 'Postavit sběrač kondenzátu', done: false },
    { id: 3, text: 'Prohledat sutiny', done: true },
  ],

  // --- UI ---
  activeModal: null,
  activeLeftTab: 'tasks',
  paused: false,
  speed: 1, // 1 = normální, 5 = FF

  // ─── AKCE ──────────────────────────────────────────────────────────────────

  setActiveModal: (modal) => set({ activeModal: modal }),
  setActiveLeftTab: (tab)  => set({ activeLeftTab: tab }),
  togglePause: () => set(s => ({ paused: !s.paused })),
  toggleFF:    () => set(s => ({ speed: s.speed === 1 ? 5 : 1 })),

  // Přeskočí zbytek aktuální fáze (den → noc, noc → nový den)
  skipPhase: () => set(s => {
    const cyclePos = s.tick % TOTAL_CYCLE;
    const inDay = cyclePos < DAY_TICKS;
    const remaining = inDay ? DAY_TICKS - cyclePos : TOTAL_CYCLE - cyclePos;

    // Proporcionální decay za přeskočený čas
    const stats = { ...s.stats };
    const { boiler, greenhouse } = s.buildings;
    const boilerActive = boiler.fuel > 0;
    const foodDecay  = (greenhouse.built ? 0.015 : 0.03) * remaining;
    const waterDecay = 0.025 * remaining;
    const heatChange = boilerActive ? 0.04 * remaining : -0.08 * remaining;
    stats.food  = Math.max(0, stats.food  - foodDecay);
    stats.water = Math.max(0, stats.water - waterDecay);
    stats.heat  = Math.min(100, Math.max(0, stats.heat + heatChange));

    const newTick = s.tick + remaining;
    const newCyclePos = newTick % TOTAL_CYCLE;
    const newPhase = newCyclePos < DAY_TICKS ? 'day' : 'night';
    const dayNumber = s.dayNumber + (inDay ? 0 : 1);

    let timeOfDay;
    if (newPhase === 'day') {
      timeOfDay = 360 + Math.floor((newCyclePos / DAY_TICKS) * 960);
    } else {
      timeOfDay = (1320 + Math.floor(((newCyclePos - DAY_TICKS) / NIGHT_TICKS) * 480)) % 1440;
    }

    const label = inDay ? 'Den přeskočen — nastává noc.' : 'Noc přeskočena — nový den.';
    const messages = [{ id: Date.now(), text: label, type: 'info' }, ...s.messages].slice(0, 10);

    return { tick: newTick, phase: newPhase, timeOfDay, dayNumber, stats, messages, nightLootGiven: false };
  }),
  toggleTask:  (id)        => set(s => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t),
  })),

  addMessage: (text, type = 'info') => set(s => ({
    messages: [{ id: Date.now(), text, type }, ...s.messages].slice(0, 10),
  })),

  // Přiložit uhlí: 1 uhlí → +10 paliva
  stokeCoal: () => set(s => {
    if (s.resources.coal < 1) return s;
    return {
      resources: { ...s.resources, coal: s.resources.coal - 1 },
      buildings: { ...s.buildings, boiler: { ...s.buildings.boiler, fuel: Math.min(s.buildings.boiler.fuel + 10, 100) } },
    };
  }),

  // Přiložit dřevo: 2 dřevo → +6 paliva (méně efektivní)
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

  // ─── HERNÍ TICK ────────────────────────────────────────────────────────────

  gameTick: () => set(s => {
    if (s.paused) return s;

    const tick = s.tick + 1;
    const cyclePos = tick % TOTAL_CYCLE;

    const phase = cyclePos < DAY_TICKS ? 'day' : 'night';

    let timeOfDay;
    if (phase === 'day') {
      timeOfDay = 360 + Math.floor((cyclePos / DAY_TICKS) * 960);
    } else {
      timeOfDay = (1320 + Math.floor(((cyclePos - DAY_TICKS) / NIGHT_TICKS) * 480)) % 1440;
    }

    const dayNumber = s.dayNumber + (cyclePos === 0 ? 1 : 0);

    // Kotel: -1 palivo každých 30 tiků
    const boiler = { ...s.buildings.boiler };
    if (tick % 30 === 0 && boiler.fuel > 0) {
      boiler.fuel = Math.max(0, boiler.fuel - 1);
    }
    const boilerActive = boiler.fuel > 0;
    const { dynamo, collector, distillery, greenhouse } = s.buildings;

    // Noční loot
    let nightLootGiven = s.nightLootGiven;
    const messages = [...s.messages];
    let resources = { ...s.resources };

    if (phase === 'night' && !nightLootGiven) {
      const v = () => 0.8 + Math.random() * 0.4;
      const loot = {
        scrap: Math.round(NIGHT_LOOT.scrap * v()),
        wood:  Math.round(NIGHT_LOOT.wood  * v()),
        coal:  Math.round(NIGHT_LOOT.coal  * v()),
        parts: Math.round(NIGHT_LOOT.parts * v()),
      };
      const waterGain = Math.round(NIGHT_LOOT.water * v());
      resources = {
        scrap: resources.scrap + loot.scrap,
        wood:  resources.wood  + loot.wood,
        coal:  resources.coal  + loot.coal,
        parts: resources.parts + loot.parts,
      };

      // Občas nalezené předměty v inventáři
      const findRoll = Math.random();
      let newInventory = [...s.inventory];
      if (findRoll > 0.4) {
        const finds = [
          { name: 'Lékárnička', icon: '🩹', key: 'medkit' },
          { name: 'Konzerva',   icon: '🥫', key: 'can'    },
          { name: 'Svíčka',     icon: '🕯',  key: 'candle' },
          { name: 'Nůž',        icon: '🔪', key: 'knife'  },
          { name: 'Deka',       icon: '🛏',  key: 'blanket'},
        ];
        const found = finds[Math.floor(Math.random() * finds.length)];
        const existing = newInventory.find(i => i.key === found.key);
        if (existing) {
          newInventory = newInventory.map(i => i.key === found.key ? { ...i, qty: i.qty + 1 } : i);
        } else {
          newInventory = [...newInventory, { id: Date.now(), key: found.key, name: found.name, icon: found.icon, qty: 1 }];
        }
      }

      nightLootGiven = true;
      const findMsg = findRoll > 0.4 ? ` + předmět` : '';
      messages.unshift({
        id: Date.now(),
        text: `Výprava přinesla: +${loot.scrap} šrot, +${loot.wood} dřevo, +${loot.coal} uhlí, +${loot.parts} součástky, +${waterGain} vody${findMsg}`,
        type: 'loot',
        waterGain,
      });

      return {
        tick, dayNumber, phase, timeOfDay, nightLootGiven,
        stats: s.stats, resources,
        messages: messages.slice(0, 10),
        buildings: { ...s.buildings, boiler },
        inventory: newInventory,
      };
    }
    if (phase === 'day' && nightLootGiven) nightLootGiven = false;

    // Zjistit water gain z looту
    const lootWater = (phase === 'night' && messages[0]?.waterGain) ? messages[0].waterGain : 0;

    // Stats
    const stats = { ...s.stats };

    // TEPLO
    stats.heat = boilerActive
      ? Math.min(100, stats.heat + 0.04)
      : Math.max(0,   stats.heat - 0.08);

    // JÍDLO
    stats.food = Math.max(0, stats.food - (greenhouse.built ? 0.015 : 0.03));

    // VODA — zdroje:
    // 1) Sběrač kondenzátu: +0.02/tick když kotel topí
    // 2) Destilérka: +0.035/tick navíc, jen když kotel topí
    // 3) Noční loot: jednorázový boost
    // Bez zdrojů: -0.025/tick
    {
      const waterSources =
        (collector.built  && boilerActive ? 0.02  : 0) +
        (distillery.built && boilerActive ? 0.035 : 0);
      const waterDecay = 0.025;
      const net = waterSources - waterDecay;
      stats.water = Math.min(100, Math.max(0, stats.water + net + lootWater));
    }

    // ENERGIE
    stats.power = dynamo.built
      ? Math.min(100, stats.power + 0.03)
      : Math.max(0,   stats.power - 0.01);

    // ZDRAVÍ
    const hDecay =
      (stats.heat  < 20 ? 0.05 : 0) +
      (stats.food  < 10 ? 0.08 : 0) +
      (stats.water < 10 ? 0.06 : 0);
    if (hDecay > 0) {
      stats.health = Math.max(0, stats.health - hDecay);
    } else if (stats.heat > 40 && stats.food > 30 && stats.water > 30) {
      stats.health = Math.min(100, stats.health + 0.005);
    }

    // Varování — jen při přechodu
    if (boiler.fuel === 10 && s.buildings.boiler.fuel > 10) {
      messages.unshift({ id: Date.now() + 1, text: 'Kotel má málo paliva! Přiložte.', type: 'warning' });
    }
    if (!boilerActive && s.buildings.boiler.fuel > 0) {
      messages.unshift({ id: Date.now() + 2, text: 'Kotel zhasl! Teplo začíná klesat.', type: 'warning' });
    }
    if (stats.water < 15 && s.stats.water >= 15) {
      messages.unshift({ id: Date.now() + 3, text: 'Dochází voda! Postavte sběrač kondenzátu.', type: 'warning' });
    }

    return {
      tick, dayNumber, phase, timeOfDay, nightLootGiven,
      stats, resources,
      messages: messages.slice(0, 10),
      buildings: { ...s.buildings, boiler },
    };
  }),
}));
