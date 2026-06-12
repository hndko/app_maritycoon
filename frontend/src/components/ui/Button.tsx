import { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  danger: 'bg-danger text-white hover:bg-red-600 focus-visible:ring-danger',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-primary',
  primary: 'bg-primary text-white hover:bg-blue-700 focus-visible:ring-primary',
  secondary: 'bg-secondary text-slate-950 hover:bg-amber-400 focus-visible:ring-secondary',
  success: 'bg-success text-white hover:bg-green-600 focus-visible:ring-success',
};

export function Button({
  children,
  className,
  icon,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
