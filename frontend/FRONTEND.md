# FRONTEND.md — TechXetra 2026 Frontend Guide

AI/contributor reference for the design system, theme, fonts, colors, structure, and conventions of this Next.js frontend. Read this before generating or modifying any UI code so output matches the existing look and feel.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 (`@theme` tokens in `app/globals.css`) — utility-first, no CSS modules |
| Animation | GSAP + ScrollTrigger, Framer Motion, Lenis (smooth scroll) |
| 3D / Shaders | three.js, @react-three/fiber, @react-three/drei, OGL |
| Icons | lucide-react, @hugeicons/react |
| Auth | @react-oauth/google (Google OAuth) |
| Fonts | Local fonts via `next/font/local` (see §3) |

Path alias: `@/*` → project root (`components/...`, `lib/...`, etc.).

---

## 2. Visual Theme (the "vibe")

Dark, futuristic, tech-fest aesthetic:

- **Near-black backgrounds** (`#090909` on `<html>`, panels `#0C1017`, `#080B10`, `#09151B`).
- **Cyan neon accents** (`#55DFFF`, `#00E5FF`) for glows, highlights, scrollbars.
- **Cream text** (`#F5F0DE` / `#F7F3DE`) instead of pure white for headings/body.
- **Glassmorphism**: `border border-white/10 backdrop-blur-xl` on cards/panels.
- **Clipped/angular corners**: `[clip-path:polygon(...)]` instead of plain rounded corners on hero/tech panels.
- **Effects**: film grain (`.retro-film-grain`), metallic gradient titles (`.title-gradient`), glow cursors, click sparks, three.js animated backgrounds.
- Scrollbars are globally hidden (`::-webkit-scrollbar { display: none }`); smooth scrolling via Lenis.

### Tailwind v4 `@theme` tokens (app/globals.css)

```css
--color-theme-bg: #080808;
--color-theme-surface: #121212;
--color-theme-surface-border: rgba(247, 243, 222, 0.12);
--color-theme-cream: #F7F3DE;
--color-theme-blue: #0972AE;
--color-theme-green: #3F622D;
--color-theme-red: #8F1418;
--background-image-celestial-grid: radial-gradient(rgba(247,243,222,0.08) 1px, transparent 0);
```

These generate utilities like `bg-theme-bg`, `text-theme-cream`, `border-theme-surface-border`, `bg-celestial-grid`. NOTE: most existing components still use inline arbitrary values (`bg-[#0C1017]`) — match whatever the surrounding file does; prefer tokens for new work.

### Brand palette (`constants/colors.ts` — `TECHXETRA_COLORS`)

```ts
blue: "#0972AE", green: "#3F622D", red: "#8F1418", cream: "#F7F3DE",
blueDark: "#044468", blueBlack: "#011722",
greenDark: "#253A1B", greenBlack: "#0D1309",
redDark: "#550C0D", redBlack: "#1D0404",
creamMuted: "#949285", creamDark: "#31312C",
black: "#090909" // main site background
```

### Common inline accent colors found in components

| Color | Hex | Usage |
|---|---|---|
| Neon cyan | `#55DFFF`, `#00E5FF` | glows, hover accents, scrollbars |
| Mint green | `#8FE388` | success/accent |
| Coral red | `#FF806E` | error/accent |
| Cream | `#F5F0DE` | headings, primary text |
| Dark panels | `#0C1017`, `#080B10`, `#09151B` | cards, sections |

---

## 3. Typography

All fonts are local (`public/fonts/`), loaded in `app/layout.tsx` via `next/font/local` with CSS variables. Utility classes are defined in `app/globals.css`:

| Class | Font family | Variable | Use for |
|---|---|---|---|
| `.font-hero` | Ortigel Demo Regular | `--font-ortigel` | Big hero titles / display |
| `.font-heading` | Gotham Bold | `--font-gotham-bold` | Section headings |
| `.font-cta` | Gotham Bold | `--font-gotham-bold` | Buttons / CTAs |
| `.font-body` | Gotham Book | `--font-gotham-book` | Body text |
| `.font-pixel` | MultiType Pixel Regular SC | `--font-pixel` | Retro/pixel accents (use `tracking-tighter-pixel` = `-0.04em`) |
| `.font-autotech` | Auto Techno | `--font-autotechno` | Techy labels |
| `.font-biscora` | Biscora | `--font-biscora` | Decorative (font-synthesis: none) |
| `.font-roboto` | Origin Tech (personal use) | `--font-roboto` | Decorative tech text |

Rules for AI:
- Never import Google Fonts or add new font families without updating `layout.tsx` + `globals.css`.
- Headings: `.font-heading` or `.font-hero`; body: `.font-body`; buttons/CTAs: `.font-cta`.
- The `body` fallback in CSS is Arial — always apply an explicit font class.

---

## 4. Project Structure

