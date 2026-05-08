import Link from 'next/link';
import {
  Bookmark,
  Briefcase,
  Building2,
  ExternalLink,
  MapPin,
  Wallet,
} from 'lucide-react';
import { Vaga } from '@/types/vaga';

const modeloStyles: Record<string, string> = {
  Remoto:     'bg-emerald-50 text-emerald-700',
  Online:     'bg-emerald-50 text-emerald-700',
  Hibrido:    'bg-amber-50  text-amber-700',
  Híbrido:    'bg-amber-50  text-amber-700',
  Presencial: 'bg-rose-50   text-rose-700',
};

const nivelStyles: Record<string, string> = {
  Junior: 'bg-sky-50    text-sky-700',
  Júnior: 'bg-sky-50    text-sky-700',
  Pleno:  'bg-violet-50 text-violet-700',
  Senior: 'bg-rose-50   text-rose-700',
  Sênior: 'bg-rose-50   text-rose-700',
  Geral:  'bg-slate-100 text-slate-700',
};

const tipoContratoLabels: Record<string, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  ESTAGIO: 'Estagio',
  JOVEM_APRENDIZ: 'Jovem Aprendiz',
  CORPORATE: 'Corporate',
};

const fonteLabels: Record<string, string> = {
  adzuna: 'via Adzuna',
  remotive: 'via Remotive',
  arbeitnow: 'via Arbeitnow',
};

const BIO_MAX_CHARS = 160;

function truncateBio(text?: string | null): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  if (clean.length <= BIO_MAX_CHARS) return clean;
  return clean.slice(0, BIO_MAX_CHARS).trimEnd() + '…';
}

function formatSalario(vaga: Vaga): string | null {
  if (vaga.salario == null) return null;
  const num = typeof vaga.salario === 'number' ? vaga.salario : Number(vaga.salario);
  if (!Number.isFinite(num)) return null;
  const currency = (vaga.moeda || 'BRL').toUpperCase();
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(num);
  const sufixos: Record<string, string> = { MENSAL: '/mes', HORA: '/hora', ANUAL: '/ano' };
  return `${formatted}${sufixos[vaga.salarioPeriodicidade || 'MENSAL'] || ''}`;
}

interface JobCardProps {
  vaga: Vaga;
  highlight?: boolean;
}

export function JobCard({ vaga, highlight = false }: JobCardProps) {
  const isExterna = vaga.fonte && vaga.fonte !== 'interna';
  const fonteLabel = vaga.fonte ? fonteLabels[vaga.fonte] : undefined;
  const bio = truncateBio(vaga.descricao);
  const salario = formatSalario(vaga);
  const tipoContratoLabel = vaga.tipoContrato
    ? tipoContratoLabels[vaga.tipoContrato] || vaga.tipoContrato
    : null;

  const cardClass = highlight
    ? 'group rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50/40 via-white to-white p-5 shadow-card transition hover:shadow-soft'
    : 'group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:shadow-soft';

  return (
    <article className={cardClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Info principal */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 transition group-hover:text-brand-600">
              {vaga.titulo}
            </h3>

            {isExterna && fonteLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <ExternalLink size={10} aria-hidden="true" />
                {fonteLabel}
              </span>
            )}
          </div>

          {vaga.empresa && (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Building2 size={13} aria-hidden="true" className="text-slate-400" />
              {vaga.empresa}
            </p>
          )}

          {vaga.area && (
            <p className="text-sm text-slate-500">{vaga.area}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {vaga.localidade && (
              <span className="flex items-center gap-1">
                <MapPin size={12} aria-hidden="true" /> {vaga.localidade}
              </span>
            )}
            {vaga.modeloTrabalho && (
              <span className="flex items-center gap-1">
                <Briefcase size={12} aria-hidden="true" /> {vaga.modeloTrabalho}
              </span>
            )}
            {salario && (
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <Wallet size={12} aria-hidden="true" /> {salario}
              </span>
            )}
          </div>

          {bio && (
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {bio}
            </p>
          )}
        </div>

        {/* Tags + Acoes */}
        <div className="flex flex-col items-start gap-3 lg:min-w-[200px] lg:items-end">
          <div className="flex flex-wrap gap-2">
            {tipoContratoLabel && (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                {tipoContratoLabel}
              </span>
            )}
            {vaga.modeloTrabalho && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  modeloStyles[vaga.modeloTrabalho] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {vaga.modeloTrabalho}
              </span>
            )}
            {vaga.nivel && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  nivelStyles[vaga.nivel as string] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {vaga.nivel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isExterna && vaga.urlOrigem ? (
              <a
                href={vaga.urlOrigem}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-600 hover:text-brand-600"
              >
                Ver no site
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : (
              <Link
                href={`/candidatura?vaga=${vaga.id}`}
                className="whitespace-nowrap rounded-lg border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Candidatar-se
              </Link>
            )}
            <button
              type="button"
              aria-label="Salvar vaga"
              className="rounded-lg border border-slate-200 p-2.5 transition hover:bg-slate-50"
            >
              <Bookmark size={18} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
