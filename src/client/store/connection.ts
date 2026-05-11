import { create } from "zustand";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface ConnectionState {
  status: ConnectionStatus;
  lastEventAt: number | null;
  setStatus: (status: ConnectionStatus) => void;
  ping: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: "connecting",
  lastEventAt: null,
  setStatus: (status) => set({ status }),
  ping: () => set({ lastEventAt: Date.now() }),
}));
