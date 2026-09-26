# Make My Marriage — V1 API Design

**Status:** Implementation baseline · **Date:** 26 September 2026  
**Inputs:** Approved PRD V1.1, System Design V1.1, Database Design V1  
**Transport:** HTTPS JSON API implemented with Next.js App Router route handlers

## 1. API boundaries

The app serves both a responsive web UI and resource routes. `/api/v1/...` is the stable JSON boundary for browser features, public invitation/gallery pages, and future clients. Server Actions may call the same service functions for simple forms; every route or action performs the same server-side validation and authorization. UI pages (`/i/{token}`, `/g/{galleryToken}`) are outside the JSON API.

**Actors:** a signed-in member session, a guest-specific invitation link, a gallery link holder, or an authenticated scheduler invocation. Guest and gallery links grant limited capabilities, not member sessions. Never accept a client-supplied `weddingId`, `guestId`, `role`, or `createdBy` as proof of access.

## 2. Common conventions

| Topic | Contract |
| --- | --- |
| Base path | `/api/v1`; path IDs are canonical MongoDB ObjectId strings, checked before lookup. |
| Content | `application/json; charset=utf-8`; photo/QR downloads use documented binary content types. Unknown fields rejected on writes. |
| Dates | Instants are ISO 8601 UTC strings; local event date is `YYYY-MM-DD`, local time `HH:mm`, plus wedding `timeZone` (IANA). |
| Money | INR values as **decimal strings of paise**, e.g. `"amountMinor":"8000000"`; validate as nonnegative 64-bit integer. Avoid JSON floating-point money. |
| List | `limit` (default 20, max 100), opaque `cursor`, optional documented filters and sort. Return `{items,nextCursor}`; `nextCursor:null` ends list. |
| Success | Single resource `{data:{...}}`; list `{data:{items:[...],nextCursor:null}}`; creation `201` plus resource and `Location`; deletion/deactivation `204`. |
| Mutation concurrency | `updatedAt`/version supplied as `If-Match` for edits where lost updates matter; stale value returns `412 PRECONDITION_FAILED`. RSVP uses last valid submission wins. |
| Rate limits | Apply to login/reset, public token reads, RSVP, email sends, and upload flows; respond `429` with `Retry-After`. Values configured per environment. |
| Caching | Authenticated and token-bearing responses: `Cache-Control: private, no-store`; no token URLs in analytics or shared caches. |

Use consistent error envelopes and a correlation ID:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "details": [{ "path": "attendeeCount", "message": "Must be at least 1" }],
    "requestId": "req_example"
  }
}
```

Codes: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RSVP_CLOSED` (409), `INVITATION_UNAVAILABLE` (404), `PRECONDITION_FAILED` (412), `UPLOAD_EXPIRED` (410), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500). Public invalid/expired/revoked tokens should return a generic unavailable response without revealing whether a guest exists. Do not expose stack traces, token hashes, storage keys, or provider internals.

## 3. Authentication and authorization

Member endpoints use secure, HTTP-only, SameSite session cookies. All cookie-authenticated state-changing requests require same-origin checks and CSRF protection. Login rotates session; logout invalidates it. Password-reset requests return the same generic response for existing and nonexistent emails. No signup email verification in V1.

| Method and path | Purpose | Actor |
| --- | --- | --- |
| `POST /auth/signup` | Create account with `name,email,password`; optionally continue member invitation acceptance after login. | Anonymous |
| `POST /auth/login` | Email/password; set session cookie; return sanitized member profile. | Anonymous |
| `POST /auth/logout` | Revoke current session and clear cookie. | Member |
| `GET /auth/me` | Current account, membership and wedding summary. | Member |
| `POST /auth/password-reset-requests` | Email reset link; always generic `202` response. | Anonymous |
| `POST /auth/password-resets` | Consume reset token with `newPassword`; invalidate sessions per policy. | Reset token |

Wedding member access resolves membership for the path `weddingId` on **every** protected request, checks `status=ACTIVE`, then applies the central permission matrix. Managers cannot mutate membership or wedding settings. A member can update only an assigned task's status. Guest-token requests resolve a token hash to wedding and guest, then check current guest/event assignment and response window. Gallery-token requests can see only approved media.

## 4. Wedding and member endpoints

