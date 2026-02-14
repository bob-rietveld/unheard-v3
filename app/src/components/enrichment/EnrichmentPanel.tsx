"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { RiSparklingLine } from "@remixicon/react";

interface EnrichmentPanelProps {
  crmRecordId: Id<"crmRecords">;
  status: "none" | "pending" | "enriched" | "failed";
}

export function EnrichmentPanel({ crmRecordId, status }: EnrichmentPanelProps) {
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const enrichRecord = useAction(api.enrichment.enrichRecord);

  // Subscribe to the latest job for this record to get live status
  const job = useQuery(api.enrichment.getJobForRecord, { crmRecordId });
  const isRunning = job?.status === "running" || job?.status === "pending";
  const statusMessage = job?.statusMessage;

  const handleEnrich = async () => {
    setEnriching(true);
    setError(null);
    setMessage(null);
    try {
      const result = await enrichRecord({ crmRecordId });
      if (result.success) {
        setMessage(result.message ?? "Enrichment started");
      } else {
        setError(result.message ?? "Enrichment failed");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnriching(false);
    }
  };

  if (status === "pending" || isRunning || enriching) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-300 border-t-yellow-600" />
          Enriching profile...
        </div>
        {statusMessage && (
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
            {statusMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleEnrich}
        disabled={enriching}
        className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
      >
        <RiSparklingLine className="h-4 w-4" />
        {status === "enriched" ? "Re-enrich" : status === "failed" ? "Retry Enrichment" : "Enrich Profile"}
      </button>
      {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {status === "failed" && job?.error && !error && (
        <p className="mt-2 text-sm text-red-500">{job.error}</p>
      )}
    </div>
  );
}
