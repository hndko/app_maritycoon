import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

type BadgeTone = 'blue' | 'gold' | 'green' | 'red' | 'slate';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const tones: Record<BadgeTone, string> = {
  blue: 'bg-blue-100 text-blue-700',
  gold: 'bg-amber-100 text-amber-800',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
};

export function Badge({ className, tone = 'slate', ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