| Method and path | Role | Behavior |
| --- | --- | --- |
| `POST /weddings` | Signed-in user with no active wedding | Create wedding and first ADMIN membership atomically; `409` if already a member. |
| `GET /weddings/{weddingId}` | Member | Role-filtered wedding profile. |
| `PATCH /weddings/{weddingId}` | Admin | Update names, wedding date, main venue/address, time zone, cover file, description, status. |
| `GET /weddings/{weddingId}/members` | Admin | Members and pending invitations; redact invite tokens. |
| `POST /weddings/{weddingId}/member-invitations` | Admin | Email, intended role, expiry; issue one-time link and email; return delivery state, not raw token in list. |
| `POST /weddings/{weddingId}/member-invitations/{inviteId}/resend` | Admin | Rotate link and resend; invalidate previous link. |
| `DELETE /weddings/{weddingId}/member-invitations/{inviteId}` | Admin | Revoke unaccepted link. |
| `POST /member-invitations/accept` | Logged-in invited account + token | Validate matching email and link possession; atomically consume invite/create membership. |
| `PATCH /weddings/{weddingId}/members/{memberId}` | Admin | Set role/grants (only manager moderation grant in V1); guard last admin. |
| `DELETE /weddings/{weddingId}/members/{memberId}` | Admin | Deactivate membership; last admin cannot be removed. |

`POST /weddings` example:

```json
{
  "brideName": "Priya",
  "groomName": "Rahul",
  "weddingDate": "2027-02-20",
  "timeZone": "Asia/Kolkata",
  "mainVenueName": "Celebration Hall",
  "mainAddress": "Bengaluru, Karnataka"
}
```

Member invitations are not accepted just by registering an email address. Return `409 ALREADY_IN_WEDDING` if the account has a different active wedding. An email send failure does not undo an otherwise valid invite; admin sees `deliveryStatus: "FAILED"` and can resend.

## 5. Events and directions

| Method and path | Role | Behavior |
| --- | --- | --- |
| `GET /weddings/{weddingId}/events` | Member | List wedding events; relevant member visibility. |
| `POST /weddings/{weddingId}/events` | Admin, Manager | Create event with local date/time, venue and address. |
| `GET /weddings/{weddingId}/events/{eventId}` | Member | Event details. |
| `PATCH /weddings/{weddingId}/events/{eventId}` | Admin, Manager | Update schedule, venue, directions link, stream URL, status, RSVP close time. Recalculate pending reminders. |
| `DELETE /weddings/{weddingId}/events/{eventId}` | Admin, Manager | Soft delete/cancel and deactivate event assignments; retain history. |

Event write shape:

```json
{
  "name": "Sangeet",
  "type": "SANGEET",
  "localDate": "2027-02-19",
  "startLocalTime": "19:00",
  "endLocalTime": "23:00",
  "venueName": "Celebration Hall",
  "address": "Bengaluru, Karnataka",
  "mapUrl": "https://maps.example/place/123",
  "liveStreamUrl": null,
  "status": "PUBLISHED"
}
```

`mapUrl` is optional and must use HTTPS; if absent, the response contains a URL-encoded external directions search built from `address`. `directionsUrl` is **server-derived** and returned with the event; the client cannot assert a pin. Validate external URL schemes; responses should expose the live-stream URL only to permitted audiences. A wedding time-zone change may alter future UTC instants and reminders; use an explicit admin update flow and show impact.

## 6. Guests, assignments, invitations, and admin RSVP

| Method and path | Role | Behavior |
| --- | --- | --- |
| `GET /weddings/{weddingId}/guests` | Admin, Manager | List/filter by side, relationship, event, status; no full export in V1. |
| `POST /weddings/{weddingId}/guests` | Admin, Manager | Create individual guest. Email and phone optional, not unique. |
| `GET /weddings/{weddingId}/guests/{guestId}` | Admin, Manager | Guest detail and current event assignments. |
| `PATCH /weddings/{weddingId}/guests/{guestId}` | Admin, Manager | Edit guest data. |
| `DELETE /weddings/{weddingId}/guests/{guestId}` | Admin, Manager | Deactivate guest and revoke invitation; exclude from active summaries. |
| `PUT /weddings/{weddingId}/guests/{guestId}/events` | Admin, Manager | Replace active event IDs as a set; empty list removes all; same-wedding validation. |
| `POST /weddings/{weddingId}/guests/{guestId}/invitation` | Admin, Manager | Issue or rotate guest-specific URL; optionally send via email. Return link and QR endpoint to authorized caller **only in this immediate response**. |
| `POST /weddings/{weddingId}/guests/{guestId}/invitation/send` | Admin, Manager | Send current invitation when recoverable or rotate-and-send, returning delivery state. See token note below. |
| `DELETE /weddings/{weddingId}/guests/{guestId}/invitation` | Admin, Manager | Revoke current guest link and its QR. |
| `POST /weddings/{weddingId}/guests/{guestId}/invitation/rotate-and-qr` | Admin, Manager | Rotate token and return new URL plus a QR image payload or QR download URL scoped to this immediate issuance response. |
| `GET /weddings/{weddingId}/rsvps` | Admin, Manager | Per-event summary/filter; accepted/declined/pending guest records and expected attendees. |

