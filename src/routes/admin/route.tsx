import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, Users, FileQuestion, Settings, LogOut, Menu } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context, location }) => {
    // TanStack router context check is tricky with React Context directly in beforeLoad
    // We will do a client-side check in the component as well, but this is a good place
    // if we had global state. For now, rely on component-level redirect.
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Client-side protection
  if (!isAuthenticated) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  const navItems = [
    { name: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { name: "Data Konsultasi", to: "/admin/konsultasi", icon: Users },
    { name: "Kelola Pertanyaan", to: "/admin/pertanyaan", icon: FileQuestion },
    { name: "Pengaturan", to: "/admin/pengaturan", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-muted/40 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center border-b border-border px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
              E
            </div>
            <span className="text-lg font-bold">Admin Panel</span>
          </div>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-brand/10 text-brand font-medium" }}
              inactiveProps={{ className: "text-muted-foreground hover:bg-muted hover:text-foreground" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6 lg:justify-end">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">Admin EduKonsul</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
