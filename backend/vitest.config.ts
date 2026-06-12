import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/infrastructure/database/seeds/board-seed.ts',
        'src/modules/**/*.service.ts',
        'src/modules/realtime/realtime-state.store.ts',
      ],
      exclude: ['src/**/*.spec.ts'],
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    }
  }
});
