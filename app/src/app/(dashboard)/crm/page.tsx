"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import * as Tabs from "@radix-ui/react-tabs";
import { cx } from "@/lib/utils";
import { CrmDataTable } from "@/components/crm/CrmDataTable";
import { CrmListBrowser } from "@/components/crm/CrmListBrowser";
import { SyncButton } from "@/components/crm/SyncButton";
import { RecordSelectionBar } from "@/components/crm/RecordSelectionBar";
import { Id } from "../../../../convex/_generated/dataModel";

export default function CrmPage() {
  const [selectedIds, setSelectedIds] = useState<Set<Id<"crmRecords">>>(
    new Set()
  );
  const integrations = useQuery(api.integrations.list);
  const connectedIntegration = integrations?.find(
    (i) => i.status === "connected"
  );

  const companies = useQuery(
    api.crmRecords.listByType,
    connectedIntegration ? { recordType: "company" } : "skip"
  );
  const people = useQuery(
    api.crmRecords.listByType,
    connectedIntegration ? { recordType: "person" } : "skip"
  );

  const toggleSelection = (id: Id<"crmRecords">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  if (!connectedIntegration) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          CRM
        </h1>
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-gray-500">No CRM connected yet.</p>
          <a
            href="/settings/integrations"
            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Connect your CRM
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            CRM
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and select contacts from {connectedIntegration.displayName}
          </p>
        </div>
        <SyncButton integrationId={connectedIntegration._id} />
      </div>

      <Tabs.Root defaultValue="companies" className="mt-6">
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-800">
          {[
            { value: "companies", label: "Companies", count: companies?.length },
            { value: "people", label: "People", count: people?.length },
            { value: "lists", label: "Lists" },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cx(
                "border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:text-gray-400 dark:hover:text-gray-300 dark:data-[state=active]:border-blue-400 dark:data-[state=active]:text-blue-400"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                  {tab.count}
                </span>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="companies" className="mt-4">
          <CrmDataTable
            records={companies ?? []}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
          />
        </Tabs.Content>

        <Tabs.Content value="people" className="mt-4">
          <CrmDataTable
            records={people ?? []}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
          />
        </Tabs.Content>

        <Tabs.Content value="lists" className="mt-4">
          <CrmListBrowser
            integrationId={connectedIntegration._id}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
          />
        </Tabs.Content>
      </Tabs.Root>

      {selectedIds.size > 0 && (
        <RecordSelectionBar
          selectedCount={selectedIds.size}
          selectedIds={Array.from(selectedIds)}
          onClear={clearSelection}
        />
      )}
    </div>
  );
}
