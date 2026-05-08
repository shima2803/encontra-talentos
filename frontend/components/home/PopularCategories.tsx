import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Vaga } from '@/types/vaga';

export function PopularCategories({ vagas }: { vagas: Vaga[] }) {
  // Conta vagas por área (com fallback para "Outras")
  const counts = vagas.reduce<Record<string, number>>((acc, v) => {
    const key = v.area?.trim() || 'Outras';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const list = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Se não tiver nada (lista vazia), exibe placeholders neutros
  const items = list.length
    ? list
    : [
        ['Tecnologia', 0],
        ['Marketing', 0],
        ['Vendas', 0],
        ['Recursos Humanos', 0],
        ['Financeiro', 0],
      ] as [string, number][];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6">
      <h3 className="mb-4 font-bold text-slate-900">Categorias populares</h3>
      <ul className="space-y-3">
        {items.map(([name, count]) => (
          <li key={name}>
            <Link
              href={`/vagas?area=${encodeURIComponent(String(name))}`}
              className="group flex items-center justify-between text-sm"
            >
              <span className="text-slate-700 group-hover:text-brand-600">{name}</span>
              <span className="font-medium text-slate-400">{count}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/vagas"
        className="mt-5 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
      >
        Ver todas as categorias <ChevronRight size={16} />
      </Link>
    </div>
  );
}
