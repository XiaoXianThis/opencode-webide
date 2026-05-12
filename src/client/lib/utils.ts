import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

function normalizeTimestampMs(timestamp: number): number {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatNewSessionTitle(date = new Date()): string {
  return `新会话-${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}-${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatSessionTitle(title: string | undefined): string {
  if (!title) return "未命名会话";
  const match = title.match(/^New session - (.+)$/);
  if (!match) return title;
  const date = new Date(match[1]);
  if (Number.isNaN(date.getTime())) return title;
  return formatNewSessionTitle(date);
}

export function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return "";
  const ms = normalizeTimestampMs(timestamp);
  const diff = Math.max(0, Date.now() - ms);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(ms).toLocaleDateString();
}
