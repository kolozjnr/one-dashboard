import { seed as coupons } from "./mocks/coupon";
import { seed as payments } from "./mocks/payment";
import { seed as plans } from "./mocks/plan";
import { initial as subscribers } from "./mocks/subscriber";
import { seed as subscriptions } from "./mocks/subscription";
import { seed as tickets } from "./mocks/ticket";
import { seed as users } from "./mocks/user";

/** Async mock boundary. UI code consumes these methods; swap implementations for HTTP calls later. */
export const adminService = {
  users: { getUsers: async () => [...users], getUser: async (id: number) => users.find((item) => item.id === id), updateUser: async (id: number, update: Partial<(typeof users)[number]>) => ({ ...users.find((item) => item.id === id)!, ...update }), suspendUser: async (id: number) => ({ ...users.find((item) => item.id === id)!, status: "Suspended" as const }), reactivateUser: async (id: number) => ({ ...users.find((item) => item.id === id)!, status: "Active" as const }) },
  subscribers: { getSubscribers: async () => [...subscribers], getSubscriber: async (id: number) => subscribers.find((item) => item.id === id), updateSubscriber: async (id: number, update: Partial<(typeof subscribers)[number]>) => ({ ...subscribers.find((item) => item.id === id)!, ...update }) },
  subscriptions: { getSubscriptions: async () => [...subscriptions], getSubscription: async (id: string) => subscriptions.find((item) => item.id === id), activate: async (id: string) => ({ ...subscriptions.find((item) => item.id === id)!, status: "Active" as const }), extend: async (id: string, expiry: string) => ({ ...subscriptions.find((item) => item.id === id)!, expiry }), changePlan: async (id: string, plan: string) => ({ ...subscriptions.find((item) => item.id === id)!, plan }), suspend: async (id: string) => ({ ...subscriptions.find((item) => item.id === id)!, status: "Suspended" as const }), cancel: async (id: string) => ({ ...subscriptions.find((item) => item.id === id)!, status: "Cancelled" as const }) },
  payments: { getPayments: async () => [...payments], getPayment: async (ref: string) => payments.find((item) => item.ref === ref) },
  coupons: { getCoupons: async () => [...coupons], createCoupon: async (item: (typeof coupons)[number]) => item, updateCoupon: async (item: (typeof coupons)[number]) => item, deleteCoupon: async (id: number) => id },
  pricing: { getPlans: async () => [...plans], createPlan: async (item: (typeof plans)[number]) => item, updatePlan: async (item: (typeof plans)[number]) => item, activatePlan: async (id: number) => ({ ...plans.find((item) => item.id === id)!, active: true }), deactivatePlan: async (id: number) => ({ ...plans.find((item) => item.id === id)!, active: false }) },
  integrations: { getPlatforms: async () => [] as { name: string; enabled: boolean }[], addPlatform: async <T,>(item: T) => item, updatePlatform: async <T,>(item: T) => item, enablePlatform: async <T extends { enabled: boolean }>(item: T) => ({ ...item, enabled: true }), disablePlatform: async <T extends { enabled: boolean }>(item: T) => ({ ...item, enabled: false }) },
  support: { getTickets: async () => [...tickets], updateTicket: async <T,>(item: T) => item, assignTicket: async <T,>(item: T) => item, addReply: async <T,>(item: T) => item },
};
