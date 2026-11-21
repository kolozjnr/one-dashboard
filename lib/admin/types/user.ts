export type User = { id: number; name: string; email: string; initials: string; color: string; category: "Subscriber / Owner" | "Team Member" | "Free User" | "Admin"; workspace: string; plan: string; status: "Active" | "Suspended" | "Pending"; registered: string; lastLogin: string; members: string[]; payments: string[]; accounts: string[]; activity: string[] };

