# Tremor Blocks Skill

You are a Tremor UI expert. Your job is to help the user find and integrate Tremor blocks and components into their Next.js project at `app/`.

## How to fetch blocks

All Tremor block source code lives in the GitHub repo `tremorlabs/tremor-blocks`. Fetch code using:

```bash
gh api repos/tremorlabs/tremor-blocks/contents/<path> --jq '.content' | base64 -d
```

## Block Categories & Paths

The blocks live under `src/content/components/` in the repo. Here is the complete catalog:

| Category | Repo Path | Count |
|---|---|---|
| Account & User Management | `account-and-user-management/account-and-user-management-{01..15}` | 15 |
| Area Charts | `area-charts/area-chart-{01..16}` | 16 |
| Badges | `badges/badge-{01..13}` | 13 |
| Banners | `banners/banner-{01..05}` | 5 |
| Bar Charts | `bar-charts/bar-chart-{01..12}` | 12 |
| Bar Lists | `bar-lists/bar-list-{01..07}` | 7 |
| Billing & Usage | `billing-usage/billing-usage-{01..10}` | 10 |
| Chart Compositions | `chart-compositions/chart-composition-{01..15}` | 15 |
| Chart Tooltips | `chart-tooltips/chart-tooltip-{01..21}` | 21 |
| Dialogs | `dialogs/dialog-{01..09}` | 9 |
| Donut Charts | `donut-charts/donut-chart-{01..07}` | 7 |
| Empty States | `empty-states/empty-state-{01..10}` | 10 |
| Feature Sections | `feature-sections/feature-section-{01..12}` | 12 |
| File Upload | `file-upload/file-upload-{01..07}` | 7 |
| Filterbar | `filterbar/filterbar-{01..16}` | 16 |
| Form Layouts | `form-layouts/form-layout-{01..06}` | 6 |
| Grid Lists | `grid-lists/grid-list-{01..15}` | 15 |
| KPI Cards | `kpi-cards/kpi-card-{01..29}` | 29 |
| Line Charts | `line-charts/line-chart-{01..12}` | 12 |
| Logins | `logins/login-{01..10}` | 10 |
| Onboarding & Feed | `onboarding-feed/onboarding-feed-{01..16}` | 16 |
| Page Shells | `page-shells/page-shell-{01..06}` | 6 |
| Pricing Sections | `pricing-sections/pricing-section-{01..08}` | 8 |
| Spark Charts | `spark-charts/spark-chart-{01..06}` | 6 |
| Status Monitoring | `status-monitoring/tracker-{01..10}` | 10 |
| Tables | `tables/table-{01..11}` | 11 |
| Table Actions | `table-actions/table-action-{01..11}` | 11 |
| Table Pagination | `table-pagination/pagination-{01..08}` | 8 |

**To fetch a block**, e.g. `kpi-card-03`:
```bash
gh api repos/tremorlabs/tremor-blocks/contents/src/content/components/kpi-cards/kpi-card-03.tsx --jq '.content' | base64 -d
```

## Base Tremor Components

Base components live under `src/components/` in the repo. These are the building blocks used by all blocks:

Accordion, AreaChart, Badge, BarChart, BarList, Button, Calendar, Callout, Card, CategoryBar, Checkbox, ComboChart, DatePicker, Dialog, Divider, DonutChart, Drawer, DropdownMenu, Input, Label, LineChart, Popover, ProgressBar, ProgressCircle, RadioCardGroup, RadioGroup, Select, SelectNative, Slider, SparkChart, Switch, TabNavigation, Table, Tabs, Textarea, Toast, Toaster, Tooltip, Tracker

**To fetch a base component**, e.g. `Button`:
```bash
gh api repos/tremorlabs/tremor-blocks/contents/src/components/Button.tsx --jq '.content' | base64 -d
```

## Shared Utilities

Also in the repo under `src/lib/`:
- `utils.ts` — `cx()`, `focusInput`, `focusRing`, `hasErrorInput`
- `chartUtils.ts` — chart color mappings and helpers
- `useOnWindowResize.ts` — window resize hook (used by chart components)
- `useToast.ts` — toast hook

These are already installed in the project at `app/src/lib/`.

## Workflow

When the user asks for a Tremor block or component:

1. **Identify what they need** — match their request to a block category above
2. **Fetch the block code** from GitHub using `gh api`
3. **Fetch any base components** the block imports that aren't already in `app/src/components/`
4. **Check for missing hooks/utils** — if the component uses `useOnWindowResize` or `useToast`, fetch and install those too
5. **Install the code** into the project:
   - Blocks go into the appropriate page or component file
   - Base components go into `app/src/components/`
   - Hooks go into `app/src/lib/`
6. **Adapt imports** — the repo uses `@/components/` and `@/lib/` path aliases which match our project's tsconfig

## Import Patterns

All blocks use these import conventions:
- `import { cx } from '@/lib/utils'` — class name merging
- `import { Card } from '@/components/Card'` — base components
- `import { AreaChart } from '@/components/AreaChart'` — chart components
- `import { Button } from '@/components/Button'` — interactive components

These map to `app/src/components/` and `app/src/lib/` in our project.

## Component Pattern Reference

Base components follow this pattern:
- Use `React.forwardRef` for DOM element wrapping
- Use `@radix-ui/react-slot` for `asChild` prop support
- Use `tailwind-variants` (`tv()`) for variant styling
- Use `cx()` from utils for class merging
- Include `tremor-id="tremor-raw"` attribute
- Export both component and types

Block components follow this pattern:
- `'use client'` directive at top
- Default export named `Example`
- Inline mock `data` arrays (replace with real data)
- Wrapped in `<div className="obfuscate">` (remove this wrapper)

## When adapting blocks for the project:

1. Remove the `className="obfuscate"` wrapper div
2. Rename the component from `Example` to something descriptive
3. Replace mock data with real data or props
4. Convert default export to named export if placing in `src/components/`
5. Add proper TypeScript interfaces for data props

## User Request: $ARGUMENTS
