"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cx } from "@/lib/utils";
import {
  RiHome4Line,
  RiContactsBook2Line,
  RiGroupLine,
  RiSettings3Line,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
} from "@remixicon/react";

const navItems = [
  { href: "/", label: "Home", icon: RiHome4Line },
  { href: "/crm", label: "CRM", icon: RiContactsBook2Line },
  { href: "/segments", label: "Segments", icon: RiGroupLine },
  { href: "/settings/integrations", label: "Settings", icon: RiSettings3Line },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const user = useQuery(api.users.current, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (isAuthenticated) {
      storeUser();
    }
  }, [isAuthenticated, storeUser]);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* Sidebar */}
      <aside
        className={cx(
          "flex flex-col border-r border-gray-200 bg-gray-50 transition-all duration-200 dark:border-gray-800 dark:bg-gray-900",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-gray-200 px-4 dark:border-gray-800">
          {!collapsed && (
            <Link href="/" className="text-lg font-semibold text-gray-900 dark:text-white">
              Unheard
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cx(
              "rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300",
              collapsed ? "mx-auto" : "ml-auto"
            )}
          >
            {collapsed ? (
              <RiMenuUnfoldLine className="h-4 w-4" />
            ) : (
              <RiMenuFoldLine className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <UserButton />
            {!collapsed && user && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {user.name ?? "User"}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
