import { useEffect, useRef, useCallback } from 'react';

// useAutoRefresh — automatically calls a function every N seconds
// Stops when component unmounts
export function useAutoRefresh(callback, intervalMs = 10000, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      callbackRef.current();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
}

// usePolling — polls until a condition is met, then stops
export function usePolling(callback, condition, intervalMs = 5000) {
  const callbackRef  = useRef(callback);
  const conditionRef = useRef(condition);
  callbackRef.current  = callback;
  conditionRef.current = condition;

  useEffect(() => {
    const timer = setInterval(() => {
      callbackRef.current();
      if (conditionRef.current()) clearInterval(timer);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);
}
