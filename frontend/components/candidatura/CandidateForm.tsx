'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Briefcase,
  ChevronDown,
  CircleX,
  FileUp,
  Mail,
  Phone,
  Search,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { candidaturaSchema, CandidaturaFormData } from '@/lib/validations/candidatura-schema';
import {
  dateBRToISO,
  formatCurrencyInput,
  formatDateInput,
  formatDDDInput,
  formatPhoneInput,
  normalizeSearch,
  parseCurrencyToNumber,
  sanitizeCityName,
  sanitizePersonName,
} from '@/lib/form-utils';
import { submitCandidatura } from '@/services/api';
import { Skill } from '@/types/skill';
import { Vaga } from '@/types/vaga';
import { UFOption } from '@/types/location';

import cidadesData from '@/lib/data/municipios.json';

interface CandidateFormProps {
  initialVagaId?: number;
  vagas: Vaga[];
  skills: Skill[];
  ufs: UFOption[];
}

type CidadesPorEstado = Record<string, string[]>;

const cidadesPorEstado = cidadesData as CidadesPorEstado;
const FORM_STORAGE_KEY = 'candidatura-form-draft';

export function CandidateForm({ initialVagaId, vagas, skills, ufs }: CandidateFormProps) {
  const router = useRouter();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const [cidadeSearch, setCidadeSearch] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<CandidaturaFormData>({
    resolver: zodResolver(candidaturaSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      nomeCompleto: '',
      dataNascimento: '',
      cidade: '',
      estado: '',
      pretensaoSalarial: '',
      aboutMe: '',
      email: '',
      emailPrincipal: true,
      ddd: '',
      numero: '',
      telefonePrincipal: true,
      bancoTalentos: false,
      vagaId: initialVagaId ? String(initialVagaId) : '',
      nivel: undefined,
      skillIds: [],
      aceiteTermos: false,
      curriculo: undefined as unknown as File,
    },
  });

  useEffect(() => {
    register('curriculo');
    register('aceiteTermos');
    register('skillIds');
    register('pretensaoSalarial');
    register('cidade');
    register('estado');
    register('emailPrincipal');
    register('telefonePrincipal');
  }, [register]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem(FORM_STORAGE_KEY);
      if (!saved) return;

      const data = JSON.parse(saved) as Record<string, unknown>;

      Object.entries(data).forEach(([key, value]) => {
        if (key === 'curriculo' || key === 'aceiteTermos') return;
        if (value === undefined || value === null) return;
        setValue(key as keyof CandidaturaFormData, value as never);
      });

      if (typeof data.cidade === 'string') {
        setCidadeSearch(data.cidade);
      }
    } catch {
      // rascunho corrompido: ignora silenciosamente
    }
  }, [setValue]);

  useEffect(() => {
    const subscription = watch((data) => {
      if (typeof window === 'undefined') return;

      const draft: Record<string, unknown> = { ...data };
      delete draft.curriculo;
      delete draft.aceiteTermos;

      try {
        window.localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // localStorage cheio ou indisponivel
      }
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    if (initialVagaId) {
      setValue('vagaId', String(initialVagaId), { shouldValidate: true });
      setValue('bancoTalentos', false);
    }
  }, [initialVagaId, setValue]);

  const estadoSelecionado = watch('estado');
  const bancoTalentos = watch('bancoTalentos');

  const selectedSkills = Array.isArray(watch('skillIds'))
    ? watch('skillIds').map(Number)
    : [];

  const cidadesDoEstado = useMemo(() => {
    if (!estadoSelecionado) {
      return [];
    }

    return cidadesPorEstado[estadoSelecionado] ?? [];
  }, [estadoSelecionado]);

  const cidadesFiltradas = useMemo(() => {
    const search = normalizeSearch(cidadeSearch);

    if (!estadoSelecionado) {
      return [];
    }

    if (!search) {
      return cidadesDoEstado.slice(0, 12);
    }

    return cidadesDoEstado
      .filter((cidade) => normalizeSearch(cidade).includes(search))
      .slice(0, 12);
  }, [cidadeSearch, cidadesDoEstado, estadoSelecionado]);

  const filteredSkills = useMemo(() => {
    const search = normalizeSearch(skillSearch);

    return skills
      .filter((skill) => !selectedSkills.includes(Number(skill.id)))
      .filter((skill) => {
        if (!search) {
          return true;
        }

        const value = normalizeSearch(`${skill.nome} ${skill.categoria ?? ''}`);
        return value.includes(search);
      })
      .slice(0, 24);
  }, [skills, selectedSkills, skillSearch]);

  const selectedSkillObjects = useMemo(() => {
    return skills.filter((skill) => selectedSkills.includes(Number(skill.id)));
  }, [skills, selectedSkills]);

  const validationMessages = useMemo(() => {
    return Object.values(errors)
      .map((error) => (error?.message ? String(error.message) : null))
      .filter(Boolean) as string[];
  }, [errors]);

  const ariaErrorProps = (name: string, errorMessage?: string) => ({
    'aria-invalid': errorMessage ? (true as const) : undefined,
    'aria-describedby': errorMessage ? `${name}-error` : undefined,
  });

  const personalInfoHasError =
    isSubmitted &&
    Boolean(
      errors.nomeCompleto ||
        errors.dataNascimento ||
        errors.pretensaoSalarial ||
        errors.estado ||
        errors.cidade ||
        errors.aboutMe,
    );

  const contactHasError =
    isSubmitted &&
    Boolean(errors.email || errors.ddd || errors.numero);

  const resumeHasError = isSubmitted && Boolean(errors.curriculo);
  const skillsHasError = isSubmitted && Boolean(errors.skillIds);
  const jobHasError = isSubmitted && Boolean(errors.vagaId || errors.nivel);
  const termsHasError = isSubmitted && Boolean(errors.aceiteTermos);

  function addSkill(skillId: number) {
    if (selectedSkills.includes(skillId)) {
      return;
    }

    setValue('skillIds', [...selectedSkills, skillId], {
      shouldValidate: isSubmitted,
      shouldDirty: true,
      shouldTouch: true,
    });

    setSkillSearch('');
  }

  function removeSkill(skillId: number) {
    setValue(
      'skillIds',
      selectedSkills.filter((id) => id !== skillId),
      {
        shouldValidate: isSubmitted,
        shouldDirty: true,
        shouldTouch: true,
      },
    );
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setValue('curriculo', undefined as unknown as File, {
        shouldValidate: isSubmitted,
        shouldDirty: true,
        shouldTouch: true,
      });

      setSelectedFileName('');
      return;
    }

    setValue('curriculo', file, {
      shouldValidate: isSubmitted,
      shouldDirty: true,
      shouldTouch: true,
    });

    setSelectedFileName(file.name);

    if (isSubmitted) {
      await trigger('curriculo');
    }
  }

  async function onSubmit(data: CandidaturaFormData) {
    setSubmitError(null);

    try {
      await submitCandidatura({
        nomeCompleto: data.nomeCompleto,
        dataNascimento: dateBRToISO(data.dataNascimento),
        cidade: data.cidade,
        estado: data.estado,
        pretensaoSalarial: parseCurrencyToNumber(data.pretensaoSalarial),
        aboutMe: data.aboutMe,
        email: data.email,
        emailPrincipal: Boolean(data.emailPrincipal),
        ddd: data.ddd,
        numero: data.numero,
        telefonePrincipal: Boolean(data.telefonePrincipal),
        vagaId: data.vagaId ? Number(data.vagaId) : undefined,
        bancoTalentos: data.bancoTalentos,
        nivel: data.nivel,
        skillIds: Array.isArray(data.skillIds) ? data.skillIds.map(Number) : [],
        aceiteTermos: Boolean(data.aceiteTermos),
        curriculo: data.curriculo,
      });

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(FORM_STORAGE_KEY);
      }

      router.push('/sucesso');
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar sua candidatura.',
      );
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 pb-28 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]"
      >
        <div className="space-y-8">
          <FormPanel
            icon={<User size={20} />}
            title="Informações pessoais"
            description="Dados básicos para identificação do candidato."
            hasError={personalInfoHasError}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Nome completo" name="nomeCompleto" error={errors.nomeCompleto?.message}>
                <input
                  {...register('nomeCompleto')}
                  {...ariaErrorProps('nomeCompleto', errors.nomeCompleto?.message)}
                  aria-required="true"
                  placeholder="Seu nome completo"
                  className={inputClass}
                  onChange={(event) => {
                    const value = sanitizePersonName(event.target.value);

                    setValue('nomeCompleto', value, {
                      shouldValidate: isSubmitted,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                />
              </Field>

              <Field label="Data de nascimento" name="dataNascimento" error={errors.dataNascimento?.message}>
                <input
                  {...register('dataNascimento')}
                  {...ariaErrorProps('dataNascimento', errors.dataNascimento?.message)}
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="dd/mm/aaaa"
                  className={inputClass}
                  onChange={(event) => {
                    const value = formatDateInput(event.target.value);

                    setValue('dataNascimento', value, {
                      shouldValidate: isSubmitted,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                />
              </Field>

              <Field label="Pretensão salarial" name="pretensaoSalarial" error={errors.pretensaoSalarial?.message}>
                <input
                  {...register('pretensaoSalarial')}
                  {...ariaErrorProps('pretensaoSalarial', errors.pretensaoSalarial?.message)}
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  className={inputClass}
                  onChange={(event) => {
                    const value = formatCurrencyInput(event.target.value);

                    setValue('pretensaoSalarial', value, {
                      shouldValidate: isSubmitted,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                />
              </Field>

              <Field label="Estado" name="estado" error={errors.estado?.message}>
                <div className="relative">
                  <select
                    {...register('estado')}
                    {...ariaErrorProps('estado', errors.estado?.message)}
                    aria-required="true"
                    className={`${inputClass} appearance-none`}
                    onChange={(event) => {
                      const value = event.target.value;

                      setValue('estado', value, {
                        shouldValidate: isSubmitted,
                        shouldDirty: true,
                        shouldTouch: true,
                      });

                      setValue('cidade', '', {
                        shouldValidate: isSubmitted,
                        shouldDirty: true,
                        shouldTouch: true,
                      });

                      setCidadeSearch('');
                    }}
                  >
                    <option value="">Selecione o estado</option>

                    {ufs.map((uf) => (
                      <option key={uf.sigla} value={uf.sigla}>
                        {uf.sigla} - {uf.nome}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </Field>

              <Field label="Cidade" name="cidade" error={errors.cidade?.message} className="md:col-span-2">
                <div className="relative">
                  <input
                    {...register('cidade')}
                    {...ariaErrorProps('cidade', errors.cidade?.message)}
                    aria-required="true"
                    type="text"
                    placeholder={
                      estadoSelecionado
                        ? 'Digite para buscar sua cidade'
                        : 'Selecione primeiro o estado'
                    }
                    disabled={!estadoSelecionado}
                    value={cidadeSearch}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                    onChange={(event) => {
                      const value = sanitizeCityName(event.target.value);

                      setCidadeSearch(value);

                      setValue('cidade', value, {
                        shouldValidate: isSubmitted,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    onBlur={() => {
                      const exactCity = cidadesDoEstado.find(
                        (cidade) => normalizeSearch(cidade) === normalizeSearch(cidadeSearch),
                      );

                      if (exactCity) {
                        setCidadeSearch(exactCity);

                        setValue('cidade', exactCity, {
                          shouldValidate: isSubmitted,
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }
                    }}
                  />

                  {estadoSelecionado && cidadeSearch && cidadesFiltradas.length > 0 ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      {cidadesFiltradas.map((cidade) => (
                        <button
                          key={cidade}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setCidadeSearch(cidade);

                            setValue('cidade', cidade, {
                              shouldValidate: isSubmitted,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
                        >
                          {cidade}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Field>

              <Field label="Sobre você" name="aboutMe" error={errors.aboutMe?.message} className="md:col-span-2">
                <textarea
                  {...register('aboutMe')}
                  {...ariaErrorProps('aboutMe', errors.aboutMe?.message)}
                  rows={5}
                  placeholder="Conte brevemente sobre sua experiência, objetivos e principais competências."
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          </FormPanel>

          <FormPanel
            icon={<Mail size={20} />}
            title="Contato"
            description="Informe os melhores canais para a empresa falar com você."
            hasError={contactHasError}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="E-mail" name="email" error={errors.email?.message} className="md:col-span-2">
                <div className="relative">
                  <Mail
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    {...register('email')}
                    {...ariaErrorProps('email', errors.email?.message)}
                    aria-required="true"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    className={`${inputClass} pl-11`}
                  />
                </div>
              </Field>

              <Field label="DDD" name="ddd" error={errors.ddd?.message}>
                <input
                  {...register('ddd')}
                  {...ariaErrorProps('ddd', errors.ddd?.message)}
                  aria-required="true"
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="47"
                  className={inputClass}
                  onChange={(event) => {
                    const value = formatDDDInput(event.target.value);

                    setValue('ddd', value, {
                      shouldValidate: isSubmitted,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                />
              </Field>

              <Field label="Número" name="numero" error={errors.numero?.message}>
                <div className="relative">
                  <Phone
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    {...register('numero')}
                    {...ariaErrorProps('numero', errors.numero?.message)}
                    aria-required="true"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="99999-9999"
                    className={`${inputClass} pl-11`}
                    onChange={(event) => {
                      const value = formatPhoneInput(event.target.value);

                      setValue('numero', value, {
                        shouldValidate: isSubmitted,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                  />
                </div>
              </Field>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!watch('emailPrincipal')}
                  onChange={(event) =>
                    setValue('emailPrincipal', event.target.checked, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />

                Este é meu e-mail principal
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!watch('telefonePrincipal')}
                  onChange={(event) =>
                    setValue('telefonePrincipal', event.target.checked, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />

                Este é meu telefone principal
              </label>
            </div>
          </FormPanel>

          <FormPanel
            icon={<FileUp size={20} />}
            title="Currículo"
            description="Envie um arquivo atualizado para complementar sua candidatura."
            hasError={resumeHasError}
          >
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-brand-400 hover:bg-brand-50/60">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm transition group-hover:scale-105">
                <FileUp size={26} />
              </div>

              <p className="mt-4 font-semibold text-slate-900">
                {selectedFileName || 'Clique para anexar seu currículo'}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                PDF, DOC ou DOCX. Tamanho máximo recomendado: 10 MB.
              </p>
            </label>

            {errors.curriculo?.message ? (
              <p className="mt-3 text-sm text-rose-600">
                {errors.curriculo.message as string}
              </p>
            ) : null}
          </FormPanel>

          <FormPanel
            icon={<Sparkles size={20} />}
            title="Habilidades"
            description="Adicione as competências mais relevantes para seu perfil profissional."
            hasError={skillsHasError}
          >
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <label className="text-sm font-semibold text-slate-700">
                Buscar habilidade
              </label>

              <div className="relative mt-2">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={skillSearch}
                  onChange={(event) => setSkillSearch(event.target.value)}
                  placeholder="Ex: Python, Excel, SQL, liderança..."
                  className={`${inputClass} bg-white pl-11`}
                />
              </div>

              {selectedSkillObjects.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedSkillObjects.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => removeSkill(Number(skill.id))}
                      className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100"
                    >
                      {skill.nome}
                      <X size={14} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                  Nenhuma habilidade adicionada ainda.
                </p>
              )}
            </div>

            <div className="mt-5 max-h-96 overflow-y-auto pr-1">
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredSkills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => addSkill(Number(skill.id))}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {skill.nome}
                      </span>

                      {skill.categoria ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          {skill.categoria}
                        </span>
                      ) : null}
                    </span>

                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-brand-700">
                      +
                    </span>
                  </button>
                ))}
              </div>

              {filteredSkills.length === 24 && (
                <p className="mt-3 text-center text-xs text-slate-400">
                  Mostrando as 24 primeiras. Use a busca para encontrar outras habilidades.
                </p>
              )}
            </div>

            {errors.skillIds?.message ? (
              <p className="mt-3 text-sm text-rose-600">
                {errors.skillIds.message as string}
              </p>
            ) : null}
          </FormPanel>
        </div>

        <aside className="space-y-6">
          <SidePanel
            icon={<Briefcase size={21} />}
            title="Vaga e nível"
            description="Destino da candidatura"
            hasError={jobHasError}
          >
            <div className="space-y-5">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  {...register('bancoTalentos')}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Quero entrar no banco de talentos
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Marque essa opção se deseja ser considerado para futuras vagas.
                  </span>
                </span>
              </label>

              <Field label="Vaga desejada" name="vagaId" error={errors.vagaId?.message}>
                <div className="relative">
                  <select
                    {...register('vagaId')}
                    {...ariaErrorProps('vagaId', errors.vagaId?.message)}
                    disabled={bancoTalentos}
                    className={`${inputClass} appearance-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                  >
                    <option value="">Selecione uma vaga</option>

                    {vagas.map((vaga) => (
                      <option key={vaga.id} value={vaga.id}>
                        {vaga.titulo}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </Field>

              <Field label="Nível profissional" name="nivel" error={errors.nivel?.message}>
                <div className="relative">
                  <select
                    {...register('nivel')}
                    {...ariaErrorProps('nivel', errors.nivel?.message)}
                    aria-required="true"
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="">Selecione o nível</option>
                    <option value="estagio">Estágio</option>
                    <option value="junior">Júnior</option>
                    <option value="pleno">Pleno</option>
                    <option value="senior">Sênior</option>
                    <option value="especialista">Especialista</option>
                  </select>

                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </Field>
            </div>
          </SidePanel>

          <div
            className={`rounded-[2rem] border bg-white p-6 shadow-soft transition ${
              termsHasError
                ? 'border-rose-200 ring-4 ring-rose-50'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="font-bold text-slate-950">Termos e privacidade</h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Para concluir, confirme que você autoriza o tratamento dos dados
                  informados para fins de recrutamento.
                </p>
              </div>

              {termsHasError ? (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <CircleX size={21} />
                </div>
              ) : null}
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={!!watch('aceiteTermos')}
                onChange={(event) =>
                  setValue('aceiteTermos', event.target.checked, {
                    shouldValidate: isSubmitted,
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />

              <span className="text-sm leading-6 text-slate-600">
                Li e aceito os termos de candidatura e privacidade.
              </span>
            </label>

            {errors.aceiteTermos?.message ? (
              <p className="mt-3 text-sm text-rose-600">
                {errors.aceiteTermos.message}
              </p>
            ) : null}
          </div>

          {isSubmitted && validationMessages.length > 0 ? (
            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              <div className="flex gap-2 font-semibold">
                <AlertCircle size={18} />
                Revise antes de enviar
              </div>

              <ul className="mt-3 list-disc space-y-1 pl-5">
                {validationMessages.map((message, index) => (
                  <li key={`${message}-${index}`}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {submitError ? (
            <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              {submitError}
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-card">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                'Enviando candidatura...'
              ) : (
                <>
                  <Send size={18} />
                  Enviar candidatura
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              Suas informações serão analisadas pela equipe responsável.
            </p>
          </div>
        </aside>
      </form>
    </section>
  );
}

const inputClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100';

function FormPanel({
  icon,
  title,
  description,
  hasError = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  hasError?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[2rem] border bg-white shadow-soft transition ${
        hasError
          ? 'border-rose-200 ring-4 ring-rose-50'
          : 'border-slate-200'
      }`}
    >
      <div className="border-b border-slate-100 bg-white p-6">
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                hasError
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-brand-50 text-brand-700'
              }`}
            >
              {icon}
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-950">
                {title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
          </div>

          {hasError ? (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <CircleX size={21} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-6">
        {children}
      </div>
    </section>
  );
}

function SidePanel({
  icon,
  title,
  description,
  hasError = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  hasError?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[2rem] border bg-white p-6 shadow-soft transition ${
        hasError
          ? 'border-rose-200 ring-4 ring-rose-50'
          : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              hasError ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700'
            }`}
          >
            {icon}
          </div>

          <div>
            <h2 className="font-bold text-slate-950">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>

        {hasError ? (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <CircleX size={21} />
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  name,
  className = '',
  children,
}: {
  label: string;
  error?: string;
  name?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = name ? `${name}-error` : undefined;

  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}

      {error ? (
        <span
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-2 block text-sm text-rose-600"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}