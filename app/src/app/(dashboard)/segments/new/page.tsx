"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { SegmentBuilder } from "@/components/segments/SegmentBuilder";
import Link from "next/link";
import { RiArrowLeftLine } from "@remixicon/react";
import { cx, focusInput } from "@/lib/utils";

export default function NewSegmentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [recordType, setRecordType] = useState<"company" | "person" | "mixed">(
    "person"
  );
  const [selectedIds, setSelectedIds] = useState<Id<"crmRecords">[]>([]);
  const [creating, setCreating] = useState(false);

  const createSegment = useMutation(api.segments.create);
  const addMembers = useMutation(api.segments.addMembers);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const segmentId = await createSegment({
        name: name.trim(),
        description: description.trim() || undefined,
        recordType,
      });
      if (selectedIds.length > 0) {
        await addMembers({ segmentId, crmRecordIds: selectedIds });
      }
      router.push(`/segments/${segmentId}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <Link
        href="/segments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <RiArrowLeftLine className="h-4 w-4" />
        Back to Segments
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        New Segment
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Create a group of contacts or companies for persona generation
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Investors, Prospects, Power Users"
            className={cx(
              "mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white",
              ...focusInput
            )}
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description (optional)
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this segment"
            className={cx(
              "mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white",
              ...focusInput
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Type
          </label>
          <div className="mt-1 flex gap-2">
            {(["person", "company", "mixed"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setRecordType(type)}
                className={cx(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  recordType === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                )}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Records
          </label>
          <div className="mt-2">
            <SegmentBuilder
              recordType={recordType}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/segments"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </Link>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Segment"}
          </button>
        </div>
      </div>
    </div>
  );
}
