import { useStore, type Mood } from '../state/store';
import { useNow } from './useNow';

/**
 * Transient moods expire on their own, so the frog needs a tick to fall back to
 * idle even when no store update arrives.
 */
export function useMood(): Mood {
  const mood = useStore((s) => s.mood);
  const moodUntil = useStore((s) => s.moodUntil);
  const wsStatus = useStore((s) => s.wsStatus);
  const now = useNow(700);

  if (wsStatus !== 'open') return 'sleeping';
  if (moodUntil > 0 && now < moodUntil) return mood === 'sleeping' ? 'idle' : mood;
  return 'idle';
}
