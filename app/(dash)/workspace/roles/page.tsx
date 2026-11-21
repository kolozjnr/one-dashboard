import type { Metadata } from "next";
import { WorkspaceRolesPage } from "@/components/workspace/workspace-pages";

export const metadata: Metadata = { title: "Roles & Permissions | Metrispot" };

export default function RolesPage() {
  return <WorkspaceRolesPage />;
}
