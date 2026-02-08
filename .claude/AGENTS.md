# Agent Instructions

## General Rules

- Always run `npm run build` from `app/` after making changes to verify correctness
- Never modify `globals.css` animation keyframes unless explicitly asked
- Prefer editing existing files over creating new ones
- Use Tremor/Radix patterns for new UI components
- Read `.claude/plans/IMPLEMENTATION-PRIORITY.md` for the phase-by-phase build guide

## Code Style

- TypeScript strict mode
- Use `cx()` for class name merging
- Use ESLint disable comments sparingly (only for Tremor library patterns like `any` types in chartUtils)
- Functional components with arrow functions
- Named exports for components, default export for pages
- `'use client'` directive on any component using hooks or browser APIs

## File Organization

- Pages: `src/app/**/page.tsx`
- Layouts: `src/app/**/layout.tsx`
- Components: `src/components/<ComponentName>.tsx`
- Utilities: `src/lib/<utilName>.ts`
- Convex functions: `convex/<tableName>.ts` (queries, mutations)
- Convex actions: `convex/actions/<actionName>.ts` (server-side logic)
- Convex schema: `convex/schema.ts` (single source of truth)

## Convex Patterns

- Use `useQuery()` for reads (auto-subscribes to real-time updates)
- Use `useMutation()` for database writes
- Use `useAction()` for server-side logic (API calls, file processing)
- Never call Claude API or Daytona from client code - always use Convex actions
- API keys go in Convex environment variables (`npx convex env set KEY value`)
- Validate all inputs with Convex's `v` validators

## Testing Changes

After any code change:
1. Run `npm run build` to check for TypeScript and ESLint errors
2. Run `npm run lint` for lint-only checks
3. Verify the dev server renders correctly with `npm run dev`
4. For Convex changes: `npx convex dev` must be running

## Dependencies

- Adding new Radix primitives: install from `@radix-ui/react-*`
- Adding new icons: use `@remixicon/react`
- Adding charts: use `recharts` with helpers from `src/lib/chartUtils.ts`
- Convex: already installed, use `convex/react` for client hooks
- Claude API: use `@anthropic-ai/sdk` in Convex actions only
- Tremor blocks: use `/tremor` skill to fetch from `tremorlabs/tremor-blocks` repo
