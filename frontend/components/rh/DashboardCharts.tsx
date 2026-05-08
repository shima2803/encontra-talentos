'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

interface FunilFaixa {
  faixa: string;
  total: number;
}
interface MediaSalarialPorVaga {
  id_vaga: number;
  titulo_vaga: string;
  media_salarial: string | null;
  total_candidaturas: number;
}
interface ScorePoint {
  titulo_vaga: string;
  pretensao_salarial: string | null;
  score_aderencia: string | null;
}

const FUNIL_COLORS: Record<string, string> = {
  'Entre 80 e 100': '#0d9488',
  'Entre 60 e 79': '#a16207',
  'Abaixo de 60': '#9ca3af',
};

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export function FunilChart({ data }: { data: FunilFaixa[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 24, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={12} />
        <YAxis dataKey="faixa" type="category" stroke="#475569" fontSize={12} width={120} />
        <Tooltip
          contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }}
          formatter={(v: number) => [v, 'Candidatos']}
        />
        <Bar dataKey="total" radius={[0, 8, 8, 0]}>
          {data.map((entry) => (
            <Cell key={entry.faixa} fill={FUNIL_COLORS[entry.faixa] ?? '#0d9488'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MediaSalarialChart({ data }: { data: MediaSalarialPorVaga[] }) {
  const chartData = data
    .filter((d) => d.media_salarial !== null)
    .map((d) => ({
      titulo: d.titulo_vaga.length > 22 ? d.titulo_vaga.slice(0, 20) + '...' : d.titulo_vaga,
      tituloFull: d.titulo_vaga,
      media: Number(d.media_salarial),
    }));

  if (chartData.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Sem dados salariais ainda.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ left: 8, right: 16, top: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="titulo" stroke="#475569" fontSize={11} />
        <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => fmtBRL(v)} />
        <Tooltip
          contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }}
          formatter={(v: number) => [fmtBRL(v), 'Media salarial']}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.tituloFull || ''}
        />
        <Bar dataKey="media" fill="#0d9488" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ScoreVsPretensaoChart({ data }: { data: ScorePoint[] }) {
  // Agrupa por titulo_vaga para colorir
  const grupos = new Map<string, { x: number; y: number }[]>();
  for (const p of data) {
    if (p.pretensao_salarial === null || p.score_aderencia === null) continue;
    const arr = grupos.get(p.titulo_vaga) ?? [];
    arr.push({ x: Number(p.pretensao_salarial), y: Number(p.score_aderencia) });
    grupos.set(p.titulo_vaga, arr);
  }

  if (grupos.size === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Sem dados de score x pretensao ainda.</p>;
  }

  const palette = ['#0d9488', '#a16207', '#9ca3af', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ left: 8, right: 16, top: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          type="number"
          dataKey="x"
          name="Pretensao salarial"
          stroke="#94a3b8"
          fontSize={11}
          tickFormatter={(v) => fmtBRL(v)}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Score"
          stroke="#94a3b8"
          fontSize={11}
          domain={[0, 100]}
        />
        <ZAxis range={[80, 80]} />
        <Tooltip
          contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }}
          formatter={(value, name) => {
            if (name === 'Pretensao salarial') return [fmtBRL(Number(value)), name];
            return [value, name];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {Array.from(grupos.entries()).map(([nome, pontos], idx) => (
          <Scatter key={nome} name={nome} data={pontos} fill={palette[idx % palette.length]} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
