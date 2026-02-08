# Unheard V3: Implementation Priority & Guide

**Date**: 2026-02-08
**Strategy**: Vertical slices - Complete working features, shipped incrementally
**Timeline**: 8 weeks to MVP
**Tech Stack**: Next.js + Tremor + Convex + Daytona

---

## Implementation Strategy

### Vertical Slices (Not Horizontal Layers)

```
WRONG (Horizontal):
Month 1: All databases
Month 2: All backend
Month 3: All frontend
-> Nothing works until month 3

RIGHT (Vertical):
Week 2: Context upload works end-to-end
Week 4: Chat interface works end-to-end
Week 6: Experiments run end-to-end
-> Always have demo-able software
```

---

## 5 Implementation Phases (8 Weeks)

### Overview

```
PHASE 1: Context Upload (Weeks 1-2)
  -> Enables context management
PHASE 2: Chat Interface + Agent (Weeks 3-4)
  -> Enables conversational setup
PHASE 3: Cloud Execution (Weeks 5-6)
  -> Enables parallel experiments
PHASE 4: Results & Visualization (Week 7)
  -> Enables insight extraction
PHASE 5: Iteration & Polish (Week 8)
  -> Enables collaboration

-> MVP COMPLETE (8 weeks)
```

---

## PHASE 1: Context Upload (Weeks 1-2)

### Goal

User can upload company context (CSV, PDF) and see it in the app.

### What to Build

#### Day 1-2: Convex Schema & Auth

```typescript
// convex/schema.ts - Already defined in data-models-spec.md
// Set up Convex auth first

// convex/auth.ts
import { convexAuth } from '@convex-dev/auth/server'
import GitHub from '@auth/core/providers/github'

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [GitHub],
})
```

```typescript
// convex/users.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
  },
})
```

#### Day 3-5: File Upload with Convex Storage

```tsx
// src/components/context/ContextUploader.tsx
'use client'

import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

export function ContextUploader({ projectId }: { projectId: string }) {
  const generateUploadUrl = useMutation(api.contextDocuments.generateUploadUrl)
  const createDocument = useMutation(api.contextDocuments.create)

  const handleUpload = async (file: File) => {
    // 1. Get upload URL from Convex
    const uploadUrl = await generateUploadUrl()

    // 2. Upload file to Convex storage
    const result = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    const { storageId } = await result.json()

    // 3. Parse file and create document record
    await createDocument({
      projectId,
      filename: file.name,
      fileType: detectFileType(file.name),
      storageId,
    })
  }

  return (
    <div
      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                 hover:border-blue-500 transition-colors"
      onDrop={(e) => {
        e.preventDefault()
        const files = Array.from(e.dataTransfer.files)
        files.forEach(handleUpload)
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <p className="font-medium">Upload Context</p>
      <p className="text-sm text-gray-500 mt-1">CSV, PDF, or Excel files</p>
    </div>
  )
}
```

```typescript
// convex/contextDocuments.ts
import { mutation, query, action } from './_generated/server'
import { v } from 'convex/values'

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
    fileType: v.union(
      v.literal('csv'),
      v.literal('pdf'),
      v.literal('xlsx'),
      v.literal('txt'),
      v.literal('md')
    ),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) throw new Error('User not found')

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

export const listByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('contextDocuments')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()
  },
})
```

#### Day 6-8: CSV Parsing via Convex Action

