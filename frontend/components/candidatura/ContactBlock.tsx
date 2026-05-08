import { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { CandidaturaFormData } from '@/lib/validations/candidatura-schema';
import { sanitizeDigits } from '@/lib/form-utils';

interface Props {
  register: UseFormRegister<CandidaturaFormData>;
  watch: UseFormWatch<CandidaturaFormData>;
  setValue: UseFormSetValue<CandidaturaFormData>;
  errors: FieldErrors<CandidaturaFormData>;
}

export function ContactBlock({ register, watch, setValue, errors }: Props) {
  const emailPrincipal = !!watch('emailPrincipal');
  const telefonePrincipal = !!watch('telefonePrincipal');

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Input label="E-mail" type="email" placeholder="seuemail@exemplo.com" error={errors.email?.message} {...register('email')} />
        <div className="flex items-end">
          <Checkbox
            label="Este e meu e-mail principal"
            checked={emailPrincipal}
            onChange={(event) =>
              setValue('emailPrincipal', event.target.checked, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[180px,1fr]">
        <Input
          label="DDD"
          placeholder="47"
          maxLength={2}
          inputMode="numeric"
          error={errors.ddd?.message}
          {...register('ddd', {
            onChange: (event) => {
              event.target.value = sanitizeDigits(event.target.value).slice(0, 2);
            },
          })}
        />

        <Input
          label="Numero"
          placeholder="999999999"
          maxLength={9}
          inputMode="numeric"
          error={errors.numero?.message}
          {...register('numero', {
            onChange: (event) => {
              event.target.value = sanitizeDigits(event.target.value).slice(0, 9);
            },
          })}
        />
      </div>

      <Checkbox
        label="Este e meu telefone principal"
        checked={telefonePrincipal}
        onChange={(event) =>
          setValue('telefonePrincipal', event.target.checked, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
        }
        error={errors.telefonePrincipal?.message}
      />
    </div>
  );
}