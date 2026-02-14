"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SegmentCard } from "@/components/segments/SegmentCard";
import { RiAddLine } from "@remixicon/react";

export default function SegmentsPage() {
  const segments = useQuery(api.segments.list);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Segments
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Group contacts and companies for persona generation
          </p>
        </div>
        <Link
          href="/segments/new"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <RiAddLine className="h-4 w-4" />
          New Segment
        </Link>
      </div>

      {segments === undefined ? (
        <div className="mt-8 flex justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : segments.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-gray-500">No segments yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Create a segment to group CRM contacts for persona generation.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <SegmentCard key={segment._id} segment={segment} />
          ))}
        </div>
      )}
    </div>
  );
}
