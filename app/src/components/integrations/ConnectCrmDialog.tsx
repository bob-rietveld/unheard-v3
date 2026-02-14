"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import * as Dialog from "@radix-ui/react-dialog";
import { cx, focusInput } from "@/lib/utils";
import { RiCloseLine, RiEyeLine, RiEyeOffLine } from "@remixicon/react";

interface ConnectCrmDialogProps {
  provider: string;
  open: boolean;
  onClose: () => void;
}

export function ConnectCrmDialog({
  provider,
  open,
  onClose,
}: ConnectCrmDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connect = useAction(api.integrations.connect);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await connect({ provider, apiKey: apiKey.trim() });
      if (result.success) {
        setApiKey("");
        onClose();
      } else {
        setError(result.error ?? "Failed to connect");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-dialog-overlay-show" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-lg data-[state=open]:animate-dialog-content-show dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Connect {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-md p-1 text-gray-400 hover:text-gray-500">
                <RiCloseLine className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Enter your API key to connect. You can find this in your {provider}{" "}
            workspace settings under Developers.
          </p>

          <div className="mt-4">
            <label
              htmlFor="api-key"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              API Key
            </label>
            <div className="relative mt-1">
              <input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className={cx(
                  "block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white",
                  ...focusInput
                )}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
              >
                {showKey ? (
                  <RiEyeOffLine className="h-4 w-4" />
                ) : (
                  <RiEyeLine className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
