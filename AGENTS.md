# Make My Marriage

## Scope and context

- Read the relevant requirements in `docs/PRD.md`, `docs/SYSTEM_DESIGN.md`,
  `docs/DATABASE_DESIGN.md`, and `docs/API_DESIGN.md` before implementing features.
- Read `docs/PROJECT_STATUS.md` before starting feature work so the implementation
  begins from the latest recorded project state.
- Preserve the existing documents and filenames unless the user requests edits.
- Milestone 1 is the application scaffold. Implement later milestones only when
  requested; reserved directories with `.gitkeep` do not authorize feature work.
- The visual direction is quiet editorial: warm ivory, charcoal, restrained
  accents, responsive layouts, and accessible markup.

## Incremental development sequence

The scaffold is complete. Follow this agreed sequence for subsequent development;
these steps are a roadmap, not authorization to implement everything at once.
Start only the feature requested by the user, break it into small usable pieces,
validate each piece, and incorporate user feedback before moving forward.

1. **Homepage:** Build the public landing page at `/` with realistic sample
   content and an agreed responsive visual style. Include a header, hero, clearly
   labeled sample wedding preview, feature overview, how-it-works section, and
   closing call to action. Give buttons meaningful behavior; activate account
   creation when authentication is implemented. The signed-in dashboard comes
   later, when real wedding data is available.
2. **Accounts:** Signup, login, logout, and password reset.
3. **Wedding workspace:** Wedding setup, settings, member invitations, and
   permissions.
4. **Events:** Create and edit events, venues, dates, and directions.
5. **Guests and invitations:** Guest records, event assignments, unique
   invitation links, and QR codes.
6. **RSVP:** Guest responses, attendee counts, and an initial dashboard.
7. **Tasks:** Assignments, status updates, due dates, and timeline.
8. **Finances:** Expenses first, then vendors and private attachments.
9. **Gallery:** Photo uploads, moderation, and shareable gallery access.
10. **Reminders and launch:** Scheduled emails, final accessibility checks, and
    production setup.

Security, validation, mobile layouts, and relevant tests belong in every step.
Essential emails, such as password resets and member invitations, arrive with
their feature. Introduce shared file/storage capabilities when private
attachments first require them, then reuse them for the gallery. Keep the four
design documents as the detailed requirements for each feature.

## Project status tracking

- Maintain `docs/PROJECT_STATUS.md` as the living record of project progress.
- Update it in the same change whenever a major feature or milestone is completed
  or its implementation status materially changes.
- Record the completion date, delivered behavior, relevant validation, current
  milestone status, and the next agreed focus.
- Record only work that has actually been implemented and verified. Do not mark
  roadmap items complete in anticipation of future development.

## Architecture

- Use npm, TypeScript, Next.js App Router, and Tailwind CSS in the repository root.
- `@/*` maps to `src/*`. The home page is `src/app/(marketing)/page.tsx`.
- Keep pages, layouts, and route handlers in `src/app`; business logic belongs in
  `src/modules`, and integration clients belong in `src/lib`.
- Use `src/components` for reusable UI and `src/shared` for shared types,
  constants, and utilities. Add files when they serve an implemented requirement.
- Authentication, MongoDB/Mongoose, Resend, R2, APIs, and deployment configuration
  remain deferred until their feature milestone is requested.
- For Next.js changes, consult the relevant version-matched documentation in
  `node_modules/next/dist/docs/` after dependencies are installed.

## Commands and checks

- Install the locked dependencies with `npm ci`; start locally with `npm run dev`.
- Run `npm run lint`, `npm run typecheck`, and `npm run build` for application or
  configuration changes. Documentation-only changes need a content/diff review.
- Add meaningful feature tests as features arrive; the reserved test folders do
  not currently contain a test suite.
- Development and builds use Webpack because Turbopack's internal port was
  blocked in the scaffold environment. Keep dependency compatibility constraints
  in `package.json` in mind when upgrading Node.js or tooling.

## Repository practices

- Preserve unrelated user changes and Git configuration.
- Keep credentials in ignored local environment files; `.env.example` contains
  only documentation and non-secret examples.
- Commit or push only when the user requests it for the work at hand.
- These instructions are maintained manually. `agentRules: false` in
  `next.config.ts` prevents Next.js from adding generated instruction blocks.
