import { CrmProvider } from "../crmTypes";
import { AttioProvider } from "./attio";

const providers: Record<string, CrmProvider> = {
  attio: new AttioProvider(),
};

export function getCrmProvider(providerName: string): CrmProvider {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unknown CRM provider: ${providerName}`);
  }
  return provider;
}

export const SUPPORTED_PROVIDERS = Object.keys(providers);
