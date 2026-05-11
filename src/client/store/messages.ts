import { create } from "zustand";
import type { Event, Message, Part } from "@opencode-ai/sdk/client";
import { oc } from "@/lib/opencode";

interface SessionData {
  messageOrder: string[];
  messages: Record<string, Message>;
  /** parts keyed by messageID */
  parts: Record<string, { partOrder: string[]; byId: Record<string, Part> }>;
}

interface MessagesState {
  sessions: Record<string, SessionData>;
  loading: Record<string, boolean>;
  loadError: Record<string, string | undefined>;
  /** true while an assistant turn is in flight for this session */
  streaming: Record<string, boolean>;

  loadMessages: (sessionID: string) => Promise<void>;
  sendPrompt: (
    sessionID: string,
    text: string,
    opts?: { agent?: string; model?: { providerID: string; modelID: string } },
  ) => Promise<void>;
  abort: (sessionID: string) => Promise<void>;
  applyEvent: (event: Event) => void;
  ensureSession: (sessionID: string) => SessionData;
  clearSession: (sessionID: string) => void;
}

const empty = (): SessionData => ({ messageOrder: [], messages: {}, parts: {} });

function upsertOrdered(order: string[], id: string): string[] {
  return order.includes(id) ? order : [...order, id];
}

function getMessageCreated(msg: Message): number {
  return msg.time?.created ?? 0;
}

function sortMessageOrder(data: SessionData): string[] {
  return [...data.messageOrder].sort((a, b) => {
    const ma = data.messages[a];
    const mb = data.messages[b];
    if (!ma || !mb) return 0;
    return getMessageCreated(ma) - getMessageCreated(mb);
  });
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  sessions: {},
  loading: {},
  loadError: {},
  streaming: {},

  ensureSession: (sessionID) => {
    const existing = get().sessions[sessionID];
    if (existing) return existing;
    const created = empty();
    set((s) => ({ sessions: { ...s.sessions, [sessionID]: created } }));
    return created;
  },

  clearSession: (sessionID) => {
    set((s) => {
      const next = { ...s.sessions };
      delete next[sessionID];
      return { sessions: next };
    });
  },

  loadMessages: async (sessionID) => {
    set((s) => ({
      loading: { ...s.loading, [sessionID]: true },
      loadError: { ...s.loadError, [sessionID]: undefined },
    }));
    try {
      const { data: list } = await oc.session.messages({ path: { id: sessionID } });
      const data = empty();
      let streaming = false;
      for (const { info, parts } of list) {
        data.messageOrder.push(info.id);
        data.messages[info.id] = info;
        const bucket = { partOrder: [] as string[], byId: {} as Record<string, Part> };
        for (const p of parts) {
          bucket.partOrder.push(p.id);
          bucket.byId[p.id] = p;
        }
        data.parts[info.id] = bucket;
        if (info.role === "assistant" && !info.time?.completed && !info.error) {
          streaming = true;
        }
      }
      data.messageOrder = sortMessageOrder(data);
      set((s) => ({
        sessions: { ...s.sessions, [sessionID]: data },
        loading: { ...s.loading, [sessionID]: false },
        streaming: { ...s.streaming, [sessionID]: streaming },
      }));
    } catch (err) {
      set((s) => ({
        loading: { ...s.loading, [sessionID]: false },
        loadError: {
          ...s.loadError,
          [sessionID]: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  },

  sendPrompt: async (sessionID, text, opts) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    set((s) => ({ streaming: { ...s.streaming, [sessionID]: true } }));
    try {
      await oc.session.promptAsync({
        path: { id: sessionID },
        body: {
          ...(opts?.agent ? { agent: opts.agent } : {}),
          ...(opts?.model ? { model: opts.model } : {}),
          parts: [{ type: "text", text: trimmed }],
        },
      });
    } catch (err) {
      set((s) => ({
        streaming: { ...s.streaming, [sessionID]: false },
        loadError: {
          ...s.loadError,
          [sessionID]: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  },

  abort: async (sessionID) => {
    try {
      await oc.session.abort({ path: { id: sessionID } });
    } catch (err) {
      console.warn("abort failed", err);
    } finally {
      set((s) => ({ streaming: { ...s.streaming, [sessionID]: false } }));
    }
  },

  applyEvent: (event) => {
    switch (event.type) {
      case "message.updated": {
        const info = event.properties.info;
        const sid = info.sessionID;
        set((s) => {
          const data = s.sessions[sid] ?? empty();
          const messageOrder = upsertOrdered(data.messageOrder, info.id);
          const messages = { ...data.messages, [info.id]: info };
          const parts = data.parts[info.id]
            ? data.parts
            : { ...data.parts, [info.id]: { partOrder: [], byId: {} } };
          const next: SessionData = {
            messageOrder,
            messages,
            parts,
          };
          next.messageOrder = sortMessageOrder(next);

          // assistant message completed -> stop streaming
          let streaming = s.streaming[sid] ?? false;
          if (info.role === "assistant" && (info.time?.completed || info.error)) {
            streaming = false;
          }

          return {
            sessions: { ...s.sessions, [sid]: next },
            streaming: { ...s.streaming, [sid]: streaming },
          };
        });
        break;
      }
      case "message.removed": {
        const { sessionID: sid, messageID } = event.properties;
        set((s) => {
          const data = s.sessions[sid];
          if (!data) return {};
          const messageOrder = data.messageOrder.filter((id) => id !== messageID);
          const messages = { ...data.messages };
          delete messages[messageID];
          const parts = { ...data.parts };
          delete parts[messageID];
          return {
            sessions: { ...s.sessions, [sid]: { messageOrder, messages, parts } },
          };
        });
        break;
      }
      case "message.part.updated": {
        const part = event.properties.part;
        const sid = part.sessionID;
        const mid = part.messageID;
        set((s) => {
          const data = s.sessions[sid] ?? empty();
          const bucket = data.parts[mid] ?? { partOrder: [], byId: {} };
          const partOrder = upsertOrdered(bucket.partOrder, part.id);
          const byId = { ...bucket.byId, [part.id]: part };
          const next: SessionData = {
            messageOrder: data.messageOrder,
            messages: data.messages,
            parts: { ...data.parts, [mid]: { partOrder, byId } },
          };
          return { sessions: { ...s.sessions, [sid]: next } };
        });
        break;
      }
      case "message.part.removed": {
        const { sessionID: sid, messageID, partID } = event.properties;
        set((s) => {
          const data = s.sessions[sid];
          if (!data) return {};
          const bucket = data.parts[messageID];
          if (!bucket) return {};
          const partOrder = bucket.partOrder.filter((id) => id !== partID);
          const byId = { ...bucket.byId };
          delete byId[partID];
          return {
            sessions: {
              ...s.sessions,
              [sid]: {
                ...data,
                parts: { ...data.parts, [messageID]: { partOrder, byId } },
              },
            },
          };
        });
        break;
      }
      case "session.idle":
      case "session.error": {
        const sid = event.properties.sessionID;
        if (!sid) break;
        set((s) => ({ streaming: { ...s.streaming, [sid]: false } }));
        break;
      }
      case "session.deleted": {
        const sid = event.properties.info.id;
        get().clearSession(sid);
        break;
      }
      default:
        break;
    }
  },
}));
