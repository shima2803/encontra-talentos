import { JobCard } from '@/components/ui/JobCard';
import { getVagas, getVagasExternas } from '@/services/api';
import { Vaga } from '@/types/vaga';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 50;

interface VagasPageProps {
  searchParams?: {
    q?: string;
    local?: string;
    modelo?: string;
    area?: string;
    fonte?: string;
    page?: string;
  };
}

function normalize(value?: string) {
  return (value ?? '').toLowerCase().trim();
}

function buildQuery(searchParams: VagasPageProps['searchParams'], overrides: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  const merged = { ...searchParams, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      params.set(key, String(value));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

export default async function VagasPage({ searchParams }: VagasPageProps) {
  const [internas, externasResult] = await Promise.all([
    getVagas(),
    getVagasExternas().catch(() => [] as Vaga[]),
  ]);
  const externas = externasResult ?? [];

  // Internas SEMPRE vem primeiro (vagas das nossas empresas em destaque),
  // mesmo apos filtros (filter mantem a ordem original do array).
  const todas: Vaga[] = [...internas, ...externas];

  const q = normalize(searchParams?.q);
  const local = normalize(searchParams?.local);
  const modelo = normalize(searchParams?.modelo);
  const area = normalize(searchParams?.area);
  const fonte = normalize(searchParams?.fonte);

  const filtradas = todas.filter((v) => {
    if (q && !normalize(v.titulo).includes(q) && !normalize(v.area ?? '').includes(q) && !normalize(v.empresa ?? '').includes(q)) return false;
    if (local && !normalize(v.localidade ?? '').includes(local)) return false;
    if (modelo && normalize(v.modeloTrabalho ?? '') !== modelo) return false;
    if (area && normalize(v.area ?? '') !== area) return false;
    if (fonte === 'interna' && v.fonte !== 'interna') return false;
    if (fonte === 'externa' && v.fonte === 'interna') return false;
    return true;
  });

  const filtrosAtivos = [q, local, modelo, area, fonte].some(Boolean);
  const totalInternas = todas.filter((v) => v.fonte === 'interna').length;
  const totalExternas = todas.length - totalInternas;

  const totalFiltradas = filtradas.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltradas / PAGE_SIZE));
  const requestedPage = Number(searchParams?.page) || 1;
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const visibleVagas = filtradas.slice(startIdx, endIdx);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Vagas abertas</h1>
          <p className="mt-2 text-slate-600">
            Selecione a vaga que mais combina com seu perfil ou siga para o banco de talentos.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
          {totalFiltradas} {totalFiltradas === 1 ? 'vaga' : 'vagas'}
          {filtrosAtivos && ' encontradas'}
        </span>
      </div>

      {totalExternas > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <Info size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p>
            Mostramos <strong>{totalInternas}</strong> {totalInternas === 1 ? 'vaga interna' : 'vagas internas'} e{' '}
            <strong>{totalExternas}</strong> {totalExternas === 1 ? 'vaga externa' : 'vagas externas'} (fornecidas por parceiros).
            Ao clicar em &quot;Ver no site&quot; em uma vaga externa, você será redirecionado para o site de origem
            — não compartilhamos seus dados com eles.
          </p>
        </div>
      )}

      {filtrosAtivos && (
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          {q && <FilterPill label={`Cargo: ${q}`} />}
          {local && <FilterPill label={`Local: ${local}`} />}
          {modelo && <FilterPill label={`Modelo: ${modelo}`} />}
          {area && <FilterPill label={`Área: ${area}`} />}
          {fonte && <FilterPill label={`Fonte: ${fonte}`} />}
          <a href="/vagas" className="rounded-full px-3 py-1 text-sm font-medium text-slate-500 hover:text-brand-600">
            Limpar filtros
          </a>
        </div>
      )}

      {totalFiltradas === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="font-semibold text-slate-700">Nenhuma vaga encontrada</p>
          <p className="mt-2 text-sm text-slate-500">
            Tente ajustar os filtros ou voltar para a página inicial.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visibleVagas.map((vaga) => (
              <JobCard key={String(vaga.id)} vaga={vaga} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalFiltradas}
              startIdx={startIdx}
              endIdx={Math.min(endIdx, totalFiltradas)}
              searchParams={searchParams}
            />
          )}
        </>
      )}

      {totalExternas > 0 && (
        <p className="mt-10 text-center text-xs text-slate-400">
          Vagas externas fornecidas por <span className="font-semibold">Adzuna</span>,{' '}
          <span className="font-semibold">Remotive</span> e <span className="font-semibold">Arbeitnow</span>.
        </p>
      )}
    </div>
  );
}

function FilterPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium capitalize text-slate-700">
      {label}
    </span>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIdx: number;
  endIdx: number;
  searchParams: VagasPageProps['searchParams'];
}

function Pagination({ currentPage, totalPages, totalItems, startIdx, endIdx, searchParams }: PaginationProps) {
  const prevHref = currentPage > 1 ? `/vagas${buildQuery(searchParams, { page: currentPage - 1 })}` : null;
  const nextHref = currentPage < totalPages ? `/vagas${buildQuery(searchParams, { page: currentPage + 1 })}` : null;

  return (
    <nav className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row" aria-label="Paginação">
      <p className="text-sm text-slate-600">
        Mostrando <strong>{startIdx + 1}</strong>–<strong>{endIdx}</strong> de <strong>{totalItems}</strong>
      </p>

      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-600 hover:text-brand-600"
          >
            <ChevronLeft size={16} aria-hidden="true" /> Anterior
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
            <ChevronLeft size={16} aria-hidden="true" /> Anterior
          </span>
        )}

        <span className="px-3 text-sm font-medium text-slate-600">
          Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
        </span>

        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-600 hover:text-brand-600"
          >
            Próximo <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
            Próximo <ChevronRight size={16} aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
