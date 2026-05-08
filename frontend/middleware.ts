/**
 * Protege todas as rotas /rh/* do portal RH.
 * - Sem cookie -> redireciona para /rh/login
 * - Cookie com JWT expirado -> limpa cookie + redireciona para /rh/login
 * - /rh/login eh sempre acessivel
 *
 * NAO valida assinatura do JWT (so o backend tem o JWT_SECRET).
 * Aqui so checamos exp para evitar redirect quando o token ainda eh valido.
 */
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'rh_token';

interface JwtPayload {
  exp?: number;
}

function decodePayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodePayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp <= Math.floor(Date.now() / 1000);
}

function withPathnameHeader(req: NextRequest, response?: NextResponse): NextResponse {
  // Injeta x-pathname no header da request para Server Components/layouts
  // descobrirem em qual rota estao (Next.js nao expoe pathname em RSC).
  const headers = new Headers(req.headers);
  headers.set('x-pathname', req.nextUrl.pathname);

  if (response) {
    // Para redirects, nao precisamos forwarding de headers - so retornamos.
    return response;
  }
  return NextResponse.next({ request: { headers } });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /rh/login eh publica
  if (pathname === '/rh/login' || pathname.startsWith('/rh/login/')) {
    return withPathnameHeader(req);
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || isExpired(token)) {
    const loginUrl = new URL('/rh/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    const res = NextResponse.redirect(loginUrl);
    if (token) {
      res.cookies.set({
        name: COOKIE_NAME,
        value: '',
        path: '/',
        maxAge: 0,
      });
    }
    return res;
  }

  return withPathnameHeader(req);
}

export const config = {
  matcher: ['/rh/:path*'],
};
