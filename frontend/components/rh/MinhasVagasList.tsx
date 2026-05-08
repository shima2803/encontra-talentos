'use client';

import { useState, useTransition } from 'react';
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  CircleSlash2,
  MapPin,
  Power,
  Users,
  Wallet,
} from 'lucide-react';

import type { VagaRh } from '@/types/rh';

interface Props {
  vagasIniciais: VagaRh[];
}

const TIPO_CONTRATO_LABEL: Record<string, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  ESTAGIO: 'Estagio',
  JOVEM_APRENDIZ: 'Jovem Aprendiz',
  CORPORATE: 'Corporate',
};

const MODELO_LABEL: Record<string, string> = {
  PRESENCIAL: 'Presencial',
  HIBRIDO: 'Hibrido',
  ONLINE: 'Online',
};

const MODELO_COLORS: Record<string, string> = {
  PRESENCIAL: 'bg-rose-50 text-rose-700',
  HIBRIDO: 'bg-amber-50 text-amber-700',
  ONLINE: 'bg-emerald-50 text-emerald-700',
};

function formatLocalidade(cidade: string | null, estado: string | null): string | null {
  if (cidade && estado) return `${cidade} - ${estado}`;
  return cidade || estado || null;
}

function formatSalario(valor: string | null, moeda: string | null, periodicidade: string | null): string | null {
  if (!valor) return null;
  const num = Number(valor);
  if (!Number.isFinite(num)) return null;
  const currency = (moeda || 'BRL').toUpperCase();
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(num);
  const sufixos: Record<string, string> = { MENSAL: '/mes', HORA: '/hora', ANUAL: '/ano' };
  return `${formatted}${sufixos[periodicidade || 'MENSAL'] || ''}`;
}

function formatData(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return null;
  }
}

export function MinhasVagasList({ vagasIniciais }: Props) {
  const [vagas, setVagas] = useState<VagaRh[]>(vagasIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  async function inativar(id: number) {
    setErro(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/rh/vagas/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || body?.detail || 'Falha ao inativar vaga.');
      }
      startTransition(() => {
        setVagas((prev) =>
          prev.map((v) => (v.id_vaga === id ? { ...v, status_vaga: 'INATIVA' } : v)),
        );
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao inativar vaga.');
    } finally {
      setPendingId(null);
    }
  }

  async function reativar(id: number) {
    setErro(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/rh/vagas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_vaga: 'ABERTA' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || body?.detail || 'Falha ao reativar vaga.');
      }
      startTransition(() => {
        setVagas((prev) =>
          prev.map((v) => (v.id_vaga === id ? { ...v, status_vaga: 'ABERTA' } : v)),
        );
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao reativar vaga.');
    } finally {
      setPendingId(null);
    }
  }

  if (vagas.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-base font-semibold text-slate-700">
          Voce ainda nao publicou nenhuma vaga.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Clique em <span className="font-semibold text-brand-700">Criar vaga</span> para
          publicar a primeira oportunidade.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {erro && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {erro}
        </div>
      )}

      {vagas.map((vaga) => {
        const ativa = vaga.status_vaga === 'ABERTA';
        const localidade = formatLocalidade(vaga.localidade_cidade, vaga.localidade_estado);
        const salario = formatSalario(vaga.salario, vaga.moeda, vaga.salario_periodicidade);
        const dataPub = formatData(vaga.data_publicacao);

        return (
          <article
            key={vaga.id_vaga}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition hover:shadow-soft"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                      ativa ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {ativa ? (
                      <>
                        <CheckCircle2 size={12} aria-hidden="true" /> Ativa
                      </>
                    ) : (
                      <>
                        <CircleSlash2 size={12} aria-hidden="true" /> Inativa
                      </>
                    )}
                  </span>

                  <h3 className="text-lg font-bold text-slate-900">{vaga.titulo_vaga}</h3>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {vaga.tipo_contrato && (
                    <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                      {TIPO_CONTRATO_LABEL[vaga.tipo_contrato] || vaga.tipo_contrato}
                    </span>
                  )}
                  {vaga.modelo_trabalho && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        MODELO_COLORS[vaga.modelo_trabalho] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {MODELO_LABEL[vaga.modelo_trabalho] || vaga.modelo_trabalho}
                    </span>
                  )}
                  {vaga.nivel && (
                    <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                      {vaga.nivel}
                    </span>
                  )}
                  {vaga.area && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {vaga.area}
                    </span>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  {localidade && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400" aria-hidden="true" />
                      <span>{localidade}</span>
                    </div>
                  )}
                  {salario && (
                    <div className="flex items-center gap-2">
                      <Wallet size={14} className="text-slate-400" aria-hidden="true" />
                      <span>{salario}</span>
                    </div>
                  )}
                  {dataPub && (
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-slate-400" aria-hidden="true" />
                      <span>Publicada em {dataPub}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-slate-400" aria-hidden="true" />
                    <span>
                      <strong className="font-semibold text-slate-900">
                        {vaga.total_candidaturas}
                      </strong>{' '}
                      {vaga.total_candidaturas === 1 ? 'candidato inscrito' : 'candidatos inscritos'}
                    </span>
                  </div>
                </dl>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {ativa ? (
                  <button
                    type="button"
                    onClick={() => inativar(vaga.id_vaga)}
                    disabled={pendingId === vaga.id_vaga}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    <Power size={14} aria-hidden="true" />
                    {pendingId === vaga.id_vaga ? 'Inativando...' : 'Inativar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => reativar(vaga.id_vaga)}
                    disabled={pendingId === vaga.id_vaga}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
                  >
                    <Power size={14} aria-hidden="true" />
                    {pendingId === vaga.id_vaga ? 'Reativando...' : 'Reativar'}
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}

      <p className="pt-2 text-xs text-slate-400">
        <Briefcase size={12} aria-hidden="true" className="mr-1 inline" />
        Vagas inativas saem automaticamente do portal publico de candidatos.
      </p>
    </div>
  );
}
