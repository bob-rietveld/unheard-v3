# Agent Instructions

## General Rules

- Always run `npm run build` from `my-project/` after making changes to verify correctness
- Never modify `globals.css` animation keyframes unless explicitly asked
- Prefer editing existing files over creating new ones
- Use Tremor/Radix patterns for new UI components

## Code Style

- TypeScript strict mode
- Use `cx()` for class name merging
- Use ESLint disable comments sparingly (only for Tremor library patterns like `any` types in chartUtils)
- Functional components with arrow functions
- Named exports for components, default export for pages

## File Organization

- Pages: `src/app/**/page.tsx`
- Layouts: `src/app/**/layout.tsx`
- Components: `src/components/<ComponentName>.tsx`
- Utilities: `src/lib/<utilName>.ts`

## Testing Changes

After any code change:
1. Run `npm run build` to check for TypeScript and ESLint errors
2. Run `npm run lint` for lint-only checks
3. Verify the dev server renders correctly with `npm run dev`

## Dependencies

- Adding new Radix primitives: install from `@radix-ui/react-*`
- Adding new icons: use `@remixicon/react`
- Adding charts: use `recharts` with helpers from `src/lib/chartUtils.ts`
