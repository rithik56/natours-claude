import { describe, expect, it } from 'vitest';
import { safeNext } from '@/server/redirects';

describe('safeNext', () => {
  it.each(['/me', '/tour/ladakh-high-passes?x=1', '/bookings#upcoming', '/'])(
    '[S22] keeps the same-site path %s',
    (path) => {
      expect(safeNext(path)).toBe(path);
    },
  );

  it.each([
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash after the slash', '/\\evil.example'],
    ['an absolute https URL', 'https://evil.example'],
    ['a javascript URL', 'javascript:alert(1)'],
    ['three leading slashes', '///evil.example'],
    ['a path with a backslash later on', '/me\\..\\evil'],
    ['a path with a tab before a second slash', '/\t/evil.example'],
    ['a path with a newline', '/me\nSet-Cookie: x=1'],
    ['a path ending in a null character', '/me\u0000'],
    ['a path with a delete character', '/me\u007f'],
    ['a relative path with no slash', 'me'],
    ['the empty string', ''],
  ])('[S22] falls back to / for %s', (_label, value) => {
    expect(safeNext(value)).toBe('/');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
    ['an array', ['/me']],
    ['an object', { path: '/me' }],
  ])('[S22] falls back to / for %s', (_label, value) => {
    expect(safeNext(value)).toBe('/');
  });

  it('[S22] accepts a path of 2048 characters and rejects 2049', () => {
    const longest = `/${'a'.repeat(2047)}`;
    expect(safeNext(longest)).toBe(longest);
    expect(safeNext(`${longest}a`)).toBe('/');
  });
});
