"use client";

import Link from "next/link";
import { cx } from "@/lib/utils";
import { Id } from "../../../convex/_generated/dataModel";
import { EnrichmentBadge } from "@/components/enrichment/EnrichmentBadge";

interface CrmRecord {
  _id: Id<"crmRecords">;
  name: string;
  email?: string;
  recordType: "company" | "person";
  enrichmentStatus: "none" | "pending" | "enriched" | "failed";
  lastSyncedAt: number;
}

interface CrmDataTableProps {
  records: CrmRecord[];
  selectedIds: Set<Id<"crmRecords">>;
  onToggleSelection: (id: Id<"crmRecords">) => void;
}

export function CrmDataTable({
  records,
  selectedIds,
  onToggleSelection,
}: CrmDataTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
        <p className="text-sm text-gray-500">
          No records found. Click Sync to fetch data from your CRM.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="w-10 px-3 py-3">
              <span className="sr-only">Select</span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {records[0]?.recordType === "company" ? "Domain" : "Email"}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Enrichment
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Synced
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
          {records.map((record) => (
            <tr
              key={record._id}
              className={cx(
                "transition-colors hover:bg-gray-50 dark:hover:bg-gray-900",
                selectedIds.has(record._id) && "bg-blue-50 dark:bg-blue-950/20"
              )}
            >
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(record._id)}
                  onChange={() => onToggleSelection(record._id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/crm/${record._id}`}
                  className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                >
                  {record.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {record.email ?? "-"}
              </td>
              <td className="px-4 py-3">
                <EnrichmentBadge status={record.enrichmentStatus} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">
                {new Date(record.lastSyncedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
