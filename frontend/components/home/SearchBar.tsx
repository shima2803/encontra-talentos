'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Briefcase, ChevronDown } from 'lucide-react';

export function SearchBar() {
  const router = useRouter();
  const [cargo, setCargo] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [tipo, setTipo] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (cargo) params.set('q', cargo);
    if (localidade) params.set('local', localidade);
    if (tipo) params.set('modelo', tipo);
    router.push(`/vagas${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <div className="relative z-10 mx-auto -mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-soft lg:flex-row lg:items-center lg:gap-0"
      >
        {/* Cargo */}
        <label className="flex flex-1 items-start gap-3 px-4 py-3 lg:border-r lg:border-slate-100">
          <Search size={20} className="mt-0.5 flex-shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-700">Cargo ou palavra-chave</span>
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex: Desenvolvedor, Analista, Designer..."
              className="w-full bg-transparent text-xs text-slate-600 placeholder-slate-400 outline-none"
            />
          </div>
        </label>

        {/* Localização */}
        <label className="flex flex-1 items-start gap-3 px-4 py-3 lg:border-r lg:border-slate-100">
          <MapPin size={20} className="mt-0.5 flex-shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-700">Localização</span>
            <input
              type="text"
              value={localidade}
              onChange={(e) => setLocalidade(e.target.value)}
              placeholder="Ex: São Paulo, SP ou Remoto"
              className="w-full bg-transparent text-xs text-slate-600 placeholder-slate-400 outline-none"
            />
          </div>
        </label>

        {/* Tipo */}
        <label className="relative flex flex-1 items-start gap-3 px-4 py-3">
          <Briefcase size={20} className="mt-0.5 flex-shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-700">Tipo de trabalho</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full appearance-none bg-transparent text-xs text-slate-600 outline-none"
            >
              <option value="">Todos os tipos</option>
              <option value="Remoto">Remoto</option>
              <option value="Hibrido">Híbrido</option>
              <option value="Presencial">Presencial</option>
            </select>
          </div>
          <ChevronDown size={18} className="mt-1 flex-shrink-0 text-slate-400" />
        </label>

        <button
          type="submit"
          className="whitespace-nowrap rounded-xl bg-brand-600 px-7 py-3.5 font-semibold text-white transition hover:bg-brand-700 lg:ml-2"
        >
          Buscar vagas
        </button>
      </form>
    </div>
  );
}
