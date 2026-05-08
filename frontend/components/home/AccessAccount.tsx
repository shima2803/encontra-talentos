import Link from 'next/link';
import { FileText, SearchCheck, Briefcase } from 'lucide-react';

export function AccessAccount() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <FileText size={21} />
      </div>

      <h3 className="mt-4 font-bold text-slate-900">Acesso rápido</h3>

      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        Candidatos enviam seu currículo e habilidades. Empresas publicam novas
        vagas e gerenciam candidaturas no painel.
      </p>

      <div className="mt-5 space-y-2.5">
        <Link
          href="/candidatura"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-center font-semibold text-white transition hover:bg-brand-700"
        >
          <SearchCheck size={18} />
          Enviar candidatura
        </Link>

        <Link
          href="/rh/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-600 bg-white py-3 text-center font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          <Briefcase size={18} />
          Publicar vaga
        </Link>
      </div>
    </div>
  );
}