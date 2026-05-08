import { CandidateForm } from '@/components/candidatura/CandidateForm';
import { getSkills, getUfs, getVagas } from '@/services/api';
import { BadgeCheck, FileText, SearchCheck, ShieldCheck } from 'lucide-react';

interface CandidaturaPageProps {
  searchParams?: {
    vaga?: string;
  };
}

export default async function CandidaturaPage({ searchParams }: CandidaturaPageProps) {
  const [vagas, skills, ufs] = await Promise.all([getVagas(), getSkills(), getUfs()]);

  const vagaParam = searchParams?.vaga;
  const vagaId = vagaParam ? Number(vagaParam) : undefined;
  const vagaSelecionada = vagas.find((vaga) => vaga.id === vagaId);

  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr,420px] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
                Candidatura profissional
              </span>

              <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                Complete seu perfil e envie sua candidatura
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                Organizamos o formulário para que sua candidatura fique mais clara,
                completa e profissional para análise da equipe de recrutamento.
              </p>

              {vagaSelecionada ? (
                <div className="mt-6 inline-flex rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm text-brand-800">
                  Vaga selecionada:&nbsp;
                  <strong>{vagaSelecionada.titulo}</strong>
                </div>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-card">
              <h2 className="text-lg font-bold text-slate-900">Etapas da candidatura</h2>

              <div className="mt-5 space-y-3">
                <Step icon={<FileText size={18} />} title="Dados pessoais" />
                <Step icon={<BadgeCheck size={18} />} title="Contato e disponibilidade" />
                <Step icon={<SearchCheck size={18} />} title="Currículo e habilidades" />
                <Step icon={<ShieldCheck size={18} />} title="Termos e envio seguro" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <CandidateForm
        initialVagaId={typeof vagaSelecionada?.id === 'number' ? vagaSelecionada.id : undefined}
        vagas={vagas}
        skills={skills}
        ufs={ufs}
      />
    </main>
  );
}

function Step({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 transition hover:bg-brand-50/40">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        {icon}
      </div>

      <span className="text-sm font-medium text-slate-700">{title}</span>
    </div>
  );
}