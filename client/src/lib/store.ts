/**
 * Client-side in-memory store — mirrors MemStorage but runs entirely in the browser.
 * No backend calls needed. Data lives in React state via StoreProvider.
 */

import type {
  User, Organization, OrgMember, OrgInvite, Project, Sprint, Label,
  Issue, Comment, Activity, Attachment, IssueStatus, IssuePriority, IssueType, MemberRole,
} from "@shared/schema";

export const STORE_STORAGE_KEY = "janjira.store.v1";

export interface ClientStoreSnapshot {
  users: User[];
  orgs: Organization[];
  members: OrgMember[];
  invites: OrgInvite[];
  projects: Project[];
  sprints: Sprint[];
  labels: Label[];
  issues: Issue[];
  comments: Comment[];
  activities: Activity[];
  attachments: Attachment[];
  issueCounters: Array<[string, number]>;
}

function uuid() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const sandipUser: User = {
  id: "user-sandip",
  email: "sandipwalke05@gmail.com",
  name: "Sandip Walke",
  avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=sandip",
};
const demoUser: User = {
  id: "user-demo",
  email: "demo@janjira.app",
  name: "Demo User",
  avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=demo",
};

const demoOrg: Organization = {
  id: "org-demo",
  name: "Janjira Demo",
  slug: "janjira-demo",
  description: "Powered by Google Drive — free for everyone.",
  ownerId: sandipUser.id,
  createdAt: new Date().toISOString(),
};

const member1: OrgMember = { id: uuid(), orgId: demoOrg.id, userId: sandipUser.id, role: "owner", joinedAt: new Date().toISOString() };
const member2: OrgMember = { id: uuid(), orgId: demoOrg.id, userId: demoUser.id, role: "member", joinedAt: new Date().toISOString() };

