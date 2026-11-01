import type { z } from 'zod';

// Provider-neutral shapes. The agent loop and AI helpers only see these; adapters translate.
export interface ToolSpec { name: string; description: string; parameters: Record<string, unknown> }
export interface ToolCall { id: string; name: string; input: unknown }
export interface ToolResult { id: string; content: string; isError?: boolean }
export interface Usage { inputTokens: number; outputTokens: number }

/** `raw` keeps the provider's own assistant message so it is replayed unchanged (e.g. Claude's thinking blocks). */
export type Turn =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; toolCalls?: ToolCall[]; raw?: unknown }
  | { role: 'tool'; results: ToolResult[] };

import type { FoundProfile } from './profiles';

export interface ChatResult { text: string; toolCalls: ToolCall[]; refusal: boolean; usage: Usage; raw: unknown }

export interface LlmProvider {
  model: string;
  chat(opts: { system: string; tools: ToolSpec[]; turns: Turn[] }): Promise<ChatResult>;
  json<S extends z.ZodObject>(opts: { schema: S; system: string; prompt: string; maxTokens: number }): Promise<{ data: z.infer<S>; usage: Usage }>;
  /** Provider-hosted web search for LinkedIn profiles, used when no SERPER_API_KEY is set. */
  findProfiles(query: string): Promise<{ profiles: FoundProfile[]; usage: Usage }>;
}
