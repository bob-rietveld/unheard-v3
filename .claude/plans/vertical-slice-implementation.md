# Vertical Slice Implementation Plan

## Phase-by-Phase Delivery Strategy

**Date**: 2026-02-08
**Version**: 3.0 (Next.js + Convex + Tremor + Daytona)
**Strategy**: Deliver complete, working features incrementally

---

## Philosophy: Vertical Slices Over Horizontal Layers

### Traditional Approach (Horizontal Layers - DON'T DO THIS)

```
Month 1: Build all databases
Month 2: Build all backend logic
Month 3: Build all frontend UI
-> Nothing works until month 3!
```

### Our Approach (Vertical Slices - DO THIS)

```
Week 2: Context upload works end-to-end
Week 4: Chat interface works end-to-end
Week 6: Cloud execution works end-to-end
-> Always have working software!
```

**Benefits**:

- Demo progress every 2 weeks
- Get user feedback early
- Can ship anytime (not locked into full timeline)
- Reduces risk (find issues early)

---

## Complete Implementation Plan: 8 Weeks to Production

### PHASE 1: Context Upload (Weeks 1-2) - START HERE

#### Goal

User can upload company context (CSV, PDF) and see it stored in the app, ready for use by the agent.

#### Scope

- Convex auth setup (GitHub/Google provider)
- File upload to Convex storage
- CSV parsing via Convex action
- Context library UI (Tremor Cards)
- Real-time updates via Convex subscriptions

#### Features Included

**1. Convex Auth**

```typescript
// convex/auth.ts
import { convexAuth } from '@convex-dev/auth/server'
import GitHub from '@auth/core/providers/github'

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [GitHub],
})
```

**2. File Upload to Convex Storage**

```typescript
// convex/contextDocuments.ts
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    filename: v.string(),
    fileType: v.union(v.literal('csv'), v.literal('pdf'), v.literal('xlsx'), v.literal('txt'), v.literal('md')),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)
    return await ctx.db.insert('contextDocuments', {
      userId: user._id,
      projectId: args.projectId,
      filename: args.filename,
      fileType: args.fileType,
      contentType: 'general',
      storageId: args.storageId,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})
```

**3. CSV Parsing Action**

```typescript
// convex/actions/parseFile.ts
export const parseCSV = action({
  args: { documentId: v.id('contextDocuments') },
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(api.contextDocuments.get, { id: args.documentId })
    const fileUrl = await ctx.storage.getUrl(doc.storageId)
    const text = await (await fetch(fileUrl)).text()

    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const rowCount = lines.length - 1

    const schema = headers.map(columnName => ({
      columnName,
      dataType: 'string',
      sampleValues: lines.slice(1, 4).map(line => {
        const cols = line.split(',')
        return cols[headers.indexOf(columnName)]?.trim() || ''
      }),
    }))

    const contentType = detectContentType(headers)

    await ctx.runMutation(api.contextDocuments.updateMetadata, {
      documentId: args.documentId,
      schema, rowCount, contentType,
    })

    return { schema, rowCount, contentType }
  },
})
```

**4. UI Components (Tremor)**

```tsx
// src/app/projects/[projectId]/context/page.tsx
'use client'

export default function ContextPage({ params }) {
  const docs = useQuery(api.contextDocuments.listByProject, {
    projectId: params.projectId,
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Context Library</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs?.map(doc => (
          <Card key={doc._id} className="p-4">
            <h3 className="font-semibold">{doc.filename}</h3>
            <p className="text-sm text-gray-500">
              {doc.rowCount ? `${doc.rowCount} rows` : 'Processing...'}
            </p>
            <Badge className="mt-2">{doc.contentType}</Badge>
          </Card>
        ))}
        <ContextUploader projectId={params.projectId} />
      </div>
    </div>
  )
}
```

#### Demo Script