```typescript
// convex/actions/parseFile.ts
import { action } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'

export const parseCSV = action({
  args: {
    documentId: v.id('contextDocuments'),
  },
  handler: async (ctx, args) => {
    // Get the document
    const doc = await ctx.runQuery(api.contextDocuments.get, { id: args.documentId })
    if (!doc) throw new Error('Document not found')

    // Get file from storage
    const fileUrl = await ctx.storage.getUrl(doc.storageId)
    if (!fileUrl) throw new Error('File not found')

    const response = await fetch(fileUrl)
    const text = await response.text()

    // Parse CSV
    const lines = text.split('\n')
    const headers = lines[0].split(',').map((h) => h.trim())
    const rowCount = lines.length - 1

    // Detect schema
    const schema = headers.map((columnName) => ({
      columnName,
      dataType: 'string',
      sampleValues: lines
        .slice(1, 4)
        .map((line) => {
          const cols = line.split(',')
          return cols[headers.indexOf(columnName)]?.trim() || ''
        }),
    }))

    // Detect content type from column names
    const contentType = detectContentType(headers)

    // Update document with parsed metadata
    await ctx.runMutation(api.contextDocuments.updateMetadata, {
      documentId: args.documentId,
      schema,
      rowCount,
      contentType,
    })

    return { schema, rowCount, contentType }
  },
})

function detectContentType(headers: string[]): string {
  const headerStr = headers.join(' ').toLowerCase()
  if (headerStr.includes('investor') || headerStr.includes('fund'))
    return 'investor_data'
  if (headerStr.includes('customer') || headerStr.includes('user'))
    return 'customer_data'
  if (headerStr.includes('product') || headerStr.includes('feature'))
    return 'product_data'
  if (headerStr.includes('revenue') || headerStr.includes('mrr'))
    return 'metrics'
  return 'general'
}
```

#### Day 9-10: Context Library UI (Tremor)

```tsx
// src/app/projects/[projectId]/context/page.tsx
'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { ContextUploader } from '@/components/context/ContextUploader'

export default function ContextPage({ params }: { params: { projectId: string } }) {
  const docs = useQuery(api.contextDocuments.listByProject, {
    projectId: params.projectId,
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Context Library</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs?.map((doc) => (
          <Card key={doc._id} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">
                {doc.fileType === 'csv' ? '#' : doc.fileType === 'pdf' ? '%' : '@'}
              </span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                  {doc.filename}
                </h3>
                <p className="text-sm text-gray-500">
                  {doc.rowCount ? `${doc.rowCount} rows` : 'Processing...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{doc.contentType}</Badge>
              <span className="text-xs text-gray-400">
                {new Date(doc.createdAt).toLocaleDateString()}
              </span>
            </div>
          </Card>
        ))}

        <ContextUploader projectId={params.projectId} />
      </div>
    </div>
  )
}
```

### Phase 1 Success Criteria

- [ ] User can drag-and-drop CSV/PDF files
- [ ] Files uploaded to Convex storage
- [ ] CSV files parsed with schema detection
- [ ] Content type auto-detected
- [ ] Files listed in context library UI (Tremor Cards)
- [ ] Metadata stored in Convex (real-time updates)

### Phase 1 Demo Script

```
1. Open app at localhost:3000
2. Create new project "ACME Corp Decisions"
3. Upload customers.csv (500 rows)
4. See file in context library:
   - "customers.csv"
   - "500 rows"
   - Badge: "customer_data"
5. Upload pitch-deck.pdf
6. See both files in library (real-time update)
```

**Demo this to stakeholders before proceeding to Phase 2!**

---

## PHASE 2: Chat Interface + Agent (Weeks 3-4)

### Goal

Conversational decision-making works end-to-end.

### What to Build

#### Week 3 Day 1-2: Chat UI

```tsx
// src/components/chat/ChatInterface.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/Button'
import { Textarea } from '@/components/Textarea'

export function ChatInterface({ conversationId }: { conversationId: string }) {
  const messages = useQuery(api.messages.listByConversation, { conversationId })
  const sendMessage = useMutation(api.messages.send)
  const [input, setInput] = useState('')

  const handleSend = async () => {
    if (!input.trim()) return
    await sendMessage({ conversationId, content: input })
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages?.map((msg) => (
          <div
            key={msg._id}
            className={msg.role === 'user' ? 'text-right' : 'text-left'}
          >
            <div
              className={`inline-block max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-50'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-4 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your decision..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          className="flex-1"
        />
        <Button onClick={handleSend}>Send</Button>
      </div>
    </div>
  )
}
```

#### Week 3 Day 3-5: Claude Integration via Convex Action

```typescript
// convex/actions/chat.ts
import { action } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are a decision support assistant for founders.

Your role is to help founders make better decisions by:
1. Understanding their decision context
2. Selecting the right template for their situation
3. Guiding them through configuration
4. Running experiments with realistic personas
5. Explaining results clearly

