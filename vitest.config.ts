import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    // MongoMemoryServer may need to download/start its binary on first run,
    // which can exceed the default 10s hook timeout.
    hookTimeout: 120000,
    // Ignore stale test copies inside git worktrees under .claude/.
    exclude: ['**/node_modules/**', '**/.claude/**'],
  },
})
