import type { Metadata } from "next";
import { WorkspaceSettingsPage } from "@/components/workspace/workspace-pages";

export const metadata: Metadata = { title: "Workspace Settings | Metrispot" };

export default function WorkspaceSettingsRoute() {
  return <WorkspaceSettingsPage />;
}
