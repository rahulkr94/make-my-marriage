# Make My Marriage — Project Status

**Last updated:** 27 October 2026
**Current phase:** Launch readiness in progress; production rollout checks remain
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
| Wedding workspace | Core complete | Wedding setup, Admin-only settings, invitations, role changes, member removal, and Admin-managed gallery moderation grants for Managers are complete, including concurrent last-admin protection. |
| Dashboard foundation | Complete | Responsive `/dashboard` shell uses live wedding and member data, clearly labels unavailable modules, and provides the permanent signed-in workspace destination. |
| Events | Lifecycle complete | Responsive listing, create/edit/details flows, venues, time-zone-aware schedules, directions, draft publishing, cancellation/restoration, soft deletion, optional live-stream links, role-based visibility, and dashboard integration. Guest assignments continue in the Guests milestone. |
| Guests and invitations | Complete | Responsive guest records, event assignments, high-entropy private links, email/manual delivery, public assigned-event invitations, revocation, regeneration, and downloadable QR codes are complete. |
| RSVP and dashboard metrics | Complete | Per-event Yes/No responses, attendee counts, close/reopen controls, planner summaries, confirmation emails, and live dashboard metrics. |
| Tasks | Complete | Planner-created work items, same-wedding assignees and ceremony context, due dates, priorities, role-scoped status updates, dashboard attention states, and the combined wedding timeline. |
| Finances | Complete | Actual expenses, payment history, vendor records, ceremony assignments, quotes, linked expenses, and private receipt, bill, contract, quotation, and supporting-document attachments are complete. Deployment requires private R2 credentials and bucket CORS configuration. |
| Gallery | Complete | Member and invitation-scoped guest uploads, private R2 storage, ceremony classification, moderation, approved-only shared gallery access, token rotation/revocation, and QR sharing are complete. |
| Reminders and launch | In progress | Reminder delivery, launch configuration validation, error states, crawl controls, security headers, and core keyboard dialog behavior are complete. Production environment and provider smoke checks remain. |

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
- Added the explicit Manager gallery-moderation grant in the Gallery milestone.

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

### Guests and event assignments — Foundation (18 October 2026)

- Applied the finalized Stitch desktop and mobile guestbook direction to
  responsive `/guests`, `/guests/new`, and `/guests/{guestId}/edit` screens with
  live summary counts, search, side/relationship/event filters, desktop tables,
  mobile cards, empty states, and accessible form controls.
- Added planner-only guest creation, editing, listing, details, and soft removal.
  Guest records store optional contact details, wedding side, relationship, and
  private notes; Members cannot access the private guest-management surface or
  APIs.
- Added published-event assignment management with same-wedding validation,
  retained assignment history, immediate assignment removal, and automatic
  deactivation when either a guest or event is removed. Draft, cancelled,
  deleted, and cross-wedding events cannot be assigned.
- Added wedding-scoped guest and assignment collections, controlled indexes,
  same-origin mutations, strict validation, action rate limits, dashboard guest
  totals/actions, and live Guests navigation for Admins and Managers.
- Passed ESLint, TypeScript, 59 unit tests, three isolated MongoDB guest
  integration tests, and the existing five event integration tests. Synchronized
  the new indexes in the configured development database and reviewed the live
  desktop list and form without changing user data.

### Personal guest invitations and QR access (19 October 2026)

- Applied the finalized Stitch direction to responsive guest-invitation
  management, guest-specific invitation details, the public desktop/mobile
  invitation, and a generic unavailable-link state. Added permanent Invitations
  navigation plus direct access from the Guests screen.
- Added planner-only issuance, email send/resend, revocation, and new-link/QR
  endpoints. Guest credentials use high-entropy random tokens with only SHA-256
  hashes stored; every regenerate, resend, or administrator QR action rotates
  the credential and invalidates earlier links and QR codes.
- Added the `guest_invitations` collection and controlled indexes, delivery
  states, expiry after the wedding, immediate revocation when a guest is
  removed, action rate limits, same-origin mutation checks, and one-time raw-link
  display with manual-copy fallback when Resend cannot deliver.
