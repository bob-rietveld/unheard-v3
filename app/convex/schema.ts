import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    tokenIdentifier: v.string(),
    preferences: v.optional(
      v.object({
        theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
        defaultPersonaCount: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["tokenIdentifier"]),

  integrations: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    displayName: v.string(),
    apiKey: v.string(),
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error")
    ),
    lastSyncedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"]),

  crmRecords: defineTable({
    userId: v.id("users"),
    integrationId: v.id("integrations"),
    externalId: v.string(),
    recordType: v.union(v.literal("company"), v.literal("person")),
    name: v.string(),
    email: v.optional(v.string()),
    rawData: v.any(),
    enrichmentStatus: v.union(
      v.literal("none"),
      v.literal("pending"),
      v.literal("enriched"),
      v.literal("failed")
    ),
    enrichedAt: v.optional(v.number()),
    enrichedData: v.optional(v.any()),
    listMemberships: v.optional(
      v.array(
        v.object({
          listId: v.string(),
          listName: v.string(),
          entryId: v.string(),
        })
      )
    ),
    lastSyncedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_integration", ["integrationId"])
    .index("by_user_type", ["userId", "recordType"])
    .index("by_external_id", ["integrationId", "externalId"])
    .index("by_enrichment_status", ["userId", "enrichmentStatus"]),

  segments: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    recordType: v.union(
      v.literal("company"),
      v.literal("person"),
      v.literal("mixed")
    ),
    memberCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  segmentMembers: defineTable({
    segmentId: v.id("segments"),
    crmRecordId: v.id("crmRecords"),
    addedAt: v.number(),
  })
    .index("by_segment", ["segmentId"])
    .index("by_record", ["crmRecordId"])
    .index("by_segment_record", ["segmentId", "crmRecordId"]),

  enrichmentJobs: defineTable({
    userId: v.id("users"),
    crmRecordId: v.id("crmRecords"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    urls: v.array(v.string()),
    firecrawlJobId: v.optional(v.string()),
    statusMessage: v.optional(v.string()),
    pollCount: v.optional(v.number()),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_record", ["crmRecordId"])
    .index("by_status", ["status"]),
});
