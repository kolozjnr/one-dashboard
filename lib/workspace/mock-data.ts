import type { Workspace, WorkspaceRoleDefinition } from "./types";

export const initialWorkspace: Workspace = {
  id: "workspace-metrispot-studio",
  name: "Metrispot Studio",
  ownerId: "member-john",
  ownerName: "John Marvel",
  ownerEmail: "johnmarvel@gmail.com",
  subscription: "Growth · Annual",
  seats: 8,
  createdAt: "2024-03-12",
  connectedAccounts: 6,
  members: [
    { id: "member-john", name: "John Marvel", email: "johnmarvel@gmail.com", role: "Owner", joinedAt: "2024-03-12", status: "Active", lastActive: "Now" },
    { id: "member-ada", name: "Ada Okafor", email: "ada@metrispot.io", role: "Admin", joinedAt: "2024-05-08", status: "Active", lastActive: "12 minutes ago" },
    { id: "member-sam", name: "Sam Williams", email: "sam@metrispot.io", role: "Analyst", joinedAt: "2024-06-21", status: "Active", lastActive: "Yesterday" },
    { id: "member-tobi", name: "Tobi Adebayo", email: "tobi@metrispot.io", role: "Viewer", joinedAt: "2024-08-03", status: "Suspended", lastActive: "May 18, 2025" },
  ],
  invitations: [
    { id: "invite-nia", name: "Nia Campbell", email: "nia@metrispot.io", role: "Analyst", invitedAt: "2025-02-14", status: "Pending", message: "Welcome to the Metrispot workspace!" },
    { id: "invite-omar", name: "Omar Yusuf", email: "omar@metrispot.io", role: "Editor", invitedAt: "2025-01-08", status: "Expired" },
    { id: "invite-lena", name: "Lena Park", email: "lena@metrispot.io", role: "Viewer", invitedAt: "2024-12-12", status: "Accepted" },
  ],
  activity: [
    { id: "activity-1", actor: "Ada Okafor", action: "connected a new account", target: "Instagram · @metrispot", when: "2 hours ago" },
    { id: "activity-2", actor: "John Marvel", action: "invited a teammate", target: "Nia Campbell", when: "Yesterday" },
    { id: "activity-3", actor: "Sam Williams", action: "exported a report", target: "April performance summary", when: "Yesterday" },
    { id: "activity-4", actor: "John Marvel", action: "updated workspace settings", target: "Workspace profile", when: "3 days ago" },
  ],
};

export const permissionCategories = [
  { name: "Dashboard", permissions: ["View dashboard", "View analytics", "Compare platforms", "Export analytics"] },
  { name: "Social Accounts", permissions: ["View connected accounts", "Connect social accounts", "Disconnect social accounts", "Manage account settings"] },
  { name: "Reports", permissions: ["View reports", "Create reports", "Export reports", "Delete reports"] },
  { name: "Team", permissions: ["View team members", "Invite team members", "Manage team roles", "Remove team members"] },
  { name: "Workspace", permissions: ["View workspace settings", "Edit workspace settings", "Manage billing", "Manage subscription"] },
] as const;

export const ownerOnlyPermissions = ["Manage billing", "Manage subscription"];

export const roleDefinitions: WorkspaceRoleDefinition[] = [
  { role: "Owner", description: "Full workspace control, including billing, subscription, membership, and ownership.", permissions: permissionCategories.flatMap((category) => [...category.permissions]), ownerOnly: true },
  { role: "Admin", description: "Manage workspace settings, team access, and connected accounts. Billing and ownership remain Owner controlled.", permissions: ["View dashboard", "View analytics", "Compare platforms", "Export analytics", "View connected accounts", "Connect social accounts", "Disconnect social accounts", "Manage account settings", "View reports", "Create reports", "Export reports", "Delete reports", "View team members", "Invite team members", "Manage team roles", "Remove team members", "View workspace settings", "Edit workspace settings"] },
  { role: "Analyst", description: "View analytics, compare platforms, and create or export reports.", permissions: ["View dashboard", "View analytics", "Compare platforms", "Export analytics", "View connected accounts", "View reports", "Create reports", "Export reports", "View team members", "View workspace settings"] },
  { role: "Editor", description: "Manage permitted content workflows and create, update, or export reports.", permissions: ["View dashboard", "View analytics", "View connected accounts", "View reports", "Create reports", "Export reports", "Delete reports"] },
  { role: "Viewer", description: "Read-only access to dashboards, analytics, connected accounts, and reports.", permissions: ["View dashboard", "View analytics", "View connected accounts", "View reports", "View team members", "View workspace settings"] },
];
