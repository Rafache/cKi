import { describe, expect, it } from 'vitest';
import { AbraxioApiError, parseMembersResponse } from './client';

describe('parseMembersResponse', () => {
  it('accepte une enveloppe Abraxio valide', () =>
    expect(parseMembersResponse({ value: [{ id: 1 }] })).toEqual([{ id: 1 }]));
  it('refuse une enveloppe invalide', () =>
    expect(() => parseMembersResponse({ items: [] })).toThrow(AbraxioApiError));
  it('refuse les entrées qui ne sont pas des objets', () =>
    expect(() => parseMembersResponse({ value: [null] })).toThrow(AbraxioApiError));
});
