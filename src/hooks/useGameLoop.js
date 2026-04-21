import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function useGameLoop() {
  const gameTick = useGameStore(s => s.gameTick);
  const paused = useGameStore(s => s.paused);

  useEffect(() => {
    const id = setInterval(() => {
      gameTick();
    }, 1000);
    return () => clearInterval(id);
  }, [gameTick]);
}
