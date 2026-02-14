"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { ConnectCrmDialog } from "@/components/integrations/ConnectCrmDialog";
import { useState } from "react";

const AVAILABLE_PROVIDERS = [
  {
    id: "attio",
    name: "Attio",
    description: "Modern CRM for relationship-driven teams",
    icon: "A",
  },
];

export default function IntegrationsPage() {
  const integrations = useQuery(api.integrations.list);
  const [connectProvider, setConnectProvider] = useState<string | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Integrations
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Connect your CRM to sync contacts and companies
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {AVAILABLE_PROVIDERS.map((provider) => {
          const existing = integrations?.find(
            (i) => i.provider === provider.id
          );
          return (
            <IntegrationCard
              key={provider.id}
              provider={provider}
              integration={existing}
              onConnect={() => setConnectProvider(provider.id)}
            />
          );
        })}
      </div>

      {connectProvider && (
        <ConnectCrmDialog
          provider={connectProvider}
          open={true}
          onClose={() => setConnectProvider(null)}
        />
      )}
    </div>
  );
}
