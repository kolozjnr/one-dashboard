const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const subscriber = {
  'dashboard.view': 'View the workspace dashboard', 'analytics.view': 'View analytics', 'analytics.compare': 'Compare analytics periods', 'analytics.export': 'Export analytics',
  'integrations.view': 'View integrations', 'integrations.connect': 'Connect integrations', 'integrations.disconnect': 'Disconnect integrations', 'integrations.manage': 'Manage integrations',
  'reports.view': 'View reports', 'reports.create': 'Create reports', 'reports.export': 'Export reports', 'reports.delete': 'Delete reports',
  'team.view': 'View workspace team', 'team.invite': 'Invite workspace members', 'team.manage': 'Manage workspace roles and members', 'team.remove': 'Remove workspace members',
  'workspace.view': 'View workspace settings and activity', 'workspace.update': 'Update workspace settings', 'workspace.billing': 'Manage workspace billing', 'workspace.transfer_ownership': 'Transfer workspace ownership',
};
const admin = {
  'admin.users.view': 'View platform users', 'admin.users.manage': 'Manage platform users', 'admin.users.suspend': 'Suspend platform users',
  'admin.subscribers.view': 'View subscribers', 'admin.subscribers.manage': 'Manage subscribers',
  'admin.subscriptions.view': 'View subscriptions', 'admin.subscriptions.manage': 'Manage subscriptions', 'admin.subscriptions.activate': 'Activate subscriptions',
  'admin.payments.view': 'View payments', 'admin.payments.manage': 'Manage payments', 'admin.payments.refund': 'Refund payments',
  'admin.integrations.view': 'View platform integrations', 'admin.integrations.manage': 'Manage platform integrations',
  'admin.settings.view': 'View platform settings', 'admin.settings.manage': 'Manage platform settings',
  'admin.support.view': 'View support requests', 'admin.support.manage': 'Manage support requests',
};
const adminRoles = {
  'super-admin': Object.keys(admin),
  administrator: Object.keys(admin).filter((p) => !['admin.users.suspend', 'admin.payments.refund'].includes(p)),
  'finance-manager': ['admin.subscribers.view', 'admin.subscriptions.view', 'admin.subscriptions.manage', 'admin.subscriptions.activate', 'admin.payments.view', 'admin.payments.manage', 'admin.payments.refund'],
  'support-agent': ['admin.users.view', 'admin.subscribers.view', 'admin.support.view', 'admin.support.manage'],
  'integration-manager': ['admin.integrations.view', 'admin.integrations.manage'],
};
// Plan catalog: monthly/annual pricing plus server-side entitlement limits.
// A limit of 0 means unlimited (Business/Enterprise analytics history, Enterprise everything).
const plans = [
  { key: 'free', name: 'Free', description: 'Get started with social analytics', amount: 0, annualAmount: 0, trialDays: 0, seatLimit: 1, maxConnectedAccounts: 1, maxWebsites: 1, analyticsHistoryDays: 7, maxReportsPerMonth: 5, maxAiRequestsPerMonth: 2, displayOrder: 1, features: [['ai_insights', 'AI insights']] },
  { key: 'starter', name: 'Starter', description: 'Essential insights for growing creators', amount: 19, annualAmount: 228, trialDays: 14, seatLimit: 3, maxConnectedAccounts: 3, maxWebsites: 2, analyticsHistoryDays: 30, maxReportsPerMonth: 25, maxAiRequestsPerMonth: 10, displayOrder: 2, features: [['ai_insights', 'AI insights']] },
  { key: 'professional', name: 'Professional', description: 'More tools for teams building momentum', amount: 49, annualAmount: 588, trialDays: 14, seatLimit: 10, maxConnectedAccounts: 10, maxWebsites: 10, analyticsHistoryDays: 365, maxReportsPerMonth: 100, maxAiRequestsPerMonth: 50, displayOrder: 3, features: [['ai_insights', 'AI insights'], ['priority_support', 'Priority support'], ['advanced_analytics', 'Advanced analytics']] },
  { key: 'business', name: 'Business', description: 'Advanced analytics for established brands', amount: 99, annualAmount: 1188, trialDays: 14, seatLimit: 25, maxConnectedAccounts: 25, maxWebsites: 25, analyticsHistoryDays: 0, maxReportsPerMonth: 500, maxAiRequestsPerMonth: 200, displayOrder: 4, features: [['ai_insights', 'AI insights'], ['priority_support', 'Priority support'], ['advanced_analytics', 'Advanced analytics'], ['api_access', 'API access']] },
  { key: 'enterprise', name: 'Enterprise', description: 'Flexible scale for large organizations', amount: 299, annualAmount: 3588, trialDays: 14, seatLimit: 0, maxConnectedAccounts: 0, maxWebsites: 0, analyticsHistoryDays: 0, maxReportsPerMonth: 0, maxAiRequestsPerMonth: 0, displayOrder: 5, features: [['ai_insights', 'AI insights'], ['priority_support', 'Priority support'], ['advanced_analytics', 'Advanced analytics'], ['api_access', 'API access']] },
];

async function main() {
  const ids = new Map();
  for (const [key, description] of Object.entries({ ...subscriber, ...admin })) {
    const permission = await prisma.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
    ids.set(key, permission.id);
  }
  for (const [key, keys] of Object.entries(adminRoles)) {
    const name = ({ 'super-admin': 'Super Admin', administrator: 'Administrator', 'finance-manager': 'Finance Manager', 'support-agent': 'Support Agent', 'integration-manager': 'Integration Manager' })[key];
    const role = await prisma.adminRole.upsert({ where: { key }, update: { name }, create: { key, name } });
    await prisma.adminPermission.createMany({ data: keys.map((permissionKey) => ({ roleId: role.id, permissionId: ids.get(permissionKey) })), skipDuplicates: true });
  }
  for (const plan of plans) {
    const { features, ...fields } = plan;
    const row = await prisma.subscriptionPlan.upsert({
      where: { key: plan.key },
      update: { ...fields, currency: 'USD', interval: 'MONTHLY', isActive: true },
      create: { ...fields, currency: 'USD', interval: 'MONTHLY', isActive: true },
    });
    await prisma.planFeature.deleteMany({ where: { planId: row.id } });
    await prisma.planFeature.createMany({ data: features.map(([key, label]) => ({ planId: row.id, key, label })) });
  }
  // Optional bootstrap: grant Super Admin to an existing user, e.g.
  //   ADMIN_EMAIL=admin@example.com npm run db:seed
  if (process.env.ADMIN_EMAIL) {
    const user = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL.toLowerCase() } });
    const superAdmin = await prisma.adminRole.findUnique({ where: { key: 'super-admin' } });
    if (user && superAdmin) {
      await prisma.adminMembership.upsert({ where: { userId: user.id }, update: { roleId: superAdmin.id }, create: { userId: user.id, roleId: superAdmin.id } });
      console.log(`Granted Super Admin to ${user.email}.`);
    } else console.warn('ADMIN_EMAIL user or super-admin role not found; skipped platform role bootstrap.');
  }
}
main().catch((error) => { console.error('Database seed failed.', error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
