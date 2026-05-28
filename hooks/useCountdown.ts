import { useState, useEffect, useRef, useCallback } from 'react';

interface CountdownOptions {
  onTimeout?: () => void;
}

export const useCountdown = (initialSeconds: number, options: CountdownOptions = {}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const { onTimeout } = options;

  const tick = useCallback(() => {
    setSecondsLeft(prev => {
      if (prev <= 1) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (onTimeout) {
            onTimeout();
        }
        return 0;
      }
      return prev - 1;
    });
  }, [onTimeout]);

  useEffect(() => {
    if (!isPaused && secondsLeft > 0) {
      timerRef.current = window.setInterval(tick, 1000);
    } else if (isPaused || secondsLeft === 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, secondsLeft, tick]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  return { secondsLeft, isPaused, pause, resume };
};
