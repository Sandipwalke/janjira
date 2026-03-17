import { useState } from "react";
import { useStore, useOrg, useOrgMembers, useOrgInvites, useUsers } from "@/lib/storeContext";
import { Plus, Mail, Crown, Shield, User, Eye, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatRelative } from "@/lib/utils";
import type { MemberRole } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface Props { orgId: string; }

const ROLE_ICONS: Record<MemberRole, React.ReactNode> = {
  owner: <Crown className="w-3 h-3 text-yellow-500" />,
  admin: <Shield className="w-3 h-3 text-blue-500" />,
  member: <User className="w-3 h-3 text-muted-foreground" />,
  viewer: <Eye className="w-3 h-3 text-muted-foreground" />,
};

const ROLE_COLORS: Record<MemberRole, string> = {
  owner: "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10",
  admin: "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-500/10",
  member: "border-border text-muted-foreground",
  viewer: "border-border text-muted-foreground",
};

export default function MembersPage({ orgId }: Props) {
  const { store, refresh } = useStore();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [copied, setCopied] = useState<string | null>(null);

  const members = useOrgMembers(orgId);
  const invites = useOrgInvites(orgId);
  const allUsers = useUsers();
  const org = useOrg(orgId);

  const initials = (name?: string) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  const createInvite = () => {
    if (!inviteEmail.trim()) return;
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    store.createInvite({ orgId, email: inviteEmail, role: inviteRole as any, token, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+7*86400000).toISOString() });
    refresh(); setInviteEmail(""); toast({ title: "Invite created", description: `Token: ${token}` });
  };
  const removeInvite = (id: string) => { store.deleteInvite(id); refresh(); };
  const removeMember = (userId: string) => { store.removeOrgMember(orgId, userId); refresh(); };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/#/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <h2 className="text-base font-semibold flex-1" style={{ fontFamily: "var(--font-display)" }}>Members</h2>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setInviteOpen(true)} data-testid="button-invite-member">
          <Plus className="w-3.5 h-3.5" />
          Invite Member
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-6">
        {/* Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Team Members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 px-6 py-3" data-testid={`member-row-${m.userId}`}>
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={m.user?.avatar} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(m.user?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.user?.email}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1 capitalize ${ROLE_COLORS[m.role as MemberRole]}`}>
                    {ROLE_ICONS[m.role as MemberRole]}
                    {m.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:block">Joined {formatRelative(m.joinedAt)}</span>
                  {m.role !== "owner" && (
                    <Button
                      variant="ghost" size="icon"
                      className="w-7 h-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember(m.userId)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invites */}
        {invites.filter((i: any) => !i.accepted).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pending Invites</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {invites.filter((i: any) => !i.accepted).map((invite: any) => (
                  <div key={invite.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-9 h-9 rounded-full bg-muted/50 border border-dashed border-border flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">Expires {formatRelative(invite.expiresAt)}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 capitalize ${ROLE_COLORS[invite.role as MemberRole]}`}>
                      {invite.role}
                    </Badge>
                    <Button
                      variant="ghost" size="icon"
                      className="w-7 h-7 text-muted-foreground hover:text-primary"
                      onClick={() => copyInviteLink(invite.token)}
                      title="Copy invite link"
                    >
                      {copied === invite.token ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="w-7 h-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeInvite(invite.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role legend */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Role Permissions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><Crown className="w-3.5 h-3.5 text-yellow-500" /><strong>Owner</strong> — Full access, billing, delete org</p>
              <p className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-blue-500" /><strong>Admin</strong> — Manage members, projects, sprints</p>
              <p className="flex items-center gap-2"><User className="w-3.5 h-3.5" /><strong>Member</strong> — Create and edit issues, comment</p>
              <p className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" /><strong>Viewer</strong> — Read-only access</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm" data-testid="invite-dialog">
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5">Email address</label>
              <Input
                type="email" placeholder="colleague@company.com"
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Role</label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as MemberRole)}>
                <SelectTrigger data-testid="select-invite-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={() => createInvite()} disabled={!inviteEmail || false} data-testid="button-send-invite">
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
