import { useCallback, useEffect, useRef, useState } from 'react';
import { ipEstimate, locateOrigin } from '../utils/location';

const MESSAGES = {
  gps: 'Finding your GPS location…',
  ip: 'Estimating your area from your IP…',
  'ip-ready': 'Approximate origin from your IP. You can move the pin.',
  'gps-ready': 'Origin set from device location.',
  unavailable: 'Location unavailable. Search for a place or select a point on the map.',
};

// GPS first, IP estimate as fallback. Calls onLocated(place) on success.
export function useCurrentLocation(onLocated) {
  const [state, setState] = useState('idle');
  const abort = useRef(null);
  const callback = useRef(onLocated);
  callback.current = onLocated;

  const cancel = useCallback(() => { abort.current?.abort(); setState('idle'); }, []);

  const locate = useCallback(async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    try {
      const place = await locateOrigin({
        geolocation: navigator.geolocation, fetchEstimate: ipEstimate, onStage: setState, signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setState(`${place.method}-ready`);
      callback.current(place);
    } catch {
      if (!controller.signal.aborted) setState('unavailable');
    }
  }, []);

  useEffect(() => { locate(); return () => abort.current?.abort(); }, [locate]);

  return {
    state,
    message: MESSAGES[state],
    busy: state === 'gps' || state === 'ip',
    canRetry: state === 'ip-ready' || state === 'unavailable',
    locate,
    cancel,
  };
}
