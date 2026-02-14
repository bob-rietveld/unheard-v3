"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cx } from "@/lib/utils";
import { Id } from "../../../convex/_generated/dataModel";

interface IntegrationCardProps {
  provider: {
    id: string;
    name: string;
    description: string;
    icon: string;
  };
  integration?: {
    _id: Id<"integrations">;
    provider: string;
    displayName: string;
    status: "connected" | "disconnected" | "error";
    lastSyncedAt?: number;
    lastError?: string;
  };
  onConnect: () => void;
}

export function IntegrationCard({
  provider,
  integration,
  onConnect,
}: IntegrationCardProps) {
  const disconnect = useMutation(api.integrations.disconnect);
  const isConnected = integration?.status === "connected";
  const hasError = integration?.status === "error";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-lg font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            {provider.icon}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {provider.name}
            </h3>
            <p className="text-sm text-gray-500">{provider.description}</p>
          </div>
        </div>
        <span
          className={cx(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            isConnected && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            hasError && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            !integration && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
            integration?.status === "disconnected" && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          )}
        >
          {isConnected ? "Connected" : hasError ? "Error" : "Not connected"}
        </span>
      </div>

      {integration?.lastSyncedAt && (
        <p className="mt-3 text-xs text-gray-400">
          Last synced: {new Date(integration.lastSyncedAt).toLocaleString()}
        </p>
      )}

      {hasError && integration.lastError && (
        <p className="mt-2 text-xs text-red-500">{integration.lastError}</p>
      )}

      <div className="mt-4 flex gap-2">
        {isConnected ? (
          <button
            onClick={() => disconnect({ integrationId: integration._id })}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}
