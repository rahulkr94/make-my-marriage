# Make My Marriage — Launch Checklist

Use this checklist for the first production release and for later environment
migrations. Never paste secret values into issues, commits, screenshots, or logs.

## 1. Production configuration

- Set `APP_URL` to the exact public HTTPS origin without a trailing path.
- Configure the production MongoDB connection and database name.
- Configure a Resend API key and a sender on a verified domain.
- Configure the private R2 bucket, account ID, limited object token, and browser
  PUT CORS policy for the production origin.
- Generate a random `CRON_SECRET` with at least 16 characters in Vercel.
- Run `npm run launch:validate-env` in an environment containing the production
  values. The validator reports variable names and does not print their values.

## 2. Database and storage

- Run `npm run db:sync-indexes` against the production database during a planned
  release window.
- Confirm the unique notification delivery index and the due-delivery queue
  index exist.
- Upload and download one private financial attachment.
- Upload, moderate, and view one member photo and one invitation-scoped guest
  photo. Confirm the R2 bucket remains private.
- Confirm the MongoDB and R2 backup/retention policies match the operating plan.

## 3. Scheduled email delivery

- Keep the checked-in daily Vercel schedule when deploying on Hobby. It is safe
  for daily processing but cannot deliver at an exact configured hour.
- For precise delivery on Vercel Pro, change the cron schedule to a suitable
  interval such as every 15 minutes and redeploy. An external trusted scheduler
  may call the same endpoint when it sends `Authorization: Bearer $CRON_SECRET`.
- Create one future task assigned to a controlled test account and one published
  ceremony with a controlled guest address.
- Trigger `GET /api/internal/cron/notifications` once with the scheduler bearer
  token. Verify the response contains aggregate counts only.
- Confirm the Resend delivery, the Sent state in `/notifications`, and a provider
  message ID. Exercise one failed delivery and planner retry before launch.

## 4. Security and privacy

- Confirm private workspace and token routes return `X-Robots-Tag: noindex`.
- Confirm security headers, same-origin mutation checks, rate limits, and role
  restrictions are present on the production deployment.
- Test a revoked member invitation, guest invitation, shared-gallery link, and
  removed membership. Old credentials must stop working immediately.
- Review production logs for accidental token, object-key, or secret output.
- Keep Content Security Policy rollout as a separate monitored change because
  the current interface contains intentional inline style values.

## 5. Accessibility and browser checks

- Complete the primary keyboard journey through homepage, authentication,
  dashboard, events, guests, tasks, finance, gallery, and reminders.
- Confirm custom dialogs trap focus, close with Escape, restore focus, and keep
  background content from scrolling.
- Check visible focus, page titles, heading order, form errors, status messages,
  colour contrast, reduced motion, and 200% browser zoom.
- Review current Chrome, Safari, and one mobile browser at 390px and 430px.

## 6. Release and rollback

- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and
  `npm audit --omit=dev` from the release commit.
- Deploy to a preview, execute the role and storage smoke tests, then promote the
  same build to production.
- Record the deployment commit and timestamp. Keep the previous Vercel deployment
  available for instant rollback.
- After promotion, verify homepage, login, dashboard, one private invitation,
  one signed R2 download, and the next scheduled worker invocation.
