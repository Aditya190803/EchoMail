# EchoMail UI Overhaul — Modern Minimal + Sidebar Layout

Complete UI overhaul: migrate to **Tailwind CSS v4**, replace the top navbar with a **collapsible sidebar**, redesign every page, strip all glassmorphism/gradient effects, and apply the **Modern Minimal** theme from tweakcn. Add an interactive product demo to the landing page.

---

## Proposed Changes

### Phase 0: Tailwind v4 Migration & Theme Install

> [!IMPORTANT]
> This is the riskiest phase — it touches every file with Tailwind classes. We run the automated upgrade tool first, then manually fix anything it misses.

#### Step 0a: Run the automated upgrade

```bash
npx @tailwindcss/upgrade
```

This will:

- Replace `@tailwind base/components/utilities` → `@import "tailwindcss"`
- Rename deprecated classes (e.g. `bg-gradient-to-*` → `bg-linear-to-*`)
- Move `tailwind.config.ts` theme values into `@theme` blocks in CSS
- Update `postcss.config.mjs` to use `@tailwindcss/postcss`
- Remove `autoprefixer` and `tailwindcss-animate` (v4 has native support)

#### Step 0b: Install Modern Minimal theme

```bash
bunx shadcn@latest add https://tweakcn.com/r/themes/modern-minimal.json
```

This writes the OKLCH color tokens, font declarations, shadow scale, and radius into `globals.css`.

#### Step 0c: Install the shadcn Sidebar component

```bash
bunx shadcn@latest add sidebar
```

This adds `components/ui/sidebar.tsx` with all composable parts (SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, SidebarInset).

#### Config changes

##### [MODIFY] [postcss.config.mjs](file:///home/adi/Projects/EchoMail/postcss.config.mjs)

```js
// Before
plugins: { tailwindcss: {} }
// After
plugins: { '@tailwindcss/postcss': {} }
```

##### [DELETE] [tailwind.config.ts](file:///home/adi/Projects/EchoMail/tailwind.config.ts)

Theme moves into CSS `@theme` blocks. This file is no longer needed in v4.

##### [MODIFY] [components.json](file:///home/adi/Projects/EchoMail/components.json)

Update to remove `tailwind.config` reference and point to v4's CSS-first config.

---

### Phase 1: Design Tokens — globals.css Rewrite

#### [MODIFY] [globals.css](file:///home/adi/Projects/EchoMail/app/globals.css)

Complete rewrite with v4 syntax. Key changes:

**Structure:**

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --radius: 0.375rem;
  /* ... all theme tokens from modern-minimal */
}

@layer base {
  :root {
    /* light mode OKLCH tokens */
  }
  .dark {
    /* dark mode OKLCH tokens */
  }
}
```

**What gets removed:**

- `.glass` utility (glassmorphism)
- `.btn-gradient` utility
- `.gradient-text` utility
- `.badge-glow` utility
- `.card-hover` with `hover:-translate-y-1` (replace with subtle border change)
- `.stat-card` with gradient background
- Custom `shadow-glow`, `shadow-glow-lg`, `shadow-inner-glow`
- `shimmer` and `bounce-soft` keyframes

**What gets added:**

- Modern Minimal shadow scale (`shadow-2xs` through `shadow-2xl`)
- `--tracking-normal: 0em` letter-spacing baseline
- `--spacing: 0.25rem` base spacing unit
- Sidebar-specific CSS variables (`--sidebar`, `--sidebar-foreground`, etc.)

---

### Phase 2: UI Primitives Refresh

All 18 shadcn components updated to match Modern Minimal:

#### [MODIFY] [button.tsx](file:///home/adi/Projects/EchoMail/components/ui/button.tsx)

- `rounded-xl` → `rounded-md`
- Remove `shadow-md shadow-primary/20` → `shadow-sm`
- Remove `gradient` variant entirely
- Keep `active:scale-[0.98]` (good tactile feedback)
- Thinner outline border: `border-2` → `border`

#### [MODIFY] [card.tsx](file:///home/adi/Projects/EchoMail/components/ui/card.tsx)

- `rounded-2xl` → `rounded-lg`
- Remove `gradient` prop and `hover:-translate-y-1` lift effect
- Hover: `hover:border-primary/30` (subtle border tint, no lift)

#### [MODIFY] [badge.tsx](file:///home/adi/Projects/EchoMail/components/ui/badge.tsx)

- `rounded-full` → `rounded-md` (rectangular pill → lozenge)
- `px-3 py-1` → `px-2 py-0.5` (compact)

#### All other UI primitives (dialog, input, select, tabs, alert, etc.)

- Consistent `rounded-md`/`rounded-lg` border radius
- Reduced backdrop blur on dialogs
- Thinner focus rings matching primary OKLCH hue

---

### Phase 3: App Shell — Sidebar + Layout Architecture

This is the biggest structural change. Replace the top `<Navbar>` with a **collapsible sidebar** for all authenticated pages.

#### [NEW] [components/app-sidebar.tsx](file:///home/adi/Projects/EchoMail/components/app-sidebar.tsx)

The main sidebar component using shadcn's composable sidebar parts:

```
┌──────────────────────────┐
│  SidebarHeader           │  ← Logo + app name
│  ┌────────────────────┐  │
│  │ 📧 EchoMail        │  │
│  └────────────────────┘  │
├──────────────────────────┤
│  SidebarContent          │  ← Scrollable nav
│                          │
│  ─ Main ──────────────── │
│  ▸ Dashboard             │
│  ▸ Compose               │
│  ▸ Drafts                │
│  ▸ Templates             │
│                          │
│  ─ Data ──────────────── │
│  ▸ Contacts              │
│  ▸ Insights              │
│  ▸ A/B Tests             │
│                          │
│  ─ Settings ──────────── │
│  ▸ Signatures            │
│  ▸ Unsubscribes          │
│  ▸ Webhooks              │
│  ▸ Teams                 │
│  ▸ Privacy & Data        │
│  ▸ Audit Logs            │
│                          │
├──────────────────────────┤
│  SidebarFooter           │  ← User profile + theme toggle
│  ┌────────────────────┐  │
│  │ 👤 User Name       │  │
│  │    user@email.com  ▾│  │  ← Dropdown: Sign out, Settings
│  └────────────────────┘  │
│  🌓 Theme Toggle         │
└──────────────────────────┘
```

**Sidebar behavior:**

- `collapsible="icon"` — collapses to icons-only on desktop
- Mobile: off-canvas sheet (slides in from left)
- Keyboard shortcut: `Cmd+B` / `Ctrl+B`
- Active route highlighted with `isActive` prop
- Groups: "Main", "Data", "Settings" with `SidebarGroupLabel`

#### [NEW] [app/(app)/layout.tsx](<file:///home/adi/Projects/EchoMail/app/(app)/layout.tsx>)

New **route group** for all authenticated pages. This wraps them in the sidebar layout:

```tsx
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <header>
      {" "}
      {/* thin top bar: SidebarTrigger + breadcrumb + user avatar */}{" "}
    </header>
    <main>{children}</main>
  </SidebarInset>
