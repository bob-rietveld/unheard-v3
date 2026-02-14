import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal, components } from "./_generated/api";
import { Workpool } from "@convex-dev/workpool";

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v2";
const POLL_INTERVAL_MS = 60_000; // 1 minute between polls
const MAX_POLLS = 10; // 10 minutes max

const enrichmentPool = new Workpool(components.enrichmentPool, {
  maxParallelism: 3,
  retryActionsByDefault: true,
  defaultRetryBehavior: {
    maxAttempts: 2,
    initialBackoffMs: 10_000,
    base: 2,
  },
});

const PERSON_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string", description: "Professional headline or tagline" },
    currentRole: { type: "string", description: "Current job title" },
    company: { type: "string", description: "Current company name" },
    location: { type: "string", description: "City, Country" },
    summary: { type: "string", description: "Professional bio summary" },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Job title" },
          company: { type: "string", description: "Company name" },
          duration: { type: "string", description: "Time period" },
          description: { type: "string", description: "Role description" },
        },
      },
      description: "Work experience history",
    },
    education: { type: "array", items: { type: "string" }, description: "Education background" },
    skills: { type: "array", items: { type: "string" }, description: "Professional skills" },
    notableAchievements: { type: "array", items: { type: "string" }, description: "Awards, publications, notable work" },
    socialLinks: {
      type: "object",
      properties: {
        linkedin: { type: "string" },
        twitter: { type: "string" },
        github: { type: "string" },
        website: { type: "string" },
      },
      description: "Social media and web profiles",
    },
  },
};

const COMPANY_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string", description: "Company mission and what they do" },
    industry: { type: "string", description: "Primary industry classification" },
    headquarters: { type: "string", description: "City, State/Country" },
    yearFounded: { type: "string", description: "Year the company was founded" },
    teamSize: { type: "string", description: "Approximate employee count or range" },
    website: { type: "string", description: "Official website URL" },
    founders: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full name of founder" },
          role: { type: "string", description: "Current title/role" },
          background: { type: "string", description: "Brief bio or background" },
          linkedin: { type: "string", description: "LinkedIn profile URL" },
        },
      },
      description: "Company founders and co-founders",
    },
    leadership: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
        },
      },
      description: "Key leadership team members (CEO, CTO, etc.)",
    },
    funding: {
      type: "array",
      items: {
        type: "object",
        properties: {
          roundType: { type: "string", description: "Seed, Series A, B, etc." },
          amount: { type: "string", description: "Amount raised with currency" },
          date: { type: "string", description: "Date in YYYY-MM format" },
          investors: { type: "array", items: { type: "string" }, description: "Lead investors" },
        },
      },
      description: "Funding history",
    },
    totalFundingRaised: { type: "string", description: "Total funding raised with currency" },
    recentNews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          headline: { type: "string" },
          date: { type: "string" },
          source: { type: "string" },
          summary: { type: "string" },
        },
      },
      description: "Recent news articles and announcements",
    },
    products: { type: "array", items: { type: "string" }, description: "Key products or services" },
    keyMetrics: { type: "array", items: { type: "string" }, description: "Notable metrics (revenue, users, growth)" },
    competitors: { type: "array", items: { type: "string" }, description: "Main competitors" },
    techStack: { type: "array", items: { type: "string" }, description: "Known technologies used" },
  },
};

function buildAgentPrompt(
  recordType: "person" | "company",
  name: string,
  hints: { domain?: string; email?: string; linkedinUrl?: string; companyName?: string }
): string {
  if (recordType === "company") {
    const parts = [
      `Find comprehensive information about the company "${name}".`,
      `Include: founders and their backgrounds, complete funding history with amounts and investors, recent news and announcements, products/services, team size, key business metrics, competitors, and tech stack.`,
    ];
    if (hints.domain) parts.push(`Their website is ${hints.domain}.`);
    parts.push(`Use YYYY-MM format for dates and include currency in amounts.`);
    return parts.join(" ");
  }

  const parts = [
    `Find comprehensive professional information about "${name}".`,
    `Include: current role and company, work experience history, education, skills, notable achievements, and social profiles.`,
  ];
  if (hints.companyName) parts.push(`They work at ${hints.companyName}.`);
  if (hints.email) parts.push(`Their email is ${hints.email}.`);
  if (hints.linkedinUrl) parts.push(`Their LinkedIn is ${hints.linkedinUrl}.`);
  return parts.join(" ");
}

