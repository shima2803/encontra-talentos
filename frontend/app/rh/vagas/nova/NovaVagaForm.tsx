'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Building2,
  CheckCircle2,
  GraduationCap,
  Handshake,
  Home,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type { Skill } from '@/types/skill';

type TipoContrato = 'CLT' | 'PJ' | 'ESTAGIO' | 'JOVEM_APRENDIZ' | 'CORPORATE';
type ModeloTrabalho = 'PRESENCIAL' | 'HIBRIDO' | 'ONLINE';

interface NovaVagaFormValues {
  titulo_vaga: string;
  area: string;
  nivel: string;
  descricao: string;
  tipo_contrato: TipoContrato | '';
  modelo_trabalho: ModeloTrabalho | '';
  localidade_cidade: string;
  localidade_estado: string;
  salario: string;
  salario_periodicidade: 'MENSAL' | 'HORA' | 'ANUAL';
  moeda: string;
}

interface Props {
  skills: Skill[];
}

const NIVEIS = ['Estagio', 'Junior', 'Pleno', 'Senior', 'Especialista'] as const;

const TIPOS_CONTRATO: { value: TipoContrato; label: string; icon: typeof Building2 }[] = [
  { value: 'CLT', label: 'CLT', icon: Building2 },
  { value: 'PJ', label: 'PJ', icon: Handshake },
  { value: 'ESTAGIO', label: 'Estagio', icon: GraduationCap },
  { value: 'JOVEM_APRENDIZ', label: 'Jovem Aprendiz', icon: Sparkles },
  { value: 'CORPORATE', label: 'Corporate', icon: Building2 },
];

