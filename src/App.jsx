import React, { useRef } from 'react';
import {
  Settings, Heart, Utensils, Flame, Droplets, Zap,
  Hammer, Wrench, Box, Cog, Map, User,
  Thermometer, Wind, CheckSquare, Square, Moon, Sun,
  PauseCircle, PlayCircle, AlertTriangle, Package
} from 'lucide-react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';

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
  const { stats, resources, dayNumber, phase, timeOfDay, paused, togglePause } = useGameStore();
  return (
    <div className="flex items-center justify-between bg-stone-950 border-b-2 border-amber-900/50 p-2 text-amber-100 text-sm shadow-md z-10 font-mono flex-shrink-0">
      <div className="flex space-x-3 items-center bg-stone-900 px-3 py-1 rounded border border-stone-700">
        <span className="font-bold text-amber-500">DEN {dayNumber}</span>
        <span className="text-stone-400">{formatTime(timeOfDay)}</span>
        {phase === 'day'
          ? <Sun size={14} className="text-amber-400" />
          : <Moon size={14} className="text-blue-400" />
        }
        <button onClick={togglePause} className="ml-1 text-stone-500 hover:text-amber-400 transition" title={paused ? 'Pokračovat' : 'Pauza'}>
          {paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
        </button>
        {paused && <span className="text-xs text-amber-600 animate-pulse">PAUZA</span>}
      </div>

      <div className="flex space-x-3">
        <StatBar label="Zdraví"  icon={<Heart    size={16} className="text-red-500"    />} value={stats.health} color="bg-red-600"    />
        <StatBar label="Jídlo"   icon={<Utensils size={16} className="text-orange-400" />} value={stats.food}   color="bg-orange-500" />
        <StatBar label="Teplo"   icon={<Flame    size={16} className="text-amber-500"  />} value={stats.heat}   color="bg-amber-600"  />
        <StatBar label="Voda"    icon={<Droplets size={16} className="text-blue-400"   />} value={stats.water}  color="bg-blue-500"   />
        <StatBar label="Energie" icon={<Zap      size={16} className="text-yellow-400" />} value={stats.power}  color="bg-yellow-500" />
      </div>

      <div className="flex space-x-5 items-center">
        <ResourceItem icon={<Cog  size={15} />} label="Šrot"       value={resources.scrap} />
        <ResourceItem icon={<Box  size={15} />} label="Dřevo"      value={resources.wood}  />
        <ResourceItem icon={<Flame size={15} className="text-orange-600" />} label="Uhlí" value={resources.coal} low={resources.coal < 5} />
        <ResourceItem icon={<Wrench size={15} />} label="Součástky" value={resources.parts} />
        <button className="p-1 hover:bg-stone-800 rounded transition border border-transparent hover:border-stone-600">
          <Settings size={18} className="text-stone-400" />
        </button>
      </div>
    </div>
  );
};

// ─── LEFT SIDEBAR ────────────────────────────────────────────────────────────

