# Project: Unheard V3 (Kyoto)

## Overview

AI-powered decision support platform for founders, built as a Next.js web app with Convex backend, Tremor UI, and Daytona for cloud execution.

**What it does**: Founders describe a decision in chat -> AI recommends a template -> Guides through 2-5 questions -> Runs parallel persona simulations -> Delivers actionable insights.

## Tech Stack

- **Framework**: Next.js 14.2.28 (App Router, `src/` directory)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 with `@tailwindcss/forms` plugin
- **UI Library**: Tremor (Radix UI primitives, Recharts, Remix Icons)
- **Font**: Geist Sans (via `geist` package)
- **Backend**: Convex (database, auth, actions, file storage, real-time subscriptions)
- **AI**: Claude API via Convex actions (server-side, secure)
- **Execution**: Daytona (parallel persona processing via sandboxes)
- **Package Manager**: npm

## Project Structure

```
app/
├── src/
│   ├── app/          # Next.js App Router pages and layouts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/   # Reusable UI components (Tremor-based)
│   └── lib/          # Utilities
│       ├── utils.ts            # cx(), focusInput, focusRing, hasErrorInput
│       ├── chartUtils.ts       # Chart color mappings and helpers
│       └── useOnWindowResize.ts # Window resize hook for charts
├── convex/           # Convex backend
│   ├── schema.ts     # Database schema (11 tables)
│   ├── _generated/   # Auto-generated types and API
│   └── *.ts          # Queries, mutations, and actions
├── package.json
├── postcss.config.mjs
├── next.config.mjs
└── tsconfig.json
```

## Commands

```bash
cd app
npm run dev      # Start dev server (Next.js + Convex)
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
npx convex dev  # Start Convex dev server
npx convex deploy # Deploy Convex to production
```

## Conventions

- Use `cx()` from `src/lib/utils.ts` for merging class names (not raw `clsx` or `twMerge`)
- Use Tremor components with Radix UI primitives for interactive elements
- Use `focusInput`, `focusRing`, `hasErrorInput` arrays from utils for consistent focus/error styles
- Dark mode uses the `dark` custom variant defined in globals.css
- Place new components in `src/components/`
- Place shared utilities in `src/lib/`
- Convex queries use `useQuery()` from `convex/react` for real-time subscriptions
- Convex mutations use `useMutation()` for writes
- Convex actions use `useAction()` for server-side logic (Claude API calls, Daytona calls)
- API keys (Anthropic, Daytona) are stored in Convex environment variables, never in client code

## Styling

- Tailwind CSS v4 syntax: use `@import "tailwindcss"` and `@plugin` directives
- No `tailwind.config.ts` — config is in `globals.css` via `@theme`
- Animations for accordion, dialog, drawer, and slide/fade are predefined in globals.css

## Planning Documents

See `.claude/plans/` for complete architecture and implementation plans:

- `README.md` - Document index and overview
- `architecture-decision.md` - 6 ADRs (Next.js, Tremor, Convex, Claude, Daytona, No Git)
- `data-models-spec.md` - Convex schema with 11 tables
- `template-system-spec.md` - 5 core templates and UI components
- `IMPLEMENTATION-PRIORITY.md` - **READ FIRST** - Phase-by-phase guide with code samples
- `vertical-slice-implementation.md` - Week-by-week breakdown
- `FINAL-SUMMARY.md` - Executive summary
