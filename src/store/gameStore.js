import { create } from 'zustand';

const DAY_TICKS = 480;
const NIGHT_TICKS = 240;
const TOTAL_CYCLE = DAY_TICKS + NIGHT_TICKS;

const NIGHT_LOOT = { scrap: 35, wood: 18, coal: 7, parts: 3 };

// Tech fáze: den → fáze
const TECH_PHASES = [
  { phase: 1, label: 'Teplo',    fromDay: 1  },
  { phase: 2, label: 'Stabilit', fromDay: 4  },
  { phase: 3, label: 'Výživa',   fromDay: 8  },
  { phase: 4, label: 'Výpočet',  fromDay: 15 },
];

// Která budova vyžaduje jakou fázi
export const BUILDING_PHASE = {
  boiler:     1,
  collector:  1,
  dynamo:     2,
  distillery: 2,
  greenhouse: 3,
  workshop:   4,
};

export const TECH_PHASE_LABELS = TECH_PHASES;

// Nadin obchod: co nabídneš → co dostaneš
// Vrací: { resource, qty } nebo null
function processTrade(offer, trust) {
  const mult = 0.5 + trust / 100; // trust 60 → 1.1, trust 100 → 1.5
  const result = {};

  if (offer.scrap > 0) {
    result.coal = Math.max(1, Math.floor((offer.scrap / 5) * mult));
  }
  if (offer.wood > 0) {
    result.scrap = Math.floor(offer.wood * 1.5 * mult);
  }
  if (offer.parts > 0) {
    result.scrap = (result.scrap ?? 0) + Math.floor(offer.parts * 7 * mult);
  }
  if (offer.coal > 0) {
    result.wood = Math.floor(offer.coal * 2);
  }

  return result;
}

