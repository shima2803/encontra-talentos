'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FilePlus2, Briefcase } from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { LogoutButton } from './LogoutButton';

interface RhTopNavProps {
  empresaNome: string;
}

const tabs = [
  { href: '/rh/painel', label: 'Metricas', icon: BarChart3 },
  { href: '/rh/vagas', label: 'Minhas vagas', icon: Briefcase, exact: true },
  { href: '/rh/vagas/nova', label: 'Criar vaga', icon: FilePlus2 },
];

export function RhTopNav({ empresaNome }: RhTopNavProps) {
  const pathname = usePathname() ?? '';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Logo iconSize={44} />
          <div className="hidden flex-col leading-tight border-l border-slate-200 pl-4 sm:flex">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
              Portal RH
            </span>
            <span className="text-sm font-semibold text-slate-900">{empresaNome}</span>
          </div>
        </div>

        <nav className="flex items-center gap-1" aria-label="Navegacao do portal RH">
          {tabs.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <LogoutButton />
      </div>
    </header>
  );
}
