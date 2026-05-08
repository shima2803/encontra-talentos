import { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-soft backdrop-blur-sm ${className}`}
    >
      <div className="mb-6 space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>

        {subtitle ? (
          <p className="text-sm leading-6 text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      {children}
    </section>
  );
}