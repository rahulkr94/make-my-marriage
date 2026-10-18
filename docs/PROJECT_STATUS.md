# Make My Marriage — Project Status

**Last updated:** 17 October 2026
**Current phase:** Event lifecycle and streaming complete; guest records and event assignments planned next
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
| Wedding workspace | Core complete | Wedding setup, Admin-only settings, invitations, role changes, and member removal are complete, including concurrent last-admin protection. Gallery moderation grant controls remain deferred to Gallery. |
| Dashboard foundation | Complete | Responsive `/dashboard` shell uses live wedding and member data, clearly labels unavailable modules, and provides the permanent signed-in workspace destination. |
| Events | Lifecycle complete | Responsive listing, create/edit/details flows, venues, time-zone-aware schedules, directions, draft publishing, cancellation/restoration, soft deletion, optional live-stream links, role-based visibility, and dashboard integration. Guest assignments continue in the Guests milestone. |
| Guests and invitations | Not started | Guest records, event assignments, invitation links, and QR codes. |
| RSVP and dashboard metrics | Not started | Per-event responses, attendee counts, and live RSVP summaries within the dashboard. |
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

### Wedding workspace — Member invitations

- Added the responsive `/members` workspace from the finalized Stitch desktop
  and mobile designs, using real active-member and pending-invitation data,
  administrator summaries, role guidance, accessible invite and revoke dialogs,
  immediate list updates after invitation actions, delivery feedback, and an
  empty state.
- Added administrator-only member listing, invitation creation, resend, and
  revoke APIs. Invitations use hashed, single-use tokens with seven-day expiry;
  resending rotates and invalidates the previous link, while email failure keeps
  the invitation available and returns the newly issued link once for copying.
- Added the `/join/{token}` acceptance journey for existing and new accounts,
  preserving the invitation through login or signup, requiring the invited
  email, enforcing the one-active-wedding rule, and atomically consuming the
  invitation while creating or reactivating membership.
- Added the `member_invites` model and controlled indexes, reused Resend for
  invitation delivery, and connected the overview and workspace navigation to
  member management.
- Added focused validation, redirect-safety, and index tests. Verified lint,
  TypeScript, 21 unit tests, the production build, controlled Atlas index sync,
  the authenticated desktop UI and invitation dialog, and an isolated Atlas
  smoke test for create, preview, acceptance, single-use enforcement, revoke,
  and administrator-only access; temporary records were removed. Corrected the
  local Resend sandbox sender and confirmed a real member invitation reached
  Resend's `Delivered` state for the account-owner test recipient.
- Extended member invitations so an administrator can invite a trusted partner
  or family member directly as a co-administrator. The form explains the full
  access being granted, requires a separate confirmation, preserves the draft
  when returning to edit it, and carries the administrator role through email,
  acceptance, and active membership. Verified the role selector and confirmation
  flow without sending a test invitation, plus ESLint, TypeScript, 22 unit tests,
  and a production build.

### Dashboard foundation

- Added the responsive `/dashboard` workspace based on the approved Stitch
  desktop direction, with a mobile adaptation consistent with the existing
  workspace screens.
- Connected live wedding details, countdown, active-member count, and pending
  invitation count for administrators. Events, guests, RSVP, tasks, expenses,
  and gallery areas use explicit empty states instead of fabricated user data.
- Added working actions for wedding settings and member invitations, marked
  future actions as unavailable, and changed signup, login, wedding setup,
  invitation acceptance, homepage, settings, and member-navigation destinations
  to use `/dashboard`.
- Preserved `/welcome` as a compatibility redirect to `/dashboard`.
- Verified the authenticated desktop and mobile layouts with isolated temporary
  Atlas records, then removed the records. Validated with ESLint, TypeScript, 21
  unit tests, and a production build.

### Wedding workspace — Member access management (15 October 2026)

- Added Change role and Remove access actions to `/members`, with responsive
  confirmation dialogs, Admin access explanations, self-access warnings, pending
  states, recoverable errors, and immediate member/count updates.
- Added Admin-only member PATCH and DELETE endpoints with same-origin checks,
  strict role validation, and wedding-scoped authorization. Removal preserves
  membership history and the account; a new invitation can reactivate membership.
- Protected the final active Admin from demotion or removal. Transactions share
  a wedding-level write so simultaneous changes retry and recheck both the actor
  and the remaining Admin count. Existing weddings need no data backfill.
- Changed user-facing Administrator labels to Admin across member management,
  invitations, setup, dashboard messages, and authorization errors.
- Verified promotions, removal, persistence after reload, self-demotion redirects,
  restricted navigation, desktop layout, and mobile confirmation layout in a
  production-build browser preview. All preview accounts were isolated in a
  temporary database, which was removed after testing.
