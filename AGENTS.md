<!-- BEGIN:nextjs-agent-rules -->
# Next.js: ALWAYS read docs before coding
Before any Next.js work, find and read the relevant doc in
`node_modules/next/dist/docs/`.
<!-- END:nextjs-agent-rules -->

---

## UI & Styling
- Optimise it for mobile first, but ensure it looks good on desktop too
- Use shadcn/ui for all components — do not build from scratch
- Before adding or changing shadcn/ui components, use the shadcn MCP/registry workflow when available; otherwise use `npx shadcn@latest add ...` and import from `@/components/ui/*`
- Use Tailwind CSS utility classes only — no inline styles
- Use Radix UI primitives for accessible interactive elements
- Follow mobile-first responsive design
- Implement dark mode via CSS variables (`dark:` prefix)

## State Management
- Prefer React Server Components for data fetching
- Use Zustand for client-side global state
- Use `useOptimistic` for optimistic UI updates

## Code Conventions
- Collocate components with their route in `app/`
- Use TypeScript strictly — no `any`
- Prefer named exports for components

## Commands
# Dev server (keep running during agent sessions)
npm run dev

# File-scoped checks (preferred over full build)
npx tsc --noEmit src/path/to/file.tsx
npx eslint --fix src/path/to/file.tsx

# Tests
npx vitest run src/path/to/file.test.tsx

## Permissions
- ✅ Read/write files, run lint, run single tests
- ⚠️  Ask first: install packages, git push, delete files
- ❌ Never: run full production build mid-session, expose secrets
