import { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'dark';
};

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
  dark: 'bg-slate-900 text-white hover:bg-slate-800',
};

export function Button({ children, isLoading, disabled, className = '', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? 'Enviando...' : children}
    </button>
  );
}
