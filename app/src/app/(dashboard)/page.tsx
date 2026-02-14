"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function HomePage() {
  const user = useQuery(api.users.current);
  const integrations = useQuery(api.integrations.list);
  const segments = useQuery(api.segments.list);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Welcome{user?.name ? `, ${user.name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        AI-powered decision support for founders
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500">Integrations</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {integrations?.filter((i) => i.status === "connected").length ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-400">connected</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500">Segments</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {segments?.length ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-400">created</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500">Personas</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            0
          </p>
          <p className="mt-1 text-xs text-gray-400">coming soon</p>
        </div>
      </div>
    </div>
  );
}
