// Prompt-injection protection: candidate-supplied text (profiles, emails) is data, never instructions.
const SUSPICIOUS = [
  /ignore (all |any )?(previous|prior|above) (instructions|prompts?)/i,
  /disregard (the |all )?(previous|prior|above|system)/i,
  /system prompt/i,
  /you are now/i,
  /\b(act|behave) as\b/i,
  /<\/?(system|assistant|instructions?)>/i,
  /(mark|set) (me|this candidate) as (hired|shortlisted)/i,
];

export const detectInjection = (text = '') => SUSPICIOUS.some((r) => r.test(text));

/** Wraps untrusted text in a tag the system prompt tells the model to treat as inert data. */
export const untrusted = (label: string, text = '') =>
  `<untrusted ${label}>\n${text.replace(/<\/?untrusted[^>]*>/gi, '').slice(0, 4000)}\n</untrusted>`;

export type ReplyClass = 'interested' | 'not_interested' | 'question' | 'wants_meeting' | 'unsubscribe';

/** Auto-reply safety rule: only routine positive replies, never flagged content or open questions. */
export const canAutoSend = (cls: ReplyClass, flagged: boolean) => !flagged && (cls === 'interested' || cls === 'wants_meeting');
