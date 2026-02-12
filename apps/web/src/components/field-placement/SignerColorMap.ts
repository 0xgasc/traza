const SIGNER_COLORS = [
  {
    bg: 'bg-amber-100',
    border: 'border-amber-500',
    text: 'text-amber-900',
    ring: 'ring-amber-400',
  },
  {
    bg: 'bg-sky-100',
    border: 'border-sky-500',
    text: 'text-sky-900',
    ring: 'ring-sky-400',
  },
  {
    bg: 'bg-emerald-100',
    border: 'border-emerald-500',
    text: 'text-emerald-900',
    ring: 'ring-emerald-400',
  },
  {
    bg: 'bg-rose-100',
    border: 'border-rose-500',
    text: 'text-rose-900',
    ring: 'ring-rose-400',
  },
  {
    bg: 'bg-violet-100',
    border: 'border-violet-500',
    text: 'text-violet-900',
    ring: 'ring-violet-400',
  },
] as const;

export type SignerColor = {
  bg: string;
  border: string;
  text: string;
  ring: string;
};

export function getSignerColor(index: number): SignerColor {
  return SIGNER_COLORS[index % SIGNER_COLORS.length];
}
