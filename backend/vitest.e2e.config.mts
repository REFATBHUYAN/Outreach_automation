import { defineConfig } from 'vitest/config';

// Real Mongo + Redis (docker-compose.infra.yml), separate DB / Redis db so dev data is untouched.
// Only the LLM is faked, so the run is deterministic and needs no API key.
export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    env: {
      MONGO_URL: process.env.E2E_MONGO_URL ?? 'mongodb://localhost:27017/recruiter_e2e',
      REDIS_URL: process.env.E2E_REDIS_URL ?? 'redis://localhost:6379/1',
      LLM_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: 'test',
      SERPER_API_KEY: '',
      SMTP_URL: '',
      OUTREACH_DAY_MS: '3000',
    },
  },
});
