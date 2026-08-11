import { motion } from 'framer-motion';
import type { WindowId } from './commands';

const ITEMS: { id: WindowId; label: string; glyph: string }[] = [
  { id: 'positions', label: 'Positions', glyph: '▣' },
  { id: 'history', label: 'History', glyph: '⌗' },
  { id: 'strategies', label: 'Strategies', glyph: '⑂' },
  { id: 'about', label: 'About', glyph: '?' },
];

export function Dock({ open, onToggle }: { open: WindowId[]; onToggle: (id: WindowId) => void }) {
  return (
    <nav className="pointer-events-auto flex items-end gap-1 rounded-2xl border border-neutral-800 bg-neutral-950/90 px-2 py-2 shadow-2xl shadow-black/60 backdrop-blur">
      {ITEMS.map((item) => {
        const active = open.includes(item.id);
        return (
          <motion.button
            key={item.id}
            onClick={() => onToggle(item.id)}
            whileHover={{ y: -6, scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            title={item.label}
            aria-pressed={active}
            className={`group relative flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition-colors ${
              active
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <span aria-hidden className="font-bold">
              {item.glyph}
            </span>
            <span className="pointer-events-none absolute -top-8 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-[10px] whitespace-nowrap text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100">
              {item.label}
            </span>
            {active && <i className="absolute -bottom-1 h-1 w-1 rounded-full bg-green-400" />}
          </motion.button>
        );
      })}
    </nav>
  );
}