Available templates:
- Investor Evaluation (test investor interest)
- Pricing Strategy (test pricing with customers)
- Product Roadmap (prioritize features)
- Hiring Decision (evaluate candidates)
- Operations Decision (process/tool choices)

Be conversational, ask clarifying questions, and guide them step-by-step.
Respond concisely (2-3 sentences). Always suggest a next step.`

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

    // Load conversation history
    const history = await ctx.runQuery(api.messages.listByConversation, {
      conversationId: args.conversationId,
    })

    // Load context documents for this project
    const conversation = await ctx.runQuery(api.conversations.get, {
      id: args.conversationId,
    })
    const contextDocs = await ctx.runQuery(api.contextDocuments.listByProject, {
      projectId: conversation.projectId,
    })

    // Call Claude
    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SYSTEM_PROMPT + `\n\nAvailable context:\n${contextDocs.map((d) => `- ${d.filename} (${d.contentType}, ${d.rowCount || 0} rows)`).join('\n')}`,
      messages: history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const assistantContent =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Save assistant message
    await ctx.runMutation(api.messages.create, {
      conversationId: args.conversationId,
      role: 'assistant',
      content: assistantContent,
    })

    return assistantContent
  },
})
```

#### Week 3 Day 6-7: Template Selection

```typescript
// convex/actions/templateSelection.ts
import { action } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'
import Anthropic from '@anthropic-ai/sdk'

export const selectTemplate = action({
  args: {
    userInput: v.string(),
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const templates = await ctx.runQuery(api.experimentTemplates.listOfficial)

    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Based on this user message, which template best fits?

User: "${args.userInput}"

Templates:
${templates.map((t) => `- ${t.name} (${t.category}): ${t.description}`).join('\n')}

Respond with just the template name or "none" if unclear.`,
        },
      ],
    })

    const templateName =
      response.content[0].type === 'text'
        ? response.content[0].text.trim()
        : 'none'

    if (templateName === 'none') return null

    return templates.find(
      (t) => t.name.toLowerCase() === templateName.toLowerCase()
    )
  },
})
```

#### Week 4 Day 1-3: Configuration Flow (Chat-Embedded)

```tsx
// src/components/chat/ConfigWizard.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'

interface ConfigStep {
  id: string
  question: string
  type: 'text' | 'number' | 'select' | 'textarea'
  required: boolean
  options?: string[]
}

interface ConfigWizardProps {
  steps: ConfigStep[]
  onComplete: (config: Record<string, unknown>) => void
}

export function ConfigWizard({ steps, onComplete }: ConfigWizardProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [step, setStep] = useState(0)

  const current = steps[step]
  const isLast = step === steps.length - 1

  const handleAnswer = (value: unknown) => {
    const updated = { ...config, [current.id]: value }
    setConfig(updated)

    if (isLast) {
      onComplete(updated)
    } else {
      setStep(step + 1)
    }
  }

  return (
    <div className="space-y-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <p className="text-sm text-gray-500">
        Step {step + 1} of {steps.length}
      </p>
      <p className="font-medium text-gray-900 dark:text-gray-50">
        {current.question}
      </p>

      {current.type === 'select' && current.options && (
        <div className="flex flex-wrap gap-2">
          {current.options.map((opt) => (
            <Button
              key={opt}
              variant="secondary"
              onClick={() => handleAnswer(opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
      )}

      {(current.type === 'text' || current.type === 'number') && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleAnswer(formData.get('answer'))
          }}
        >
          <Input
            name="answer"
            type={current.type}
            placeholder={`Enter ${current.id}...`}
            autoFocus
          />
          <Button type="submit" className="mt-2">
            Next
          </Button>
        </form>
      )}

      {current.type === 'textarea' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleAnswer(formData.get('answer'))
          }}
        >
          <textarea
            name="answer"
            className="w-full rounded-lg border p-3"
            rows={3}
            placeholder={`Enter ${current.id}...`}
            autoFocus
          />
          <Button type="submit" className="mt-2">
            Next
          </Button>
        </form>
      )}
    </div>
  )
}
```

#### Week 4 Day 4-7: Decision Creation

```typescript
// convex/decisions.ts
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    category: v.string(),
    templateId: v.optional(v.id('experimentTemplates')),
    context: v.optional(v.string()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) throw new Error('User not found')

    return await ctx.db.insert('decisions', {
      userId: user._id,
      projectId: args.projectId,
      title: args.title,
      status: 'evaluating',
      category: args.category,
      templateId: args.templateId,
      context: args.context,
      config: args.config,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

export const listByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('decisions')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()
  },
})
```

### Phase 2 Success Criteria

- [ ] Chat interface works (real-time via Convex)
- [ ] Claude agent understands user intent
- [ ] Agent recommends template
- [ ] Agent guides through configuration wizard
- [ ] Decision created in Convex
- [ ] Conversation history persisted

### Phase 2 Demo Script

```
1. Open chat interface
2. Type: "I need to decide if I should raise seed or bootstrap"
3. Agent responds:
   "I can help with that. I recommend the 'Investor Evaluation'
    template. Let me ask a few questions..."
