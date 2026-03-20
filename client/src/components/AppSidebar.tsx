import { Link, useLocation } from "wouter";
import { useOrg, useProjects } from "@/lib/storeContext";
import {
  LayoutDashboard, Layers, List, GitBranch, Map,
  Settings, Users, Plus, ChevronDown, LogOut, Moon, Sun,
  Inbox, Zap, FolderOpen, HardDrive, BarChart2, Calendar,
  Tag, Clock, Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { Organization, Project } from "@shared/schema";
import { useState } from "react";

interface Props {
  orgId: string;
  projectId: string | null;
  theme: string;
  onToggleTheme: () => void;
  className?: string;
  onNavigate?: () => void;
}

const NAV_ITEMS = (orgId: string, projectId: string) => [
  { label: "Board", href: `/org/${orgId}/project/${projectId}/board`, icon: Layers },
  { label: "Backlog", href: `/org/${orgId}/project/${projectId}/backlog`, icon: List },
  { label: "Issues", href: `/org/${orgId}/project/${projectId}/issues`, icon: Inbox },
  { label: "Sprints", href: `/org/${orgId}/project/${projectId}/sprints`, icon: GitBranch },
  { label: "Roadmap", href: `/org/${orgId}/project/${projectId}/roadmap`, icon: Map },
  { label: "Timeline", href: `/org/${orgId}/project/${projectId}/timeline`, icon: Clock },
  { label: "Calendar", href: `/org/${orgId}/project/${projectId}/calendar`, icon: Calendar },
  { label: "Reports", href: `/org/${orgId}/project/${projectId}/reports`, icon: BarChart2 },
  { label: "Labels", href: `/org/${orgId}/project/${projectId}/labels`, icon: Tag },
  { label: "Settings", href: `/org/${orgId}/project/${projectId}/settings`, icon: Sliders },
];

const ORG_ITEMS = (orgId: string) => [
  { label: "Dashboard", href: `/org/${orgId}/dashboard`, icon: LayoutDashboard },
  { label: "Members", href: `/org/${orgId}/members`, icon: Users },
  { label: "Drive Sync", href: `/org/${orgId}/drive`, icon: HardDrive },
  { label: "Settings", href: `/org/${orgId}/settings`, icon: Settings },
];

export default function AppSidebar({ orgId, projectId, theme, onToggleTheme, className, onNavigate }: Props) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [projectsOpen, setProjectsOpen] = useState(true);

  const org = useOrg(orgId);
  const projects = useProjects(orgId);

  const initials = (name?: string) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const handleNavigate = () => {
    onNavigate?.();
  };

  return (
    <aside className={cn("flex flex-col w-60 shrink-0 h-screen bg-sidebar border-r border-sidebar-border text-sidebar-foreground overflow-y-auto", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-label="Janjira">
            <rect x="2" y="2" width="6" height="6" rx="1.5" fill="white"/>
            <rect x="10" y="2" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
            <rect x="2" y="10" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
            <rect x="10" y="10" width="6" height="6" rx="1.5" fill="white" opacity="0.3"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground leading-none truncate">Janjira</p>
          <p className="text-xs text-sidebar-foreground/50 truncate mt-0.5">{org?.name || "…"}</p>
        </div>
        <Button
          variant="ghost" size="icon"
          className="w-7 h-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
          onClick={onToggleTheme}
          data-testid="theme-toggle"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Org nav */}
      <div className="px-2 pt-3 pb-1">
        <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40 mb-1">Workspace</p>
        {ORG_ITEMS(orgId).map(item => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
              location === item.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )} onClick={handleNavigate}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </a>
          </Link>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-sidebar-border" />

      {/* Projects */}
      <div className="px-2 flex-1">
        <button
          className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors mb-1"
          onClick={() => setProjectsOpen(p => !p)}
        >
          <span>Projects</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", projectsOpen ? "" : "-rotate-90")} />
        </button>

        {projectsOpen && projects.map(p => (
          <div key={p.id}>
            <Link href={`/org/${orgId}/project/${p.id}/board`}>
              <a className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
                p.id === projectId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )} onClick={handleNavigate}>
                <span
                  className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 text-white"
                  style={{ background: p.color }}
                >
                  {p.key.slice(0, 2)}
                </span>
                <span className="truncate">{p.name}</span>
              </a>
            </Link>
            {p.id === projectId && (
              <div className="ml-2 border-l border-sidebar-border pl-2 mb-1 mt-0.5">
                {NAV_ITEMS(orgId, p.id).map(item => (
                  <Link key={item.href} href={item.href}>
                    <a className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors cursor-pointer",
                      location === item.href
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )} onClick={handleNavigate}>
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
                      {item.label}
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        <Link href={`/org/${orgId}/new-project`}>
          <a className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/40 transition-colors cursor-pointer mt-1" onClick={handleNavigate}>
            <Plus className="w-4 h-4 shrink-0" />
            New Project
          </a>
        </Link>
      </div>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-sidebar-accent/60 transition-colors" data-testid="user-menu">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-sidebar-foreground truncate leading-none">{user?.name}</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate mt-0.5">{user?.email}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-sidebar-foreground/40 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48">
            <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <a
          href="https://www.perplexity.ai/computer"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-[10px] text-sidebar-foreground/25 hover:text-sidebar-foreground/40 transition-colors mt-2"
        >
          Created with Perplexity Computer
        </a>
      </div>
    </aside>
  );
}