```
1. User opens app -> Signs in with GitHub
2. Creates new project "ACME Corp"
3. Clicks upload area, selects "B2B_Customers.csv" (500 rows)
4. File uploads -> Card appears immediately (Convex real-time)
5. Parser detects: "Customer data (500 rows, 5 columns)"
6. Card shows:
   - Filename: B2B_Customers.csv
   - Type: customer_data
   - 500 rows
7. Upload pitch-deck.pdf
8. Both files visible in real-time
```

**User can upload and view context!**

#### Implementation Checklist

**Week 1**:

- [ ] Convex auth setup (GitHub provider)
- [ ] Users table and auth flow
- [ ] Projects table and CRUD
- [ ] File upload to Convex storage
- [ ] Basic context page UI (Tremor Cards)
- [ ] Upload component with drag-and-drop

**Week 2**:

- [ ] CSV parser (Convex action)
- [ ] Schema detection logic
- [ ] Content type auto-detection
- [ ] Context library grid layout
- [ ] File detail view
- [ ] Delete functionality
- [ ] E2E test: Upload -> Parse -> View

**Deliverable**: Working context upload

---

### PHASE 2: Chat Interface + Agent (Weeks 3-4)

#### Goal

User can have a conversation with the agent about a decision, and the agent guides them to select and customize a template, resulting in a decision record.

#### What Gets Added to Phase 1

**1. Claude via Convex Action**

```typescript
// convex/actions/chat.ts
export const sendMessage = action({
  args: {
    conversationId: v.id('conversations'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Save user message
    await ctx.runMutation(api.messages.create, {
      conversationId: args.conversationId,
      role: 'user',
      content: args.content,
    })

    // Load history + context
    const history = await ctx.runQuery(api.messages.listByConversation, {
      conversationId: args.conversationId,
    })

    // Call Claude (API key in Convex env vars - secure, server-side)
    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: history.map(m => ({ role: m.role, content: m.content })),
    })

    // Save assistant response
    await ctx.runMutation(api.messages.create, {
      conversationId: args.conversationId,
      role: 'assistant',
      content: response.content[0].text,
    })
  },
})
```

**2. Chat UI**

```tsx
// src/components/chat/ChatInterface.tsx
'use client'

export function ChatInterface({ conversationId }) {
  const messages = useQuery(api.messages.listByConversation, { conversationId })
  const sendMessage = useAction(api.actions.chat.sendMessage)
  const [input, setInput] = useState('')

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages?.map(msg => (
          <ChatBubble key={msg._id} message={msg} />
        ))}
      </div>
      <div className="border-t p-4 flex gap-2">
        <Textarea value={input} onChange={e => setInput(e.target.value)} />
        <Button onClick={() => { sendMessage({ conversationId, content: input }); setInput('') }}>
          Send
        </Button>
      </div>
    </div>
  )
}
```

**3. Template System**

```typescript
// convex/experimentTemplates.ts
export const listOfficial = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('experimentTemplates')
      .withIndex('by_official', q => q.eq('isOfficial', true))
      .collect()
  },
})
```

**4. Configuration Wizard**

Rendered inline in the chat area when the agent recommends a template. Sequential question flow from the template's `configurationFlow` array.

**5. Decision Creation**

```typescript
// convex/decisions.ts
export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    category: v.string(),
    templateId: v.optional(v.id('experimentTemplates')),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)
    return await ctx.db.insert('decisions', {
      userId: user._id,
      projectId: args.projectId,
      title: args.title,
      status: 'evaluating',
      category: args.category,
      templateId: args.templateId,
      config: args.config,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})
```

#### Demo Script

```
1. User opens app -> Sees chat interface
2. Types: "I need to decide whether to raise seed funding"
3. Agent responds (via Convex action, ~3 seconds):
   "I can help with that. I recommend the Investor Evaluation template.
    Let me ask a few questions..."
4. Config wizard appears inline
5. User answers 5 questions
6. Agent: "Great! I've configured an experiment with 10 investor personas.
    Ready to run?"
7. Decision record created in Convex
```

**User can chat and configure experiments!**

#### Implementation Checklist

**Week 3**:

