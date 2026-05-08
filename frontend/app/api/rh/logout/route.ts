/**
 * POST /api/rh/logout - apenas limpa o cookie de sessao do RH.
 * Nao invalida o JWT no backend (JWT eh stateless); a expiracao
 * natural cuida disso. Para logout instantaneo precisariamos de
 * blocklist no backend, fora do escopo agora.
 */
import { NextResponse } from 'next/server';

import { RH_COOKIE_NAME } from '@/lib/rh/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: RH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
