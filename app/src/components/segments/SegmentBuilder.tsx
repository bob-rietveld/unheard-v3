"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { cx } from "@/lib/utils";

interface SegmentBuilderProps {
  recordType: "company" | "person" | "mixed";
  selectedIds: Id<"crmRecords">[];
  onSelectionChange: (ids: Id<"crmRecords">[]) => void;
}

export function SegmentBuilder({
  recordType,
  selectedIds,
  onSelectionChange,
}: SegmentBuilderProps) {
  const companies = useQuery(api.crmRecords.listByType, {
    recordType: "company",
  });
  const people = useQuery(api.crmRecords.listByType, {
    recordType: "person",
  });

  const records =
    recordType === "company"
      ? companies ?? []
      : recordType === "person"
        ? people ?? []
        : [...(companies ?? []), ...(people ?? [])];

  const selectedSet = new Set(selectedIds);

  const toggle = (id: Id<"crmRecords">) => {
    if (selectedSet.has(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === records.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(records.map((r) => r._id));
    }
  };

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
        <p className="text-sm text-gray-500">
          No CRM records available. Sync your CRM first.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="sticky top-0 flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <input
          type="checkbox"
          checked={selectedIds.length === records.length && records.length > 0}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
        />
        <span className="text-xs font-medium text-gray-500">
          {selectedIds.length} of {records.length} selected
        </span>
      </div>
      {records.map((record) => (
        <div
          key={record._id}
          className={cx(
            "flex items-center gap-3 border-b border-gray-100 px-4 py-2.5 last:border-b-0 dark:border-gray-800/50",
            selectedSet.has(record._id) && "bg-blue-50 dark:bg-blue-950/20"
          )}
        >
          <input
            type="checkbox"
            checked={selectedSet.has(record._id)}
            onChange={() => toggle(record._id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {record.name}
            </p>
            {record.email && (
              <p className="truncate text-xs text-gray-500">{record.email}</p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
            {record.recordType}
          </span>
        </div>
      ))}
    </div>
  );
}