- [ ] Conversations table + CRUD
- [ ] Messages table + CRUD
- [ ] Claude API integration (Convex action)
- [ ] Chat UI component
- [ ] System prompt with template awareness
- [ ] Real-time message updates

**Week 4**:

- [ ] Template selector (agent recommends)
- [ ] Configuration wizard component
- [ ] Decision creation mutation
- [ ] Template seed data (5 templates)
- [ ] Conversation history persistence
- [ ] E2E test: Chat -> Template -> Decision

**Deliverable**: Conversational experiment design

---

### PHASE 3: Cloud Execution (Weeks 5-6)

#### Goal

Experiments run on Daytona with 10+ personas in parallel, results stream back in real-time.

#### What Gets Added to Phases 1-2

**1. Persona Generation (Convex Action)**

Calls Claude to generate realistic personas from template archetypes, saves to Convex.

**2. Daytona Functions (Python)**

```python
# daytona_functions/experiment_runner.py
async def execute_persona(persona: dict, stimulus: str) -> dict:
    # Creates Daytona sandbox per persona
    # Uses Claude Haiku for fast persona responses
    # Returns response + sentiment + key points
```

**3. Experiment Orchestrator (Convex Action)**

Calls Daytona API, receives results, saves each result to Convex (triggering real-time UI updates).

**4. Real-Time Progress UI (Tremor)**

```tsx
// Uses Convex useQuery subscriptions for live updates
const experiment = useQuery(api.experiments.get, { id: experimentId })
const results = useQuery(api.experimentResults.listByExperiment, { experimentId })
// ProgressBar updates automatically as results stream in
```

#### Demo Script

```
1. User clicks "Run Experiment" (from Phase 2)
2. "Generating personas..." (Convex action)
3. After 5 seconds: "10 personas generated"
4. "Running experiment..." (Daytona)
5. Results stream in real-time via Convex:
   - Sarah (CTO) - Positive
   - Mike (VP Eng) - Neutral
   - ... (8 more)
6. After 30-45 seconds: "Experiment complete!"
7. (Transitions to Phase 4)
```

**User can run parallel cloud experiments!**

#### Implementation Checklist

**Week 5**:

- [ ] Persona generation action
- [ ] Personas table + CRUD
- [ ] Experiments table + status tracking
- [ ] Daytona account setup
- [ ] Daytona experiment runner function
- [ ] Daytona API integration from Convex

**Week 6**:

- [ ] ExperimentResults table + streaming inserts
- [ ] Real-time progress UI (Tremor ProgressBar)
- [ ] Error handling and retries
- [ ] Experiment status transitions
- [ ] E2E test: Create -> Generate -> Run -> Results

**Deliverable**: Fast parallel cloud execution

---

### PHASE 4: Results & Visualization (Week 7)

#### Goal

Results are displayed with charts, sentiment analysis, key insights, and export options.

#### What Gets Added to Phases 1-3

**1. Results Dashboard (Tremor)**

- KPI cards (interest rate, avg sentiment, response count)
- BarChart (sentiment by archetype)
- DonutChart (overall sentiment distribution)
- Individual response cards

**2. AI Insight Extraction (Convex Action)**

Calls Claude to analyze all responses, extract patterns, generate actionable recommendations. Saved to `experimentInsights` table.

**3. Export (Markdown)**

Generates markdown report with all results, insights, and recommendations. Copy to clipboard.

#### Demo Script

```
1. Experiment completes (from Phase 3)
2. Results dashboard loads (Tremor charts)
3. KPI: "70% Investment Interest"
4. Bar chart: Seed VCs 100%, Angels 67%
5. Donut chart: 7 positive, 2 neutral, 1 negative
6. Key insights with recommendations
7. Click "Export" -> Markdown copied to clipboard
```

**User gets actionable insights!**

#### Implementation Checklist

**Week 7**:

- [ ] Results dashboard page
- [ ] KPI card components
- [ ] BarChart by archetype
- [ ] DonutChart for sentiment
- [ ] Insight extraction action
- [ ] ExperimentInsights table
- [ ] Individual response cards
- [ ] Markdown export
- [ ] E2E test: Results -> Charts -> Insights -> Export

