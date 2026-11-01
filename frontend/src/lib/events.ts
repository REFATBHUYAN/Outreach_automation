import { useEffect, useRef } from 'react';
import { API_URL } from './api';
import type { AppEvent } from './types';

// One shared EventSource for the whole app; components subscribe to it.
const listeners = new Set<(e: AppEvent) => void>();
let source: EventSource | undefined;

export function useEvents(handler: (e: AppEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    source ??= Object.assign(new EventSource(`${API_URL}/events`), {
      onmessage: (m: MessageEvent) => listeners.forEach((l) => l(JSON.parse(m.data))),
    });
    const l = (e: AppEvent) => ref.current(e);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
}
