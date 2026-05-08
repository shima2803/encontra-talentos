import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Home,
} from 'lucide-react';

export const metadata = {
  title: 'Candidatura enviada — Encontra Talentos',
};

export default function SucessoPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        {/* Cabeçalho com gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-8 py-12 text-center text-white sm:py-16">
          <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white blur-3xl" />
          </div>

          <div className="relative">
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30 backdrop-blur-sm"
              aria-hidden="true"
            >
              <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
            </div>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Candidatura enviada com sucesso!
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-emerald-50 sm:text-lg">
              Recebemos seus dados e seu currículo. Em breve, nossa equipe analisará
              seu perfil e entraremos em contato.
            </p>
          </div>
        </div>

        {/* Próximos passos */}
        <div className="px-6 py-10 sm:px-12">
          <h2 className="text-center text-lg font-bold text-slate-900 sm:text-xl">
            O que acontece agora
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
            Acompanhe os próximos passos do processo seletivo
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StepCard
              step={1}
              icon={<Mail size={22} />}
              title="E-mail de confirmação"
              description="Você receberá um e-mail confirmando o recebimento da candidatura nas próximas horas."
              color="bg-sky-50 text-sky-700"
            />
            <StepCard
              step={2}
              icon={<Sparkles size={22} />}
              title="Análise do perfil"
              description="Nossa equipe (e nossa IA) analisará seu currículo e habilidades para a vaga."
              color="bg-violet-50 text-violet-700"
            />
            <StepCard
              step={3}
              icon={<Briefcase size={22} />}
              title="Retorno em até 7 dias"
              description="Caso seu perfil seja selecionado, entraremos em contato para a próxima etapa."
              color="bg-amber-50 text-amber-700"
            />
          </div>

          {/* Bloco LGPD */}
          <div className="mt-10 flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
              <ShieldCheck size={20} aria-hidden="true" />
            </div>
            <div className="text-sm leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-800">Seus dados estão protegidos</p>
              <p className="mt-1">
                Tratamos suas informações com base na LGPD e apenas para fins de recrutamento.
                Para mais detalhes, consulte nossa{' '}
                <Link href="/politica-de-privacidade" className="font-semibold text-brand-600 hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/vagas"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              Ver mais vagas
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <Home size={18} aria-hidden="true" />
              Voltar para o início
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Salve esta página ou acompanhe seu e-mail para atualizações sobre a candidatura.
          </p>
        </div>
      </div>
    </div>
  );
}

interface StepCardProps {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

function StepCard({ step, icon, title, description, color }: StepCardProps) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-card">
      <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
        {step}
      </span>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}
