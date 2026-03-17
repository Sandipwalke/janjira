import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import { StoreProvider } from "./lib/storeContext";
import { useState, useEffect } from "react";
import AppSidebar from "@/components/AppSidebar";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import BoardPage from "@/pages/BoardPage";
import BacklogPage from "@/pages/BacklogPage";
import IssuesPage from "@/pages/IssuesPage";
import IssueDetailPage from "@/pages/IssueDetailPage";
import SprintsPage from "@/pages/SprintsPage";
import RoadmapPage from "@/pages/RoadmapPage";
import MembersPage from "@/pages/MembersPage";
import DriveSettingsPage from "@/pages/DriveSettingsPage";
import NewProjectPage from "@/pages/NewProjectPage";
import ReportsPage from "@/pages/ReportsPage";
import TimelinePage from "@/pages/TimelinePage";
import CalendarPage from "@/pages/CalendarPage";
import LabelsPage from "@/pages/LabelsPage";
import ProjectSettingsPage from "@/pages/ProjectSettingsPage";
import OrgSettingsPage from "@/pages/OrgSettingsPage";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

// Theme management
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  return { theme, toggle };
}

// Extract route params from hash-based routes
function useRouteParams() {
  const [loc] = useHashLocation();
  const orgMatch = loc.match(/^\/org\/([^/]+)/);
  const projMatch = loc.match(/\/project\/([^/]+)/);
  const issueMatch = loc.match(/\/issue\/([^/]+)/);
  return {
    orgId: orgMatch?.[1] || null,
    projectId: projMatch?.[1] || null,
    issueId: issueMatch?.[1] || null,
  };
}

function AppRouter() {
  const { theme, toggle } = useTheme();
  const { orgId, projectId, issueId } = useRouteParams();
  const [loc, setLoc] = useHashLocation();
  const { user, loading } = useAuth();

  // Redirect unauthenticated users to /login (except from /login itself)
  useEffect(() => {
    if (!loading && !user && loc !== "/login") {
      setLoc("/login");
    } else if (!loading && user && (loc === "/" || loc === "/login")) {
      setLoc("/org/org-demo/dashboard");
    }
  }, [loading, user, loc]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="6" height="6" rx="1.5" fill="white"/>
              <rect x="10" y="2" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="2" y="10" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="10" y="10" width="6" height="6" rx="1.5" fill="white" opacity="0.3"/>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Loading Janjira…</p>
        </div>
      </div>
    );
  }

  // Decide if we should show sidebar layout
  const showSidebar = !!user && !!orgId;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {showSidebar && (
        <AppSidebar
          orgId={orgId!}
          projectId={projectId}
          theme={theme}
          onToggleTheme={toggle}
        />
      )}
      <main className={showSidebar ? "flex-1 overflow-hidden" : "flex-1"}>
        <Switch>
          {/* Auth */}
          <Route path="/" component={() => {
            const [, setLoc] = useHashLocation();
            useEffect(() => {
              if (!user) setLoc("/login");
              else setLoc("/org/org-demo/dashboard");
            }, [user]);
            return null;
          }} />
          <Route path="/login" component={LoginPage} />

          {/* Org-level routes */}
          <Route path="/org/:orgId/dashboard">
            {(p) => <DashboardPage orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/members">
            {(p) => <MembersPage orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/drive">
            {(p) => <DriveSettingsPage orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/settings">
            {(p) => <OrgSettingsPage orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/new-project">
            {(p) => <NewProjectPage orgId={p.orgId} />}
          </Route>

          {/* Project-level routes */}
          <Route path="/org/:orgId/project/:projectId/board">
            {(p) => <BoardPage projectId={p.projectId} orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/project/:projectId/backlog">
            {(p) => <BacklogPage projectId={p.projectId} orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/project/:projectId/issues">
            {(p) => <IssuesPage projectId={p.projectId} orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/project/:projectId/sprints">
            {(p) => <SprintsPage projectId={p.projectId} orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/project/:projectId/roadmap">
            {(p) => <RoadmapPage projectId={p.projectId} orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/project/:projectId/timeline">
            {(p) => <TimelinePage projectId={p.projectId} orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/project/:projectId/calendar">
            {(p) => <CalendarPage projectId={p.projectId} orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/project/:projectId/reports">
            {(p) => <ReportsPage projectId={p.projectId} orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/project/:projectId/labels">
            {(p) => <LabelsPage projectId={p.projectId} orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/project/:projectId/settings">
            {(p) => <ProjectSettingsPage projectId={p.projectId} orgId={p.orgId} />}
          </Route>
          <Route path="/org/:orgId/project/:projectId/issue/:issueId">
            {(p) => <IssueDetailPage issueId={p.issueId} projectId={p.projectId} orgId={p.orgId} />}
          </Route>

          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;
