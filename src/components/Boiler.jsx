import React from 'react';
import { FUEL_TYPES } from '../store/gameStore';

export const Boiler = ({ temp, pressure, water, fuelType, fuelTimer, integrity, onClick }) => {
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