</SidebarProvider>
```

**Pages moved into `(app)/` route group:**

- `dashboard/page.tsx`
- `compose/page.tsx`
- `contacts/page.tsx` (+ `contacts/duplicates/`)
- `draft/page.tsx`
- `templates/page.tsx`
- `insights/page.tsx`
- `ab-testing/page.tsx`
- `settings/page.tsx` (+ all sub-pages)
- `realtime-send/page.tsx`
- `history/loading.tsx`

#### [MODIFY] [components/navbar.tsx](file:///home/adi/Projects/EchoMail/components/navbar.tsx)

- **Repurpose** as a thin top bar (not full navigation)
- Contains: `SidebarTrigger` (hamburger), breadcrumb/page title, and user avatar
- Removed: all navigation links, settings dropdown, mobile menu, logo gradient

#### [MODIFY] [components/footer.tsx](file:///home/adi/Projects/EchoMail/components/footer.tsx)

- Remove from all authenticated pages (sidebar replaces the need)
- Keep only on landing page, simplified to single-line copyright + links

---

### Phase 4: Landing Page — Complete Redesign with Product Demo

#### [MODIFY] [page.tsx](file:///home/adi/Projects/EchoMail/app/page.tsx)

**The landing page is completely rewritten.** It shows NO sidebar (public page). New structure:

```
┌─────────────────────────────────────────────────────┐
│  Header: Logo (solid) | Learn More | Get Started    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  HERO: "Send Personalized Emails at Scale"          │
│  Subtitle text                                      │
│  [Get Started]  [See How It Works →]                │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │         INTERACTIVE PRODUCT DEMO              │  │
│  │                                               │  │
│  │ ┌─ Step Tabs ─────────────────────────────┐   │  │
│  │ │ [1. Upload CSV] [2. Compose] [3. Send]  │   │  │
│  │ └─────────────────────────────────────────┘   │  │
│  │                                               │  │
│  │ Step 1: CSV table with sample data            │  │
│  │ ┌──────┬──────────────┬──────────────┐        │  │
│  │ │ Name │ Email        │ Company      │        │  │
│  │ │ Alex │ alex@acme.co │ Acme Corp    │        │  │
│  │ │ Sam  │ sam@beta.io  │ Beta Inc     │        │  │
│  │ └──────┴──────────────┴──────────────┘        │  │
│  │                                               │  │
│  │ Step 2: Email editor with {{name}} vars       │  │
│  │ Step 3: Send progress with success indicators │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
├─────────────────────────────────────────────────────┤
│  FEATURES: 2-col grid, monochrome icons, clean      │
├─────────────────────────────────────────────────────┤
│  HOW IT WORKS: Horizontal stepper (3 steps)         │
├─────────────────────────────────────────────────────┤
│  CTA: Simple centered block with single button      │
├─────────────────────────────────────────────────────┤
│  Footer: © 2026 EchoMail | Terms | Privacy          │
└─────────────────────────────────────────────────────┘
```

**Product Demo component** (`<ProductDemo />`):

- **Interactive tabbed walkthrough** — 3 tabs users can click through
- Tab 1: Static CSV table with realistic sample data
- Tab 2: Mock compose editor with highlighted `{{name}}` template variables
- Tab 3: Mock send progress bar with green check marks
- Wrapped in a subtle `border rounded-lg bg-card` container that looks like an app window
- Auto-cycles through tabs every 4s with pause-on-hover

**Removed from landing:**

- Stats section with fake numbers ("10K+", "500+")
- Trust badges from hero
- Gradient text, gradient background overlays, grid SVG
- Gradient CTA card

---

### Phase 5: Auth Page

#### [MODIFY] [auth/signin/page.tsx](file:///home/adi/Projects/EchoMail/app/auth/signin/page.tsx)

- Plain white/dark background (no gradient)
- Clean centered card, no gradient logo or button
- "Continue with Google" with Google's `G` icon (outline button style)
- Minimal security notice below

---

### Phase 6: Full Page Redesigns (All Authenticated Pages)

Every authenticated page gets a complete layout redesign to work with the sidebar shell. **No more `<Navbar />` + `<Footer />`** — the sidebar handles navigation.

#### [MODIFY] [dashboard/page.tsx](file:///home/adi/Projects/EchoMail/app/dashboard/page.tsx)

New layout:

```
┌────────────────────────────────────────────┐
│  Welcome back, Alex!                       │
│  Quick overview of your campaigns          │
├────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐│
│  │ Sent   │ │Success │ │Recipi- │ │Camp- ││
│  │ 142    │ │ 98.5%  │ │ ents   │ │aigns ││
│  │        │ │        │ │ 1,204  │ │ 8    ││
│  └────────┘ └────────┘ └────────┘ └──────┘│
│                                            │
│  Quick Actions (row of compact buttons)    │
│  [+ New Campaign] [Import Contacts] [View…]│
│                                            │
│  Recent Campaigns                          │
│  ┌────────────────────────────────────────┐│
│  │ Subject │ Date │ Recipients │ Status   ││
│  │─────────│──────│────────────│──────────││
│  │ Welcome │ Mar  │ 50         │ ✓ Done   ││
│  │ Update  │ Feb  │ 120        │ ✓ Done   ││
│  └────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

