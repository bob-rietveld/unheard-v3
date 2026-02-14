"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { SegmentMemberList } from "@/components/segments/SegmentMemberList";
import Link from "next/link";
import {
  RiArrowLeftLine,
  RiDeleteBinLine,
  RiSparklingLine,
  RiRefreshLine,
} from "@remixicon/react";
import { cx } from "@/lib/utils";

export default function SegmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const segmentId = params.segmentId as Id<"segments">;

  const segment = useQuery(api.segments.get, { segmentId });
  const members = useQuery(api.segments.getMembers, { segmentId });
  const removeSegment = useMutation(api.segments.remove);
  const enrichSegment = useAction(api.enrichment.enrichSegment);

  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleDelete = async () => {
    await removeSegment({ segmentId });
    router.push("/segments");
  };

  const handleEnrichAll = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const result = await enrichSegment({ segmentId });
      setEnrichResult({
        success: true,
        message: `${result.scheduled} scheduled, ${result.skipped} already enriched, ${result.failed} failed`,
      });
    } catch (e) {
      setEnrichResult({
        success: false,
        message: (e as Error).message,
      });
    } finally {
      setEnriching(false);
    }
  };

  if (segment === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (segment === null) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Segment not found</p>
        <Link
          href="/segments"
          className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          Back to Segments
        </Link>
      </div>
    );
  }

  const filteredMembers = (members ?? []).filter(
    (m): m is NonNullable<typeof m> => m !== null
  );

  const enrichedCount = filteredMembers.filter(
    (m) => m.enrichmentStatus === "enriched"
  ).length;
  const pendingCount = filteredMembers.filter(
    (m) => m.enrichmentStatus === "pending"
  ).length;
  const needsEnrichment = filteredMembers.filter(
    (m) => m.enrichmentStatus === "none" || m.enrichmentStatus === "failed"
  ).length;

  return (
    <div>
      <Link
        href="/segments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <RiArrowLeftLine className="h-4 w-4" />
        Back to Segments
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {segment.name}
          </h1>
          {segment.description && (
            <p className="mt-1 text-sm text-gray-500">{segment.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {segment.recordType}
            </span>
            <span className="text-sm text-gray-500">
              {segment.memberCount} members
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEnrichAll}
            disabled={enriching || needsEnrichment === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {enriching ? (
              <RiRefreshLine className="h-4 w-4 animate-spin" />
            ) : (
              <RiSparklingLine className="h-4 w-4" />
            )}
            {enriching ? "Enriching..." : "Enrich All"}
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            <RiDeleteBinLine className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {filteredMembers.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          {enrichedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {enrichedCount} enriched
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
              {pendingCount} in progress
            </span>
          )}
          {needsEnrichment > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
              {needsEnrichment} not enriched
            </span>
          )}
        </div>
      )}

      {enrichResult && (
        <p
          className={cx(
            "mt-3 text-sm",
            enrichResult.success ? "text-green-600" : "text-red-500"
          )}
        >
          {enrichResult.message}
        </p>
      )}

      <div className="mt-6">
        <SegmentMemberList segmentId={segmentId} members={filteredMembers} />
      </div>
    </div>
  );
}
