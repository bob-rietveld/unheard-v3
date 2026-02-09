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
});
