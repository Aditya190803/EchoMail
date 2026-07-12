# EchoMail → Flier rebrand

## Post-merge checklist (ops)

- [ ] Register **`sendflier.tech`** and point DNS to Vercel
- [ ] Copy `.env.example` → `.env.local` and set secrets
- [ ] Set `NEXT_PUBLIC_APP_URL=https://sendflier.tech` and `NEXTAUTH_URL` on Vercel
- [ ] Add Google OAuth redirect: `https://sendflier.tech/api/auth/callback/google`
- [ ] Keep old `echomail.adityamer.dev` redirect/OAuth until cutover is verified
- [ ] Optional: rename GitHub repo to `flier`

## Code changes summary

- `lib/brand.ts` — product name, webhook header names
- `lib/webhook-delivery.ts` — signed outbound webhooks (`X-Flier-*` + legacy signature header)
- `lib/storage-migration.ts` — copies legacy `echomail_*` localStorage keys once
- `public/manifest.json` — PWA manifest for Flier
- `.env.example` — documented env template
- Service worker cache bumped to `flier-*-v2`
- Redis/cache prefix: `flier:`
- Webhook docs: `X-Flier-*`; sample code accepts `x-flier-signature` or legacy `x-echomail-signature`
