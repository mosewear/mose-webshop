// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { expect, it } from 'vitest'

it('retains a warm catalogue on failed Next revalidation, rejects a cold failure and recovers', () => {
  // Run the installed Next cache implementation in its real AsyncLocalStorage
  // context, isolated from tests that mock next/cache. No dev server/.next writes.
  const result = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { AsyncLocalStorage } from 'node:async_hooks';
    globalThis.AsyncLocalStorage = AsyncLocalStorage;
    const { unstable_cache } = await import('next/cache.js');
    const { workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external.js');
    let stored = null, stale = false, fail = false, current = 'original', writes = 0;
    const incrementalCache = {
      generateCacheKey: async () => 'test-key',
      get: async () => stored ? { value: stored, isStale: stale } : null,
      set: async (_, value) => { stored = value; writes++; },
    };
    const cached = unstable_cache(async () => {
      if (fail) throw Error('database unavailable');
      return { products: [current] };
    }, ['isolated-public-catalog-runtime'], { revalidate: 60, tags: ['public-catalog'] });
    async function read() {
      const store = { route: '/nl/shop', incrementalCache, nextFetchId: 1, isStaticGeneration: false };
      const value = await workAsyncStorage.run(store, cached);
      await Promise.all(Object.values(store.pendingRevalidates ?? {}));
      return value;
    }
    const first = await read();
    stale = true; fail = true;
    const originalError = console.error; console.error = () => {};
    const warm = await read(); console.error = originalError;
    const writesAfterFailure = writes;
    fail = false; current = 'updated';
    await read(); stale = false;
    const recovered = await read();
    stored = null; fail = true;
    let coldRejected = false;
    try { await read(); } catch { coldRejected = true; }
    console.log(JSON.stringify({ first, warm, writesAfterFailure, recovered, coldRejected }));
  `], { encoding: 'utf8' })
  expect(JSON.parse(result)).toEqual({
    first: { products: ['original'] }, warm: { products: ['original'] },
    writesAfterFailure: 1, recovered: { products: ['updated'] }, coldRejected: true,
  })
})
