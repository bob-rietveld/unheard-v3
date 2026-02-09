"use client";

import { UserButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const user = useQuery(api.users.current, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (isAuthenticated) {
      storeUser();
    }
  }, [isAuthenticated, storeUser]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="absolute right-4 top-4">
        <UserButton />
      </div>
      <h1 className="text-3xl font-bold">Unheard</h1>
      {user && (
        <p className="text-gray-500">
          Welcome, {user.name ?? user.email}
        </p>
      )}
    </div>
  );
}
