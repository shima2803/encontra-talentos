import Link from 'next/link';
import { Building2, ArrowRight } from 'lucide-react';

export function HiringCompanies() {
  return (
    <section className="mt-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-teal-600 p-8 text-white shadow-soft sm:p-12">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr,1fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <Building2 size={16} />
              Para empresas
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Sua empresa aqui!
            </h2>
            <p className="max-w-xl text-base text-white/90 sm:text-lg">
              Anuncie suas vagas e encontre os melhores talentos do mercado. Junte-se às empresas que
              já recrutam pelo Encontra Talentos.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="mailto:pontetalentos@gmail.com"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 transition hover:bg-slate-50"
              >
                Anunciar vaga <ArrowRight size={18} />
              </Link>
              <Link
                href="mailto:pontetalentos@gmail.com"
                className="inline-flex items-center rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Falar com vendas
              </Link>
            </div>
          </div>

          {/* Empty company logo placeholders (visual hint) */}
          <div className="hidden grid-cols-3 gap-3 lg:grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex h-20 items-center justify-center rounded-2xl border-2 border-dashed border-white/30 text-xs font-medium text-white/60"
              >
                seu logo
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
