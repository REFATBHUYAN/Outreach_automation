import OpenAI from 'openai';
import { z } from 'zod';
import type { LlmProvider, Turn } from './types';
import { parseProfiles, PROFILE_PROMPT } from './profiles';

type Msg = OpenAI.Chat.ChatCompletionMessageParam;

export function toOpenAIMessages(system: string, turns: Turn[]): Msg[] {
  return [
    { role: 'system', content: system },
    ...turns.flatMap((t): Msg[] => {
      if (t.role === 'user') return [{ role: 'user', content: t.text }];
      if (t.role === 'assistant') return [(t.raw as Msg | undefined) ?? { role: 'assistant', content: t.text }];
      return t.results.map((r) => ({ role: 'tool' as const, tool_call_id: r.id, content: r.isError ? `Error: ${r.content}` : r.content }));
    }),
  ];
}

/** Every URL the web search actually returned: search-call sources plus message citations. */
export function responseSourceUrls(output: OpenAI.Responses.ResponseOutputItem[]): string[] {
  return output.flatMap((item) => {
    if (item.type === 'web_search_call') return item.action?.type === 'search' ? (item.action.sources ?? []).map((s) => s.url) : [];
    if (item.type === 'message')
      return item.content.flatMap((c) => (c.type === 'output_text' ? c.annotations.flatMap((a) => (a.type === 'url_citation' ? [a.url] : [])) : []));
    return [];
  });
}

const parseArgs = (s: string) => { try { return JSON.parse(s); } catch { return { _invalidJson: s }; } };

export function openaiProvider(apiKey: string, model: string): LlmProvider {
  const client = new OpenAI({ apiKey });
  const usage = (u?: OpenAI.CompletionUsage) => ({ inputTokens: u?.prompt_tokens ?? 0, outputTokens: u?.completion_tokens ?? 0 });
  return {
    model,
    async chat({ system, tools, turns }) {
      const res = await client.chat.completions.create({
        model, max_completion_tokens: 16000, messages: toOpenAIMessages(system, turns),
        tools: tools.map((t) => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.parameters } })),
      });
      const msg = res.choices[0].message;
      return {
        text: msg.content?.trim() ?? '',
        toolCalls: (msg.tool_calls ?? []).flatMap((c) => (c.type === 'function' ? [{ id: c.id, name: c.function.name, input: parseArgs(c.function.arguments) }] : [])),
        refusal: !!msg.refusal,
        usage: usage(res.usage),
        raw: msg,
      };
    },
    async json({ schema, system, prompt, maxTokens }) {
      const { $schema: _, ...jsonSchema } = z.toJSONSchema(schema);
      const res = await client.chat.completions.create({
        model, max_completion_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        response_format: { type: 'json_schema', json_schema: { name: 'output', schema: jsonSchema } },
      });
      const content = res.choices[0].message.content;
      if (!content) throw new Error(`LLM returned no structured output (${res.choices[0].finish_reason})`);
      return { data: schema.parse(JSON.parse(content)), usage: usage(res.usage) };
    },
    async findProfiles(query) {
      const res = await client.responses.create({
        model,
        tools: [{ type: 'web_search', filters: { allowed_domains: ['linkedin.com'] } }],
        include: ['web_search_call.action.sources'],
        input: PROFILE_PROMPT(query),
      });
      return {
        profiles: parseProfiles(res.output_text, responseSourceUrls(res.output)),
        usage: { inputTokens: res.usage?.input_tokens ?? 0, outputTokens: res.usage?.output_tokens ?? 0 },
      };
    },
  };
}
