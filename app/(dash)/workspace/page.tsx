import type { Metadata } from "next";
import { WorkspaceOverview } from "@/components/workspace/workspace-pages";

export const metadata: Metadata = { title: "Workspace Overview | Metrispot" };

export default function WorkspacePage() {
  return <WorkspaceOverview />;
}
