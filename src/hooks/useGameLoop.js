import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

// normální rychlost: 500ms/tick = 2 herni minuty/real sekundu
// FF (5x): 100ms/tick
const BASE_INTERVAL = 500;

export function useGameLoop() {
  const gameTick = useGameStore(s => s.gameTick);
  const speed    = useGameStore(s => s.speed);
  const paused   = useGameStore(s => s.paused);

  useEffect(() => {
    if (paused) return;
    const interval = BASE_INTERVAL / speed;
    const id = setInterval(gameTick, interval);
    return () => clearInterval(id);
  }, [gameTick, speed, paused]);
}