- Added the private `/i/{token}` experience with only the active guest name,
  public wedding details, and currently assigned published events. Directions
  and enabled livestream links are projected per event; guest contact details,
  notes, workspace records, and unassigned events remain private. Token pages
  are uncached, excluded from search indexing, and use a no-referrer policy.
- Added downloadable guest QR codes that encode the same private invitation URL;
  they do not represent check-in state. A guest can also reveal and download the
  current invitation QR from the public page.
- Passed ESLint, TypeScript, the production build, 65 unit tests, and seven
  isolated MongoDB integration tests covering hashed storage, current-assignment
  projection, link rotation, QR generation, planner authorization, revocation,
  removal, and missing-email behavior. Synchronized invitation indexes, verified
  zero production dependency advisories, and reviewed desktop/mobile planner
  screens plus the unavailable public state in the live local browser without
  changing user data.

### RSVP collection and reporting (19 October 2026)

- Applied the finalized Stitch direction to the private invitation RSVP cards,
  the responsive `/rsvps` planner workspace, and the dashboard attendance
  summary. Guests can accept or decline each assigned ceremony separately,
  choose a bounded attendee count, see their saved response, and update it while
  that ceremony remains open.
- Added token-scoped public RSVP writes that revalidate the active invitation,
  guest, published event, current assignment, and RSVP window on every request.
  Responses use a unique event/guest record, retain historical data after an
  assignment is removed, and never contribute removed assignments to current
  planner totals.
- Added Admin and Manager reporting with ceremony, response, side, and guest
  filters; invited-record, accepted, declined, pending, expected-attendee, and
  response-rate totals; delivery context; responsive desktop tables and mobile
  cards; and per-event close/reopen confirmation flows. Regular Members cannot
  access guest response reports.
- Added live dashboard RSVP progress and expected attendance. RSVP confirmation
  email is attempted through Resend when a guest address and delivery settings
  are available; delivery failure does not roll back the saved response.
- Added the `rsvps` collection and controlled indexes, documented the configurable
  attendee limit, and synchronized indexes in the configured development
  database. Passed ESLint, TypeScript, 68 unit tests, ten relevant isolated
  MongoDB integration tests, and the production build. Reviewed planner desktop,
  confirmation, dashboard, and public desktop/mobile states in the local browser
  without changing live RSVP data.

### Tasks and wedding timeline (22 October 2026)

- Applied the finalized Stitch desktop and mobile direction to a responsive
  `/tasks` workspace with task and timeline views, summary cards, progress,
  search and filters, grouped deadline states, task details, and focused create
  and edit dialogs. The combined timeline orders ceremony starts and task due
  dates in the wedding time zone.
- Added wedding-scoped task list, create, detail, update, and soft-removal APIs;
  strict validation; bounded pagination; same-origin and rate-limit protection;
  same-wedding event and active-assignee checks; and controlled task indexes.
  Due dates entered in wedding-local time are stored as UTC instants.
- Enforced the task permission model in the service layer. Admins and Managers
  can manage all wedding tasks, while Members receive only tasks assigned to
  their membership row and may update only status. Historical assignee labels
  remain readable if membership later changes.
- Added best-effort Resend assignment email when a task is newly assigned or
  reassigned. Delivery configuration or provider failure does not roll back the
  task. Scheduled task reminders remain part of the Reminders milestone.
- Replaced dashboard task placeholders with live completion, active, and overdue
  values; enabled permanent task navigation and the Add task action; and added
  the completed Tasks and timeline foundation step.
- Passed ESLint, TypeScript, 72 non-database tests, four isolated MongoDB task
  integration tests, the production build, and development index synchronization.
  Reviewed desktop list, creation, combined timeline, dashboard metrics, and a
  390-pixel mobile layout in the signed-in local app with no overflow or fresh
  browser errors, then removed the temporary verification record.

### Expense ledger and payment tracking (25 October 2026)

- Applied the finalized Stitch desktop and mobile direction to a responsive
  `/expenses` workspace with actual-expense, paid, outstanding, and record
  totals; payment progress; category breakdowns; search and filters; desktop
  table and mobile card layouts; and empty, detail, create, edit, payment, and
  deletion states.