export const useGameStore = create((set, get) => ({
  // --- ČAS ---
  tick: 0,
  dayNumber: 1,
  phase: 'day',
  timeOfDay: 360,
  nightLootGiven: false,
  techPhase: 1,

  // --- PAVEL (hlavní hrdina) ---
  hero: {
    name: 'Pavel',
    morale: 70,  // 0–100
    energy: 90,  // 0–100, klesá přes den, obnovuje se v noci
  },

  // --- NADIA ---
  nadia: {
    met: false,
    trust: 60,            // 0–100
    status: 'unknown',   // 'unknown' | 'home' | 'out'
    capacity: 40,         // max jednotek co unese (kulhá)
    tradeOffer: { scrap: 0, wood: 0, coal: 0, parts: 0 },
    pendingReturn: null,  // co přinese zpět
    notification: false,
  },

  // --- STAVY (0–100 float) — reprezentují Pavla + přístřešek ---
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
    collector:  { built: false, level: 0 },
    dynamo:     { built: false, level: 0 },
    distillery: { built: false, level: 0 },
    greenhouse: { built: false, level: 0 },
    workshop:   { built: false, level: 0 },
  },

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

  setActiveModal: (modal) => set({ activeModal: modal }),
  setActiveLeftTab: (tab)  => set({ activeLeftTab: tab }),
  togglePause: () => set(s => ({ paused: !s.paused })),
  toggleFF:    () => set(s => ({ speed: s.speed === 1 ? 5 : 1 })),

  setTradeOffer: (offer) => set(s => ({
    nadia: { ...s.nadia, tradeOffer: { ...s.nadia.tradeOffer, ...offer } },
  })),

  clearNadiaNotification: () => set(s => ({
    nadia: { ...s.nadia, notification: false },
  })),

  skipPhase: () => set(s => {
    const cyclePos = s.tick % TOTAL_CYCLE;
    const inDay = cyclePos < DAY_TICKS;
    const remaining = inDay ? DAY_TICKS - cyclePos : TOTAL_CYCLE - cyclePos;

    const stats = { ...s.stats };
    const { boiler, greenhouse } = s.buildings;
    const boilerActive = boiler.fuel > 0;
    stats.food  = Math.max(0, stats.food  - (greenhouse.built ? 0.015 : 0.03) * remaining);
    stats.water = Math.max(0, stats.water - 0.025 * remaining);
    stats.heat  = Math.min(100, Math.max(0, stats.heat + (boilerActive ? 0.04 : -0.08) * remaining));

    const hero = { ...s.hero };
    if (inDay) {
      hero.energy = Math.max(0, hero.energy - 0.015 * remaining);
    } else {
      hero.energy = Math.min(100, hero.energy + 0.04 * remaining);
    }

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

    return { tick: newTick, phase: newPhase, timeOfDay, dayNumber, stats, hero, messages, nightLootGiven: false };
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

    // Zkontroluj tech fázi
    const requiredPhase = BUILDING_PHASE[name] ?? 1;
    if (s.techPhase < requiredPhase) return s;

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
    const prevCyclePos = (tick - 1) % TOTAL_CYCLE;
    const phase = cyclePos < DAY_TICKS ? 'day' : 'night';
    const prevPhase = prevCyclePos < DAY_TICKS ? 'day' : 'night';
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
    for (const tp of TECH_PHASES) {
      if (dayNumber >= tp.fromDay && techPhase < tp.phase) techPhase = tp.phase;
    }
    if (techPhase > s.techPhase) {
      // Fáze se zvýšila — přidáme zprávu dole
    }

    // Kotel
    const boiler = { ...s.buildings.boiler };
    if (tick % 30 === 0 && boiler.fuel > 0) boiler.fuel = Math.max(0, boiler.fuel - 1);
    const boilerActive = boiler.fuel > 0;

    const { dynamo, collector, distillery, greenhouse } = s.buildings;
    let resources = { ...s.resources };
    let nadia = { ...s.nadia };
    let hero = { ...s.hero };
    let nightLootGiven = s.nightLootGiven;
    const messages = [...s.messages];
    let inventory = [...s.inventory];

    // ── Nadia logika ──────────────────────────────────────────────────────────

    // Den 3: Nadia se poprvé objeví
    if (dayNumber >= 3 && !nadia.met && phase === 'day') {
      nadia = { ...nadia, met: true, status: 'home' };
      messages.unshift({ id: Date.now() + 10, text: 'Nadia zaklepala na dveře. Kulhá, ale nabídla pomoc s obstaráváním.', type: 'info' });
    }

    // Přechod den→noc: Nadia odchází
    if (phaseJustChanged && phase === 'night' && nadia.met && nadia.status === 'home') {
      // Zpracuj trade nabídku
      const offer = nadia.tradeOffer;
      const totalOffered = Object.values(offer).reduce((a, b) => a + b, 0);

      let pendingReturn = null;
      if (totalOffered > 0 && totalOffered <= nadia.capacity) {
        // Odečti nabídnuté suroviny
        for (const [k, v] of Object.entries(offer)) {
          resources[k] = Math.max(0, (resources[k] ?? 0) - v);
        }
        pendingReturn = processTrade(offer, nadia.trust);
        messages.unshift({ id: Date.now() + 11, text: `Nadia odešla — vezme tvoji nabídku a přinese zásoby.`, type: 'info' });
      } else if (totalOffered > nadia.capacity) {
        messages.unshift({ id: Date.now() + 11, text: `Nabídka je příliš těžká pro Nadiu (max ${nadia.capacity} j.). Snižte množství.`, type: 'warning' });
      } else {
        messages.unshift({ id: Date.now() + 11, text: 'Nadia odešla do města — přinese co najde.', type: 'info' });
      }

      nadia = { ...nadia, status: 'out', pendingReturn, tradeOffer: { scrap: 0, wood: 0, coal: 0, parts: 0 } };
    }

    // Přechod noc→den: Nadia se vrací + noční loot
    if (phaseJustChanged && phase === 'day' && nadia.met && nadia.status === 'out') {
      const v = () => 0.8 + Math.random() * 0.4;
      const loot = {
        scrap: Math.round(NIGHT_LOOT.scrap * v()),
        wood:  Math.round(NIGHT_LOOT.wood  * v()),
        coal:  Math.round(NIGHT_LOOT.coal  * v()),
        parts: Math.round(NIGHT_LOOT.parts * v()),
      };
      const waterGain = Math.round(8 * v());

      for (const [k, v2] of Object.entries(loot)) resources[k] = (resources[k] ?? 0) + v2;

      // Obchodní return
      let tradeMsg = '';
      if (nadia.pendingReturn) {
        for (const [k, v2] of Object.entries(nadia.pendingReturn)) {
          resources[k] = (resources[k] ?? 0) + v2;
        }
        const traded = Object.entries(nadia.pendingReturn).map(([k, v2]) => `+${v2} ${k}`).join(', ');
        tradeMsg = ` | Obchod: ${traded}`;
        nadia = { ...nadia, trust: Math.min(100, nadia.trust + 2) };
      }

      // Náhodný předmět
      const findRoll = Math.random();
      if (findRoll > 0.5) {
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

      messages.unshift({
        id: Date.now() + 12,
        text: `Nadia se vrátila: +${loot.scrap} šrot, +${loot.wood} dřevo, +${loot.coal} uhlí, +${loot.parts} součástky, +${waterGain} vody${tradeMsg}`,
        type: 'loot',
        waterGain,
      });

      nadia = { ...nadia, status: 'home', pendingReturn: null, notification: true };
      nightLootGiven = true;
    }

    // Fallback noční loot bez Nadie
    if (phase === 'night' && !nightLootGiven && !nadia.met) {
      const v = () => 0.8 + Math.random() * 0.4;
      const loot = {
        scrap: Math.round(NIGHT_LOOT.scrap * v()),
        wood:  Math.round(NIGHT_LOOT.wood  * v()),
        coal:  Math.round(NIGHT_LOOT.coal  * v()),
        parts: Math.round(NIGHT_LOOT.parts * v()),
      };
      for (const [k, v2] of Object.entries(loot)) resources[k] = (resources[k] ?? 0) + v2;
      nightLootGiven = true;
      messages.unshift({ id: Date.now(), text: `Nachals zásoby venku: +${loot.scrap} šrot, +${loot.wood} dřevo, +${loot.coal} uhlí, +${loot.parts} součástky`, type: 'loot' });
    }
    if (phase === 'day' && nightLootGiven && !nadia.met) nightLootGiven = false;

    // Waterový loot z logu
    const lootWater = (messages[0]?.waterGain && phaseJustChanged && phase === 'day') ? messages[0].waterGain : 0;

    // ── Stats ─────────────────────────────────────────────────────────────────

    const stats = { ...s.stats };

    // TEPLO
    stats.heat = boilerActive
      ? Math.min(100, stats.heat + 0.04)
      : Math.max(0,   stats.heat - 0.08);

    // JÍDLO
    stats.food = Math.max(0, stats.food - (greenhouse.built ? 0.015 : 0.03));

    // VODA
    const waterSources =
      (collector.built  && boilerActive ? 0.02  : 0) +
      (distillery.built && boilerActive ? 0.035 : 0);
    stats.water = Math.min(100, Math.max(0, stats.water + waterSources - 0.025 + lootWater));

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

    // ── Pavel ─────────────────────────────────────────────────────────────────

    // Energie: klesá přes den, obnovuje se v noci
    if (phase === 'day') {
      hero.energy = Math.max(0, hero.energy - 0.015);
    } else {
      hero.energy = Math.min(100, hero.energy + 0.04);
    }

    // Morálka
    const moraleDelta =
      (stats.heat  > 50 ? 0.01 : -0.02) +
      (stats.food  > 50 ? 0.005 : (stats.food < 15 ? -0.03 : 0)) +
      (stats.water > 50 ? 0.005 : (stats.water < 15 ? -0.02 : 0)) +
      (nadia.met && nadia.status === 'home' ? 0.01 : -0.005);
    hero.morale = Math.min(100, Math.max(0, hero.morale + moraleDelta));

    // ── Varování ──────────────────────────────────────────────────────────────

    if (boiler.fuel === 10 && s.buildings.boiler.fuel > 10) {
      messages.unshift({ id: Date.now() + 1, text: 'Kotel má málo paliva! Přiložte.', type: 'warning' });
    }
    if (!boilerActive && s.buildings.boiler.fuel > 0) {
      messages.unshift({ id: Date.now() + 2, text: 'Kotel zhasl! Teplo začíná klesat.', type: 'warning' });
    }
    if (stats.water < 15 && s.stats.water >= 15) {
      messages.unshift({ id: Date.now() + 3, text: 'Dochází voda! Postav sběrač kondenzátu.', type: 'warning' });
    }
    if (hero.morale < 20 && s.hero.morale >= 20) {
      messages.unshift({ id: Date.now() + 4, text: 'Pavel je na dně. Potřebuje teplo, jídlo a společnost.', type: 'warning' });
    }
    if (techPhase > s.techPhase) {
      messages.unshift({ id: Date.now() + 5, text: `Nová fáze odemčena: ${TECH_PHASES.find(t => t.phase === techPhase)?.label} — nové stavby dostupné.`, type: 'info' });
    }

    return {
      tick, dayNumber, phase, timeOfDay, nightLootGiven, techPhase,
      stats, hero, nadia, resources, inventory,
      messages: messages.slice(0, 12),
      buildings: { ...s.buildings, boiler },
    };
  }),
}));
