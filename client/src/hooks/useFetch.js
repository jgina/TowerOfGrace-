import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks { data, loading, error }. Re-runs when deps change.
 * Stale responses from earlier runs are ignored.
 */
export default function useFetch(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const runId = useRef(0);

  const run = useCallback(() => {
    runId.current += 1;
    const id = runId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    return Promise.resolve()
      .then(loader)
      .then((data) => {
        if (id === runId.current) setState({ data, loading: false, error: null });
        return data;
      })
      .catch((error) => {
        if (id === runId.current) setState((s) => ({ ...s, loading: false, error: error.message }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}
