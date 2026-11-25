import { initialWorkspace, roleDefinitions } from "./mock-data";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "./types";
import { apiRequest } from "@/lib/api-client";

let workspace: Workspace = initialWorkspace;
let workspaceId = "";
let roles: (typeof roleDefinitions)[number][] = roleDefinitions;
const listeners = new Set<() => void>();
function publish(next: Workspace) { workspace = next; listeners.forEach((listener) => listener()); }
const date = (v: string | Date) => new Date(v).toISOString().slice(0, 10);

async function hydrate() {
  const list = await apiRequest<Array<{id:string} & Partial<Workspace>>>("workspaces");
  if (!list.length) return;
  const selected = typeof window !== "undefined" ? sessionStorage.getItem("metrispot.workspace") : null;
  const chosen = list.find((w) => w.id === selected) ?? list[0];
  workspaceId = chosen.id;
  if (typeof window !== "undefined") sessionStorage.setItem("metrispot.workspace", workspaceId);
  const data = await apiRequest<any>(`workspaces/${workspaceId}`);
  roles = (data.roles ?? []).map((r: any) => ({ id:r.id, role:r.role, description:r.description ?? "", permissions:r.permissions ?? [], custom:r.custom }));
  publish({ ...data, createdAt: date(data.createdAt), members: data.members.map((m: any) => ({ ...m, joinedAt: date(m.joinedAt), lastActive: "—", status: m.status === "ACTIVE" ? "Active" : "Suspended" })), invitations: data.invitations.map((i: any) => ({ ...i, invitedAt: date(i.invitedAt), status: ({ PENDING:"Pending", ACCEPTED:"Accepted", EXPIRED:"Expired", REVOKED:"Revoked" } as Record<string,string>)[i.status] ?? i.status })), activity: data.activity.map((a: any) => ({ ...a, when: new Date(a.when).toLocaleString() })) });
}
async function reload() { if (workspaceId) { const data = await apiRequest<any>(`workspaces/${workspaceId}`); roles = data.roles.map((r: any) => ({ id:r.id, role:r.role, description:r.description ?? "", permissions:r.permissions ?? [], custom:r.custom })); publish({ ...data, createdAt: date(data.createdAt), members: data.members.map((m: any) => ({ ...m, joinedAt: date(m.joinedAt), lastActive:"—", status:m.status === "ACTIVE" ? "Active" : "Suspended" })), invitations:data.invitations.map((i:any)=>({...i,invitedAt:date(i.invitedAt),status:({PENDING:"Pending",ACCEPTED:"Accepted",EXPIRED:"Expired",REVOKED:"Revoked"} as Record<string,string>)[i.status]??i.status})),activity:data.activity.map((a:any)=>({...a,when:new Date(a.when).toLocaleString()})) }); } }

export const workspaceService = {
  initialize: hydrate,
  refresh: reload,
  getSnapshot: () => workspace,
  getServerSnapshot: () => initialWorkspace,
  /** Current workspace id ("" until initialize() resolves). */
  getId: () => workspaceId,
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
  getRoles: () => roles,
  async invite(name: string, email: string, role: WorkspaceRole, message?: string) {
    const selected = roles.find((r) => r.role === role);
    if (!selected?.id) throw new Error("This role is unavailable. Refresh and try again.");
    await apiRequest(`workspaces/${workspaceId}/invitations`, { method:"POST", body:{ email, displayName:name || undefined, message, roleId:selected.id } }); await reload();
  },
  async updateMember(id: string, update: Partial<Pick<WorkspaceMember,"role"|"status"|"name"|"email">>) {
    const member = workspace.members.find((m) => m.id === id); if (!member) return;
    if (update.role) { const role = roles.find((r) => r.role === update.role); await apiRequest(`workspaces/${workspaceId}/members/${id}/role`, {method:"PATCH",body:{roleId:(role as any)?.id}}); }
    if (update.status) await apiRequest(`workspaces/${workspaceId}/members/${id}/${update.status === "Suspended" ? "suspend" : "reactivate"}`, {method:"POST"}); await reload();
  },
  async removeMember(id: string) { await apiRequest(`workspaces/${workspaceId}/members/${id}`, {method:"DELETE"}); await reload(); },
  updateRole(id: string, role: WorkspaceRole) { return this.updateMember(id,{role}); },
  async updateInvitationRole(_id: string, _role: WorkspaceRole) { throw new Error("Invitation role editing is not enabled yet."); },
  async setInvitationStatus(id: string, status: "Pending"|"Revoked") { const invite=workspace.invitations.find((i)=>i.id===id); if(!invite)return; if(status==="Pending") await apiRequest(`workspaces/${workspaceId}/invitations/${id}/resend`,{method:"POST"}); else await apiRequest(`workspaces/${workspaceId}/invitations/${id}`,{method:"DELETE"}); await reload(); },
  createRole(_name: string, _description: string, _permissions: string[]) { throw new Error("Custom roles are not enabled yet."); },
  async updateSettings(name: string) { await apiRequest(`workspaces/${workspaceId}`, {method:"PATCH",body:{name}}); await reload(); },
};