const LeftSidebar = () => {
  const { activeLeftTab, setActiveLeftTab, tasks, toggleTask, messages } = useGameStore();
  return (
    <div className="w-64 bg-stone-900/90 border-r-2 border-amber-900/30 flex shadow-lg flex-col font-mono z-10 h-full flex-shrink-0">
      <div className="flex flex-col space-y-2 p-2 border-b border-stone-800">
        <button className="p-3 bg-stone-800 rounded hover:bg-stone-700 border border-stone-700 transition flex justify-center">
          <Hammer className="text-stone-400" size={22} />
        </button>
        <button className="p-3 bg-stone-800 rounded hover:bg-stone-700 border border-stone-700 transition flex justify-center">
          <Wrench className="text-stone-400" size={22} />
        </button>
      </div>

      <div className="flex border-b border-stone-800 text-xs">
        {['tasks', 'inventory', 'log'].map(tab => (
          <button
            key={tab}
            className={`flex-1 py-2 text-center transition uppercase tracking-wider ${
              activeLeftTab === tab
                ? 'bg-stone-800 text-amber-500 font-bold border-b-2 border-amber-500'
                : 'text-stone-500 hover:bg-stone-800/50'
            }`}
            onClick={() => setActiveLeftTab(tab)}
          >
            {tab === 'tasks' ? 'Úkoly' : tab === 'inventory' ? 'Inv.' : 'Log'}
          </button>
        ))}
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
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

        {activeLeftTab === 'inventory' && (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square bg-stone-950 border border-stone-800 rounded flex items-center justify-center hover:border-amber-700/50 transition cursor-pointer">
                {i === 0 && <Flame className="text-stone-500" size={18} />}
                {i === 1 && <Box   className="text-stone-500" size={18} />}
                {i === 2 && <Cog   className="text-stone-500" size={18} />}
              </div>
            ))}
          </div>
        )}

        {activeLeftTab === 'log' && (
          <div className="space-y-2">
            {messages.length === 0 && <p className="text-stone-600 text-xs">Zatím žádné záznamy.</p>}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`text-xs p-2 rounded border ${
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
      </div>
    </div>
  );
};

// ─── KOTEL ────────────────────────────────────────────────────────────────────

const Boiler = ({ fuel, heat, onClick }) => {
  const boilerActive = fuel > 0;
  // Intenzita plamenů podle paliva (0–1)
  const intensity = fuel / 100;
  // Budík 1 ukazuje teplo (0–100 → úhel -120 až +120)
  const gauge1Angle = -120 + (heat / 100) * 240;
  // Budík 2 ukazuje palivo
  const gauge2Angle = -120 + (fuel / 100) * 240;

  const flames = [
    { delay: '0s',    baseH: 28, varH: 12 },
    { delay: '0.2s',  baseH: 20, varH: 16 },
    { delay: '0.1s',  baseH: 32, varH: 8  },
    { delay: '0.35s', baseH: 18, varH: 14 },
    { delay: '0.15s', baseH: 26, varH: 10 },
  ];

  return (
    <div
      className={`relative w-56 h-80 bg-gradient-to-b from-stone-700 to-stone-900 border-4 ${
        boilerActive
          ? fuel < 15 ? 'border-red-700 hover:border-red-500' : 'border-amber-800 hover:border-amber-500'
          : 'border-stone-600 hover:border-stone-400'
      } rounded-t-full rounded-b-lg shadow-2xl flex flex-col items-center justify-end pb-6 cursor-pointer transition-colors duration-700 group select-none`}
      onClick={onClick}
    >
      {/* Záře kotle */}
      {boilerActive && (
        <div
          className="absolute inset-0 rounded-t-full rounded-b-lg pointer-events-none transition-opacity duration-1000"
          style={{
            boxShadow: `0 0 ${20 + intensity * 40}px ${8 + intensity * 20}px rgba(251,146,60,${0.1 + intensity * 0.2})`,
          }}
        />
      )}

      {/* Budík 1 — Teplo */}
      <div className="absolute top-12 left-3 w-10 h-10 bg-stone-200 rounded-full border-4 border-amber-800 flex items-center justify-center shadow-inner" title="Teplo">
        <div
          className="absolute w-4 h-0.5 bg-red-600 rounded-full origin-right transition-transform duration-1000"
          style={{ transform: `rotate(${gauge1Angle}deg)` }}
        />
        <div className="absolute w-1.5 h-1.5 bg-stone-800 rounded-full z-10" />
      </div>

      {/* Budík 2 — Palivo */}
      <div className="absolute top-28 -left-5 w-12 h-12 bg-stone-200 rounded-full border-4 border-amber-800 flex items-center justify-center shadow-inner" title="Palivo">
        <div
          className="absolute w-5 h-0.5 bg-red-600 rounded-full origin-right transition-transform duration-1000"
          style={{ transform: `rotate(${gauge2Angle}deg)` }}
        />
        <div className="absolute w-2 h-2 bg-stone-800 rounded-full z-10" />
      </div>

      {/* Indikátor paliva (sloupec) */}
      <div className="absolute top-6 right-4 flex flex-col items-center gap-1">
        <div className="text-[8px] font-mono text-stone-500 tracking-widest">FUEL</div>
        <div className="w-3.5 h-16 bg-stone-950 border border-stone-700 rounded-sm overflow-hidden flex flex-col justify-end">
          <div
            className={`w-full transition-all duration-1000 ${
              fuel > 30 ? 'bg-amber-600' : fuel > 10 ? 'bg-orange-600' : 'bg-red-700'
            }`}
            style={{ height: `${fuel}%` }}
          />
        </div>
        <div className={`text-[8px] font-mono font-bold ${fuel < 15 ? 'text-red-400 animate-pulse' : 'text-stone-500'}`}>
          {fuel}
        </div>
      </div>

      {/* Label */}
      <div className="text-center mb-3 z-10">
        <div className="text-amber-500 font-bold font-mono text-sm tracking-wider drop-shadow-md">HLAVNÍ KOTEL</div>
        <div className={`text-[10px] font-mono font-bold mt-0.5 ${
          boilerActive
            ? fuel < 15 ? 'text-orange-400 animate-pulse' : 'text-green-500'
            : 'text-red-500 animate-pulse'
        }`}>
          {boilerActive ? (fuel < 15 ? '⚠ MÁLO PALIVA' : '✓ V PROVOZU') : '✗ ZHASLÝ'}
        </div>
      </div>

      {/* Dvířka s plameny */}
      <div className={`w-28 h-20 border-2 border-stone-950 bg-stone-900 rounded-t-lg relative overflow-hidden ${
        boilerActive ? 'group-hover:border-amber-600' : ''
      }`}>
        <div className={`absolute inset-0 transition-colors duration-700 ${boilerActive ? 'bg-orange-600/15' : 'bg-stone-800/10'}`} />
        {boilerActive && (
          <div className="absolute bottom-0 w-full flex justify-evenly items-end px-1 pb-1">
            {flames.map((f, i) => (
              <div
                key={i}
                className="rounded-t-full animate-pulse"
                style={{
                  width: '10px',
                  height: `${Math.round((f.baseH + f.varH * intensity) * 0.8)}px`,
                  animationDelay: f.delay,
                  animationDuration: `${0.8 + i * 0.15}s`,
                  background: `linear-gradient(to top, #fde047, #f97316 50%, #dc2626)`,
                  boxShadow: `0 0 ${6 + intensity * 10}px rgba(251,146,60,0.8)`,
                  opacity: 0.7 + intensity * 0.3,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── BUILD NODE ──────────────────────────────────────────────────────────────

const BuildNode = ({ title, icon, onClick, built, effect }) => (
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
      built
        ? 'bg-green-900/60 text-green-400 border-green-700/50'
        : 'bg-stone-900/50 text-stone-500 border-stone-700/50'
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

// ─── GAME CANVAS ─────────────────────────────────────────────────────────────

const GameCanvas = () => {
  const { buildings, setActiveModal, phase, stats } = useGameStore();
  const { boiler, dynamo, greenhouse, distillery } = buildings;
  const boilerActive = boiler.fuel > 0;

  return (
    <div className={`flex-1 relative overflow-hidden flex items-center justify-center transition-colors duration-3000 ${
      phase === 'night' ? 'bg-stone-950' : 'bg-[#111]'
    }`}>
      {/* Mřížka */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'linear-gradient(#555 1px, transparent 1px), linear-gradient(90deg, #555 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {/* Noční tma */}
      {phase === 'night' && <div className="absolute inset-0 bg-blue-950/10 pointer-events-none" />}

      {/* Záře od kotle v okolí */}
      {boilerActive && (
        <div
          className="absolute pointer-events-none transition-opacity duration-2000"
          style={{
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px', height: '400px',
            background: `radial-gradient(circle, rgba(251,146,60,${0.03 + (boiler.fuel / 100) * 0.06}) 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="relative w-full max-w-4xl" style={{ aspectRatio: '16/9' }}>
        {/* Nápisy místností */}
        <div className="absolute top-8 left-10 text-stone-700 font-mono text-lg tracking-widest font-bold">SKLADIŠTĚ</div>
        <div className="absolute top-8 right-10 text-stone-700 font-mono text-lg tracking-widest font-bold">OBYTNÁ ČÁST</div>
        <div className="absolute bottom-8 right-10 text-stone-700 font-mono text-sm tracking-widest font-bold">DÍLNA</div>

        {/* Trubka Dynamo → Kotel */}
        <div
          className={`absolute border-t-4 border-l-4 rounded-tl-2xl transition-colors duration-1000 ${boilerActive && dynamo.built ? 'border-amber-800' : 'border-stone-700'}`}
          style={{ bottom: '22%', left: '16%', width: '26%', height: '28%', opacity: 0.6 }}
        />
        {/* Trubka Pěstírna → Kotel */}
        <div
          className={`absolute border-t-4 border-r-4 rounded-tr-2xl transition-colors duration-1000 ${boilerActive && greenhouse.built ? 'border-amber-800' : 'border-stone-700'}`}
          style={{ bottom: '22%', right: '16%', width: '26%', height: '28%', opacity: 0.6 }}
        />

        {/* Tok v trubkách (animovaný pruh) */}
        {boilerActive && dynamo.built && (
          <div
            className="absolute bg-gradient-to-r from-transparent via-amber-600/30 to-transparent animate-pulse"
            style={{ bottom: '22%', left: '16%', width: '26%', height: '3px' }}
          />
        )}
        {boilerActive && greenhouse.built && (
          <div
            className="absolute bg-gradient-to-l from-transparent via-amber-600/30 to-transparent animate-pulse"
            style={{ bottom: '22%', right: '16%', width: '26%', height: '3px' }}
          />
        )}

        {/* Kotel — střed */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <Boiler
              fuel={boiler.fuel}
              heat={stats.heat}
              onClick={() => setActiveModal('boiler')}
            />
          </div>
        </div>

        {/* Dynamo — vlevo dole */}
        <div className="absolute" style={{ bottom: '10%', left: '8%' }}>
          <BuildNode
            title="DYNAMO"
            built={dynamo.built}
            effect="⚡ +ENERGIE"
            icon={<Zap size={28} className={dynamo.built ? 'text-yellow-400' : 'text-stone-500 group-hover:text-yellow-400'} />}
            onClick={() => setActiveModal('build_dynamo')}
          />
        </div>

        {/* Pěstírna — vpravo dole */}
        <div className="absolute" style={{ bottom: '10%', right: '8%' }}>
          <BuildNode
            title="PĚSTÍRNA"
            built={greenhouse.built}
            effect="🌱 -HLAD"
            icon={<Wind size={28} className={greenhouse.built ? 'text-green-400' : 'text-stone-500 group-hover:text-green-400'} />}
            onClick={() => setActiveModal('build_greenhouse')}
          />
        </div>

        {/* Lihovar — vlevo nahoře */}
        <div className="absolute" style={{ top: '12%', left: '8%' }}>
          <BuildNode
            title="LIHOVAR"
            built={distillery.built}
            effect="💧 +VODA"
            icon={<Droplets size={28} className={distillery.built ? 'text-blue-400' : 'text-stone-500 group-hover:text-blue-400'} />}
            onClick={() => setActiveModal('build_distillery')}
          />
        </div>

        {/* Workshop — vpravo nahoře */}
        <div className="absolute" style={{ top: '12%', right: '8%' }}>
          <BuildNode
            title="DÍLNA"
            built={buildings.workshop.built}
            effect="🔧 CRAFT"
            icon={<Wrench size={28} className={buildings.workshop.built ? 'text-amber-400' : 'text-stone-500 group-hover:text-amber-400'} />}
            onClick={() => setActiveModal('build_workshop')}
          />
        </div>
      </div>
    </div>
  );
};

// ─── BOTTOM BAR ──────────────────────────────────────────────────────────────

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

const BottomBar = () => {
  const { setActiveModal, phase } = useGameStore();
  return (
    <div className="bg-stone-950 border-t-2 border-amber-900/50 p-2 flex items-center justify-between z-10 flex-shrink-0">
      <div className="flex items-center gap-2 text-xs font-mono text-stone-600 pl-2">
        {phase === 'night'
          ? <span className="text-blue-500 animate-pulse">◆ NOC — výprava venku</span>
          : <span className="text-amber-700">◆ DEN — spravuj přístřešek</span>
        }
      </div>

      <div className="flex flex-col items-center">
        <div className="text-[10px] text-amber-700 font-mono mb-1 font-bold tracking-widest">STAVBY</div>
        <div className="flex space-x-1.5 bg-stone-900 p-1 rounded-lg border border-stone-800">
          {[
            { Icon: Flame,     label: 'Kotel',    modal: 'boiler'          },
            { Icon: Zap,       label: 'Dynamo',   modal: 'build_dynamo'    },
            { Icon: Wind,      label: 'Pěstírna', modal: 'build_greenhouse'},
            { Icon: Droplets,  label: 'Lihovar',  modal: 'build_distillery'},
            { Icon: Wrench,    label: 'Dílna',    modal: 'build_workshop'  },
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
        <ActionButton icon={<Hammer size={18} />} label="Crafting" />
        <ActionButton icon={<Map    size={18} />} label="Mapa" onClick={() => setActiveModal('map')} />
        <ActionButton icon={<User   size={18} />} label="Postavy" highlight />
      </div>
    </div>
  );
};

// ─── MODAL ───────────────────────────────────────────────────────────────────

const BUILDING_DEFS = {
  dynamo:     { title: 'DYNAMO',    desc: 'Spaluje přebytečné palivo a vyrábí elektřinu. Zastaví pokles energie a pomalu ji dobíjí.',        costs: { scrap: 50, parts: 10 } },
  greenhouse: { title: 'PĚSTÍRNA', desc: 'Hydroponická zahrada. Snižuje spotřebu jídla na polovinu — nezávislost na nočním scavengingu.',   costs: { wood: 30, scrap: 15 } },
  distillery: { title: 'LIHOVAR',  desc: 'Destiluje vodu z okolního vzduchu a nečistot. Pomalu doplňuje zásobu vody i bez donášky.',        costs: { scrap: 20, parts: 5 } },
  workshop:   { title: 'DÍLNA',    desc: 'Umožní vyrábět pokročilé komponenty a opravovat zařízení. Odemkne craftingové menu.',              costs: { scrap: 40, wood: 20, parts: 8 } },
};

const RESOURCE_LABELS = { scrap: 'Šrot', wood: 'Dřevo', coal: 'Uhlí', parts: 'Součástky' };

const Modal = () => {
  const { activeModal, setActiveModal, buildings, stokeBoiler, buildBuilding, resources, stats } = useGameStore();
  if (!activeModal) return null;

  const renderContent = () => {
    // Kotel
    if (activeModal === 'boiler') {
      const { fuel } = buildings.boiler;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-950 rounded p-3 border border-stone-800">
              <div className="text-[10px] text-stone-500 font-mono mb-1">PALIVO</div>
              <div className={`text-2xl font-bold font-mono ${fuel < 15 ? 'text-red-400' : 'text-amber-400'}`}>{fuel}<span className="text-sm text-stone-500"> / 100</span></div>
              <div className="w-full h-2 bg-stone-900 rounded mt-2 overflow-hidden">
                <div className={`h-full transition-all ${fuel > 30 ? 'bg-amber-600' : fuel > 10 ? 'bg-orange-600' : 'bg-red-700'}`} style={{ width: `${fuel}%` }} />
              </div>
            </div>
            <div className="bg-stone-950 rounded p-3 border border-stone-800">
              <div className="text-[10px] text-stone-500 font-mono mb-1">TEPLO</div>
              <div className="text-2xl font-bold font-mono text-amber-400">{Math.round(stats.heat)}<span className="text-sm text-stone-500">%</span></div>
            </div>
          </div>
          <p className="text-stone-400 text-xs">Kotel spotřebovává 1 palivo každých 30 minut. Jedno přiložení spotřebuje 1 uhlí a přidá 10 paliva.</p>
          <div className="flex items-center justify-between bg-stone-950 p-3 rounded border border-stone-800">
            <div className="text-sm">
              <span className="text-stone-500">Uhlí na skladě: </span>
              <span className={`font-bold font-mono ${resources.coal < 3 ? 'text-red-400' : 'text-amber-400'}`}>{resources.coal}</span>
            </div>
            <button
              onClick={() => { stokeBoiler(); }}
              disabled={resources.coal < 1}
              className="px-5 py-2 bg-amber-800 border border-amber-600 text-amber-100 font-bold hover:bg-amber-700 rounded transition disabled:opacity-40 disabled:cursor-not-allowed font-mono text-sm"
            >
              Přiložit (+10)
            </button>
          </div>
          {resources.coal < 3 && (
            <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-950/30 border border-orange-800/40 rounded p-2">
              <AlertTriangle size={14} />
              Uhlí dochází. Výprava ho přinese v noci.
            </div>
          )}
        </div>
      );
    }

    // Stavby
    const buildKey = activeModal.replace('build_', '');
    const def = BUILDING_DEFS[buildKey];
    if (def) {
      const alreadyBuilt = buildings[buildKey]?.built;
      const affordable = Object.entries(def.costs).every(([item, amount]) => (resources[item] ?? 0) >= amount);
      return (
        <div className="space-y-4">
          <p className="text-stone-300 text-sm">{def.desc}</p>
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
          {alreadyBuilt
            ? <div className="text-green-400 font-mono text-sm">✓ Již postaveno a aktivní.</div>
            : (
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
      return <p className="text-stone-400 text-sm">Výprava vychází každou noc automaticky a přináší suroviny. Rozšíření (volba lokace, rizika) přijde v další fázi.</p>;
    }

    return null;
  };

  const titleMap = {
    boiler: '⚙ HLAVNÍ KOTEL',
    build_dynamo: '⚡ DYNAMO',
    build_greenhouse: '🌱 PĚSTÍRNA',
    build_distillery: '💧 LIHOVAR',
    build_workshop: '🔧 DÍLNA',
    map: '🗺 MAPA OKOLÍ',
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

// ─── ROOT ────────────────────────────────────────────────────────────────────

export default function App() {
  useGameLoop();
  return (
    <div className="w-full h-screen bg-black flex flex-col overflow-hidden selection:bg-amber-900 selection:text-white">
      <TopBar />
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <LeftSidebar />
        <GameCanvas />
        <Modal />
      </div>
      <BottomBar />
    </div>
  );
}