- Added wedding-scoped expense list, create, detail, update, payment, and soft
  deletion APIs with strict paise-string validation, Indian currency display,
  same-wedding ceremony checks, bounded pagination, same-origin protection,
  action rate limits, derived balances and payment status, and controlled
  expense indexes. Payment history records date, payer, method, reference, and
  note without using floating-point money.
- Enforced Admin and Manager finance access in the service layer. Regular
  Members do not see finance navigation or dashboard values and receive a
  forbidden response if they directly query finance APIs.
- Replaced dashboard finance placeholders with live totals for authorized
  planners, added permanent expense navigation and an Add expense action, and
  recorded the expense ledger in workspace progress. The implementation keeps
  V1 focused on actual expenses and does not create an unsupported wedding
  budget model.
- Passed ESLint, TypeScript, 76 non-database tests, three isolated MongoDB
  expense integration tests, the production build, and development index
  synchronization. Reviewed create, detail, payment, dashboard, empty, desktop,
  and 390-pixel mobile states in the signed-in local app with no horizontal
  overflow, then removed the temporary verification record.

### Vendor management (25 October 2026)

- Applied the finalized Stitch desktop and mobile direction to a responsive
  `/vendors` directory with live quoted, paid, pending, and vendor totals;
  search, category, ceremony, payment-state, and sort controls; desktop tables;
  mobile cards; empty states; and focused add, edit, details, and archive flows.
- Added wedding-scoped vendor list, create, detail, update, and archive APIs with
  strict contact, paise-string, and event-assignment validation; bounded
  pagination; same-origin and rate-limit protection; controlled indexes; and
  derived no-quote, unpaid, partial, paid, and overpaid states.
- Enforced Admin and Manager finance access and same-wedding ceremony checks in
  the service layer. Regular Members cannot access vendor records, and archived
  vendors leave historical linked expenses available.
- Connected expenses to active vendor records with same-wedding validation,
  vendor-name snapshots, vendor preselection from details, and linked-expense
  summaries. Vendor quoted and paid amounts remain manually maintained and do
  not change automatically when an expense is recorded.
- Added permanent Vendors navigation and dashboard progress. Passed ESLint,
  TypeScript, 82 non-database tests, six relevant isolated MongoDB expense and
  vendor integration tests, the production build, and development index synchronization. Reviewed
  empty, create, list, details, edit, expense-preselection, desktop, and
  390-pixel mobile states in the signed-in local app with no horizontal overflow.

### Private financial attachments (25 October 2026)

- Applied the finalized Stitch desktop expense-receipt, desktop vendor-document,
  and mobile expense directions to private attachment sections embedded in live
  expense and vendor details. Added responsive empty, upload-progress, populated,
  search, category-filter, preview/download, rename, replace, and delete states.
- Added wedding-scoped private document listing, upload-intent, completion,
  metadata-update, signed-download, and deletion APIs. Uploads use short-lived
  object-specific R2 URLs, opaque object keys, a private bucket, Admin/Manager
  authorization, same-wedding expense/vendor checks, strict 10 MB type limits,
  and idempotent completion.
- Completion verifies the stored object size, MIME type, and representative file
  signature before making a document visible. Download URLs expire after five
  minutes; raw object keys never reach the browser or public guest/gallery APIs.
- Documented the four required R2 environment variables and browser PUT CORS
  policy. The local R2 configuration was added later for gallery uploads;
  financial attachment upload/download remains a separate production smoke test.
- Passed ESLint, TypeScript, 86 non-database tests, eight isolated MongoDB
  expense/vendor/document integration tests, the production build, development
  index synchronization, and production dependency audit. Reviewed expense and
  vendor empty states, the upload modal, desktop layouts, and 390-pixel mobile
  layouts in the signed-in app with no overflow or browser console errors.

### Wedding gallery (26 October 2026)

- Applied the finalized Stitch desktop management, mobile management, mobile
  guest-upload, and desktop shared-gallery direction to responsive `/gallery`,
  `/i/[token]`, and `/g/[token]` experiences. Removed prototype-only controls and
  sample counts so every summary, filter, empty state, and moderation queue uses
  live wedding data.
- Added member and guest photo upload-intent and idempotent completion APIs using
  private R2 objects, opaque keys, short-lived signed URLs, 10 MB JPG/PNG/WEBP
  limits, stored-object metadata checks, and image-signature validation. Guest
  uploads revalidate the active invitation and current ceremony assignment.
