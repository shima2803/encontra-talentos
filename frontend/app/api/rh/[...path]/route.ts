/**
 * Catch-all proxy: /api/rh/<qualquer-coisa> -> FastAPI /rh/<qualquer-coisa>
 * Le o cookie httpOnly rh_token e injeta como Authorization Bearer.
 * Mantem o token isolado do JS do cliente.
 *
 * Atencao: rotas mais especificas (/api/rh/login, /api/rh/logout) tem
 * precedencia sobre esta no Next.js, entao nao colidem.
 */
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const COOKIE_NAME = 'rh_token';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

async function proxy(
  req: NextRequest,
  ctx: { params: { path?: string[] } },
): Promise<NextResponse> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
  }

  const path = (ctx.params.path || []).join('/');
  const search = req.nextUrl.search || '';
  const url = `${API_URL}/rh/${path}${search}`;

  const forwardedHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const incomingType = req.headers.get('content-type');
  if (incomingType) forwardedHeaders['Content-Type'] = incomingType;

  const init: RequestInit = {
    method: req.method,
    headers: forwardedHeaders,
    cache: 'no-store',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch {
    return NextResponse.json(
      { error: 'API indisponivel' },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  // 204 nao tem body
  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, { status: upstream.status, headers: responseHeaders });
}

export async function GET(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx);
}
