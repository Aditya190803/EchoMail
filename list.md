# Flier manual codebase review — remediation status

Manual review originally listed 37 issues. This file tracks what has been fixed in the working tree and what remains.

## Validation status

Latest validation completed successfully:

- `bun run typecheck` ✅
- `bun run lint` ✅
- `bun run test -- --run` ✅ 523 tests passed; slow hook tests reduced from ~13s to ~80ms
- `SKIP_ENV_VALIDATION=true bun run build` ✅

## Fixed / addressed

1. **CI package-manager mismatch** ✅
   - Converted `.github/workflows/ci.yml` from npm to Bun.
   - Updated `package.json` `validate` script to use Bun.

2. **Production checkout was mocked** ✅
   - `app/api/checkout/route.ts` now creates real Razorpay orders.
   - Server-side `planId` validation added.
   - Returns 503 if Razorpay keys are not configured.
   - Persists pending billing subscription records via `serverBillingService`.

3. **Razorpay webhook signature and lifecycle weaknesses** ✅ improved
   - `app/api/webhooks/razorpay/route.ts` now uses timing-safe signature comparison.
   - Handles success and cancellation/failure/refund events.
   - Adds webhook idempotency via cache/Redis for 30 days.
   - Records durable billing event documents through `serverBillingService`.

4. **Environment validation ignored `SKIP_ENV_VALIDATION`** ✅
   - `lib/env.ts` now honors `SKIP_ENV_VALIDATION=true`.

5. **CSRF secure cookie broke local HTTP** ✅
   - `lib/csrf.ts` only sets `Secure` cookies in production.
   - Tests updated accordingly.

6. **CSRF middleware skipped wrong tracking path** ✅
   - `proxy.ts` changed from `/api/tracking` to `/api/track`.

7. **Global API rate limiting too blunt / in-memory only** ✅ improved
   - `lib/rate-limit.ts` now supports Upstash Redis-backed limits with in-memory fallback.
   - `proxy.ts`, send-email, and tracking routes use async Redis-capable limiter.

8. **Production rate limits were in-memory** ✅
   - Redis-backed request and per-user email quota counters added when Upstash envs are configured.

9. **Google refresh token reuse detection was wrong** ✅
   - `lib/auth.ts` no longer treats Google refresh-token reuse as theft.

10. **Debug/test API routes exposed production info** ✅

- Production-gated with 404 responses:
  - `app/api/auth/test/route.ts`
  - `app/api/activity/debug/route.ts`
  - `app/api/activity/test-tracking/route.ts`

11. **Tracking pixel logged/stored excess PII** ✅ improved

- Tracking routes no longer log recipient emails/target URLs.
- IP addresses are anonymized before storage.
- Tracking URLs no longer expose raw email/userEmail params.

12. **Open/click tracking was forgeable** ✅

- Added signed opaque tracking tokens in `lib/tracking-token.ts`.
- `lib/email-formatting/tracking.ts` emits signed `t=` tokens.
- `/api/track/open` and `/api/track/click` require valid signed tokens.

13. **Attachment upload lacked API-boundary constraints** ✅

- `app/api/upload-attachment/route.ts` now enforces file count, per-file size, total size, and supported MIME types.

14. **Stored attachment ownership/ACLs unclear** ✅ improved

- Server uploads now scope stored filenames with a sanitized owner prefix.
- Attachment download route checks the owner prefix before serving files.
- Full bucket ACL review is still recommended after deployment.

15. **Dangerous HTML fallback in email preview** ✅

- `components/email-preview.tsx` sanitizes fallback HTML before `dangerouslySetInnerHTML`.

16. **CSP allowed unsafe script behavior** ✅ improved

- Production CSP now removes `unsafe-eval`.
- `unsafe-inline` remains because full nonce/hash migration requires broader app-shell changes.

17. **`img-src` allowed `http:` in production** ✅

- `next.config.mjs` removes `http:` from production `img-src`.

18. **CSRF failure logging was noisy** ✅

