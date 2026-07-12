# EchoMail → Flier rebrand

## Post-merge checklist (ops)

- [ ] Register **`flier.tech`** and point DNS to Vercel
- [ ] Set `NEXT_PUBLIC_APP_URL=https://flier.tech` and `NEXTAUTH_URL` on Vercel
- [ ] Add Google OAuth redirect: `https://flier.tech/api/auth/callback/google`
- [ ] Keep old `echomail.adityamer.dev` redirect/OAuth until cutover is verified
- [ ] Optional: rename GitHub repo to `flier`

## Code changes summary

- `lib/brand.ts` — product name, webhook header names
- `lib/storage-migration.ts` — copies legacy `echomail_*` localStorage keys once
- Service worker cache bumped to `flier-*-v2`
- Redis/cache prefix: `flier:`
- Webhook docs: `X-Flier-*`; sample code accepts `x-flier-signature` or legacy `x-echomail-signature`
