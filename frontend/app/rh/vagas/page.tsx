import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FilePlus2 } from 'lucide-react';

import { MinhasVagasList } from '@/components/rh/MinhasVagasList';
import { getCurrentEmpresa, getRhToken } from '@/lib/rh/auth';
import type { VagaRh } from '@/types/rh';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchMinhasVagas(token: string): Promise<VagaRh[]> {
  try {
    const res = await fetch(`${API_URL}/rh/vagas`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return (await res.json()) as VagaRh[];
  } catch {
    return [];
  }
}

export default async function MinhasVagasPage() {
  const empresa = await getCurrentEmpresa();
  if (!empresa) redirect('/rh/login');

  const token = getRhToken();
  const vagas = token ? await fetchMinhasVagas(token) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-600">Portal RH</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Minhas vagas</h1>
          <p className="mt-2 text-slate-600">
            Acompanhe as vagas publicadas, quantos candidatos se inscreveram e ative
            ou inative quando precisar.
          </p>
        </div>

        <Link
          href="/rh/vagas/nova"
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <FilePlus2 size={16} aria-hidden="true" />
          Criar vaga
        </Link>
      </header>

      <MinhasVagasList vagasIniciais={vagas} />
    </div>
  );
}
