import { describe, it, expect, vi } from 'vitest';

// No Redis/Mongo in unit tests: stub the connections the modules open on import.
vi.mock('../src/config/redis', () => ({ redis: { publish: vi.fn(async () => 0) }, createRedis: vi.fn() }));
vi.mock('../src/queues/queues', () => ({ sourcingQueue: {}, outreachQueue: {}, replyQueue: {}, enqueueStep: vi.fn() }));

const { toolDefinitions, runTool, TOOLS } = await import('../src/agent/tools');
const { toHistory } = await import('../src/agent/agent');

describe('agent tools', () => {
  it('exposes a JSON object schema for every tool', () => {
    expect(toolDefinitions.length).toBe(Object.keys(TOOLS).length);
    for (const t of toolDefinitions) { expect(t.parameters.type).toBe('object'); expect(t.parameters).not.toHaveProperty('$schema'); }
  });

  it('covers every capability the brief requires', () => {
    for (const n of ['propose_job', 'propose_sourcing', 'propose_scoring', 'propose_decisions', 'propose_campaign', 'show_pending_reply', 'propose_status_change', 'get_stats'])
      expect(Object.keys(TOOLS)).toContain(n);
  });

  it('propose_job only creates a pending card — nothing is written before confirmation', async () => {
    const ctx = { cards: [] as { card: { type: string; status: string } }[] };
    const job = { title: 'React Dev', description: '', mustHave: ['React'], niceToHave: [], seniority: 'Senior', location: 'Dhaka', salary: '', remotePolicy: 'Hybrid' };
    const out = await runTool('propose_job', job, ctx as never);
    expect(out.is_error).toBeUndefined();
    expect(out.content).toMatch(/Nothing has been written/);
    expect(ctx.cards[0].card).toMatchObject({ type: 'job_confirm', status: 'pending' });
  });

  it('returns validation errors to the model instead of throwing', async () => {
    const out = await runTool('propose_sourcing', { jobId: 'not-an-id', query: 'x' }, { cards: [] });
    expect(out.is_error).toBe(true);
    expect(out.content).toMatch(/Invalid arguments/);
    expect((await runTool('nope', {}, { cards: [] })).is_error).toBe(true);
  });
});

describe('toHistory', () => {
  it('drops the leading greeting, merges same-role turns and summarises cards', () => {
    const h = toHistory([
      { role: 'assistant', text: 'Hi, paste a JD' },
      { role: 'user', text: 'Here is the JD' },
      { role: 'assistant', text: 'Please review' },
      { role: 'assistant', text: '', card: { type: 'job_confirm', status: 'confirmed', data: { title: 'X' } } },
    ]);
    expect(h.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(h[1]).toMatchObject({ role: 'assistant' });
    expect((h[1] as { text: string }).text).toContain('[card job_confirm (confirmed)');
  });
});
