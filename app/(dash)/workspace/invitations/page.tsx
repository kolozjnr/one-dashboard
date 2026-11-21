import type { Metadata } from "next";
import { InvitationsPage } from "@/components/workspace/workspace-pages";

export const metadata: Metadata = { title: "Invitations | Metrispot" };

export default function InvitationsRoute() {
  return <InvitationsPage />;
}
