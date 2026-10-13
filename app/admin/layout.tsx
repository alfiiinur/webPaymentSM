import { getAdminSession } from "@/lib/auth";
import AdminSidebar from "./admin-sidebar";

export const metadata = { title: "Admin — Hongjoo Store" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Proxy already redirects unauthenticated users before reaching here.
  // We still read the session to pass the email to the sidebar.
  const session = await getAdminSession();

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar email={session?.email ?? ""} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