4. Agent asks: "What funding stage?" -> User: "Seed, raising $2M"
5. Agent asks: "Your industry?" -> User: "Developer tools"
6. Agent asks: "Current MRR?" -> User: "$50K"
7. Agent asks: "Pitch summary?" -> User provides
8. Agent: "Great! I've configured an experiment.
     Ready to run with 10 investor personas?"
9. (Transitions to Phase 3)
```

**Demo this before proceeding to Phase 3!**

---

## PHASE 3: Cloud Execution (Weeks 5-6)

### Goal

Experiments run in parallel on cloud with real personas.

### What to Build

#### Week 5 Day 1-3: Persona Generation (Convex Action)

```typescript
// convex/actions/generatePersonas.ts
import { action } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'
import Anthropic from '@anthropic-ai/sdk'

export const generatePersonas = action({
  args: {
    experimentId: v.id('experiments'),
    templateId: v.id('experimentTemplates'),
  },
  handler: async (ctx, args) => {
    const template = await ctx.runQuery(api.experimentTemplates.get, {
      id: args.templateId,
    })
    if (!template) throw new Error('Template not found')

    const experiment = await ctx.runQuery(api.experiments.get, {
      id: args.experimentId,
    })

    // Update status
    await ctx.runMutation(api.experiments.updateStatus, {
      experimentId: args.experimentId,
      status: 'generating_personas',
    })

    const anthropic = new Anthropic()
    const personas = []

    for (const archetype of template.personaArchetypes) {
      for (let i = 0; i < archetype.count; i++) {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `Generate a realistic persona:

Archetype: ${archetype.name}
Description: ${archetype.description}
Characteristics: ${archetype.characteristics.join(', ')}

Generate a JSON object with:
- name (realistic full name)
- role (job title)
- company (company name)
- background (2-3 sentences)
- beliefs (array of 3-4 beliefs)
- preferences (array of 3-4 preferences)
- decisionMakingStyle (1 sentence)

Be specific and realistic.`,
            },
          ],
        })

        const personaData = JSON.parse(
          response.content[0].type === 'text' ? response.content[0].text : '{}'
        )

        const personaId = await ctx.runMutation(api.personas.create, {
          experimentId: args.experimentId,
          archetypeId: archetype.id,
          ...personaData,
        })

        personas.push({ id: personaId, ...personaData, archetypeId: archetype.id })
      }
    }

    return personas
  },
})
```

#### Week 5 Day 4-7: Daytona Integration

```python
# daytona_functions/experiment_runner.py

from daytona import Daytona, DaytonaConfig, CreateSandboxFromSnapshotParams
import anthropic
import asyncio
import time
import os

config = DaytonaConfig(api_key=os.environ["DAYTONA_API_KEY"])
daytona = Daytona(config)


