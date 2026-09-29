# Make My Marriage — Project Status

**Last updated:** 29 September 2026  
**Current phase:** Homepage complete; Accounts is next  
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
| Accounts | Not started | Signup, login, logout, and password reset. This is the next planned milestone. |
| Wedding workspace | Not started | Wedding setup, settings, member invitations, roles, and permissions. |
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
- Added reusable marketing components for branding, navigation, account-coming-
  soon dialogs, the sample RSVP interaction, and FAQs.
- Added responsive desktop and mobile layouts with accessible navigation,
  landmarks, focus styles, a skip link, and reduced-motion support.
- Added a clearly labeled illustrative wedding workspace and guest invitation so
  sample content is not mistaken for real user data.
- Added locally hosted Playfair Display and Plus Jakarta Sans fonts with their
  license files, plus local sample gallery imagery.
- Gave current calls to action meaningful preview behavior while authentication
  remains deferred to the Accounts milestone.
- Validated the implementation with lint, type checking, and a production build.

## Current focus

The next planned milestone is **Accounts**: signup, login, logout, password reset,
secure sessions, validation, and the essential password-reset email flow. Start
it only when explicitly requested.

## Update policy

When completing a major feature:

1. Update the date and current phase at the top of this document.
2. Change the relevant milestone status and add a concise implementation note.
3. Add or revise the completed-work section with the behavior delivered and the
   important validation performed.
4. Update the current focus to the next agreed milestone or active feature.
5. Record only implemented work. Keep planned work marked as not started until
   development actually begins.
