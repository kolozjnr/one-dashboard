import { AcceptInvitationForm } from "./accept-invitation-form";

export const instant = false;

export default async function AcceptWorkspaceInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AcceptInvitationForm token={token} />;
}
