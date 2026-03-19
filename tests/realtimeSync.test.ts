import test from "node:test";
import assert from "node:assert/strict";
import { stampSnapshot, shouldApplyIncomingSnapshot, readSyncMeta } from "../client/src/lib/realtimeSync";
import type { ClientStoreSnapshot } from "../client/src/lib/store";

const baseSnapshot: ClientStoreSnapshot = {
  users: [],
  orgs: [],
  members: [],
  invites: [],
  projects: [],
  sprints: [],
  labels: [],
  issues: [],
  comments: [],
  activities: [],
  attachments: [],
  issueCounters: [],
};

test("stampSnapshot embeds sync metadata", () => {
  const now = new Date("2026-03-19T10:00:00.000Z");
  const stamped = stampSnapshot(baseSnapshot, "tab-a", now);
  const meta = readSyncMeta(stamped);

  assert.ok(meta);
  assert.equal(meta.sourceId, "tab-a");
  assert.equal(meta.updatedAt, now.toISOString());
});

test("shouldApplyIncomingSnapshot ignores self-originated payloads", () => {
  const now = new Date("2026-03-19T10:00:00.000Z");
  const local = stampSnapshot(baseSnapshot, "tab-a", now);
  const incoming = stampSnapshot(baseSnapshot, "tab-a", new Date("2026-03-19T10:01:00.000Z"));

  assert.equal(shouldApplyIncomingSnapshot(local, incoming, "tab-a"), false);
});

test("shouldApplyIncomingSnapshot accepts newer external payloads", () => {
  const local = stampSnapshot(baseSnapshot, "tab-a", new Date("2026-03-19T10:00:00.000Z"));
  const incoming = stampSnapshot(baseSnapshot, "tab-b", new Date("2026-03-19T10:01:00.000Z"));

  assert.equal(shouldApplyIncomingSnapshot(local, incoming, "tab-a"), true);
});

test("shouldApplyIncomingSnapshot rejects stale payloads", () => {
  const local = stampSnapshot(baseSnapshot, "tab-a", new Date("2026-03-19T10:01:00.000Z"));
  const incoming = stampSnapshot(baseSnapshot, "tab-b", new Date("2026-03-19T10:00:00.000Z"));

  assert.equal(shouldApplyIncomingSnapshot(local, incoming, "tab-a"), false);
});