**Deliverable**: Beautiful, actionable results

---

### PHASE 5: Iteration & Polish (Week 8)

#### Goal

Follow-up questions work, polish complete.

#### What Gets Added to Phases 1-4

**1. Follow-Up Questions**

Agent suggests follow-up experiments based on results. User can ask questions with full experiment context.

**2. Template Customization**

Fork official templates, modify configuration flow and persona archetypes.

**3. Polish**

- Dark mode (Tremor built-in)
- Loading skeletons
- Empty states
- Error handling with toasts
- Keyboard shortcuts
- Onboarding flow

#### Demo Script (Complete Flow)

```
1. Sign in with GitHub
2. Create project "ACME Corp"
3. Upload context files
4. Chat: "Should I raise seed?"
5. Agent guides through template
6. Configure experiment
7. Run with 10 personas (~45s)
8. View results dashboard
9. Ask follow-up: "Why are angels concerned?"
10. Agent explains and suggests follow-up
11. Export report
TOTAL TIME: ~10 minutes
```

**Complete collaborative workflow!**

#### Implementation Checklist

**Week 8**:

- [ ] Follow-up chat with experiment context
- [ ] Agent suggests new experiments
- [ ] Template fork/customize
- [ ] Dark mode toggle
- [ ] Loading states and skeletons
- [ ] Empty states with prompts
- [ ] Error handling (Tremor toasts)
- [ ] Onboarding flow
- [ ] E2E test: Complete workflow start to finish

**Deliverable**: Production-ready platform

---

## Complete Timeline Summary

```
MONTH 1: Foundation
  Week 1-2: PHASE 1 - Context Upload
    -> Demo: Upload CSV -> View library -> Real-time updates

  Week 3-4: PHASE 2 - Chat Interface + Agent
    -> Demo: Chat -> Template -> Decision record

MONTH 2: Execution & Polish
  Week 5-6: PHASE 3 - Cloud Execution
    -> Demo: 10 personas -> 45 seconds -> Results

  Week 7: PHASE 4 - Results & Visualization
    -> Demo: Charts -> Insights -> Export

  Week 8: PHASE 5 - Iteration & Polish
    -> Demo: Follow-up -> Compare -> Export
```

**Total: 8 weeks (2 months)**

---

## Success Criteria

### Phase 1 Complete When:

- [ ] User can upload CSV/PDF
- [ ] Context displays in library (real-time)
- [ ] Files stored in Convex storage
- [ ] CSV parsed with schema detection
- [ ] **Demo: Upload -> View -> Parse**

### Phase 2 Complete When:

- [ ] Chat interface works (real-time via Convex)
- [ ] Agent understands decision intent
- [ ] Template selection works
- [ ] Decision record created
- [ ] **Demo: Chat -> Template -> Decision**

### Phase 3 Complete When:

- [ ] Personas generated from archetypes
- [ ] Experiments run on Daytona
- [ ] 10+ personas execute in parallel
- [ ] Results stream via Convex subscriptions
- [ ] **Demo: Experiment -> 10 personas -> 45 seconds**

### Phase 4 Complete When:

- [ ] Results visualized with Tremor charts
- [ ] Sentiment analysis by archetype
- [ ] AI insights extracted
- [ ] Markdown export works
- [ ] **Demo: Results -> Charts -> Insights -> Export**

### Phase 5 Complete When:

- [ ] Follow-up questions work
- [ ] Template customization
- [ ] Polish complete
- [ ] **Demo: Complete end-to-end flow**

---

## Ready to Build!

**Planning**: COMPLETE
**Architecture**: COMPLETE
**Phase Breakdown**: COMPLETE

**Next Action**: Start Phase 1, Day 1

**Follow**: `IMPLEMENTATION-PRIORITY.md` for detailed day-by-day tasks

**Key difference from V2**: No Tauri, no Rust, no Git integration, no local Claude SDK. Everything runs through Next.js + Convex + Daytona. Simpler architecture, faster to build, easier to deploy.