function extractHintsAndUrls(record: {
  recordType: string;
  email?: string;
  rawData: unknown;
}): {
  hints: { domain?: string; email?: string; linkedinUrl?: string; companyName?: string };
  urls: string[];
} {
  const rawData = record.rawData as Record<string, unknown>;
  const values = (rawData.values ?? rawData) as Record<string, unknown[]>;
  const hints: { domain?: string; email?: string; linkedinUrl?: string; companyName?: string } = {};
  const urls: string[] = [];

  if (record.recordType === "person") {
    const linkedinUrl = findLinkedinUrl(values);
    if (linkedinUrl) {
      hints.linkedinUrl = linkedinUrl;
      urls.push(linkedinUrl);
    }
    if (record.email) hints.email = record.email;
    hints.companyName = findCompanyName(values);
  } else {
    const domain = findDomain(values);
    if (domain) {
      hints.domain = domain;
      urls.push(domain.startsWith("http") ? domain : `https://${domain}`);
    }
  }

  return { hints, urls };
}

// Start the Firecrawl agent and return the job ID (non-blocking)
async function startFirecrawlAgent(
  firecrawlApiKey: string,
  prompt: string,
  schema: Record<string, unknown>,
  urls?: string[]
): Promise<{ firecrawlJobId?: string; immediateResult?: Record<string, unknown> }> {
  const res = await fetch(`${FIRECRAWL_BASE_URL}/agent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      schema,
      urls: urls?.length ? urls : undefined,
      model: "spark-1-mini",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Firecrawl agent error: ${res.status} - ${errorText}`);
  }

  const json = await res.json();

  // Some requests return data immediately
  if (json.success && json.data) {
    return { immediateResult: json.data };
  }

  if (!json.id) {
    throw new Error("Firecrawl agent did not return a job ID");
  }

  return { firecrawlJobId: json.id };
}

// Check the status of a Firecrawl agent job
async function checkFirecrawlStatus(
  firecrawlApiKey: string,
  firecrawlJobId: string
): Promise<{ status: "processing" | "completed" | "failed"; data?: Record<string, unknown> }> {
  const res = await fetch(`${FIRECRAWL_BASE_URL}/agent/${firecrawlJobId}`, {
    headers: {
      Authorization: `Bearer ${firecrawlApiKey}`,
    },
  });

  if (!res.ok) {
    return { status: "processing" };
  }

  const json = await res.json();
  if (json.status === "completed" && json.data) {
    return { status: "completed", data: json.data };
  }
  if (json.status === "failed") {
    return { status: "failed" };
  }
  return { status: "processing" };
}

// ─── Public actions ───

