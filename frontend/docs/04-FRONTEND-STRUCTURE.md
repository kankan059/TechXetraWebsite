# 04 — Suggested frontend folder structure

Adapt this to the existing website instead of replacing its current architecture wholesale. The example assumes React + TypeScript; if the frontend uses another framework, preserve the same feature boundaries.

```text
frontend/
  src/
    app/
      router.tsx
      providers.tsx
      queryClient.ts
    api/
      client.ts
      errors.ts
      contracts.ts
      auth.api.ts
      events.api.ts
      teams.api.ts
      purchases.api.ts
      payments.api.ts
      tickets.api.ts
      scanner.api.ts
      staff.api.ts
      admin.api.ts
    components/
      ui/
      forms/
      feedback/
      pagination/
      event/
      team/
      purchase/
      ticket/
      scanner/
    features/
      auth/
        pages/
        components/
        hooks/
        schemas.ts
        types.ts
      events/
        pages/
        components/
        hooks/
        types.ts
      profile/
      teams/
      invitations/
      checkout/
      purchases/
      payments/
      tickets/
      scanner/
      staff/
      esports/
      admin/
    layouts/
      PublicLayout.tsx
      ParticipantLayout.tsx
      StaffLayout.tsx
      AdminLayout.tsx
    routes/
      ProtectedRoute.tsx
      RoleRoute.tsx
    hooks/
      useSession.ts
    lib/
      date.ts
      currency.ts
      form-schema.ts
    types/
      api.ts
    styles/
    main.tsx
```

## API client rules
- Use one API client with `credentials: 'include'`.
- Prefix all paths with `VITE_API_BASE_URL`.
- Parse the envelope consistently; surface `error.code`, `error.message`, and `meta.requestId`.
- Do not blindly retry POST requests. Retry only operations known to be safe/idempotent.
- Do not store session cookies in localStorage; the server sets HttpOnly cookies.
- Avoid keeping a second, stale copy of user role or purchase status after a mutation.

Example fetch client:
```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const body = await response.json();

  if (!response.ok || body.success === false) {
    const error = body.error ?? {
      code: 'HTTP_ERROR',
      message: `Request failed (${response.status})`,
    };
    throw Object.assign(new Error(error.message), {
      code: error.code,
      status: response.status,
      details: error.details,
      requestId: body.meta?.requestId ?? body.request_id,
    });
  }

  return body.data as T;
}
```

Example:
```ts
const events = await apiFetch<EventListResponse>(
  '/events?page=1&pageSize=20',
);
```
Here `EventListResponse` should match `data` for that endpoint, not the whole envelope.

## Types
Prefer types derived from a generated OpenAPI spec if one is added. Until then, keep hand-written types in one place and cross-check them against Zod schemas, service DTOs, and actual route responses. Avoid `any` in shared API types.

## Dynamic event forms
Render fields from the backend `formSchema`, not hard-coded assumptions. Map supported field types from `src/services/form.service.ts`: `shortText`, `longText`, `number`, `singleChoice`, `multipleChoice`, `checkbox`, `date`, `email`, `phone`. Respect `required`, `options`, length/range constraints, scope, placeholder, and helper text when present. The server validates answers again; client validation is only a usability layer.

## Scanner implementation
Separate camera/QR decoding from API validation. The QR scanner should return a string to the API client; it should not parse trust decisions or sign tokens. Provide a manual-entry fallback and a clear “Lookup” then “Admit” action. Use a camera library compatible with your framework and deployment permissions; do not assume the backend opens the camera.
