import { redirect } from "next/navigation";

export default function TicketsIndexPage() {
  redirect("/me/tickets");
}
