# Make My Marriage — Product Requirements Document V1.1

**Status:** Proposed for review  
**Date:** 26 September 2026  
**Supersedes on approval:** `make-my-marriage-prd-v1.md`

## 1. Product and scope

Make My Marriage is a responsive web application for planning and managing one Indian wedding per workspace. Bride, groom, and invited family members organize events, guests, invitations, responses, tasks, actual expenses, vendors, photos, and documents. Guests use links without creating accounts. The application should be easy to use on a phone.

V1 supports one wedding workspace per registered account. Each wedding can have multiple events. A couple may each have an admin account in the same workspace. The product uses email for invitations and notifications; WhatsApp, SMS, push, payments, travel, accommodation, advanced budgets, calendar integrations, native apps, and built-in streaming are outside V1.

## 2. People and permissions

| Role | V1 access |
| --- | --- |
| Admin (bride or groom) | Manage wedding settings, members, events, guests, invitations, responses, tasks, expenses, vendors, gallery, documents, live-stream links, and dashboard. |
| Manager | Manage events, guests, invitations, responses, tasks, vendors, and expenses; view dashboard; review gallery uploads if assigned the moderation permission. Cannot remove admins or change membership roles. |
| Member | View relevant wedding information; view and update tasks assigned to them; view gallery and shared event details. |
| Guest | See only information exposed by a valid guest invitation or gallery link; respond to invited events and upload photos where allowed. No account. |

An admin invites managers and members by email and chooses their role. The invitation can be accepted by an existing or new account. Admins can revoke membership. The exact permissions must be enforced consistently on every operation; wedding content is scoped to its wedding workspace.

## 3. Accounts and member invitations

- V1 account signup and login use email and password. Email verification is **not required** in V1, as previously decided. Include password reset by email and normal logout/session expiration.
- An invited member's acceptance link is single use and time limited. Since V1 does not verify email at signup, possession of the invitation link is required to accept an invitation; merely registering the invited address cannot grant membership.
- A user who already belongs to a wedding cannot create or join a second wedding in V1. The product explains this limitation clearly rather than silently switching workspaces.
- Admins can resend or revoke unaccepted invitations.

## 4. Wedding and event details

Wedding setup includes bride and groom names, wedding date, main venue and address, description, cover photo, and status. An event includes name, type (Haldi, Mehendi, Sangeet, Wedding, Reception, or custom), date, local start and end time, venue name, address, optional cover photo, description, and status. Store a wedding time zone, defaulting to the location selected at setup.

**Location and directions are V1 requirements.** Each event may have a distinct venue. An admin provides a human-readable venue name and address and may add a map URL or pin. Guests see the venue and a **Get Directions** link for each event they are invited to. If there is no map URL, show the address and a directions search based on that address; never present a fabricated map pin. An admin may set an external live-stream URL per event; it appears only for relevant invited guests when enabled.

The wedding timeline gives a chronological view of upcoming events and due tasks. It does not require a separate planning engine.

## 5. Guests and event assignment

Each guest record includes name, optional email and phone, bride/groom/common side, relationship category, notes, and the events to which they are invited. V1 uses individual guest records; a guest may indicate more than one attendee at each event. Admins and managers can add, edit, remove, filter, and assign guests to events. Invitations can be delivered by email when an email address exists, or the unique link can be copied and shared manually.

Changing event assignments immediately changes what the guest can access through their invitation. Previously removed events must no longer appear or accept new responses.

## 6. Digital invitations, RSVP, and QR codes

- Each invited guest has a unique wedding invitation link. The invitation lists **only** that guest's currently assigned events, with each event's date, time, venue, directions, and enabled live stream link.
- The invitation provides an RSVP form for each invited event. The guest selects Yes or No. Yes requires an attendee count of at least one; No records zero. A guest may update a response until an admin closes responses for that event.
- Admins see invited guest records, accepted, declined, and pending counts **per event**, separately from the sum of expected attendees. Filters include event, response, and guest side.
- **QR codes are included in V1.** A guest's invitation page can display and download a QR code for that guest's invitation URL. Admins can generate a separate shareable QR code for the gallery. An optional RSVP QR points to the same guest-specific invitation/RSVP journey. The QR contains a URL and does not serve as an event check-in or attendance scan in V1.
- Guest-specific QR codes and links are access credentials: warn admins not to post them publicly. Admins can revoke and regenerate a guest link. Gallery links can also be regenerated.

