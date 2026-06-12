import { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ className, label, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <input
        className={clsx(
          'h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-text outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100',
          className,
        )}
        {...props}
      />
    </label>
  );
}
