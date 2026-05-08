import { FieldErrors } from 'react-hook-form';
import { ChangeEvent } from 'react';
import { CandidaturaFormData } from '@/lib/validations/candidatura-schema';

interface Props {
  fileName?: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  errors: FieldErrors<CandidaturaFormData>;
}

export function ResumeUploadBlock({ fileName, onFileChange, errors }: Props) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">Curriculo</label>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-brand-600 hover:bg-brand-50">
        <span className="text-base font-medium text-slate-800">Clique para anexar seu curriculo</span>
        <span className="mt-2 text-sm text-slate-500">Formatos aceitos: PDF, DOCX e TXT. Tamanho maximo: 10 MB.</span>
        <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={onFileChange} />
      </label>
      {fileName ? <p className="text-sm text-slate-600">Arquivo selecionado: {fileName}</p> : null}
      {errors.curriculo?.message ? <p className="text-sm text-rose-600">{errors.curriculo.message as string}</p> : null}
    </div>
  );
}
