export const subscriptionStatuses = ["Active", "Pending", "Expired", "Cancelled", "Suspended", "Payment Failed", "Trial"] as const;
export type SubscriptionStatus = typeof subscriptionStatuses[number];

export const paymentStatuses = ["Successful", "Pending", "Failed", "Refunded", "Partially Refunded"] as const;
export type PaymentStatus = typeof paymentStatuses[number];

export const supportedPlatforms = ["Instagram", "TikTok", "YouTube", "Facebook", "LinkedIn", "X", "Pinterest", "Threads"] as const;
