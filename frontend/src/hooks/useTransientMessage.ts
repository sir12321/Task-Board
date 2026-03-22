import { useCallback, useEffect, useState } from 'react';

const defaultDurationMs = 3000;

const useTransientMessage = (
  durationMs: number = defaultDurationMs,
): {
  message: string | null;
  showMessage: (nextMessage: string) => void;
  clearMessage: () => void;
} => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, message]);

  const showMessage = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
  }, []);

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  return { message, showMessage, clearMessage };
};

export default useTransientMessage;
