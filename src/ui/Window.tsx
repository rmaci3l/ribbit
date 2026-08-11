import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  initial?: { x: number; y: number };
  className?: string;
  draggable?: boolean;
}

export function Window({
  title,
  children,
  onClose,
  onFocus,
  zIndex = 10,
  initial,
  className = '',
  draggable = true,
}: Props) {
  return (
    <motion.section
      drag={draggable}
      dragMomentum={false}
      dragElastic={0}
      onPointerDown={onFocus}
      initial={{ opacity: 0, scale: 0.96, x: initial?.x ?? 0, y: initial?.y ?? 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{ zIndex }}
      className={`pointer-events-auto flex flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950/95 shadow-2xl shadow-black/60 backdrop-blur ${className}`}
    >
      <header className="flex shrink-0 cursor-grab items-center gap-2 border-b border-neutral-800 bg-neutral-900/80 px-3 py-2 active:cursor-grabbing">
        <span className="flex gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
          <i className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
        </span>
        <h2 className="flex-1 text-center text-[11px] tracking-[0.18em] text-neutral-500 uppercase">
          {title}
        </h2>
        {onClose ? (
          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="h-2.5 w-2.5 rounded-full bg-neutral-700 transition-colors hover:bg-red-500"
          />
        ) : (
          <span className="h-2.5 w-2.5" />
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </motion.section>
  );
}