```
frontend/
├── app/                    # App Router pages & layouts
│   ├── layout.tsx          # Root layout: fonts, GoogleAuthProvider, RouteShell
│   ├── globals.css         # Tailwind import, @theme tokens, font & effect classes
│   ├── page.tsx            # Home
│   ├── (auth)/             # Route group (layout only: login/signup flows)
│   ├── login/ signup/ register/ profile/ profile-completion/ me/
│   ├── events/             # + technical/, non-technical/, esports/, directory/, [slug]/ (+ leaderboard)
│   ├── schedule/ sponsors/ gallery/ gallary/ team/ teams/ contact/ leaderboards/
│   ├── checkout/ [id]/pay, /status   tickets/   registrations/
│   ├── dashboard/          # Participant dashboard
│   ├── admin/              # users, events, registrations, payments, tickets, passes,
│   │                       # attendance, audit-logs, reports, settings, gate-staff, ...
│   ├── staff/              # scan, events/[id]/{payments,scores,registrations,settings}
│   ├── error.tsx loading.tsx not-found.tsx
├── components/
│   ├── layouts/            # RouteShell, navbar/ (NavBar, GooeyNav), Footer, SmoothScroll
│   ├── sections/           # Page sections grouped by route: hero/, events/, about/,
│   │                       # contact/, schedule/, galary/, team/, sponser/, profile/, login/
│   ├── ui/                 # Button, FlyingButton, SectionTitle, Star, TextReveal
│   ├── effects/            # ClickSpark, GLowCursor (OGL), SplashCursor, RetroOverlay, GlobalEffect
│   ├── animations/         # BackGround (three.js), LogoTech, Intro, DepthCarousel, ScrollReveal
│   ├── forms/              # DynamicQuestionnaireModal, FormFieldRenderer
│   ├── providers/          # GoogleAuthProvider
│   ├── admin/ staff/       # Role-specific UI (AdminSidebar, AdminTopbar, staff modals)
├── constants/              # colors.ts (TECHXETRA_COLORS), navigation.ts
├── data/                   # Static content: event.ts, schedule.ts, team.ts, sponser.ts,
│                           # galary.ts, admin/dashboard.ts, info/* (hero, about, footer)
├── hooks/                  # useGsap.ts (gsap.context + ScrollTrigger), useLenis.ts
├── lib/                    # api-client.ts, device.ts, export-csv.ts, report-adapters.ts
├── services/               # participant-api.ts, staff-api.ts, admin-api.ts
├── types/                  # api.ts (domain types), admin.ts, event.ts
├── public/fonts/           # Local font files
└── docs/                   # API contracts, endpoint maps, flow docs
```

### Layout shell logic (`components/layouts/RouteShell.tsx`)

Chosen by pathname:
- `/admin/*` → bare children (no chrome)
- auth routes → Navbar only
- default → `BackGround` (three.js) + `GlobalEffect` + `SmoothScroll` + `Footer`, all `next/dynamic` imports.

---

## 5. Data Fetching Conventions

- Client-side fetch through `lib/api-client.ts`: `apiRequest<T>()` → relative `/api/v1/...` paths; response envelope `{ success, data, error }`; throws typed `ApiError`.
- `next.config.ts` rewrites `/api/v1/:path*` to the backend (`BACKEND_API_URL` / `NEXT_PUBLIC_BACKEND_URL` / `NEXT_PUBLIC_API_URL`; default `https://techxetra-backend.onrender.com`).
- Use the typed service modules (`services/participant-api.ts`, `staff-api.ts`, `admin-api.ts`) — never call `fetch` directly in components.
- Static marketing content (events list, schedule, team, sponsors, gallery) lives in `data/` — edit there, not in components.

---

## 6. Animation Conventions

- **GSAP**: always via the `useGsap` hook (wraps `gsap.context` + ScrollTrigger in `useLayoutEffect`). Used in hero, events, schedule, about, contact, sponsors, gallery sections.
- **Framer Motion**: checkout, ComingSoon, EventsDirectory, Footer, Plateform. Respect `useReducedMotion()` — existing code does this consistently; do the same.
- **Lenis**: smooth scroll wired to ScrollTrigger via `useLenis` (skips mobile / reduced-motion).
- **three.js**: only in `components/animations/` (BackGround, LogoTech) — heavy, dynamically imported.
- Reusable animation components: `ScrollReveal`, `TextReveal`, `Intro`, `DepthCarousel`.

---

## 7. Rules for AI Editing This Codebase

1. **Dark theme only** — assume `#090909`-ish backgrounds; never introduce light/white sections unless the file already does.
2. **Reuse existing components**: `Button`, `SectionTitle`, `FlyingButton` from `components/ui/`; page sections go in `components/sections/<route>/`.
3. **Colors**: prefer `TECHXETRA_COLORS` / `@theme` tokens; when matching an existing file, reuse its inline hex values (cyan `#55DFFF`, cream `#F5F0DE`, panels `#0C1017`).
4. **Fonts**: apply the `.font-*` classes from §3; don't set raw `font-family`.
5. **Client components**: anything using hooks/animation must have `"use client"`.
6. **Glass panels**: `border border-white/10 backdrop-blur-xl bg-white/5` (or dark panel hex) is the standard card treatment.
7. **Type safety**: domain types live in `types/api.ts` (dual snake/camel fields from the backend) — extend there, don't redefine locally.
8. **New routes**: follow the existing folder pattern under `app/`; RouteShell handles chrome automatically by pathname.
9. Check `docs/` for API contracts before touching data flows.
