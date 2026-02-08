# Project: Unheard V3 (Kyoto)

## Overview

Next.js 14 application using the App Router, TypeScript, Tailwind CSS v4, and Tremor UI component library.

## Tech Stack

- **Framework**: Next.js 14.2.28 (App Router, `src/` directory)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 with `@tailwindcss/forms` plugin
- **UI Library**: Tremor (Radix UI primitives, Recharts, Remix Icons)
- **Font**: Geist Sans (via `geist` package)
- **Package Manager**: npm

## Project Structure

```
my-project/
├── src/
│   ├── app/          # Next.js App Router pages and layouts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/   # Reusable UI components (Tremor-based)
│   └── lib/          # Utilities
│       ├── utils.ts       # cx(), focusInput, focusRing, hasErrorInput
│       └── chartUtils.ts  # Chart color mappings and helpers
├── package.json
├── postcss.config.mjs
├── next.config.mjs
└── tsconfig.json
```

## Commands

```bash
cd my-project
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

## Conventions

- Use `cx()` from `src/lib/utils.ts` for merging class names (not raw `clsx` or `twMerge`)
- Use Tremor components with Radix UI primitives for interactive elements
- Use `focusInput`, `focusRing`, `hasErrorInput` arrays from utils for consistent focus/error styles
- Dark mode uses the `dark` custom variant defined in globals.css
- Place new components in `src/components/`
- Place shared utilities in `src/lib/`

## Styling

- Tailwind CSS v4 syntax: use `@import "tailwindcss"` and `@plugin` directives
- No `tailwind.config.ts` — config is in `globals.css` via `@theme`
- Animations for accordion, dialog, drawer, and slide/fade are predefined in globals.css