export const enrichRecord = action({
  args: { crmRecordId: v.id("crmRecords") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (!process.env.FIRECRAWL_API_KEY) throw new Error("Firecrawl API key not configured");

    const user = await ctx.runQuery(internal.users.getByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    const record = await ctx.runQuery(internal.enrichment.getRecordInternal, {
      crmRecordId: args.crmRecordId,
    });
    if (!record || record.userId !== user._id) throw new Error("Record not found");

    // Mark as pending
    await ctx.runMutation(internal.enrichment.updateRecordEnrichmentStatus, {
      crmRecordId: args.crmRecordId,
      status: "pending",
    });

    // Enqueue through the workpool (max 3 concurrent Firecrawl calls)
    await enrichmentPool.enqueueAction(
      ctx,
      internal.enrichment.enrichRecordInternal,
      { crmRecordId: args.crmRecordId, userId: user._id },
    );

    return { success: true, message: "Enrichment queued - results will appear shortly" };
  },
});

export const enrichSegment = action({
  args: { segmentId: v.id("segments") },
  handler: async (ctx, args): Promise<{ scheduled: number; skipped: number; failed: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (!process.env.FIRECRAWL_API_KEY) throw new Error("Firecrawl API key not configured");

    const user = await ctx.runQuery(internal.users.getByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    const members = await ctx.runQuery(internal.enrichment.getSegmentMembersInternal, {
      segmentId: args.segmentId,
      userId: user._id,
    });

    // Filter to only records that need enrichment
    const toEnrich = members.filter(
      (m) => m.enrichmentStatus === "none" || m.enrichmentStatus === "failed"
    );

    if (toEnrich.length > 0) {
      // Mark all as pending
      for (const member of toEnrich) {
        await ctx.runMutation(internal.enrichment.updateRecordEnrichmentStatus, {
          crmRecordId: member._id,
          status: "pending",
        });
      }

      // Enqueue all through the workpool as a batch (max 3 concurrent)
      await enrichmentPool.enqueueActionBatch(
        ctx,
        internal.enrichment.enrichRecordInternal,
        toEnrich.map((m) => ({ crmRecordId: m._id, userId: user._id })),
      );
    }

    return {
      scheduled: toEnrich.length,
      skipped: members.length - toEnrich.length,
      failed: 0,
    };
  },
});

// ─── Internal actions ───

export const enrichRecordInternal = internalAction({
  args: {
    crmRecordId: v.id("crmRecords"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) return;

    const record = await ctx.runQuery(internal.enrichment.getRecordInternal, {
      crmRecordId: args.crmRecordId,
    });
    if (!record || record.userId !== args.userId) return;

    const { hints, urls } = extractHintsAndUrls(record);
    const schema = record.recordType === "person" ? PERSON_EXTRACT_SCHEMA : COMPANY_EXTRACT_SCHEMA;
    const prompt = buildAgentPrompt(record.recordType, record.name, hints);

    const jobId = await ctx.runMutation(internal.enrichment.createJob, {
      userId: args.userId,
      crmRecordId: args.crmRecordId,
      urls: urls.length > 0 ? urls : [record.name],
    });

    await ctx.runMutation(internal.enrichment.updateRecordEnrichmentStatus, {
      crmRecordId: args.crmRecordId,
      status: "pending",
    });

    try {
      const agentResult = await startFirecrawlAgent(
        firecrawlApiKey,
        prompt,
        schema,
        urls.length > 0 ? urls : undefined
      );

      if (agentResult.immediateResult) {
        await ctx.runMutation(internal.enrichment.completeJob, {
          jobId,
          crmRecordId: args.crmRecordId,
          status: "completed",
          result: agentResult.immediateResult,
        });
        return;
      }

      await ctx.runMutation(internal.enrichment.updateJobWithFirecrawlId, {
        jobId,
        firecrawlJobId: agentResult.firecrawlJobId!,
        statusMessage: "Agent started - searching the web for data...",
      });

      await ctx.scheduler.runAfter(POLL_INTERVAL_MS, internal.enrichment.pollFirecrawlAgent, {
        jobId,
        crmRecordId: args.crmRecordId,
        firecrawlJobId: agentResult.firecrawlJobId!,
        pollCount: 1,
      });
    } catch (e) {
      await ctx.runMutation(internal.enrichment.completeJob, {
        jobId,
        crmRecordId: args.crmRecordId,
        status: "failed",
        error: (e as Error).message,
      });
    }
  },
});

export const pollFirecrawlAgent = internalAction({
  args: {
    jobId: v.id("enrichmentJobs"),
    crmRecordId: v.id("crmRecords"),
    firecrawlJobId: v.string(),
    pollCount: v.number(),
  },
  handler: async (ctx, args) => {
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) return;

    const result = await checkFirecrawlStatus(firecrawlApiKey, args.firecrawlJobId);

    if (result.status === "completed" && result.data) {
      await ctx.runMutation(internal.enrichment.completeJob, {
        jobId: args.jobId,
        crmRecordId: args.crmRecordId,
        status: "completed",
        result: result.data,
      });
      return;
    }

    if (result.status === "failed") {
      await ctx.runMutation(internal.enrichment.completeJob, {
        jobId: args.jobId,
        crmRecordId: args.crmRecordId,
        status: "failed",
        error: "Firecrawl agent failed to extract data",
      });
      return;
    }

    // Still processing
    if (args.pollCount >= MAX_POLLS) {
      await ctx.runMutation(internal.enrichment.completeJob, {
        jobId: args.jobId,
        crmRecordId: args.crmRecordId,
        status: "failed",
        error: "Enrichment timed out after 10 minutes",
      });
      return;
    }

    // Update status message and schedule next poll
    const minutesElapsed = args.pollCount;
    const minutesRemaining = MAX_POLLS - args.pollCount;
    await ctx.runMutation(internal.enrichment.updateJobProgress, {
      jobId: args.jobId,
      pollCount: args.pollCount,
      statusMessage: `Agent is researching... (${minutesElapsed} min elapsed, ${minutesRemaining} min remaining)`,
    });

    await ctx.scheduler.runAfter(POLL_INTERVAL_MS, internal.enrichment.pollFirecrawlAgent, {
      jobId: args.jobId,
      crmRecordId: args.crmRecordId,
      firecrawlJobId: args.firecrawlJobId,
      pollCount: args.pollCount + 1,
    });
  },
});

// ─── Internal queries ───

export const getRecordInternal = internalQuery({
  args: { crmRecordId: v.id("crmRecords") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.crmRecordId);
  },
});

