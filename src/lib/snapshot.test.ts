import { describe, expect, it } from 'vitest';
import { createSnapshot, parseSnapshotFile, serializeSnapshot, validateSnapshot } from './snapshot';
import { member } from '../test/fixtures';
import { mapDtddResources } from '../api/mapper';

const fetchedAt = '2026-10-12T08:00:00.000Z';

describe('raw data snapshots', () => {
  it('round-trips the full response and unknown fields without auth state', () => {
    const payload = {
      value: [member(), { ...member({ id: 2, team: null }), futureField: { nested: [1, 2] } }],
      metadata: { revision: 7 },
    };
    const snapshot = createSnapshot(payload, fetchedAt);
    const serialized = serializeSnapshot({
      ...snapshot,
      token: 'secret-test',
      headers: { Authorization: 'secret-test' },
    } as typeof snapshot);
    expect(serialized).not.toContain('secret-test');
    expect(parseSnapshotFile(serialized)).toEqual(snapshot);
    expect(mapDtddResources(parseSnapshotFile(serialized).payload.value)).toHaveLength(1);
  });

  it('accepts native API responses with unknown retrieval date', () => {
    expect(parseSnapshotFile(JSON.stringify({ value: [] }))).toMatchObject({
      fetchedAt: null,
      importedAt: null,
      payload: { value: [] },
    });
  });

  it('preserves retrieval and import dates from a versioned export', () => {
    const snapshot = {
      ...createSnapshot({ value: [] }, fetchedAt),
      importedAt: '2026-10-12T09:00:00.000Z',
    };
    expect(parseSnapshotFile(serializeSnapshot(snapshot))).toEqual(snapshot);
  });

  it('accepts absent and nullable optional fields', () => {
    expect(() =>
      createSnapshot(
        { value: [member({ periods: null, team: null, timesheets: null }), {}] },
        fetchedAt,
      ),
    ).not.toThrow();
  });

  it.each([
    '{',
    '{}',
    '{"value":[null]}',
    '{"value":[{"periods":[null]}]}',
    '{"value":[{"periods":[{"capacity":{"schedule":{"items":[null]}}}]}]}',
    '{"value":[{"team":{"parent":[]}}]}',
    '{"value":[{"periods":[{"capacity":{"schedule":{"items":[{"assigned":{"days":"bad"}}]}}}]}]}',
  ])('rejects malformed data: %s', (contents) => {
    expect(() => parseSnapshotFile(contents)).toThrow();
  });

  it('rejects unsupported versions and invalid metadata', () => {
    const snapshot = createSnapshot({ value: [] }, fetchedAt);
    expect(() => validateSnapshot({ ...snapshot, version: 2 })).toThrow('version');
    expect(() => validateSnapshot({ ...snapshot, fetchedAt: 'yesterday' })).toThrow('dates');
    expect(() => validateSnapshot({ ...snapshot, importedAt: 42 })).toThrow('dates');
  });
});
