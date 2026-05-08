'use client';

import { useMemo, useState } from 'react';
import { FieldErrors } from 'react-hook-form';
import { Search, X, Plus, Sparkles } from 'lucide-react';
import { CandidaturaFormData } from '@/lib/validations/candidatura-schema';
import { Skill } from '@/types/skill';
import { normalizeSearch } from '@/lib/form-utils';

interface Props {
  selectedSkills: number[];
  onChange: (skills: number[]) => void;
  errors: FieldErrors<CandidaturaFormData>;
  skills: Skill[];
}

export function SkillsBlock({ selectedSkills, onChange, errors, skills }: Props) {
  const [query, setQuery] = useState('');

  const normalizedSelected = useMemo(() => {
    return Array.isArray(selectedSkills)
      ? selectedSkills.map(Number).filter((value) => !Number.isNaN(value))
      : [];
  }, [selectedSkills]);

  const selectedSkillObjects = useMemo(() => {
    return skills.filter((skill) => normalizedSelected.includes(Number(skill.id)));
  }, [skills, normalizedSelected]);

  const filteredSkills = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return skills
      .filter((skill) => !normalizedSelected.includes(Number(skill.id)))
      .filter((skill) => {
        if (!normalizedQuery) {
          return true;
        }

        const searchable = normalizeSearch(
          `${skill.nome} ${skill.categoria ?? ''}`,
        );

        return searchable.includes(normalizedQuery);
      })
      .slice(0, normalizedQuery ? 10 : 8);
  }, [skills, normalizedSelected, query]);

  const groupedSuggestions = useMemo(() => {
    return filteredSkills.reduce<Record<string, Skill[]>>((acc, skill) => {
      const category = skill.categoria || 'Outras habilidades';

      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push(skill);
      return acc;
    }, {});
  }, [filteredSkills]);

  function addSkill(skillId: number) {
    if (normalizedSelected.includes(skillId)) {
      return;
    }

    onChange([...normalizedSelected, skillId]);
    setQuery('');
  }

  function removeSkill(skillId: number) {
    onChange(normalizedSelected.filter((id) => id !== skillId));
  }

  function clearSkills() {
    onChange([]);
    setQuery('');
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Sparkles size={18} className="text-brand-600" />
              Habilidades profissionais
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Busque por tecnologias, ferramentas, áreas de conhecimento ou competências.
              A lista pode vir da sua API com milhares de itens.
            </p>
          </div>

          {selectedSkillObjects.length > 0 ? (
            <button
              type="button"
              onClick={clearSkills}
              className="text-sm font-semibold text-slate-500 transition hover:text-rose-600"
            >
              Limpar seleção
            </button>
          ) : null}
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-slate-700">
            Buscar habilidade
          </label>

          <div className="relative mt-2">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite para buscar. Ex: Python, Excel, atendimento, liderança..."
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
            />
          </div>
        </div>

        <div className="mt-5 min-h-[52px] rounded-2xl border border-dashed border-slate-300 bg-white p-3">
          {selectedSkillObjects.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedSkillObjects.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => removeSkill(Number(skill.id))}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-100"
                  title="Remover skill"
                >
                  {skill.nome}
                  <X size={14} />
                </button>
              ))}
            </div>
          ) : (
            <p className="px-1 py-2 text-sm text-slate-500">
              Nenhuma habilidade selecionada ainda.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Sugestões encontradas
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              Clique para adicionar à candidatura.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {filteredSkills.length} opções
          </span>
        </div>

        {Object.keys(groupedSuggestions).length > 0 ? (
          <div className="space-y-5">
            {Object.entries(groupedSuggestions).map(([category, items]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {category}
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => addSkill(Number(skill.id))}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          {skill.nome}
                        </span>

                        {skill.categoria ? (
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {skill.categoria}
                          </span>
                        ) : null}
                      </span>

                      <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                        <Plus size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Nenhuma habilidade encontrada com esse filtro.
          </p>
        )}
      </div>

      {errors.skillIds?.message ? (
        <p className="text-sm text-rose-600">
          {errors.skillIds.message as string}
        </p>
      ) : null}
    </div>
  );
}