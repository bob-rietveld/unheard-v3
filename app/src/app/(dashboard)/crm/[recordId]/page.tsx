"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { CrmRecordDetail } from "@/components/crm/CrmRecordDetail";
import Link from "next/link";
import { RiArrowLeftLine } from "@remixicon/react";

export default function CrmRecordPage() {
  const params = useParams();
  const recordId = params.recordId as Id<"crmRecords">;
  const record = useQuery(api.crmRecords.get, { recordId });

  if (record === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (record === null) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Record not found</p>
        <Link href="/crm" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700">
          Back to CRM
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/crm"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <RiArrowLeftLine className="h-4 w-4" />
        Back to CRM
      </Link>
      <CrmRecordDetail record={record} />
    </div>
  );
}
