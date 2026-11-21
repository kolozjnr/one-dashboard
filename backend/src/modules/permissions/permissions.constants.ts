export const SUBSCRIBER_PERMISSIONS = [
  'dashboard.view', 'analytics.view', 'analytics.compare', 'analytics.export',
  'integrations.view', 'integrations.connect', 'integrations.disconnect', 'integrations.manage',
  'reports.view', 'reports.create', 'reports.export', 'reports.delete',
  'team.view', 'team.invite', 'team.manage', 'team.remove',
  'workspace.view', 'workspace.update', 'workspace.billing', 'workspace.transfer_ownership',
] as const;

export const ADMIN_PERMISSIONS = [
  'admin.users.view', 'admin.users.manage', 'admin.users.suspend',
  'admin.subscribers.view', 'admin.subscribers.manage',
  'admin.subscriptions.view', 'admin.subscriptions.manage', 'admin.subscriptions.activate',
  'admin.payments.view', 'admin.payments.manage', 'admin.payments.refund',
  'admin.integrations.view', 'admin.integrations.manage',
  'admin.settings.view', 'admin.settings.manage',
  'admin.support.view', 'admin.support.manage',
] as const;

export type SubscriberPermission = typeof SUBSCRIBER_PERMISSIONS[number] | (string & {});
export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

export const SUBSCRIBER_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  owner: SUBSCRIBER_PERMISSIONS,
  admin: SUBSCRIBER_PERMISSIONS.filter((permission) => permission !== 'workspace.transfer_ownership'),
  analyst: ['dashboard.view', 'analytics.view', 'analytics.compare', 'analytics.export', 'reports.view', 'reports.export', 'team.view', 'workspace.view'],
  editor: ['dashboard.view', 'analytics.view', 'integrations.view', 'integrations.connect', 'integrations.disconnect', 'reports.view', 'reports.create', 'reports.export', 'team.view', 'workspace.view'],
  viewer: ['dashboard.view', 'analytics.view', 'reports.view', 'team.view', 'workspace.view'],
};

export const ADMIN_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  'super-admin': ADMIN_PERMISSIONS,
  administrator: ADMIN_PERMISSIONS.filter((permission) => !['admin.users.suspend', 'admin.payments.refund'].includes(permission)),
  'finance-manager': ['admin.subscribers.view', 'admin.subscriptions.view', 'admin.subscriptions.manage', 'admin.subscriptions.activate', 'admin.payments.view', 'admin.payments.manage', 'admin.payments.refund'],
  'support-agent': ['admin.users.view', 'admin.subscribers.view', 'admin.support.view', 'admin.support.manage'],
  'integration-manager': ['admin.integrations.view', 'admin.integrations.manage'],
};

// --- Custom permission support -------------------------------------------------
// Workspace roles may carry custom dot-namespaced permissions alongside the built-in
// catalog. Platform (`admin.*`) permissions and the owner-reserved key can never be
// granted through workspace roles, which keeps subscriber and platform roles separate.
export const CUSTOM_PERMISSION_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
export const ADMIN_PERMISSION_PREFIX = 'admin.';
export const RESERVED_SUBSCRIBER_PERMISSIONS = ['workspace.transfer_ownership'] as const;

export function isPlatformPermission(key: string): boolean {
  return key.startsWith(ADMIN_PERMISSION_PREFIX);
}

export function isKnownSubscriberPermission(key: string): boolean {
  return (SUBSCRIBER_PERMISSIONS as readonly string[]).includes(key);
}

export function isReservedSubscriberPermission(key: string): boolean {
  return (RESERVED_SUBSCRIBER_PERMISSIONS as readonly string[]).includes(key);
}

export function isCustomSubscriberPermission(key: string): boolean {
  return CUSTOM_PERMISSION_PATTERN.test(key) && !isPlatformPermission(key) && !isReservedSubscriberPermission(key);
}

// True when a permission key may be granted to a workspace role or invitation.
export function isGrantableSubscriberPermission(key: string): boolean {
  if (isReservedSubscriberPermission(key)) return false;
  return isKnownSubscriberPermission(key) || isCustomSubscriberPermission(key);
}