- Added wedding-scoped photo records, ceremony and Other classification, pending,
  approved, and rejected moderation states, and Admin or explicitly granted
  Manager review access. Admins can grant or remove the Manager gallery
  moderation permission from Members.
- Added approved-only shared galleries with high-entropy hashed tokens,
  five-minute photo URLs, download authorization, link rotation, immediate QR
  generation, and pause/revocation. Old links and downloaded QR codes stop
  resolving after rotation or revocation.
- Connected live approved and pending counts to the dashboard and made Gallery a
  permanent workspace destination for every active member.
- Passed ESLint, TypeScript, 90 non-database tests, 12 relevant isolated MongoDB
  gallery/member/document integration tests, the production build, and index
  synchronization. Reviewed the desktop empty gallery, upload dialog, share
  dialog, navigation, and browser console with no application errors. A real
  local R2 gallery upload was subsequently confirmed; production-origin CORS and
  signed transfer checks remain part of launch verification.

### Wedding gallery — Full-screen preview and Admin deletion (27 October 2026)

- Added a visible preview control to every gallery photo and an accessible
  full-screen lightbox that preserves the active status and ceremony filters.
- Added circular previous and next navigation, left and right keyboard controls,
  a live position counter, photo source, upload date, and optional caption.
  Escape closes the preview, focus remains contained while it is open, body
  scrolling is locked, and focus returns to the originating preview button.
- Replaced the eye preview symbol with a full-screen expand icon. Added an
  Admin-only permanent delete action with a confirmation dialog; deletion
  removes the photo from workspace and shared-gallery results, marks its file
  metadata deleted, and attempts private R2 object cleanup. Managers retain
  moderation access without receiving photo-deletion permission.
- Verified mouse and keyboard preview navigation, the Admin-only delete control,
  and the non-destructive confirmation/cancel flow across live gallery photos in
  the local browser. Passed ESLint, TypeScript, 96 non-database tests, and the
  production build. The isolated gallery database test remains available when a
  test MongoDB connection is configured.

### Warm Editorial Nuptials design system (27 October 2026)

- Applied the shared warm editorial theme across marketing, account, workspace,
  invitation, and public guest experiences through the global Tailwind tokens:
  warm ivory surfaces, accessible terracotta primary actions, restrained olive
  and brass accents, warmer outlines, measured radii, and low-contrast ambient
  elevation.
- Preserved the Playfair Display and Plus Jakarta Sans hierarchy, aligned
  headline weights and label tracking with the supplied typography scale, and
  connected existing expense, vendor, dashboard, and gallery accents to the
  semantic palette so future token changes remain consistent.
- Updated the brand mark, invitation QR colors, invitation email action, fatal
  error state, selection color, placeholders, and primary hover treatment to use
  the same system. Passed ESLint, TypeScript, 96 non-database tests, and the
  production build; reviewed the homepage and signed-in workspace in the local
  browser.

### Cross-workspace expense UX alignment (27 October 2026)

- Extended the Expense workspace’s visual hierarchy to Events, Tasks, Guest
  Invitations, RSVP, Guests, and Members with one reusable summary metric:
  semantic bottom borders, contained icon tiles, editorial type, and consistent
  warm surface elevation now identify neutral, active, completed, attention, and
  error states.
- Aligned dense lists and tables with the Expense presentation using quiet
  surface rows, warmer dividers, clearer hover feedback, compact action icons,
  and responsive mobile cards. Added ceremony-type and invitation icons, event
  and task status rails, RSVP response colors, and matching member/invitation
  list treatments without changing permissions or workflows.
- Moved Members from its legacy standalone navigation and header onto the shared
  workspace shell, aligning its sidebar, mobile navigation, breadcrumb, active
  state, 1320-pixel content grid, headings, and responsive page spacing with the
  rest of the signed-in application.
- Reviewed all six signed-in pages against live local data in the browser.
  Passed ESLint, TypeScript, 96 non-database tests, and the production build.

### Workspace navigation performance (27 October 2026)

- Reduced the shared setup for every authenticated workspace page from four
  sequential MongoDB reads to two aggregate reads by joining the active session
  to its user and the active membership to its wedding.
