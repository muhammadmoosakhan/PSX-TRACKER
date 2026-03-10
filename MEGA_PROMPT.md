# ═══════════════════════════════════════════════════════
# 🇵🇰 PSX PORTFOLIO TRACKER — MEGA PROMPT FOR CLAUDE CLI
# ═══════════════════════════════════════════════════════
#
# HOW TO USE THIS:
# ─────────────────
# 1. Set up your project:  npx create-next-app@latest psx-tracker
# 2. cd psx-tracker
# 3. Copy ALL files from the package into your project root:
#    - CLAUDE.md
#    - spec.md
#    - plan.md
#    - skills.sh
#    - README.md
# 4. Run: bash skills.sh
# 5. Create .env.local with your Supabase creds
# 6. Open Claude Code CLI (claude) in the project directory
# 7. Paste the PROMPT below
#
# ═══════════════════════════════════════════════════════

# ─── THE PROMPT (copy everything below this line) ───

You are building the PSX Portfolio Tracker — a personal web app for tracking Pakistan Stock Exchange investments. This project has a complete specification system. Before writing ANY code, you MUST read the project files in this exact order:

## Step 1: Read All Project Documentation

Read these files NOW, in order:
1. `cat CLAUDE.md` — Your master instructions (design system, file structure, rules, patterns)
2. `cat spec.md` — Full technical specification (every screen, field, formula)
3. `cat plan.md` — Phase-by-phase implementation plan (12 phases, follow in order)

## Step 2: Run Setup

If not already done:
```bash
bash skills.sh
```
Verify with `npm run dev` that the base project runs.

## Step 3: Implement Phase by Phase

Follow `plan.md` EXACTLY in order. For each phase:

1. **Announce** which phase you're starting (e.g., "Starting Phase 1: Layout Shell")
2. **Read the relevant section** of spec.md for that phase's screens/features
3. **Create each file** listed in the phase tasks
4. **Follow CLAUDE.md** for:
   - Design system (colors, fonts, spacing, animations, component styles)
   - File naming and structure
   - Code patterns (Supabase queries, API routes, component pattern)
   - Error handling approach
5. **Test** after each phase: run `npm run dev`, check browser, fix errors
6. **Commit** with the message format from plan.md
7. **Move to next phase** only after current phase works

## Critical Design Requirements

This app is for a BEGINNER investor. The UI must be:

- **Bubbly and Modern** — Rounded corners (16px), soft shadows, smooth transitions, playful but professional. Think friendly fintech, not boring spreadsheet.
- **"Soft Glow" Aesthetic** — Pastel accents on clean backgrounds, purple primary color (#6C5CE7), gradient touches, card-based layout with lift-on-hover.
- **Fonts** — Plus Jakarta Sans (headings), DM Sans (body), JetBrains Mono (numbers/prices). Load from Google Fonts.
- **Animations** — Staggered fade-in on page load, smooth hover effects on cards (scale 1.02 + shadow increase), press effect on buttons (scale 0.98), shimmer loading skeletons, animated number counting on KPI cards.
- **Mobile First** — Bottom tab navigation on mobile, sidebar on desktop. Cards stack vertically on mobile. Touch targets minimum 44px.
- **Dark Mode** — Full dark theme using CSS variables. Toggle in sidebar. Smooth transition.
- **Empty States** — Never show a blank screen. Always show an encouraging message with icon and CTA button.
- **Color Coding** — Green for profit/buy, Red for loss/sell, Yellow for warnings, Purple for primary actions.

## Architecture Reminders

- **All PSX data calls** go through Next.js API routes (`/api/psx/*`) — NEVER call dps.psx.com.pk from client-side
- **All data** stored in Supabase (trades, settings, stocks_cache)
- **All calculations** happen in `lib/calculations.ts` — pure functions, no side effects
- **All formatting** uses `lib/formatters.ts` — PKR currency, percentages, dates
- **Hooks** wrap Supabase calls with loading/error states
- **Components** follow: loading → empty → data pattern

## Start Now

Begin by reading CLAUDE.md, then spec.md, then plan.md. After reading all three, start with Phase 0. Work through every phase systematically. Do NOT skip phases. Test after each one.

Let's build this. Start reading the docs now.
