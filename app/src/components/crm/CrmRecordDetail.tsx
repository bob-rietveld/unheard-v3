"use client";

import { EnrichmentBadge } from "@/components/enrichment/EnrichmentBadge";
import { EnrichmentPanel } from "@/components/enrichment/EnrichmentPanel";
import { EnrichedProfile } from "@/components/enrichment/EnrichedProfile";
import { Id } from "../../../convex/_generated/dataModel";

interface CrmRecordDetailProps {
  record: {
    _id: Id<"crmRecords">;
    name: string;
    email?: string;
    recordType: "company" | "person";
    rawData: unknown;
    enrichmentStatus: "none" | "pending" | "enriched" | "failed";
    enrichedData?: unknown;
    listMemberships?: Array<{
      listId: string;
      listName: string;
      entryId: string;
    }>;
    lastSyncedAt: number;
  };
}

export function CrmRecordDetail({ record }: CrmRecordDetailProps) {
  const rawData = record.rawData as Record<string, unknown>;
  const values = (rawData.values ?? rawData) as Record<string, unknown[]>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {record.name}
            </h1>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {record.recordType}
            </span>
          </div>
          {record.email && (
            <p className="mt-1 text-sm text-gray-500">{record.email}</p>
          )}
        </div>
        <EnrichmentBadge status={record.enrichmentStatus} />
      </div>

      {/* List memberships */}
      {record.listMemberships && record.listMemberships.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Lists
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {record.listMemberships.map((m) => (
              <span
                key={m.entryId}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {m.listName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Enrichment */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Profile Enrichment
        </h2>
        <div className="mt-3">
          <EnrichmentPanel crmRecordId={record._id} status={record.enrichmentStatus} />
        </div>
        {record.enrichmentStatus === "enriched" && !!record.enrichedData && (
          <div className="mt-4">
            <EnrichedProfile
              data={record.enrichedData as Record<string, unknown>}
              recordType={record.recordType}
            />
          </div>
        )}
      </div>

      {/* Raw CRM data */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          CRM Data
        </h2>
        <div className="mt-3 space-y-2">
          {Object.entries(values).map(([key, val]) => {
            if (!Array.isArray(val) || val.length === 0) return null;
            const displayVal = extractDisplayValue(val);
            if (!displayVal) return null;
            return (
              <div key={key} className="flex gap-2 text-sm">
                <span className="min-w-[120px] font-medium text-gray-500">
                  {formatFieldName(key)}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {displayVal}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function extractDisplayValue(arr: unknown[]): string | null {
  if (!arr || arr.length === 0) return null;
  const first = arr[0] as Record<string, unknown>;
  if (typeof first.value === "string") return first.value;
  if (typeof first.full_name === "string") return first.full_name;
  if (typeof first.domain === "string") return first.domain;
  if (typeof first.email_address === "string") return first.email_address;
  return null;
}

function formatFieldName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
