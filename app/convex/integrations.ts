import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCrmProvider } from "./lib/providers";
import { internal } from "./_generated/api";

export const connect = action({
  args: {
    provider: v.string(),
    apiKey: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated. Please sign in and try again." };
    }

    const crmProvider = getCrmProvider(args.provider);
    const validation = await crmProvider.validateApiKey(args.apiKey);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const user = await ctx.runQuery(internal.users.getByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    await ctx.runMutation(internal.integrations.upsertIntegration, {
      userId: user._id,
      provider: args.provider,
      displayName:
        args.displayName ?? validation.workspaceName ?? `${args.provider} workspace`,
      apiKey: args.apiKey,
      workspaceName: validation.workspaceName,
    });

    return { success: true, workspaceName: validation.workspaceName };
  },
});

export const upsertIntegration = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
    displayName: v.string(),
    apiKey: v.string(),
    workspaceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        apiKey: args.apiKey,
        displayName: args.displayName,
        status: "connected" as const,
        lastError: undefined,
        metadata: args.workspaceName ? { workspaceName: args.workspaceName } : existing.metadata,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("integrations", {
      userId: args.userId,
      provider: args.provider,
      displayName: args.displayName,
      apiKey: args.apiKey,
      status: "connected",
      metadata: args.workspaceName ? { workspaceName: args.workspaceName } : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const disconnect = mutation({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const integration = await ctx.db.get(args.integrationId);
    if (!integration) throw new Error("Integration not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || integration.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.integrationId, {
      status: "disconnected",
      apiKey: "",
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

    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Strip apiKey from public query results
    return integrations.map(({ apiKey: _apiKey, ...rest }) => rest);
  },
});

export const get = query({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const integration = await ctx.db.get(args.integrationId);
    if (!integration) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || integration.userId !== user._id) return null;

    const { apiKey: _apiKey, ...rest } = integration;
    return rest;
  },
});

export const getWithKey = internalQuery({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.integrationId);
  },
});
