"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/stores", label: "Stores", icon: "🏪" },
  { href: "/admin/products", label: "Products", icon: "📦" },
  { href: "/admin/credentials", label: "Credentials", icon: "🔑" },
  { href: "/admin/orders", label: "Orders", icon: "🧾" },
  { href: "/admin/accounts", label: "Accounts", icon: "👤" },
];

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 border-r border-border flex flex-col min-h-screen bg-card">
      <div className="p-5 border-b border-border">
        <p className="font-bold text-base">Hongjoo Admin</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{email}</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <span>🚪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