## 7. Tasks, expenses, vendors, and documents

Tasks have a title, description, optional event, assigned member, due date, priority, status (To Do, In Progress, Completed, Cancelled), and creator. Members can update the status of their own assigned tasks.

Expenses record an actual amount, title, category, event, date, paid by, payment status, optional vendor, notes, and one or more bills/receipts. V1 shows totals by wedding and event; it does not set a wedding budget. An expense can be associated with an event and is visible only to authorized members.

Vendors have name, category, contact details, notes, optional associated event(s), quoted amount, paid amount, and supporting documents. Pending amount is derived from quoted and paid amounts; avoid claiming a vendor payment has been made solely because an expense exists. Simple records and manual updates are sufficient for V1.

Documents can be attached to the wedding, an event, vendor, or expense. Authorized members can view/download them. Bills, contracts, and private documents are not exposed through public invitation or gallery links.

## 8. Photo gallery

The wedding gallery groups approved photos by event or Other. Anyone holding the gallery link may view and download approved photos without an account. An admin can revoke/regenerate the gallery link. Rejected or pending photos remain hidden from gallery viewers.

An invited guest may upload photos without an account from a valid guest invitation link. The upload records which guest link was used, selected event, upload time, and status. Members can upload while signed in. Guest uploads start Pending and an admin or permitted manager approves or rejects them. File size, type, count, and upload frequency limits protect the service. The UI explains that a guest link identifies the invitation used; it cannot prove which person physically operated a shared link.

## 9. Email notifications

V1 email covers member invitations, guest invitations, invitation updates, RSVP confirmations and reminders, task assignments and reminders, event reminders, and useful admin alerts such as guest photo submissions. Notification preferences and a practical sending schedule should avoid duplicate or excessive email. Failed sends can be retried, and the UI shows an admin when an invitation email fails so the link can be copied or resent.

## 10. Dashboard and responsive experience

The dashboard shows wedding countdown/date, upcoming events, overdue and pending tasks, per-event RSVP summary and expected attendees, total and recent expenses, and gallery moderation counts. Show values only to roles allowed to see their underlying records. Guest invitation, directions, RSVP, gallery viewing, and uploads must work well on mobile web. Relevant dates and times display in the wedding time zone.

## 11. Product safety and access requirements

- Wedding management requires a signed-in account and the appropriate wedding role.
- Guest invitation links expose only that guest's invited events and public-facing details. Revoked or expired links stop working. Admins can choose a suitable expiry after the wedding.
- Gallery access is by revocable link; approved photos alone are public to link holders. Uploaded files and private attachments must not be accidentally listed through predictable URLs.
- No public guest directory, member contact list, expense record, or private document page.
- File upload feedback must state whether an upload is complete or failed; incomplete files do not appear in the gallery.

## 12. V1 success criteria

1. A couple can create a wedding, both join as admins, and invite family members with appropriate roles.
2. They can add distinct events and venue addresses, and each invited guest sees the correct **Get Directions** link.
3. They can assign guests to events and share a unique invitation link or its **QR code**; the guest sees only invited events.
4. Guests can submit and update event-specific RSVP counts, and the dashboard reports guest records and total expected attendees separately.
5. Members can manage tasks, actual expenses, bills, vendors, and allowed documents.
6. A guest can upload photos from an invitation link; an admin can moderate them; gallery link holders see only approved photos.
7. Important email invitations and reminders are sent with visible failure handling; external event live-stream links work where configured.

## 13. Decisions to approve before system design revision

The following V1 interpretations are proposed for confirmation:

1. Email/password login without signup email verification; password reset remains available by email.
2. One wedding per account, with both partners able to be admins in that wedding.
3. One guest-specific invitation link and QR code listing all currently assigned events; RSVP remains per event.
4. Event venue name/address and Get Directions are required; a map pin/URL is optional.
5. Approved gallery photos are accessible to anyone with a revocable gallery link; only guests with invitation links or signed-in members can upload.
6. QR codes open pages and do not record check-in/actual attendance.

After these decisions are approved, revise the technical system design to match this PRD.
