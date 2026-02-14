import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getCrmProvider } from "./lib/providers";
import { Id } from "./_generated/dataModel";
import { CrmList } from "./lib/crmTypes";

// Max records per mutation to stay under Convex 16MB read limit
const MUTATION_BATCH_SIZE = 25;

export const fetchAvailableLists = action({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args): Promise<CrmList[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const integration = await ctx.runQuery(
      internal.integrations.getWithKey,
      { integrationId: args.integrationId }
    );
    if (!integration || integration.status !== "connected") {
      throw new Error("Integration not connected");
    }

    const user = await ctx.runQuery(internal.users.getByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user || integration.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const provider = getCrmProvider(integration.provider);
    return await provider.fetchLists(integration.apiKey);
  },
});

export const syncList = action({
  args: {
    integrationId: v.id("integrations"),
    listId: v.string(),
    listName: v.string(),
    listApiSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const integration = await ctx.runQuery(
      internal.integrations.getWithKey,
      { integrationId: args.integrationId }
    );
    if (!integration || integration.status !== "connected") {
      throw new Error("Integration not connected");
    }

    const user = await ctx.runQuery(internal.users.getByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user || integration.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const provider = getCrmProvider(integration.provider);
    let totalSynced = 0;

    try {
      // Fetch all entries from the list
      const allEntries: Array<{
        entryId: string;
        recordId: string;
        recordType: "company" | "person";
      }> = [];
      let entryOffset = 0;
      let entryHasMore = true;
      while (entryHasMore) {
        const entryResult = await provider.fetchListEntries(
          integration.apiKey,
          args.listApiSlug ?? args.listId,
          entryOffset
        );
        allEntries.push(...entryResult.entries);
        entryHasMore = entryResult.hasMore;
        entryOffset = entryResult.nextOffset;
      }

      // Fetch each record by ID and upsert in batches
      for (let i = 0; i < allEntries.length; i += MUTATION_BATCH_SIZE) {
        const batch = allEntries.slice(i, i + MUTATION_BATCH_SIZE);
        const records: Array<{
          externalId: string;
          recordType: "company" | "person";
          name: string;
          email: string | undefined;
          rawData: Record<string, unknown>;
        }> = [];

        for (const entry of batch) {
          const record = await provider.fetchRecordById(
            integration.apiKey,
            entry.recordType,
            entry.recordId
          );
          if (record) {
            records.push({
              externalId: record.externalId,
              recordType: entry.recordType,
              name: record.name,
              email: record.email,
              rawData: record.rawData,
            });
          }
        }

        if (records.length > 0) {
          await ctx.runMutation(internal.sync.upsertRecords, {
            userId: user._id,
            integrationId: args.integrationId,
            records,
          });
          totalSynced += records.length;
        }

        // Update list memberships for this batch
        await ctx.runMutation(internal.sync.updateListMemberships, {
          integrationId: args.integrationId,
          listId: args.listId,
          listName: args.listName,
          entries: batch,
        });
      }

      await ctx.runMutation(internal.sync.updateSyncStatus, {
        integrationId: args.integrationId,
        lastSyncedAt: Date.now(),
      });

      return { success: true, totalSynced };
    } catch (e) {
      await ctx.runMutation(internal.sync.updateSyncError, {
        integrationId: args.integrationId,
        error: (e as Error).message,
      });
      return { success: false, error: (e as Error).message };
    }
  },
});

export const syncAll = action({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const integration = await ctx.runQuery(
      internal.integrations.getWithKey,
      { integrationId: args.integrationId }
    );
    if (!integration || integration.status !== "connected") {
      throw new Error("Integration not connected");
    }

    const user = await ctx.runQuery(internal.users.getByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user || integration.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const provider = getCrmProvider(integration.provider);
    let totalSynced = 0;

    try {
      // Sync companies
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const result = await provider.fetchCompanies(integration.apiKey, offset);
        if (result.records.length > 0) {
          const mapped = result.records.map((r) => ({
            externalId: r.externalId,
            recordType: "company" as const,
            name: r.name,
            email: undefined,
            rawData: r.rawData,
          }));
          // Batch into smaller chunks to stay under Convex byte limits
          for (let i = 0; i < mapped.length; i += MUTATION_BATCH_SIZE) {
            await ctx.runMutation(internal.sync.upsertRecords, {
              userId: user._id,
              integrationId: args.integrationId,
              records: mapped.slice(i, i + MUTATION_BATCH_SIZE),
            });
          }
          totalSynced += result.records.length;
        }
        hasMore = result.hasMore;
        offset = result.nextOffset;
      }

      // Sync people
      offset = 0;
      hasMore = true;
      while (hasMore) {
        const result = await provider.fetchPeople(integration.apiKey, offset);
        if (result.records.length > 0) {
          const mapped = result.records.map((r) => ({
            externalId: r.externalId,
            recordType: "person" as const,
            name: r.name,
            email: r.email,
            rawData: r.rawData,
          }));
          for (let i = 0; i < mapped.length; i += MUTATION_BATCH_SIZE) {
            await ctx.runMutation(internal.sync.upsertRecords, {
              userId: user._id,
              integrationId: args.integrationId,
              records: mapped.slice(i, i + MUTATION_BATCH_SIZE),
            });
          }
          totalSynced += result.records.length;
        }
        hasMore = result.hasMore;
        offset = result.nextOffset;
      }

      // Sync lists and update list memberships
      const lists = await provider.fetchLists(integration.apiKey);
      for (const list of lists) {
        let entryOffset = 0;
        let entryHasMore = true;
        while (entryHasMore) {
          const entryResult = await provider.fetchListEntries(
            integration.apiKey,
            list.apiSlug ?? list.id,
            entryOffset
          );
          if (entryResult.entries.length > 0) {
            // Batch list membership updates
            for (let i = 0; i < entryResult.entries.length; i += MUTATION_BATCH_SIZE) {
              await ctx.runMutation(internal.sync.updateListMemberships, {
                integrationId: args.integrationId,
                listId: list.id,
                listName: list.name,
                entries: entryResult.entries.slice(i, i + MUTATION_BATCH_SIZE),
              });
            }
          }
          entryHasMore = entryResult.hasMore;
          entryOffset = entryResult.nextOffset;
        }
      }

      // Update last synced timestamp
      await ctx.runMutation(internal.sync.updateSyncStatus, {
        integrationId: args.integrationId,
        lastSyncedAt: Date.now(),
      });

      return { success: true, totalSynced };
    } catch (e) {
      await ctx.runMutation(internal.sync.updateSyncError, {
        integrationId: args.integrationId,
        error: (e as Error).message,
      });
      return { success: false, error: (e as Error).message };
    }
  },
});

