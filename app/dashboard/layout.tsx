import { getUserSession } from "@/lib/auth";
import DashboardNav from "./dashboard-nav";

export const metadata = { title: "Dashboard — Hongjoo Store" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Proxy already redirects unauthenticated users before reaching here.
  // We still read the session to pass the email to the nav.
  const session = await getUserSession();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardNav email={session?.email ?? ""} />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8">{children}</div>
      </main>
    </div>
  );
}
