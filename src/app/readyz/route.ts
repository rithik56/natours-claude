import { pingDb } from '@/server/db';

export async function GET(): Promise<Response> {
  const up = await pingDb();
  return Response.json(
    { status: up ? 'ready' : 'not-ready', checks: { mongo: up ? 'up' : 'down' } },
    { status: up ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