async def execute_persona(
    persona: dict,
    stimulus: str,
) -> dict:
    """Execute a single persona simulation in a Daytona sandbox."""
    # Create isolated sandbox for this persona
    sandbox = daytona.create(CreateSandboxFromSnapshotParams(
        language="python",
        env_vars={"ANTHROPIC_API_KEY": os.environ["ANTHROPIC_API_KEY"]},
        auto_stop_interval=60,
    ))

    try:
        # Run persona simulation code in sandbox
        code = f'''
import anthropic
import json

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-haiku-4-5-20251001",
    max_tokens=500,
    system="""You are {persona['name']}, a {persona['role']} at {persona.get('company', 'a company')}.

Background: {persona['background']}
Beliefs: {', '.join(persona.get('beliefs', []))}

Respond as this person would, considering your background and beliefs.
Be specific and realistic. Keep response under 200 words.""",
    messages=[{{"role": "user", "content": """{stimulus}"""}}],
)
print(json.dumps({{"text": response.content[0].text}}))
'''
        result = sandbox.process.code_run(code)
        import json
        output = json.loads(result.result)
        text = output["text"]

        sentiment = analyze_sentiment(text)

        return {
            "persona_id": persona["id"],
            "persona_name": persona["name"],
            "archetype_id": persona["archetype_id"],
            "response": text,
            "sentiment": sentiment["score"],
            "sentiment_label": sentiment["label"],
            "key_points": extract_key_points(text),
            "timestamp": time.time(),
        }
    finally:
        daytona.remove(sandbox)


async def run_experiment(
    personas: list[dict],
    stimulus: str,
) -> list[dict]:
    """Run experiment with all personas in parallel via Daytona sandboxes."""
    tasks = [
        execute_persona(persona, stimulus)
        for persona in personas
    ]
    results = await asyncio.gather(*tasks)
    return list(results)
```

```typescript
// convex/actions/runExperiment.ts
import { action } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'

export const runExperiment = action({
  args: {
    experimentId: v.id('experiments'),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.runQuery(api.experiments.get, {
      id: args.experimentId,
    })
    if (!experiment) throw new Error('Experiment not found')

    // Update status to running
    await ctx.runMutation(api.experiments.updateStatus, {
      experimentId: args.experimentId,
      status: 'running',
    })

    // Get personas
    const personas = await ctx.runQuery(api.personas.listByExperiment, {
      experimentId: args.experimentId,
    })

    // Call Daytona execution service
    const response = await fetch(`${process.env.DAYTONA_API_URL}/run-experiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DAYTONA_API_KEY}`,
      },
      body: JSON.stringify({
        personas: personas.map((p) => ({
          id: p._id,
          name: p.name,
          role: p.role,
          company: p.company,
          background: p.background,
          beliefs: p.beliefs,
          archetype_id: p.archetypeId,
        })),
        stimulus: experiment.stimulus,
      }),
    })

    const results = await response.json()

    // Save each result to Convex (triggers real-time updates)
    for (const result of results.results) {
      await ctx.runMutation(api.experimentResults.create, {
        experimentId: args.experimentId,
        personaId: result.persona_id,
        personaName: result.persona_name,
        archetypeId: result.archetype_id,
        response: result.response,
        sentiment: result.sentiment,
        sentimentLabel: result.sentiment_label,
        keyPoints: result.key_points,
      })

      // Update progress counter
      await ctx.runMutation(api.experiments.incrementCompleted, {
        experimentId: args.experimentId,
      })
    }

    // Mark experiment complete
    await ctx.runMutation(api.experiments.updateStatus, {
      experimentId: args.experimentId,
      status: 'completed',
    })
  },
})
```

#### Week 6 Day 1-4: Real-Time Progress UI (Tremor)

```tsx
// src/components/experiments/ExperimentProgress.tsx
'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/Card'
import { ProgressBar } from '@/components/ProgressBar'
import { Badge } from '@/components/Badge'

