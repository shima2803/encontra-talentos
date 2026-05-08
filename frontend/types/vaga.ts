export type Nivel = 'Junior' | 'Pleno' | 'Senior' | 'Geral';

export type FonteVaga = 'interna' | 'adzuna' | 'remotive' | 'arbeitnow' | string;

export type TipoContrato = 'CLT' | 'PJ' | 'ESTAGIO' | 'JOVEM_APRENDIZ' | 'CORPORATE';
export type ModeloTrabalho = 'PRESENCIAL' | 'HIBRIDO' | 'ONLINE';

export interface Vaga {
  id: number | string;
  titulo: string;
  area?: string | null;
  nivel?: Nivel | string | null;
  modeloTrabalho?: 'Presencial' | 'Hibrido' | 'Remoto' | string | null;
  localidade?: string | null;
  descricao?: string | null;
  status_vaga?: string | null;
  fonte?: FonteVaga;
  urlOrigem?: string | null;
  empresa?: string | null;
  tipoContrato?: TipoContrato | string | null;
  salario?: number | null;
  salarioPeriodicidade?: 'MENSAL' | 'HORA' | 'ANUAL' | string | null;
  moeda?: string | null;
}
