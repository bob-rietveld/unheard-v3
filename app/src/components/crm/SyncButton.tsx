"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { RiRefreshLine } from "@remixicon/react";
import { cx } from "@/lib/utils";

interface SyncButtonProps {
  integrationId: Id<"integrations">;
}

export function SyncButton({ integrationId }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const syncAll = useAction(api.sync.syncAll);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await syncAll({ integrationId });
      if (res.success) {
        setResult({
          success: true,
          message: `Synced ${res.totalSynced} records`,
        });
      } else {
        setResult({ success: false, message: res.error ?? "Sync failed" });
      }
    } catch (e) {
      setResult({ success: false, message: (e as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span
          className={cx(
            "text-sm",
            result.success ? "text-green-600" : "text-red-500"
          )}
        >
          {result.message}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <RiRefreshLine
          className={cx("h-4 w-4", syncing && "animate-spin")}
        />
        {syncing ? "Syncing..." : "Sync"}
      </button>
    </div>
  );
}
