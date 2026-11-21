import type { Metadata } from "next";
import { TeamMembersPage } from "@/components/workspace/workspace-pages";

export const metadata: Metadata = { title: "Team Members | Metrispot" };

export default function TeamPage() {
  return <TeamMembersPage />;
}
