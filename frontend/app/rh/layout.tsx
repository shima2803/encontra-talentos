import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { RhTopNav } from '@/components/rh/RhTopNav';
import { getCurrentEmpresa } from '@/lib/rh/auth';

export const dynamic = 'force-dynamic';

export default async function RhLayout({ children }: { children: React.ReactNode }) {
  // Pega o pathname injetado pelo middleware (next nao expoe via RSC).
  const pathname = headers().get('x-pathname') || '';
  const isLogin = pathname.startsWith('/rh/login');

  if (isLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50/60 via-white to-white">
        {children}
      </div>
    );
  }

  const empresa = await getCurrentEmpresa();
  if (!empresa) {
    redirect('/rh/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/40 via-slate-50 to-slate-50">
      <RhTopNav empresaNome={empresa.nome} />
      <main className="pb-12">{children}</main>
    </div>
  );
}
