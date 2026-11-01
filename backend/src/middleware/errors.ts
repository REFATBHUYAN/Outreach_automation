import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Validates untrusted input at the HTTP boundary. */
export const validate = <S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> => schema.parse(value);

/** Lets async controllers throw; Express 4 does not catch rejected promises itself. */
export const ah = (fn: RequestHandler): RequestHandler => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: 'Invalid input', issues: err.issues });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
};
