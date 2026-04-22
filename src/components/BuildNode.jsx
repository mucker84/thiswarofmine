import React from 'react';

export const BuildNode = ({ title, icon, onClick, built, effect, effectMuted, labelSuffix }) => (
  <div
    className="group flex flex-col items-center cursor-pointer transform hover:scale-105 transition-transform select-none relative"
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
      {labelSuffix && built && (
        <div className="absolute -top-2 -right-2 bg-amber-700 text-stone-900 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500 shadow-sm z-10">
          {labelSuffix}
        </div>
      )}
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
