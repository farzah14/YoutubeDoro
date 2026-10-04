import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest, NextResponse } from 'next/server';
import { updateSessionCookies } from '../lib/supabase/sessionCookies';

test('session updates retain every cookie chunk and verifier deletion', () => {
  const request = new NextRequest('https://example.com/');
  const response = updateSessionCookies(request, NextResponse.next({ request }), [
    { name: 'sb-session.0', value: 'first', options: { httpOnly: true, path: '/' } },
    { name: 'sb-session.1', value: 'second', options: { httpOnly: true, path: '/' } },
    { name: 'sb-code-verifier', value: '', options: { maxAge: 0, path: '/' } },
  ]);
  assert.equal(response.cookies.get('sb-session.0')?.value, 'first');
  assert.equal(response.cookies.get('sb-session.1')?.value, 'second');
  assert.equal(response.cookies.get('sb-code-verifier')?.maxAge, 0);
  assert.equal(request.cookies.get('sb-session.0')?.value, 'first');
  assert.equal(request.cookies.get('sb-session.1')?.value, 'second');
});

test('later cookie batches preserve cookies written by earlier batches', () => {
  const request = new NextRequest('https://example.com/');
  let response = NextResponse.next({ request });
  response = updateSessionCookies(request, response, [{ name: 'sb-session.0', value: 'first', options: { path: '/' } }]);
  response = updateSessionCookies(request, response, [{ name: 'sb-session.1', value: 'second', options: { path: '/' } }]);
  assert.equal(response.cookies.get('sb-session.0')?.value, 'first');
  assert.equal(response.cookies.get('sb-session.1')?.value, 'second');
});
