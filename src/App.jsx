import React from 'react';
import {
  Settings, Heart, Utensils, Flame, Droplets, Zap,
  Hammer, Wrench, Box, Cog, Map, User,
  Thermometer, Wind, CheckSquare, Square, Moon, Sun, PauseCircle, PlayCircle
} from 'lucide-react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';

function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const TopBar = () => {
  const { stats, resources, dayNumber, phase, timeOfDay, paused, togglePause } = useGameStore();

  return (
    <div className="flex items-center justify-between bg-stone-950 border-b-2 border-amber-900/50 p-2 text-amber-100 text-sm shadow-md z-10 font-mono">
      {/* Čas a Den */}
      <div className="flex space-x-3 items-center bg-stone-900 px-3 py-1 rounded border border-stone-700">
        <span className="font-bold text-amber-500">DEN {dayNumber}</span>
        <span className="text-stone-400">{formatTime(timeOfDay)}</span>
        {phase === 'day'
          ? <Sun size={14} className="text-amber-400" />
          : <Moon size={14} className="text-blue-400" />
        }
        <button onClick={togglePause} className="ml-1 text-stone-500 hover:text-amber-400 transition">
          {paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
        </button>
      </div>

      {/* Stavy */}
      <div className="flex space-x-3">
        <StatBar icon={<Heart size={16} className="text-red-500" />} value={stats.health} color="bg-red-600" />
        <StatBar icon={<Utensils size={16} className="text-orange-400" />} value={stats.food} color="bg-orange-500" />
        <StatBar icon={<Flame size={16} className="text-amber-500" />} value={stats.heat} color="bg-amber-600" />
        <StatBar icon={<Droplets size={16} className="text-blue-400" />} value={stats.water} color="bg-blue-500" />
        <StatBar icon={<Zap size={16} className="text-yellow-400" />} value={stats.power} color="bg-yellow-500" />
      </div>

      {/* Suroviny */}
      <div className="flex space-x-5">
        <ResourceItem icon={<Cog size={15} />} label="Šrot" value={resources.scrap} />
        <ResourceItem icon={<Box size={15} />} label="Dřevo" value={resources.wood} />
        <ResourceItem icon={<Flame size={15} />} label="Uhlí" value={resources.coal} />
        <ResourceItem icon={<Wrench size={15} />} label="Součástky" value={resources.parts} />
        <button className="p-1 hover:bg-stone-800 rounded transition border border-transparent hover:border-stone-600">
          <Settings size={18} className="text-stone-400" />
        </button>
      </div>
    </div>
  );
};

const StatBar = ({ icon, value, color }) => {
  const pct = Math.round(value);
  const low = pct < 25;
  return (
    <div className={`flex items-center space-x-2 px-2 py-1 rounded border ${low ? 'bg-red-950/40 border-red-800/50' : 'bg-stone-900/80 border-stone-800'}`}>
      {icon}
      <div className="w-16 h-3 bg-stone-950 rounded-sm overflow-hidden border border-stone-700 relative">
        <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
          {pct}%
        </span>
      </div>
    </div>
  );
};

const ResourceItem = ({ icon, label, value }) => (
  <div className="flex items-center space-x-1 text-stone-300" title={label}>
    <span className="text-stone-500">{icon}</span>
    <span className="font-bold">{Math.floor(value)}</span>
  </div>
);

const LeftSidebar = () => {
  const { activeLeftTab, setActiveLeftTab, tasks, toggleTask } = useGameStore();

  return (
    <div className="w-64 bg-stone-900/90 border-r-2 border-amber-900/30 flex shadow-lg flex-col font-mono z-10 h-full">
      <div className="flex flex-col space-y-2 p-2 border-b border-stone-800">
        <button className="p-3 bg-stone-800 rounded hover:bg-stone-700 border border-stone-700 transition flex justify-center">
          <Hammer className="text-stone-400" size={24} />
        </button>
        <button className="p-3 bg-stone-800 rounded hover:bg-stone-700 border border-stone-700 transition flex justify-center">
          <Wrench className="text-stone-400" size={24} />
        </button>
      </div>

      <div className="flex border-b border-stone-800 text-sm">
        <button
          className={`flex-1 py-2 text-center transition ${activeLeftTab === 'inventory' ? 'bg-stone-800 text-amber-500 font-bold border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-800/50'}`}
          onClick={() => setActiveLeftTab('inventory')}
        >
          INVENTÁŘ
        </button>
        <button
          className={`flex-1 py-2 text-center transition ${activeLeftTab === 'tasks' ? 'bg-stone-800 text-amber-500 font-bold border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-800/50'}`}
          onClick={() => setActiveLeftTab('tasks')}
        >
          ÚKOLY
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activeLeftTab === 'tasks' && (
          <div className="space-y-3">
            {tasks.map(task => (
              <div
                key={task.id}
                className="flex items-start space-x-3 cursor-pointer group"
                onClick={() => toggleTask(task.id)}
              >
                <div className="mt-0.5 text-amber-600 group-hover:text-amber-400 transition">
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
                {i === 0 && <Flame className="text-stone-500" />}
                {i === 1 && <Box className="text-stone-500" />}
                {i === 2 && <Cog className="text-stone-500" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BuildNode = ({ title, icon, onClick, status, statusColor = 'text-amber-400', borderColor = 'border-amber-700/50', bgColor = 'bg-amber-900/50' }) => (
  <div
    className="group flex flex-col items-center cursor-pointer transform hover:scale-105 transition-transform"
    onClick={onClick}
  >
    <div className="w-24 h-24 bg-stone-900/80 border-2 border-stone-700 group-hover:border-amber-500 rounded relative flex items-center justify-center shadow-lg">
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-600"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-600"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-600"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-600"></div>
      {icon}
    </div>
    <div className="bg-stone-950 border border-stone-800 px-4 py-1 mt-2 text-sm font-mono text-stone-300 font-bold tracking-wider group-hover:text-amber-100">
      {title}
    </div>
    <div className={`${bgColor} ${statusColor} text-xs px-3 py-0.5 rounded-full mt-1 border ${borderColor}`}>
      {status}
    </div>
  </div>
);

const GameCanvas = () => {
  const { buildings, setActiveModal, phase } = useGameStore();
  const boiler = buildings.boiler;
  const boilerActive = boiler.fuel > 0;
  const fuelPct = boiler.fuel;

  return (
    <div className={`flex-1 relative overflow-hidden flex items-center justify-center transition-colors duration-2000 ${phase === 'night' ? 'bg-stone-950' : 'bg-stone-900'}`}>
      {/* Mřížka */}
      <div className="absolute inset-0 opacity-10"
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Noční overlay */}
      {phase === 'night' && (
        <div className="absolute inset-0 bg-blue-950/20 pointer-events-none" />
      )}

      <div className="relative w-full max-w-4xl aspect-[16/9] border-2 border-stone-800/50 rounded-lg p-8">
        <div className="absolute top-10 left-10 text-stone-700 font-mono text-xl tracking-widest font-bold">SKLADIŠTĚ</div>
        <div className="absolute top-10 right-10 text-stone-700 font-mono text-xl tracking-widest font-bold">OBYTNÁ ČÁST</div>
        <div className="absolute top-40 right-10 text-stone-700 font-mono text-xl tracking-widest font-bold">DÍLNA</div>

        {/* Kotel */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div
            className={`relative w-64 h-96 bg-gradient-to-b from-stone-700 to-stone-900 border-4 ${boilerActive ? 'border-amber-700 hover:border-amber-400' : 'border-stone-600 hover:border-stone-400'} rounded-t-full rounded-b-lg shadow-2xl flex flex-col items-center justify-end pb-8 pointer-events-auto cursor-pointer transition-colors duration-500 group`}
            onClick={() => setActiveModal('boiler')}
          >
            {/* Budíky */}
            <div className="absolute top-20 left-4 w-10 h-10 bg-stone-200 rounded-full border-4 border-amber-700 flex items-center justify-center">
              <div className="w-4 h-0.5 bg-red-600 rotate-45 transform origin-right"></div>
            </div>
            <div className="absolute top-32 -left-6 w-12 h-12 bg-stone-200 rounded-full border-4 border-amber-700 flex items-center justify-center">
              <div className="w-5 h-0.5 bg-red-600 -rotate-12 transform origin-right"></div>
            </div>

            {/* Indikátor paliva */}
            <div className="absolute top-6 right-4 flex flex-col items-center">
              <div className="text-[9px] font-mono text-stone-500 mb-1">PALIVO</div>
              <div className="w-4 h-20 bg-stone-950 border border-stone-700 rounded-sm overflow-hidden flex flex-col justify-end">
                <div
                  className={`w-full transition-all duration-1000 ${fuelPct > 30 ? 'bg-amber-600' : fuelPct > 10 ? 'bg-orange-600' : 'bg-red-700'}`}
                  style={{ height: `${fuelPct}%` }}
                />
              </div>
              <div className={`text-[9px] font-mono mt-1 ${fuelPct < 10 ? 'text-red-400 animate-pulse' : 'text-stone-500'}`}>{fuelPct}</div>
            </div>

            {/* Tělo kotle */}
            <div className="text-center mb-4">
              <h2 className="text-amber-500 font-bold font-mono tracking-wider drop-shadow-md">HLAVNÍ KOTEL</h2>
              <div className={`text-xs font-mono font-bold ${boilerActive ? 'text-green-500 animate-pulse' : 'text-red-500'}`}>
                {boilerActive ? 'Stav: V PROVOZU' : 'Stav: ZHASLÝ'}
              </div>
            </div>

            {/* Dvířka */}
            <div className={`w-32 h-24 border-2 border-stone-950 bg-stone-900 rounded-t-lg relative overflow-hidden ${boilerActive ? 'group-hover:border-amber-600' : ''}`}>
              <div className={`absolute inset-0 ${boilerActive ? 'bg-orange-600/20' : 'bg-stone-800/20'}`}></div>
              {boilerActive && (
                <div className="absolute bottom-0 w-full h-16 flex justify-evenly items-end pb-2">
                  {[1,2,3,4,5].map(i => (
                    <div
                      key={i}
                      className="w-3 rounded-t-full bg-gradient-to-t from-yellow-300 via-orange-500 to-red-600 shadow-[0_0_15px_rgba(255,165,0,0.8)] animate-pulse"
                      style={{ animationDelay: `${i * 0.15}s`, height: `${24 + (i % 3) * 10}px` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trubky */}
        <div className={`absolute top-[60%] left-[20%] w-[30%] h-4 border-t-4 border-l-4 rounded-tl-xl opacity-50 ${boilerActive ? 'border-amber-900' : 'border-stone-700'}`}></div>
        <div className={`absolute top-[65%] right-[20%] w-[30%] h-4 border-t-4 border-r-4 rounded-tr-xl opacity-50 ${boilerActive ? 'border-amber-900' : 'border-stone-700'}`}></div>

        {/* Dynamo */}
        <div className="absolute bottom-16 left-16">
          <BuildNode
            title="DYNAMO"
            icon={<Zap size={32} className={buildings.dynamo.built ? 'text-yellow-400' : 'text-stone-400 group-hover:text-yellow-400'} />}
            onClick={() => setActiveModal('build_dynamo')}
            status={buildings.dynamo.built ? 'AKTIVNÍ' : 'STAVĚT'}
            statusColor={buildings.dynamo.built ? 'text-green-400' : 'text-amber-400'}
            bgColor={buildings.dynamo.built ? 'bg-green-900/50' : 'bg-amber-900/50'}
            borderColor={buildings.dynamo.built ? 'border-green-700/50' : 'border-amber-700/50'}
          />
        </div>

        {/* Pěstírna */}
        <div className="absolute bottom-16 right-16">
          <BuildNode
            title="PĚSTÍRNA"
            icon={<Wind size={32} className={buildings.greenhouse.built ? 'text-green-400' : 'text-stone-400 group-hover:text-green-400'} />}
            onClick={() => setActiveModal('build_greenhouse')}
            status={buildings.greenhouse.built ? 'AKTIVNÍ' : 'STAVĚT'}
            statusColor={buildings.greenhouse.built ? 'text-green-400' : 'text-amber-400'}
            bgColor={buildings.greenhouse.built ? 'bg-green-900/50' : 'bg-amber-900/50'}
            borderColor={buildings.greenhouse.built ? 'border-green-700/50' : 'border-amber-700/50'}
          />
        </div>
      </div>
    </div>
  );
};

const BottomBar = () => {
  const { setActiveModal } = useGameStore();

  return (
    <div className="bg-stone-950 border-t-2 border-amber-900/50 p-3 flex items-center justify-between z-10">
      <div className="w-64"></div>

      <div className="flex flex-col items-center">
        <div className="text-xs text-amber-600 font-mono mb-1 font-bold">MENU STAVBY</div>
        <div className="flex space-x-2 bg-stone-900 p-1.5 rounded-lg border border-stone-800">
          {[Hammer, Flame, Box, Thermometer, Wind].map((Icon, idx) => (
            <button key={idx} className="w-12 h-12 bg-stone-950 rounded border border-stone-700 hover:border-amber-500 hover:bg-stone-800 flex items-center justify-center transition text-stone-500 hover:text-amber-300">
              <Icon size={24} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex space-x-4">
        <ActionButton icon={<Hammer size={20} />} label="CRAFTING" />
        <ActionButton icon={<Map size={20} />} label="MAPA" onClick={() => setActiveModal('map')} />
        <div className="relative">
          <ActionButton icon={<User size={20} />} label="POSTAVY" className="border-amber-600 text-amber-500" />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-600 rounded-full border border-stone-900 animate-ping"></div>
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-600 rounded-full border border-stone-900"></div>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 rounded-lg border border-stone-700 hover:bg-stone-800 hover:border-amber-500 transition group w-24 h-16 bg-stone-900 ${className}`}
  >
    <div className="text-stone-400 group-hover:text-amber-300 mb-1">{icon}</div>
    <span className="text-[10px] font-mono font-bold text-stone-500 group-hover:text-amber-100">{label}</span>
  </button>
);

const Modal = () => {
  const { activeModal, setActiveModal, buildings, stokeBoiler, buildBuilding, resources } = useGameStore();
  if (!activeModal) return null;

  const costs = {
    dynamo:     { scrap: 50, parts: 10 },
    greenhouse: { wood: 30, scrap: 15 },
    distillery: { scrap: 20, parts: 5 },
    workshop:   { scrap: 40, wood: 20, parts: 8 },
  };

  const canAfford = (name) => {
    const cost = costs[name];
    if (!cost) return false;
    return Object.entries(cost).every(([item, amount]) => (resources[item] ?? 0) >= amount);
  };

  const renderContent = () => {
    if (activeModal === 'boiler') {
      const b = buildings.boiler;
      return (
        <div>
          <p className="text-stone-300 mb-2">Palivo v kotli: <span className={`font-bold ${b.fuel < 10 ? 'text-red-400' : 'text-amber-400'}`}>{b.fuel} / 100</span></p>
          <p className="text-stone-500 text-sm mb-4">Kotel spotřebovává 1 jednotku paliva každých 30 minut. Každé přiložení přidá 10 jednotek a spotřebuje 1 uhlí.</p>
          <div className="w-full h-3 bg-stone-950 rounded-sm overflow-hidden border border-stone-700 mb-4">
            <div className={`h-full transition-all ${b.fuel > 30 ? 'bg-amber-600' : 'bg-red-700'}`} style={{ width: `${b.fuel}%` }} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-500 text-sm">Uhlí k dispozici: <span className="text-amber-400 font-bold">{resources.coal}</span></span>
            <button
              onClick={() => { stokeBoiler(); setActiveModal(null); }}
              disabled={resources.coal < 1}
              className="px-4 py-2 bg-amber-800 border border-amber-600 text-amber-100 font-bold hover:bg-amber-700 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Přiložit (+10)
            </button>
          </div>
        </div>
      );
    }

    const buildMap = {
      build_dynamo:     { key: 'dynamo',     title: 'DYNAMO',    desc: 'Generuje stabilní přísun energie. Odemkne elektrizované moduly.' },
      build_greenhouse: { key: 'greenhouse', title: 'PĚSTÍRNA',  desc: 'Pěstuje bylinky a zeleninu. Snižuje spotřebu jídla ze scavengingu.' },
    };
    const b = buildMap[activeModal];
    if (b) {
      const already = buildings[b.key]?.built;
      const cost = costs[b.key] ?? {};
      const affordable = canAfford(b.key);
      return (
        <div>
          <p className="text-stone-300 mb-2">{b.desc}</p>
          <div className="bg-stone-950 rounded p-3 mb-4 border border-stone-800">
            <div className="text-xs text-stone-500 font-mono mb-2">NÁKLADY:</div>
            {Object.entries(cost).map(([item, amount]) => (
              <div key={item} className={`text-sm ${(resources[item] ?? 0) >= amount ? 'text-stone-300' : 'text-red-400'}`}>
                {item}: {amount} (máš: {resources[item] ?? 0})
              </div>
            ))}
          </div>
          {already
            ? <p className="text-green-400 font-mono">Již postaveno.</p>
            : (
              <button
                onClick={() => { buildBuilding(b.key); setActiveModal(null); }}
                disabled={!affordable}
                className="px-4 py-2 bg-amber-800 border border-amber-600 text-amber-100 font-bold hover:bg-amber-700 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {affordable ? 'Postavit' : 'Nedostatek surovin'}
              </button>
            )
          }
        </div>
      );
    }

    if (activeModal === 'map') {
      return <p className="text-stone-300">Připravte skupinu na noční výpravu (Scavenging). — přijde v další fázi.</p>;
    }

    return <p className="text-stone-300">...</p>;
  };

  const titleMap = {
    boiler: 'HLAVNÍ KOTEL',
    build_dynamo: 'POSTAVIT: DYNAMO',
    build_greenhouse: 'POSTAVIT: PĚSTÍRNA',
    map: 'MAPA OKOLÍ',
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center font-mono" onClick={() => setActiveModal(null)}>
      <div className="bg-stone-900 border-2 border-amber-700 p-6 rounded-lg max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={() => setActiveModal(null)} className="absolute top-2 right-2 text-stone-500 hover:text-red-500 font-bold p-1">✕</button>
        <h3 className="text-xl font-bold text-amber-500 mb-4 border-b border-stone-700 pb-2">{titleMap[activeModal] ?? activeModal}</h3>
        {renderContent()}
        <div className="flex justify-end mt-4">
          <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-stone-800 border border-stone-600 text-stone-300 hover:bg-stone-700 rounded transition">
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  useGameLoop();

  return (
    <div className="w-full h-screen bg-black flex flex-col overflow-hidden selection:bg-amber-900 selection:text-white">
      <TopBar />
      <div className="flex-1 flex overflow-hidden relative">
        <LeftSidebar />
        <GameCanvas />
        <Modal />
      </div>
      <BottomBar />
    </div>
  );
}
