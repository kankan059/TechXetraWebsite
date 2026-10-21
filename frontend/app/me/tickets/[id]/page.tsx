import { redirect } from "next/navigation";

export default async function MeTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/tickets/${encodeURIComponent(id)}`);
}
