export interface NormalizedCompany {
  externalId: string;
  name: string;
  domain?: string;
  description?: string;
  rawData: Record<string, unknown>;
}

export interface NormalizedPerson {
  externalId: string;
  name: string;
  email?: string;
  title?: string;
  companyName?: string;
  linkedinUrl?: string;
  rawData: Record<string, unknown>;
}

export interface CrmList {
  id: string;
  name: string;
  apiSlug?: string;
  parentObject?: string;
  entryCount?: number;
}

export interface CrmListEntry {
  entryId: string;
  recordId: string;
  recordType: "company" | "person";
}

export interface CrmProvider {
  validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    workspaceName?: string;
    error?: string;
  }>;

  fetchCompanies(
    apiKey: string,
    offset?: number
  ): Promise<{
    records: NormalizedCompany[];
    hasMore: boolean;
    nextOffset: number;
  }>;

  fetchPeople(
    apiKey: string,
    offset?: number
  ): Promise<{
    records: NormalizedPerson[];
    hasMore: boolean;
    nextOffset: number;
  }>;

  fetchLists(apiKey: string): Promise<CrmList[]>;

  fetchListEntries(
    apiKey: string,
    listId: string,
    offset?: number
  ): Promise<{
    entries: CrmListEntry[];
    hasMore: boolean;
    nextOffset: number;
  }>;

  fetchRecordById(
    apiKey: string,
    objectType: "company" | "person",
    recordId: string
  ): Promise<{
    externalId: string;
    name: string;
    email?: string;
    rawData: Record<string, unknown>;
  } | null>;
}
