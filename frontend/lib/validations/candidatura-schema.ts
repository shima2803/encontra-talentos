import { z } from 'zod';
import { parseCurrencyToNumber } from '@/lib/form-utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const nameRegex = /^[A-Za-zÀ-ÿ' -]+$/;
const cityRegex = /^[A-Za-zÀ-ÿ' -]+$/;

export const candidaturaSchema = z
  .object({
    nomeCompleto: z
      .string()
      .trim()
      .min(3, 'Informe seu nome completo.')
      .refine((value) => nameRegex.test(value), 'O nome deve conter apenas letras.'),

    dataNascimento: z
      .string()
      .optional()
      .refine((value) => !value || /^\d{2}\/\d{2}\/\d{4}$/.test(value), 'Informe uma data valida.'),

    cidade: z
      .string()
      .trim()
      .min(2, 'Informe sua cidade.')
      .refine((value) => cityRegex.test(value), 'A cidade deve conter apenas letras.'),

    estado: z
      .string()
      .trim()
      .min(2, 'Informe o estado.')
      .max(2, 'Use a sigla do estado.')
      .refine((value) => /^[A-Za-z]{2}$/.test(value), 'Use uma UF valida com 2 letras.'),

    pretensaoSalarial: z
      .string()
      .optional()
      .refine((value) => !value || parseCurrencyToNumber(value) !== undefined, 'Informe um valor valido.'),

    aboutMe: z.string().trim().max(1000, 'Use no maximo 1000 caracteres.').optional(),

    email: z.string().trim().email('Informe um e-mail valido.'),

    emailPrincipal: z.boolean().default(false),

    ddd: z.string().regex(/^\d{2}$/, 'Informe um DDD valido com 2 numeros.'),

    numero: z.string().regex(/^\d{4,5}-?\d{4}$/, 'Informe um numero valido com 8 ou 9 numeros.'),

    telefonePrincipal: z.boolean().default(false),

    vagaId: z.string().optional(),

    bancoTalentos: z.boolean().default(false),

    nivel: z.enum(['estagio', 'junior', 'pleno', 'senior', 'especialista'], {
      errorMap: () => ({ message: 'Selecione o nivel desejado.' }),
    }),

    skillIds: z.array(z.number()).min(1, 'Selecione pelo menos uma skill.'),

    aceiteTermos: z.boolean().refine((value) => value === true, {
      message: 'Voce precisa aceitar os termos para continuar.',
    }),

    curriculo: z
      .custom<File>((value) => value instanceof File, 'Anexe seu curriculo.')
      .refine((file) => file.size <= MAX_FILE_SIZE, 'O arquivo deve ter no maximo 10 MB.')
      .refine((file) => ALLOWED_TYPES.includes(file.type), 'Formato nao permitido. Use PDF, DOCX ou TXT.'),
  })
  .superRefine((data, ctx) => {
    if (!data.bancoTalentos && !data.vagaId) {
      ctx.addIssue({
        path: ['vagaId'],
        code: z.ZodIssueCode.custom,
        message: 'Selecione uma vaga ou marque banco de talentos.',
      });
    }
  });

export type CandidaturaFormData = z.infer<typeof candidaturaSchema>;