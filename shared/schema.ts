import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type IssueStatus = "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type IssuePriority = "urgent" | "high" | "medium" | "low" | "none";
export type IssueType = "task" | "bug" | "story" | "epic" | "subtask";
export type MemberRole = "owner" | "admin" | "member" | "viewer";
export type SprintStatus = "planning" | "active" | "completed";

// ─── Core Types ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  driveRootFolderId?: string;     // Google Drive folder ID for this org
  driveDatabaseFileId?: string;   // Hidden "database" JSON file in Drive
  createdAt: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
}

export interface OrgInvite {
  id: string;
  orgId: string;
  email: string;
  role: MemberRole;
  token: string;
  invitedBy: string;
  expiresAt: string;
  accepted: boolean;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  key: string;       // e.g. "PROJ" — used as issue prefix
  description?: string;
  avatar?: string;
  color: string;
  leadId?: string;
  driveProjectFolderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  orgId: string;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

export interface Issue {
  id: string;
  number: number;       // sequential per project: PROJ-1, PROJ-2 …
  projectId: string;
  orgId: string;
  title: string;
  description?: string; // markdown
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId?: string;
  reporterId: string;
  sprintId?: string;
  parentId?: string;    // for subtasks/epics
  labelIds: string[];
  storyPoints?: number;
  dueDate?: string;
  driveFileId?: string; // attached Google Drive file
  order: number;        // for drag-drop ordering within column
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;          // markdown
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  issueId: string;
  userId: string;
  type: "status_change" | "assignee_change" | "priority_change" | "comment" | "created" | "sprint_change" | "label_change";
  meta: Record<string, string>;
  createdAt: string;
}

export interface Attachment {
  id: string;
  issueId: string;
  uploaderId: string;
  name: string;
  mimeType: string;
  size: number;
  driveFileId: string;
  driveViewLink: string;
  createdAt: string;
}

// ─── Google Drive DB shape ────────────────────────────────────────────────────

export interface DriveDatabase {
  version: number;
  org: Organization;
  members: OrgMember[];
  invites: OrgInvite[];
  projects: Project[];
  sprints: Sprint[];
  labels: Label[];
  issues: Issue[];
  comments: Comment[];
  activities: Activity[];
  attachments: Attachment[];
  lastSyncAt: string;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const insertOrganizationSchema = z.object({
  name: z.string().min(2).max(64),
  slug: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/),
  description: z.string().max(256).optional(),
});

export const insertProjectSchema = z.object({
  name: z.string().min(2).max(64),
  key: z.string().min(2).max(8).regex(/^[A-Z]+$/).toUpperCase(),
  description: z.string().max(512).optional(),
  color: z.string().default("#3B82F6"),
});

export const insertIssueSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  type: z.enum(["task", "bug", "story", "epic", "subtask"]).default("task"),
  status: z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]).default("todo"),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).default("medium"),
  assigneeId: z.string().optional(),
  sprintId: z.string().optional(),
  parentId: z.string().optional(),
  labelIds: z.array(z.string()).default([]),
  storyPoints: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().optional(),
});

export const insertCommentSchema = z.object({
  body: z.string().min(1),
});

export const insertSprintSchema = z.object({
  name: z.string().min(1).max(64),
  goal: z.string().max(256).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const insertLabelSchema = z.object({
  name: z.string().min(1).max(32),
  color: z.string(),
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertSprint = z.infer<typeof insertSprintSchema>;
export type InsertLabel = z.infer<typeof insertLabelSchema>;