- Replaced the faint content-only route fallback with a responsive full-workspace
  skeleton that preserves the desktop sidebar, mobile header, page heading,
  summary cards, filters, and main content while the destination page loads.
  This removes the blank-looking frame during dynamic navigation and local
  first-route compilation.
- Verified authenticated navigation and both aggregate lookups against live local
  data. Passed ESLint, TypeScript, 96 non-database tests, and the production
  build. First visits in `next dev` can still pause while Webpack compiles an
  unvisited route; production serves the prebuilt route bundle.

### Notifications and scheduled reminders (26 October 2026)

- Applied the approved Stitch direction to responsive `/notifications` and
  `/notifications/settings` workspaces. Admins and Managers can review scheduled,
  processing, sent, failed, and cancelled deliveries; filter the history; retry
  failed messages; and configure reminder rules, delivery times, and quiet hours.
- Added event reminders for active assigned guests, RSVP reminders for invited
  guests who have not responded, task-due reminders for current assignees,
  overdue-task digests, and optional guest-photo moderation digests. RSVP emails
  direct guests back to their existing private invitation because raw invitation
  tokens are never stored or reconstructed.
- Added wedding-time-zone schedule calculation, stable idempotency keys,
  duplicate-safe materialization, stale-delivery cancellation, recipient and
  source revalidation immediately before send, bounded batches, five-minute
  leases, and at most three delivery attempts with backoff. Resend provider IDs
  and sanitized failure messages are retained for planner-visible history.
- Added authenticated planner APIs for listing, settings, and retry, plus a
  `CRON_SECRET`-protected worker route that returns only aggregate results. Added
  controlled notification indexes and a Vercel production cron configuration.
  The checked-in once-daily cadence deploys on Vercel Hobby; precise configured
  send times require a more frequent scheduler, available on Vercel Pro or from
  another trusted scheduler calling the same protected endpoint.
- Passed ESLint, TypeScript, 94 non-database tests, and the production build.
  Reviewed live-data desktop and 390-pixel mobile notification and settings
  layouts with no browser console errors. No worker invocation or email delivery
  was performed during UI verification.

### Launch readiness — Release 1 (26 October 2026)

- Added branded loading, not-found, route-error, and root-error states. Added
  homepage metadata, a public-only sitemap, crawl exclusions for private and
  account routes, no-store headers for tokenized experiences, and baseline
  browser security headers while suppressing the framework disclosure header.
- Added a workspace skip link and improved the tall desktop sidebar so navigation
  scrolls independently. Standardized custom modal keyboard behavior across
  events, guests, invitations, members, RSVP, tasks, finance, gallery, and
  notifications: initial focus, focus containment, Escape close, background
  scroll locking, and focus restoration now follow one shared implementation.
- Added `npm run launch:validate-env`, which validates the production URL,
  MongoDB, Resend, R2, and scheduler configuration without printing secret
  values. Added `docs/LAUNCH_CHECKLIST.md` for configuration, provider smoke
  tests, accessibility, release, rollback, and post-deployment verification.
- Synchronized all application indexes in the configured development database
  and confirmed the production dependency audit reports zero vulnerabilities.
  The environment validator correctly identifies the local-only `APP_URL` and
  missing `CRON_SECRET` as launch blockers.
- Passed ESLint, TypeScript, 96 non-database tests, the production build, header
  and crawl-response checks, and focused desktop/mobile browser checks for the
  404 state, sidebar scrolling, and modal focus behavior. Provider smoke tests
  remain part of the production rollout.

## Current focus

Complete the **production rollout checks**: set the public `APP_URL` and a strong
`CRON_SECRET`, choose the scheduler cadence, run the production configuration
validator, verify controlled Resend and R2 flows in a preview deployment, finish
the cross-browser keyboard pass, then promote the verified build to production.

## Update policy

When completing a major feature:

1. Update the date and current phase at the top of this document.
2. Change the relevant milestone status and add a concise implementation note.
3. Add or revise the completed-work section with the behavior delivered and the
   important validation performed.
4. Update the current focus to the next agreed milestone or active feature.
5. Record only implemented work. Keep planned work marked as not started until
   development actually begins.
