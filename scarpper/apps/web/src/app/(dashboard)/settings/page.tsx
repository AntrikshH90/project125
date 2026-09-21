"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Mail, ShieldCheck, ScrollText, Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useActiveWorkspace } from "@/lib/workspace-context";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";

interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { workspace } = useActiveWorkspace();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["members", workspace.id],
    queryFn: () => api.get<{ members: Member[]; invitations: Invitation[] }>(`/api/workspaces/${workspace.id}/members`)
  });

  const { data: audit } = useQuery({
    queryKey: ["audit", workspace.id],
    queryFn: () => api.get<AuditEntry[]>(`/api/workspaces/${workspace.id}/audit`).catch(() => []),
    retry: false
  });

  const invite = useMutation({
    mutationFn: () => api.post(`/api/workspaces/${workspace.id}/invitations`, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      toast.success(`Invitation created for ${inviteEmail} — share the token from the members list`);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => toast.error((err as Error).message)
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/api/workspaces/${workspace.id}/members/role`, { userId, role }),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => toast.error((err as Error).message)
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => api.del(`/api/workspaces/${workspace.id}/members/${userId}`),
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => toast.error((err as Error).message)
  });

  const roleBadge = (role: string) =>
    role === "owner" ? "default" : role === "admin" ? "success" : role === "viewer" ? "secondary" : "outline";

  return (
    <div className="p-6">
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team"><Users className="mr-1.5 h-3.5 w-3.5" /> Team</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="mr-1.5 h-3.5 w-3.5" /> Audit trail</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="border-b border-graphite-700 px-5 py-3.5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-text">
                  <ShieldCheck className="h-4 w-4 text-amber-accent" /> Members & roles
                </h3>
              </div>
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersData?.members.map((m) => (
                      <TableRow key={m.userId}>
                        <TableCell>
                          <p className="font-medium text-slate-text">{m.name}</p>
                          <p className="text-[11px] text-slate-dim">{m.email}</p>
                        </TableCell>
                        <TableCell>
                          {m.role === "owner" ? (
                            <Badge variant={roleBadge(m.role)}>owner</Badge>
                          ) : (
                            <Select value={m.role} onValueChange={(role) => changeRole.mutate({ userId: m.userId, role })}>
                              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">admin</SelectItem>
                                <SelectItem value="member">member</SelectItem>
                                <SelectItem value="viewer">viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-dim">{timeAgo(m.joinedAt)}</TableCell>
                        <TableCell>
                          {m.role !== "owner" && (
                            <Button variant="ghost" size="icon" onClick={() => removeMember.mutate(m.userId)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            <div className="space-y-5">
              <Card className="p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-text">
                  <Mail className="h-4 w-4 text-amber-accent" /> Invite teammate
                </h3>
                <p className="mt-1 text-[11px] text-slate-dim">
                  Creates a 7-day invitation token. The invitee accepts it via <code className="font-mono text-amber-400">POST /api/invitations/respond</code>.
                </p>
                <div className="mt-3 space-y-2">
                  <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@lab.org" type="email" />
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="member">member</SelectItem>
                      <SelectItem value="viewer">viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="w-full" onClick={() => invite.mutate()} disabled={invite.isPending || !inviteEmail}>
                    {invite.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create invitation
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-slate-text">Pending invitations</h3>
                <div className="mt-3 space-y-2">
                  {(membersData?.invitations ?? []).length === 0 && (
                    <p className="text-xs text-zinc-600">No pending invitations.</p>
                  )}
                  {membersData?.invitations.map((inv) => (
                    <div key={inv.id} className="rounded-md border border-graphite-700 p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-text">{inv.email}</span>
                        <Badge variant="secondary">{inv.role}</Badge>
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-zinc-600">token: {inv.id.slice(0, 18)}… · expires {timeAgo(inv.expiresAt)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(audit ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-xs text-zinc-600">
                      No audit entries visible (admins only).
                    </TableCell>
                  </TableRow>
                )}
                {(audit ?? []).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">{entry.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-dim">{entry.actorEmail ?? "system"}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-dim">
                      {entry.targetType ? `${entry.targetType}:${entry.targetId?.slice(0, 8)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-dim">{timeAgo(entry.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
