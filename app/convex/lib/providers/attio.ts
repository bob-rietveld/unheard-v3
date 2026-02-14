import {
  CrmProvider,
  NormalizedCompany,
  NormalizedPerson,
  CrmList,
  CrmListEntry,
} from "../crmTypes";

const ATTIO_BASE_URL = "https://api.attio.com/v2";
const PAGE_SIZE = 100;

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function extractValue(values: Record<string, unknown[]>, key: string): string | undefined {
  const arr = values[key] as Array<Record<string, unknown>> | undefined;
  if (!arr || arr.length === 0) return undefined;
  const first = arr[0];
  // Text fields
  if (typeof first.value === "string") return first.value;
  // Name fields (people have first_name, last_name, full_name)
  if (typeof first.full_name === "string") return first.full_name;
  // Domain fields
  if (typeof first.domain === "string") return first.domain;
  return undefined;
}

function extractEmail(values: Record<string, unknown[]>): string | undefined {
  const arr = values.email_addresses as Array<Record<string, unknown>> | undefined;
  if (!arr || arr.length === 0) return undefined;
  return arr[0].email_address as string | undefined;
}

function extractLinkedin(values: Record<string, unknown[]>): string | undefined {
  // Attio may store social links in various attribute names
  for (const key of ["linkedin", "linkedin_url", "social_links"]) {
    const arr = values[key] as Array<Record<string, unknown>> | undefined;
    if (arr && arr.length > 0) {
      const val = arr[0].value ?? arr[0].url ?? arr[0].original_url;
      if (typeof val === "string" && val.includes("linkedin")) return val;
    }
  }
  return undefined;
}

export class AttioProvider implements CrmProvider {
  async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    workspaceName?: string;
    error?: string;
  }> {
    try {
      const res = await fetch(`${ATTIO_BASE_URL}/self`, {
        headers: headers(apiKey),
      });
      if (res.status === 401 || res.status === 403) {
        return { valid: false, error: "Invalid API key" };
      }
      if (!res.ok) {
        return { valid: false, error: `Attio API error: ${res.status}` };
      }
      const data = await res.json();
      return {
        valid: true,
        workspaceName: data.data?.workspace?.name ?? "Attio Workspace",
      };
    } catch (e) {
      return { valid: false, error: `Connection failed: ${(e as Error).message}` };
    }
  }

  async fetchCompanies(
    apiKey: string,
    offset: number = 0
  ): Promise<{
    records: NormalizedCompany[];
    hasMore: boolean;
    nextOffset: number;
  }> {
    const res = await fetch(
      `${ATTIO_BASE_URL}/objects/companies/records/query`,
      {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify({
          limit: PAGE_SIZE,
          offset,
          sorts: [{ direction: "asc", attribute: "name" }],
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Attio API error fetching companies: ${res.status}`);
    }
    const json = await res.json();
    const records: NormalizedCompany[] = (json.data ?? []).map(
      (record: Record<string, unknown>) => {
        const values = (record.values ?? {}) as Record<string, unknown[]>;
        const id = record.id as Record<string, string>;
        return {
          externalId: id.record_id,
          name: extractValue(values, "name") ?? "Unknown Company",
          domain: extractValue(values, "domains"),
          description: extractValue(values, "description"),
          rawData: record,
        };
      }
    );
    return {
      records,
      hasMore: records.length >= PAGE_SIZE,
      nextOffset: offset + records.length,
    };
  }

  async fetchPeople(
    apiKey: string,
    offset: number = 0
  ): Promise<{
    records: NormalizedPerson[];
    hasMore: boolean;
    nextOffset: number;
  }> {
    const res = await fetch(
      `${ATTIO_BASE_URL}/objects/people/records/query`,
      {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify({
          limit: PAGE_SIZE,
          offset,
          sorts: [{ direction: "asc", attribute: "name" }],
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Attio API error fetching people: ${res.status}`);
    }
    const json = await res.json();
    const records: NormalizedPerson[] = (json.data ?? []).map(
      (record: Record<string, unknown>) => {
        const values = (record.values ?? {}) as Record<string, unknown[]>;
        const id = record.id as Record<string, string>;
        return {
          externalId: id.record_id,
          name: extractValue(values, "name") ?? "Unknown Person",
          email: extractEmail(values),
          title: extractValue(values, "job_title"),
          companyName: extractValue(values, "company"),
          linkedinUrl: extractLinkedin(values),
          rawData: record,
        };
      }
    );
    return {
      records,
      hasMore: records.length >= PAGE_SIZE,
      nextOffset: offset + records.length,
    };
  }

  async fetchLists(apiKey: string): Promise<CrmList[]> {
    const res = await fetch(`${ATTIO_BASE_URL}/lists`, {
      headers: headers(apiKey),
    });
    if (!res.ok) {
      throw new Error(`Attio API error fetching lists: ${res.status}`);
    }
    const json = await res.json();
    return (json.data ?? []).map(
      (list: Record<string, unknown>) => {
        const id = list.id as Record<string, string>;
        const parentObject = list.parent_object as string[] | undefined;
        return {
          id: id.list_id,
          name: list.name as string,
          apiSlug: list.api_slug as string | undefined,
          parentObject: parentObject?.[0],
        };
      }
    );
  }

  async fetchRecordById(
    apiKey: string,
    objectType: "company" | "person",
    recordId: string
  ): Promise<{
    externalId: string;
    name: string;
    email?: string;
    rawData: Record<string, unknown>;
  } | null> {
    const objectSlug = objectType === "company" ? "companies" : "people";
    const res = await fetch(
      `${ATTIO_BASE_URL}/objects/${objectSlug}/records/${recordId}`,
      { headers: headers(apiKey) }
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Attio API error fetching record: ${res.status}`);
    }
    const json = await res.json();
    const record = json.data as Record<string, unknown>;
    const values = (record.values ?? {}) as Record<string, unknown[]>;
    const id = record.id as Record<string, string>;
    return {
      externalId: id.record_id,
      name: extractValue(values, "name") ?? (objectType === "company" ? "Unknown Company" : "Unknown Person"),
      email: objectType === "person" ? extractEmail(values) : undefined,
      rawData: record,
    };
  }

  async fetchListEntries(
    apiKey: string,
    listId: string,
    offset: number = 0
  ): Promise<{
    entries: CrmListEntry[];
    hasMore: boolean;
    nextOffset: number;
  }> {
    const res = await fetch(
      `${ATTIO_BASE_URL}/lists/${listId}/entries/query`,
      {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify({
          limit: PAGE_SIZE,
          offset,
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Attio API error fetching list entries: ${res.status}`);
    }
    const json = await res.json();
    const entries: CrmListEntry[] = (json.data ?? []).map(
      (entry: Record<string, unknown>) => {
        const id = entry.id as Record<string, string>;
        const parentObject = (entry.parent_object ?? "person") as string;
        return {
          entryId: id.entry_id,
          recordId: entry.parent_record_id as string,
          recordType: parentObject === "companies" ? "company" as const : "person" as const,
        };
      }
    );
    return {
      entries,
      hasMore: entries.length >= PAGE_SIZE,
      nextOffset: offset + entries.length,
    };
  }
}
