# Jira + monday.com Feature Matrix and Janjira Implementation Plan

_Last updated: 2026-03-19._

This document breaks down feature families from Jira and monday.com, maps them to Janjira, and marks implementation status.

## 1) Core planning and delivery features

| Feature family | Jira | monday.com | Janjira status |
|---|---|---|---|
| Backlog management | Native backlog for prioritization and sprint assignment | Board-based backlog equivalents | ✅ Implemented (`BacklogPage`, sprint assignment) |
| Scrum/Kanban boards | Scrum + Kanban boards with drag/drop and workflow states | Kanban + table + timeline boards | ✅ Implemented (`BoardPage`) |
| Sprints | Sprint planning, active sprint tracking, velocity contexts | Sprint-like cycles via boards/workflows | ✅ Implemented (`SprintsPage`) |
| Roadmap/timeline | Timeline dependencies and higher-level planning | Timeline/Gantt views | ✅ Implemented (`RoadmapPage`, `TimelinePage`) |
| Issue/task types | Story/bug/task/epic/subtask models | Item + subitem models | ✅ Implemented (`IssueType`) |
| Workload/capacity visibility | Team workload insights | Workload widget | 🟡 Partial (basic reports only) |

## 2) Workflow and automation features

| Feature family | Jira | monday.com | Janjira status |
|---|---|---|---|
| Custom statuses/workflows | Workflow customization and transitions | Board automations and status columns | 🟡 Partial (fixed statuses, no custom workflows) |
| Rules/automation | No-code automation rules | Recipe-based automations | ❌ Missing |
| Dependency management | Blocking/dependent issue visualization | Gantt dependencies | 🟡 Partial (timeline support exists, no explicit dependency links) |

## 3) Collaboration and execution features

| Feature family | Jira | monday.com | Janjira status |
|---|---|---|---|
| Comments/activity feed | Per-issue comments + change history | Updates and activity log | ✅ Implemented |
| Attachments/files | File attachments and app links | Files column and updates | ✅ Implemented |
| Mentions/notifications | @mentions and notification routing | Inbox/notification center | ❌ Missing |
| Docs/knowledge linking | Tight Confluence integrations | monday docs/workdocs | 🟡 Partial (markdown descriptions/comments only) |

## 4) Reporting, governance, and platform features

| Feature family | Jira | monday.com | Janjira status |
|---|---|---|---|
| Dashboards/charts | Dashboards + contextual insights | Dashboard widgets | ✅ Implemented (`DashboardPage`, `ReportsPage`) |
| Permissions/roles | Project/org permissions and controls | Workspace/team/board permissions | ✅ Implemented (owner/admin/member/viewer roles) |
| Integrations/ecosystem | Atlassian Marketplace + dev toolchain | Integration marketplace + automations | 🟡 Partial (Google Drive sync available) |
| Enterprise security and compliance | SSO/SAML/data controls | Enterprise controls and governance | ❌ Missing |

## 5) Remaining features prioritized for Janjira

### Implemented in this update
1. **Real-time state sync foundation**
   - Cross-tab synchronization via `storage` + `BroadcastChannel` listeners.
   - Poll-based reconciliation with server snapshots for authenticated users.
   - Last-write-wins conflict guard using snapshot metadata.
2. **Sync test coverage**
   - Unit tests for metadata stamping and conflict-resolution decisions.

### Still pending (next increments)
1. **No-code automation recipes** (status transitions, SLA reminders, auto-assign).
2. **Dependency links** (`blocks`, `blocked_by`, `relates_to`) in issue model + UI.
3. **Mentions and notifications** (activity-triggered inbox).
4. **Workload balancing widgets** (capacity by assignee/sprint).
5. **Advanced permission boundaries** (project-level scoping + audit events).

## 6) Test scenarios for real-time sync

1. **Cross-tab consistency**
   - Open same account in two tabs.
   - Create or update issue in Tab A.
   - Verify Tab B reflects change without refresh.
2. **Server reconciliation**
   - Login with same user from two sessions.
   - Update from session 1 and ensure session 2 receives data via polling sync.
3. **Conflict resolution**
   - Simulate stale incoming payload and verify it is ignored.
   - Simulate newer payload and verify local state hydrates from incoming snapshot.

## Sources
- Jira features overview (Atlassian): https://www.atlassian.com/software/jira/features/
- Jira agile overview (Atlassian): https://www.atlassian.com/software/jira/agile
- monday.com dashboards: https://monday.com/features/dashboards
- monday.com automations: https://monday.com/features/automations
