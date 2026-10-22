# TechXetra Backend

Cloudflare Workers edge API for the TechXetra technical festival at Tezpur University, built with TypeScript, Hono v4, and Cloudflare D1 (SQLite).

---

## 🧭 Codebase Index & Architecture Guide for AI Agents

> **For AI Coding Agents & New Developers**:
> A complete, indexed reference of the entire backend codebase is available in the **[`structure/`](./structure/README.md)** directory:
>
> - **[`structure/00-OVERVIEW-AND-ARCHITECTURE.md`](./structure/00-OVERVIEW-AND-ARCHITECTURE.md)**: System overview, edge runtime, and non-negotiable engineering invariants.
> - **[`structure/01-DIRECTORY-AND-FILE-INDEX.md`](./structure/01-DIRECTORY-AND-FILE-INDEX.md)**: Exhaustive directory map & file index across all layers.
> - **[`structure/02-ROUTES-AND-ENDPOINTS-REGISTRY.md`](./structure/02-ROUTES-AND-ENDPOINTS-REGISTRY.md)**: Complete registry of all 23 route controllers, input schemas, and execution flows.
> - **[`structure/03-SERVICES-AND-BUSINESS-LOGIC.md`](./structure/03-SERVICES-AND-BUSINESS-LOGIC.md)**: Core domain workflows, reservations, payment reviews, and check-in algorithms.
> - **[`structure/04-DATABASE-SCHEMA-AND-CONSTRAINTS.md`](./structure/04-DATABASE-SCHEMA-AND-CONSTRAINTS.md)**: Complete SQLite relational schema, ER diagrams, partial unique indexes, and triggers.

---

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Local Development
```bash
npm run dev
# Worker starts listening at http://localhost:8787
```

### Running Tests & Typecheck
```bash
npm run test
npm run typecheck
```

### Deploying to Cloudflare Workers
```bash
npm run deploy
```

### Type Generation
To regenerate Cloudflare Worker binding types from `wrangler.jsonc`:
```bash
npm run cf-typegen
```
