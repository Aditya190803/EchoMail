# EchoMail UI Overhaul — Progress Tracker

## Phase 0: Tailwind v4 Migration & Theme Install

- [x] 0a. Run `npx @tailwindcss/upgrade` automated migration
- [x] 0b. Install Modern Minimal theme via shadcn
- [x] 0c. Install shadcn Sidebar component
- [x] 0d. Fix PostCSS config & verify build

## Phase 1: Design Tokens — globals.css Rewrite

- [x] 1a. Rewrite globals.css with v4 syntax + Modern Minimal tokens
- [x] 1b. Remove glassmorphism/gradient utilities
- [x] 1c. Add sidebar CSS variables

## Phase 2: UI Primitives Refresh

- [x] 2a. Update button.tsx (radius, shadows, remove gradient variant)
- [x] 2b. Update card.tsx (radius, remove gradient/lift effects)
- [x] 2c. Update badge.tsx (rectangular, compact)
- [x] 2d. Update remaining primitives (dialog, input, select, tabs, alert, etc.)

## Phase 3: App Shell — Sidebar + Layout Architecture

- [x] 3a. Create `components/app-sidebar.tsx`
- [x] 3b. Create `app/(app)/layout.tsx` route group with SidebarProvider
- [x] 3c. Move all authenticated pages into `(app)/` route group
- [x] 3d. Repurpose navbar.tsx as thin top bar
- [x] 3e. Simplify footer.tsx (landing-only)

## Phase 4: Landing Page Redesign

- [ ] 4a. Build `<ProductDemo />` component (interactive tabbed walkthrough)
- [ ] 4b. Rewrite landing page hero, features, how-it-works, CTA
- [ ] 4c. Remove stats section and gradient effects

## Phase 5: Auth Page

- [ ] 5a. Redesign signin page (plain, no gradients)

## Phase 6: Full Page Redesigns

- [ ] 6a. Dashboard page redesign
- [ ] 6b. Compose page + compose-form redesign
- [ ] 6c. Settings hub + all sub-pages redesign
- [ ] 6d. Contacts page redesign
- [ ] 6e. Insights page redesign
- [ ] 6f. Drafts page redesign
- [ ] 6g. Templates page redesign
- [ ] 6h. A/B Testing page redesign
- [ ] 6i. Realtime send page redesign

## Phase 7: Cleanup & Polish

- [x] 7a. Remove unused files (old tailwind.config.ts, styles/globals.css if redundant)
- [ ] 7b. Update all loading.tsx skeletons
- [ ] 7c. Grep for remaining gradient/glassmorphism classes
- [ ] 7d. Verify dark mode with OKLCH tokens
- [ ] 7e. Build verification (`bun run build`)
