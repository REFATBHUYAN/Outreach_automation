import { describe, it, expect, vi } from 'vitest';
import { toAnthropicMessages } from '../src/services/llm/anthropic';
import { toOpenAIMessages } from '../src/services/llm/openai';
import type { Turn } from '../src/services/llm/types';

vi.mock('../src/config/env', () => ({ env: { LLM_PROVIDER: 'openai', OPENAI_MODEL: 'gpt-x', LLM_INPUT_PRICE: 1, LLM_OUTPUT_PRICE: 2 } }));

const RAW = { role: 'assistant', marker: 'provider-native' };
const turns: Turn[] = [
  { role: 'user', text: 'accept the top 2' },
  { role: 'assistant', text: '', toolCalls: [{ id: 't1', name: 'list_candidates', input: {} }], raw: RAW },
  { role: 'tool', results: [{ id: 't1', content: '[]' }, { id: 't2', content: 'bad', isError: true }] },
];

describe('provider adapters', () => {
  it('Anthropic: replays the raw assistant content and batches tool results in one user turn', () => {
    const m = toAnthropicMessages(turns);
    expect(m.map((x) => x.role)).toEqual(['user', 'assistant', 'user']);
    expect(m[1].content).toBe(RAW);
    expect(m[2].content).toEqual([
      { type: 'tool_result', tool_use_id: 't1', content: '[]', is_error: undefined },
      { type: 'tool_result', tool_use_id: 't2', content: 'bad', is_error: true },
    ]);
  });

  it('OpenAI: system first, raw assistant message, one tool message per result', () => {
    const m = toOpenAIMessages('SYS', turns);
    expect(m.map((x) => x.role)).toEqual(['system', 'user', 'assistant', 'tool', 'tool']);
    expect(m[2]).toBe(RAW);
    expect(m[4]).toEqual({ role: 'tool', tool_call_id: 't2', content: 'Error: bad' });
  });

  it('costs use the env price override for any model', async () => {
    const { costUsd } = await import('../src/services/llm');
    expect(costUsd('gpt-x', { inputTokens: 1_000_000, outputTokens: 500_000 })).toBe(2);
  });
});

describe('web search profiles', () => {
  it('Claude: reads URLs from result lists and ignores error results', async () => {
    const { searchUrls } = await import('../src/services/llm/anthropic');
    expect(searchUrls([
      { type: 'text', text: 'x' },
      { type: 'web_search_tool_result', tool_use_id: 's1', content: [{ type: 'web_search_result', title: 'Jane', url: 'https://linkedin.com/in/jane', encrypted_content: '', page_age: null }] },
      { type: 'web_search_tool_result', tool_use_id: 's2', content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' } },
    ] as never)).toEqual(['https://linkedin.com/in/jane']);
  });

  it('OpenAI: collects search-call sources and citations', async () => {
    const { responseSourceUrls } = await import('../src/services/llm/openai');
    expect(responseSourceUrls([
      { type: 'web_search_call', id: 'w', status: 'completed', action: { type: 'search', query: 'q', sources: [{ type: 'url', url: 'https://linkedin.com/in/a' }] } },
      { type: 'message', id: 'm', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: '', annotations: [{ type: 'url_citation', url: 'https://linkedin.com/in/b', title: 'B', start_index: 0, end_index: 1 }] }] },
    ] as never)).toEqual(['https://linkedin.com/in/a', 'https://linkedin.com/in/b']);
  });

  it('keeps only LinkedIn profiles whose URL really appeared in the search sources', async () => {
    const { parseProfiles } = await import('../src/services/llm/profiles');
    const text = 'Here you go: {"profiles":[' +
      '{"name":"Real Person","url":"https://www.linkedin.com/in/real/","headline":"React Dev","company":"Acme","location":""},' +
      '{"name":"Invented Person","url":"https://linkedin.com/in/made-up"},' +
      '{"name":"Company","url":"https://linkedin.com/company/acme"}]}';
    expect(parseProfiles(text, ['https://linkedin.com/in/real', 'https://linkedin.com/company/acme'])).toEqual([
      { name: 'Real Person', url: 'https://www.linkedin.com/in/real/', headline: 'React Dev', company: 'Acme', location: undefined, education: undefined, summary: undefined },
    ]);
    expect(parseProfiles('not json', [])).toEqual([]);
  });
});
