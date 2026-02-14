import { query } from "./_generated/server";
import { v } from "convex/values";

export const listByType = query({
  args: {
    recordType: v.union(v.literal("company"), v.literal("person")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("crmRecords")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", user._id).eq("recordType", args.recordType)
      )
      .take(args.limit ?? 100);
  },
});

export const get = query({
  args: { recordId: v.id("crmRecords") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const record = await ctx.db.get(args.recordId);
    if (!record) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || record.userId !== user._id) return null;

    return record;
  },
});

export const search = query({
  args: {
    searchTerm: v.string(),
    recordType: v.optional(
      v.union(v.literal("company"), v.literal("person"))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const lowerSearch = args.searchTerm.toLowerCase();

    let records;
    if (args.recordType) {
      records = await ctx.db
        .query("crmRecords")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", user._id).eq("recordType", args.recordType!)
        )
        .collect();
    } else {
      records = await ctx.db
        .query("crmRecords")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
    }

    return records
      .filter(
        (r) =>
          r.name.toLowerCase().includes(lowerSearch) ||
          (r.email && r.email.toLowerCase().includes(lowerSearch))
      )
      .slice(0, args.limit ?? 50);
  },
});

export const listByList = query({
  args: {
    listId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const allRecords = await ctx.db
      .query("crmRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return allRecords
      .filter((r) =>
        r.listMemberships?.some((m) => m.listId === args.listId)
      )
      .slice(0, args.limit ?? 100);
  },
});
