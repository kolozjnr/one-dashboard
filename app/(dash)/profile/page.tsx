import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold text-ink">Profile</h1><p className="mt-1 text-sm text-faint">Manage your personal account details.</p></div><section className="rounded-xl border border-line bg-surface p-5"><ProfileForm /></section></div>;
}
