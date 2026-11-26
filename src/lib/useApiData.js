import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async loader when the component mounts (and whenever `deps` change). Ignores answers that arrive late.
export function useApiData(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const ticket = useRef(0);

  const load = useCallback(async () => {
    const mine = ++ticket.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await loader();
      if (mine === ticket.current) setState({ data, error: '', loading: false });
    } catch (e) {
      if (mine === ticket.current) setState({ data: null, error: e.message || 'Something went wrong.', loading: false });
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    return () => { ticket.current += 1; };
  }, [load]);

  return { ...state, reload: load };
}
