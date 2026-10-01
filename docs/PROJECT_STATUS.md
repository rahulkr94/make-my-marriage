# Make My Marriage — Project Status

**Last updated:** 1 October 2026
**Current phase:** Wedding workspace in progress; wedding setup and settings complete
**Overall status:** Active development

## Purpose

This document is the living record of implementation progress for Make My
Marriage. Update it whenever a major feature or milestone is completed, or when
the current implementation status materially changes. Keep detailed product and
technical requirements in `PRD.md`, `SYSTEM_DESIGN.md`, `DATABASE_DESIGN.md`, and
`API_DESIGN.md`.

## Milestone overview

| Milestone | Status | Notes |
| --- | --- | --- |
| Application scaffold | Complete | Next.js App Router, TypeScript, Tailwind CSS, ESLint, repository structure, environment examples, and Webpack-based development/build scripts are in place. |
| Public homepage | Complete | Responsive marketing page at `/` with navigation, hero, labeled sample wedding workspace, feature overview, four-step workflow, guest experience, family roles, gallery preview, FAQ, and closing call to action. |
| Accounts | Complete | Completed 29 September 2026. Signup, login, logout, password reset, secure sessions, account UI, validation, rate limits, and reset email delivery are implemented and verified with MongoDB Atlas and Resend. |
| Wedding workspace | In progress | Wedding setup and administrator-only wedding settings are complete. Member invitations, roles, and permissions remain. |
| Events | Not started | Event creation and editing, venues, dates, directions, and live-stream links. |
| Guests and invitations | Not started | Guest records, event assignments, invitation links, and QR codes. |
| RSVP and dashboard | Not started | Per-event responses, attendee counts, and the initial signed-in dashboard. |
| Tasks | Not started | Assignments, status updates, due dates, and wedding timeline. |
| Finances | Not started | Expenses, vendors, bills, and private attachments. |
| Gallery | Not started | Photo uploads, moderation, and shareable gallery access. |
| Reminders and launch | Not started | Scheduled emails, final accessibility checks, and production setup. |

## Completed work

### Application scaffold

- Created the npm-based Next.js App Router application in the repository root.
- Configured TypeScript, Tailwind CSS, ESLint, path aliases, and the initial app
  and module directory structure.
- Added environment-variable documentation without committing credentials.
- Configured development and production builds to use Webpack for compatibility
  with the development environment.
- Established the warm ivory, charcoal, and restrained-accent visual foundation.

### Public homepage

- Built the public landing page in `src/app/(marketing)/page.tsx`.
- Added reusable marketing components for branding, navigation, account entry
  points, the sample RSVP interaction, and FAQs.
- Added responsive desktop and mobile layouts with accessible navigation,
  landmarks, focus styles, a skip link, and reduced-motion support.
- Added a clearly labeled illustrative wedding workspace and guest invitation so
  sample content is not mistaken for real user data.
- Added locally hosted Playfair Display and Plus Jakarta Sans fonts with their
  license files, plus local sample gallery imagery.
- Kept the sample RSVP interaction clearly separated from stored application
  data and connected account calls to action when authentication was added.
- Validated the implementation with lint, type checking, and a production build.

### Accounts

- Added responsive account creation, login, forgotten-password, and new-password
  pages, then connected every homepage account call to action to the live flow.
- Added versioned JSON routes for signup, login, logout, current-account lookup,
  reset-link requests, and password reset.
- Added normalized unique email identities, Argon2id password hashes, opaque
  server-managed sessions, secure HTTP-only cookies, session rotation and
  revocation, idle and absolute expiry, and a protected post-login welcome page.
- Added same-origin mutation checks, strict Zod request validation, action-scoped
  rate limits, generic reset-request responses, hashed single-use reset tokens,
  and session invalidation after a password reset.
- Added MongoDB/Mongoose models and a controlled `npm run db:sync-indexes`
  command for unique and TTL indexes. Added Resend password-reset delivery with
  escaped account data and one-hour reset links.
- Documented the required local environment variables in `.env.example` and
  added focused tests for password hashing, tokens, validation, email
  normalization, origin checks, and rate-limit key derivation.
- Validated the implementation with ESLint, TypeScript, ten passing unit
  tests, a production build, route rendering checks, and a clean npm dependency
  audit.
- Verified the live MongoDB-backed browser flow in Google Chrome: account
  creation, initial authenticated access, logout and protected-route redirect,
  invalid-password handling, fresh login, a second logout, duplicate-account
  rejection, persisted session revocation, reset-email delivery through Resend,
  and password reset with the one-time emailed link.
- Added authenticated-user redirects for login and signup, plus cross-tab logout
  synchronization for open workspace pages. Verified in Google Chrome that an
  authenticated `/login` request returns to `/welcome` and that logging out in
  one of two open welcome tabs moves both tabs to `/login` without a manual
  refresh.

### Wedding workspace — Wedding setup

- Added a responsive `/setup/wedding` flow for bride and groom names, wedding
  date, IANA time zone, main venue, address, and an optional description.
- Added strict setup validation, wedding and membership models, and an atomic
  transaction that creates the wedding and its creator's first `ADMIN`
  membership together.
- Enforced one active wedding per account with the specified partial unique
  membership index and returned a clear conflict for repeat creation attempts.
- Added authenticated wedding creation and member-scoped wedding read APIs, and
  expanded the current-account response with wedding and membership summaries.
- Redirected signed-in accounts without a wedding into setup and accounts with a
  wedding into a workspace welcome view showing the saved date, venue, role,
  address, and description.
- Expanded the controlled index command to include wedding collections and made
  it load the same local environment configuration as Next.js. Synchronized the
  indexes against the configured development database.
- Added five focused wedding validation and index tests. Verified the live Atlas
  transaction, first-admin membership, workspace lookup, duplicate-wedding
  rejection, and test-data cleanup with an isolated integration smoke run.
- Applied the finalized Stitch desktop and mobile designs to the wedding setup
  and workspace landing pages while preserving the live setup and session flows.

### Wedding workspace — Wedding settings

- Added the responsive `/settings/wedding` screen from the finalized Stitch
  desktop and mobile designs, with a live wedding summary, editable foundational
  details, character count, change summary, mobile save actions, and clear
  loading, validation, success, and retry states.
- Added the administrator-only `PATCH /api/v1/weddings/{weddingId}` flow with
  same-origin protection, strict partial validation, member-scoped lookup, and
  server-side role enforcement. Managers and regular members cannot change
  wedding settings.
- Connected the workspace navigation to settings, added a visible administrator
  edit action to the celebration overview, and preserved the overview as the
  cancel and return destination.
- Made the public homepage session-aware: signed-in accounts see a direct link
  to their wedding workspace, or to setup when they have not created one,
  instead of login and account-creation actions. The navigation identifies the
  signed-in user and labels an existing workspace action “Go to your wedding.”
- Added wedding-update schema coverage. Verified the UI at desktop and mobile
  sizes, confirmed dirty-state behavior without modifying live user data, and
  completed an isolated Atlas smoke test proving that an admin update persists
  while a manager update is rejected; the smoke records were removed.

## Current focus

Review the completed wedding setup and settings flows. The next planned
increment within **Wedding workspace** is member invitations, followed
separately by roles and permissions. Start the next increment only when
explicitly requested.

## Update policy

When completing a major feature:

1. Update the date and current phase at the top of this document.
2. Change the relevant milestone status and add a concise implementation note.
3. Add or revise the completed-work section with the behavior delivered and the
   important validation performed.
4. Update the current focus to the next agreed milestone or active feature.
5. Record only implemented work. Keep planned work marked as not started until
   development actually begins.
