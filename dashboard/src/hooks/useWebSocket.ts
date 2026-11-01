import { useEffect, useRef, useCallback } from 'react';
import { useSystemStore } from '../stores/useSystemStore';

type WSMessage = {
  type: string;
  payload: unknown;
};

type UseWebSocketOptions = {
  url: string;
  onMessage: (msg: WSMessage) => void;
  reconnectInterval?: number;
  maxRetries?: number;
};

/**
 * Managed WebSocket connection with auto-reconnect and system health
 * reporting. Feeds connection state into the SystemStore so the
 * status panel always reflects live connectivity.
 */
export function useWebSocket({
  url,
  onMessage,
  reconnectInterval = 3000,
  maxRetries = 10,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const { setWsConnected, updateMetric } = useSystemStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      setWsConnected(true);
      updateMetric('ws', { status: 'healthy', value: 'Connected' });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as WSMessage;
        onMessage(data);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      updateMetric('ws', { status: 'degraded', value: 'Reconnecting…' });

      if (retriesRef.current < maxRetries) {
        retriesRef.current++;
        setTimeout(connect, reconnectInterval);
      } else {
        updateMetric('ws', { status: 'down', value: 'Disconnected' });
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, onMessage, reconnectInterval, maxRetries, setWsConnected, updateMetric]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
