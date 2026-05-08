import { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { CityStateAutocomplete } from '@/components/candidatura/CityStateAutocomplete';
import { CandidaturaFormData } from '@/lib/validations/candidatura-schema';
import { formatCurrencyInput, sanitizePersonName } from '@/lib/form-utils';

interface Props {
  register: UseFormRegister<CandidaturaFormData>;
  watch: UseFormWatch<CandidaturaFormData>;
  setValue: UseFormSetValue<CandidaturaFormData>;
  errors: FieldErrors<CandidaturaFormData>;
}

export function PersonalInfoBlock({ register, watch, setValue, errors }: Props) {
  const salaryValue = watch('pretensaoSalarial') ?? '';
  const cidade = watch('cidade') ?? '';
  const estado = watch('estado') ?? '';

  const salaryField = register('pretensaoSalarial');

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Input
        label="Nome completo"
        placeholder="Seu nome completo"
        error={errors.nomeCompleto?.message}
        {...register('nomeCompleto', {
          onChange: (event) => {
            event.target.value = sanitizePersonName(event.target.value);
          },
        })}
      />

      <Input label="Data de nascimento" type="date" error={errors.dataNascimento?.message} {...register('dataNascimento')} />

      <Input
        label="Pretensao salarial"
        placeholder="R$ 0,00"
        inputMode="numeric"
        error={errors.pretensaoSalarial?.message as string | undefined}
        name={salaryField.name}
        ref={salaryField.ref}
        onBlur={salaryField.onBlur}
        value={salaryValue}
        onChange={(event) => {
          setValue('pretensaoSalarial', formatCurrencyInput(event.target.value), {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }}
      />

      <div className="md:col-span-2">
        <CityStateAutocomplete
          cidade={cidade}
          estado={estado}
          cidadeError={errors.cidade?.message}
          estadoError={errors.estado?.message}
          onCidadeChange={(value) => setValue('cidade', value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
          onEstadoChange={(value) => setValue('estado', value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
        />
      </div>

      <div className="md:col-span-2">
        <Textarea
          label="Sobre voce"
          placeholder="Escreva um breve resumo profissional"
          error={errors.aboutMe?.message}
          {...register('aboutMe')}
        />
      </div>
    </div>
  );
}