# Architecture Decision Record

**Date**: 2026-02-08
**Status**: Accepted
**Context**: Building Unheard V3 as a web-first decision support platform

---

## Executive Summary

**Hybrid web+cloud architecture** using:

- **Next.js 14** (web framework, App Router)
- **Tremor** (UI component library)
- **Convex** (unified cloud backend: DB, actions, file storage, auth)
- **Claude API** (AI via Convex actions, server-side)
- **Daytona** (parallel persona execution via sandboxes)

---

## Decision 1: Next.js Web App vs Tauri Desktop

| Factor | **Next.js** | Tauri (V2) |
|--------|-------------|------------|
| Distribution | URL (instant) | Download required |
| Updates | Deploy to Vercel | App store / auto-update |
| Collaboration | Real-time (Convex) | Git-based (complex) |
| Mobile | Responsive web | Not supported |
| Bundle size | N/A (web) | 15MB |
| Complexity | Lower (JS only) | Higher (Rust + JS) |
| SEO/Marketing | Built-in | Separate site needed |

### Decision: **Next.js**

**Rationale**:
1. **Zero friction** - Users access via URL, no download barrier
2. **Real-time collaboration** - Convex subscriptions work natively
3. **Simpler stack** - No Rust compilation, no Tauri IPC bridge
4. **Faster iteration** - Deploy to Vercel in seconds
5. **Mobile-ready** - Responsive design from day one

**Trade-offs**:
- No offline support (acceptable for V3 target users)
- No native file system access (use Convex file storage instead)
- No local Git integration (use Convex versioning instead)

---

## Decision 2: Tremor vs shadcn/ui

| Factor | **Tremor** | shadcn/ui |
|--------|-----------|-----------|
| Charts | Built-in (Recharts) | Separate install |
| Dashboard components | KPI cards, tables, filterbars | Generic components |
| Data viz | First-class | DIY |
| Customization | Tailwind variants | Full source control |
| Design language | Data-dense, professional | Minimal, flexible |

### Decision: **Tremor**

**Rationale**:
1. **Dashboard-first** - Built for data visualization (our core use case)
2. **Chart components** - AreaChart, BarChart, DonutChart, SparkChart built-in
3. **KPI Cards** - 29 variants ready to use for experiment results
4. **Tables** - Rich table components with actions, pagination
5. **Consistent design** - Professional data-dense aesthetic

---

## Decision 3: Convex as Unified Backend

| Factor | **Convex** | Supabase + separate API |
|--------|-----------|------------------------|
| Real-time | Built-in subscriptions | WebSocket setup needed |
| Server functions | Actions + mutations | Edge functions |
| File storage | Built-in | S3/separate |
| Auth | Built-in | Auth0/Clerk |
| TypeScript | End-to-end type safety | Partial |
| State management | useQuery replaces Zustand | Separate state layer |

### Decision: **Convex for everything**

**Rationale**:
1. **Single backend** - No separate API server, DB, file storage, auth
2. **Real-time** - Subscriptions replace polling and manual state sync
3. **Replaces Zustand + TanStack** - `useQuery` is reactive, no store needed
4. **Actions for AI** - Call Claude API from Convex actions (server-side, secure)
5. **File storage** - Upload context files directly to Convex
6. **Already integrated** - Convex is set up in the project

### What Convex Replaces

```
V2 (Tauri)                    V3 (Convex)
----------                    -----------
Zustand store        ->       useQuery (reactive)
TanStack Query       ->       useQuery (reactive)
Rust file system     ->       Convex file storage
Local Claude SDK     ->       Convex actions
git2 + Git           ->       Convex mutations (version history)
Clerk auth           ->       Convex auth
Express/API routes   ->       Convex HTTP actions
```

---

## Decision 4: Claude via Convex Actions

| Factor | **Convex Actions** | Client-side SDK | Next.js API Routes |
|--------|-------------------|-----------------|-------------------|
| API key security | Server-side (secure) | Exposed (insecure) | Server-side |
| Streaming | Via Convex | Direct | Via API |
| Rate limiting | Server-side | Client trust | Server-side |
| Cost tracking | Centralized | Distributed | Centralized |

### Decision: **Convex Actions**

**Rationale**:
1. **Secure** - API key never reaches client
2. **Centralized** - All AI calls go through Convex (logging, cost tracking)
3. **Integrated** - Can read/write Convex data in same action
4. **Retries** - Convex actions have built-in retry logic

---

## Decision 5: Daytona for Execution

Daytona provides secure, isolated sandboxes for AI code execution:
- Parallel persona execution (10+ concurrent sandboxes)
- 200ms sandbox startup time
- Python/TypeScript SDKs for orchestration
- Complete isolation per persona (security)
- File system + process management per sandbox

Called via Convex HTTP actions. Each persona runs in its own Daytona sandbox for full isolation.

---

## Decision 6: No Git Integration (V3)

| Factor | **Convex Storage** | Git/GitHub |
|--------|-------------------|------------|
| Setup | Zero config | Repo setup required |
| Collaboration | Real-time (Convex) | PR-based (async) |
| History | Convex mutations log | Git log |
| Complexity | None | git2, GitHub OAuth |
| Web-friendly | Yes | Desktop-oriented |

### Decision: **Convex storage, no Git for V3**

**Rationale**:
1. **Web-first** - No local Git repos in a web app
2. **Simpler** - Removes entire layer of complexity
3. **Real-time** - Convex subscriptions > git pull
4. **Future** - Can add GitHub export as a feature later (not core)

---

## Summary

V3 simplifies the architecture significantly by going web-first:

```
V2 Stack (7 technologies):
  Tauri + React + Vite + Zustand + TanStack + Convex + Git

V3 Stack (4 technologies):
  Next.js + Tremor + Convex + Daytona
```

Everything flows through Convex: auth, data, files, AI, real-time sync.
