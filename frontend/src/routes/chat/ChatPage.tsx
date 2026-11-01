import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, PageHeader, PlusIcon, SendIcon, SparkIcon } from '../../components/ui';
import { api, post } from '../../lib/api';
import { useEvents } from '../../lib/events';
import type { Message } from '../../lib/types';
import { ChatCard } from './cards';

const SUGGESTIONS = [
  'Here is the job description: Senior React Engineer in Dhaka, 5+ years React and TypeScript…',
  'Accept the top 5 candidates',
  'Create a campaign: day 0, follow-ups on day 3 and day 7',
  'How is the React job going?',
];

const Avatar = () => (
  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-primary"><SparkIcon /></span>
);

export function Component() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const end = useRef<HTMLDivElement>(null);

  const upsert = (m: Message) =>
    setMessages((ms) => (ms.some((x) => x._id === m._id) ? ms.map((x) => (x._id === m._id ? m : x)) : [...ms, m]));
  const load = () => api<Message[]>('/messages').then(setMessages, (e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  useEvents((e) => {
    if (e.type === 'message' && !e.message.archived) upsert(e.message);
    if (e.type === 'chat_cleared') load(); // another tab started a new chat
  });

  const newChat = () => {
    setError(undefined);
    post<Message[]>('/messages/clear').then(setMessages, (err: Error) => setError(err.message));
  };
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, busy]);

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || busy) return;
    const sent = text;
    setText(''); // clear right away; restored below if the request fails
    setBusy(true);
    setError(undefined);
    post<Message[]>('/chat', { text: sent })
      .then((ms) => ms.forEach(upsert), (err: Error) => { setError(err.message); setText((t) => t || sent); })
      .finally(() => setBusy(false));
  };

  return (
    <div className="grid h-screen grid-stack-fill">
      <div className="border-b border-border px-5 py-4">
        <PageHeader
          title="Chat"
          description="Your recruiting co-worker. Every write waits for your confirmation."
          actions={<Button variant="outline" onClick={newChat} disabled={busy}><PlusIcon /> New chat</Button>}
        />
      </div>
      <div className="flex min-h-0 flex-col">
        <div className="flex-1 overflow-y-auto px-5 py-5" aria-live="polite">
          <div className="mx-auto flex w-full max-w-chat flex-col gap-5">
            {messages.map((m) =>
              m.role === 'user' ? (
                <p key={m._id} className="max-w-xl self-end whitespace-pre-wrap rounded-xl bg-primary px-4 py-2.5 text-primary-foreground">{m.text}</p>
              ) : (
                <div key={m._id} className="grid grid-icon-content gap-3">
                  <Avatar />
                  <div className="flex min-w-0 flex-col gap-3 pt-1">
                    {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                    {m.card && <ChatCard message={m} onUpdate={upsert} />}
                  </div>
                </div>
              ),
            )}
            {busy && (
              <div className="grid grid-icon-content items-center gap-3">
                <Avatar />
                <span className="flex gap-1" aria-label="Thinking">
                  {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />)}
                </span>
              </div>
            )}
            {messages.length <= 1 && !busy && (
              <div className="flex flex-wrap gap-2 pl-10">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setText(s)} className="max-w-xs truncate rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={end} />
          </div>
        </div>
        <form onSubmit={send} className="px-5 pb-5">
          <div className="mx-auto flex w-full max-w-chat flex-col gap-1.5">
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
            <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 transition-colors duration-100 focus-within:border-ring">
              <textarea
                rows={2}
                aria-label="Message"
                placeholder="Paste a job description or a link, or ask anything about your hiring…"
                className="flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(e)}
              />
              <Button type="submit" size="icon" aria-label="Send" disabled={busy || !text.trim()}><SendIcon /></Button>
            </div>
            <p className="text-2xs text-muted-foreground">Enter to send · Shift + Enter for a new line</p>
          </div>
        </form>
      </div>
    </div>
  );
}
