import { NovaVagaForm } from './NovaVagaForm';
import { getCurrentEmpresa } from '@/lib/rh/auth';
import type { Skill } from '@/types/skill';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchSkills(): Promise<Skill[]> {
  try {
    const res = await fetch(`${API_URL}/skills`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Skill[];
  } catch {
    return [];
  }
}

export default async function NovaVagaPage() {
  const [empresa, skills] = await Promise.all([getCurrentEmpresa(), fetchSkills()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-medium text-brand-600">Portal RH</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Criar nova vaga</h1>
        <p className="mt-2 text-slate-600">
          A vaga publicada aparecera na pagina publica de vagas e podera receber candidaturas.
          {empresa?.nome ? ` Sera publicada como ${empresa.nome}.` : ''}
        </p>
      </header>

      <NovaVagaForm skills={skills} />
    </div>
  );
}
