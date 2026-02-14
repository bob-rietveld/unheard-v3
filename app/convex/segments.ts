import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    recordType: v.union(
      v.literal("company"),
      v.literal("person"),
      v.literal("mixed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("segments", {
      userId: user._id,
      name: args.name,
      description: args.description,
      recordType: args.recordType,
      memberCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("segments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const get = query({
  args: { segmentId: v.id("segments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const segment = await ctx.db.get(args.segmentId);
    if (!segment) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || segment.userId !== user._id) return null;

    return segment;
  },
});

export const update = mutation({
  args: {
    segmentId: v.id("segments"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const segment = await ctx.db.get(args.segmentId);
    if (!segment) throw new Error("Segment not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || segment.userId !== user._id) throw new Error("Not authorized");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.segmentId, updates);
  },
});

export const remove = mutation({
  args: { segmentId: v.id("segments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const segment = await ctx.db.get(args.segmentId);
    if (!segment) throw new Error("Segment not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || segment.userId !== user._id) throw new Error("Not authorized");

    // Delete all segment members
    const members = await ctx.db
      .query("segmentMembers")
      .withIndex("by_segment", (q) => q.eq("segmentId", args.segmentId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(args.segmentId);
  },
});

export const addMembers = mutation({
  args: {
    segmentId: v.id("segments"),
    crmRecordIds: v.array(v.id("crmRecords")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const segment = await ctx.db.get(args.segmentId);
    if (!segment) throw new Error("Segment not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || segment.userId !== user._id) throw new Error("Not authorized");

    let added = 0;
    for (const crmRecordId of args.crmRecordIds) {
      const existing = await ctx.db
        .query("segmentMembers")
        .withIndex("by_segment_record", (q) =>
          q.eq("segmentId", args.segmentId).eq("crmRecordId", crmRecordId)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("segmentMembers", {
          segmentId: args.segmentId,
          crmRecordId,
          addedAt: Date.now(),
        });
        added++;
      }
    }

    // Update denormalized count
    const allMembers = await ctx.db
      .query("segmentMembers")
      .withIndex("by_segment", (q) => q.eq("segmentId", args.segmentId))
      .collect();

    await ctx.db.patch(args.segmentId, {
      memberCount: allMembers.length,
      updatedAt: Date.now(),
    });

    return { added };
  },
});

export const removeMembers = mutation({
  args: {
    segmentId: v.id("segments"),
    crmRecordIds: v.array(v.id("crmRecords")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const segment = await ctx.db.get(args.segmentId);
    if (!segment) throw new Error("Segment not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || segment.userId !== user._id) throw new Error("Not authorized");

    for (const crmRecordId of args.crmRecordIds) {
      const member = await ctx.db
        .query("segmentMembers")
        .withIndex("by_segment_record", (q) =>
          q.eq("segmentId", args.segmentId).eq("crmRecordId", crmRecordId)
        )
        .unique();

      if (member) {
        await ctx.db.delete(member._id);
      }
    }

    // Update denormalized count
    const allMembers = await ctx.db
      .query("segmentMembers")
      .withIndex("by_segment", (q) => q.eq("segmentId", args.segmentId))
      .collect();

    await ctx.db.patch(args.segmentId, {
      memberCount: allMembers.length,
      updatedAt: Date.now(),
    });
  },
});

export const createFromList = mutation({
  args: {
    listId: v.string(),
    listName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    // Find all records belonging to this list
    const allRecords = await ctx.db
      .query("crmRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const listRecords = allRecords.filter((r) =>
      r.listMemberships?.some((m) => m.listId === args.listId)
    );

    if (listRecords.length === 0) {
      throw new Error("No synced records in this list. Sync the list first.");
    }

    // Determine record type
    const types = new Set(listRecords.map((r) => r.recordType));
    const recordType: "company" | "person" | "mixed" =
      types.size === 1 ? (types.values().next().value as "company" | "person") : "mixed";

    // Create segment
    const segmentId = await ctx.db.insert("segments", {
      userId: user._id,
      name: args.listName,
      recordType,
      memberCount: listRecords.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Add all records as members
    for (const record of listRecords) {
      await ctx.db.insert("segmentMembers", {
        segmentId,
        crmRecordId: record._id,
        addedAt: Date.now(),
      });
    }

    return { segmentId, memberCount: listRecords.length };
  },
});

export const getMembers = query({
  args: {
    segmentId: v.id("segments"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const segment = await ctx.db.get(args.segmentId);
    if (!segment) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || segment.userId !== user._id) return [];

    const members = await ctx.db
      .query("segmentMembers")
      .withIndex("by_segment", (q) => q.eq("segmentId", args.segmentId))
      .take(args.limit ?? 200);

    const records = await Promise.all(
      members.map((m) => ctx.db.get(m.crmRecordId))
    );

    return records.filter(Boolean);
  },
});
