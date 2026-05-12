import { useEffect } from "react";
import type { Event, GlobalEvent } from "@opencode-ai/sdk/client";
import { useConnectionStore } from "@/store/connection";

export type OpencodeEventHandlers = {
  onEvent?: (event: Event) => void;
  onReconnected?: () => void;
};

/**
 * Module-level singleton SSE subscription. Components register/unregister
 * handlers via the hook, but the underlying EventSource is opened once and
 * survives StrictMode double-mount, HMR, and component re-renders. This
 * eliminates the spurious ERR_INCOMPLETE_CHUNKED_ENCODING errors that
 * appear when an effect tears the connection down moments after opening.
 */
const eventHandlers = new Set<(e: Event) => void>();
const reconnectHandlers = new Set<() => void>();
let es: EventSource | null = null;
let everConnected = false;
let retry = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function ensureConnection(): void {
  if (typeof window === "undefined") return;
  if (es) return;
  const setStatus = useConnectionStore.getState().setStatus;
  const ping = useConnectionStore.getState().ping;
  setStatus("connecting");

  const source = new EventSource(`${window.location.origin}/api/events`);
  es = source;

  source.onopen = () => {
    retry = 0;
    setStatus("connected");
    if (everConnected) {
      for (const h of reconnectHandlers) h();
    }
    everConnected = true;
  };

  source.onmessage = (ev) => {
    ping();
    let envelope: GlobalEvent;
    try {
      envelope = JSON.parse(ev.data) as GlobalEvent;
    } catch {
      return;
    }
    // opencode /global/event wraps each event as { directory, payload: Event }.
    const event: Event | undefined = envelope?.payload;
    if (!event) return;
    for (const h of eventHandlers) h(event);
  };

  source.onerror = () => {
    setStatus("disconnected");
    source.close();
    if (es === source) es = null;
    if (retryTimer) clearTimeout(retryTimer);
    const delay = Math.min(1000 * 2 ** retry, 15_000);
    retry += 1;
    retryTimer = setTimeout(ensureConnection, delay);
  };
}

export function useOpencodeEvents(handlers: OpencodeEventHandlers = {}): void {
  const { onEvent, onReconnected } = handlers;

  useEffect(() => {
    if (onEvent) eventHandlers.add(onEvent);
    if (onReconnected) reconnectHandlers.add(onReconnected);
    ensureConnection();
    return () => {
      if (onEvent) eventHandlers.delete(onEvent);
      if (onReconnected) reconnectHandlers.delete(onReconnected);
    };
  }, [onEvent, onReconnected]);
}
