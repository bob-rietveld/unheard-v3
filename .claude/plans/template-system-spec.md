# Template System Specification (V3)

**Date**: 2026-02-08
**Version**: 3.0 (Next.js + Convex + Tremor)

---

## Overview

The template system is the **core innovation** of Unheard. It solves the fundamental problem: **founders don't know what parameters to configure**.

**Instead of**: "Configure 50 parameters for your experiment"
**We provide**: "I'm testing investor interest" -> Template selected -> 2-5 questions -> Done

---

## Template Structure

```typescript
// Stored in Convex experimentTemplates table

interface Template {
  name: string
  description: string
  icon: string // emoji
  category: 'investors' | 'product' | 'operations' | 'hiring' | 'custom'

  isOfficial: boolean
  defaultPersonaCount: number
  defaultStimulus: string

  // Questions to ask the user
  configurationFlow: ConfigurationStep[]

  // Persona archetypes to generate
  personaArchetypes: PersonaArchetype[]

  // How to analyze results
  analysisMetrics: AnalysisMetric[]
  visualizationConfig: VisualizationConfig[]
}
```

---

## 5 Core Templates

### 1. Investor Evaluation

**Icon**: `$`
**Category**: investors
**Personas**: 10 (3 seed VCs, 3 angels, 2 series A VCs, 2 corporate VCs)

**Configuration Flow**:
1. Funding stage (pre-seed / seed / series-a)
2. Funding target ($)
3. Industry
4. Current MRR ($)
5. Pitch summary (2-3 sentences)

**Output**: Investment interest rate, breakdown by investor type, top concerns, key questions

### 2. Pricing Strategy

**Icon**: `%`
**Category**: product
**Personas**: 15 customers (from context data or standard archetypes)

**Configuration Flow**:
1. Product description
2. Target customer type (SMB / mid-market / enterprise)
3. Pricing options to test (2-4 options)
4. Current pricing (if exists)

**Output**: Willingness to pay, price sensitivity (Van Westendorp), preferred model

### 3. Product Roadmap

**Icon**: `#`
**Category**: product
**Personas**: 20 customers

**Configuration Flow**:
1. Product overview
2. Features to evaluate (3-10 features)
3. Current roadmap context
4. Customer segment

**Output**: Feature priority ranking, expected adoption, must-have vs nice-to-have

### 4. Hiring Decision

**Icon**: `@`
**Category**: hiring
**Personas**: 8 stakeholders

**Configuration Flow**:
1. Role description
2. Candidate background (optional)
3. Team context
4. Company stage

**Output**: Hire/no-hire sentiment, concerns, questions to ask, onboarding recs

### 5. Operations Decision

**Icon**: `*`
**Category**: operations
**Personas**: 10 team members

**Configuration Flow**:
1. Decision description
2. Options to evaluate (2-5)
3. Team size and structure
4. Budget constraints

**Output**: Preferred option by role, implementation concerns, ROI analysis

---

## UI Components (Tremor)

### Template Selector

Uses Tremor Card + Grid:

```tsx
import { Card } from '@/components/Card'

function TemplateSelector({ onSelect }) {
  const templates = useQuery(api.templates.listOfficial)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates?.map(template => (
        <Card
          key={template._id}
          className="cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => onSelect(template)}
        >
          <div className="text-3xl mb-2">{template.icon}</div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-50">
            {template.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {template.description}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {template.defaultPersonaCount} personas
          </p>
        </Card>
      ))}
    </div>
  )
}
```

### Configuration Wizard

Sequential question flow rendered in the chat area:

```tsx
function ConfigWizard({ template, onComplete }) {
  const [config, setConfig] = useState({})
  const [step, setStep] = useState(0)

  const current = template.configurationFlow[step]
  const isLast = step === template.configurationFlow.length - 1

  const handleAnswer = (value) => {
    const updated = { ...config, [current.id]: value }
    setConfig(updated)

    if (isLast) {
      onComplete(updated)
    } else {
      setStep(step + 1)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Step {step + 1} of {template.configurationFlow.length}
      </p>
      <p className="font-medium">{current.question}</p>
      <ConfigInput step={current} onSubmit={handleAnswer} />
    </div>
  )
}
```

### Results Dashboard (Tremor Charts)

```tsx
import { BarChart } from '@/components/BarChart'
import { DonutChart } from '@/components/DonutChart'

function ResultsDashboard({ experimentId }) {
  const results = useQuery(api.experimentResults.listByExperiment, { experimentId })
  const insights = useQuery(api.experimentInsights.getByExperiment, { experimentId })

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard title="Interest Rate" value="70%" change="+15%" />
        <KpiCard title="Avg Sentiment" value="0.65" change="+0.2" />
        <KpiCard title="Responses" value="10/10" />
      </div>

      {/* Sentiment by archetype */}
      <Card>
        <h3>Interest by Investor Type</h3>
        <BarChart
          data={groupByArchetype(results)}
          index="archetype"
          categories={['positive', 'neutral', 'negative']}
          colors={['emerald', 'amber', 'pink']}
        />
      </Card>

      {/* Sentiment breakdown */}
      <Card>
        <h3>Overall Sentiment</h3>
        <DonutChart
          data={sentimentPieData(insights)}
          index="label"
          category="count"
          colors={['emerald', 'amber', 'pink']}
        />
      </Card>
    </div>
  )
}
```

---

## Template Lifecycle

1. **Discovery** - Agent recommends template based on chat conversation
2. **Configuration** - User answers 2-5 questions via wizard
3. **Execution** - Experiment created from template config
4. **Analysis** - Results analyzed per template's analysis config
5. **Follow-up** - Agent suggests next steps based on template's follow-up rules

---

## Seed Data (Convex)

```typescript
// convex/seed_templates.ts

export const seedOfficialTemplates = mutation({
  handler: async (ctx) => {
    const templates = [
      {
        name: 'Investor Evaluation',
        description: 'Test investor interest across VCs, angels, and corporate investors',
        icon: '$',
        category: 'investors' as const,
        isOfficial: true,
        defaultPersonaCount: 10,
        defaultStimulus: '...', // Full stimulus template
        configurationFlow: [
          { id: 'stage', question: 'What funding stage?', type: 'select', required: true, options: ['pre-seed', 'seed', 'series-a'] },
          { id: 'target', question: 'Funding target ($)?', type: 'number', required: true },
          { id: 'industry', question: 'Your industry?', type: 'text', required: true },
          { id: 'mrr', question: 'Current MRR ($)?', type: 'number', required: false },
          { id: 'pitch', question: 'Pitch summary (2-3 sentences)', type: 'textarea', required: true },
        ],
        personaArchetypes: [
          { id: 'seed_vc', name: 'Seed VC Partner', count: 3, description: 'Partner at seed-stage fund', characteristics: ['Invests in 10-15 companies/year', 'Looks for 100x potential'] },
          { id: 'angel', name: 'Angel Investor', count: 3, description: 'Successful founder turned angel', characteristics: ['Writes $25K-$100K checks', 'Hands-on mentorship'] },
          { id: 'series_a_vc', name: 'Series A VC', count: 2, description: 'Principal at growth fund', characteristics: ['Needs $1M+ ARR', 'Focus on unit economics'] },
          { id: 'corporate_vc', name: 'Corporate VC', count: 2, description: 'Corporate venture arm', characteristics: ['Strategic fit critical', 'Slower process'] },
        ],
        usageCount: 0,
        version: '1.0.0',
        authorName: 'Unheard',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      // ... pricing, roadmap, hiring, operations templates
    ]

    for (const t of templates) {
      await ctx.db.insert('experimentTemplates', t)
    }
  },
})
```
