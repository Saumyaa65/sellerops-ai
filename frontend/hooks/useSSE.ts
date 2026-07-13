"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseSSEOptions<T> {
  onMessage: (data: T) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  enabled?: boolean;
}

/**
 * Generic Server-Sent Events hook.
 * Connects to a URL and calls onMessage for each parsed JSON event.
 * Auto-closes on 'completed' or 'error' event types.
 */
export function useSSE<T extends { event_type?: string }>(
  url: string | null,
  options: UseSSEOptions<T>
): { close: () => void } {
  const { onMessage, onError, onOpen, enabled = true } = options;
  const esRef = useRef<EventSource | null>(null);

  const close = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!url || !enabled) return;

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => onOpen?.();

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as T;
        onMessage(data);
        // Auto-close on terminal events
        if (data.event_type === "completed" || data.event_type === "error") {
          close();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    // Handle named events (e.g. event: step)
    const eventTypes = ["step", "started", "tool_call", "completed", "error"];
    eventTypes.forEach((type) => {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = { ...JSON.parse(e.data), event_type: type } as T;
          onMessage(data);
          if (type === "completed" || type === "error") {
            close();
          }
        } catch {
          // Ignore
        }
      });
    });

    es.onerror = (e) => {
      onError?.(e);
      close();
    };

    return close;
  }, [url, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { close };
}