const demoProject: Project = {
  id: "proj-demo",
  orgId: demoOrg.id,
  name: "Janjira Platform",
  key: "JAN",
  description: "Core platform development",
  color: "#3B82F6",
  leadId: sandipUser.id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const demoSprint: Sprint = {
  id: "sprint-1",
  projectId: demoProject.id,
  orgId: demoOrg.id,
  name: "Sprint 1",
  goal: "Ship core features",
  status: "active",
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
  createdAt: new Date().toISOString(),
};

const labelSeeds = [
  { name: "frontend", color: "#8B5CF6" },
  { name: "backend", color: "#10B981" },
  { name: "design", color: "#F59E0B" },
  { name: "bug", color: "#EF4444" },
  { name: "docs", color: "#6B7280" },
];
const seedLabels: Label[] = labelSeeds.map(l => ({ id: uuid(), projectId: demoProject.id, ...l }));

const issueSeed: Array<Partial<Issue> & { title: string }> = [
  { title: "Set up Google OAuth 2.0 login flow", type: "task", status: "done", priority: "urgent", sprintId: demoSprint.id, assigneeId: sandipUser.id, labelIds: [seedLabels[1].id] },
  { title: "Design sidebar navigation and layout", type: "story", status: "done", priority: "high", sprintId: demoSprint.id, assigneeId: demoUser.id, labelIds: [seedLabels[2].id] },
  { title: "Implement Kanban board with drag & drop", type: "task", status: "in_progress", priority: "high", sprintId: demoSprint.id, assigneeId: sandipUser.id, labelIds: [seedLabels[0].id] },
  { title: "Build Google Drive storage layer", type: "epic", status: "in_progress", priority: "urgent", sprintId: demoSprint.id, assigneeId: sandipUser.id, labelIds: [seedLabels[1].id] },
  { title: "Issue detail page with comments", type: "task", status: "in_review", priority: "medium", sprintId: demoSprint.id, assigneeId: demoUser.id, labelIds: [seedLabels[0].id] },
  { title: "Sprint planning & velocity tracking", type: "story", status: "todo", priority: "medium", sprintId: demoSprint.id, assigneeId: undefined, labelIds: [] },
  { title: "Org invite email flow", type: "task", status: "todo", priority: "low", sprintId: demoSprint.id, assigneeId: undefined, labelIds: [seedLabels[1].id] },
  { title: "Export issues to Google Sheets", type: "task", status: "todo", priority: "low", sprintId: undefined, assigneeId: undefined, labelIds: [seedLabels[1].id, seedLabels[4].id] },
  { title: "Bug: drag-drop reorder fails on mobile", type: "bug", status: "todo", priority: "high", sprintId: demoSprint.id, assigneeId: sandipUser.id, labelIds: [seedLabels[3].id] },
  { title: "Write onboarding documentation", type: "task", status: "todo", priority: "none", sprintId: undefined, assigneeId: demoUser.id, labelIds: [seedLabels[4].id] },
  { title: "Roadmap view with epics timeline", type: "story", status: "todo", priority: "medium", sprintId: undefined, assigneeId: undefined, labelIds: [seedLabels[0].id] },
  { title: "Dark mode refinements", type: "task", status: "todo", priority: "low", sprintId: demoSprint.id, assigneeId: demoUser.id, labelIds: [seedLabels[2].id] },
];

const seedIssues: Issue[] = issueSeed.map((s, i) => ({
  id: `issue-${i + 1}`,
  number: i + 1,
  projectId: demoProject.id,
  orgId: demoOrg.id,
  title: s.title,
  type: (s.type || "task") as IssueType,
  status: (s.status || "todo") as IssueStatus,
  priority: (s.priority || "medium") as IssuePriority,
  assigneeId: s.assigneeId,
  reporterId: sandipUser.id,
  sprintId: s.sprintId,
  labelIds: s.labelIds || [],
  order: i * 1000,
  createdAt: new Date(Date.now() - (issueSeed.length - i) * 3600000).toISOString(),
  updatedAt: new Date(Date.now() - (issueSeed.length - i) * 1800000).toISOString(),
}));

const seedComment: Comment = {
  id: uuid(),
  issueId: "issue-3",
  authorId: demoUser.id,
  body: "Started implementation using `@dnd-kit/core`. Basic drag between columns works, need to handle persistence next.",
  edited: false,
  createdAt: new Date(Date.now() - 7200000).toISOString(),
  updatedAt: new Date(Date.now() - 7200000).toISOString(),
};

// ─── Store class ──────────────────────────────────────────────────────────────

export class ClientStore {
  users = new Map<string, User>([
    [sandipUser.id, sandipUser],
    [demoUser.id, demoUser],
  ]);
  orgs = new Map<string, Organization>([[demoOrg.id, demoOrg]]);
  members = new Map<string, OrgMember>([
    [member1.id, member1],
    [member2.id, member2],
  ]);
  invites = new Map<string, OrgInvite>();
  projects = new Map<string, Project>([[demoProject.id, demoProject]]);
  sprints = new Map<string, Sprint>([[demoSprint.id, demoSprint]]);
  labels = new Map<string, Label>(seedLabels.map(l => [l.id, l]));
  issues = new Map<string, Issue>(seedIssues.map(i => [i.id, i]));
  comments = new Map<string, Comment>([[seedComment.id, seedComment]]);
  activities = new Map<string, Activity>();
  attachments = new Map<string, Attachment>();
  issueCounters = new Map<string, number>([[demoProject.id, seedIssues.length]]);

  toSnapshot(): ClientStoreSnapshot {
    return {
      users: Array.from(this.users.values()),
      orgs: Array.from(this.orgs.values()),
      members: Array.from(this.members.values()),
      invites: Array.from(this.invites.values()),
      projects: Array.from(this.projects.values()),
      sprints: Array.from(this.sprints.values()),
      labels: Array.from(this.labels.values()),
      issues: Array.from(this.issues.values()),
      comments: Array.from(this.comments.values()),
      activities: Array.from(this.activities.values()),
      attachments: Array.from(this.attachments.values()),
      issueCounters: Array.from(this.issueCounters.entries()),
    };
  }

  hydrateFromSnapshot(snapshot: ClientStoreSnapshot) {
    this.users = new Map(snapshot.users.map(item => [item.id, item]));
    this.orgs = new Map(snapshot.orgs.map(item => [item.id, item]));
    this.members = new Map(snapshot.members.map(item => [item.id, item]));
    this.invites = new Map(snapshot.invites.map(item => [item.id, item]));
    this.projects = new Map(snapshot.projects.map(item => [item.id, item]));
    this.sprints = new Map(snapshot.sprints.map(item => [item.id, item]));
    this.labels = new Map(snapshot.labels.map(item => [item.id, item]));
    this.issues = new Map(snapshot.issues.map(item => [item.id, item]));
    this.comments = new Map(snapshot.comments.map(item => [item.id, item]));
    this.activities = new Map(snapshot.activities.map(item => [item.id, item]));
    this.attachments = new Map(snapshot.attachments.map(item => [item.id, item]));
    this.issueCounters = new Map(snapshot.issueCounters);
  }

  // ── Users ──
  getUser(id: string) { return this.users.get(id); }
  getUserByEmail(email: string) { return Array.from(this.users.values()).find(u => u.email === email); }
  upsertUser(data: Omit<User, "id"> & { id?: string }): User {
    const id = data.id || uuid();
    const user: User = { ...data, id };
    this.users.set(id, user);
    return user;
  }

  // ── Orgs ──
  getOrg(id: string) { return this.orgs.get(id); }
  getOrgBySlug(slug: string) { return Array.from(this.orgs.values()).find(o => o.slug === slug); }
  getOrgsForUser(userId: string): Organization[] {
    const ids = Array.from(this.members.values()).filter(m => m.userId === userId).map(m => m.orgId);
    return ids.map(id => this.orgs.get(id)).filter(Boolean) as Organization[];
  }
  createOrg(data: Omit<Organization, "id" | "createdAt">): Organization {
    const org: Organization = { ...data, id: uuid(), createdAt: new Date().toISOString() };
    this.orgs.set(org.id, org);
    return org;
  }
  updateOrg(id: string, patch: Partial<Organization>): Organization {
    const org = { ...this.orgs.get(id)!, ...patch };
    this.orgs.set(id, org);
    return org;
  }

  // ── Members ──
  getOrgMembers(orgId: string) { return Array.from(this.members.values()).filter(m => m.orgId === orgId); }
  getOrgMember(orgId: string, userId: string) {
    return Array.from(this.members.values()).find(m => m.orgId === orgId && m.userId === userId);
  }
  addOrgMember(orgId: string, userId: string, role: MemberRole): OrgMember {
    const m: OrgMember = { id: uuid(), orgId, userId, role, joinedAt: new Date().toISOString() };
    this.members.set(m.id, m);
    return m;
  }
  updateOrgMember(orgId: string, userId: string, role: MemberRole): OrgMember {
    const m = Array.from(this.members.values()).find(m => m.orgId === orgId && m.userId === userId)!;
    const updated = { ...m, role };
    this.members.set(m.id, updated);
    return updated;
  }
  removeOrgMember(orgId: string, userId: string) {
    const m = Array.from(this.members.values()).find(m => m.orgId === orgId && m.userId === userId);
    if (m) this.members.delete(m.id);
  }

  // ── Invites ──
  getInvite(token: string) { return Array.from(this.invites.values()).find(i => i.token === token); }
  getInvitesForOrg(orgId: string) { return Array.from(this.invites.values()).filter(i => i.orgId === orgId); }
  createInvite(data: Omit<OrgInvite, "id">): OrgInvite {
    const inv: OrgInvite = { ...data, id: uuid() };
    this.invites.set(inv.id, inv);
    return inv;
  }
  acceptInvite(token: string): OrgInvite {
    const inv = this.getInvite(token)!;
    const updated = { ...inv, acceptedAt: new Date().toISOString() };
    this.invites.set(inv.id, updated);
    return updated;
  }
  deleteInvite(id: string) { this.invites.delete(id); }

  // ── Projects ──
  getProject(id: string) { return this.projects.get(id); }
  getProjectsForOrg(orgId: string) { return Array.from(this.projects.values()).filter(p => p.orgId === orgId); }
  createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Project {
    const now = new Date().toISOString();
    const p: Project = { ...data, id: uuid(), createdAt: now, updatedAt: now };
    this.projects.set(p.id, p);
    this.issueCounters.set(p.id, 0);
    return p;
  }
  updateProject(id: string, patch: Partial<Project>): Project {
    const p = { ...this.projects.get(id)!, ...patch, updatedAt: new Date().toISOString() };
    this.projects.set(id, p);
    return p;
  }
  deleteProject(id: string) { this.projects.delete(id); }

  // ── Sprints ──
  getSprint(id: string) { return this.sprints.get(id); }
  getSprintsForProject(projectId: string) { return Array.from(this.sprints.values()).filter(s => s.projectId === projectId); }
  createSprint(data: Omit<Sprint, "id" | "createdAt">): Sprint {
    const s: Sprint = { ...data, id: uuid(), createdAt: new Date().toISOString() };
    this.sprints.set(s.id, s);
    return s;
  }
  updateSprint(id: string, patch: Partial<Sprint>): Sprint {
    const s = { ...this.sprints.get(id)!, ...patch };
    this.sprints.set(id, s);
    return s;
  }
  deleteSprint(id: string) { this.sprints.delete(id); }

  // ── Labels ──
  getLabelsForProject(projectId: string) { return Array.from(this.labels.values()).filter(l => l.projectId === projectId); }
  createLabel(data: Omit<Label, "id">): Label {
    const l: Label = { ...data, id: uuid() };
    this.labels.set(l.id, l);
    return l;
  }
  updateLabel(id: string, patch: Partial<Label>): Label {
    const l = { ...this.labels.get(id)!, ...patch };
    this.labels.set(id, l);
    return l;
  }
  deleteLabel(id: string) { this.labels.delete(id); }

  // ── Issues ──
  getIssue(id: string) { return this.issues.get(id); }
  getIssuesForProject(projectId: string) {
    return Array.from(this.issues.values())
      .filter(i => i.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }
  getIssuesForSprint(sprintId: string) {
    return Array.from(this.issues.values()).filter(i => i.sprintId === sprintId);
  }
  createIssue(data: Omit<Issue, "id" | "number" | "createdAt" | "updatedAt" | "order">): Issue {
    const counter = (this.issueCounters.get(data.projectId) || 0) + 1;
    this.issueCounters.set(data.projectId, counter);
    const maxOrder = Math.max(0, ...Array.from(this.issues.values()).filter(i => i.projectId === data.projectId).map(i => i.order));
    const now = new Date().toISOString();
    const issue: Issue = { ...data, id: uuid(), number: counter, order: maxOrder + 1000, createdAt: now, updatedAt: now };
    this.issues.set(issue.id, issue);
    return issue;
  }
  updateIssue(id: string, patch: Partial<Issue>): Issue {
    const issue = { ...this.issues.get(id)!, ...patch, updatedAt: new Date().toISOString() };
    this.issues.set(id, issue);
    return issue;
  }
  deleteIssue(id: string) { this.issues.delete(id); }
  bulkUpdateIssueOrder(updates: { id: string; order: number; status?: IssueStatus }[]) {
    updates.forEach(u => {
      const issue = this.issues.get(u.id);
      if (issue) this.issues.set(u.id, { ...issue, order: u.order, status: u.status ?? issue.status, updatedAt: new Date().toISOString() });
    });
  }

  // ── Comments ──
  getCommentsForIssue(issueId: string) {
    return Array.from(this.comments.values())
      .filter(c => c.issueId === issueId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  createComment(data: Omit<Comment, "id" | "createdAt" | "updatedAt" | "edited">): Comment {
    const now = new Date().toISOString();
    const c: Comment = { ...data, id: uuid(), edited: false, createdAt: now, updatedAt: now };
    this.comments.set(c.id, c);
    return c;
  }
  updateComment(id: string, body: string): Comment {
    const c = { ...this.comments.get(id)!, body, edited: true, updatedAt: new Date().toISOString() };
    this.comments.set(id, c);
    return c;
  }
  deleteComment(id: string) { this.comments.delete(id); }

  // ── Attachments ──
  getAttachmentsForIssue(issueId: string) {
    return Array.from(this.attachments.values())
      .filter(a => a.issueId === issueId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  createAttachment(data: Omit<Attachment, "id" | "createdAt">): Attachment {
    const attachment: Attachment = { ...data, id: uuid(), createdAt: new Date().toISOString() };
    this.attachments.set(attachment.id, attachment);
    return attachment;
  }
  deleteAttachment(id: string) { this.attachments.delete(id); }

  // ── Activity ──
  getActivityForIssue(issueId: string) {
    return Array.from(this.activities.values())
      .filter(a => a.issueId === issueId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  addActivity(data: Omit<Activity, "id" | "createdAt">): Activity {
    const a: Activity = { ...data, id: uuid(), createdAt: new Date().toISOString() };
    this.activities.set(a.id, a);
    return a;
  }

  // ── Stats ──
  getProjectStats(projectId: string) {
    const issues = this.getIssuesForProject(projectId);
    const sprints = this.getSprintsForProject(projectId);
    const total = issues.length;
    const done = issues.filter(i => i.status === "done").length;
    const inProgress = issues.filter(i => i.status === "in_progress").length;
    const todo = issues.filter(i => i.status === "todo").length;
    const inReview = issues.filter(i => i.status === "in_review").length;
    const activeSprint = sprints.find(s => s.status === "active");
    const sprintIssues = activeSprint ? issues.filter(i => i.sprintId === activeSprint.id) : [];
    const sprintDone = sprintIssues.filter(i => i.status === "done").length;
    return { total, done, inProgress, todo, inReview, activeSprint, sprintTotal: sprintIssues.length, sprintDone };
  }

  // ── Drive Export ──
  exportDatabase(orgId: string) {
    const org = this.getOrg(orgId)!;
    const projects = this.getProjectsForOrg(orgId);
    const members = this.getOrgMembers(orgId);
    const allIssues: Issue[] = [];
    const allSprints: Sprint[] = [];
    const allLabels: Label[] = [];
    const allComments: Comment[] = [];
    projects.forEach(p => {
      allIssues.push(...this.getIssuesForProject(p.id));
      allSprints.push(...this.getSprintsForProject(p.id));
      allLabels.push(...this.getLabelsForProject(p.id));
      allIssues.forEach(i => allComments.push(...this.getCommentsForIssue(i.id)));
    });
    return { version: "1.0", exportedAt: new Date().toISOString(), org, projects, members, issues: allIssues, sprints: allSprints, labels: allLabels, comments: allComments };
  }
}

// Singleton — shared across the whole app
export const store = new ClientStore();
