import { randomUUID } from "crypto";
import type {
  User, Organization, OrgMember, OrgInvite, Project, Sprint, Label,
  Issue, Comment, Activity, Attachment, DriveDatabase,
  IssueStatus, IssuePriority, IssueType, MemberRole
} from "@shared/schema";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IStorage {
  // Auth / Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: Omit<User, "id"> & { id?: string }): Promise<User>;

  // Orgs
  getOrg(id: string): Promise<Organization | undefined>;
  getOrgBySlug(slug: string): Promise<Organization | undefined>;
  getOrgsForUser(userId: string): Promise<Organization[]>;
  createOrg(org: Omit<Organization, "id" | "createdAt">): Promise<Organization>;
  updateOrg(id: string, patch: Partial<Organization>): Promise<Organization>;

  // Org Members
  getOrgMembers(orgId: string): Promise<OrgMember[]>;
  getOrgMember(orgId: string, userId: string): Promise<OrgMember | undefined>;
  addOrgMember(orgId: string, userId: string, role: MemberRole): Promise<OrgMember>;
  updateOrgMember(orgId: string, userId: string, role: MemberRole): Promise<OrgMember>;
  removeOrgMember(orgId: string, userId: string): Promise<void>;

  // Invites
  getInvite(token: string): Promise<OrgInvite | undefined>;
  getInvitesForOrg(orgId: string): Promise<OrgInvite[]>;
  createInvite(invite: Omit<OrgInvite, "id">): Promise<OrgInvite>;
  acceptInvite(token: string): Promise<OrgInvite>;
  deleteInvite(id: string): Promise<void>;

  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjectsForOrg(orgId: string): Promise<Project[]>;
  createProject(project: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project>;
  updateProject(id: string, patch: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Sprints
  getSprint(id: string): Promise<Sprint | undefined>;
  getSprintsForProject(projectId: string): Promise<Sprint[]>;
  createSprint(sprint: Omit<Sprint, "id" | "createdAt">): Promise<Sprint>;
  updateSprint(id: string, patch: Partial<Sprint>): Promise<Sprint>;
  deleteSprint(id: string): Promise<void>;

  // Labels
  getLabelsForProject(projectId: string): Promise<Label[]>;
  createLabel(label: Omit<Label, "id">): Promise<Label>;
  updateLabel(id: string, patch: Partial<Label>): Promise<Label>;
  deleteLabel(id: string): Promise<void>;

  // Issues
  getIssue(id: string): Promise<Issue | undefined>;
  getIssuesForProject(projectId: string): Promise<Issue[]>;
  getIssuesForSprint(sprintId: string): Promise<Issue[]>;
  createIssue(issue: Omit<Issue, "id" | "number" | "createdAt" | "updatedAt" | "order">): Promise<Issue>;
  updateIssue(id: string, patch: Partial<Issue>): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;
  bulkUpdateIssueOrder(updates: { id: string; order: number; status?: IssueStatus }[]): Promise<void>;

  // Comments
  getCommentsForIssue(issueId: string): Promise<Comment[]>;
  createComment(comment: Omit<Comment, "id" | "createdAt" | "updatedAt" | "edited">): Promise<Comment>;
  updateComment(id: string, body: string): Promise<Comment>;
  deleteComment(id: string): Promise<void>;

  // Activity
  getActivityForIssue(issueId: string): Promise<Activity[]>;
  addActivity(activity: Omit<Activity, "id" | "createdAt">): Promise<Activity>;

  // Attachments
  getAttachmentsForIssue(issueId: string): Promise<Attachment[]>;
  addAttachment(attachment: Omit<Attachment, "id" | "createdAt">): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;

  // Google Drive sync
  exportDatabase(orgId: string): Promise<DriveDatabase>;
  importDatabase(data: DriveDatabase): Promise<void>;

  // Per-user snapshot sync (for multi-device continuity)
  getUserSnapshot(email: string): Promise<unknown | undefined>;
  upsertUserSnapshot(email: string, snapshot: unknown): Promise<void>;
}

// ─── In-Memory Implementation ─────────────────────────────────────────────────

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private orgs = new Map<string, Organization>();
  private orgMembers = new Map<string, OrgMember>();
  private invites = new Map<string, OrgInvite>();
  private projects = new Map<string, Project>();
  private sprints = new Map<string, Sprint>();
  private labels = new Map<string, Label>();
  private issues = new Map<string, Issue>();
  private comments = new Map<string, Comment>();
  private activities = new Map<string, Activity>();
  private attachments = new Map<string, Attachment>();
  private issueCounters = new Map<string, number>();
  private userSnapshots = new Map<string, unknown>();

  constructor() { this._seed(); }

  private _seed() {
    // Demo user
    const demoUser: User = {
      id: "user-demo",
      email: "demo@janjira.app",
      name: "Demo User",
      avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=demo`,
    };
    const sandipUser: User = {
      id: "user-sandip",
      email: "sandipwalke05@gmail.com",
      name: "Sandip Walke",
      avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=sandip`,
    };
    this.users.set(demoUser.id, demoUser);
    this.users.set(sandipUser.id, sandipUser);

    // Demo org
    const org: Organization = {
      id: "org-demo",
      name: "Janjira Demo",
      slug: "janjira-demo",
      description: "Powered by Google Drive — free for everyone.",
      ownerId: sandipUser.id,
      createdAt: new Date().toISOString(),
    };
    this.orgs.set(org.id, org);
    const m1: OrgMember = { id: randomUUID(), orgId: org.id, userId: sandipUser.id, role: "owner", joinedAt: new Date().toISOString() };
    const m2: OrgMember = { id: randomUUID(), orgId: org.id, userId: demoUser.id, role: "member", joinedAt: new Date().toISOString() };
    this.orgMembers.set(m1.id, m1);
    this.orgMembers.set(m2.id, m2);

    // Demo project
    const proj: Project = {
      id: "proj-demo",
      orgId: org.id,
      name: "Janjira Platform",
      key: "JAN",
      description: "Core platform development",
      color: "#3B82F6",
      leadId: sandipUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(proj.id, proj);
    this.issueCounters.set(proj.id, 0);

    // Sprint
    const sprint: Sprint = {
      id: "sprint-1",
      projectId: proj.id,
      orgId: org.id,
      name: "Sprint 1",
      goal: "Ship core features",
      status: "active",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.sprints.set(sprint.id, sprint);

    // Labels
    const labelData = [
      { name: "frontend", color: "#8B5CF6" },
      { name: "backend", color: "#10B981" },
      { name: "design", color: "#F59E0B" },
      { name: "bug", color: "#EF4444" },
      { name: "docs", color: "#6B7280" },
    ];
    const labelIds: string[] = [];
    labelData.forEach(l => {
      const label: Label = { id: randomUUID(), projectId: proj.id, ...l };
      this.labels.set(label.id, label);
      labelIds.push(label.id);
    });

    // Seed issues
    const issuesSeed: Partial<Issue>[] = [
      { title: "Set up Google OAuth 2.0 login flow", type: "task", status: "done", priority: "urgent", sprintId: sprint.id, assigneeId: sandipUser.id, labelIds: [labelIds[1]] },
      { title: "Design sidebar navigation and layout", type: "story", status: "done", priority: "high", sprintId: sprint.id, assigneeId: demoUser.id, labelIds: [labelIds[2]] },
      { title: "Implement Kanban board with drag & drop", type: "task", status: "in_progress", priority: "high", sprintId: sprint.id, assigneeId: sandipUser.id, labelIds: [labelIds[0]] },
      { title: "Build Google Drive storage layer", type: "epic", status: "in_progress", priority: "urgent", sprintId: sprint.id, assigneeId: sandipUser.id, labelIds: [labelIds[1]] },
      { title: "Issue detail page with comments", type: "task", status: "in_review", priority: "medium", sprintId: sprint.id, assigneeId: demoUser.id, labelIds: [labelIds[0]] },
      { title: "Sprint planning & velocity tracking", type: "story", status: "todo", priority: "medium", sprintId: sprint.id, assigneeId: undefined, labelIds: [] },
      { title: "Org invite email flow", type: "task", status: "todo", priority: "low", sprintId: sprint.id, assigneeId: undefined, labelIds: [labelIds[1]] },
      { title: "Export issues to Google Sheets", type: "task", status: "todo", priority: "low", sprintId: undefined, assigneeId: undefined, labelIds: [labelIds[1], labelIds[4]] },
      { title: "Bug: drag-drop reorder fails on mobile", type: "bug", status: "todo", priority: "high", sprintId: sprint.id, assigneeId: sandipUser.id, labelIds: [labelIds[3]] },
      { title: "Write onboarding documentation", type: "task", status: "todo", priority: "none", sprintId: undefined, assigneeId: demoUser.id, labelIds: [labelIds[4]] },
      { title: "Roadmap view with epics timeline", type: "story", status: "todo", priority: "medium", sprintId: undefined, assigneeId: undefined, labelIds: [labelIds[0]] },
      { title: "Dark mode refinements", type: "task", status: "todo", priority: "low", sprintId: sprint.id, assigneeId: demoUser.id, labelIds: [labelIds[2]] },
    ];

    issuesSeed.forEach((seed, i) => {
      const num = i + 1;
      const issue: Issue = {
        id: `issue-${i + 1}`,
        number: num,
        projectId: proj.id,
        orgId: org.id,
        title: seed.title!,
        type: seed.type as IssueType,
        status: seed.status as IssueStatus,
        priority: seed.priority as IssuePriority,
        assigneeId: seed.assigneeId,
        reporterId: sandipUser.id,
        sprintId: seed.sprintId,
        labelIds: seed.labelIds || [],
        order: i * 1000,
        createdAt: new Date(Date.now() - (issuesSeed.length - i) * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - (issuesSeed.length - i) * 1800000).toISOString(),
      };
      this.issues.set(issue.id, issue);
      this.issueCounters.set(proj.id, num);
    });

    // Seed comment
    const comment: Comment = {
      id: randomUUID(),
      issueId: "issue-3",
      authorId: demoUser.id,
      body: "Started implementation using `@dnd-kit/core`. Basic drag between columns works, need to handle persistence next.",
      edited: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    };
    this.comments.set(comment.id, comment);
  }

  // ── Users ──
  async getUser(id: string) { return this.users.get(id); }
  async getUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return Array.from(this.users.values()).find(u => u.email.trim().toLowerCase() === normalized);
  }
  async upsertUser(data: Omit<User, "id"> & { id?: string }): Promise<User> {
    const id = data.id || randomUUID();
    const user: User = { ...data, id };
    this.users.set(id, user);
    return user;
  }

  // ── Orgs ──
  async getOrg(id: string) { return this.orgs.get(id); }
  async getOrgBySlug(slug: string) {
    return Array.from(this.orgs.values()).find(o => o.slug === slug);
  }
  async getOrgsForUser(userId: string): Promise<Organization[]> {
    const memberOrgIds = Array.from(this.orgMembers.values())
      .filter(m => m.userId === userId).map(m => m.orgId);
    return memberOrgIds.map(id => this.orgs.get(id)).filter(Boolean) as Organization[];
  }
  async createOrg(data: Omit<Organization, "id" | "createdAt">): Promise<Organization> {
    const org: Organization = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
    this.orgs.set(org.id, org);
    return org;
  }
  async updateOrg(id: string, patch: Partial<Organization>): Promise<Organization> {
    const org = this.orgs.get(id)!;
    const updated = { ...org, ...patch };
    this.orgs.set(id, updated);
    return updated;
  }

  // ── Org Members ──
  async getOrgMembers(orgId: string): Promise<OrgMember[]> {
    return Array.from(this.orgMembers.values()).filter(m => m.orgId === orgId);
  }
  async getOrgMember(orgId: string, userId: string) {
    return Array.from(this.orgMembers.values()).find(m => m.orgId === orgId && m.userId === userId);
  }
  async addOrgMember(orgId: string, userId: string, role: MemberRole): Promise<OrgMember> {
    const m: OrgMember = { id: randomUUID(), orgId, userId, role, joinedAt: new Date().toISOString() };
    this.orgMembers.set(m.id, m);
    return m;
  }
  async updateOrgMember(orgId: string, userId: string, role: MemberRole): Promise<OrgMember> {
    const m = Array.from(this.orgMembers.values()).find(m => m.orgId === orgId && m.userId === userId)!;
    const updated = { ...m, role };
    this.orgMembers.set(m.id, updated);
    return updated;
  }
  async removeOrgMember(orgId: string, userId: string) {
    const m = Array.from(this.orgMembers.values()).find(m => m.orgId === orgId && m.userId === userId);
    if (m) this.orgMembers.delete(m.id);
  }

  // ── Invites ──
  async getInvite(token: string) { return Array.from(this.invites.values()).find(i => i.token === token); }
  async getInvitesForOrg(orgId: string) { return Array.from(this.invites.values()).filter(i => i.orgId === orgId); }
  async createInvite(data: Omit<OrgInvite, "id">): Promise<OrgInvite> {
    const invite: OrgInvite = { ...data, id: randomUUID() };
    this.invites.set(invite.id, invite);
    return invite;
  }
  async acceptInvite(token: string): Promise<OrgInvite> {
    const invite = await this.getInvite(token);
    if (!invite) throw new Error("Invite not found");
    const updated = { ...invite, accepted: true };
    this.invites.set(invite.id, updated);
    return updated;
  }
  async deleteInvite(id: string) { this.invites.delete(id); }

  // ── Projects ──
  async getProject(id: string) { return this.projects.get(id); }
  async getProjectsForOrg(orgId: string) {
    return Array.from(this.projects.values()).filter(p => p.orgId === orgId);
  }
  async createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
    const proj: Project = { ...data, id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.projects.set(proj.id, proj);
    this.issueCounters.set(proj.id, 0);
    return proj;
  }
  async updateProject(id: string, patch: Partial<Project>): Promise<Project> {
    const p = this.projects.get(id)!;
    const updated = { ...p, ...patch, updatedAt: new Date().toISOString() };
    this.projects.set(id, updated);
    return updated;
  }
  async deleteProject(id: string) { this.projects.delete(id); }

  // ── Sprints ──
  async getSprint(id: string) { return this.sprints.get(id); }
  async getSprintsForProject(projectId: string) {
    return Array.from(this.sprints.values()).filter(s => s.projectId === projectId);
  }
  async createSprint(data: Omit<Sprint, "id" | "createdAt">): Promise<Sprint> {
    const sprint: Sprint = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
    this.sprints.set(sprint.id, sprint);
    return sprint;
  }
  async updateSprint(id: string, patch: Partial<Sprint>): Promise<Sprint> {
    const s = this.sprints.get(id)!;
    const updated = { ...s, ...patch };
    this.sprints.set(id, updated);
    return updated;
  }
  async deleteSprint(id: string) { this.sprints.delete(id); }

  // ── Labels ──
  async getLabelsForProject(projectId: string) {
    return Array.from(this.labels.values()).filter(l => l.projectId === projectId);
  }
  async createLabel(data: Omit<Label, "id">): Promise<Label> {
    const label: Label = { ...data, id: randomUUID() };
    this.labels.set(label.id, label);
    return label;
  }
  async updateLabel(id: string, patch: Partial<Label>): Promise<Label> {
    const l = this.labels.get(id)!;
    const updated = { ...l, ...patch };
    this.labels.set(id, updated);
    return updated;
  }
  async deleteLabel(id: string) { this.labels.delete(id); }

  // ── Issues ──
  async getIssue(id: string) { return this.issues.get(id); }
  async getIssuesForProject(projectId: string) {
    return Array.from(this.issues.values())
      .filter(i => i.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }
  async getIssuesForSprint(sprintId: string) {
    return Array.from(this.issues.values())
      .filter(i => i.sprintId === sprintId)
      .sort((a, b) => a.order - b.order);
  }
  async createIssue(data: Omit<Issue, "id" | "number" | "createdAt" | "updatedAt" | "order">): Promise<Issue> {
    const counter = (this.issueCounters.get(data.projectId) || 0) + 1;
    this.issueCounters.set(data.projectId, counter);
    const maxOrder = Math.max(0, ...Array.from(this.issues.values())
      .filter(i => i.projectId === data.projectId && i.status === data.status)
      .map(i => i.order));
    const issue: Issue = {
      ...data, id: randomUUID(), number: counter,
      order: maxOrder + 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.issues.set(issue.id, issue);
    return issue;
  }
  async updateIssue(id: string, patch: Partial<Issue>): Promise<Issue> {
    const i = this.issues.get(id)!;
    const updated = { ...i, ...patch, updatedAt: new Date().toISOString() };
    this.issues.set(id, updated);
    return updated;
  }
  async deleteIssue(id: string) { this.issues.delete(id); }
  async bulkUpdateIssueOrder(updates: { id: string; order: number; status?: IssueStatus }[]) {
    for (const u of updates) {
      const issue = this.issues.get(u.id);
      if (issue) {
        const patch: Partial<Issue> = { order: u.order };
        if (u.status) patch.status = u.status;
        this.issues.set(u.id, { ...issue, ...patch, updatedAt: new Date().toISOString() });
      }
    }
  }

  // ── Comments ──
  async getCommentsForIssue(issueId: string) {
    return Array.from(this.comments.values())
      .filter(c => c.issueId === issueId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async createComment(data: Omit<Comment, "id" | "createdAt" | "updatedAt" | "edited">): Promise<Comment> {
    const c: Comment = { ...data, id: randomUUID(), edited: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.comments.set(c.id, c);
    return c;
  }
  async updateComment(id: string, body: string): Promise<Comment> {
    const c = this.comments.get(id)!;
    const updated = { ...c, body, edited: true, updatedAt: new Date().toISOString() };
    this.comments.set(id, updated);
    return updated;
  }
  async deleteComment(id: string) { this.comments.delete(id); }

  // ── Activity ──
  async getActivityForIssue(issueId: string) {
    return Array.from(this.activities.values())
      .filter(a => a.issueId === issueId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async addActivity(data: Omit<Activity, "id" | "createdAt">): Promise<Activity> {
    const a: Activity = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
    this.activities.set(a.id, a);
    return a;
  }

  // ── Attachments ──
  async getAttachmentsForIssue(issueId: string) {
    return Array.from(this.attachments.values()).filter(a => a.issueId === issueId);
  }
  async addAttachment(data: Omit<Attachment, "id" | "createdAt">): Promise<Attachment> {
    const a: Attachment = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
    this.attachments.set(a.id, a);
    return a;
  }
  async deleteAttachment(id: string) { this.attachments.delete(id); }

  // ── Drive Export / Import ──
  async exportDatabase(orgId: string): Promise<DriveDatabase> {
    const org = this.orgs.get(orgId)!;
    return {
      version: 1,
      org,
      members: Array.from(this.orgMembers.values()).filter(m => m.orgId === orgId),
      invites: Array.from(this.invites.values()).filter(i => i.orgId === orgId),
      projects: Array.from(this.projects.values()).filter(p => p.orgId === orgId),
      sprints: Array.from(this.sprints.values()).filter(s => s.orgId === orgId),
      labels: Array.from(this.labels.values()),
      issues: Array.from(this.issues.values()).filter(i => i.orgId === orgId),
      comments: Array.from(this.comments.values()),
      activities: Array.from(this.activities.values()),
      attachments: Array.from(this.attachments.values()),
      lastSyncAt: new Date().toISOString(),
    };
  }
  async importDatabase(data: DriveDatabase): Promise<void> {
    this.orgs.set(data.org.id, data.org);
    data.members.forEach(m => this.orgMembers.set(m.id, m));
    data.invites.forEach(i => this.invites.set(i.id, i));
    data.projects.forEach(p => this.projects.set(p.id, p));
    data.sprints.forEach(s => this.sprints.set(s.id, s));
    data.labels.forEach(l => this.labels.set(l.id, l));
    data.issues.forEach(i => this.issues.set(i.id, i));
    data.comments.forEach(c => this.comments.set(c.id, c));
    data.activities.forEach(a => this.activities.set(a.id, a));
    data.attachments.forEach(a => this.attachments.set(a.id, a));
  }

  async getUserSnapshot(email: string): Promise<unknown | undefined> {
    return this.userSnapshots.get(email.toLowerCase());
  }

  async upsertUserSnapshot(email: string, snapshot: unknown): Promise<void> {
    this.userSnapshots.set(email.toLowerCase(), snapshot);
  }
}

export const storage = new MemStorage();
