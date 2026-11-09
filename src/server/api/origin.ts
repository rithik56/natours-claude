import 'server-only';
import type { NextRequest } from 'next/server';

// Throwaway RED stub: allows every origin and sends no CORS headers.
export function isAllowedOrigin(origin: string | null): boolean {
  void origin;
  return true;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  void origin;
  return {};
}

export function handlePreflight(request: NextRequest): Response {
  void request;
  return new Response(null, { status: 204 });
}
