import { useEffect, useState } from 'react';
import { getData } from '../services/api';

export function useRemoteData<T>(path: string) {
  const [revision, setRevision] = useState(0);
  const key = path + ':' + revision;
  const [result, setResult] = useState<{ key: string; data?: T; error?: unknown }>();
  useEffect(() => {
    const controller = new AbortController();
    getData<T>(path, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setResult({ key, error });
      },
    );
    return () => controller.abort();
  }, [path, key]);
  return {
    data: result?.key === key ? result.data : undefined,
    error: result?.key === key ? result.error : undefined,
    loading: result?.key !== key,
    reload: () => setRevision((value) => value + 1),
  };
}
