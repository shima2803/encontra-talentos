import { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { CandidaturaFormData } from '@/lib/validations/candidatura-schema';
import { Vaga } from '@/types/vaga';

interface Props {
  register: UseFormRegister<CandidaturaFormData>;
  watch: UseFormWatch<CandidaturaFormData>;
  errors: FieldErrors<CandidaturaFormData>;
  vagas: Vaga[];
}

export function JobBlock({ register, watch, errors, vagas }: Props) {
  const bancoTalentos = watch('bancoTalentos');

  return (
    <div className="space-y-6">
      <Checkbox
        label="Quero entrar no banco de talentos"
        description="Marque esta opcao caso nao queira se candidatar a uma vaga especifica agora."
        {...register('bancoTalentos')}
      />

      <div className={bancoTalentos ? 'opacity-60' : ''}>
        <Select label="Vaga desejada" disabled={bancoTalentos} error={errors.vagaId?.message} {...register('vagaId')}>
          <option value="">Selecione uma vaga</option>
          {vagas.map((vaga) => (
            <option key={vaga.id} value={vaga.id}>
              {vaga.titulo}
            </option>
          ))}
        </Select>
      </div>

      <Select label="Nivel profissional" error={errors.nivel?.message} {...register('nivel')}>
        <option value="">Selecione o nivel</option>
        <option value="Junior">Junior</option>
        <option value="Pleno">Pleno</option>
        <option value="Senior">Senior</option>
      </Select>
    </div>
  );
}
