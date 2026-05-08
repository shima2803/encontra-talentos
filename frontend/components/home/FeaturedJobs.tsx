import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { JobCard } from '@/components/ui/JobCard';
import { Vaga } from '@/types/vaga';

export function FeaturedJobs({ vagas }: { vagas: Vaga[] }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-slate-900">Vagas em destaque</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
          <Sparkles size={11} aria-hidden="true" />
          Empresas parceiras
        </span>
      </div>

      {vagas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Ainda nao ha vagas das nossas empresas parceiras. Veja todas as oportunidades disponiveis abaixo.
        </div>
      ) : (
        <div className="space-y-3">
          {vagas.map((vaga) => (
            <JobCard key={vaga.id} vaga={vaga} highlight />
          ))}
        </div>
      )}

      <Link
        href="/vagas"
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
      >
        Ver todas as vagas <ChevronRight size={16} />
      </Link>
    </section>
  );
}
