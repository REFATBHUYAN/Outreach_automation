import type { RequestHandler } from 'express';
import { subscribe } from '../services/events';

/** Server-sent events: live sourcing progress, new chat messages, candidate and campaign updates. */
export const stream: RequestHandler = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(': connected\n\n');
  const unsubscribe = subscribe((raw) => res.write(`data: ${raw}\n\n`));
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => { clearInterval(ping); unsubscribe(); });
};
