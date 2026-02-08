# Unheard V3 Data Models Specification

**Date**: 2026-02-08
**Version**: 3.0 (Next.js + Convex)
**Purpose**: Complete data model specifications for Convex backend

---

## 1. Overview

### Storage Strategy

All data lives in **Convex**:
- User authentication and profiles
- Context documents (metadata + file storage)
- Templates (official + user-created)
- Experiment configurations and results
- Persona definitions
- Conversations / chat history
- Decision logs

### Data Flow

```
User uploads CSV
  -> Next.js client sends to Convex mutation
  -> File stored in Convex storage
  -> Metadata parsed and indexed
  -> Available to agent via Convex queries

User starts chat
  -> Message sent via Convex mutation
  -> Convex action calls Claude API
  -> Response streamed back
  -> Template recommended
  -> Config wizard shown

User runs experiment
  -> Convex action calls Daytona API
  -> Daytona sandboxes generate personas + execute in parallel
  -> Results stream back via Convex mutations
  -> Real-time UI updates via useQuery subscriptions
```

---

## 2. Convex Schema

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // ==========================================
  // USERS & AUTH
  // ==========================================

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    tokenIdentifier: v.string(), // Convex auth identifier

    preferences: v.optional(
      v.object({
        theme: v.union(
          v.literal('light'),
          v.literal('dark'),
          v.literal('system')
        ),
        defaultPersonaCount: v.number(),
      })
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_token', ['tokenIdentifier']),

  // ==========================================
  // PROJECTS
  // ==========================================

  projects: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // ==========================================
  // CONTEXT DOCUMENTS
  // ==========================================

  contextDocuments: defineTable({
    userId: v.id('users'),
    projectId: v.id('projects'),

    filename: v.string(),
    fileType: v.union(
      v.literal('csv'),
      v.literal('pdf'),
      v.literal('xlsx'),
      v.literal('txt'),
      v.literal('md')
    ),
    contentType: v.union(
      v.literal('customer_data'),
      v.literal('investor_data'),
      v.literal('product_data'),
      v.literal('metrics'),
      v.literal('general')
    ),

    // Parsed schema (for CSV/Excel)
    schema: v.optional(
      v.array(
        v.object({
          columnName: v.string(),
          dataType: v.string(),
          sampleValues: v.array(v.string()),
        })
      )
    ),
    rowCount: v.optional(v.number()),

    // Convex file storage
    storageId: v.id('_storage'),

    // AI-generated summary
    summary: v.optional(v.string()),
    tags: v.array(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_project', ['projectId'])
    .index('by_content_type', ['contentType']),

  // ==========================================
  // TEMPLATES
  // ==========================================

  experimentTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    category: v.union(
      v.literal('investors'),
      v.literal('product'),
      v.literal('operations'),
      v.literal('hiring'),
      v.literal('custom')
    ),

    authorId: v.optional(v.id('users')),
    authorName: v.string(),
    isOfficial: v.boolean(),

    defaultPersonaCount: v.number(),
    defaultStimulus: v.string(),

    // Configuration flow (questions to ask user)
    configurationFlow: v.array(
      v.object({
        id: v.string(),
        question: v.string(),
        type: v.union(
          v.literal('text'),
          v.literal('number'),
          v.literal('select'),
          v.literal('textarea')
        ),
        required: v.boolean(),
        options: v.optional(v.array(v.string())),
        placeholder: v.optional(v.string()),
        defaultValue: v.optional(v.any()),
      })
    ),

    // Persona archetypes
    personaArchetypes: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        count: v.number(),
        description: v.string(),
        characteristics: v.array(v.string()),
      })
    ),

    // Analysis config
    analysisMetrics: v.optional(v.array(v.any())),
    visualizationConfig: v.optional(v.array(v.any())),

    // Usage stats
    usageCount: v.number(),

    // Version
    version: v.string(),
    parentTemplateId: v.optional(v.id('experimentTemplates')),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_category', ['category'])
    .index('by_official', ['isOfficial'])
    .index('by_usage', ['usageCount']),

  // ==========================================
  // DECISIONS
  // ==========================================

  decisions: defineTable({
    userId: v.id('users'),
    projectId: v.id('projects'),

    title: v.string(),
    status: v.union(
      v.literal('evaluating'),
      v.literal('decided'),
      v.literal('implemented')
    ),

    category: v.string(),
    templateId: v.optional(v.id('experimentTemplates')),

    context: v.optional(v.string()),
    config: v.optional(v.any()),

    decision: v.optional(
      v.object({
        chosen: v.string(),
        rationale: v.string(),
        nextSteps: v.array(v.string()),
      })
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_project', ['projectId']),

  // ==========================================
  // EXPERIMENTS
  // ==========================================

  experiments: defineTable({
    userId: v.id('users'),
    projectId: v.id('projects'),
    decisionId: v.optional(v.id('decisions')),

    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal('draft'),
      v.literal('generating_personas'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed')
    ),

    templateId: v.optional(v.id('experimentTemplates')),
    templateName: v.optional(v.string()),

    stimulus: v.string(),
    config: v.optional(v.any()),

    // Persona IDs used
    personaIds: v.array(v.id('personas')),
    contextDocIds: v.array(v.id('contextDocuments')),

    // Execution metadata
    totalPersonas: v.number(),
    completedPersonas: v.number(),
    executionTimeMs: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_project', ['projectId'])
    .index('by_status', ['status'])
    .index('by_decision', ['decisionId']),

  // ==========================================
  // PERSONAS
  // ==========================================

  personas: defineTable({
    userId: v.id('users'),
    experimentId: v.id('experiments'),

    name: v.string(),
    role: v.string(),
    company: v.optional(v.string()),
    archetypeId: v.string(),

    background: v.string(),
    beliefs: v.array(v.string()),
    preferences: v.array(v.string()),
    decisionMakingStyle: v.optional(v.string()),

    generatedFrom: v.optional(v.id('contextDocuments')),

    createdAt: v.number(),
  })
    .index('by_experiment', ['experimentId']),

  // ==========================================
  // EXPERIMENT RESULTS
  // ==========================================

  experimentResults: defineTable({
    experimentId: v.id('experiments'),
    personaId: v.id('personas'),

    personaName: v.string(),
    archetypeId: v.string(),
    response: v.string(),
    sentiment: v.number(), // -1 to 1
    sentimentLabel: v.union(
      v.literal('positive'),
      v.literal('neutral'),
      v.literal('negative')
    ),
    keyPoints: v.array(v.string()),

    timestamp: v.number(),
  })
    .index('by_experiment', ['experimentId'])
    .index('by_persona', ['personaId']),

  // ==========================================
  // INSIGHTS
  // ==========================================

  experimentInsights: defineTable({
    experimentId: v.id('experiments'),

    insights: v.array(
      v.object({
        insight: v.string(),
        confidence: v.number(),
        supportingEvidence: v.array(v.string()),
        actionableRecommendation: v.string(),
      })
    ),

    sentimentBreakdown: v.object({
      positive: v.number(),
      neutral: v.number(),
      negative: v.number(),
      average: v.number(),
    }),

    topConcerns: v.array(v.string()),
    topPositives: v.array(v.string()),

    createdAt: v.number(),
  })
    .index('by_experiment', ['experimentId']),

  // ==========================================
  // CONVERSATIONS
  // ==========================================

  conversations: defineTable({
    userId: v.id('users'),
    projectId: v.id('projects'),

    title: v.optional(v.string()),
    isActive: v.boolean(),

    relatedExperimentId: v.optional(v.id('experiments')),
    relatedDecisionId: v.optional(v.id('decisions')),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_project', ['projectId']),

  messages: defineTable({
    conversationId: v.id('conversations'),

    role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
    content: v.string(),

    // For assistant messages with actions
    suggestedTemplateId: v.optional(v.id('experimentTemplates')),
    suggestedExperimentId: v.optional(v.id('experiments')),

    createdAt: v.number(),
  })
    .index('by_conversation', ['conversationId']),
})
```

---

## 3. TypeScript Types

```typescript
// convex/_generated types are auto-generated from schema
// Additional app-level types:

export type SentimentLabel = 'positive' | 'neutral' | 'negative'
export type ExperimentStatus = 'draft' | 'generating_personas' | 'running' | 'completed' | 'failed'
export type DecisionStatus = 'evaluating' | 'decided' | 'implemented'
export type TemplateCategory = 'investors' | 'product' | 'operations' | 'hiring' | 'custom'
export type FileType = 'csv' | 'pdf' | 'xlsx' | 'txt' | 'md'
export type ContentType = 'customer_data' | 'investor_data' | 'product_data' | 'metrics' | 'general'

export interface ConfigurationStep {
  id: string
  question: string
  type: 'text' | 'number' | 'select' | 'textarea'
  required: boolean
  options?: string[]
  placeholder?: string
  defaultValue?: unknown
}

export interface PersonaArchetype {
  id: string
  name: string
  count: number
  description: string
  characteristics: string[]
}

export interface InsightEntry {
  insight: string
  confidence: number
  supportingEvidence: string[]
  actionableRecommendation: string
}

export interface SentimentBreakdown {
  positive: number
  neutral: number
  negative: number
  average: number
}
```

---

## 4. Key Query Patterns

```typescript
// Get user's projects
const projects = useQuery(api.projects.list)

// Get context docs for a project
const docs = useQuery(api.contextDocuments.listByProject, { projectId })

// Get experiment with real-time status updates
const experiment = useQuery(api.experiments.get, { experimentId })

// Get results as they stream in (real-time)
const results = useQuery(api.experimentResults.listByExperiment, { experimentId })

// Get insights once experiment completes
const insights = useQuery(api.experimentInsights.getByExperiment, { experimentId })

// Get chat messages for a conversation
const messages = useQuery(api.messages.listByConversation, { conversationId })
```

---

## 5. Relationships

```
User
  +-- Projects[]
       +-- ContextDocuments[]
       +-- Decisions[]
       |    +-- Experiments[]
       |         +-- Personas[]
       |         +-- ExperimentResults[]
       |         +-- ExperimentInsights
       +-- Conversations[]
            +-- Messages[]

ExperimentTemplate (global)
  +-- used by Experiments[]
  +-- forked into child Templates[]
```
