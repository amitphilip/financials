# Financials App

## Routing

- `app/(auth)/login/page.tsx` — Clerk login (unauthenticated)
- `app/(onboarding)/onboarding/page.tsx` — first-run name setup; skipped once `user_config` exists
- `app/(app)/layout.tsx` — authenticated shell: checks `user_config`, redirects to `/onboarding` if missing, renders sidebar
- `app/(app)/app-sidebar.tsx` — sidebar nav; add new pages here as `navItems`
- New pages go inside `app/(app)/` and get the sidebar + auth gate automatically

## UI / UX

### Motion & animation
- Use `<TextAnimate animation="blurIn" by="word" once>` for headings and subheadings on landing/onboarding screens. Stagger a second line with `delay={0.15–0.2}`.
- Use `<OrbitingAssets>` (`components/ui/orbiting-assets.tsx`) above welcome text on landing screens — two concentric counter-rotating rings of financial/life icons.
- `<NumberTicker>` rolls fast to the final value (stiffness 400, damping 80). Always wrap financial figures in `<HiddenNumber>` instead of using `NumberTicker` directly.
- Prefer `motion/react` for any additional animations; it is already installed.

### Layout
- **Mobile-first**. Design for ~390px width first. All interactive elements min `h-12`. Minimum `px-4` horizontal padding. Use `min-h-svh` (not `min-h-screen`) to account for mobile browser chrome.
- Authenticated pages: sidebar collapses to icon-only on desktop, slides in as a sheet on mobile. The sidebar trigger lives inside the sidebar header. The eye toggle lives in the page header (top-right).
- Cards use `rounded-2xl shadow-md`. Use `rounded-2xl` consistently for all card-like surfaces.
- Step-by-step forms: show one step at a time; completed steps collapse to a summary row with a pencil edit button. Results appear below once all steps are complete.

### Typography
- JetBrains Mono is the app font (set in root layout). Lean into the monospace feel for numbers and data.
- Headings: `text-xl`–`text-3xl font-semibold tracking-tight`. Body: `text-sm`. Labels: `text-xs text-muted-foreground`.
- Financial figures: `tabular-nums` always. Prefix `$` as a separate `<span>` outside `<HiddenNumber>`.

### Tone & copy
- No emojis. Professional and calm.
- Button labels: action-oriented, concise ("Get started", "Next →", "Calculate", "Unlock"). Avoid "Submit" or "OK".
- Error messages: plain English, specific ("Incorrect PIN. Please try again." not "Invalid input.").

### Charts (recharts via shadcn ChartContainer)
- Property value over time: `AreaChart` with gradient fill, `strokeWidth={2}`, `dot={false}`.
- Per-year breakdowns: `BarChart` with `radius={[4,4,0,0]}` on bars.
- X-axis: `interval={0}` to show every year. `tickLine={false}` `axisLine={false}`. Font size 10.
- Y-axis: format as `$Xk`. Width 48. No tick or axis lines.
- Always use `ChartTooltip` with `ChartTooltipContent` and a currency formatter.

### Numbers & financial data
- Always use `<HiddenNumber>` for any monetary value shown to the user.
- Eye toggle defaults to **visible** (`hidden: false` in `NumbersProvider`).
- Format currency with `Intl.NumberFormat("en-AU")` (no decimal places for whole dollar amounts).

### Colour & theming
- shadcn preset `buFznsW` — reapply with `npx shadcn@latest apply buFznsW` after adding new components.
- Use `var(--chart-1)` through `var(--chart-3)` for chart series colours. Do not hardcode hex values.
- Positive growth: `text-green-600`. Neutral/zero: `text-muted-foreground`.

## Numbers

- Always use `<HiddenNumber>` (`components/ui/hidden-number.tsx`) for financial figures.
- State lives in `NumbersProvider` (`app/numbers-context.tsx`) wrapping the entire app.

## Environment setup

- `MONGODB_MAIN_DB_URL` — MongoDB connection string
- `ENCRYPTION_KEY` — 64-char hex string (32 bytes). Generate with:
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Clerk keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`

## Encryption

- All user data is encrypted with AES-256-GCM before storage (`lib/encrypt.ts`)
- Per-user keys derived via HKDF-SHA256: `HKDF(ENCRYPTION_KEY, userId, "financials:v1")` — one master key, unique key per user
- Never store or log derived keys or plaintext payloads

## shadcn

- Preset: `buFznsW` — apply with `npx shadcn@latest apply buFznsW`
