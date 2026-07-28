import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";

export default function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-black text-foreground antialiased font-sans flex">
      {/* Sidebar - fixed width 64 */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="pl-64 flex flex-col flex-1 min-h-screen">
        {/* Top Header */}
        <Header />

        {/* Dynamic page content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
