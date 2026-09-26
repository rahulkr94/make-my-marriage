# Make My Marriage

Every celebration, beautifully organized.

Milestone 1: a minimal, responsive placeholder using Next.js App Router,
TypeScript, Tailwind CSS, and ESLint. The app lives in this repository root.
Product features and external services are reserved for later milestones.

## Prerequisites

- Node.js 20.9.0 or newer (Next.js 16 minimum); use a supported Node.js LTS release for ongoing development.
- npm (the scaffold was validated with Node.js 20.18.0 and npm 10.8.2).
- No environment variables or service accounts are needed for this milestone.

## Install and develop

Run from the repository root:

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Edit `src/app/page.tsx`
to update the page. Stop the server with Ctrl+C.

## Validate and build

```sh
npm run lint
npm run typecheck
npm run build
```

Lint uses the Next.js Core Web Vitals and TypeScript rules with zero warnings
allowed. Type checking generates Next.js route types before running
`tsc --noEmit`, so it also works before the first build. Next.js generates
`next-env.d.ts` and `.next/`; these are ignored by Git.

To serve the production build locally:

```sh
npm run build
npm start
```

## Structure and next milestone

- `src/app/layout.tsx`: root layout, page title, and description.
- `src/app/(marketing)/page.tsx`: the `/` placeholder.
- `src/app/(marketing)/layout.tsx`: the marketing route-group boundary.
- `src/app/globals.css`: Tailwind and the initial ivory, charcoal, and accent palette.
- `src/modules/`: V1 business-module boundaries, reserved with `.gitkeep` files.
- `src/components/`, `src/lib/`, and `src/shared/`: tracked architectural boundaries for later milestones.
- `tests/`: reserved integration and end-to-end test locations.
- `docs/`: existing PRD, system, database, and API designs, preserved as supplied.
- `@/*` resolves to `src/*`.

The module boundaries proposed in `docs/SYSTEM_DESIGN.md` remain the V1
architectural target. The directories are tracked so that this structure is
visible after cloning, but deferred areas contain only `.gitkeep` markers.
Feature code and API route handlers will be introduced only when their milestone
requires working implementations.

System serif and sans-serif fonts keep this scaffold self-contained. Before
Milestone 2, agree on landing-page sections, copy, imagery, typography, and the
intended primary call to action. Add shared components when actual reuse appears.

ESLint 9 and a `typescript-eslint` 8.46.4 override keep lint tooling compatible
with the installed Node.js 20.18.0. Newer lint dependencies require at least
Node.js 20.19.0. Revisit these pins when upgrading to a supported Node.js LTS.

Development and build scripts use Next.js's supported Webpack option because
Turbopack's CSS worker could not bind its internal port in the scaffold environment.
The app still uses the App Router; this bundler choice can be revisited later.
