import { InputHTMLAttributes } from 'react';

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
  error?: string;
};

export function Checkbox({ label, description, error, ...props }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" {...props} />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description ? <span className="block text-sm text-slate-500">{description}</span> : null}
        {error ? <span className="block text-sm text-rose-600">{error}</span> : null}
      </span>
    </label>
  );
}
