type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
};

export function TermsBlock({ checked, onChange, error }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-base font-semibold text-slate-900">Termos de candidatura e privacidade</h3>
        <p className="mt-2 text-sm text-slate-600">
          Para concluir sua candidatura, voce precisa concordar com o uso dos seus dados para fins de recrutamento.
        </p>

        <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer list-none font-medium text-slate-900">Ler termos completos</summary>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>Ao enviar este formulario, voce autoriza o tratamento dos dados informados para analise da sua candidatura.</p>
            <p>Seus dados podem ser usados no processo seletivo atual e em futuras oportunidades, inclusive banco de talentos.</p>
            <p>O curriculo podera ser processado por ferramentas internas para extracao de texto e apoio inicial a triagem.</p>
            <p>Somente pessoas e sistemas autorizados terao acesso aos seus dados, conforme necessidade do recrutamento.</p>
          </div>
        </details>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300"
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium text-slate-800">Li e aceito os termos de candidatura e privacidade.</span>
          <span className="block text-sm text-slate-500">Ao marcar esta opcao, voce concorda com o tratamento dos dados informados para fins de recrutamento.</span>
          {error ? <span className="block text-sm text-rose-600">{error}</span> : null}
        </span>
      </label>
    </div>
  );
}
