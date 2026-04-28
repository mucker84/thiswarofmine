import React, { useState, useRef, useCallback } from 'react';
import {
  Settings, Heart, Utensils, Flame, Droplets, Zap,
  Hammer, Wrench, Box, Cog, Map, User,
  Wind, CheckSquare, Square, Moon, Sun,
  PauseCircle, PlayCircle, AlertTriangle, Package, Waves,
  FastForward, SkipForward, Building2, TrendingUp, ArrowLeftRight, CloudRain
} from 'lucide-react';
import { useGameStore, BUILDING_PHASE, TECH_PHASE_LABELS, FUEL_TYPES } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { PIPE_COORDS, PIPE_SLOTS, MATERIALS, NODE_MIN_PRESSURE, NODE_LABELS, REPAIR_COST, REPLACE_COST, GASKET_CRAFT_COST } from './data/pipeSystem';
import { Radio } from './components/Radio';

function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─── TOP BAR ────────────────────────────────────────────────────────────────

const StatBar = ({ icon, value, color, label }) => {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const low = pct < 25;
  const critical = pct < 10;
  return (
    <div
      title={label}
      className={`flex items-center space-x-2 px-2 py-1 rounded border transition-colors ${
        critical ? 'bg-red-950/60 border-red-700 animate-pulse' :
        low      ? 'bg-red-950/30 border-red-800/50' :
                   'bg-stone-900/80 border-stone-800'
      }`}
    >
      {icon}
      <div className="w-16 h-3 bg-stone-950 rounded-sm overflow-hidden border border-stone-700 relative">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
          {pct}%
        </span>
      </div>
    </div>
  );
};

const ResourceItem = ({ icon, label, value, low }) => (
  <div className={`flex items-center space-x-1 ${low ? 'text-red-400' : 'text-stone-300'}`} title={label}>
    <span className="text-stone-500">{icon}</span>
    <span className="font-bold tabular-nums">{Math.floor(value)}</span>
  </div>
);

const TopBar = () => {
  const { stats, resources, dayNumber, phase, timeOfDay, paused, speed, togglePause, toggleFF, skipPhase, buildings } = useGameStore();
  const { boiler } = buildings;
  return (
    <div className="flex items-center justify-between bg-stone-950 border-b-2 border-amber-900/50 p-2 text-amber-100 text-base shadow-md z-10 font-mono flex-shrink-0">
      <div className="flex space-x-2 items-center bg-stone-900 px-3 py-1.5 rounded border border-stone-700 text-base">
        <span className="font-bold text-amber-500">DEN {dayNumber}</span>
        <span className="text-stone-400 w-14">{formatTime(timeOfDay)}</span>
        {phase === 'day'
          ? <Sun size={18} className="text-amber-400" />
          : <Moon size={18} className="text-blue-400" />
        }
        {/* Pauza */}
        <button
          onClick={togglePause}
          className={`ml-1 transition ${paused ? 'text-amber-400' : 'text-stone-500 hover:text-amber-400'}`}
          title={paused ? 'Pokračovat' : 'Pauza'}
        >
          {paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
        </button>
        {/* FF 5× */}
        <button
          onClick={toggleFF}
          className={`transition ${speed === 5 ? 'text-amber-400' : 'text-stone-500 hover:text-amber-400'}`}
          title={speed === 5 ? 'Normální rychlost' : 'Rychloposun 5×'}
        >
          <FastForward size={16} />
        </button>
        {speed === 5 && <span className="text-xs text-amber-500 font-bold">5×</span>}
        {paused && <span className="text-xs text-amber-600 animate-pulse">PAUZA</span>}
        {/* Přeskočit fázi */}
        <button
          onClick={skipPhase}
          className="text-stone-600 hover:text-stone-400 transition ml-1"
          title={phase === 'day' ? 'Přeskočit na noc' : 'Přeskočit na den'}
        >
          <SkipForward size={15} />
        </button>
        <span className="text-[10px] text-stone-600">{phase === 'day' ? '→noc' : '→den'}</span>
      </div>

      <div className="flex space-x-3">
        <StatBar label="Zdraví"  icon={<Heart    size={18} className="text-red-500"    />} value={stats.health} color="bg-red-600"    />
        <StatBar label="Jídlo"   icon={<Utensils size={18} className="text-orange-400" />} value={stats.food}   color="bg-orange-500" />
        <StatBar label="Teplo"   icon={<Flame    size={18} className="text-amber-500"  />} value={stats.heat}   color="bg-amber-600"  />
        <StatBar label="Voda"    icon={<Droplets size={18} className="text-blue-400"   />} value={stats.water}  color="bg-blue-500"   />
        <StatBar label="Elektřina" icon={<Zap    size={18} className="text-yellow-400" />} value={stats.power}  color="bg-yellow-500" />
      </div>

      <div className="flex space-x-5 items-center">
        <ResourceItem icon={<Cog  size={15} />} label="Šrot"       value={resources.scrap} />
        <ResourceItem icon={<Box  size={15} />} label="Dřevo"      value={resources.wood}  />
        <ResourceItem icon={<Flame size={15} className="text-orange-600" />} label="Uhlí" value={resources.coal} low={resources.coal < 5} />
        <ResourceItem icon={<span className="text-[11px]">🌿</span>} label="Štěpky"    value={resources.chips ?? 0} low={(resources.chips ?? 0) < 10} />
        <ResourceItem icon={<Wrench size={15} />} label="Součástky" value={resources.parts} />
        <ResourceItem icon={<span className="text-[11px]">⬡</span>} label="Těsnění"    value={resources.gaskets ?? 0} low={(resources.gaskets ?? 0) < 2} />
        <ResourceItem icon={<span className="text-[11px]">⚗</span>} label="Chemikálie" value={resources.chemicals ?? 0} />
        <button className="p-1 hover:bg-stone-800 rounded transition border border-transparent hover:border-stone-600">
          <Settings size={18} className="text-stone-400" />
        </button>
      </div>
    </div>
  );
};

// ─── CRAFTING PANEL ──────────────────────────────────────────────────────────

const CraftingPanel = ({ resources, craftGaskets }) => {
  const canCraftGasket = (resources.scrap ?? 0) >= GASKET_CRAFT_COST.scrap && (resources.wood ?? 0) >= GASKET_CRAFT_COST.wood;

  const LOCKED_RECIPES = [
    { name: 'Obvaz',      icon: '🩹', cost: 'šrot ×5',            desc: 'Obnoví trochu zdraví' },
    { name: 'Svíčka',     icon: '🕯',  cost: 'dřevo ×2',           desc: 'Světlo a teplo' },
    { name: 'Filtr vody', icon: '💧', cost: 'šrot ×10, dřevo ×3', desc: 'Čistí kontaminovanou vodu' },
  ];

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-stone-600 uppercase tracking-wider mb-2">Dostupné recepty</div>

      {/* Těsnění — vždy dostupné */}
      <div className="bg-stone-950 border border-stone-800 rounded p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">⬡</span>
            <span className="text-xs font-bold text-stone-300">Těsnění</span>
          </div>
          <button
            onClick={craftGaskets}
            disabled={!canCraftGasket}
            className="px-2 py-0.5 bg-amber-900/40 border border-amber-700/50 text-amber-300 text-[10px] font-mono rounded hover:bg-amber-900/70 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Vyrobit
          </button>
        </div>
        <div className="text-[10px] text-stone-600">
          {GASKET_CRAFT_COST.scrap}× šrot + {GASKET_CRAFT_COST.wood}× dřevo → 1× těsnění
        </div>
        <div className="text-[10px] text-stone-500 mt-0.5">Nutné pro měděné a ocelové trubky.</div>
        <div className="flex gap-2 mt-1">
          <span className={`text-[9px] ${(resources.scrap ?? 0) >= GASKET_CRAFT_COST.scrap ? 'text-stone-500' : 'text-red-500'}`}>
            šrot: {resources.scrap ?? 0}
          </span>
          <span className={`text-[9px] ${(resources.wood ?? 0) >= GASKET_CRAFT_COST.wood ? 'text-stone-500' : 'text-red-500'}`}>
            dřevo: {resources.wood ?? 0}
          </span>
        </div>
      </div>

      <div className="text-[10px] text-stone-700 uppercase tracking-wider mt-3 mb-1">Vyžaduje dílnu</div>
      {LOCKED_RECIPES.map(r => (
        <div key={r.name} className="bg-stone-950 border border-stone-800/50 rounded p-2 opacity-50">
          <div className="flex items-center gap-2 mb-0.5">
            <span>{r.icon}</span>
            <span className="text-xs font-bold text-stone-500">{r.name}</span>
          </div>
          <div className="text-[10px] text-stone-700">{r.cost}</div>
          <div className="text-[10px] text-stone-700 italic">{r.desc}</div>
        </div>
      ))}
    </div>
  );
};

// ─── LEFT SIDEBAR ────────────────────────────────────────────────────────────

const LeftSidebar = () => {
  const { activeLeftTab, setActiveLeftTab, tasks, toggleTask, messages, radioMessages, inventory, setActiveModal } = useGameStore();

  const TABS = [
    { key: 'tasks',     label: 'Úkoly' },
    { key: 'inventory', label: 'Inv.'  },
    { key: 'log',       label: 'Log'   },
    { key: 'radio',     label: 'Rádio' },
  ];

  // Suroviny jako první řada inventáře
  const { resources } = useGameStore();
  const resourceSlots = [
    { key: 'scrap',     icon: <Cog    size={16} className="text-stone-400"  />, label: 'Šrot',       value: resources.scrap        },
    { key: 'wood',      icon: <Box    size={16} className="text-amber-700"  />, label: 'Dřevo',      value: resources.wood         },
    { key: 'coal',      icon: <Flame  size={16} className="text-orange-600" />, label: 'Uhlí',       value: resources.coal         },
    { key: 'chips',     icon: <span className="text-[13px]">🌿</span>,          label: 'Štěpky',     value: resources.chips   ?? 0 },
    { key: 'parts',     icon: <Wrench size={16} className="text-blue-500"   />, label: 'Součástky',  value: resources.parts        },
    { key: 'gaskets',   icon: <span className="text-[13px]">⬡</span>,           label: 'Těsnění',    value: resources.gaskets  ?? 0 },
    { key: 'chemicals', icon: <span className="text-[13px]">⚗</span>,           label: 'Chemikálie', value: resources.chemicals ?? 0 },
  ];

  return (
    <div className="w-64 bg-stone-900/90 border-r-2 border-amber-900/30 flex shadow-lg flex-col font-mono z-10 h-full flex-shrink-0">
      {/* Akční tlačítka */}
      <div className="flex space-x-2 p-2 border-b border-stone-800">
        <button
          onClick={() => setActiveModal('buildings_overview')}
          className="flex-1 py-2 bg-stone-800 rounded hover:bg-amber-900/40 border border-stone-700 hover:border-amber-700 transition flex items-center justify-center gap-2 group"
          title="Přehled staveb"
        >
          <Building2 size={18} className="text-stone-400 group-hover:text-amber-400" />
          <span className="text-[10px] text-stone-500 group-hover:text-amber-300 uppercase tracking-wider">Stavby</span>
        </button>
        <button
          onClick={() => setActiveLeftTab(activeLeftTab === 'crafting' ? 'radio' : 'crafting')}
          className={`flex-1 py-2 rounded border transition flex items-center justify-center gap-2 group ${
            activeLeftTab === 'crafting'
              ? 'bg-amber-900/30 border-amber-700 text-amber-400'
              : 'bg-stone-800 border-stone-700 hover:border-amber-700 hover:bg-amber-900/20'
          }`}
          title="Crafting (Klikni znovu pro návrat)"
        >
          <Wrench size={18} className={activeLeftTab === 'crafting' ? 'text-amber-400' : 'text-stone-400 group-hover:text-amber-400'} />
          <span className="text-[10px] text-stone-500 group-hover:text-amber-300 uppercase tracking-wider">{activeLeftTab === 'crafting' ? 'Zavřít' : 'Craft'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800 text-xs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`flex-1 py-2 text-center transition ${
              activeLeftTab === key
                ? 'bg-stone-800 text-amber-500 font-bold border-b-2 border-amber-500'
                : 'text-stone-500 hover:bg-stone-800/50'
            }`}
            onClick={() => setActiveLeftTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 flex-1 overflow-y-auto">

        {/* ÚKOLY */}
        {activeLeftTab === 'tasks' && (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="flex items-start space-x-3 cursor-pointer group" onClick={() => toggleTask(task.id)}>
                <div className="mt-0.5 text-amber-600 group-hover:text-amber-400 transition flex-shrink-0">
                  {task.done ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <span className={`text-sm ${task.done ? 'text-stone-600 line-through' : 'text-stone-300 group-hover:text-amber-100'}`}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* INVENTÁŘ */}
        {activeLeftTab === 'inventory' && (
          <div className="space-y-3">
            {/* Suroviny — pevná horní část */}
            <div className="text-[10px] text-stone-600 uppercase tracking-wider">Suroviny</div>
            <div className="grid grid-cols-2 gap-1.5">
              {resourceSlots.map(r => (
                <div
                  key={r.key}
                  className="bg-stone-950 border border-stone-800 rounded p-2 flex items-center gap-2 hover:border-amber-800/50 transition"
                  title={r.label}
                >
                  {r.icon}
                  <div>
                    <div className="text-[9px] text-stone-600">{r.label}</div>
                    <div className="text-sm font-bold text-stone-200 tabular-nums">{r.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Nalezené předměty */}
            <div className="text-[10px] text-stone-600 uppercase tracking-wider mt-2">Předměty</div>
            <div className="grid grid-cols-3 gap-1.5">
              {inventory.map(item => (
                <div
                  key={item.id}
                  className="aspect-square bg-stone-950 border border-stone-800 rounded flex flex-col items-center justify-center hover:border-amber-700/50 transition cursor-pointer p-1"
                  title={item.name}
                >
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span className="text-[9px] text-stone-500 mt-0.5 text-center leading-tight">{item.name}</span>
                  {item.qty > 1 && (
                    <span className="text-[9px] font-bold text-amber-600">×{item.qty}</span>
                  )}
                </div>
              ))}
              {/* Prázdné sloty */}
              {[...Array(Math.max(0, 12 - inventory.length))].map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-stone-950/50 border border-stone-800/50 rounded" />
              ))}
            </div>
          </div>
        )}

        {/* LOG */}
        {activeLeftTab === 'log' && (
          <div className="space-y-2">
            {messages.length === 0 && <p className="text-stone-600 text-xs">Zatím žádné záznamy.</p>}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`text-xs p-2 rounded border leading-snug ${
                  msg.type === 'warning' ? 'bg-red-950/50 border-red-800 text-red-300' :
                  msg.type === 'loot'    ? 'bg-green-950/50 border-green-800 text-green-300' :
                                          'bg-stone-950 border-stone-800 text-stone-400'
                }`}
              >
                {msg.type === 'warning' && <AlertTriangle size={10} className="inline mr-1" />}
                {msg.type === 'loot'    && <Package        size={10} className="inline mr-1" />}
                {msg.text}
              </div>
            ))}
          </div>
        )}

        {/* RÁDIO */}
        {activeLeftTab === 'radio' && (
          <Radio radioMessages={radioMessages} />
        )}

        {/* CRAFTING */}
        {activeLeftTab === 'crafting' && (
          <CraftingPanel resources={resources} craftGaskets={craftGaskets} />
        )}

      </div>
    </div>
  );
};

