"use client";

import { cx } from "@/lib/utils";

interface EnrichmentBadgeProps {
  status: "none" | "pending" | "enriched" | "failed";
}

export function EnrichmentBadge({ status }: EnrichmentBadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        status === "none" && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
        status === "pending" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        status === "enriched" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        status === "failed" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}
    >
      {status === "none" && "Not enriched"}
      {status === "pending" && "Enriching..."}
      {status === "enriched" && "Enriched"}
      {status === "failed" && "Failed"}
    </span>
  );
}