export const upsertRecords = internalMutation({
  args: {
    userId: v.id("users"),
    integrationId: v.id("integrations"),
    records: v.array(
      v.object({
        externalId: v.string(),
        recordType: v.union(v.literal("company"), v.literal("person")),
        name: v.string(),
        email: v.optional(v.string()),
        rawData: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const record of args.records) {
      const existing = await ctx.db
        .query("crmRecords")
        .withIndex("by_external_id", (q) =>
          q
            .eq("integrationId", args.integrationId)
            .eq("externalId", record.externalId)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: record.name,
          email: record.email,
          rawData: record.rawData,
          lastSyncedAt: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("crmRecords", {
          userId: args.userId,
          integrationId: args.integrationId,
          externalId: record.externalId,
          recordType: record.recordType,
          name: record.name,
          email: record.email,
          rawData: record.rawData,
          enrichmentStatus: "none",
          lastSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

export const updateListMemberships = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    listId: v.string(),
    listName: v.string(),
    entries: v.array(
      v.object({
        entryId: v.string(),
        recordId: v.string(),
        recordType: v.union(v.literal("company"), v.literal("person")),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const entry of args.entries) {
      const record = await ctx.db
        .query("crmRecords")
        .withIndex("by_external_id", (q) =>
          q
            .eq("integrationId", args.integrationId)
            .eq("externalId", entry.recordId)
        )
        .unique();

      if (record) {
        const memberships = record.listMemberships ?? [];
        const alreadyHas = memberships.some(
          (m) => m.listId === args.listId && m.entryId === entry.entryId
        );
        if (!alreadyHas) {
          await ctx.db.patch(record._id, {
            listMemberships: [
              ...memberships,
              {
                listId: args.listId,
                listName: args.listName,
                entryId: entry.entryId,
              },
            ],
            updatedAt: Date.now(),
          });
        }
      }
    }
  },
});

export const updateSyncStatus = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.integrationId, {
      lastSyncedAt: args.lastSyncedAt,
      lastError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const updateSyncError = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.integrationId, {
      status: "error",
      lastError: args.error,
      updatedAt: Date.now(),
    });
  },
});
