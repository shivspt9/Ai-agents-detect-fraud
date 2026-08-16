import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from '@/lib/api';

export type ConnectionState = 'connecting' | 'open' | 'closed';

export interface RealtimeEvent {
  type: 'hello' | 'engagement';
  payload: unknown;
  at: string;
}

interface Options {
  /** Called for every server event. Kept in a ref so it never forces a reconnect. */
  onEvent?: (event: RealtimeEvent) => void;
  enabled?: boolean;
}

const MAX_BACKOFF_MS = 15000;

/**
 * WebSocket connection to the honeypot server with automatic reconnection.
 *
 * Backs off exponentially so a server that is down does not turn into a
 * reconnect storm, and resets the delay as soon as a connection succeeds.
 */
export function useRealtime({ onEvent, enabled = true }: Options = {}) {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUs = useRef(false);

  // Holding the callback in a ref keeps `connect` stable, so a parent
  // re-render cannot tear down and rebuild the socket.
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!enabled) return;

    setState('connecting');
    let socket: WebSocket;
    try {
      socket = new WebSocket(WS_URL);
    } catch {
      scheduleReconnect();
      return;
    }
    socketRef.current = socket;

    socket.onopen = () => {
      retryRef.current = 0;
      setState('open');
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeEvent;
        setLastEventAt(parsed.at);
        handlerRef.current?.(parsed);
      } catch {
        // A frame we cannot parse is not worth tearing the connection down.
      }
    };

    socket.onclose = () => {
      setState('closed');
      if (!closedByUs.current) scheduleReconnect();
    };

    socket.onerror = () => socket.close();

    function scheduleReconnect() {
      if (closedByUs.current) return;
      const delay = Math.min(1000 * 2 ** retryRef.current, MAX_BACKOFF_MS);
      retryRef.current += 1;
      timerRef.current = setTimeout(connect, delay);
    }
  }, [enabled]);

  useEffect(() => {
    closedByUs.current = false;
    connect();

    return () => {
      closedByUs.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      socketRef.current?.close();
    };
  }, [connect]);

  return { state, lastEventAt, isLive: state === 'open' };
}
