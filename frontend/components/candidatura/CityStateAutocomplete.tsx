'use client';

import { useEffect, useMemo, useState } from 'react';
import { MunicipioOption, UFOption } from '@/types/location';
import { getUfs, searchMunicipios } from '@/services/api';
import { normalizeSearch, sanitizeCityName } from '@/lib/form-utils';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface Props {
  cidade: string;
  estado: string;
  cidadeError?: string;
  estadoError?: string;
  onCidadeChange: (value: string) => void;
  onEstadoChange: (value: string) => void;
}

export function CityStateAutocomplete({
  cidade,
  estado,
  cidadeError,
  estadoError,
  onCidadeChange,
  onEstadoChange,
}: Props) {
  const [ufs, setUfs] = useState<UFOption[]>([]);
  const [loadingUfs, setLoadingUfs] = useState(false);
  const [cityQuery, setCityQuery] = useState(cidade);
  const [suggestions, setSuggestions] = useState<MunicipioOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setCityQuery(cidade);
  }, [cidade]);

  useEffect(() => {
    let active = true;

    async function loadUfs() {
      setLoadingUfs(true);
      const data = await getUfs();

      if (active) {
        setUfs(data);
        setLoadingUfs(false);
      }
    }

    void loadUfs();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const normalizedUf = estado.trim().toUpperCase();
    const normalizedQuery = sanitizeCityName(cityQuery);

    if (!normalizedUf || normalizedQuery.length < 1) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      const data = await searchMunicipios(normalizedUf, normalizedQuery);
      setSuggestions(data);
      setIsSearching(false);
      setIsOpen(true);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [cityQuery, estado]);

  const selectedUfName = useMemo(() => {
    return ufs.find((item) => item.sigla === estado)?.nome ?? '';
  }, [estado, ufs]);

  const filteredSuggestions = useMemo(() => {
    const query = normalizeSearch(cityQuery);

    if (!query) return suggestions.slice(0, 10);

    return suggestions
      .filter((item) => normalizeSearch(item.nome).startsWith(query))
      .slice(0, 10);
  }, [cityQuery, suggestions]);

  const handleCityInput = (value: string) => {
    const sanitized = sanitizeCityName(value);
    setCityQuery(sanitized);
    onCidadeChange(sanitized);
    setIsOpen(true);
  };

  const handleSuggestionClick = (item: MunicipioOption) => {
    setCityQuery(item.nome);
    onCidadeChange(item.nome);
    setIsOpen(false);
  };

  const handleUfChange = (value: string) => {
    const nextUf = value.toUpperCase();
    onEstadoChange(nextUf);
    onCidadeChange('');
    setCityQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[180px,1fr] md:items-start">
      <Select
        label="Estado"
        value={estado}
        onChange={(event) => handleUfChange(event.target.value)}
        error={estadoError}
        disabled={loadingUfs}
      >
        <option value="">Selecione</option>
        {ufs.map((uf) => (
          <option key={uf.sigla} value={uf.sigla}>
            {uf.sigla} - {uf.nome}
          </option>
        ))}
      </Select>

      <div className="relative">
        <Input
          label="Cidade"
          placeholder={
            estado
              ? `Digite o inicio da cidade em ${selectedUfName || estado}`
              : 'Primeiro selecione o estado'
          }
          value={cityQuery}
          onChange={(event) => handleCityInput(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 150);
          }}
          disabled={!estado}
          autoComplete="off"
          error={cidadeError}
        />

        {estado && isOpen ? (
          <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
            {isSearching ? (
              <p className="px-3 py-2 text-sm text-slate-500">Buscando cidades...</p>
            ) : filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item) => (
                <button
                  key={`${item.uf}-${item.nome}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSuggestionClick(item)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  <span className="font-medium">{item.nome}</span>
                  <span className="text-slate-400">{item.uf}</span>
                </button>
              ))
            ) : cityQuery.trim().length > 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500">Nenhuma cidade encontrada.</p>
            ) : (
              <p className="px-3 py-2 text-sm text-slate-500">Digite o inicio da cidade.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}