// ─── KOTEL ────────────────────────────────────────────────────────────────────

const Boiler = ({ temp, pressure, water, fuelType, fuelTimer, integrity, onClick }) => {
  const burning   = fuelTimer > 0;
  const fuelDef   = fuelType ? FUEL_TYPES[fuelType] : null;
  const intensity = fuelDef ? fuelDef.heatPerTick / 18 : 0; // 0-1 normalised

  // Gauge 1 — Teplota (0–350 °C) → -120…+120 °
  const gauge1Angle = -120 + Math.min(1, temp / 350) * 240;
  // Gauge 2 — Tlak (0–15 bar) → -120…+120 °
  const gauge2Angle = -120 + Math.min(1, pressure / 15) * 240;

  const tempColor = temp > 200 ? '#ef4444' : temp > 100 ? '#f59e0b' : '#60a5fa';
  const pressColor = pressure > 8 ? '#ef4444' : pressure > 5 ? '#f59e0b' : pressure > 2 ? '#4ade80' : '#94a3b8';

  const borderClass = pressure > 8
    ? 'border-red-600 hover:border-red-400'
    : burning
    ? 'border-amber-700 hover:border-amber-500'
    : 'border-stone-600 hover:border-stone-400';

  const flames = [
    { delay: '0s',    baseH: 28, varH: 12 },
    { delay: '0.2s',  baseH: 20, varH: 16 },
    { delay: '0.1s',  baseH: 32, varH: 8  },
    { delay: '0.35s', baseH: 18, varH: 14 },
    { delay: '0.15s', baseH: 26, varH: 10 },
  ];

  // Fuel timer bar width
  const fuelTimerMax = fuelDef ? fuelDef.burnTicks * 4 : 1;
  const fuelPct      = Math.min(100, (fuelTimer / fuelTimerMax) * 100);

  return (
    <div
      className={`relative w-56 h-80 bg-gradient-to-b from-stone-700 to-stone-900 border-4 ${borderClass} rounded-t-full rounded-b-lg shadow-2xl flex flex-col items-center justify-end pb-4 cursor-pointer transition-colors duration-700 group select-none`}
      onClick={onClick}
    >
      {/* Záře kotle */}
      {burning && (
        <div className="absolute inset-0 rounded-t-full rounded-b-lg pointer-events-none" style={{
          boxShadow: `0 0 ${20 + intensity * 40}px ${8 + intensity * 20}px rgba(251,146,60,${0.08 + intensity * 0.18})`,
        }} />
      )}
      {pressure > 8 && (
        <div className="absolute inset-0 rounded-t-full rounded-b-lg pointer-events-none animate-pulse" style={{
          boxShadow: '0 0 30px 12px rgba(239,68,68,0.25)',
        }} />
      )}

      {/* Budík 1 — Teplota */}
      <div className="absolute top-10 left-2 flex flex-col items-center gap-0.5">
        <div className="w-11 h-11 bg-stone-200 rounded-full border-4 border-amber-800 flex items-center justify-center shadow-inner" title={`Teplota: ${Math.round(temp)} °C`}>
          <div className="absolute w-4 h-0.5 rounded-full origin-right transition-transform duration-500"
            style={{ background: tempColor, transform: `rotate(${gauge1Angle}deg)` }} />
          <div className="absolute w-1.5 h-1.5 bg-stone-800 rounded-full z-10" />
        </div>
        <div className="text-[7px] font-mono font-bold" style={{ color: tempColor }}>{Math.round(temp)}°C</div>
        <div className="text-[6px] text-stone-600 font-mono">TEMP</div>
      </div>

      {/* Budík 2 — Tlak */}
      <div className="absolute top-24 -left-5 flex flex-col items-center gap-0.5">
        <div className="w-13 h-13 bg-stone-200 rounded-full border-4 border-amber-800 flex items-center justify-center shadow-inner" style={{ width: '52px', height: '52px' }} title={`Tlak: ${pressure.toFixed(1)} bar`}>
          <div className="absolute w-5 h-0.5 rounded-full origin-right transition-transform duration-500"
            style={{ background: pressColor, transform: `rotate(${gauge2Angle}deg)` }} />
          <div className="absolute w-2 h-2 bg-stone-800 rounded-full z-10" />
        </div>
        <div className="text-[7px] font-mono font-bold" style={{ color: pressColor }}>{pressure.toFixed(1)} bar</div>
        <div className="text-[6px] text-stone-600 font-mono">TLAK</div>
      </div>

      {/* Water level — tube na pravé straně */}
      <div className="absolute top-6 right-3 flex flex-col items-center gap-0.5">
        <div className="text-[6px] text-stone-600 font-mono">VODA</div>
        <div className="w-4 h-20 bg-stone-950 border border-stone-600 rounded-sm overflow-hidden flex flex-col justify-end" title={`Voda: ${Math.round(water)} L`}>
          <div className="w-full transition-all duration-1000 bg-blue-600"
            style={{ height: `${water}%`, background: water < 15 ? '#dc2626' : '#2563eb' }} />
        </div>
        <div className={`text-[7px] font-mono font-bold ${water < 15 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
          {Math.round(water)}L
        </div>
      </div>

      {/* Label */}
      <div className="text-center mb-2 z-10">
        <div className="text-amber-500 font-bold font-mono text-sm tracking-wider drop-shadow-md">HLAVNÍ KOTEL</div>
        <div className={`text-[10px] font-mono font-bold mt-0.5 ${
          pressure > 8  ? 'text-red-400 animate-pulse' :
          temp > 100    ? 'text-green-500' :
          burning       ? 'text-amber-400' : 'text-stone-500'
        }`}>
          {pressure > 8 ? '⚠ PŘETLAK!' : temp > 100 ? `✓ ${Math.round(pressure * 10) / 10} bar` : burning ? '↑ OHŘEV...' : '✗ STUDENÝ'}
        </div>
      </div>

      {/* Dvířka s plameny */}
      <div className={`w-28 h-16 border-2 border-stone-950 bg-stone-900 rounded-t-lg relative overflow-hidden ${burning ? 'group-hover:border-amber-600' : ''}`}>
        <div className={`absolute inset-0 transition-colors duration-700 ${burning ? 'bg-orange-600/15' : 'bg-stone-800/10'}`} />
        {burning && (
          <div className="absolute bottom-0 w-full flex justify-evenly items-end px-1 pb-1">
            {flames.map((f, i) => (
              <div key={i} className="rounded-t-full animate-pulse" style={{
                width: '10px',
                height: `${Math.round((f.baseH + f.varH * intensity) * 0.75)}px`,
                animationDelay: f.delay,
                animationDuration: `${0.8 + i * 0.15}s`,
                background: fuelType === 'coal'
                  ? 'linear-gradient(to top, #fde047, #a78bfa 50%, #6d28d9)'
                  : 'linear-gradient(to top, #fde047, #f97316 50%, #dc2626)',
                boxShadow: `0 0 ${5 + intensity * 10}px rgba(251,146,60,0.8)`,
                opacity: 0.7 + intensity * 0.3,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Fuel timer bar */}
      <div className="w-28 h-1.5 bg-stone-950 rounded-full overflow-hidden mt-1.5">
        <div className="h-full transition-all duration-500 rounded-full"
          style={{
            width: `${fuelPct}%`,
            background: fuelType === 'coal' ? '#a78bfa' : fuelType === 'wood' ? '#f97316' : '#a3a3a3',
          }} />
      </div>
      {fuelDef && (
        <div className="text-[7px] text-stone-600 font-mono mt-0.5">{fuelDef.label} — {fuelTimer} tick</div>
      )}
    </div>
  );
};

// ─── BUILD NODE ──────────────────────────────────────────────────────────────

const BuildNode = ({ title, icon, onClick, built, effect, effectMuted }) => (
  <div
    className="group flex flex-col items-center cursor-pointer transform hover:scale-105 transition-transform select-none"
    onClick={onClick}
  >
    <div className={`w-20 h-20 border-2 ${built ? 'bg-stone-800 border-amber-700' : 'bg-stone-900/80 border-stone-700 group-hover:border-amber-500'} rounded relative flex items-center justify-center shadow-lg`}>
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-700 opacity-70" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-700 opacity-70" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-700 opacity-70" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-700 opacity-70" />
      {/* Puls efekt když aktivní */}
      {built && <div className="absolute inset-0 rounded bg-amber-600/5 animate-pulse" />}
      {icon}
    </div>
    <div className={`px-3 py-0.5 mt-1.5 text-xs font-mono font-bold tracking-wider ${built ? 'text-amber-300' : 'text-stone-400 group-hover:text-amber-100'}`}>
      {title}
    </div>
    <div className={`text-[10px] px-2 py-0.5 rounded-full border ${
      !built        ? 'bg-stone-900/50 text-stone-500 border-stone-700/50' :
      effectMuted   ? 'bg-stone-900/50 text-stone-600 border-stone-700/30' :
                      'bg-green-900/60 text-green-400 border-green-700/50'
    }`}>
      {built ? effect : 'STAVĚT'}
    </div>
  </div>
);

// ─── PIPE ────────────────────────────────────────────────────────────────────

const Pipe = ({ active, style, className }) => (
  <div
    className={`absolute ${className}`}
    style={style}
  >
    {/* Základní trubka */}
    <div className={`w-full h-full border-4 ${active ? 'border-amber-800' : 'border-stone-700'} rounded-tl-xl opacity-60 transition-colors duration-1000`} />
    {/* Pulzující tok */}
    {active && (
      <div className="absolute inset-0 overflow-hidden rounded-tl-xl">
        <div
          className="h-1 bg-amber-500/40 animate-pulse"
          style={{ marginTop: '2px' }}
        />
      </div>
    )}
  </div>
);

// ─── HOUSE CROSS-SECTION SVG ─────────────────────────────────────────────────
//
// viewBox: 800 × 500
// Layout (y↓):
//   Střecha/půda:   y 0–80
//   Patro 1:        y 80–210   (ložnice vlevo | tech místnost vpravo)
//   Přízemí:        y 210–340  (obývák vlevo  | chodba+vstup vpravo)
//   Sklep:          y 340–500  (kotelna vlevo | sklad+sudy vpravo)
//
// Trubky vedou po zdech jako lomené čáry s animací.

const HOUSE = {
  W: 800, H: 500,
  // Svislé dělicí čáry
  midX: 440,      // střed domu (dělí levou a pravou část)
  leftWall:  40,
  rightWall: 760,
  // Vodorovné podlahy
  roofTop:    20,
  atticBot:   80,
  floor1Bot: 210,
  floor0Bot: 340,
  basementBot:500,
  // Barvy zdí
  wallStroke: '#44403c',
  wallFill:   '#1c1917',
  roomFill:   '#0c0a09',
};

// Barvy trubek
const PIPE_COLOR = {
  steam:     { idle: '#78350f', active: '#f97316', glow: 'rgba(249,115,22,0.5)' },
  water:     { idle: '#1e3a5f', active: '#3b82f6', glow: 'rgba(59,130,246,0.4)' },
  condensate:{ idle: '#164e63', active: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },
};

// Animovaná trubka — SVG path s flow animací
const SvgPipe = ({ d, type = 'steam', active = false, onClick, pressure = 0, leaking = false }) => {
  const col = PIPE_COLOR[type] ?? PIPE_COLOR.steam;
  const color = leaking ? '#dc2626' : (active ? col.active : col.idle);
  const sw = type === 'steam' ? 3.5 : 2.5;
  return (
    <g onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      {/* Hit area */}
      {onClick && <path d={d} fill="none" stroke="transparent" strokeWidth={12} />}
      {/* Trubka */}
      <path d={d} fill="none" stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={leaking ? '4 4' : 'none'}
        opacity={active ? 1 : 0.35}
      />
      {/* Flow animace */}
      {active && !leaking && (
        <path d={d} fill="none" stroke={color} strokeWidth={sw * 0.5}
          strokeLinecap="round" strokeDasharray="8 16" opacity={0.7}>
          <animate attributeName="stroke-dashoffset" from="0" to="-24"
            dur="1.2s" repeatCount="indefinite" />
        </path>
      )}
      {/* Záře když tlak */}
      {active && pressure > 2 && (
        <path d={d} fill="none" stroke={col.glow} strokeWidth={sw * 3}
          opacity={Math.min(0.4, pressure / 20)} strokeLinecap="round" />
      )}
      {/* Leak pulse */}
      {leaking && (
        <path d={d} fill="none" stroke="#dc2626" strokeWidth={sw * 1.5}
          strokeDasharray="2 20" opacity={0.8}>
          <animate attributeName="stroke-dashoffset" from="0" to="22"
            dur="0.5s" repeatCount="indefinite" />
        </path>
      )}
    </g>
  );
};

// Klikatelný slot v místnosti
const RoomSlot = ({ x, y, w, h, label, sublabel, built, active, color = '#78350f', onClick, children }) => (
  <g onClick={onClick} style={{ cursor: 'pointer' }}>
    <rect x={x} y={y} width={w} height={h} rx={3}
      fill={built ? '#1c1410' : '#111'}
      stroke={built ? color : '#292524'}
      strokeWidth={built ? 1.5 : 1}
      opacity={built ? 1 : 0.5}
    />
    {built && active && (
      <rect x={x} y={y} width={w} height={h} rx={3}
        fill="none" stroke={color} strokeWidth={2} opacity={0.5}>
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" />
      </rect>
    )}
    {children}
    <text x={x + w / 2} y={y + h / 2 + (sublabel ? -5 : 4)} textAnchor="middle"
      fontSize={10} fill={built ? '#d6d3d1' : '#57534e'} fontFamily="monospace" fontWeight="bold">
      {label}
    </text>
    {sublabel && (
      <text x={x + w / 2} y={y + h / 2 + 9} textAnchor="middle"
        fontSize={8} fill={built ? color : '#44403c'} fontFamily="monospace">
        {sublabel}
      </text>
    )}
  </g>
);

// Sud s vodou
const SvgBarrel = ({ x, y, fillPct, label, onClick }) => {
  const h = 36; const w = 22;
  const fillH = Math.round(h * fillPct / 100);
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect x={x} y={y} width={w} height={h} rx={4} fill="#1c1917" stroke="#44403c" strokeWidth={1.5} />
      <rect x={x + 1} y={y + h - fillH} width={w - 2} height={fillH} rx={3}
        fill={fillPct > 20 ? '#1d4ed8' : '#dc2626'} opacity={0.8} />
      {/* Obruče */}
      <line x1={x} y1={y + 8}  x2={x + w} y2={y + 8}  stroke="#57534e" strokeWidth={1} />
      <line x1={x} y1={y + 28} x2={x + w} y2={y + 28} stroke="#57534e" strokeWidth={1} />
      <text x={x + w / 2} y={y + h + 11} textAnchor="middle" fontSize={7}
        fill="#78716c" fontFamily="monospace">{label}</text>
    </g>
  );
};

// Radiátor v místnosti
const SvgRadiator = ({ x, y, active }) => (
  <g>
    {[0,1,2,3].map(i => (
      <rect key={i} x={x + i * 9} y={y} width={7} height={22} rx={2}
        fill={active ? '#7c2d12' : '#1c1917'} stroke={active ? '#ea580c' : '#292524'} strokeWidth={1} />
    ))}
    {active && (
      <g opacity={0.6}>
        {[4,13,22,31].map((xi, i) => (
          <path key={i} d={`M${x + xi} ${y - 2} q3 -5 0 -10`}
            fill="none" stroke="#fed7aa" strokeWidth={1}>
            <animate attributeName="opacity" values="0;0.8;0" dur={`${1 + i * 0.2}s`} repeatCount="indefinite" />
          </path>
        ))}
      </g>
    )}
  </g>
);

// Ventil — kruh s ikonou, klikací
const SvgValve = ({ x, y, open, label, color, onClick, disabled }) => (
  <g onClick={!disabled ? onClick : undefined} style={{ cursor: disabled ? 'default' : 'pointer' }} opacity={disabled ? 0.3 : 1}>
    <circle cx={x} cy={y} r={9}
      fill={open ? color : '#1c1917'}
      stroke={open ? color : '#44403c'}
      strokeWidth={1.5} />
    {open && <circle cx={x} cy={y} r={9} fill="none" stroke={color} strokeWidth={2} opacity={0.5}>
      <animate attributeName="r" values="9;12;9" dur="1.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
    </circle>}
    {/* Křížek = zavřeno, šipka = otevřeno */}
    {open
      ? <path d={`M${x-4} ${y} L${x+4} ${y} M${x} ${y-4} L${x} ${y+4}`} stroke="#0c0a09" strokeWidth={2} />
      : <path d={`M${x-3} ${y-3} L${x+3} ${y+3} M${x+3} ${y-3} L${x-3} ${y+3}`} stroke="#57534e" strokeWidth={1.5} />
    }
    <text x={x} y={y + 18} textAnchor="middle" fontSize={7} fill={open ? color : '#57534e'} fontFamily="monospace">{label}</text>
  </g>
);

const GameCanvas = () => {
  const {
    buildings, setActiveModal, phase, stats,
    waterBarrels, reservoirWater,
    valves, toggleValve,
    floatingPanels, toggleFloatingPanel,
    boiler: _b, distributorPressure, branchDrop,
    rain,
  } = useGameStore();
  const { boiler, dynamo, greenhouse, distillery, collector, workshop } = buildings;
  const bp = boiler.pressure;
  const boilerOn = boiler.temp > 100 && bp > 0.5;
  const heatingOn = boilerOn && valves.heating;
  const { W, H, midX, leftWall, rightWall, atticBot, floor1Bot, floor0Bot } = HOUSE;

  // Trubkové cesty (SVG path d=)
  // Hlavní parní stoupačka: kotel → rozdělovač (na levé zdi přízemí → patro)
  const steamRiserD   = `M 120 ${floor0Bot - 10} L 120 ${atticBot + 10}`;
  // Zpětná větev (kondenzát): patro → sklep pravou zdí
  const returnD       = `M 680 ${floor1Bot - 10} L 680 ${floor0Bot + 10}`;
  // Topný okruh přízemí: od stoupačky vpravo po zdi
  const heat0D        = `M 120 ${floor0Bot - 60} L 380 ${floor0Bot - 60}`;
  // Topný okruh patra
  const heat1D        = `M 120 ${floor1Bot - 60} L 380 ${floor1Bot - 60}`;
  // Voda ze sběrače dolů do sudů
  const rainPipeD     = `M ${midX + 60} ${atticBot} L ${midX + 60} ${floor0Bot + 20} L 620 ${floor0Bot + 20} L 620 ${floor0Bot + 40}`;
  // Pumpa ze sudů do kotle
  const pumpToBoilerD = `M 580 ${floor0Bot + 60} L 120 ${floor0Bot + 60} L 120 ${floor0Bot + 10}`;

  // Naplněnost sudů per sud
  const barrelFills = Array.from({ length: Math.max(waterBarrels, 1) }, (_, i) =>
    Math.min(100, Math.max(0, (reservoirWater - i * 100)))
  );

  return (
    <div className={`flex-1 relative overflow-hidden flex items-center justify-center ${
      phase === 'night' ? 'bg-stone-950' : 'bg-[#0d0c0b]'
    }`}>
      {/* Noční overlay */}
      {phase === 'night' && <div className="absolute inset-0 bg-blue-950/15 pointer-events-none z-10" />}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        style={{ maxHeight: '100%', maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="steamGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Gradient pro oheň v kotli */}
          <radialGradient id="boilerGlow" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#f97316" stopOpacity={boilerOn ? 0.25 : 0} />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── POZADÍ MÍSTNOSTÍ ── */}
        {/* Střecha / půda */}
        <polygon points={`${leftWall},${atticBot} ${W/2},${HOUSE.roofTop} ${rightWall},${atticBot}`}
          fill="#111" stroke={HOUSE.wallStroke} strokeWidth={2} />
        {/* Střešní okap / sběrač deště */}
        <rect x={leftWall} y={atticBot} width={rightWall - leftWall} height={20}
          fill="#161412" stroke={HOUSE.wallStroke} strokeWidth={1.5} />

        {/* Patro 1 vlevo — LOŽNICE */}
        <rect x={leftWall} y={atticBot + 20} width={midX - leftWall} height={floor1Bot - atticBot - 20}
          fill="#0f0e0d" stroke={HOUSE.wallStroke} strokeWidth={1.5} />
        <text x={leftWall + 10} y={atticBot + 36} fontSize={9} fill="#44403c" fontFamily="monospace" fontWeight="bold">LOŽNICE</text>

        {/* Patro 1 vpravo — TECH MÍSTNOST */}
        <rect x={midX} y={atticBot + 20} width={rightWall - midX} height={floor1Bot - atticBot - 20}
          fill="#0f0e0d" stroke={HOUSE.wallStroke} strokeWidth={1.5} />
        <text x={midX + 10} y={atticBot + 36} fontSize={9} fill="#44403c" fontFamily="monospace" fontWeight="bold">TECH MÍSTNOST</text>

        {/* Přízemí vlevo — OBÝVÁK */}
        <rect x={leftWall} y={floor1Bot} width={midX - leftWall} height={floor0Bot - floor1Bot}
          fill="#0f0e0d" stroke={HOUSE.wallStroke} strokeWidth={1.5} />
        <text x={leftWall + 10} y={floor1Bot + 16} fontSize={9} fill="#44403c" fontFamily="monospace" fontWeight="bold">OBÝVÁK</text>

        {/* Přízemí vpravo — CHODBA / VSTUP */}
        <rect x={midX} y={floor1Bot} width={rightWall - midX} height={floor0Bot - floor1Bot}
          fill="#0f0e0d" stroke={HOUSE.wallStroke} strokeWidth={1.5} />
        <text x={midX + 10} y={floor1Bot + 16} fontSize={9} fill="#44403c" fontFamily="monospace" fontWeight="bold">VSTUPNÍ HALA</text>

        {/* Sklep vlevo — KOTELNA */}
        <rect x={leftWall} y={floor0Bot} width={midX - leftWall} height={H - floor0Bot}
          fill="#100c08" stroke={HOUSE.wallStroke} strokeWidth={1.5} />
        <text x={leftWall + 10} y={floor0Bot + 16} fontSize={9} fill="#44403c" fontFamily="monospace" fontWeight="bold">KOTELNA</text>

        {/* Sklep vpravo — SKLAD */}
        <rect x={midX} y={floor0Bot} width={rightWall - midX} height={H - floor0Bot}
          fill="#100c08" stroke={HOUSE.wallStroke} strokeWidth={1.5} />
        <text x={midX + 10} y={floor0Bot + 16} fontSize={9} fill="#44403c" fontFamily="monospace" fontWeight="bold">SKLAD / ZÁSOBY</text>

        {/* ── TRUBKY (za objekty, pod interaktivními prvky) ── */}

        {/* Parní stoupačka (oranžová) — hlavní osa */}
        <SvgPipe d={steamRiserD} type="steam" active={boilerOn} pressure={bp} />

        {/* Topení přízemí */}
        <SvgPipe d={heat0D} type="steam" active={heatingOn} pressure={bp * 0.8} />

        {/* Topení patro */}
        <SvgPipe d={heat1D} type="steam" active={heatingOn} pressure={bp * 0.6} />

        {/* Kondenzátní zpětná větev (modrá) */}
        <SvgPipe d={returnD} type="condensate" active={heatingOn} />

        {/* Voda ze sběrače (modrá) */}
        <SvgPipe d={rainPipeD} type="water"
          active={collector.built && (rain.isRaining || reservoirWater > 0)} />

        {/* Pumpa do kotle */}
        <SvgPipe d={pumpToBoilerD} type="water" active={boiler.water > 20} />

        {/* ── ZÁŘE KOTLE ── */}
        {boilerOn && (
          <rect x={leftWall} y={floor0Bot} width={midX - leftWall} height={H - floor0Bot}
            fill="url(#boilerGlow)" />
        )}

        {/* ── KOTEL (klikací) ── */}
        <g onClick={() => setActiveModal('boiler')} style={{ cursor: 'pointer' }}>
          {/* Tělo kotle */}
          <ellipse cx={160} cy={floor0Bot + 95} rx={55} ry={70}
            fill="#1c1410" stroke={bp > 8 ? '#dc2626' : bp > 3 ? '#92400e' : '#44403c'}
            strokeWidth={bp > 8 ? 3 : 2} />
          {bp > 8 && (
            <ellipse cx={160} cy={floor0Bot + 95} rx={55} ry={70}
              fill="none" stroke="#dc2626" strokeWidth={4} opacity={0.4}>
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur="0.8s" repeatCount="indefinite" />
            </ellipse>
          )}
          {/* Průhled — plamen */}
          <ellipse cx={160} cy={floor0Bot + 110} rx={28} ry={18}
            fill={boilerOn ? '#7c2d12' : '#0c0a09'}
            stroke="#292524" strokeWidth={1} />
          {boilerOn && (
            <>
              <ellipse cx={160} cy={floor0Bot + 115} rx={16} ry={10} fill="#f97316" opacity={0.7}>
                <animate attributeName="ry" values="10;13;10" dur="0.7s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx={160} cy={floor0Bot + 112} rx={8} ry={6} fill="#fde047" opacity={0.9}>
                <animate attributeName="ry" values="6;9;6" dur="0.5s" repeatCount="indefinite" />
              </ellipse>
            </>
          )}
          {/* Budík teploty */}
          <circle cx={118} cy={floor0Bot + 65} r={14}
            fill="#e7e5e4" stroke="#92400e" strokeWidth={2} />
          <line
            x1={118} y1={floor0Bot + 65}
            x2={118 + Math.cos((boiler.temp / 350 * 240 - 210) * Math.PI / 180) * 10}
            y2={floor0Bot + 65 + Math.sin((boiler.temp / 350 * 240 - 210) * Math.PI / 180) * 10}
            stroke={boiler.temp > 200 ? '#dc2626' : boiler.temp > 100 ? '#f97316' : '#3b82f6'}
            strokeWidth={2} strokeLinecap="round" />
          <circle cx={118} cy={floor0Bot + 65} r={2} fill="#1c1917" />
          <text x={118} y={floor0Bot + 83} textAnchor="middle" fontSize={7}
            fill={boiler.temp > 100 ? '#f97316' : '#78716c'} fontFamily="monospace">
            {Math.round(boiler.temp)}°C
          </text>
          {/* Budík tlaku */}
          <circle cx={200} cy={floor0Bot + 65} r={16}
            fill="#e7e5e4" stroke={bp > 8 ? '#dc2626' : '#92400e'} strokeWidth={2} />
          <line
            x1={200} y1={floor0Bot + 65}
            x2={200 + Math.cos((bp / 15 * 240 - 210) * Math.PI / 180) * 12}
            y2={floor0Bot + 65 + Math.sin((bp / 15 * 240 - 210) * Math.PI / 180) * 12}
            stroke={bp > 8 ? '#dc2626' : bp > 3 ? '#f97316' : '#6b7280'}
            strokeWidth={2} strokeLinecap="round" />
          <circle cx={200} cy={floor0Bot + 65} r={2} fill="#1c1917" />
          <text x={200} y={floor0Bot + 85} textAnchor="middle" fontSize={7}
            fill={bp > 8 ? '#dc2626' : bp > 3 ? '#f97316' : '#78716c'} fontFamily="monospace">
            {bp.toFixed(1)} bar
          </text>
          {/* Label kotle */}
          <text x={160} y={floor0Bot + 45} textAnchor="middle" fontSize={9}
            fill="#d97706" fontFamily="monospace" fontWeight="bold">HLAVNÍ KOTEL</text>
          <text x={160} y={floor0Bot + 175} textAnchor="middle" fontSize={8}
            fill="#57534e" fontFamily="monospace">[ kliknout pro správu ]</text>
        </g>

        {/* ── VENTILY NA STOUPAČCE ── */}
        {/* Ventil topení — na stoupačce v přízemí */}
        <SvgValve x={120} y={floor1Bot + 40} open={valves.heating} color="#f97316"
          label="TOPENÍ" onClick={() => toggleValve('heating')} />

        {/* ── RADIÁTORY ── */}
        {/* Obývák */}
        <SvgRadiator x={200} y={floor0Bot + 20} active={heatingOn} />
        {/* Ložnice */}
        <SvgRadiator x={200} y={floor1Bot + 30} active={heatingOn} />

        {/* ── SBĚRAČ DEŠTĚ (půda) ── */}
        <RoomSlot
          x={midX - 80} y={HOUSE.roofTop + 5} w={160} h={42}
          label="SBĚRAČ DEŠTĚ"
          sublabel={collector.built ? (rain.isRaining ? '🌧 plní se' : `${Math.round(reservoirWater)} / ${waterBarrels * 100} L`) : 'POSTAVIT'}
          built={collector.built} active={rain.isRaining}
          color="#3b82f6"
          onClick={() => setActiveModal('build_collector')}
        />
        {/* Déšť animace */}
        {rain.isRaining && (
          <g opacity={0.5}>
            {[360,380,400,420,440,460,480].map((x, i) => (
              <line key={i} x1={x} y1={HOUSE.roofTop + 5} x2={x - 4} y2={HOUSE.roofTop + 18}
                stroke="#3b82f6" strokeWidth={1.5}>
                <animate attributeName="y1" values={`${HOUSE.roofTop};${HOUSE.roofTop + 8};${HOUSE.roofTop}`}
                  dur={`${0.6 + i * 0.07}s`} repeatCount="indefinite" />
              </line>
            ))}
          </g>
        )}

        {/* ── SUDY VE SKLEPĚ ── */}
        {barrelFills.map((fill, i) => (
          <SvgBarrel key={i}
            x={530 + i * 35} y={floor0Bot + 40}
            fillPct={fill}
            label={`${Math.round(fill)}L`}
            onClick={() => setActiveModal('build_barrel')}
          />
        ))}
        <text x={580} y={floor0Bot + 26} textAnchor="middle" fontSize={8}
          fill="#57534e" fontFamily="monospace">ZÁSOBNÍK VODY</text>

        {/* ── SLOT: DÍLNA (přízemí vpravo) ── */}
        <RoomSlot
          x={midX + 20} y={floor1Bot + 20} w={120} h={50}
          label="DÍLNA" sublabel={workshop.built ? '🛠 aktivní' : 'POSTAVIT'}
          built={workshop.built} active={workshop.built} color="#a8a29e"
          onClick={() => setActiveModal('build_workshop')}
        />

        {/* ── SLOT: PĚSTÍRNA (tech místnost) ── */}
        <RoomSlot
          x={midX + 20} y={atticBot + 30} w={120} h={50}
          label="PĚSTÍRNA" sublabel={greenhouse.built ? '🌱 roste' : 'POSTAVIT'}
          built={greenhouse.built} active={greenhouse.built} color="#16a34a"
          onClick={() => setActiveModal('build_greenhouse')}
        />

        {/* ── SLOT: DESTILÉRKA (tech místnost) ── */}
        <RoomSlot
          x={midX + 160} y={atticBot + 30} w={120} h={50}
          label="DESTILÉRKA" sublabel={distillery.built ? '💧 aktivní' : 'POSTAVIT'}
          built={distillery.built} active={distillery.built && boilerOn} color="#0891b2"
          onClick={() => setActiveModal('build_distillery')}
        />

        {/* ── SLOT: DYNAMO (chodba) ── */}
        <RoomSlot
          x={midX + 160} y={floor1Bot + 20} w={120} h={50}
          label="DYNAMO" sublabel={dynamo.built ? `⚡ ${stats.power.toFixed(0)}%` : 'POSTAVIT'}
          built={dynamo.built} active={dynamo.built && boilerOn} color="#eab308"
          onClick={() => setActiveModal('build_dynamo')}
        />

        {/* ── PLOVOUCÍ PANEL TLAČÍTKO ── */}
        <g onClick={() => toggleFloatingPanel('distributor')} style={{ cursor: 'pointer' }}>
          <rect x={leftWall + 10} y={floor1Bot + 15} width={85} height={26} rx={4}
            fill={floatingPanels.distributor?.open ? '#451a03' : '#1c1917'}
            stroke={floatingPanels.distributor?.open ? '#f97316' : '#44403c'}
            strokeWidth={1.5} />
          <text x={leftWall + 52} y={floor1Bot + 32} textAnchor="middle" fontSize={9}
            fill={floatingPanels.distributor?.open ? '#f97316' : '#78716c'}
            fontFamily="monospace" fontWeight="bold">▶ ROZVOD PÁRY</text>
        </g>

        {/* ── LEGENDA ── */}
        <g>
          <text x={leftWall + 5} y={H - 20} fontSize={7} fill="#44403c" fontFamily="monospace">
            — pára  — voda  — kondenzát
          </text>
          <line x1={leftWall + 5}  y1={H - 12} x2={leftWall + 25} y2={H - 12} stroke="#f97316" strokeWidth={2} />
          <line x1={leftWall + 55} y1={H - 12} x2={leftWall + 75} y2={H - 12} stroke="#3b82f6" strokeWidth={2} />
          <line x1={leftWall + 105} y1={H - 12} x2={leftWall + 125} y2={H - 12} stroke="#06b6d4" strokeWidth={2} />
        </g>

      </svg>

      {/* Plovoucí panel rozdělovače */}
      <DistributorPanel />
    </div>
  );
};

// ─── BOTTOM BAR ──────────────────────────────────────────────────────────────

const CharactersButton = () => {
  const { nadia, hero, setActiveModal, clearNadiaNotification } = useGameStore();
  const hasNotif = nadia.notification || hero.morale < 25;
  return (
    <div className="relative">
      <button
        onClick={() => { setActiveModal('characters'); clearNadiaNotification(); }}
        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition group w-24 h-14 ${
          hasNotif
            ? 'bg-amber-900/30 border-amber-600 hover:bg-amber-900/50'
            : 'bg-stone-900 border-stone-700 hover:bg-stone-800 hover:border-amber-500'
        }`}
      >
        <User size={18} className={hasNotif ? 'text-amber-400' : 'text-stone-400 group-hover:text-amber-300'} />
        <span className="text-[9px] font-mono font-bold text-stone-500 group-hover:text-amber-100 uppercase tracking-wider mt-0.5">Postavy</span>
      </button>
      {hasNotif && (
        <>
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-600 rounded-full border border-stone-900 animate-ping" />
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-600 rounded-full border border-stone-900" />
        </>
      )}
    </div>
  );
};

