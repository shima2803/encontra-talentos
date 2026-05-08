import { CandidaturaPayload } from '@/types/candidatura';
import { Skill } from '@/types/skill';
import { Vaga } from '@/types/vaga';
import { MunicipioOption, UFOption } from '@/types/location';
import { skillsMock } from '@/lib/mocks/skills';
import { vagasMock } from '@/lib/mocks/vagas';
import { ufsMock } from '@/lib/mocks/ufs';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  if (!API_URL) {
    console.warn(`API_URL nao configurada. Usando fallback para ${path}`);
    return fallback;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Erro ao buscar ${path}:`, response.status, response.statusText);
      return fallback;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Erro de rede ao buscar ${path}:`, error);
    return fallback;
  }
}

interface InternalJobApi {
  id: number;
  titulo: string;
  area?: string | null;
  nivel?: string | null;
  descricao?: string | null;
  status_vaga?: string | null;
  empresa?: string | null;
  tipo_contrato?: string | null;
  modelo_trabalho?: string | null;
  localidade_cidade?: string | null;
  localidade_estado?: string | null;
  salario?: number | string | null;
  salario_periodicidade?: string | null;
  moeda?: string | null;
}

const MODELO_LABELS: Record<string, 'Presencial' | 'Hibrido' | 'Remoto'> = {
  PRESENCIAL: 'Presencial',
  HIBRIDO: 'Hibrido',
  ONLINE: 'Remoto',
};

function buildLocalidade(cidade?: string | null, estado?: string | null): string | null {
  const c = (cidade || '').trim();
  const e = (estado || '').trim();
  if (c && e) return `${c} - ${e}`;
  return c || e || null;
}

export async function getVagas(): Promise<Vaga[]> {
  if (!API_URL) {
    return vagasMock.map((v) => ({ ...v, fonte: 'interna' as const }));
  }
  const internas = await apiGet<InternalJobApi[]>('/vagas', []);
  return internas.map((vaga) => ({
    id: vaga.id,
    titulo: vaga.titulo,
    area: vaga.area ?? null,
    nivel: vaga.nivel ?? null,
    descricao: vaga.descricao ?? null,
    status_vaga: vaga.status_vaga ?? null,
    empresa: vaga.empresa ?? null,
    tipoContrato: vaga.tipo_contrato ?? null,
    modeloTrabalho: vaga.modelo_trabalho
      ? MODELO_LABELS[vaga.modelo_trabalho] ?? vaga.modelo_trabalho
      : null,
    localidade: buildLocalidade(vaga.localidade_cidade, vaga.localidade_estado),
    salario: vaga.salario != null ? Number(vaga.salario) : null,
    salarioPeriodicidade: vaga.salario_periodicidade ?? null,
    moeda: vaga.moeda ?? null,
    fonte: 'interna' as const,
  }));
}

interface ExternalJobApi {
  id: string;
  titulo: string;
  empresa?: string | null;
  area?: string | null;
  descricao?: string | null;
  localidade?: string | null;
  modelo_trabalho?: string | null;
  url_origem: string;
  data_publicacao?: string | null;
  fonte: string;
}

export async function getVagasExternas(): Promise<Vaga[]> {
  const externas = await apiGet<ExternalJobApi[]>('/vagas-externas', []);

  return externas.map((vaga) => ({
    id: vaga.id,
    titulo: vaga.titulo,
    empresa: vaga.empresa ?? null,
    area: vaga.area ?? null,
    descricao: vaga.descricao ?? null,
    localidade: vaga.localidade ?? null,
    modeloTrabalho: vaga.modelo_trabalho ?? null,
    urlOrigem: vaga.url_origem,
    fonte: vaga.fonte,
  }));
}

export async function getSkills(): Promise<Skill[]> {
  return apiGet<Skill[]>('/skills', skillsMock);
}

export async function getUfs(): Promise<UFOption[]> {
  return apiGet<UFOption[]>('/ufs', ufsMock);
}

export async function searchMunicipios(uf: string, query: string): Promise<MunicipioOption[]> {
  const normalizedUf = uf.trim().toUpperCase();
  const normalizedQuery = query.trim();

  if (!normalizedUf || normalizedUf.length !== 2 || normalizedQuery.length < 1) {
    return [];
  }

  return apiGet<MunicipioOption[]>(
    `/municipios?uf=${encodeURIComponent(normalizedUf)}&query=${encodeURIComponent(normalizedQuery)}`,
    [],
  );
}

export async function submitCandidatura(payload: CandidaturaPayload) {
  if (!API_URL) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      ok: true,
      mock: true,
      message: 'Envio simulado com sucesso.',
      payload,
    };
  }

  const formData = new FormData();
  formData.append('nome_completo', payload.nomeCompleto);

  if (payload.dataNascimento) {
    formData.append('data_nascimento', payload.dataNascimento);
  }

  formData.append('cidade', payload.cidade);
  formData.append('estado', payload.estado);
  formData.append('email', payload.email);
  formData.append('email_principal', String(Boolean(payload.emailPrincipal)));
  formData.append('ddd', payload.ddd);
  formData.append('numero', payload.numero);
  formData.append('telefone_principal', String(Boolean(payload.telefonePrincipal)));
  formData.append('banco_talentos', String(Boolean(payload.bancoTalentos)));
  formData.append('nivel', payload.nivel);
  formData.append('aceite_termos', String(Boolean(payload.aceiteTermos)));
  formData.append('curriculo', payload.curriculo);

  if (payload.pretensaoSalarial !== undefined) {
    formData.append('pretensao_salarial', String(payload.pretensaoSalarial));
  }

  if (payload.aboutMe) {
    formData.append('about_me', payload.aboutMe);
  }

  if (payload.vagaId) {
    formData.append('id_vaga', String(payload.vagaId));
  }

  payload.skillIds.forEach((id) => formData.append('skill_ids', String(id)));

  const response = await fetch(`${API_URL}/candidaturas`, {
    method: 'POST',
    body: formData,
  });

  let body: any = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.detail || 'Falha ao enviar candidatura.');
  }

  return body;
}