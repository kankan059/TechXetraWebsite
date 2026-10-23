import { redirect } from "next/navigation";

export default function AdminCompetitionsLegacyRedirectPage() {
  redirect("/admin/events");
}