export const getSegmentMembersInternal = internalQuery({
  args: {
    segmentId: v.id("segments"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const segment = await ctx.db.get(args.segmentId);
    if (!segment || segment.userId !== args.userId) return [];

    const members = await ctx.db
      .query("segmentMembers")
      .withIndex("by_segment", (q) => q.eq("segmentId", args.segmentId))
      .collect();

    const records = await Promise.all(
      members.map((m) => ctx.db.get(m.crmRecordId))
    );
    return records.filter(Boolean) as NonNullable<(typeof records)[number]>[];
  },
});

// ─── Internal mutations ───

export const createJob = internalMutation({
  args: {
    userId: v.id("users"),
    crmRecordId: v.id("crmRecords"),
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("enrichmentJobs", {
      userId: args.userId,
      crmRecordId: args.crmRecordId,
      status: "pending",
      urls: args.urls,
      createdAt: Date.now(),
    });
  },
});

export const updateJobWithFirecrawlId = internalMutation({
  args: {
    jobId: v.id("enrichmentJobs"),
    firecrawlJobId: v.string(),
    statusMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "running",
      firecrawlJobId: args.firecrawlJobId,
      statusMessage: args.statusMessage,
      pollCount: 0,
      startedAt: Date.now(),
    });
  },
});

export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("enrichmentJobs"),
    pollCount: v.number(),
    statusMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      pollCount: args.pollCount,
      statusMessage: args.statusMessage,
    });
  },
});

export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id("enrichmentJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.startedAt) updates.startedAt = args.startedAt;
    await ctx.db.patch(args.jobId, updates);
  },
});

export const completeJob = internalMutation({
  args: {
    jobId: v.id("enrichmentJobs"),
    crmRecordId: v.id("crmRecords"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      result: args.result,
      error: args.error,
      statusMessage: args.status === "completed" ? "Enrichment complete" : args.error,
      completedAt: Date.now(),
    });

    const enrichmentStatus = args.status === "completed" ? "enriched" : "failed";
    const updates: Record<string, unknown> = {
      enrichmentStatus,
      updatedAt: Date.now(),
    };
    if (args.status === "completed" && args.result) {
      updates.enrichedData = args.result;
      updates.enrichedAt = Date.now();
    }
    await ctx.db.patch(args.crmRecordId, updates);
  },
});

export const updateRecordEnrichmentStatus = internalMutation({
  args: {
    crmRecordId: v.id("crmRecords"),
    status: v.union(
      v.literal("none"),
      v.literal("pending"),
      v.literal("enriched"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.crmRecordId, {
      enrichmentStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});

// ─── Public queries ───

export const getJob = query({
  args: { jobId: v.id("enrichmentJobs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const job = await ctx.db.get(args.jobId);
    if (!job) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || job.userId !== user._id) return null;

    return job;
  },
});

export const getJobForRecord = query({
  args: { crmRecordId: v.id("crmRecords") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    // Get the most recent job for this record
    const jobs = await ctx.db
      .query("enrichmentJobs")
      .withIndex("by_record", (q) => q.eq("crmRecordId", args.crmRecordId))
      .order("desc")
      .take(1);

    const job = jobs[0];
    if (!job || job.userId !== user._id) return null;
    return job;
  },
});

export const listJobs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("enrichmentJobs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// ─── Helpers ───

function findLinkedinUrl(values: Record<string, unknown[]>): string | undefined {
  for (const key of ["linkedin", "linkedin_url", "social_links"]) {
    const arr = values[key] as Array<Record<string, unknown>> | undefined;
    if (arr && arr.length > 0) {
      const val = (arr[0].value ?? arr[0].url ?? arr[0].original_url) as string | undefined;
      if (val && val.includes("linkedin")) return val;
    }
  }
  return undefined;
}

function findDomain(values: Record<string, unknown[]>): string | undefined {
  const domains = values.domains as Array<Record<string, unknown>> | undefined;
  if (domains && domains.length > 0) {
    return (domains[0].domain ?? domains[0].value) as string | undefined;
  }
  return undefined;
}

function findCompanyName(values: Record<string, unknown[]>): string | undefined {
  const company = values.company as Array<Record<string, unknown>> | undefined;
  if (company && company.length > 0) {
    return (company[0].value ?? company[0].name) as string | undefined;
  }
  return undefined;
}