const MODELOS_TRABALHO: { value: ModeloTrabalho; label: string; icon: typeof Home }[] = [
  { value: 'PRESENCIAL', label: 'Presencial', icon: Building2 },
  { value: 'HIBRIDO', label: 'Hibrido', icon: Home },
  { value: 'ONLINE', label: 'Online', icon: Home },
];

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function parseSalary(value: string): number | null {
  const cleaned = value.replace(/\./g, '').replace(',', '.').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export function NovaVagaForm({ skills }: Props) {
  const router = useRouter();
  const [skillIds, setSkillIds] = useState<number[]>([]);
  const [skillQuery, setSkillQuery] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [salarioAberto, setSalarioAberto] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NovaVagaFormValues>({
    defaultValues: {
      titulo_vaga: '',
      area: '',
      nivel: '',
      descricao: '',
      tipo_contrato: '',
      modelo_trabalho: '',
      localidade_cidade: '',
      localidade_estado: '',
      salario: '',
      salario_periodicidade: 'MENSAL',
      moeda: 'BRL',
    },
  });

  const tipoSelecionado = watch('tipo_contrato');
  const modeloSelecionado = watch('modelo_trabalho');
  const precisaLocalidade = modeloSelecionado === 'PRESENCIAL' || modeloSelecionado === 'HIBRIDO';

  const skillsFiltradas = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    const semSelecionadas = skills.filter((s) => !skillIds.includes(s.id));
    if (!q) return semSelecionadas.slice(0, 24);
    return semSelecionadas
      .filter((s) => s.nome.toLowerCase().includes(q))
      .slice(0, 24);
  }, [skills, skillIds, skillQuery]);

  const skillsSelecionadas = useMemo(
    () => skills.filter((s) => skillIds.includes(s.id)),
    [skills, skillIds],
  );

  function addSkill(id: number) {
    setSkillIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSkillQuery('');
  }

  function removeSkill(id: number) {
    setSkillIds((prev) => prev.filter((x) => x !== id));
  }

  function removerSalario() {
    setSalarioAberto(false);
    setValue('salario', '');
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSuccess(false);

    if (!values.tipo_contrato) {
      setServerError('Selecione o tipo de contrato.');
      return;
    }
    if (!values.modelo_trabalho) {
      setServerError('Selecione o modelo de trabalho.');
      return;
    }
    if (
      (values.modelo_trabalho === 'PRESENCIAL' || values.modelo_trabalho === 'HIBRIDO') &&
      !values.localidade_cidade.trim() &&
      !values.localidade_estado.trim()
    ) {
      setServerError('Vagas presenciais ou hibridas exigem cidade ou estado.');
      return;
    }

    const salario = salarioAberto ? parseSalary(values.salario) : null;

    const payload = {
      titulo_vaga: values.titulo_vaga.trim(),
      area: values.area.trim() || null,
      nivel: values.nivel || null,
      descricao: values.descricao.trim() || null,
      tipo_contrato: values.tipo_contrato,
      modelo_trabalho: values.modelo_trabalho,
      localidade_cidade: precisaLocalidade ? values.localidade_cidade.trim() || null : null,
      localidade_estado: precisaLocalidade
        ? (values.localidade_estado.trim().toUpperCase() || null)
        : null,
      salario,
      salario_periodicidade: salario !== null ? values.salario_periodicidade : null,
      moeda: salario !== null ? (values.moeda || 'BRL').toUpperCase() : null,
      skill_ids: skillIds,
    };

    try {
      const res = await fetch('/api/rh/vagas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body?.detail || body?.error || 'Falha ao criar vaga.';
        setServerError(typeof detail === 'string' ? detail : JSON.stringify(detail));
        return;
      }
      setSuccess(true);
      reset();
      setSkillIds([]);
      setSalarioAberto(false);
      setTimeout(() => router.push('/rh/vagas'), 900);
    } catch {
      setServerError('Nao foi possivel conectar a API.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {/* === Bloco: identificacao === */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Identificacao da vaga</h2>
        <p className="mt-1 text-sm text-slate-500">
          Como o candidato vai ver a oportunidade.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Titulo da vaga <span className="text-rose-600">*</span>
            </span>
            <input
              type="text"
              placeholder="Ex: Analista de Dados Pleno"
              aria-invalid={!!errors.titulo_vaga}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              {...register('titulo_vaga', {
                required: 'Informe o titulo da vaga.',
                minLength: { value: 2, message: 'Minimo 2 caracteres.' },
              })}
            />
            {errors.titulo_vaga && (
              <span className="text-sm text-rose-600">{errors.titulo_vaga.message}</span>
            )}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Area</span>
              <input
                type="text"
                placeholder="Ex: Dados, TI, Marketing"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                {...register('area')}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nivel</span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                {...register('nivel')}
              >
                <option value="">Selecione</option>
                {NIVEIS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Descricao / bio da vaga
            </span>
            <textarea
              rows={6}
              placeholder="Conte sobre a oportunidade: responsabilidades, beneficios, contexto da empresa..."
              maxLength={5000}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              {...register('descricao')}
            />
            <span className="text-xs text-slate-400">Maximo 5.000 caracteres.</span>
          </label>
        </div>
      </section>

      {/* === Bloco: tipo de contrato === */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Tipo de contrato <span className="text-rose-600">*</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Como sera o vinculo do profissional com a empresa.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TIPOS_CONTRATO.map(({ value, label, icon: Icon }) => {
            const ativo = tipoSelecionado === value;
            return (
              <label
                key={value}
                className={`group flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition ${
                  ativo
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  value={value}
                  className="sr-only"
                  {...register('tipo_contrato', { required: 'Selecione o tipo de contrato.' })}
                />
                <Icon size={18} aria-hidden="true" className={ativo ? 'text-brand-700' : 'text-slate-400'} />
                <span className="text-sm font-semibold">{label}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* === Bloco: modelo de trabalho === */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Modelo de trabalho <span className="text-rose-600">*</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Onde e como o profissional vai atuar no dia a dia.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {MODELOS_TRABALHO.map(({ value, label, icon: Icon }) => {
            const ativo = modeloSelecionado === value;
            return (
              <label
                key={value}
                className={`group flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition ${
                  ativo
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  value={value}
                  className="sr-only"
                  {...register('modelo_trabalho', { required: 'Selecione o modelo de trabalho.' })}
                />
                <Icon size={18} aria-hidden="true" className={ativo ? 'text-brand-700' : 'text-slate-400'} />
                <span className="text-sm font-semibold">{label}</span>
              </label>
            );
          })}
        </div>

        {precisaLocalidade && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block space-y-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <MapPin size={14} aria-hidden="true" className="text-slate-400" />
                  Cidade <span className="text-rose-600">*</span>
                </span>
                <input
                  type="text"
                  placeholder="Ex: Sao Paulo"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  {...register('localidade_cidade')}
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Estado (UF) <span className="text-rose-600">*</span>
              </span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                {...register('localidade_estado')}
              >
                <option value="">Selecione</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      {/* === Bloco: salario (opcional via toggle) === */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Salario</h2>
            <p className="mt-1 text-sm text-slate-500">
              Opcional. Se nao informar, a vaga aparece sem salario para os candidatos.
            </p>
          </div>

          {!salarioAberto ? (
            <button
              type="button"
              onClick={() => setSalarioAberto(true)}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-600 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              <Plus size={16} aria-hidden="true" />
              Adicionar salario
            </button>
          ) : (
            <button
              type="button"
              onClick={removerSalario}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <X size={16} aria-hidden="true" />
              Remover salario
            </button>
          )}
        </div>

        {salarioAberto && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <label className="block space-y-2 sm:col-span-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Wallet size={14} aria-hidden="true" className="text-slate-400" />
                Valor
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="5000"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                {...register('salario')}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Periodicidade</span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                {...register('salario_periodicidade')}
              >
                <option value="MENSAL">Mensal</option>
                <option value="HORA">Hora</option>
                <option value="ANUAL">Anual</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Moeda</span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                {...register('moeda')}
              >
                <option value="BRL">BRL (Real)</option>
                <option value="USD">USD (Dolar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </label>
          </div>
        )}
      </section>

      {/* === Bloco: skills === */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Skills exigidas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Selecione as habilidades que o candidato ideal precisa ter. Sao usadas pela IA para calcular o score de aderencia.
        </p>

        <div className="mt-6 space-y-4">
          {skillsSelecionadas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skillsSelecionadas.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
                >
                  {s.nome}
                  <button
                    type="button"
                    onClick={() => removeSkill(s.id)}
                    className="rounded-full p-0.5 hover:bg-brand-100"
                    aria-label={`Remover ${s.nome}`}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
              placeholder="Buscar skill (ex: SQL, Python, Power BI)..."
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200">
            {skillsFiltradas.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                Nenhuma skill encontrada.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {skillsFiltradas.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => addSkill(s.id)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <span>{s.nome}</span>
                      <span className="text-xs text-brand-600">+ Adicionar</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* === Mensagens + submit === */}
      {serverError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {serverError}
        </div>
      )}
      {success && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          Vaga criada com sucesso! Redirecionando...
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.push('/rh/vagas')}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Publicar vaga
        </Button>
      </div>
    </form>
  );
}
