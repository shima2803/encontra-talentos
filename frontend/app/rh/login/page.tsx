'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Lock, User } from 'lucide-react';

import { Button } from '@/components/ui/Button';

interface LoginForm {
  nome_login: string;
  senha: string;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/rh/painel';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      const res = await fetch('/api/rh/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(body?.error || 'Falha ao entrar.');
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setServerError('Nao foi possivel conectar. Tente novamente.');
    }
  });

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Lock size={22} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Portal RH</h1>
          <p className="mt-1 text-sm text-slate-500">Acesse o painel da sua empresa</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Usuario</span>
            <div className="flex items-center rounded-2xl border border-slate-300 bg-white focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100">
              <span className="pl-4 text-slate-400" aria-hidden="true">
                <User size={18} />
              </span>
              <input
                type="text"
                autoComplete="username"
                aria-invalid={!!errors.nome_login}
                className="w-full rounded-2xl bg-transparent px-3 py-3 text-slate-900 outline-none"
                {...register('nome_login', { required: 'Informe seu usuario.' })}
              />
            </div>
            {errors.nome_login && (
              <span className="text-sm text-rose-600" role="alert">
                {errors.nome_login.message}
              </span>
            )}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Senha</span>
            <div className="flex items-center rounded-2xl border border-slate-300 bg-white focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100">
              <span className="pl-4 text-slate-400" aria-hidden="true">
                <Lock size={18} />
              </span>
              <input
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.senha}
                className="w-full rounded-2xl bg-transparent px-3 py-3 text-slate-900 outline-none"
                {...register('senha', { required: 'Informe sua senha.' })}
              />
            </div>
            {errors.senha && (
              <span className="text-sm text-rose-600" role="alert">
                {errors.senha.message}
              </span>
            )}
          </label>

          {serverError && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {serverError}
            </div>
          )}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Sua empresa ainda nao tem acesso?{' '}
          <a href="/contato" className="font-semibold text-brand-600 hover:underline">
            Fale com a gente
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
