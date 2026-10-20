# TASK-00 — Repository audit and safe implementation plan

## Objective
Establish the repository's current state and implementation constraints without changing application behavior. This task prevents the coding agent from creating a parallel app, replacing working configuration, or assuming files/dependencies that do not exist.

## Read first
- Read the full `TechXetra Backend — Architecture & Implementation Spec` (the source of truth).
- Read `README.md` in this task pack.

## Instructions
1. Inspect the repository tree, package manager, scripts, TypeScript settings, Hono entrypoints, Wrangler config, migrations, tests, CI, and current deployment configuration.
2. Run existing safe checks (`git status`, package scripts that do not deploy or mutate production, typecheck/lint/tests if available). Do not run deployment commands or production migrations.
3. Identify existing code that overlaps the target layout. Reuse it where sound; do not create duplicate routers, env types, error handlers, DB helpers, or migrations.
4. Verify current versions and documented compatibility for Hono, Wrangler, D1, `jose`, Zod, Vitest, and `@cloudflare/vitest-pool-workers` using repository lockfiles and installed package docs. Do not upgrade dependencies without a demonstrated need.
5. Check whether the repo has a local D1 database binding and how tests bind Miniflare D1. Identify how secrets/vars are configured without printing secret values.
6. Create a concise implementation map from the current tree to the target layout, plus a list of conflicts, missing prerequisites, and decisions requiring the owner.
7. Do not modify runtime code. You may add/update only a planning document if the repository owner expects one; otherwise report findings in the agent response.

## Hard constraints
- No code changes, migrations, dependency changes, secrets changes, deployments, or production DB access in this task.
- Do not infer that a file is absent until checking the repository tree and relevant references.
- Do not “clean up” unrelated code.

## Acceptance criteria
- [ ] Repository structure and current branch/working-tree state documented.
- [ ] Existing commands and baseline test results recorded exactly.
- [ ] Current bindings, migrations, and test setup identified.
- [ ] Planned file-by-file implementation sequence maps to Tasks 01–11.
- [ ] All ambiguities and risks are listed, with no silent assumptions.
- [ ] No runtime behavior changed.

## Required report
Summarize findings, commands and results, files (if any) changed, and blockers. Do not begin Task 01 until the repo owner or task runner accepts this audit.
