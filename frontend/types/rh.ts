export interface Empresa {
  id_empresa: number;
  nome: string;
  nome_login: string;
  cnpj: string | null;
  bio: string | null;
  logo_url: string | null;
  site: string | null;
  email_contato: string | null;
  status: string;
  criado_em: string | null;
}

export interface LoginRequest {
  nome_login: string;
  senha: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in_hours: number;
  empresa: Empresa;
}

export interface SkillBrief {
  id_skill: number;
  nome_skill: string;
}

export interface VagaRh {
  id_vaga: number;
  titulo_vaga: string;
  area: string | null;
  nivel: string | null;
  descricao: string | null;
  status_vaga: string;
  data_publicacao: string | null;
  tipo_contrato: string | null;
  modelo_trabalho: string | null;
  localidade_cidade: string | null;
  localidade_estado: string | null;
  salario: string | null;
  salario_periodicidade: string | null;
  moeda: string | null;
  skills: SkillBrief[];
  total_candidaturas: number;
}

export interface CandidatoRh {
  id_candidatura: number;
  id_candidato: number;
  nome_completo: string;
  data_nascimento: string | null;
  cidade: string | null;
  estado: string | null;
  pretensao_salarial: string | null;
  email: string | null;
  ddd: string | null;
  telefone: string | null;
  score_aderencia: string | null;
  resumo_ia: string | null;
  parecer_ia: string | null;
  status_candidatura: string | null;
  data_candidatura: string | null;
}