**Token storage contract:** Database stores only token hashes. It cannot reconstruct a current raw URL later. Therefore the `send` and `qr` routes **rotate and issue a new guest token** and produce/send the new URL/QR in the same request; they must not claim to retrieve an old raw link. The admin UI should label this action “Generate new link/QR” and warn that previous links stop working. A failed email leaves the new link available in that immediate response for copying, subject to safe display. Token URL and QR responses use `no-store`, `Referrer-Policy: no-referrer`, and are not logged. If multiple admins issue simultaneously, only the last committed token is active; the UI should explain a stale link failure.

`PUT .../events` example: `{ "eventIds": ["<eventObjectId1>", "<eventObjectId2>"] }`. The service diffs assignments, validates they belong to the wedding, and checks guest status. An event removed from assignments disappears from the guest invitation and cannot accept further RSVP. Avoid mass deletion of old responses; current summary counts use active joins.

## 7. Guest public API

| Method and path | Capability | Behavior |
| --- | --- | --- |
| `GET /public/invitations/{token}` | Active guest link | Guest name and wedding public details, **only** current published assigned events with directions, response state, and enabled live-stream URL. No guest contact details, notes, admin records, or other guests. |
| `PUT /public/invitations/{token}/rsvps/{eventId}` | Active guest link + active event assignment | Create/replace this guest's per-event response until closed. |
| `POST /public/invitations/{token}/photos/upload-intents` | Active guest link | Create photo upload intent for assigned event (or Other if enabled). |
| `POST /public/invitations/{token}/photos/uploads/{fileId}/complete` | Same active guest link | Verify object and finalize pending photo; repeat safely. |

Guest RSVP write:

```json
{ "response": "YES", "attendeeCount": 3 }
```

Return `{data:{eventId,response,attendeeCount,respondedAt}}`. `NO` requires count `0`; `YES` requires an integer ≥1 and ≤ configured limit. Current assignment, event publication, token expiry/revocation, and `rsvpClosedAt` are checked on each write, including when a guest opened the page earlier. Guest may update response until close. A missing assignment yields generic `404`, closed RSVP yields `409 RSVP_CLOSED`. Admin reports count active invited guest records separately from sum of attendee counts.

## 8. Tasks, expenses, vendors, and documents

| Method and path | Role | Behavior |
| --- | --- | --- |
| `GET/POST /weddings/{weddingId}/tasks` | Member read relevant; Admin/Manager create | Query by event, status, assignee, due date. |
| `GET/PATCH/DELETE /weddings/{weddingId}/tasks/{taskId}` | Admin/Manager manage; assignee may PATCH status only | Validate assignee belongs to same wedding. Soft delete or cancel as appropriate. |
| `GET/POST /weddings/{weddingId}/expenses` | Admin, Manager | List/create actual expense; amount in paise string. |
| `GET/PATCH/DELETE /weddings/{weddingId}/expenses/{expenseId}` | Admin, Manager | Same-wedding event/vendor checks; delete with attachment policy. |
| `GET/POST /weddings/{weddingId}/vendors` | Admin, Manager | List/create vendor; event IDs same wedding. |
| `GET/PATCH/DELETE /weddings/{weddingId}/vendors/{vendorId}` | Admin, Manager | Manual quote/paid amounts; pending is derived. |
| `GET /weddings/{weddingId}/documents` | Admin, Manager | Filter by association type/id. |
| `POST /weddings/{weddingId}/documents/upload-intents` | Admin, Manager | Authorize private attachment for wedding, event, vendor, or expense. |
| `POST /weddings/{weddingId}/documents/uploads/{fileId}/complete` | Admin, Manager | Verify uploaded object and create document exactly once. |
| `GET /weddings/{weddingId}/documents/{documentId}/download` | Admin, Manager | Check association and file READY; return short-lived signed download URL/redirect with no-store. |
| `DELETE /weddings/{weddingId}/documents/{documentId}` | Admin, Manager | Deactivate association and schedule R2 cleanup if unreferenced. |

Use consistent `POST` create, `PATCH` partial edit, `DELETE` deactivation semantics. Uploading a bill uses document association `EXPENSE`; vendor contracts use `VENDOR`. Expense response example: `{ "amountMinor":"8000000", "currency":"INR", "paymentStatus":"PAID", "eventId":"..." }`. Do not imply that linked expenses update `vendor.paidAmountMinor` automatically.

## 9. Files, gallery, and QR

