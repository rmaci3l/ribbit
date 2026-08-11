import type { Mood } from '../state/store';

/**
 * Ribbit is drawn as a character grid, one character per pixel, rendered as divs.
 * There are no image assets - edit the strings to redraw the frog.
 */
export const PALETTE: Record<string, string> = {
  G: '#4ade80', // body
  D: '#15803d', // shadow and feet
  W: '#f8fafc', // eye white
  K: '#0a0f0b', // pupil
  M: '#14532d', // mouth
  P: '#f472b6', // tongue
};

export const SPRITE_COLS = 15;

const EYES = {
  open: ['..GGG.....GGG..', '.GWWWG...GWWWG.', '.GWKWG...GWKWG.'],
  left: ['..GGG.....GGG..', '.GWWWG...GWWWG.', '.GKWWG...GKWWG.'],
  right: ['..GGG.....GGG..', '.GWWWG...GWWWG.', '.GWWKG...GWWKG.'],
  wide: ['..GGG.....GGG..', '.GWKWG...GWKWG.', '.GWKWG...GWKWG.'],
  shut: ['..GGG.....GGG..', '.GGGGG...GGGGG.', '.GKKKG...GKKKG.'],
  droop: ['..GGG.....GGG..', '.GKKWG...GWKKG.', '.GWWWG...GWWWG.'],
};

const MOUTH = {
  small: ['GGGG.MMMMM.GGGG', 'GGGGG.MMM.GGGGG'],
  smile: ['GG.MMMMMMMMM.GG', 'GGG.MMMMMMM.GGG'],
  open: ['GG.MMMMMMMMM.GG', 'GG.MMPPPPPMM.GG'],
  frown: ['GGG.MMMMMMM.GGG', 'GG.MMMMMMMMM.GG'],
  flat: ['GGGGMMMMMMMGGGG', 'GGGGGGGGGGGGGGG'],
};

const HEAD = '.GGGGGGGGGGGGG.';
const BODY = 'GGGGGGGGGGGGGGG';
const FEET = ['DGGGGGGGGGGGGGD', '.DDD.......DDD.'];

const frog = (eyes: keyof typeof EYES, mouth: keyof typeof MOUTH): string[] => [
  ...EYES[eyes],
  HEAD,
  BODY,
  ...MOUTH[mouth],
  BODY,
  ...FEET,
];

interface Animation {
  frames: string[][];
  intervalMs: number;
}

export const ANIMATIONS: Record<Mood, Animation> = {
  idle: {
    frames: [frog('open', 'small'), frog('open', 'small'), frog('open', 'small'), frog('shut', 'small')],
    intervalMs: 440,
  },
  watching: {
    frames: [frog('left', 'small'), frog('open', 'small'), frog('right', 'small'), frog('open', 'small')],
    intervalMs: 260,
  },
  excited: {
    frames: [frog('wide', 'open'), frog('wide', 'smile')],
    intervalMs: 140,
  },
  happy: {
    frames: [frog('shut', 'smile'), frog('shut', 'open')],
    intervalMs: 220,
  },
  sad: {
    frames: [frog('droop', 'frown'), frog('droop', 'flat')],
    intervalMs: 620,
  },
  sleeping: {
    frames: [frog('shut', 'flat')],
    intervalMs: 900,
  },
};

export const MOOD_CAPTION: Record<Mood, string> = {
  idle: 'waiting for something to happen',
  watching: 'watching the launch stream',
  excited: 'just took a position',
  happy: 'that one worked',
  sad: 'stopped out',
  sleeping: 'stream is down, napping',
};
