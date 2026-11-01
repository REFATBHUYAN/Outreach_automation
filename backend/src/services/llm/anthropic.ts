import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { LlmProvider, Turn } from './types';
import { parseProfiles, PROFILE_PROMPT } from './profiles';

export function toAnthropicMessages(turns: Turn[]): Anthropic.MessageParam[] {
  return turns.map((t): Anthropic.MessageParam => {
    if (t.role === 'user') return { role: 'user', content: t.text };
    if (t.role === 'assistant') return { role: 'assistant', content: (t.raw as Anthropic.ContentBlockParam[] | undefined) ?? t.text };
    return { role: 'user', content: t.results.map((r) => ({ type: 'tool_result' as const, tool_use_id: r.id, content: r.content, is_error: r.isError })) };
  });
}

/** URLs from web_search_tool_result blocks. An error result carries an object, not a list. */
export const searchUrls = (content: Anthropic.ContentBlock[]): string[] =>
  content.flatMap((b) => (b.type === 'web_search_tool_result' && Array.isArray(b.content) ? b.content.map((r) => r.url) : []));

export function anthropicProvider(apiKey: string, model: string): LlmProvider {
  const client = new Anthropic({ apiKey });
  const usage = (u: Anthropic.Usage) => ({ inputTokens: u.input_tokens, outputTokens: u.output_tokens });
  return {
    model,
    async chat({ system, tools, turns }) {
      const res = await client.messages.create({
        model, max_tokens: 16000, system, messages: toAnthropicMessages(turns),
        tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters as Anthropic.Tool.InputSchema })),
        output_config: { effort: 'medium' },
      });
      return {
        text: res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim(),
        toolCalls: res.content.flatMap((b) => (b.type === 'tool_use' ? [{ id: b.id, name: b.name, input: b.input }] : [])),
        refusal: res.stop_reason === 'refusal',
        usage: usage(res.usage),
        raw: res.content,
      };
    },
    async json({ schema, system, prompt, maxTokens }) {
      const res = await client.messages.parse({
        model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }],
        output_config: { effort: 'low', format: zodOutputFormat(schema) },
      });
      if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error(`LLM returned no structured output (${res.stop_reason})`);
      return { data: res.parsed_output, usage: usage(res.usage) };
    },
    async findProfiles(query) {
      const res = await client.messages.create({
        model, max_tokens: 16000, output_config: { effort: 'low' },
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3, allowed_domains: ['linkedin.com'] }],
        messages: [{ role: 'user', content: PROFILE_PROMPT(query) }],
      });
      const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
      return { profiles: parseProfiles(text, searchUrls(res.content)), usage: usage(res.usage) };
    },
  };
}
