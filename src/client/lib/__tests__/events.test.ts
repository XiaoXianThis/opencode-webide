import { describe, it, expect, afterEach, mock } from "bun:test";
import { createElement } from "react";
import { render } from "@testing-library/react";
import type { Event as OpencodeEvent } from "@opencode-ai/sdk/client";
import { useConnectionStore } from "@/store/connection";
import { useOpencodeEvents } from "../events";

type TimeoutCallback = () => void;

const originalEventSource = globalThis.EventSource;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const createdSources: TestEventSource[] = [];
const scheduledTimers: Array<{ callback: TimeoutCallback; delay: number }> = [];

class TestEventSource extends EventTarget implements EventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;
  readonly url: string;
  readonly withCredentials = false;
  readyState = TestEventSource.CONNECTING;
  onerror: ((this: EventSource, ev: Event) => void) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent) => void) | null = null;
  onopen: ((this: EventSource, ev: Event) => void) | null = null;

  constructor(url: string | URL) {
    super();
    this.url = String(url);
    createdSources.push(this);
  }

  close(): void {
    this.readyState = TestEventSource.CLOSED;
  }

  emitOpen(): void {
    this.readyState = TestEventSource.OPEN;
    this.onopen?.call(this, new Event("open"));
  }

  emitMessage(data: string): void {
    const event = new MessageEvent("message", { data });
    this.onmessage?.call(this, event);
  }

  emitError(): void {
    this.onerror?.call(this, new Event("error"));
  }
}

function EventsConsumer(props: {
  onEvent?: (event: OpencodeEvent) => void;
  onReconnected?: () => void;
}): null {
  useOpencodeEvents(props);
  return null;
}

function opencodeEvent(type: "server.connected"): OpencodeEvent {
  return { type, properties: {} };
}

describe("useOpencodeEvents singleton", () => {
  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    createdSources.length = 0;
    scheduledTimers.length = 0;
    useConnectionStore.setState({ status: "connecting", lastEventAt: null });
  });

  it("shares one EventSource, unregisters handlers, reconnects only after the first open, and backs off", () => {
    globalThis.EventSource = TestEventSource;
    globalThis.setTimeout = ((callback: TimerHandler, delay?: number) => {
      if (typeof callback === "function") {
        scheduledTimers.push({ callback, delay: delay ?? 0 });
      }
      return scheduledTimers.length;
    }) as typeof setTimeout;
    globalThis.clearTimeout = ((_id?: ReturnType<typeof setTimeout>) => {}) as typeof clearTimeout;

    const firstEvent = mock((_event: OpencodeEvent) => {});
    const secondEvent = mock((_event: OpencodeEvent) => {});
    const firstReconnect = mock(() => {});
    const secondReconnect = mock(() => {});

    const first = render(createElement(EventsConsumer, { onEvent: firstEvent, onReconnected: firstReconnect }));
    const second = render(createElement(EventsConsumer, { onEvent: secondEvent, onReconnected: secondReconnect }));

    expect(createdSources).toHaveLength(1);
    expect(createdSources[0]!.url).toBe("http://localhost/api/events");

    createdSources[0]!.emitOpen();
    expect(useConnectionStore.getState().status).toBe("connected");
    expect(firstReconnect).not.toHaveBeenCalled();
    expect(secondReconnect).not.toHaveBeenCalled();

    const event = opencodeEvent("server.connected");
    createdSources[0]!.emitMessage(JSON.stringify({ directory: "/repo", payload: event }));
    expect(firstEvent).toHaveBeenCalledWith(event);
    expect(secondEvent).toHaveBeenCalledWith(event);
    expect(useConnectionStore.getState().lastEventAt).toBeNumber();

    first.unmount();
    createdSources[0]!.emitMessage(JSON.stringify({ directory: "/repo", payload: event }));
    expect(firstEvent).toHaveBeenCalledTimes(1);
    expect(secondEvent).toHaveBeenCalledTimes(2);

    createdSources[0]!.emitError();
    expect(useConnectionStore.getState().status).toBe("disconnected");
    expect(createdSources[0]!.readyState).toBe(TestEventSource.CLOSED);
    expect(scheduledTimers.map((timer) => timer.delay)).toEqual([1000]);

    scheduledTimers[0]!.callback();
    expect(createdSources).toHaveLength(2);
    createdSources[1]!.emitOpen();
    expect(firstReconnect).not.toHaveBeenCalled();
    expect(secondReconnect).toHaveBeenCalledTimes(1);

    createdSources[1]!.emitError();
    expect(scheduledTimers.map((timer) => timer.delay)).toEqual([1000, 1000]);
    second.unmount();
  });
});