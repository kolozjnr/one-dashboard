export type WorkspaceRole = "Owner" | "Admin" | "Analyst" | "Editor" | "Viewer" | (string & {});
export type InvitationStatus = "Pending" | "Accepted" | "Expired" | "Revoked";

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
  status: "Active" | "Suspended";
  lastActive: string;
}

export interface WorkspaceInvitation {
  id: string;
  name: string;
  email: string;
  role: Exclude<WorkspaceRole, "Owner">;
  invitedAt: string;
  status: InvitationStatus;
  message?: string;
}

export interface WorkspaceActivity {
  id: string;
  actor: string;
  action: string;
  target: string;
  when: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  subscription: string;
  seats: number;
  createdAt: string;
  connectedAccounts: number;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  activity: WorkspaceActivity[];
}

export interface WorkspaceRoleDefinition {
  id?: string;
  role: string;
  description: string;
  permissions: string[];
  ownerOnly?: boolean;
  custom?: boolean;
}
