// Vitest-only stub for the `server-only` package. That package's default
// export unconditionally throws — it only becomes a no-op under Next.js's
// special "react-server" webpack resolution condition, which Vitest/plain
// Node doesn't set. Aliased in vitest.config.ts so lib modules that import
// "server-only" (correctly, for the real app) can still be unit-tested.
export {};
