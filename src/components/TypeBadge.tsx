import { TYPE_COLORS } from '../utils/typeChart';

interface TypeBadgeProps {
  type: string;
  size?: 'sm' | 'md';
}

export default function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-3 py-1';
  return (
    <span
      className={`font-bold rounded-md text-white tracking-wider uppercase ${TYPE_COLORS[type] ?? 'bg-slate-400'} ${sizeClass}`}
    >
      {type}
    </span>
  );
}
