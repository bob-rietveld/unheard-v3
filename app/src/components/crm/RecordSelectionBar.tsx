"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { RiCloseLine, RiAddLine, RiSparklingLine } from "@remixicon/react";

interface RecordSelectionBarProps {
  selectedCount: number;
  selectedIds: Id<"crmRecords">[];
  onClear: () => void;
}

export function RecordSelectionBar({
  selectedCount,
  selectedIds,
  onClear,
}: RecordSelectionBarProps) {
  const [showSegmentPicker, setShowSegmentPicker] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const segments = useQuery(api.segments.list);
  const addMembers = useMutation(api.segments.addMembers);
  const enrichRecord = useAction(api.enrichment.enrichRecord);

  const handleAddToSegment = async (segmentId: Id<"segments">) => {
    await addMembers({ segmentId, crmRecordIds: selectedIds });
    setShowSegmentPicker(false);
    onClear();
  };

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      for (const id of selectedIds) {
        await enrichRecord({ crmRecordId: id });
      }
    } finally {
      setEnriching(false);
      onClear();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedCount} selected
        </span>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="relative">
          <button
            onClick={() => setShowSegmentPicker(!showSegmentPicker)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RiAddLine className="h-4 w-4" />
            Add to Segment
          </button>

          {showSegmentPicker && (
            <div className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {segments && segments.length > 0 ? (
                segments.map((seg) => (
                  <button
                    key={seg._id}
                    onClick={() => handleAddToSegment(seg._id)}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {seg.name}
                    <span className="ml-2 text-xs text-gray-400">
                      ({seg.memberCount})
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No segments yet.{" "}
                  <a
                    href="/segments/new"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Create one
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleEnrich}
          disabled={enriching}
          className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          <RiSparklingLine className="h-4 w-4" />
          {enriching ? "Enriching..." : "Enrich"}
        </button>

        <button
          onClick={onClear}
          className="rounded-md p-1 text-gray-400 hover:text-gray-500"
        >
          <RiCloseLine className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
