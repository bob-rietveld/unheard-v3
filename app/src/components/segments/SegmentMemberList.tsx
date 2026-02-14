"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { EnrichmentBadge } from "@/components/enrichment/EnrichmentBadge";
import { RiCloseLine } from "@remixicon/react";

interface SegmentMemberListProps {
  segmentId: Id<"segments">;
  members: Array<{
    _id: Id<"crmRecords">;
    name: string;
    email?: string;
    recordType: "company" | "person";
    enrichmentStatus: "none" | "pending" | "enriched" | "failed";
  }>;
}

export function SegmentMemberList({
  segmentId,
  members,
}: SegmentMemberListProps) {
  const removeMembers = useMutation(api.segments.removeMembers);

  const handleRemove = async (crmRecordId: Id<"crmRecords">) => {
    await removeMembers({ segmentId, crmRecordIds: [crmRecordId] });
  };

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
        <p className="text-sm text-gray-500">
          No members yet. Add records from the CRM browser.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Enrichment
            </th>
            <th className="w-10 px-4 py-3">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
          {members.map((member) => (
            <tr
              key={member._id}
              className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/crm/${member._id}`}
                  className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                >
                  {member.name}
                </Link>
                {member.email && (
                  <p className="text-xs text-gray-500">{member.email}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {member.recordType}
                </span>
              </td>
              <td className="px-4 py-3">
                <EnrichmentBadge status={member.enrichmentStatus} />
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleRemove(member._id)}
                  className="rounded-md p-1 text-gray-400 hover:text-red-500"
                  title="Remove from segment"
                >
                  <RiCloseLine className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
