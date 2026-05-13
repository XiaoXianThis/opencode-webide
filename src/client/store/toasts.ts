import { create } from "zustand";
import type { Event } from "@opencode-ai/sdk/client";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastInput {
  title?: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  show: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  applyEvent: (event: Event) => void;
}

const DEFAULT_DURATION = 4000;
const MAX_TOASTS = 5;
let toastId = 0;

function nextToastId(): string {
  toastId += 1;
  return `toast-${toastId}`;
}

function isToastEvent(event: Event): event is Event & { properties: ToastInput } {
  if (event.type !== "tui.toast.show") return false;
  const properties: Partial<ToastInput> = event.properties;
  return (
    typeof properties.message === "string" &&
    (properties.variant === "info" ||
      properties.variant === "success" ||
      properties.variant === "warning" ||
      properties.variant === "error")
  );
}

export const useToastsStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (toast) => {
    const id = nextToastId();
    const duration = toast.duration ?? DEFAULT_DURATION;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id, duration }].slice(-MAX_TOASTS) }));
    if (duration > 0) {
      window.setTimeout(() => get().dismiss(id), duration);
    }
    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((toast) => toast.id !== id) })),

  applyEvent: (event) => {
    if (!isToastEvent(event)) return;
    get().show(event.properties);
  },
}));
