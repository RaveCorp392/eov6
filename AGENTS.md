# Repository Guidelines

## Project Structure & Module Organization
The site runs on Next.js App Router. Pages live under `app/`—marketing in `app/marketing`, solution verticals in `app/solutions`, and sitemap handlers under `app/server-sitemap.xml`. Shared UI sits in `components/`, hooks in `hooks/`, and reusable logic in `lib/` (including Firebase admin helpers). Long-form copy and MDX live in `content/` and `docs/`, static assets belong in `public/`, and tests reside in `tests/e2e`. Firebase rules stay in the repo root (`firestore.rules`, `live.firestore.rules`, `storage.rules`).

## Build, Test, and Development Commands
Use `npm run dev` for the live development server. `npm run build` produces the production bundle, and `npm run start` runs it locally. Run `npm run lint` for ESLint, `npm run typecheck` for TypeScript validation, and `npm run preflight` before a pull request—it chains lint and typecheck. `npm run check:utf8` guards against encoding issues. If the local API is up, `npm run smoke:translate` hits `/api/translate` to verify the agent flow. Deploy Firestore and Storage rules with `npm run rules:deploy` after authenticating via the Firebase CLI.

## Coding Style & Naming Conventions
Stick to TypeScript with functional React components and two-space indentation. Favor the `@/` path aliases from `tsconfig.json` for cross-cutting imports. Tailwind CSS powers styling—reuse existing utility patterns and keep variant ordering mobile-first. Name components descriptively (`AgentHeader`, `SessionCard`) and suffix hooks with `use` (e.g., `useSessionState`). Run `npm run lint -- --fix` if you need automated formatting.

## Testing Guidelines
The `tests/e2e` directory outlines the desired smoke flow; implement Playwright specs in `*.spec.ts` files alongside this structure. When adding acceptance criteria, mirror the session URLs used in the UI (`/agent` for creators, `/s/[code]` for callers) so tests map cleanly to real interactions. Until automation is wired up, document manual steps inside the skipped specs and keep them current after feature changes.

## Commit & Pull Request Guidelines
Follow the Conventional Commit style used in history (`feat(scope): message`, `fix(auth): guard token refresh`, etc.). Keep commits focused and reference the feature area in the scope. Pull requests should include a short summary, screenshots or GIFs for UI shifts, and links to relevant tracking tickets or docs. Always note if Firebase rules or public assets changed. Before requesting review, run `npm run preflight` and call out any skipped checks in the PR description.