- `lib/csrf.ts` no longer logs expected failures in test/production.

19. **Contacts API did not validate input** ✅

- `app/api/appwrite/contacts/route.ts` now uses Zod contact validation.

20. **Contacts GET capped at 1000 with no pagination** ✅

- `app/api/appwrite/contacts/route.ts` now supports `limit` and `offset`.

21. **Email send API accepted unbounded payloads** ✅ improved

- `app/api/send-email/route.ts` validates recipients and personalized email payloads.
- Enforces `MAX_RECIPIENTS_PER_CAMPAIGN`.

22. **Email send API leaked raw error details** ✅

- 500 responses now return a safe user-facing message.

23. **A/B variant distribution used naive modulo** ✅

- Replaced with stable hash bucket assignment.

24. **Billing state was a flat boolean** ✅ improved

- Added Appwrite billing subscription/event collection definitions in `scripts/setup-appwrite.ts`.
- Added collection env defaults in `lib/env.ts`.
- Added `serverBillingService` in `lib/appwrite-server.ts`.
- Checkout records pending billing records; webhooks record billing events.

25. **Service worker production behavior** ✅ improved

- Added `public/service-worker.js`.
- Removed missing `/offline` and `/manifest.json` pre-cache entries that could break install.
- Removed direct service-worker console logging.

26. **Mega-files need splitting** ✅ started

- Extracted Insights premium gate into `components/insights/premium-gate.tsx`.
- Large-file refactoring still needs incremental follow-up.

30. **README/package version inconsistency** ✅

- README now references Next.js 16 and Bun-based commands.

31. **Next config stale comments/custom tuning** ✅ improved

- Removed stale body-parser comments.
- Clarified MJML/server package configuration.

32. **Images globally unoptimized** ✅

- Enabled Next image optimization globally.
- Added broad HTTPS remote pattern plus localhost HTTP in development.

33. **Feature flags were only UI/env constants** ✅ improved

- Server-side feature gates added for:
  - `app/api/appwrite/ab-tests/route.ts`
  - `app/api/teams/route.ts`
  - `app/api/teams/members/route.ts`

34. **ESLint useless fragment** ✅

- Fixed in `app/(app)/insights/page.tsx`.

35. **ESLint raw image warning** ✅

- Replaced workspace logo `<img>` with `next/image` in `app/(app)/settings/workspace/page.tsx`.

36. **Slow `useSimpleEmailSend` tests due to real timers** ✅

- Test environment now disables retry/inter-email delays in `hooks/useSimpleEmailSend.ts`.

37. **Test stdout/stderr noise** ✅

- CSRF expected-failure logs removed from test output.
- Token-security and email-service expected-error logs are mocked silently.
- Cache initialization logs are suppressed during tests.

Additional fix:

- **`/service-worker.js` 404** ✅
  - Added `public/service-worker.js` from existing `public/sw.js`.

## Remaining / not fully fixed

27. **Duplicate activity/metrics modules** ⏳

- Still requires analytics-domain consolidation.

28. **Repository/service layer inconsistency** ⏳

- Some direct route fixes were made, but full repository/service standardization remains.

29. **Many production `any` casts** ⏳

- Some touched routes are safer, but full DTO/schema cleanup remains.

## Things still worth adding

- Run `bun run appwrite:setup` in the target Appwrite project to create billing collections.
- Backfill/migrate existing uploaded attachment filenames if old files predate owner-prefix scoping.
- CSP nonce/hash migration to remove production `unsafe-inline`.
- Full analytics/activity module consolidation.
- Full repository/service-layer standardization.
- More route-level validation coverage for remaining API routes. Campaigns, contacts, contact groups, and templates are now covered.
- Pagination/search for campaigns, templates, tracking events.
- E2E tests for billing, compose/send, unsubscribe, tracking, and contact import.
- Integration tests for auth/ownership/CSRF/rate-limit behavior.
- Structured logging/request IDs and sanitized PII policy.
