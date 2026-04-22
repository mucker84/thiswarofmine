import React, { useEffect, useState } from 'react';

export const Radio = ({ radioMessages }) => {
  const [playingId, setPlayingId] = useState(null);

  // Zjisti, jestli přišla nová zpráva
  useEffect(() => {
    if (radioMessages.length > 0) {
      setPlayingId(radioMessages[0].id);
      const t = setTimeout(() => setPlayingId(null), 4000); // 4 sekundy animace vln
      return () => clearTimeout(t);
    }
  }, [radioMessages]);

  return (
    <div className="space-y-3 relative">
      {/* Frekvenční vizualizér */}
      <div className="h-12 bg-stone-950 rounded border border-stone-800 flex items-center justify-center gap-1 overflow-hidden">
        {[...Array(15)].map((_, i) => {
          const isPlaying = playingId !== null;
          const height = isPlaying ? 10 + Math.random() * 30 : 2;
          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-100 ${
                isPlaying ? 'bg-amber-500 animate-pulse' : 'bg-stone-800'
              }`}
              style={{
                height: `${height}px`,
                transitionDelay: `${i * 30}ms`,
              }}
            />
          );
        })}
      </div>

      {radioMessages.length === 0 && <p className="text-stone-600 text-xs">Ticho na příjmu.</p>}
      
      <div className="space-y-2 h-full overflow-y-auto pr-1">
        {radioMessages.map(msg => (
          <div
            key={msg.id}
            className={`text-xs p-2 rounded border leading-snug font-mono transition-all duration-500 ${
              msg.id === playingId ? 'bg-amber-900/40 border-amber-500 text-amber-100 shadow-md translate-x-1' :
              msg.type === 'weather' ? 'bg-blue-950/40 border-blue-800/60 text-blue-300' :
              msg.type === 'signal'  ? 'bg-purple-950/40 border-purple-800/60 text-purple-300' :
              'bg-stone-950/60 border-stone-800/40 text-stone-400'
            }`}
          >
            {msg.type === 'weather' && <span className="text-blue-500">🌧 </span>}
            {msg.type === 'signal'  && <span className="text-purple-500">📡 </span>}
            {msg.id === playingId && <span className="text-amber-500 mr-1 animate-ping inline-block w-1 h-1 rounded-full bg-amber-500"></span>}
            {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
};
