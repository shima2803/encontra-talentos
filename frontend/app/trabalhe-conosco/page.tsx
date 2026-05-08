import Link from 'next/link';
import { Briefcase, HeartHandshake, Rocket, Users } from 'lucide-react';

export default function TrabalheConoscoPage() {
  return (
    <main className="bg-slate-50/70">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
          <div className="grid gap-8 bg-gradient-to-br from-brand-50 via-white to-white p-8 lg:grid-cols-[1.2fr,0.8fr] lg:p-12">
            <div>
              <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm">
                Carreiras
              </span>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Trabalhe conosco
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                Faça parte de uma equipe que acredita em tecnologia,
                recrutamento humanizado e boas experiências para candidatos e
                empresas.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/candidatura"
                  className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  Cadastrar currículo
                </Link>

                <Link
                  href="/vagas"
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver vagas abertas
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <Briefcase size={32} className="text-brand-300" />

              <h2 className="mt-5 text-xl font-bold">
                Buscamos pessoas que queiram crescer.
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                Mesmo que não exista uma vaga aberta agora, seu currículo pode
                ficar salvo para futuras oportunidades internas.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-4 lg:p-12">
            <ValueCard
              icon={<Rocket size={22} />}
              title="Crescimento"
              text="Ambiente com oportunidades para aprender, evoluir e construir carreira."
            />

            <ValueCard
              icon={<Users size={22} />}
              title="Colaboração"
              text="Valorizamos pessoas que trabalham bem em equipe e compartilham conhecimento."
            />

            <ValueCard
              icon={<HeartHandshake size={22} />}
              title="Respeito"
              text="Acreditamos em processos claros, comunicação direta e relações profissionais."
            />

            <ValueCard
              icon={<Briefcase size={22} />}
              title="Profissionalismo"
              text="Prezamos por organização, responsabilidade e qualidade nas entregas."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function ValueCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        {icon}
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}