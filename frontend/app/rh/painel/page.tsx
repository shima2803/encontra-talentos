import { redirect } from 'next/navigation';
import { Briefcase, TrendingDown, TrendingUp, Users } from 'lucide-react';

import { FunilChart, MediaSalarialChart, ScoreVsPretensaoChart } from '@/components/rh/DashboardCharts';
import { getCurrentEmpresa, getRhToken } from '@/lib/rh/auth';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DashboardStats {
  kpis: {
    total_candidaturas: number;
    total_vagas_abertas: number;
    score_medio: string | null;
    candidatos_alto_score: number;
    media_salarial_total: string | null;
    candidatos_abaixo_media_salarial: number;
  };
  funil_aderencia: { faixa: string; total: number }[];
  media_salarial_por_vaga: {
    id_vaga: number;
    titulo_vaga: string;
    media_salarial: string | null;
    total_candidaturas: number;
  }[];
  top_candidatos: {
    id_candidatura: number;
    nome_completo: string;
    titulo_vaga: string;
    score_aderencia: string | null;
  }[];
  score_vs_pretensao: {
    titulo_vaga: string;
    pretensao_salarial: string | null;
    score_aderencia: string | null;
  }[];
}

async function fetchStats(token: string): Promise<DashboardStats | null> {
  try {
    const res = await fetch(`${API_URL}/rh/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as DashboardStats;
  } catch {
    return null;
  }
}

function fmtNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const num = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(num);
}

function fmtBRL(n: string | number | null): string {
  if (n === null) return '—';
  const num = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(num);
}

export default async function PainelPage() {
  const empresa = await getCurrentEmpresa();
  if (!empresa) redirect('/rh/login');

  const token = getRhToken();
  const stats = token ? await fetchStats(token) : null;

  if (!stats) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900">Metricas</h1>
        <p className="mt-2 text-slate-600">
          Nao foi possivel carregar os dados do dashboard. Verifique se o backend esta rodando.
        </p>
      </div>
    );
  }

  const { kpis, funil_aderencia, media_salarial_por_vaga, top_candidatos, score_vs_pretensao } = stats;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-medium text-brand-600">Portal RH</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Metricas</h1>
        <p className="mt-2 text-slate-600">
          Indicadores das suas vagas e candidatos em tempo real.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="text-emerald-600" size={22} />}
          label="Total de candidaturas"
          value={fmtNumber(kpis.total_candidaturas)}
        />
        <KpiCard
          icon={<Briefcase className="text-emerald-600" size={22} />}
          label="Vagas abertas"
          value={fmtNumber(kpis.total_vagas_abertas)}
        />
        <KpiCard
          icon={<TrendingUp className="text-emerald-600" size={22} />}
          label="Score medio"
          value={kpis.score_medio !== null ? fmtNumber(kpis.score_medio) : '—'}
          suffix={kpis.score_medio !== null ? '/100' : undefined}
        />
        <KpiCard
          icon={<TrendingUp className="text-amber-600" size={22} />}
          label="Candidatos alto score (>=80)"
          value={fmtNumber(kpis.candidatos_alto_score)}
        />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <KpiCard
          icon={<TrendingUp className="text-emerald-600" size={22} />}
          label="Media salarial total"
          value={fmtBRL(kpis.media_salarial_total)}
        />
        <KpiCard
          icon={<TrendingDown className="text-amber-600" size={22} />}
          label="Candidatos abaixo da media"
          value={fmtNumber(kpis.candidatos_abaixo_media_salarial)}
        />
      </section>

      {/* Charts */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Funil de aderencia dos candidatos">
          <FunilChart data={funil_aderencia} />
        </Card>

        <Card title="Media salarial por vaga">
          <MediaSalarialChart data={media_salarial_por_vaga} />
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Score x Pretensao salarial">
          <ScoreVsPretensaoChart data={score_vs_pretensao} />
        </Card>

        <Card title="Top candidatos por score">
          {top_candidatos.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhum candidato analisado ainda.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Nome</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Vaga</th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-700">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {top_candidatos.map((c) => (
                    <tr key={c.id_candidatura}>
                      <td className="px-4 py-2 text-slate-900">{c.nome_completo}</td>
                      <td className="px-4 py-2 text-slate-600">{c.titulo_vaga}</td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-900">
                        {c.score_aderencia !== null ? fmtNumber(c.score_aderencia) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <span className="rounded-2xl bg-emerald-50 p-2">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">
        {value}
        {suffix && <span className="ml-1 text-base font-medium text-slate-400">{suffix}</span>}
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}
