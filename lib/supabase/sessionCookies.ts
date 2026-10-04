import type { CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export function updateSessionCookies(
  request: NextRequest,
  previousResponse: NextResponse,
  cookies: { name: string; value: string; options: CookieOptions }[],
) {
  for (const { name, value } of cookies) request.cookies.set(name, value);
  const response = NextResponse.next({ request });
  for (const cookie of previousResponse.cookies.getAll()) response.cookies.set(cookie);
  for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
  return response;
}
