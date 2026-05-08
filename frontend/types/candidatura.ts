export interface CandidaturaPayload {
  nomeCompleto: string;
  dataNascimento?: string;
  cidade: string;
  estado: string;
  pretensaoSalarial?: number;
  aboutMe?: string;
  email: string;
  emailPrincipal: boolean;
  ddd: string;
  numero: string;
  telefonePrincipal: boolean;
  vagaId?: number;
  bancoTalentos: boolean;
  nivel: 'estagio' | 'junior' | 'pleno' | 'senior' | 'especialista';
  skillIds: number[];
  aceiteTermos: boolean;
  curriculo: File;
}
