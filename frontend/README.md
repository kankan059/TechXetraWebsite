# TechXetra

TechXetra is the website for a technology festival at Tezpur University. The project includes the public-facing website and an admin dashboard planned within the same Next.js application.

## Project Status

- Public website: existing application; preserve current pages, styles, fonts, animations, and components.
- Admin dashboard: UI development in progress.
- Admin data: mock/sample data during the initial UI phase.
- Backend integration: planned for a later stage using the backend developer's actual integration guide.
- Authentication and authorization: not implemented as part of the initial UI work.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- GSAP / ScrollTrigger for existing website animations
- Lucide React for admin interface icons

Use the versions and configuration already present in the project. Do not upgrade or replace dependencies without a clear need.

## Planned Admin Routes

The admin panel will live inside the existing Next.js app under `/admin`.

```text
src/
├── app/
│   ├── layout.tsx              # Existing root layout; preserve
│   ├── page.tsx                # Existing public homepage; preserve
│   └── admin/
│       ├── layout.tsx          # Admin-only shell and navigation
│       ├── page.tsx            # Dashboard overview
│       ├── registrations/
│       │   └── page.tsx
│       ├── payments/
│       │   └── page.tsx
│       ├── passes/
│       │   └── page.tsx
│       ├── attendance/
│       │   └── page.tsx
│       └── competitions/
│           └── page.tsx
└── components/
    └── admin/                  # Reusable admin-only components
```

This is the intended structure; routes should only be added as each page is implemented. Keep the existing project structure if it differs, and adapt without moving or deleting working files.

## Admin UI Design

The admin interface should feel like a premium, modern event-management dashboard.

- Main background: `#080B10`
- Sidebar and cards: `#0C1017`
- Primary accent: `#55DFFF`
- Primary text: `#E8EDF4`
- Muted text: slate/grey shades
- Subtle borders and restrained glow effects
- Responsive layouts for desktop, tablet, and mobile
- Reusable components and consistent spacing
- Avoid excessive gradients, glow effects, or unnecessary animations

The admin layout should have its own sidebar and top navigation. It must not change the public website's layout or appearance.

## Planned Admin Features

- Dashboard overview and event activity
- Registrations and participant records
- Payment review
- Gate passes and event passes
- QR-based attendance
- Competition management and score entry
- Public leaderboard monitoring

These are planned UI areas, not a statement that every feature or backend endpoint is already available.

## Backend Integration

The backend is maintained by a separate developer. During initial UI development:

- Use mock data only.
- Do not invent API endpoints, response shapes, or authentication behavior.
- Do not assume a database, backend framework, or session strategy.
- Integrate only after the backend's actual frontend integration documentation is available.
- Treat backend authorization as the security boundary; hiding UI controls is not sufficient protection.

The current backend design, as described by its architecture verdict, includes Google OAuth, gate passes and event passes, UPI payment verification using a UTR, event-scoped staff assignments, QR-based admission, and polling for leaderboard updates. Confirm exact details from the backend integration guide before implementing API calls.

## Development

Install dependencies from the project root:

```bash
npm install
```

Start the development server using the script configured in `package.json`:

```bash
npm run dev
```

Open the local URL printed by Next.js in the terminal.

## Development Guidelines

- Keep the existing public website working.
- Do not replace `src/app/layout.tsx` or `src/app/globals.css` without checking their current contents first.
- Put admin-specific layout and components in the admin route or `components/admin/`.
- Keep UI work incremental: implement, test, then move to the next screen.
- Label mock data clearly during development.
- Check desktop and mobile layouts.
- Run the project's existing lint/build checks before submitting changes.

## Current Next Step

Build the admin layout and dashboard UI inside the existing app. Start with mock data and responsive navigation; defer backend integration until the API documentation is available.
