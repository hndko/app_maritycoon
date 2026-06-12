import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('rounded-lg border border-slate-200 bg-surface shadow-sm', className)}
      {...props}
    />
  );
}