export function ExperimentProgress({
  experimentId,
}: {
  experimentId: string
}) {
  // Real-time updates via Convex subscription
  const experiment = useQuery(api.experiments.get, { id: experimentId })
  const results = useQuery(api.experimentResults.listByExperiment, {
    experimentId,
  })

  if (!experiment) return null

  const progress =
    experiment.totalPersonas > 0
      ? (experiment.completedPersonas / experiment.totalPersonas) * 100
      : 0

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">
        Running Experiment
      </h3>

      <ProgressBar value={progress} className="mb-2" />
      <p className="text-sm text-gray-500 mb-4">
        {experiment.completedPersonas} of {experiment.totalPersonas} personas
        complete
      </p>

      <div className="space-y-2">
        {results?.map((result) => (
          <div key={result._id} className="flex items-center gap-2">
            <Badge
              variant={
                result.sentimentLabel === 'positive'
                  ? 'success'
                  : result.sentimentLabel === 'negative'
                    ? 'error'
                    : 'warning'
              }
            >
              {result.sentimentLabel}
            </Badge>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {result.personaName} responded
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

### Phase 3 Success Criteria

- [ ] Personas generated from template archetypes
- [ ] Experiment runs on Daytona in parallel
- [ ] 10+ personas execute simultaneously (<60s total)
- [ ] Results stream in real-time via Convex subscriptions
- [ ] Progress UI updates live

### Phase 3 Demo Script

```
1. (Continuing from Phase 2 demo)
2. Agent: "Running experiment with 10 investor personas..."
3. Progress bar shows real-time updates
4. Results stream in:
   "Sarah Chen (Seed VC) responded" [positive]
   "Mike Rodriguez (Angel) responded" [neutral]
   ...
5. 45 seconds later: "All 10 personas responded"
6. (Transitions to Phase 4: Results visualization)
```

**Demo this before proceeding to Phase 4!**

---

## PHASE 4: Results & Visualization (Week 7)

### Goal

Results are easy to understand and actionable.

### What to Build

#### Day 1-3: Results Dashboard (Tremor Charts)

```tsx
// src/app/projects/[projectId]/experiments/[experimentId]/page.tsx
'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/Card'
import { BarChart } from '@/components/BarChart'
import { DonutChart } from '@/components/DonutChart'

export default function ResultsPage({
  params,
}: {
  params: { experimentId: string }
}) {
  const results = useQuery(api.experimentResults.listByExperiment, {
    experimentId: params.experimentId,
  })
  const insights = useQuery(api.experimentInsights.getByExperiment, {
    experimentId: params.experimentId,
  })

  if (!results) return <p>Loading...</p>

  // Group results by archetype
  const byArchetype = groupByArchetype(results)

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Interest Rate</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            {calculateInterestRate(results)}%
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Avg Sentiment</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            {calculateAvgSentiment(results).toFixed(2)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Responses</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            {results.length}
          </p>
        </Card>
      </div>

      {/* Sentiment by archetype */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Interest by Type</h3>
        <BarChart
          data={byArchetype}
          index="archetype"
          categories={['positive', 'neutral', 'negative']}
          colors={['emerald', 'amber', 'pink']}
        />
      </Card>

      {/* Overall sentiment donut */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Overall Sentiment</h3>
        <DonutChart
          data={[
            { label: 'Positive', count: countBySentiment(results, 'positive') },
            { label: 'Neutral', count: countBySentiment(results, 'neutral') },
            { label: 'Negative', count: countBySentiment(results, 'negative') },
          ]}
          index="label"
          category="count"
          colors={['emerald', 'amber', 'pink']}
        />
      </Card>

      {/* Key insights */}
      {insights && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Key Insights</h3>
          <div className="space-y-3">
            {insights.insights.map((insight, i) => (
              <div key={i} className="border-l-2 border-blue-500 pl-3">
                <p className="font-medium">{insight.insight}</p>
                <p className="text-sm text-gray-500">
                  {insight.actionableRecommendation}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
```

#### Day 4-5: Insight Extraction (Convex Action)

```typescript
// convex/actions/extractInsights.ts
import { action } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'
import Anthropic from '@anthropic-ai/sdk'

export const extractInsights = action({
  args: {
    experimentId: v.id('experiments'),
  },
  handler: async (ctx, args) => {
    const results = await ctx.runQuery(api.experimentResults.listByExperiment, {
      experimentId: args.experimentId,
    })

    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Analyze these experiment results and return a JSON object:

Responses:
${results.map((r) => `${r.personaName} (${r.archetypeId}): ${r.response}\nSentiment: ${r.sentimentLabel}`).join('\n\n')}

Return JSON with:
{
  "insights": [
    {
      "insight": "...",
      "confidence": 0.0-1.0,
      "supportingEvidence": ["..."],
      "actionableRecommendation": "..."
    }
  ],
  "sentimentBreakdown": {
    "positive": count,
    "neutral": count,
    "negative": count,
    "average": -1.0 to 1.0
  },
  "topConcerns": ["..."],
  "topPositives": ["..."]
}`,
        },
      ],
    })

    const insightsData = JSON.parse(
      response.content[0].type === 'text' ? response.content[0].text : '{}'
    )

    await ctx.runMutation(api.experimentInsights.create, {
      experimentId: args.experimentId,
      ...insightsData,
    })

    return insightsData
  },
})
```

#### Day 6-7: Export & Sharing

```typescript
// convex/actions/exportResults.ts
import { action } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'

