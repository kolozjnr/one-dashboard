import type { Metadata } from "next";
import { WorkspaceActivityPage } from "@/components/workspace/workspace-pages";

export const metadata: Metadata = { title: "Workspace Activity | Metrispot" };

export default function WorkspaceActivityRoute() {
  return <WorkspaceActivityPage />;
}
