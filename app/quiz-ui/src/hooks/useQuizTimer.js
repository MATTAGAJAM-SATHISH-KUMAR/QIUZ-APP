import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing quiz timer with auto-submit.
 * @param {number} timeLimitMinutes - Total time allowed in minutes
 * @param {string} startedAt - ISO timestamp when attempt started
 * @param {function} onTimeUp - Callback when time expires
 */
export function useQuizTimer(timeLimitMinutes, startedAt, onTimeUp) {
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!timeLimitMinutes || !startedAt) return;

    const totalSeconds = timeLimitMinutes * 60;
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const initial = Math.max(0, totalSeconds - elapsed);
    setRemainingSeconds(initial);

    intervalRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [timeLimitMinutes, startedAt, onTimeUp]);

  const formatTime = useCallback(() => {
    if (remainingSeconds === null) return '--:--';
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [remainingSeconds]);

  const isWarning = remainingSeconds !== null && remainingSeconds <= 60;
  const isDanger = remainingSeconds !== null && remainingSeconds <= 30;

  return { remainingSeconds, formatTime, isWarning, isDanger };
}
