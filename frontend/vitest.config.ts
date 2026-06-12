import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/components/game/**/*.{ts,tsx}',
        'src/components/ui/**/*.{ts,tsx}',
        'src/shared/lib/**/*.ts',
        'src/shared/session/**/*.ts',
      ],
      exclude: ['src/**/*.spec.{ts,tsx}'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    }
  }
});