export const exportMarkdown = action({
  args: {
    experimentId: v.id('experiments'),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.runQuery(api.experiments.get, {
      id: args.experimentId,
    })
    const results = await ctx.runQuery(api.experimentResults.listByExperiment, {
      experimentId: args.experimentId,
    })
    const insights = await ctx.runQuery(api.experimentInsights.getByExperiment, {
      experimentId: args.experimentId,
    })

    let md = `# ${experiment?.name || 'Experiment Results'}\n\n`
    md += `**Date**: ${new Date().toLocaleDateString()}\n`
    md += `**Status**: ${experiment?.status}\n`
    md += `**Personas**: ${results.length}\n\n`

    md += `## Sentiment Breakdown\n\n`
    if (insights) {
      md += `- Positive: ${insights.sentimentBreakdown.positive}\n`
      md += `- Neutral: ${insights.sentimentBreakdown.neutral}\n`
      md += `- Negative: ${insights.sentimentBreakdown.negative}\n\n`
    }

    md += `## Key Insights\n\n`
    insights?.insights.forEach((insight, i) => {
      md += `${i + 1}. **${insight.insight}**\n`
      md += `   - ${insight.actionableRecommendation}\n\n`
    })

    md += `## Individual Responses\n\n`
    results.forEach((r) => {
      md += `### ${r.personaName} (${r.archetypeId})\n`
      md += `**Sentiment**: ${r.sentimentLabel} (${r.sentiment.toFixed(2)})\n\n`
      md += `${r.response}\n\n`
    })

    return md
  },
})
```

### Phase 4 Success Criteria

- [ ] Results visualized with Tremor charts (BarChart, DonutChart)
- [ ] KPI cards show key metrics
- [ ] Sentiment analysis breakdown by archetype
- [ ] AI-powered insight extraction
- [ ] Markdown export with clipboard copy

### Phase 4 Demo Script

```
1. (Continuing from Phase 3)
2. Results dashboard loads with real-time Convex data
3. Shows: "70% Investment Interest" (KPI card)
4. Bar chart: Seed VCs 100%, Angels 67%, etc.
5. Donut chart: overall sentiment distribution
6. Key insights with actionable recommendations
7. Agent: "Key insight: Seed VCs are interested, but you
    need stronger market validation."
```

---

## PHASE 5: Iteration & Polish (Week 8)

### Goal

Follow-up questions work, polish complete.

### What to Build

#### Day 1-2: Follow-Up System

```typescript
// convex/actions/followUp.ts
import { action } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'
import Anthropic from '@anthropic-ai/sdk'

