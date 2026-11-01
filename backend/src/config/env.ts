import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  MONGO_URL: z.string().default('mongodb://localhost:27017/recruiter'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Which LLM runs the agent and every AI helper: 'anthropic' or 'openai'. Only that provider's key is needed.
  LLM_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5'),
  // Optional USD per 1M tokens, overriding the built-in price table for cost tracking.
  LLM_INPUT_PRICE: z.coerce.number().optional(),
  LLM_OUTPUT_PRICE: z.coerce.number().optional(),
  SERPER_API_KEY: z.string().optional(),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('Recruiter <recruiter@example.com>'),
  // One outreach "day" in ms. Lower it (e.g. 60000) to demo Day 3 / Day 7 follow-ups in minutes.
  OUTREACH_DAY_MS: z.coerce.number().default(86_400_000),
  DAILY_SEND_LIMIT: z.coerce.number().default(50),
});

export const env = schema.parse(process.env);
