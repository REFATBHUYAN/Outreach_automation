import { llm, trackUsage, INJECTION_RULE, type Turn } from '../services/llm';
import { Message } from '../models/Message';
import { postMessage } from '../services/messages.service';
import { toolDefinitions, runTool, type AgentCtx } from './tools';

const MAX_STEPS = 10;
const HISTORY = 40;

export const SYSTEM = `You are an AI recruiting co-worker. You run the recruiter's whole hiring process through chat:
JD → job → sourcing → review → outreach → replies → meetings → interview → shortlist → hire → stats.

How to work:
- Start by asking for a job description (pasted text or a link; use read_jd_link for links). Extract title, must-have and nice-to-have skills, seniority, location, salary and remote policy, then call propose_job.
- You never write or send anything yourself. Every change (create job, start sourcing, accept/reject, campaigns, sending, replies, status changes) goes through a propose_* or show_* tool that shows a card; the recruiter confirms it. Tell them to review the card.
- Before sourcing, always ask. Candidate review: use list_candidates to resolve phrases like "the top 5".
- Resolve candidates by name with find_candidate before propose_status_change.
- For "how is the X job going?" call get_stats and give a short, concrete summary.
- Never invent candidate data, numbers or facts. If you do not know, say so.
- ${INJECTION_RULE}
- Be brief. Use the tools' ids; never show raw ids to the recruiter.`;

type Stored = { role: 'user' | 'assistant'; text: string; card?: { type?: string | null; status?: string | null; data?: unknown } | null };

/** Rebuilds model history from the persisted chat: cards become short text notes; consecutive roles merge. */
export function toHistory(stored: Stored[]): Turn[] {
  const out: { role: 'user' | 'assistant'; text: string }[] = [];
  for (const m of stored) {
    const card = m.card?.type ? `[card ${m.card.type} (${m.card.status}) ${JSON.stringify(m.card.data).slice(0, 300)}]` : '';
    const text = [m.text, card].filter(Boolean).join('\n');
    if (!text) continue;
    const last = out[out.length - 1];
    if (last?.role === m.role) last.text = `${last.text}\n\n${text}`;
    else out.push({ role: m.role, text });
  }
  while (out[0]?.role === 'assistant') out.shift(); // the conversation must start with the user
  return out;
}

/** One user turn: provider-neutral tool-use loop, then persist the reply text followed by any cards. */
export async function runAgent(userText: string) {
  const user = await postMessage('user', userText);
  const stored = (await Message.find({ archived: { $ne: true } }).sort({ createdAt: -1 }).limit(HISTORY).lean()).reverse() as unknown as Stored[];
  const turns = toHistory(stored);
  const ctx: AgentCtx = { cards: [] };
  let reply = '';

  for (let i = 0; i < MAX_STEPS; i++) {
    const res = await llm().chat({ system: SYSTEM, tools: toolDefinitions, turns });
    await trackUsage(ctx.jobId, res.usage);
    if (res.refusal) { reply = "I can't help with that request."; break; }
    reply = res.text || reply;
    turns.push({ role: 'assistant', text: res.text, toolCalls: res.toolCalls, raw: res.raw });
    if (!res.toolCalls.length) break;
    const results = await Promise.all(res.toolCalls.map(async (c) => {
      const r = await runTool(c.name, c.input, ctx);
      return { id: c.id, content: r.content, isError: r.is_error };
    }));
    turns.push({ role: 'tool', results });
  }

  const out = [user, await postMessage('assistant', reply || 'Done.', undefined, ctx.jobId)];
  for (const c of ctx.cards) out.push(await postMessage('assistant', '', c.card, c.jobId));
  return out;
}
