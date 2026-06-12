import { SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export function Select({ children, className, label, ...props }: SelectProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <select
        className={clsx(
          'h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
