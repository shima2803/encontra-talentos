'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Briefcase } from 'lucide-react';
import { Logo } from './Logo';

const navItems = [
  { label: 'Início', href: '/' },
  { label: 'Vagas', href: '/vagas' },
  { label: 'Candidatura', href: '/candidatura' },
];

function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-50 w-full border-b border-slate-100 bg-white">
      <div className="mx-auto flex h-[100px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo iconSize={58} />

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex h-[100px] items-center text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-brand-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}

                {isActive ? (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-600" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/rh/login"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-600 bg-white px-5 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            <Briefcase size={16} />
            Publicar vaga
          </Link>

          <Link
            href="/candidatura"
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Enviar candidatura
          </Link>
        </div>

        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((state) => !state)}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === item.href
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/rh/login"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg border-2 border-brand-600 bg-white px-4 py-2 text-center text-sm font-semibold text-brand-700"
            >
              <Briefcase size={16} />
              Publicar vaga
            </Link>

            <Link
              href="/candidatura"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white"
            >
              Enviar candidatura
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export { Header };
export default Header;