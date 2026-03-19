import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import {
  insertOrganizationSchema, insertProjectSchema, insertIssueSchema,
  insertCommentSchema, insertSprintSchema, insertLabelSchema
} from "@shared/schema";
import { getGoogleClientId } from "@shared/googleAuth";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Auth / Session ──────────────────────────────────────────────────────────

  app.get("/api/auth/google/config", (_req, res) => {
    const envGoogleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientId = getGoogleClientId(envGoogleClientId);
    res.json({
      configured: Boolean(envGoogleClientId),
      clientId: googleClientId,
    });
  });

  app.post("/api/auth/google", async (req, res) => {
    const { credential } = req.body as { credential?: string };
    const googleClientId = getGoogleClientId(process.env.GOOGLE_CLIENT_ID);

    if (!credential) return res.status(400).json({ error: "Missing Google credential" });

    let tokenInfoRes: Response;
    try {
      tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    } catch {
      return res.status(502).json({ error: "Google token verification unavailable" });
    }

    if (!tokenInfoRes.ok) return res.status(401).json({ error: "Invalid Google credential" });

    const tokenInfo = await tokenInfoRes.json() as {
      aud?: string;
      email?: string;
      name?: string;
      picture?: string;
      sub?: string;
      email_verified?: string;
    };

    if (tokenInfo.aud !== googleClientId) return res.status(401).json({ error: "Google client mismatch" });
    if (!tokenInfo.email || tokenInfo.email_verified !== "true") {
      return res.status(401).json({ error: "Google email is not verified" });
    }

    let user = await storage.getUserByEmail(tokenInfo.email);
    if (!user) {
      user = await storage.upsertUser({
        email: tokenInfo.email,
        name: tokenInfo.name || tokenInfo.email,
        avatar: tokenInfo.picture,
        googleId: tokenInfo.sub,
      });
    }

    (req.session as any).userId = user.id;
    res.json(user);
  });

  app.post("/api/auth/demo", async (req, res) => {
    const user = await storage.getUserByEmail("sandipwalke05@gmail.com");
    if (!user) return res.status(404).json({ error: "Not found" });
    (req.session as any).userId = user.id;
    res.json(user);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", async (req, res) => {
    const uid = (req.session as any)?.userId;
    if (!uid) return res.status(401).json({ error: "Not authenticated" });
    const user = await storage.getUser(uid);
    if (!user) return res.status(401).json({ error: "User not found" });
    res.json(user);
  });

  app.get("/api/snapshots/:email", async (req, res) => {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email required" });
    const snapshot = await storage.getUserSnapshot(email);
    res.json({ snapshot: snapshot ?? null });
  });

  app.put("/api/snapshots/:email", async (req, res) => {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email required" });
    if (typeof req.body !== "object" || req.body === null) {
      return res.status(400).json({ error: "Snapshot object required" });
    }
    await storage.upsertUserSnapshot(email, req.body);
    res.json({ ok: true });
  });

  // ── Users ───────────────────────────────────────────────────────────────────

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  });

  // ── Organizations ───────────────────────────────────────────────────────────

  app.get("/api/orgs", async (req, res) => {
    const uid = (req.session as any)?.userId || "user-sandip";
    const orgs = await storage.getOrgsForUser(uid);
    res.json(orgs);
  });

  app.get("/api/orgs/:id", async (req, res) => {
    const org = await storage.getOrg(req.params.id);
    if (!org) return res.status(404).json({ error: "Not found" });
    res.json(org);
  });

  app.post("/api/orgs", async (req, res) => {
    const uid = (req.session as any)?.userId || "user-sandip";
    const parsed = insertOrganizationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const existing = await storage.getOrgBySlug(parsed.data.slug);
    if (existing) return res.status(409).json({ error: "Slug already taken" });
    const org = await storage.createOrg({ ...parsed.data, ownerId: uid });
    await storage.addOrgMember(org.id, uid, "owner");
    res.status(201).json(org);
  });

  app.patch("/api/orgs/:id", async (req, res) => {
    const org = await storage.updateOrg(req.params.id, req.body);
    res.json(org);
  });

  // ── Org Members ─────────────────────────────────────────────────────────────

  app.get("/api/orgs/:orgId/members", async (req, res) => {
    const members = await storage.getOrgMembers(req.params.orgId);
    // Enrich with user data
    const enriched = await Promise.all(members.map(async m => ({
      ...m,
      user: await storage.getUser(m.userId),
    })));
    res.json(enriched);
  });

  app.post("/api/orgs/:orgId/members", async (req, res) => {
    const { userId, role } = req.body;
    const m = await storage.addOrgMember(req.params.orgId, userId, role);
    res.status(201).json(m);
  });

  app.patch("/api/orgs/:orgId/members/:userId", async (req, res) => {
    const m = await storage.updateOrgMember(req.params.orgId, req.params.userId, req.body.role);
    res.json(m);
  });

  app.delete("/api/orgs/:orgId/members/:userId", async (req, res) => {
    await storage.removeOrgMember(req.params.orgId, req.params.userId);
    res.json({ ok: true });
  });

  // ── Invites ─────────────────────────────────────────────────────────────────

  app.get("/api/orgs/:orgId/invites", async (req, res) => {
    const invites = await storage.getInvitesForOrg(req.params.orgId);
    res.json(invites);
  });

  app.post("/api/orgs/:orgId/invites", async (req, res) => {
    const uid = (req.session as any)?.userId || "user-sandip";
    const { email, role } = req.body;
    const invite = await storage.createInvite({
      orgId: req.params.orgId,
      email,
      role: role || "member",
      token: randomUUID(),
      invitedBy: uid,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      accepted: false,
    });
    res.status(201).json(invite);
  });

  app.post("/api/invites/:token/accept", async (req, res) => {
    const uid = (req.session as any)?.userId || "user-sandip";
    const invite = await storage.getInvite(req.params.token);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.accepted) return res.status(409).json({ error: "Already accepted" });
    await storage.acceptInvite(req.params.token);
    await storage.addOrgMember(invite.orgId, uid, invite.role);
    res.json({ ok: true, orgId: invite.orgId });
  });

  app.delete("/api/orgs/:orgId/invites/:id", async (req, res) => {
    await storage.deleteInvite(req.params.id);
    res.json({ ok: true });
  });

  // ── Projects ─────────────────────────────────────────────────────────────────

  app.get("/api/orgs/:orgId/projects", async (req, res) => {
    const projects = await storage.getProjectsForOrg(req.params.orgId);
    res.json(projects);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const p = await storage.getProject(req.params.id);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  });

  app.post("/api/orgs/:orgId/projects", async (req, res) => {
    const uid = (req.session as any)?.userId || "user-sandip";
    const parsed = insertProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const proj = await storage.createProject({ ...parsed.data, orgId: req.params.orgId, leadId: uid });
    res.status(201).json(proj);
  });

  app.patch("/api/projects/:id", async (req, res) => {
    const p = await storage.updateProject(req.params.id, req.body);
    res.json(p);
  });

  app.delete("/api/projects/:id", async (req, res) => {
    await storage.deleteProject(req.params.id);
    res.json({ ok: true });
  });

  // ── Sprints ──────────────────────────────────────────────────────────────────

  app.get("/api/projects/:projectId/sprints", async (req, res) => {
    const sprints = await storage.getSprintsForProject(req.params.projectId);
    res.json(sprints);
  });

  app.post("/api/projects/:projectId/sprints", async (req, res) => {
    const parsed = insertSprintSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const sprint = await storage.createSprint({
      ...parsed.data,
      projectId: req.params.projectId,
      orgId: req.body.orgId,
      status: "planning",
    });
    res.status(201).json(sprint);
  });

  app.patch("/api/sprints/:id", async (req, res) => {
    const s = await storage.updateSprint(req.params.id, req.body);
    res.json(s);
  });

  app.delete("/api/sprints/:id", async (req, res) => {
    await storage.deleteSprint(req.params.id);
    res.json({ ok: true });
  });

  // ── Labels ───────────────────────────────────────────────────────────────────

  app.get("/api/projects/:projectId/labels", async (req, res) => {
    const labels = await storage.getLabelsForProject(req.params.projectId);
    res.json(labels);
  });

  app.post("/api/projects/:projectId/labels", async (req, res) => {
    const parsed = insertLabelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const label = await storage.createLabel({ ...parsed.data, projectId: req.params.projectId });
    res.status(201).json(label);
  });

  app.patch("/api/labels/:id", async (req, res) => {
    const l = await storage.updateLabel(req.params.id, req.body);
    res.json(l);
  });

  app.delete("/api/labels/:id", async (req, res) => {
    await storage.deleteLabel(req.params.id);
    res.json({ ok: true });
  });

  // ── Issues ───────────────────────────────────────────────────────────────────

  app.get("/api/projects/:projectId/issues", async (req, res) => {
    const issues = await storage.getIssuesForProject(req.params.projectId);
    res.json(issues);
  });

  app.get("/api/issues/:id", async (req, res) => {
    const issue = await storage.getIssue(req.params.id);
    if (!issue) return res.status(404).json({ error: "Not found" });
    res.json(issue);
  });

  app.post("/api/projects/:projectId/issues", async (req, res) => {
    const uid = (req.session as any)?.userId || "user-sandip";
    const parsed = insertIssueSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const proj = await storage.getProject(req.params.projectId);
    if (!proj) return res.status(404).json({ error: "Project not found" });
    const issue = await storage.createIssue({
      ...parsed.data,
      projectId: req.params.projectId,
      orgId: proj.orgId,
      reporterId: uid,
    });
    await storage.addActivity({ issueId: issue.id, userId: uid, type: "created", meta: { title: issue.title } });
    res.status(201).json(issue);
  });

  app.patch("/api/issues/:id", async (req, res) => {
    const uid = (req.session as any)?.userId || "user-sandip";
    const existing = await storage.getIssue(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const updated = await storage.updateIssue(req.params.id, req.body);

    // Track activity
    if (req.body.status && req.body.status !== existing.status) {
      await storage.addActivity({ issueId: existing.id, userId: uid, type: "status_change", meta: { from: existing.status, to: req.body.status } });
    }
    if (req.body.assigneeId !== undefined && req.body.assigneeId !== existing.assigneeId) {
      await storage.addActivity({ issueId: existing.id, userId: uid, type: "assignee_change", meta: { from: existing.assigneeId || "", to: req.body.assigneeId || "" } });
    }
    if (req.body.priority && req.body.priority !== existing.priority) {
      await storage.addActivity({ issueId: existing.id, userId: uid, type: "priority_change", meta: { from: existing.priority, to: req.body.priority } });
    }
    res.json(updated);
  });

  app.delete("/api/issues/:id", async (req, res) => {
    await storage.deleteIssue(req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/issues/bulk-order", async (req, res) => {
    await storage.bulkUpdateIssueOrder(req.body.updates);
    res.json({ ok: true });
  });

  // ── Comments ─────────────────────────────────────────────────────────────────

  app.get("/api/issues/:issueId/comments", async (req, res) => {
    const comments = await storage.getCommentsForIssue(req.params.issueId);
    const enriched = await Promise.all(comments.map(async c => ({
      ...c,
      author: await storage.getUser(c.authorId),
    })));
    res.json(enriched);
  });

  app.post("/api/issues/:issueId/comments", async (req, res) => {
    const uid = (req.session as any)?.userId || "user-sandip";
    const parsed = insertCommentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const comment = await storage.createComment({ issueId: req.params.issueId, authorId: uid, body: parsed.data.body });
    await storage.addActivity({ issueId: req.params.issueId, userId: uid, type: "comment", meta: { commentId: comment.id } });
    const author = await storage.getUser(uid);
    res.status(201).json({ ...comment, author });
  });

  app.patch("/api/comments/:id", async (req, res) => {
    const comment = await storage.updateComment(req.params.id, req.body.body);
    res.json(comment);
  });

  app.delete("/api/comments/:id", async (req, res) => {
    await storage.deleteComment(req.params.id);
    res.json({ ok: true });
  });

  // ── Activity ──────────────────────────────────────────────────────────────────

  app.get("/api/issues/:issueId/activity", async (req, res) => {
    const activities = await storage.getActivityForIssue(req.params.issueId);
    const enriched = await Promise.all(activities.map(async a => ({
      ...a,
      user: await storage.getUser(a.userId),
    })));
    res.json(enriched);
  });

  // ── Attachments ───────────────────────────────────────────────────────────────

  app.get("/api/issues/:issueId/attachments", async (req, res) => {
    const attachments = await storage.getAttachmentsForIssue(req.params.issueId);
    res.json(attachments);
  });

  app.post("/api/issues/:issueId/attachments", async (req, res) => {
    const uid = (req.session as any)?.userId || "user-sandip";
    const attachment = await storage.addAttachment({ ...req.body, issueId: req.params.issueId, uploaderId: uid });
    res.status(201).json(attachment);
  });

  app.delete("/api/attachments/:id", async (req, res) => {
    await storage.deleteAttachment(req.params.id);
    res.json({ ok: true });
  });

  // ── Google Drive Sync ─────────────────────────────────────────────────────────

  app.get("/api/orgs/:orgId/drive/export", async (req, res) => {
    const db = await storage.exportDatabase(req.params.orgId);
    res.json(db);
  });

  app.post("/api/orgs/:orgId/drive/import", async (req, res) => {
    await storage.importDatabase(req.body);
    res.json({ ok: true });
  });

  // ── Dashboard / Stats ─────────────────────────────────────────────────────────

  app.get("/api/projects/:projectId/stats", async (req, res) => {
    const issues = await storage.getIssuesForProject(req.params.projectId);
    const sprints = await storage.getSprintsForProject(req.params.projectId);
    const activeSprint = sprints.find(s => s.status === "active");
    const sprintIssues = activeSprint ? issues.filter(i => i.sprintId === activeSprint.id) : [];

    res.json({
      total: issues.length,
      byStatus: {
        todo: issues.filter(i => i.status === "todo").length,
        in_progress: issues.filter(i => i.status === "in_progress").length,
        in_review: issues.filter(i => i.status === "in_review").length,
        done: issues.filter(i => i.status === "done").length,
        cancelled: issues.filter(i => i.status === "cancelled").length,
      },
      byPriority: {
        urgent: issues.filter(i => i.priority === "urgent").length,
        high: issues.filter(i => i.priority === "high").length,
        medium: issues.filter(i => i.priority === "medium").length,
        low: issues.filter(i => i.priority === "low").length,
      },
      byType: {
        task: issues.filter(i => i.type === "task").length,
        bug: issues.filter(i => i.type === "bug").length,
        story: issues.filter(i => i.type === "story").length,
        epic: issues.filter(i => i.type === "epic").length,
      },
      activeSprint,
      sprintProgress: sprintIssues.length > 0 ? {
        total: sprintIssues.length,
        done: sprintIssues.filter(i => i.status === "done").length,
        inProgress: sprintIssues.filter(i => i.status === "in_progress").length,
      } : null,
    });
  });

  return httpServer;
}
