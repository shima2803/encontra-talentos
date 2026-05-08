'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'lgpd-consent';

type ConsentChoice = 'all' | 'essential' | null;

function readStoredConsent(): ConsentChoice {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { choice?: ConsentChoice };
    return parsed.choice ?? null;
  } catch {
    return null;
  }
}

function persistConsent(choice: Exclude<ConsentChoice, null>): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ choice, timestamp: new Date().toISOString() }),
    );
  } catch {
    // localStorage indisponivel - segue sem persistir
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = readStoredConsent();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  function handleAcceptAll() {
    persistConsent('all');
    setVisible(false);
  }

  function handleEssentialOnly() {
    persistConsent('essential');
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:flex-row sm:items-center sm:gap-6">
        {/* Icone */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Cookie size={24} aria-hidden="true" />
        </div>

        {/* Texto */}
        <div className="flex-1 text-sm leading-relaxed text-slate-700">
          <p className="font-semibold text-slate-900">Usamos cookies e dados pessoais</p>
          <p className="mt-1 text-slate-600">
            Coletamos dados estritamente necessários para o funcionamento do site e do
            processo de recrutamento. Você pode aceitar todos os cookies (incluindo análise
            de uso) ou apenas os essenciais. Saiba mais na{' '}
            <Link href="/politica-de-privacidade" className="font-semibold text-brand-600 underline-offset-2 hover:underline">
              Política de Privacidade
            </Link>{' '}
            e na{' '}
            <Link href="/lgpd" className="font-semibold text-brand-600 underline-offset-2 hover:underline">
              página LGPD
            </Link>
            .
          </p>
        </div>

        {/* Acoes */}
        <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Apenas essenciais
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            Aceitar todos
          </button>

          <button
            type="button"
            onClick={handleEssentialOnly}
            aria-label="Fechar banner de cookies"
            className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:hidden"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