- Passed ESLint, TypeScript, production build, 32 unit tests, and eight MongoDB
  integration tests covering role enforcement, cross-wedding isolation, removal,
  rejoining, and concurrent last-admin protection. Integration tests create and
  clean up a separate temporary database; opt in with
  `NODE_ENV=development MMM_RUN_DB_TESTS=1 npx vitest run tests/integration/member-access.test.ts --testTimeout=20000`.
- Gallery moderation grants remain deferred until the Gallery feature exists.

### Events and ceremonies — Release 1 (16 October 2026)

- Applied the finalized Stitch desktop and mobile direction to responsive
  `/events`, `/events/new`, and `/events/{eventId}` screens. The timeline groups
  ceremonies chronologically and shows real published and draft counts; the
  creation flow includes ceremony identity, local schedule, explicit overnight
  handling, event-specific venue/address, optional HTTPS map link, description,
  and draft or published visibility.
- Added member-scoped event list, create, and detail APIs and a dedicated event
  service/model. Admins and Managers can create and see drafts; Members see only
  published events. Every query is wedding-scoped, responses are uncached, and
  create mutations use same-origin checks, strict validation, and rate limits.
- Stored both local date/time and resolved UTC instants. Rejected skipped or
  repeated daylight-saving clock times, derived safe address-search directions
  when no exact map URL exists, and added an explicit Admin confirmation flow
  that recalculates future event instants when the wedding time zone changes.
- Replaced the dashboard event placeholders with working navigation, a create
  action for permitted roles, and the next three published events. Synchronized
  the new MongoDB indexes in the configured development database.
- Upgraded Next.js, `@next/env`, and `eslint-config-next` to 16.4.2 after a
  production dependency audit identified advisories in the previous version;
  the production dependency audit now reports zero vulnerabilities.
- Verified the Admin creation journey, event details, directions fallback,
  chronological list, dashboard event data, and mobile layout in the local
  browser with isolated records, then removed those records. Passed ESLint,
  TypeScript, the production build, 45 unit tests, and three isolated MongoDB
  integration tests covering role visibility, cross-wedding isolation, and
  future event recalculation after a time-zone change.

### Events and ceremonies — Editing and publishing (17 October 2026)

- Added a responsive `/events/{eventId}/edit` screen that reuses the approved
  ceremony form with saved values. Admins and Managers can update ceremony
  identity, local schedule, overnight timing, venue/address, map link,
  description, and draft or published visibility; Members are redirected to the
  read-only detail screen.
- Added the wedding-scoped event PATCH endpoint with same-origin protection,
  strict partial validation, rate limiting, and server-side role enforcement.
  The service merges partial updates into the current event, validates the full
  result, recalculates UTC instants in the wedding time zone, and serializes the
  change with concurrent wedding time-zone updates.
- Connected Edit actions on the ceremony timeline and details screen. Drafts can
  be published directly from either surface, while Members continue to see only
  published events.
- Verified the prefilled edit form and draft-to-published journey in the local
  browser with isolated records, then removed those records. Passed ESLint,
  TypeScript, 48 unit tests, and four isolated MongoDB event integration tests
  covering Manager updates, Member denial, cross-wedding isolation, publishing,
  visibility, and UTC schedule recalculation.

### Events and ceremonies — Lifecycle and streaming (17 October 2026)

- Added optional HTTPS live-stream links to event creation, editing, storage, and
  member-visible event details. External stream actions open safely in a new tab;
  assigned-guest projection remains part of the upcoming guest invitation flow.
- Added planner-only cancellation with an explicit confirmation, a retained
  Cancelled state in the ceremony timeline, and restoration to a private draft.
  Members, dashboard upcoming-event queries, and future guest views receive only
  published events.
- Added planner-only event removal with stronger confirmation and a wedding-scoped
  soft delete. Removed events disappear from timelines and details while their
  database records remain available for future planning and RSVP history.
- Added lifecycle badges, counts, actions, error recovery, a cancelled-event edit
  notice, and responsive confirmation dialogs across event list and detail views.
- Passed ESLint, TypeScript, 50 unit tests, and five isolated MongoDB event
  integration tests covering cancellation, restoration, soft deletion, Member
  denial, cross-wedding isolation, live-stream persistence, and retained history.

## Current focus

Review event lifecycle and streaming. The next planned milestone is **Guests and
event assignments**: guest records, filtering, editing/removal, and assignment to
published events. Start only when explicitly requested.

## Update policy

When completing a major feature:

1. Update the date and current phase at the top of this document.
2. Change the relevant milestone status and add a concise implementation note.
3. Add or revise the completed-work section with the behavior delivered and the
   important validation performed.
4. Update the current focus to the next agreed milestone or active feature.
5. Record only implemented work. Keep planned work marked as not started until
   development actually begins.
