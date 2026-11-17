import { useCallback, useEffect, useRef, useState } from 'react';
import { getHealth } from '../api/navic';

// Polls /health until the C++ engine has loaded the graph.
export function useApiHealth() {
  const [health, setHealth] = useState(null);
  const [status, setStatus] = useState('Connecting to the routing API…');
  const abort = useRef(null);
  const timer = useRef(null);

  const connect = useCallback(async () => {
    abort.current?.abort();
    clearTimeout(timer.current);
    const controller = new AbortController();
    abort.current = controller;
    setStatus('Connecting… the C++ engine loads the road graph on startup.');
    try {
      const result = await getHealth(controller.signal);
      if (!controller.signal.aborted) { setHealth(result); setStatus('Routing engine ready'); }
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus(error.message);
      timer.current = setTimeout(connect, 3000); // engine may still be loading
    }
  }, []);

  useEffect(() => {
    connect();
    return () => { abort.current?.abort(); clearTimeout(timer.current); };
  }, [connect]);

  return { health, status, retry: connect };
}
