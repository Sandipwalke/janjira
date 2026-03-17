import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { IssueStatus, IssuePriority, IssueType } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return formatDate(iso);
}

export const STATUS_LABELS: Record<IssueStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No Priority",
};

export const TYPE_LABELS: Record<IssueType, string> = {
  task: "Task",
  bug: "Bug",
  story: "Story",
  epic: "Epic",
  subtask: "Subtask",
};

export const STATUS_ORDER: IssueStatus[] = ["todo", "in_progress", "in_review", "done", "cancelled"];

export const PRIORITY_ORDER: IssuePriority[] = ["urgent", "high", "medium", "low", "none"];

export const PROJECT_COLORS = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
  "#06B6D4", "#EC4899", "#F97316", "#14B8A6", "#6366F1",
];
