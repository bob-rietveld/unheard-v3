# Unheard V3: Complete Planning Documents

**Created**: 2026-02-08
**Status**: Ready for Implementation
**Strategy**: Vertical slices - Complete working features, shipped incrementally

---

## START HERE

**Read this first**: `IMPLEMENTATION-PRIORITY.md`

This document explains:

- **Vertical slice strategy** (function-by-function delivery)
- **5 implementation phases** (8 weeks total)
- **Complete tech stack** (Next.js + Convex + Tremor + Daytona)
- **Template-driven architecture** (investors, product, operations)
- **Week-by-week checklist**

**Then read**: This README for complete document index.

---

## What You're Building

**Unheard V3** is an **AI-powered decision support platform for founders** with:

1. **Template-Driven System** - Pre-configured workflows (Investors, Product, Operations)
2. **Conversational Interface** - Chat-based decision-making (no complex configuration)
3. **Context-Grounded** - Company data, metrics, docs always inform decisions
4. **Cloud Execution** - Parallel processing via Daytona sandboxes (10+ personas simultaneously)
5. **Collaboration** - Real-time via Convex, shareable via links
6. **Web-First** - Next.js app, accessible from any browser
7. **Founder-Focused** - Solves real founder problems (fundraising, pricing, hiring)

---

## Architecture Overview

### Tech Stack

```
Framework:      Next.js 14 (App Router, TypeScript)
UI:             Tremor (Radix + Tailwind CSS v4)
State:          Convex reactive queries (useQuery/useMutation)
Cloud Backend:  Convex (database, actions, file storage, auth)
AI:             Claude API via Convex actions (server-side)
Execution:      Daytona (parallel persona processing via sandboxes)
Font:           Geist Sans
Styling:        Tailwind CSS v4 + @tailwindcss/forms
```

### Architecture Diagram

```
+-----------------------------------------------------+
|              NEXT.JS APP (Web)                       |
+-----------------------------------------------------+
|                                                       |
|  +------------------------------------------+        |
|  |  Chat Interface                           |        |
|  |  - Conversational decision-making         |        |
|  |  - Template selection + config wizard     |        |
|  |  - Real-time streaming results            |        |
|  +------------------------------------------+        |
|                      |                                |
|  +------------------------------------------+        |
|  |  Tremor UI Components                     |        |
|  |  - KPI Cards, Charts, Tables              |        |
|  |  - Results dashboard                      |        |
|  |  - Forms, Dialogs, Filterbars             |        |
|  +------------------------------------------+        |
|                                                       |
+-----------------------------------------------------+
                         |
         +-------------------------------+
         |   CONVEX (Cloud Backend)      |
         +-------------------------------+
         | - Template library            |
         | - Context storage (files)     |
         | - Experiment configs          |
         | - Results database            |
         | - User authentication         |
         | - Claude API actions          |
         | - Real-time subscriptions     |
         +-------------------------------+
                         |
         +-------------------------------+
         |   EXECUTION LAYER (Cloud)     |
         +-------------------------------+
         | - Daytona (persona execution)  |
         | - Parallel processing         |
         | - 10+ concurrent personas     |
         +-------------------------------+
```

---

## Document Index

### 1. Implementation Priority (READ FIRST)

**File**: `IMPLEMENTATION-PRIORITY.md`
- Vertical slice strategy explanation
- 5-phase implementation plan (8 weeks)
- Detailed Phase 1 checklist
- Tech stack decisions
- Next actions checklist

### 2. Architecture Decision

**File**: `architecture-decision.md`
- Why Next.js (vs Tauri/Electron)
- Convex as unified backend
- Daytona for cloud execution
- Trade-off analysis

### 3. Template System Specification

**File**: `template-system-spec.md`
- Template structure and format
- 5 core templates
- Configuration schema
- Customization system

### 4. Data Models Specification

**File**: `data-models-spec.md`
- Convex schemas
- TypeScript types
- Relationships and indexes

### 5. Vertical Slice Implementation

**File**: `vertical-slice-implementation.md`
- Phase-by-phase breakdown (8 weeks)
- Demo scripts for each phase

### 6. Final Summary

**File**: `FINAL-SUMMARY.md`
- Executive summary and metrics
- Market opportunity
- What you get after 8 weeks

---

## Implementation Timeline: 8 Weeks

### PHASE 1: Context Upload (Weeks 1-2)

**Goal**: User can upload company context and see it in the app

- Context upload UI (drag-and-drop)
- File parsing via Convex actions
- Context library view (Tremor Cards)
- Convex file storage

**Demo**: Upload customer CSV -> See in context library -> Stored in Convex

### PHASE 2: Chat Interface + Agent (Weeks 3-4)

**Goal**: Conversational decision-making works end-to-end

- Chat UI
- Claude API via Convex actions
- Template library (5 templates)
- Guided configuration flow
- Decision logging to Convex

**Demo**: Chat "I need to decide on seed vs bootstrap" -> Agent guides through template -> Creates decision log

### PHASE 3: Cloud Execution (Weeks 5-6)

**Goal**: Experiments run in parallel on cloud with real personas

- Persona generation from context
- Daytona integration via Convex actions
- Parallel execution (10+ personas)
- Real-time result streaming via Convex subscriptions
- Progress UI

**Demo**: Run investor pitch test -> 10 personas respond in parallel -> Results stream in 30 seconds

### PHASE 4: Results & Visualization (Week 7)

**Goal**: Results are easy to understand and actionable

- Results dashboard with Tremor charts
- Sentiment analysis
- Key insights extraction
- Export functionality

**Demo**: View experiment results -> See sentiment breakdown -> Export report

### PHASE 5: Iteration & Polish (Week 8)

**Goal**: Follow-up questions work, collaboration enabled

- Follow-up questions
- Experiment comparison
- Template customization
- Team sharing via Convex
- Polish

**Demo**: Ask follow-up question -> Agent suggests new experiment -> Team member reviews

---

## Key Differences from V2 (Tauri)

| Aspect | V2 (Tauri) | V3 (Next.js) |
|--------|------------|---------------|
| Platform | Desktop (Tauri/Rust) | Web (Next.js) |
| UI Library | shadcn/ui | Tremor |
| State | Zustand + TanStack | Convex reactive queries |
| File Ops | Rust fs + git2 | Convex file storage |
| AI Calls | Local Claude SDK | Convex actions (server-side) |
| Auth | Clerk + Convex | Convex auth |
| Versioning | Local Git + GitHub | Convex (version history) |
| Distribution | Download .dmg/.exe | URL (instant access) |

### Why Web-First for V3

1. **Zero install** - Users access via URL, no download
2. **Real-time collaboration** - Convex subscriptions built-in
3. **Simpler stack** - No Rust, no Tauri, no local Git
4. **Faster iteration** - Deploy to Vercel, instant updates
5. **Mobile-friendly** - Works on any device
6. **SEO/Marketing** - Landing pages, blog, docs all in one app