export const suggestFollowUp = action({
  args: {
    experimentId: v.id('experiments'),
  },
  handler: async (ctx, args) => {
    const results = await ctx.runQuery(api.experimentResults.listByExperiment, {
      experimentId: args.experimentId,
    })
    const insights = await ctx.runQuery(api.experimentInsights.getByExperiment, {
      experimentId: args.experimentId,
    })

    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Based on these experiment results, suggest 2-3 follow-up experiments:

Top concerns: ${insights?.topConcerns.join(', ')}
Top positives: ${insights?.topPositives.join(', ')}
Overall sentiment: ${insights?.sentimentBreakdown.average}

What follow-up experiments would address the concerns or test variations?`,
        },
      ],
    })

    return response.content[0].type === 'text' ? response.content[0].text : ''
  },
})
```

#### Day 3-4: Template Customization

```typescript
// convex/experimentTemplates.ts (additions)

export const fork = mutation({
  args: {
    templateId: v.id('experimentTemplates'),
    customizations: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      configurationFlow: v.optional(v.array(v.any())),
      personaArchetypes: v.optional(v.array(v.any())),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) throw new Error('User not found')

    const original = await ctx.db.get(args.templateId)
    if (!original) throw new Error('Template not found')

    return await ctx.db.insert('experimentTemplates', {
      ...original,
      ...args.customizations,
      name: args.customizations.name || `${original.name} (Custom)`,
      authorId: user._id,
      authorName: user.name || user.email,
      isOfficial: false,
      parentTemplateId: args.templateId,
      usageCount: 0,
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})
```

#### Day 5-7: Polish

- Dark mode support (already set up via Tremor)
- Loading states and skeletons (Tremor components)
- Empty states with helpful prompts
- Error handling with toast notifications
- Keyboard shortcuts (Cmd+K command palette)
- Onboarding flow for new users

### Phase 5 Success Criteria

- [ ] Follow-up questions work with experiment context
- [ ] Agent suggests next experiments
- [ ] Template customization (fork and modify)
- [ ] Polish: dark mode, loading states, error handling
- [ ] End-to-end flow works smoothly

### Phase 5 Demo Script (Complete Flow)

```
COMPLETE END-TO-END DEMO:

1. Sign in (Convex Auth)
2. Create project "ACME Corp"
3. Upload context (customers.csv, pitch-deck.pdf)
4. Chat: "Should I raise seed or bootstrap?"
5. Agent guides through investor template
6. Configure: Seed, $2M, developer tools, $50K MRR
7. Agent creates decision record
8. Run experiment with 10 investor personas
9. View results: 70% positive, concerns noted
10. Ask: "Why were VCs concerned about market size?"
11. Agent explains and suggests follow-up
12. Run follow-up experiment
13. Compare results
14. Export markdown report

TOTAL TIME: 10 minutes
```

---

## Success Metrics

### Technical Metrics

| Metric               | Target             |
| -------------------- | ------------------ |
| Chat response time   | <3s (Convex action)|
| Experiment execution | <60s (10 personas) |
| Real-time updates    | <100ms (Convex)    |
| Page load time       | <1s (Next.js)      |

### User Metrics

| Metric                     | Target          |
| -------------------------- | --------------- |
| Time to first experiment   | <5 min          |
| Setup time (with template) | <2 min          |
| Template usage rate        | >70%            |

---

## What You Get After 8 Weeks

- Context upload (CSV, PDF) with auto-parsing
- Chat interface (Claude-powered via Convex actions)
- 5 core templates (Investors, Pricing, Roadmap, Hiring, Operations)
- Cloud execution (10+ personas in parallel via Daytona)
- Results visualization (Tremor charts)
- Real-time updates (Convex subscriptions)
- Insight extraction (AI-powered)
- Export & sharing (Markdown)

**Fully functional MVP ready to ship!**

---

## Getting Started (Week 1 Day 1)

### Setup Checklist

- [ ] Next.js + Tremor working (already done!)
- [ ] Convex project created and linked
- [ ] Convex auth configured (GitHub provider)
- [ ] Get Anthropic API key (set in Convex environment)
- [ ] Sign up for Daytona: https://www.daytona.io

### Day 1 Tasks

```bash
# 1. Set up Convex auth
npx @convex-dev/auth
npx convex env set ANTHROPIC_API_KEY sk-...

# 2. Deploy schema
npx convex deploy

# 3. Start with context upload
# See Phase 1 Day 3-5 above
```

---

## Questions?

- Architecture unclear? -> Read `architecture-decision.md`
- Templates unclear? -> Read `template-system-spec.md`
- Data models unclear? -> Read `data-models-spec.md`
- Week-by-week breakdown? -> Read `vertical-slice-implementation.md`

**Start with Phase 1 Day 1: Convex Auth + File Upload**