| Method and path | Actor | Behavior |
| --- | --- | --- |
| `POST /weddings/{weddingId}/photos/upload-intents` | Member | Request upload URL for member photo. |
| `POST /weddings/{weddingId}/photos/uploads/{fileId}/complete` | Same uploading member | Verify object and create pending photo once. |
| `GET /weddings/{weddingId}/photos` | Member | Gallery list (approved); moderators may filter pending/rejected. |
| `PATCH /weddings/{weddingId}/photos/{photoId}` | Admin or granted Manager | `status: APPROVED/REJECTED`, optional caption; verify file READY. |
| `GET /weddings/{weddingId}/gallery-link` | Admin | Sharing state/version; **cannot return old raw token**. |
| `POST /weddings/{weddingId}/gallery-link/rotate` | Admin | Rotate token and return new gallery URL and QR endpoint once. |
| `POST /weddings/{weddingId}/gallery-link/rotate-and-qr` | Admin | Rotate token and return the new URL plus a QR image payload or immediate download URL. |
| `GET /public/gallery/{galleryToken}` | Gallery link | Only approved READY photos; cursor pagination. |
| `GET /public/gallery/{galleryToken}/photos/{photoId}/download` | Gallery link | Revalidate photo, issue short-lived signed download URL/redirect. |

Upload intent example:

```json
{
  "eventId": "<eventObjectId>",
  "fileName": "celebration.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 1830042
}
```

Response `{data:{fileId,uploadUrl,method:"PUT",requiredHeaders:{"Content-Type":"image/jpeg"},expiresAt}}`. No raw R2 key returned. Server verifies actor, association, size/type and quotas, creates PENDING metadata, and signs an object-specific URL. Browser PUTs directly to R2 and calls completion. Completion checks stored object and verified content before READY/photo PENDING. If the file did not upload, return `409 UPLOAD_NOT_FOUND`; expired intent returns `410`; repeated completion returns the same existing photo/document. Reject nonimage guest gallery files. Do not expose pending/rejected images or private document URLs to the public gallery. Upload URL enforcement depends on signing capabilities; always validate actual object after upload, and clean rejected/oversized objects.

**QR contract:** A QR is a rendering of the freshly generated guest invitation or gallery URL, not a separate token or attendance entity. Return PNG/SVG bytes with no-store in the same issuance flow, or generate on the client from the returned URL. A previously downloaded QR cannot be revoked as an image, but its encoded link stops resolving after token rotation. Event directions use a link, not a new API to geocode locations.

## 10. Dashboard, notifications, and scheduler

| Method and path | Actor | Behavior |
| --- | --- | --- |
| `GET /weddings/{weddingId}/dashboard` | Member | Role-filtered counters and upcoming items. MEMBER sees only permitted event/task/gallery info; no finances or other guests' RSVP. |
| `GET /weddings/{weddingId}/notifications` | Admin, Manager | Email delivery state, filters, bounded pagination; redact provider details. |
| `POST /weddings/{weddingId}/notifications/{notificationId}/retry` | Admin, Manager | Retry failed notification if still eligible and not already claimed/sent. |
| `POST /internal/cron/notifications` | Authenticated Vercel scheduler only | Atomically claim bounded due batch; validate eligibility; send and mark outcome. |

Email sending initiated by invitation/action endpoints writes notification records and returns independent delivery status. Scheduling is idempotent by logical key. Cron rejects browser sessions and guest tokens. Protect scheduler route with a secret header, check method, and do not return recipient data. A provider timeout may create uncertain delivery, so retries should be bounded and use provider idempotency if supported.

## 11. Request/response and endpoint testing

Minimum integration cases:

1. Create wedding while another active membership exists → `409`; two admins may join the same wedding by invite.
2. Signup with invited email but without member invitation token → no wedding membership; accept valid token once → success.
3. Manager attempts membership change → `403`; MEMBER attempts finance read → `403`; different wedding ID/reference → generic `404` where appropriate.
4. Guest invitation shows only current assignments; removed event and old RSVP cannot be mutated; revoked/expired token returns unavailable.
5. YES count validation, NO=0, closed RSVP, concurrent RSVP/assignment removal, and active-join summary totals.
6. Event with map URL returns it; without map URL returns URL-encoded address search; no fabricated coordinates.
7. New invitation QR/gallery QR invalidates previous token; old QR destination fails, new one succeeds.
8. Guest photo must match assigned event; upload finalization retry is stable; pending/rejected photo has no public download; private bill never resolves with gallery token.
9. Cron duplicate invocation claims a notification once; retry is bounded; email failure is visible to admin.
10. Verify cookie CSRF, rate limits, list pagination, no-store headers, and public responses free of private fields.

## 12. Implementation notes and open configuration

Define numerical limits before rollout: login and public-token rate limits, token expiry, RSVP attendee maximum, upload size/count, pagination caps, scheduler batch size and retry backoff. API DTOs should be specified in shared Zod schemas/types and reflected in generated OpenAPI once routes are implemented. If the UI uses Server Actions instead of an HTTP route for a form, retain the same service contract and authorization checks.

**Consistency correction during API design:** Because token hashes are intentionally irreversible, no later API can reproduce an earlier raw guest/gallery link or QR. All link and QR regeneration endpoints rotate the token, invalidate previous URLs, and return or send the new URL in the same action.
