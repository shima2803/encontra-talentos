/**
 * POST /api/rh/login
 * Recebe nome_login + senha do cliente, faz login no FastAPI
 * e seta um cookie httpOnly com o JWT.
 *
 * Por que httpOnly: JS do navegador nao acessa, entao XSS nao rouba o token.
 */
import { NextResponse } from 'next/server';

import { RH_COOKIE_NAME } from '@/lib/rh/auth';
import type { LoginResponse } from '@/types/rh';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  let body: { nome_login?: string; senha?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo invalido' }, { status: 400 });
  }

  const nome_login = (body.nome_login || '').trim();
  const senha = body.senha || '';
  if (!nome_login || !senha) {
    return NextResponse.json({ error: 'Informe usuario e senha.' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/rh/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_login, senha }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { error: 'API indisponivel. Tente novamente em instantes.' },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    let detail = 'Credenciais invalidas';
    try {
      const data = await upstream.json();
      if (data?.detail) detail = String(data.detail);
    } catch {
      // ignora
    }
    return NextResponse.json({ error: detail }, { status: upstream.status });
  }

  const data = (await upstream.json()) as LoginResponse;
  const maxAge = (data.expires_in_hours || 8) * 60 * 60;

  const response = NextResponse.json({ empresa: data.empresa });
  response.cookies.set({
    name: RH_COOKIE_NAME,
    value: data.access_token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  });
  return response;
}
