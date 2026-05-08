import { Button } from '@/components/ui/Button';

export function SubmitBar({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Finalizar candidatura</h3>
        <p className="text-sm text-slate-500">Revise as informacoes e envie seu formulario.</p>
      </div>
      <Button type="submit" isLoading={isSubmitting} variant="primary" className="min-w-[220px] shadow-sm">
        Enviar candidatura
      </Button>
    </div>
  );
}
