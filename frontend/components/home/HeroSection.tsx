import Link from 'next/link';
import { TrendingUp, FileText } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/60 to-white py-20 lg:py-24">
      <div className="pointer-events-none absolute -top-10 right-10 h-64 w-64 rounded-full bg-brand-100/60 blur-3xl" />
      <div className="pointer-events-none absolute top-20 right-1/3 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-xl space-y-6">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Encontre oportunidades para impulsionar sua carreira
            </h1>

            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              Milhares de vagas de empresas incríveis esperando por profissionais
              como você.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/vagas"
                className="rounded-xl bg-brand-600 px-7 py-3.5 font-semibold text-white shadow-soft transition hover:bg-brand-700"
              >
                Buscar vagas
              </Link>

              <Link
                href="/candidatura"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <FileText size={18} />
                Cadastrar currículo
              </Link>
            </div>
          </div>

          <div className="relative hidden h-[460px] lg:block">
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=900&q=80&auto=format&fit=crop"
                alt="Profissional sorrindo"
                className="h-[460px] w-[420px] rounded-3xl object-cover shadow-soft"
              />
            </div>

            <div className="absolute right-[-18px] top-40 flex max-w-[225px] items-center gap-3 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-soft backdrop-blur">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                <TrendingUp size={17} />
              </div>

              <div>
                <p className="text-sm font-semibold leading-tight text-slate-900">
                  Seu próximo passo começa aqui!
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Atualize seu currículo e aumente suas chances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}