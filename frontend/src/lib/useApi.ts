import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useEvents } from './events';
import type { AppEvent } from './types';

/** GET `path`, and refetch whenever a live event matches `refreshOn`. */
export function useApi<T>(path: string | null, refreshOn?: (e: AppEvent) => boolean) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const reload = useCallback(() => {
    if (path) api<T>(path).then(setData, (e: Error) => setError(e.message));
  }, [path]);
  useEffect(() => {
    reload();
  }, [reload]);
  useEvents((e) => refreshOn?.(e) && reload());
  return { data, error, reload, setData };
}

export const forJob = (jobId?: string) => (e: AppEvent) => (e.type === 'candidate' || e.type === 'campaign' || e.type === 'job') && e.jobId === jobId;

/** A job was created/updated or its candidates changed: job lists and counts are stale. */
export const jobsChanged = (e: AppEvent) => e.type === 'job' || e.type === 'candidate';
