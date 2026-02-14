"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CrmDataTable } from "./CrmDataTable";
import { RiRefreshLine, RiDownloadLine, RiGroupLine } from "@remixicon/react";
import { cx } from "@/lib/utils";

interface CrmListBrowserProps {
  integrationId: Id<"integrations">;
  selectedIds: Set<Id<"crmRecords">>;
  onToggleSelection: (id: Id<"crmRecords">) => void;
}

interface CrmList {
  id: string;
  name: string;
  apiSlug?: string;
  parentObject?: string;
  entryCount?: number;
}

export function CrmListBrowser({
  integrationId,
  selectedIds,
  onToggleSelection,
}: CrmListBrowserProps) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [lists, setLists] = useState<CrmList[] | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [syncingListId, setSyncingListId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    listId: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [creatingSegmentListId, setCreatingSegmentListId] = useState<string | null>(null);
  const [segmentResult, setSegmentResult] = useState<{
    listId: string;
    success: boolean;
    message: string;
  } | null>(null);

  const fetchLists = useAction(api.sync.fetchAvailableLists);
  const syncList = useAction(api.sync.syncList);
  const createSegmentFromList = useMutation(api.segments.createFromList);

  // Get synced records for selected list from Convex
  const listRecords = useQuery(
    api.crmRecords.listByList,
    selectedListId ? { listId: selectedListId } : "skip"
  );

  const handleFetchLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const result = await fetchLists({ integrationId });
      setLists(result);
    } catch (e) {
      console.error("Failed to fetch lists:", e);
    } finally {
      setLoadingLists(false);
    }
  }, [fetchLists, integrationId]);

  // Auto-fetch lists on mount so they're always visible
  const hasFetched = useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      handleFetchLists();
    }
  }, [handleFetchLists]);

  const handleSyncList = async (list: CrmList) => {
    setSyncingListId(list.id);
    setSyncResult(null);
    try {
      const result = await syncList({
        integrationId,
        listId: list.id,
        listName: list.name,
        listApiSlug: list.apiSlug,
      });
      if (result.success) {
        setSyncResult({
          listId: list.id,
          success: true,
          message: `Synced ${result.totalSynced} records`,
        });
        // Auto-select the synced list to show its records
        setSelectedListId(list.id);
      } else {
        setSyncResult({
          listId: list.id,
          success: false,
          message: result.error ?? "Sync failed",
        });
      }
    } catch (e) {
      setSyncResult({
        listId: list.id,
        success: false,
        message: (e as Error).message,
      });
    } finally {
      setSyncingListId(null);
    }
  };

  const handleCreateSegment = async (list: CrmList) => {
    setCreatingSegmentListId(list.id);
    setSegmentResult(null);
    try {
      // Sync the list first to ensure records exist
      setSegmentResult({
        listId: list.id,
        success: true,
        message: "Syncing list...",
      });
      const syncRes = await syncList({
        integrationId,
        listId: list.id,
        listName: list.name,
        listApiSlug: list.apiSlug,
      });
      if (!syncRes.success) {
        setSegmentResult({
          listId: list.id,
          success: false,
          message: syncRes.error ?? "Sync failed",
        });
        return;
      }

      // Now create the segment from synced records
      setSegmentResult({
        listId: list.id,
        success: true,
        message: "Creating segment...",
      });
      const result = await createSegmentFromList({
        listId: list.id,
        listName: list.name,
      });
      setSegmentResult({
        listId: list.id,
        success: true,
        message: `Segment created with ${result.memberCount} members`,
      });
    } catch (e) {
      setSegmentResult({
        listId: list.id,
        success: false,
        message: (e as Error).message,
      });
    } finally {
      setCreatingSegmentListId(null);
    }
  };

  // Loading state
  if (lists === null) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
        <RiRefreshLine className="h-5 w-5 animate-spin text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading lists from CRM...</p>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
        <p className="text-sm text-gray-500">
          No lists found in your CRM.
        </p>
        <button
          onClick={handleFetchLists}
          disabled={loadingLists}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {lists.length} list{lists.length !== 1 ? "s" : ""} available
        </p>
        <button
          onClick={handleFetchLists}
          disabled={loadingLists}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <RiRefreshLine
            className={cx("h-4 w-4 inline mr-1", loadingLists && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => {
          const isSyncing = syncingListId === list.id;
          const isCreatingSegment = creatingSegmentListId === list.id;
          const result =
            syncResult?.listId === list.id ? syncResult : null;
          const segResult =
            segmentResult?.listId === list.id ? segmentResult : null;
          const isSelected = selectedListId === list.id;

          return (
            <div
              key={list.id}
              className={cx(
                "rounded-lg border p-4 transition-colors cursor-pointer",
                isSelected
                  ? "border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
              )}
              onClick={() =>
                setSelectedListId(isSelected ? null : list.id)
              }
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {list.name}
                  </h3>
                  {list.parentObject && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {list.parentObject}
                    </p>
                  )}
                </div>
                <div className="ml-2 flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSyncList(list);
                    }}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    title="Sync this list"
                  >
                    {isSyncing ? (
                      <RiRefreshLine className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RiDownloadLine className="h-3.5 w-3.5" />
                    )}
                    {isSyncing ? "Syncing" : "Sync"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateSegment(list);
                    }}
                    disabled={isCreatingSegment}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                    title="Create segment from this list"
                  >
                    {isCreatingSegment ? (
                      <RiRefreshLine className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RiGroupLine className="h-3.5 w-3.5" />
                    )}
                    Segment
                  </button>
                </div>
              </div>
              {result && (
                <p
                  className={cx(
                    "text-xs mt-2",
                    result.success ? "text-green-600" : "text-red-500"
                  )}
                >
                  {result.message}
                </p>
              )}
              {segResult && (
                <p
                  className={cx(
                    "text-xs mt-2",
                    segResult.success ? "text-green-600" : "text-red-500"
                  )}
                >
                  {segResult.message}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {selectedListId && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Records in list
          </h3>
          {listRecords === undefined ? (
            <p className="text-sm text-gray-500">Loading records...</p>
          ) : listRecords.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
              <p className="text-sm text-gray-500">
                No synced records for this list yet. Click &ldquo;Sync&rdquo; to import.
              </p>
            </div>
          ) : (
            <CrmDataTable
              records={listRecords}
              selectedIds={selectedIds}
              onToggleSelection={onToggleSelection}
            />
          )}
        </div>
      )}
    </div>
  );
}
