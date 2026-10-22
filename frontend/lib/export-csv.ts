import type { EventRegistrationDetail } from "@/types/api";

export function exportRegistrationsToCsv(
  eventTitle: string,
  registrations: EventRegistrationDetail[]
) {
  // Collect all unique form response keys across all participants
  const formKeys = Array.from(
    new Set(
      registrations.flatMap((r) =>
        r.form_responses ? Object.keys(r.form_responses) : []
      )
    )
  );

  const headers = [
    "Registration ID",
    "Status",
    "Participant Name",
    "Email",
    "Phone",
    "Institution",
    "Roll Number",
    "Team Name",
    "Checked In",
    "Checked In At",
    ...formKeys.map((k) => `Form: ${k.replace(/_/g, " ")}`),
  ];

  const rows = registrations.map((r) => [
    r.registration_id,
    r.status,
    `"${(r.participant.name || "").replace(/"/g, '""')}"`,
    r.participant.email,
    r.participant.phone || "",
    `"${(r.participant.institution_name || "").replace(/"/g, '""')}"`,
    r.participant.institution_id || "",
    `"${(r.team?.name || "Solo").replace(/"/g, '""')}"`,
    r.ticket?.checked_in ? "YES" : "NO",
    r.ticket?.checked_in_at ? new Date(r.ticket.checked_in_at).toLocaleString() : "",
    ...formKeys.map((k) => {
      const val = r.form_responses?.[k] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }),
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${eventTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}_Roster.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