const ActionButton = ({ icon, label, onClick, highlight }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition group w-24 h-14 ${
      highlight
        ? 'bg-amber-900/30 border-amber-600 hover:bg-amber-900/50'
        : 'bg-stone-900 border-stone-700 hover:bg-stone-800 hover:border-amber-500'
    }`}
  >
    <div className={`mb-0.5 ${highlight ? 'text-amber-400' : 'text-stone-400 group-hover:text-amber-300'}`}>{icon}</div>
    <span className="text-[9px] font-mono font-bold text-stone-500 group-hover:text-amber-100 uppercase tracking-wider">{label}</span>
  </button>
);

const WEATHER_INFO = {
  clear: { icon: '☀', label: 'Jasno',   color: 'text-amber-400' },
  frost: { icon: '❄', label: 'Mráz',    color: 'text-blue-300'  },
  rain:  { icon: '🌧', label: 'Déšť',   color: 'text-blue-400'  },
  storm: { icon: '⛈', label: 'Bouřka', color: 'text-purple-400' },
};

const BottomBar = () => {
  const { setActiveModal, phase, techPhase, weather, buildings } = useGameStore();
  const { boiler } = buildings;
  const techLabel = TECH_PHASE_LABELS.find(t => t.phase === techPhase);
  const wInfo = WEATHER_INFO[weather] ?? WEATHER_INFO.clear;
  return (
    <div className="bg-stone-950 border-t-2 border-amber-900/50 p-2 flex items-center justify-between z-10 flex-shrink-0">
      <div className="flex items-center gap-3 pl-2">
        <span className="text-xs font-mono text-stone-600">
          {phase === 'night'
            ? <span className="text-blue-500">◆ NOC</span>
            : <span className="text-amber-700">◆ DEN</span>
          }
        </span>
        <span className={`text-xs font-mono ${wInfo.color}`} title="Počasí">
          {wInfo.icon} {wInfo.label}
        </span>
        {/* Boiler metrics */}
        <span className="text-xs font-mono bg-stone-800/60 px-2 py-0.5 rounded border border-stone-700">
          <span className={boiler.temp > 200 ? 'text-red-400' : boiler.temp > 100 ? 'text-amber-400' : 'text-blue-400'}>
            {Math.round(boiler.temp)}°
          </span>
          <span className="text-stone-600"> | </span>
          <span className={boiler.pressure > 8 ? 'text-red-400 font-bold animate-pulse' : boiler.pressure > 5 ? 'text-amber-400' : boiler.pressure > 2 ? 'text-green-400' : 'text-stone-500'}>
            {boiler.pressure.toFixed(1)} bar
          </span>
        </span>
        {/* Tech fáze badge */}
        <button
          onClick={() => setActiveModal('tech_tree')}
          className="flex items-center gap-1.5 bg-stone-900 border border-stone-700 hover:border-amber-700 rounded px-2 py-1 transition"
          title="Technologický strom"
        >
          <TrendingUp size={12} className="text-amber-600" />
          <span className="text-[10px] font-mono text-amber-700 font-bold">FÁZE {techPhase}</span>
          <span className="text-[10px] font-mono text-stone-600">{techLabel?.label}</span>
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div className="text-[10px] text-amber-700 font-mono mb-1 font-bold tracking-widest">STAVBY</div>
        <div className="flex space-x-1.5 bg-stone-900 p-1 rounded-lg border border-stone-800">
          {[
            { Icon: Flame,    label: 'Kotel',    modal: 'boiler'           },
            { Icon: Waves,    label: 'Sběrač',   modal: 'build_collector'  },
            { Icon: Droplets, label: 'Destilérka', modal: 'build_distillery'},
            { Icon: Zap,      label: 'Dynamo',   modal: 'build_dynamo'     },
            { Icon: Wind,     label: 'Pěstírna', modal: 'build_greenhouse' },
            { Icon: Wrench,   label: 'Dílna',    modal: 'build_workshop'   },
          ].map(({ Icon, label, modal }) => (
            <button
              key={modal}
              title={label}
              onClick={() => setActiveModal(modal)}
              className="w-10 h-10 bg-stone-950 rounded border border-stone-700 hover:border-amber-500 hover:bg-stone-800 flex items-center justify-center transition text-stone-500 hover:text-amber-300"
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex space-x-2 pr-2">
        <ActionButton icon={<Hammer size={18} />} label="Crafting" onClick={() => setActiveLeftTab(activeLeftTab === 'crafting' ? 'radio' : 'crafting')} />
        <ActionButton icon={<Map    size={18} />} label="Mapa" onClick={() => setActiveModal('map')} />
        <CharactersButton /></div>
    </div>
  );
};

// ─── MODAL ───────────────────────────────────────────────────────────────────

const BUILDING_DEFS = {
  collector:  { title: 'SBĚRAČ KONDENZÁTU', desc: 'Zachytává páru z kotle a kondenzuje ji na pitnou vodu. Funguje jen když kotel topí. Levný první krok k soběstačnosti.', costs: { scrap: 15 } },
  dynamo:     { title: 'KOMPRESOR',         desc: 'Pohání pneumatické nástroje a pasti z přebytečného tlaku. Zastaví pokles kinetické energie domu a pomalu ji dobíjí.', costs: { scrap: 50, parts: 10 } },
  distillery: { title: 'DESTILÉRKA',        desc: 'Pokročilá destilace — výrazně více vody než sběrač. Vyžaduje funkční kotel. Staví se po sběrači jako upgrade.', costs: { scrap: 30, parts: 8, wood: 10 } },
  greenhouse: { title: 'PĚSTÍRNA',          desc: 'Hydroponická zahrada. Snižuje spotřebu jídla na polovinu — nezávislost na nočním scavengingu.', costs: { wood: 30, scrap: 15 } },
  workshop:   { title: 'DÍLNA',             desc: 'Umožní vyrábět pokročilé komponenty a opravovat zařízení. Odemkne craftingové menu.', costs: { scrap: 40, wood: 20, parts: 8 } },
  defense_vent: { title: 'PARNÍ ODFUK',     desc: 'Obranný mechanismus, který vypustí oblak vařící páry z okna. Extrémní spotřeba tlaku a vody, navíc rychle ničí přívodní trubku.', costs: { scrap: 25, parts: 5, wood: 10 } },
};

const RESOURCE_LABELS = { scrap: 'Šrot', wood: 'Dřevo', coal: 'Uhlí', parts: 'Součástky', gaskets: 'Těsnění', chemicals: 'Chemikálie', chips: 'Štěpky' };

// Mini stat bar pro postavy
const MiniBar = ({ value, color, label }) => {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-stone-500 w-14 text-right">{label}</span>
      <div className="flex-1 h-2 bg-stone-900 rounded-sm overflow-hidden border border-stone-800">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-stone-400 w-7 text-right">{pct}</span>
    </div>
  );
};

const Modal = () => {
  const { activeModal, setActiveModal, buildings, buildBuilding, resources, stats, hero, nadia, setTradeOffer, techPhase, pipes, repairPipe, replacePipe, upgradePipe, craftGaskets, cleanBoiler, addFuel, pumpWater, ventPressure, radioMessages, rain, reservoirWater, waterBarrels, buildBarrel, upgradeCollector, scavengeWoodOutside, phase, weather } = useGameStore();
  const [tradeInput, setTradeInput] = useState({ scrap: 0, wood: 0, coal: 0, parts: 0 });
  if (!activeModal) return null;

  const renderContent = () => {
    // Kotel
    if (activeModal === 'boiler') {
      const { temp, pressure, water, fuelType, fuelTimer, integrity, scale = 0 } = buildings.boiler;
      const scalePct = Math.round(scale);
      const fuelDef = fuelType ? FUEL_TYPES[fuelType] : null;

      return (
        <div className="space-y-3">
          {/* Status grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-stone-950 rounded p-2.5 border border-stone-800 text-center">
              <div className="text-[9px] text-stone-500 font-mono mb-0.5">TEPLOTA</div>
              <div className={`text-lg font-bold font-mono ${temp > 200 ? 'text-red-400' : temp > 100 ? 'text-amber-400' : 'text-blue-400'}`}>
                {Math.round(temp)}°C
              </div>
              <div className="text-[8px] text-stone-600 mt-0.5">
                {temp < 100 ? '❄ Studený' : temp < 180 ? '✓ Ideální' : '⚠ Přehřátý'}
              </div>
            </div>
            <div className="bg-stone-950 rounded p-2.5 border border-stone-800 text-center">
              <div className="text-[9px] text-stone-500 font-mono mb-0.5">TLAK</div>
              <div className={`text-lg font-bold font-mono ${pressure > 8 ? 'text-red-400 animate-pulse' : pressure > 5 ? 'text-amber-400' : pressure > 2 ? 'text-green-400' : 'text-stone-500'}`}>
                {pressure.toFixed(1)} bar
              </div>
              <div className="text-[8px] text-stone-600 mt-0.5">
                {pressure < 2 ? '▼ Slabý' : pressure < 5 ? '✓ Ideální' : pressure < 8 ? '⚠ Vysoký' : '🔴 DANGER'}
              </div>
            </div>
            <div className="bg-stone-950 rounded p-2.5 border border-stone-800 text-center">
              <div className="text-[9px] text-stone-500 font-mono mb-0.5">VODA</div>
              <div className={`text-lg font-bold font-mono ${water < 15 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
                {Math.round(water)}L
              </div>
              <div className="text-[8px] text-stone-600 mt-0.5">
                {water === 0 ? '❌ KRITICKÉ!' : water < 30 ? '⚠ Nízko' : '✓ OK'}
              </div>
            </div>
          </div>

          {/* Fuel management */}
          <div>
            <div className="text-[10px] text-stone-600 uppercase tracking-wider mb-2">Přiložit palivo</div>
            <div className="grid grid-cols-3 gap-1.5">
              {['chips', 'wood', 'coal'].map(t => {
                const def = FUEL_TYPES[t];
                const canAfford = Object.entries(def.cost).every(([k, v]) => (resources[k] ?? 0) >= v);
                return (
                  <button
                    key={t}
                    onClick={() => { addFuel(t); setActiveModal(null); }}
                    disabled={!canAfford}
                    className="py-2 px-2 bg-amber-900/30 border border-amber-700/60 text-amber-200 text-[10px] font-mono rounded hover:bg-amber-900/60 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="font-bold">{def.label}</div>
                    <div className="text-[8px] text-stone-600">
                      {Object.entries(def.cost).map(([k, v]) => `${v}×${k[0]}`).join(' ')}
                    </div>
                  </button>
                );
              })}
            </div>
            {fuelDef && (
              <div className="text-[9px] text-stone-500 mt-1.5 bg-stone-950/60 p-1.5 rounded border border-stone-800/50">
                Topí se: <span className="text-amber-300 font-bold">{fuelDef.label}</span> ({fuelTimer} tick zbývá)
              </div>
            )}
          </div>

          {/* Water management */}
          <div>
            <div className="text-[10px] text-stone-600 uppercase tracking-wider mb-2">Voda & ventil</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => pumpWater()}
                disabled={reservoirWater < 2 || water >= 100}
                className="py-2 px-2 bg-blue-900/30 border border-blue-700/60 text-blue-300 text-[10px] font-mono rounded hover:bg-blue-900/60 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                💧 Přečerpat<br/>
                <span className="text-[8px]">{Math.round(reservoirWater || 0)} L v sudu</span>
              </button>
              <button
                onClick={() => ventPressure()}
                disabled={pressure < 0.5}
                className="py-2 px-2 bg-red-900/30 border border-red-700/60 text-red-300 text-[10px] font-mono rounded hover:bg-red-900/60 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                💨 Vypustit<br/>
                <span className="text-[8px]">-2.5 bar bezpečnost</span>
              </button>
            </div>
          </div>

          {/* Scaling */}
          <div className="bg-stone-950 rounded p-2 border border-stone-800">
            <div className="flex justify-between items-center mb-1">
              <div className="text-[9px] text-stone-500 font-mono">ZANÁŠENÍ</div>
              <div className={`text-xs font-bold font-mono ${scalePct < 40 ? 'text-green-400' : scalePct < 70 ? 'text-amber-400' : 'text-red-400 animate-pulse'}`}>
                {scalePct}%
              </div>
            </div>
            <div className="w-full h-2 bg-stone-900 rounded overflow-hidden border border-stone-800 mb-1.5">
              <div className={`h-full transition-all ${scalePct < 40 ? 'bg-green-700' : scalePct < 70 ? 'bg-amber-600' : 'bg-red-600'}`} style={{ width: `${scalePct}%` }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[8px] text-stone-600">
                {scalePct < 40 ? 'Čistý — 100 % výkon' : scalePct < 70 ? 'Tlak snížen' : 'VÁŽNÉ'}
              </span>
              <button
                onClick={() => { cleanBoiler(); setActiveModal(null); }}
                disabled={(resources.chemicals ?? 0) < 1}
                className="px-2 py-0.5 bg-teal-900/40 border border-teal-700/50 text-teal-300 text-[8px] font-mono rounded hover:bg-teal-900/60 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Vyčistit (1× chem)
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-[8px] text-stone-600 bg-stone-950/40 p-1.5 rounded border border-stone-800/50">
            • Ideální: 120–180 °C, 2–5 bar
            • Voda se odpaří při &gt;100 °C
            • Tlak &gt;8 bar = nebezpečí
            • Zanášení snižuje výkon
          </div>
          {resources.coal < 3 && resources.wood < 4 && (
            <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-950/30 border border-orange-800/40 rounded p-2">
              <AlertTriangle size={14} />
              Dochází palivo! Výprava přinese zásoby v noci.
            </div>
          )}
        </div>
      );
    }

    // Stavby
    const buildKey = activeModal.replace('build_', '');
    
    if (activeModal === 'build_barrel') {
      const affordable = (resources.scrap ?? 0) >= 20 && (resources.wood ?? 0) >= 10;
      return (
        <div className="space-y-4">
          <p className="text-stone-300 text-sm">Postavení dalšího sudu zvýší maximální kapacitu uskladněné vody o 100 litrů.</p>
          <div className="bg-stone-950 rounded p-3 border border-stone-800">
            <div className="text-[10px] text-stone-500 font-mono mb-2 tracking-wider">NÁKLADY NA STAVBU</div>
            <div className="grid grid-cols-2 gap-1">
              <div className={`text-sm flex justify-between ${(resources.scrap ?? 0) >= 20 ? 'text-stone-300' : 'text-red-400'}`}>
                <span>Šrot:</span><span className="font-mono font-bold">20 <span className="text-stone-600">/ {resources.scrap ?? 0}</span></span>
              </div>
              <div className={`text-sm flex justify-between ${(resources.wood ?? 0) >= 10 ? 'text-stone-300' : 'text-red-400'}`}>
                <span>Dřevo:</span><span className="font-mono font-bold">10 <span className="text-stone-600">/ {resources.wood ?? 0}</span></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => { buildBarrel(); setActiveModal(null); }}
            disabled={!affordable}
            className="w-full py-2 bg-blue-800 border border-blue-600 text-blue-100 font-bold hover:bg-blue-700 rounded transition disabled:opacity-40 disabled:cursor-not-allowed font-mono"
          >
            {affordable ? 'Postavit sud (+100L)' : 'Nedostatek surovin'}
          </button>
        </div>
      );
    }

    const def = BUILDING_DEFS[buildKey];
    if (def) {
      const alreadyBuilt = buildings[buildKey]?.built;
      const affordable = Object.entries(def.costs).every(([item, amount]) => (resources[item] ?? 0) >= amount);
      const requiredPhase = BUILDING_PHASE[buildKey] ?? 1;
      const locked = techPhase < requiredPhase;
      
      const isCollector = buildKey === 'collector';
      const collectorAffordable = (resources.scrap ?? 0) >= 20 && (resources.parts ?? 0) >= 5;

      return (
        <div className="space-y-4">
          <p className="text-stone-300 text-sm">{def.desc}</p>
          {!alreadyBuilt && (
            <div className="bg-stone-950 rounded p-3 border border-stone-800">
              <div className="text-[10px] text-stone-500 font-mono mb-2 tracking-wider">NÁKLADY NA STAVBU</div>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(def.costs).map(([item, amount]) => {
                  const have = resources[item] ?? 0;
                  const ok = have >= amount;
                  return (
                    <div key={item} className={`text-sm flex justify-between ${ok ? 'text-stone-300' : 'text-red-400'}`}>
                      <span>{RESOURCE_LABELS[item]}:</span>
                      <span className="font-mono font-bold">{amount} <span className="text-stone-600">/ {have}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {alreadyBuilt && isCollector && (
            <div className="bg-stone-950 rounded p-3 border border-stone-800">
              <div className="text-[10px] text-stone-500 font-mono mb-2 tracking-wider">UPGRADE SBĚRAČE (Lvl {buildings.collector.level + 1})</div>
              <div className="grid grid-cols-2 gap-1">
                <div className={`text-sm flex justify-between ${(resources.scrap ?? 0) >= 20 ? 'text-stone-300' : 'text-red-400'}`}>
                  <span>Šrot:</span><span className="font-mono font-bold">20 <span className="text-stone-600">/ {resources.scrap ?? 0}</span></span>
                </div>
                <div className={`text-sm flex justify-between ${(resources.parts ?? 0) >= 5 ? 'text-stone-300' : 'text-red-400'}`}>
                  <span>Součástky:</span><span className="font-mono font-bold">5 <span className="text-stone-600">/ {resources.parts ?? 0}</span></span>
                </div>
              </div>
              <button
                onClick={() => { upgradeCollector(); setActiveModal(null); }}
                disabled={!collectorAffordable}
                className="w-full mt-3 py-2 bg-blue-800 border border-blue-600 text-blue-100 font-bold hover:bg-blue-700 rounded transition disabled:opacity-40 disabled:cursor-not-allowed font-mono"
              >
                {collectorAffordable ? 'Vylepšit sběrač' : 'Nedostatek surovin'}
              </button>
            </div>
          )}
          {alreadyBuilt && !isCollector
            ? <div className="text-green-400 font-mono text-sm">✓ Již postaveno a aktivní.</div>
            : locked
            ? <div className="text-stone-500 font-mono text-sm text-center py-2">🔒 Odemkne se ve fázi {requiredPhase} (den {TECH_PHASE_LABELS.find(t => t.phase === requiredPhase)?.fromDay})</div>
            : !alreadyBuilt && (
              <button
                onClick={() => { buildBuilding(buildKey); setActiveModal(null); }}
                disabled={!affordable}
                className="w-full py-2 bg-amber-800 border border-amber-600 text-amber-100 font-bold hover:bg-amber-700 rounded transition disabled:opacity-40 disabled:cursor-not-allowed font-mono"
              >
                {affordable ? 'Postavit' : 'Nedostatek surovin'}
              </button>
            )
          }
        </div>
      );
    }

    if (activeModal === 'map') {
      const canGoOut = hero.energy >= 20;
      return (
        <div className="space-y-4">
          <p className="text-stone-300 text-sm">Můžeš vyrazit ven do blízkého okolí a zkusit nasekat nějaké dřevo ze zbytků stromů. Výprava trvá 3 hodiny.</p>
          <div className="bg-stone-950 rounded p-3 border border-stone-800 text-sm">
            <div className="text-stone-400 mb-2">Rizika a dopady:</div>
            <ul className="list-disc pl-5 text-stone-500 mb-3">
              <li><span className="text-yellow-500">Stojí 35 Únavy/Fyz. Energie</span> (Máš: {Math.round(hero.energy)})</li>
              <li>Přineseš náhodné množství dřeva a štěpek</li>
              <li>Ztratíš 3 hodiny (90 ticků) času</li>
              {phase === 'night' && (weather === 'frost' || weather === 'storm') && (
                <li className="text-red-400">Varování: Mrazivá bouře/mráz sníží Tvé zdraví a teplo!</li>
              )}
            </ul>
            <button
              onClick={() => { scavengeWoodOutside(); setActiveModal(null); }}
              disabled={!canGoOut}
              className="w-full py-2 bg-amber-800 border border-amber-600 text-amber-100 font-bold hover:bg-amber-700 rounded transition disabled:opacity-40 disabled:cursor-not-allowed font-mono"
            >
              {canGoOut ? 'Vyrazit ven (-3h)' : 'Jsi příliš unavený (min. 20 energie)'}
            </button>
          </div>
          <p className="text-stone-500 text-xs mt-4">Poznámka: Nadia (pokud je s tebou) vychází automaticky každou noc a přináší hlavní loot k ránu.</p>
        </div>
      );
    }

    // ── Postavy ───────────────────────────────────────────────────────────────
    if (activeModal === 'characters') {
      return (
        <div className="space-y-4">
          {/* Pavel */}
          <div className="bg-stone-950 border border-stone-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-stone-700 border-2 border-amber-800 flex items-center justify-center text-lg">👨</div>
              <div>
                <div className="font-bold text-stone-200 font-mono">{hero.name}</div>
                <div className="text-[10px] text-stone-500">Hlavní hrdina · sám</div>
              </div>
              <div className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-mono ${
                hero.morale > 60 ? 'text-green-400 bg-green-900/30 border-green-800/40' :
                hero.morale > 30 ? 'text-amber-400 bg-amber-900/30 border-amber-800/40' :
                                   'text-red-400 bg-red-900/30 border-red-800/40 animate-pulse'
              }`}>
                {hero.morale > 60 ? 'V pohodě' : hero.morale > 30 ? 'Unavený' : 'Na dně'}
              </div>
            </div>
            <div className="space-y-1.5">
              <MiniBar label="Zdraví"  value={stats.health} color="bg-red-600"    />
              <MiniBar label="Hlad"    value={stats.food}   color="bg-orange-500" />
              <MiniBar label="Žízeň"   value={stats.water}  color="bg-blue-500"   />
              <MiniBar label="Morálka" value={hero.morale}  color="bg-purple-600" />
              <MiniBar label="Energie" value={hero.energy}  color="bg-yellow-500" />
            </div>
          </div>

          {/* Nadia */}
          {!nadia.met ? (
            <div className="bg-stone-950/50 border border-stone-800/50 rounded-lg p-4 text-center">
              <div className="text-stone-600 text-sm">Zatím sám...</div>
              <div className="text-[10px] text-stone-700 mt-1">Nadia přijde den 3</div>
            </div>
          ) : (
            <div className="bg-stone-950 border border-stone-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-stone-700 border-2 border-blue-800 flex items-center justify-center text-lg">👩</div>
                <div>
                  <div className="font-bold text-stone-200 font-mono">Nadia</div>
                  <div className="text-[10px] text-stone-500">Obchodnice · kulhá</div>
                </div>
                <div className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-mono ${
                  nadia.status === 'home'
                    ? 'text-green-400 bg-green-900/30 border-green-800/40'
                    : 'text-blue-400 bg-blue-900/30 border-blue-800/40 animate-pulse'
                }`}>
                  {nadia.status === 'home' ? 'Doma' : 'Venku'}
                </div>
              </div>
              <div className="space-y-1.5 mb-3">
                <MiniBar label="Důvěra"   value={nadia.trust}    color="bg-blue-500"  />
                <MiniBar label="Kapacita" value={nadia.capacity} color="bg-stone-500" />
              </div>
              {nadia.status === 'home' && (
                <button
                  onClick={() => setActiveModal('nadia_trade')}
                  className="w-full py-1.5 bg-blue-900/30 border border-blue-800/50 text-blue-300 text-xs font-mono rounded hover:bg-blue-900/50 transition flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight size={12} /> Nastavit obchodní nabídku
                </button>
              )}
              {nadia.status === 'out' && (
                <div className="text-[10px] text-stone-600 text-center">Vrátí se ráno s zásobami.</div>
              )}
            </div>
          )}
        </div>
      );
    }

    // ── Nadia trade ───────────────────────────────────────────────────────────
    if (activeModal === 'nadia_trade') {
      const totalOffered = Object.values(tradeInput).reduce((a, b) => a + b, 0);
      const overCapacity = totalOffered > nadia.capacity;
      const TRADE_PREVIEW = {
        scrap: (v) => `→ ~${Math.floor(v / 5)} uhlí`,
        wood:  (v) => `→ ~${Math.floor(v * 1.5)} šrot`,
        parts: (v) => `→ ~${Math.floor(v * 7)} šrot`,
        coal:  (v) => `→ ~${Math.floor(v * 2)} dřevo`,
      };
      return (
        <div className="space-y-3">
          <p className="text-stone-400 text-xs">Nadia vezme zásoby přes noc a vymění je ve městě. Důvěra: <span className="text-blue-400 font-bold">{nadia.trust}</span>/100 (lepší kurzy s časem).</p>
          <div className="text-[10px] text-stone-600 uppercase tracking-wider">Co nabídneš:</div>
          {(['scrap', 'wood', 'coal', 'parts']).map(key => {
            const labels = { scrap: 'Šrot', wood: 'Dřevo', coal: 'Uhlí', parts: 'Součástky' };
            const v = tradeInput[key];
            return (
              <div key={key} className="bg-stone-950 border border-stone-800 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-stone-400">{labels[key]} <span className="text-stone-600">(máš: {resources[key]})</span></span>
                  <span className="text-[10px] text-stone-600">{v > 0 ? TRADE_PREVIEW[key](v) : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setTradeInput(t => ({ ...t, [key]: Math.max(0, t[key] - 5) }))} className="w-7 h-7 bg-stone-800 rounded text-stone-400 hover:text-amber-300 text-sm font-bold">−</button>
                  <div className="flex-1 text-center font-mono font-bold text-stone-200 text-sm">{v}</div>
                  <button onClick={() => setTradeInput(t => ({ ...t, [key]: Math.min(resources[key], t[key] + 5) }))} className="w-7 h-7 bg-stone-800 rounded text-stone-400 hover:text-amber-300 text-sm font-bold">+</button>
                </div>
              </div>
            );
          })}
          <div className={`text-xs font-mono text-center ${overCapacity ? 'text-red-400' : 'text-stone-500'}`}>
            Celkem: {totalOffered} / {nadia.capacity} j. {overCapacity && '⚠ přetíženo!'}
          </div>
          <button
            onClick={() => { setTradeOffer(tradeInput); setActiveModal('characters'); }}
            disabled={overCapacity || totalOffered === 0}
            className="w-full py-2 bg-blue-900/40 border border-blue-700 text-blue-200 font-bold font-mono rounded hover:bg-blue-900/60 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            Potvrdit nabídku
          </button>
        </div>
      );
    }

    // ── Tech tree ─────────────────────────────────────────────────────────────
    if (activeModal === 'tech_tree') {
      return (
        <div className="space-y-3">
          {TECH_PHASE_LABELS.map(tp => {
            const unlocked = techPhase >= tp.phase;
            const current  = techPhase === tp.phase;
            return (
              <div key={tp.phase} className={`p-3 rounded border ${
                current  ? 'bg-amber-900/20 border-amber-700' :
                unlocked ? 'bg-stone-900 border-stone-700' :
                           'bg-stone-950/50 border-stone-800/50 opacity-50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-mono font-bold ${unlocked ? 'text-amber-400' : 'text-stone-600'}`}>
                    FÁZE {tp.phase}
                  </span>
                  <span className={`text-sm font-bold ${unlocked ? 'text-stone-200' : 'text-stone-600'}`}>{tp.label}</span>
                  {current && <span className="ml-auto text-[10px] text-amber-600 font-mono">← AKTUÁLNÍ</span>}
                  {!unlocked && <span className="ml-auto text-[10px] text-stone-600">od dne {tp.fromDay}</span>}
                </div>
                <div className="text-[10px] text-stone-600">
                  {tp.phase === 1 && 'Kotel, Sběrač kondenzátu'}
                  {tp.phase === 2 && 'Dynamo, Destilérka'}
                  {tp.phase === 3 && 'Pěstírna'}
                  {tp.phase === 4 && 'Dílna, Mechanický telegraf (brzy)'}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // ── Pipe modal ────────────────────────────────────────────────────────────
    if (activeModal?.startsWith('pipe_')) {
      const pipeId = activeModal.replace('pipe_', '');
      const pipe   = pipes[pipeId];
      if (!pipe) return <p className="text-stone-500 text-sm">Trubka nenalezena.</p>;

      const mat      = MATERIALS[pipe.material];
      const slot     = PIPE_SLOTS[pipeId];
      const destNode = pipeId.replace('boiler_', '');

      const integrityPct   = Math.round(pipe.integrity);
      const integrityColor = integrityPct > 60 ? 'bg-green-600' : integrityPct > 30 ? 'bg-amber-600' : 'bg-red-600';
      const pressureLoss   = mat.resistance * slot.segments;

      const canRepair  = resources.scrap >= REPAIR_COST.scrap && resources.wood >= REPAIR_COST.wood;
      const canReplace = resources.scrap >= REPLACE_COST.scrap && resources.parts >= REPLACE_COST.parts;

      const upgradeOptions = [];
      if (pipe.material === 'wood') {
        upgradeOptions.push({ to: 'copper', label: 'Měděné',  cost: MATERIALS.copper.buildCost, minPhase: 2 });
        upgradeOptions.push({ to: 'steel',  label: 'Ocelové', cost: MATERIALS.steel.buildCost,  minPhase: 3 });
      } else if (pipe.material === 'copper') {
        upgradeOptions.push({ to: 'steel',  label: 'Ocelové', cost: MATERIALS.steel.buildCost,  minPhase: 3 });
      }

      return (
        <div className="space-y-4">
          {/* Status grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-stone-950 rounded p-2 border border-stone-800 text-center">
              <div className="text-[9px] text-stone-500 font-mono">MATERIÁL</div>
              <div className="text-sm font-bold font-mono mt-0.5" style={{ color: mat.activeColor }}>{mat.label}</div>
            </div>
            <div className="bg-stone-950 rounded p-2 border border-stone-800 text-center">
              <div className="text-[9px] text-stone-500 font-mono">TLAK</div>
              <div className={`text-sm font-bold font-mono mt-0.5 ${(pipe.pressure ?? 0) > mat.maxPressure ? 'text-red-400' : 'text-amber-400'}`}>
                {Math.round(pipe.pressure ?? 0)}
                <span className="text-stone-600 text-[9px]"> / {mat.maxPressure}</span>
              </div>
            </div>
            <div className="bg-stone-950 rounded p-2 border border-stone-800 text-center">
              <div className="text-[9px] text-stone-500 font-mono">ZTRÁTA</div>
              <div className="text-sm font-bold font-mono mt-0.5 text-stone-400">
                -{pressureLoss}
                <span className="text-stone-600 text-[9px]"> bar</span>
              </div>
            </div>
          </div>

          {/* Integrity */}
          <div className="bg-stone-950 rounded p-3 border border-stone-800">
            <div className="flex justify-between items-center mb-1.5">
              <div className="text-[10px] text-stone-500 font-mono tracking-wider">INTEGRITA</div>
              <div className={`text-xs font-bold font-mono ${integrityPct > 60 ? 'text-green-400' : integrityPct > 30 ? 'text-amber-400' : 'text-red-400 animate-pulse'}`}>
                {integrityPct}%
                <span className="text-stone-600 font-normal"> (max {Math.round(pipe.maxIntegrityCap)}%)</span>
              </div>
            </div>
            <div className="w-full h-3 bg-stone-900 rounded overflow-hidden border border-stone-800">
              <div className={`h-full transition-all ${integrityColor}`} style={{ width: `${integrityPct}%` }} />
            </div>
            {pipe.maxIntegrityCap < 100 && (
              <div className="text-[9px] text-stone-600 mt-1">Kapacita snížena záplatami ({Math.round(pipe.maxIntegrityCap)}%)</div>
            )}
          </div>

          {/* Leak warning */}
          {pipe.isLeaking && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded p-2">
              <AlertTriangle size={14} />
              Trubka teče! Tlak uniká, výkon uzlu snížen.
            </div>
          )}

          {/* Repair / Replace */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { repairPipe(pipeId); setActiveModal(null); }}
              disabled={!canRepair || integrityPct >= pipe.maxIntegrityCap}
              className="py-2 px-2 bg-stone-800 border border-stone-600 text-stone-200 text-xs font-mono rounded hover:bg-stone-700 transition disabled:opacity-40 disabled:cursor-not-allowed leading-snug"
            >
              🔧 Záplata
              <div className="text-stone-500 text-[9px] mt-0.5">{REPAIR_COST.scrap}× šrot + {REPAIR_COST.wood}× dřevo</div>
            </button>
            <button
              onClick={() => { replacePipe(pipeId); setActiveModal(null); }}
              disabled={!canReplace}
              className="py-2 px-2 bg-stone-800 border border-stone-600 text-stone-200 text-xs font-mono rounded hover:bg-stone-700 transition disabled:opacity-40 disabled:cursor-not-allowed leading-snug"
            >
              🔄 Výměna
              <div className="text-stone-500 text-[9px] mt-0.5">{REPLACE_COST.scrap}× šrot + {REPLACE_COST.parts}× sou.</div>
            </button>
          </div>

          {/* Upgrade */}
          {upgradeOptions.length > 0 && (
            <div>
              <div className="text-[10px] text-stone-600 uppercase tracking-wider mb-2">Upgrade materiálu</div>
              <div className="space-y-2">
                {upgradeOptions.map(opt => {
                  const locked     = techPhase < opt.minPhase;
                  const canAfford  = Object.entries(opt.cost).every(([k, v]) => (resources[k] ?? 0) >= v);
                  const costStr    = Object.entries(opt.cost).map(([k, v]) => `${v}× ${RESOURCE_LABELS[k]}`).join(', ');
                  return (
                    <button
                      key={opt.to}
                      onClick={() => { upgradePipe(pipeId, opt.to); setActiveModal(null); }}
                      disabled={locked || !canAfford}
                      className="w-full py-2 px-3 bg-amber-900/20 border border-amber-800/40 text-amber-300 text-xs font-mono rounded hover:bg-amber-900/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex justify-between items-center">
                        <span>→ {opt.label}</span>
                        {locked
                          ? <span className="text-stone-600">🔒 fáze {opt.minPhase}</span>
                          : <span className="text-stone-500">{costStr}</span>
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {pipe.material === 'steel' && (
            <div className="text-[10px] text-stone-600 text-center">Ocelové potrubí — maximální upgrade.</div>
          )}
        </div>
      );
    }

    if (activeModal === 'buildings_overview') {
      const allBuildings = [
        { key: 'collector',  icon: '💧', label: 'Sběrač kondenzátu', effect: '+voda (závisí na kotli)', phase: 1 },
        { key: 'dynamo',     icon: '⚡', label: 'Dynamo',            effect: '+energie',                phase: 2 },
        { key: 'distillery', icon: '💧', label: 'Destilérka',        effect: '++voda (závisí na kotli)',phase: 2 },
        { key: 'greenhouse', icon: '🌱', label: 'Pěstírna',          effect: '-spotřeba jídla',         phase: 3 },
        { key: 'workshop',   icon: '🔧', label: 'Dílna',             effect: 'crafting',                phase: 4 },
      ];
      return (
        <div className="space-y-2">
          {allBuildings.map(b => {
            const isBuilt  = buildings[b.key]?.built;
            const locked   = techPhase < b.phase;
            return (
              <div
                key={b.key}
                className={`flex items-center gap-3 p-2 rounded border transition ${
                  locked ? 'opacity-40 cursor-not-allowed border-stone-800/40' :
                  isBuilt ? 'bg-stone-950 border-stone-700 cursor-pointer hover:border-amber-700/50' :
                            'bg-stone-950/50 border-stone-800/50 cursor-pointer hover:border-amber-700/50'
                }`}
                onClick={() => !locked && setActiveModal(`build_${b.key}`)}
              >
                <span className="text-lg">{b.icon}</span>
                <div className="flex-1">
                  <div className={`text-sm font-bold ${isBuilt ? 'text-stone-200' : locked ? 'text-stone-600' : 'text-stone-500'}`}>{b.label}</div>
                  <div className="text-[10px] text-stone-600">{b.effect}</div>
                </div>
                <div className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isBuilt ? 'text-green-400 bg-green-900/40 border-green-700/40' :
                  locked  ? 'text-stone-600 border-stone-700/30' :
                            'text-amber-600 bg-amber-900/20 border-amber-800/30'
                }`}>
                  {isBuilt ? 'AKTIVNÍ' : locked ? `fáze ${b.phase}` : 'STAVĚT'}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  const titleMap = {
    boiler:              '⚙ HLAVNÍ KOTEL',
    build_collector:     '💧 SBĚRAČ KONDENZÁTU',
    build_dynamo:        '⚡ DYNAMO',
    build_distillery:    '💧 DESTILÉRKA',
    build_greenhouse:    '🌱 PĚSTÍRNA',
    build_workshop:      '🔧 DÍLNA',
    map:                 '🗺 MAPA OKOLÍ',
    buildings_overview:  '🏗 PŘEHLED STAVEB',
    characters:          '👥 POSTAVY',
    nadia_trade:         '🤝 OBCHOD S NADIÍ',
    tech_tree:           '📈 TECHNOLOGICKÝ STROM',
    ...Object.fromEntries(
      Object.keys(PIPE_SLOTS).map(id => [
        `pipe_${id}`,
        `🪛 TRUBKA › ${NODE_LABELS[id.replace('boiler_', '')] ?? id}`,
      ])
    ),
  };

  return (
    <div
      className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center font-mono"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="bg-stone-900 border-2 border-amber-800 p-6 rounded-lg w-full max-w-sm shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={() => setActiveModal(null)} className="absolute top-3 right-3 text-stone-500 hover:text-red-400 transition">✕</button>
        <h3 className="text-lg font-bold text-amber-500 mb-4 border-b border-stone-700 pb-2">
          {titleMap[activeModal] ?? activeModal}
        </h3>
        {renderContent()}
        <div className="flex justify-end mt-5">
          <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 bg-stone-800 border border-stone-600 text-stone-300 hover:bg-stone-700 rounded transition text-sm">
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── FLOATING PANEL BASE (drag) ──────────────────────────────────────────────

const FloatingPanel = ({ id, title, children, defaultX = 200, defaultY = 80 }) => {
  const { floatingPanels, toggleFloatingPanel, moveFloatingPanel } = useGameStore();
  const panel = floatingPanels[id];
  if (!panel?.open) return null;

  const x = panel.x ?? defaultX;
  const y = panel.y ?? defaultY;

  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: x, py: y };
    e.preventDefault();
    const onMove = (ev) => {
      if (!dragging.current) return;
      const nx = dragStart.current.px + ev.clientX - dragStart.current.mx;
      const ny = dragStart.current.py + ev.clientY - dragStart.current.my;
      moveFloatingPanel(id, Math.max(0, nx), Math.max(0, ny));
    };
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [x, y, id, moveFloatingPanel]);

  return (
    <div
      className="absolute z-40 select-none"
      style={{ left: x, top: y, minWidth: 280 }}
    >
      <div className="bg-stone-900 border-2 border-amber-800/60 rounded-lg shadow-2xl overflow-hidden">
        {/* Hlavička — drag handle */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-stone-950 border-b border-stone-700 cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
        >
          <span className="text-[10px] font-bold font-mono text-amber-500 tracking-widest">{title}</span>
          <button
            onClick={() => toggleFloatingPanel(id)}
            className="text-stone-600 hover:text-red-400 transition text-sm leading-none ml-3"
            onMouseDown={e => e.stopPropagation()}
          >✕</button>
        </div>
        {/* Obsah */}
        <div className="p-3">
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── DISTRIBUTOR PANEL ────────────────────────────────────────────────────────

const DistributorPanel = () => {
  const { buildings, valves, toggleValve, distributorPressure, branchDrop, buildings: b } = useGameStore();
  const boilerP = buildings.boiler.pressure;

  const BRANCH_DEFS = [
    { id: 'heating',      label: 'Topení',     icon: '🔥', cost: 0.04, effect: '+teplo',      color: 'amber',  alwaysBuilt: true  },
    { id: 'collector',    label: 'Sběrač',      icon: '💧', cost: 0.02, effect: '+voda (kond)',color: 'blue',   alwaysBuilt: false },
    { id: 'distillery',   label: 'Destilérka',  icon: '⚗',  cost: 0.05, effect: '+voda++',     color: 'cyan',   alwaysBuilt: false },
    { id: 'dynamo',       label: 'Dynamo',      icon: '⚡', cost: 0.06, effect: '+energie',    color: 'yellow', alwaysBuilt: false },
    { id: 'greenhouse',   label: 'Pěstírna',    icon: '🌱', cost: 0.03, effect: '+jídlo',      color: 'green',  alwaysBuilt: false },
    { id: 'workshop',     label: 'Dílna',       icon: '🔧', cost: 0.02, effect: 'pneumatika',  color: 'stone',  alwaysBuilt: false },
    { id: 'defense_vent', label: 'Odfuk',       icon: '💨', cost: 0.20, effect: 'obrana!',     color: 'red',    alwaysBuilt: false },
  ];

  const colorMap = {
    amber:  { on: 'bg-amber-600 border-amber-400',  off: 'bg-stone-800 border-stone-600', dot: 'bg-amber-400',  text: 'text-amber-400'  },
    blue:   { on: 'bg-blue-600 border-blue-400',    off: 'bg-stone-800 border-stone-600', dot: 'bg-blue-400',   text: 'text-blue-400'   },
    cyan:   { on: 'bg-cyan-600 border-cyan-400',    off: 'bg-stone-800 border-stone-600', dot: 'bg-cyan-400',   text: 'text-cyan-400'   },
    yellow: { on: 'bg-yellow-500 border-yellow-300',off: 'bg-stone-800 border-stone-600', dot: 'bg-yellow-400', text: 'text-yellow-400' },
    green:  { on: 'bg-green-600 border-green-400',  off: 'bg-stone-800 border-stone-600', dot: 'bg-green-400',  text: 'text-green-400'  },
    stone:  { on: 'bg-stone-500 border-stone-300',  off: 'bg-stone-800 border-stone-600', dot: 'bg-stone-400',  text: 'text-stone-400'  },
    red:    { on: 'bg-red-600 border-red-400 animate-pulse', off: 'bg-stone-800 border-stone-600', dot: 'bg-red-500', text: 'text-red-400' },
  };

  const totalDrop = BRANCH_DEFS.reduce((s, br) => {
    const isBuilt = br.alwaysBuilt || b[br.id]?.built;
    return s + (valves[br.id] && isBuilt ? br.cost : 0);
  }, 0);

  const pressureAfter = Math.max(0, boilerP - totalDrop);
  const pressureBarPct = Math.min(100, (boilerP / 15) * 100);
  const distPressurePct = Math.min(100, (distributorPressure / 15) * 100);

  return (
    <FloatingPanel id="distributor" title="⚙ ROZDĚLOVAČ PÁRY">
      {/* Tlak příchozí / odchozí */}
      <div className="mb-3 bg-stone-950 rounded p-2 border border-stone-800">
        <div className="flex justify-between text-[9px] font-mono text-stone-500 mb-1">
          <span>TLAK KOTLE</span>
          <span className={boilerP > 8 ? 'text-red-400 font-bold' : boilerP > 2 ? 'text-amber-400' : 'text-stone-600'}>
            {boilerP.toFixed(2)} bar
          </span>
        </div>
        <div className="w-full h-2 bg-stone-900 rounded overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-500 ${boilerP > 8 ? 'bg-red-600' : boilerP > 4 ? 'bg-amber-500' : boilerP > 1 ? 'bg-green-500' : 'bg-stone-700'}`}
            style={{ width: `${pressureBarPct}%` }}
          />
        </div>

        <div className="flex justify-between text-[9px] font-mono text-stone-500 mb-1">
          <span>V ROZDĚLOVAČI</span>
          <span className="text-amber-600">{distributorPressure.toFixed(2)} bar</span>
        </div>
        <div className="w-full h-1.5 bg-stone-900 rounded overflow-hidden mb-2">
          <div className="h-full bg-amber-700 transition-all duration-500" style={{ width: `${distPressurePct}%` }} />
        </div>

        <div className="flex justify-between text-[9px] font-mono">
          <span className="text-stone-600">Celkový odběr:</span>
          <span className={totalDrop > boilerP ? 'text-red-400' : 'text-stone-400'}>−{totalDrop.toFixed(2)} bar/tick</span>
        </div>
        <div className="flex justify-between text-[9px] font-mono mt-0.5">
          <span className="text-stone-600">Po odběru:</span>
          <span className={pressureAfter < 0.5 ? 'text-red-400' : 'text-green-400'}>{pressureAfter.toFixed(2)} bar</span>
        </div>
      </div>

      {/* Ventily */}
      <div className="space-y-1.5">
        {BRANCH_DEFS.map(br => {
          const isBuilt = br.alwaysBuilt || b[br.id]?.built;
          const isOpen  = valves[br.id] && isBuilt;
          const c       = colorMap[br.color];
          const active  = branchDrop?.[br.id] > 0;

          return (
            <div
              key={br.id}
              className={`flex items-center gap-2 p-2 rounded border transition ${
                !isBuilt ? 'opacity-30 border-stone-800 bg-stone-950' :
                isOpen   ? 'border-stone-700 bg-stone-800/50' :
                           'border-stone-800 bg-stone-950'
              }`}
            >
              {/* Ventil toggle */}
              <button
                onClick={() => isBuilt && toggleValve(br.id)}
                disabled={!isBuilt}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${isOpen ? c.on : c.off}`}
                title={isBuilt ? (isOpen ? 'Zavřít ventil' : 'Otevřít ventil') : 'Budova není postavena'}
              >
                <span className="text-[11px]">{br.icon}</span>
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold font-mono ${isOpen ? c.text : 'text-stone-500'}`}>{br.label}</span>
                  {!isBuilt && <span className="text-[8px] text-stone-700 font-mono">NEPOSTAVENO</span>}
                </div>
                <div className="text-[8px] text-stone-600">{br.effect}</div>
              </div>

              {/* Odběr a flow indicator */}
              <div className="flex flex-col items-end flex-shrink-0">
                <span className={`text-[9px] font-mono ${isOpen ? 'text-amber-700' : 'text-stone-700'}`}>
                  −{br.cost.toFixed(2)}
                </span>
                {/* Flow animace */}
                <div className="flex gap-0.5 mt-0.5">
                  {[0,1,2].map(i => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full transition-all ${active ? c.dot : 'bg-stone-800'}`}
                      style={active ? { animationDelay: `${i * 0.15}s`, animation: 'pulse 0.8s ease-in-out infinite' } : {}}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Varování */}
      {totalDrop > boilerP && boilerP > 0.1 && (
        <div className="mt-2 text-[9px] text-red-400 bg-red-950/30 border border-red-800/40 rounded p-1.5 font-mono">
          ⚠ Odběr převyšuje tlak kotle — část větví nefunguje!
        </div>
      )}
      {buildings.boiler.pressure < 0.5 && (
        <div className="mt-2 text-[9px] text-stone-600 bg-stone-950 border border-stone-800 rounded p-1.5 font-mono text-center">
          Kotel nevyrábí páru
        </div>
      )}
    </FloatingPanel>
  );
};

// ─── INTRO SCREEN ────────────────────────────────────────────────────────────

const INTRO_SLIDES = [
  {
    title: 'Den první. Továrna na okraji města.',
    body: 'Venku je −12 °C. Elektřina nefunguje od minulého týdne.\nKotel stojí uprostřed haly — studený, prázdný, tichý.\nBez tepla přežiješ tuto noc jen stěží.',
    hint: null,
    icon: '🌨',
  },
  {
    title: 'V rohu jsou dva barely.',
    body: 'Trochu vody. Trochu dřeva.\nDost na to, aby kotel začal hřát — ale ne na dlouho.\nMusíš jednat rychle a pak najít způsob, jak zásoby doplňovat.',
    hint: '→ Přečerpej vodu ze sudu do kotle',
    icon: '🪣',
  },
  {
    title: 'Kotel je stará věc. Vybuchne, když ho nebudeš hlídat.',
    body: 'Sleduj teplotu a tlak. Ideál je 120–180 °C, 2–5 bar.\nNad 8 bar = nebezpečí. Bez vody = poškození.\nVypouštěcí ventil je tvůj přítel.',
    hint: '→ Přiložit palivo → kotel → Přiložit',
    icon: '⚙',
  },
  {
    title: 'Nadia přijde za dva dny.',
    body: 'Kulhá, ale nosí zásoby ze města.\nDo té doby jsi na to sám.\nZajisti teplo, než dojde dřevo.',
    hint: null,
    icon: '👤',
  },
];

const IntroScreen = () => {
  const { introStep, advanceIntro, skipIntro } = useGameStore();
  if (introStep < 0) return null;

  const slide = INTRO_SLIDES[introStep];
  const isLast = introStep >= INTRO_SLIDES.length - 1;

  return (
    <div className="absolute inset-0 z-[100] bg-black flex items-center justify-center font-mono">
      {/* Jemné zrnění */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }}
      />

      <div className="relative max-w-lg w-full mx-8">
        {/* Krok indikátor */}
        <div className="flex gap-1.5 mb-8 justify-center">
          {INTRO_SLIDES.map((_, i) => (
            <div key={i} className={`h-0.5 w-8 rounded-full transition-all duration-500 ${i <= introStep ? 'bg-amber-600' : 'bg-stone-800'}`} />
          ))}
        </div>

        {/* Ikona */}
        <div className="text-5xl text-center mb-6 opacity-60">{slide.icon}</div>

        {/* Titulek */}
        <h2 className="text-amber-500 text-lg font-bold tracking-wider mb-4 text-center">
          {slide.title}
        </h2>

        {/* Text */}
        <p className="text-stone-400 text-sm leading-relaxed text-center whitespace-pre-line mb-6">
          {slide.body}
        </p>

        {/* Hint */}
        {slide.hint && (
          <div className="bg-stone-900 border border-amber-900/50 rounded px-4 py-2 text-amber-700 text-xs text-center mb-6 tracking-wide">
            {slide.hint}
          </div>
        )}

        {/* Tlačítka */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={skipIntro}
            className="px-4 py-2 text-stone-600 hover:text-stone-400 text-xs transition border border-stone-800 hover:border-stone-700 rounded"
          >
            Přeskočit
          </button>
          <button
            onClick={isLast ? skipIntro : advanceIntro}
            className="px-8 py-2 bg-amber-900/50 border border-amber-700 text-amber-300 text-sm font-bold hover:bg-amber-900/80 rounded transition"
          >
            {isLast ? 'Začít hrát →' : 'Dál →'}
          </button>
        </div>

        {/* Číslo slajdu */}
        <div className="text-center mt-6 text-stone-700 text-xs">
          {introStep + 1} / {INTRO_SLIDES.length}
        </div>
      </div>
    </div>
  );
};

// ─── ROOT ────────────────────────────────────────────────────────────────────

export default function App() {
  useGameLoop();
  const introStep = useGameStore(s => s.introStep);
  return (
    <div className="w-full h-screen bg-black flex flex-col overflow-hidden selection:bg-amber-900 selection:text-white">
      <TopBar />
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <LeftSidebar />
        <GameCanvas />
        <Modal />
        {introStep >= 0 && <IntroScreen />}
      </div>
      <BottomBar />
    </div>
  );
}