Key changes:

- Stat cards: flat `border bg-card` with left color accent stripe (no gradients, no glows)
- Campaign list: clean table-style rows (not card-in-card)
- Quick actions: inline button row (not centered cards with icons)
- Remove `<Navbar />` and `<Footer />`

#### [MODIFY] [compose/page.tsx](file:///home/adi/Projects/EchoMail/app/compose/page.tsx) + [compose-form.tsx](file:///home/adi/Projects/EchoMail/components/compose-form.tsx)

Full layout redesign:

- Remove `<Navbar />` and `<Footer />`
- Compose form fills the full content area of the sidebar inset
- Subject, editor, attachments, recipients flow vertically in a single clean card
- Action bar (Save Draft / Send) pinned at bottom or in a sticky footer within the content area
- Remove all gradient buttons and colored section backgrounds

#### [MODIFY] All settings pages

```
settings/page.tsx
settings/signatures/page.tsx
settings/unsubscribes/page.tsx
settings/webhooks/page.tsx
settings/gdpr/page.tsx
settings/audit-logs/page.tsx
settings/teams/page.tsx
```

- Remove `<Navbar />` and `<Footer />` (sidebar handles navigation)
- Settings hub: simple list of setting categories (no colored icon badges)
- Sub-pages: clean form-style layouts with proper field grouping

#### [MODIFY] Remaining pages

```
contacts/page.tsx
contacts/duplicates/page.tsx
insights/page.tsx
draft/page.tsx
templates/page.tsx
ab-testing/page.tsx
realtime-send/page.tsx
```

All follow the same pattern:

- Remove `<Navbar />` and `<Footer />`
- Page title + description at top
- Content area fills sidebar inset
- Data tables with clean borders (no card shadows)
- Consistent search/filter bar styling
- Loading skeletons updated to match new shapes

---

### Phase 7: Cleanup & Polish

- Remove unused `styles/globals.css` if redundant
- Remove references to deleted `tailwind.config.ts`
- Update all `loading.tsx` files to match new skeleton shapes
- Ensure dark mode works with OKLCH tokens
- Verify all `components/metrics/` and `components/activity/` widgets match
- Remove any remaining gradient/glassmorphism classes found via grep

---

## Verification Plan

### Automated Tests

```bash
bun run typecheck    # No TS errors
bun run lint         # No lint issues
bun run test         # Unit tests pass
bun run build        # Production build succeeds
```

### Browser Testing

- Visual inspection of every page in both light and dark mode
- Landing page demo auto-cycles correctly
- Sidebar collapses/expands (desktop + mobile)
- Responsive: 375px, 768px, 1024px, 1440px
- All navigation flows work through sidebar
- `Cmd+B` / `Ctrl+B` keyboard shortcut toggles sidebar
