import { forwardRef, SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, children, className = '', ...props },
  ref,
) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        ref={ref}
        className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </label>
  );
});
