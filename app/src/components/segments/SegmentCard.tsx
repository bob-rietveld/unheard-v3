"use client";

import Link from "next/link";
import { Id } from "../../../convex/_generated/dataModel";
import { RiGroupLine, RiBuilding2Line, RiUserLine } from "@remixicon/react";

interface SegmentCardProps {
  segment: {
    _id: Id<"segments">;
    name: string;
    description?: string;
    recordType: "company" | "person" | "mixed";
    memberCount: number;
  };
}

export function SegmentCard({ segment }: SegmentCardProps) {
  const Icon =
    segment.recordType === "company"
      ? RiBuilding2Line
      : segment.recordType === "person"
        ? RiUserLine
        : RiGroupLine;

  return (
    <Link
      href={`/segments/${segment._id}`}
      className="block rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-gray-900 dark:text-white">
            {segment.name}
          </h3>
          {segment.description && (
            <p className="truncate text-sm text-gray-500">
              {segment.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {segment.recordType}
        </span>
        <span className="text-sm text-gray-500">
          {segment.memberCount} members
        </span>
      </div>
    </Link>
  );
}
