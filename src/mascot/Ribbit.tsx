import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ANIMATIONS, MOOD_CAPTION, PALETTE, SPRITE_COLS } from './frames';
import type { Mood } from '../state/store';

const BOB: Record<Mood, { y: number[]; duration: number }> = {
  idle: { y: [0, -2, 0], duration: 2.4 },
  watching: { y: [0, -3, 0], duration: 1.6 },
  excited: { y: [0, -9, 0], duration: 0.42 },
  happy: { y: [0, -7, 0], duration: 0.55 },
  sad: { y: [0, 2, 0], duration: 2.8 },
  sleeping: { y: [0, 1, 0], duration: 3.6 },
};

interface Props {
  mood: Mood;
  pixel?: number;
  label?: string;
  labelColor?: string;
}

export function Ribbit({ mood, pixel = 6, label, labelColor }: Props) {
  const { frames, intervalMs } = ANIMATIONS[mood];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % frames.length), intervalMs);
    return () => clearInterval(timer);
  }, [frames, intervalMs]);

  const grid = frames[index] ?? frames[0]!;
  const bob = BOB[mood];

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <motion.div
        animate={{ y: bob.y }}
        transition={{ duration: bob.duration, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SPRITE_COLS}, ${pixel}px)`,
          filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.55))',
        }}
        aria-label={`Ribbit is ${mood}`}
        role="img"
      >
        {grid.flatMap((row, y) =>
          [...row].map((char, x) => (
            <div
              key={`${y}-${x}`}
              style={{
                width: pixel,
                height: pixel,
                background: PALETTE[char] ?? 'transparent',
              }}
            />
          )),
        )}
      </motion.div>

      {mood === 'sleeping' && (
        <motion.span
          className="text-xs text-neutral-500"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          z z z
        </motion.span>
      )}

      <p className="text-[11px] tracking-wide text-neutral-500 lowercase">
        {label && (
          <>
            <span style={{ color: labelColor }}>{label}</span>
            <span className="mx-1.5 text-neutral-700">·</span>
          </>
        )}
        {MOOD_CAPTION[mood]}
      </p>
    </div>
  );
}
