/**
 * Tests for NotesContext loading state behavior.
 * Validates that computedIsLoading propagates correctly on org change.
 */

// Pure logic tests — no React rendering needed for state machine behavior

interface FetchKey {
  orgId: string;
  useCloud: boolean;
  useLocal: boolean;
}

function buildFetchKey({ orgId, useCloud, useLocal }: FetchKey): string {
  return `${orgId}|cloud:${useCloud}|local:${useLocal}`;
}

function computeIsLoading(opts: {
  initialLoadDone: boolean;
  lastFetchKey: string;
  currentFetchKey: string;
  isLoading: boolean;
  orgLoading: boolean;
}): boolean {
  const isOrgChanged = opts.lastFetchKey !== opts.currentFetchKey;
  return !opts.initialLoadDone || isOrgChanged || opts.isLoading || opts.orgLoading;
}

describe('NotesContext - computedIsLoading', () => {
  const personalKey = buildFetchKey({ orgId: 'personal', useCloud: true, useLocal: false });
  const org1Key = buildFetchKey({ orgId: 'org-123', useCloud: true, useLocal: false });

  it('is true on initial load (before first fetch completes)', () => {
    expect(computeIsLoading({
      initialLoadDone: false,
      lastFetchKey: '',
      currentFetchKey: personalKey,
      isLoading: false,
      orgLoading: false,
    })).toBe(true);
  });

  it('is false after successful initial load with same org', () => {
    expect(computeIsLoading({
      initialLoadDone: true,
      lastFetchKey: personalKey,
      currentFetchKey: personalKey,
      isLoading: false,
      orgLoading: false,
    })).toBe(false);
  });

  it('is true when org changes (fetchKey mismatch)', () => {
    expect(computeIsLoading({
      initialLoadDone: true,
      lastFetchKey: personalKey,   // previous org
      currentFetchKey: org1Key,    // new org selected
      isLoading: false,
      orgLoading: false,
    })).toBe(true);
  });

  it('is true while orgLoading = true (org list not ready)', () => {
    expect(computeIsLoading({
      initialLoadDone: true,
      lastFetchKey: personalKey,
      currentFetchKey: personalKey,
      isLoading: false,
      orgLoading: true,
    })).toBe(true);
  });

  it('is true when isLoading state is true (fetch in-flight)', () => {
    expect(computeIsLoading({
      initialLoadDone: true,
      lastFetchKey: org1Key,
      currentFetchKey: org1Key,
      isLoading: true,
      orgLoading: false,
    })).toBe(true);
  });

  it('is false after org switch completes successfully', () => {
    expect(computeIsLoading({
      initialLoadDone: true,
      lastFetchKey: org1Key,   // fetch completed for new org
      currentFetchKey: org1Key,
      isLoading: false,
      orgLoading: false,
    })).toBe(false);
  });
});

describe('NotesContext - fetchKey deduplication', () => {
  it('same org, same mode → same key (no duplicate fetch)', () => {
    const k1 = buildFetchKey({ orgId: 'org-123', useCloud: true, useLocal: false });
    const k2 = buildFetchKey({ orgId: 'org-123', useCloud: true, useLocal: false });
    expect(k1).toBe(k2);
  });

  it('different org → different key (triggers new fetch)', () => {
    const k1 = buildFetchKey({ orgId: 'org-123', useCloud: true, useLocal: false });
    const k2 = buildFetchKey({ orgId: 'org-456', useCloud: true, useLocal: false });
    expect(k1).not.toBe(k2);
  });

  it('mode change → different key (triggers new fetch)', () => {
    const cloud = buildFetchKey({ orgId: 'personal', useCloud: true, useLocal: false });
    const local = buildFetchKey({ orgId: 'personal', useCloud: false, useLocal: true });
    expect(cloud).not.toBe(local);
  });

  it('personal vs org → different key', () => {
    const personal = buildFetchKey({ orgId: 'personal', useCloud: true, useLocal: false });
    const org = buildFetchKey({ orgId: 'org-123', useCloud: true, useLocal: false });
    expect(personal).not.toBe(org);
  });
});
