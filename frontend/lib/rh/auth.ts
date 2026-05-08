/**
 * Helpers de auth para o portal RH.
 * - Cookie httpOnly armazena o JWT do FastAPI
 * - decodeJwtPayload nao valida assinatura (so checa exp); a validacao real
 *   acontece no backend a cada chamada autenticada.
 */
import { cookies } from 'next/headers';

import type { Empresa } from '@/types/rh';

export const RH_COOKIE_NAME = 'rh_token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  type?: string;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // base64url -> base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, leewaySeconds = 0): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSec - leewaySeconds;
}

/**
 * Le o token do cookie. So funciona em Server Components / Route Handlers.
 */
export function getRhToken(): string | null {
  const c = cookies().get(RH_COOKIE_NAME);
  return c?.value ?? null;
}

/**
 * Busca a empresa logada chamando GET /rh/me no FastAPI.
 * Retorna null se nao autenticado / token expirado / API offline.
 */
export async function getCurrentEmpresa(): Promise<Empresa | null> {
  const token = getRhToken();
  if (!token || isJwtExpired(token)) return null;

  try {
    const res = await fetch(`${API_URL}/rh/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as Empresa;
  } catch {
    return null;
  }
}
