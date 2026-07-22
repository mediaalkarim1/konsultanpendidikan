import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { 
  LayoutGrid, 
  MessageSquareText, 
  Database, 
  Workflow, 
  ListCheck, 
  Sparkles, 
  Settings, 
  LogOut, 
  Menu 
} from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {},
  component: AdminLayout,
});

const menuItems = [
  { name: "Dashboard", to: "/admin", icon: LayoutGrid },
  { name: "Data Konsultasi", to: "/admin/konsultasi", icon: MessageSquareText },
  { name: "Database Orang Tua", to: "/admin/database-orangtua", icon: Database },
  { name: "Alur Sistem & Integrasi", to: "/admin/alur-sistem", icon: Workflow },
  { name: "Kelola Pertanyaan", to: "/admin/pertanyaan", icon: ListCheck },
  { name: "Prompt AI", to: "/admin/prompt", icon: Sparkles },
  { name: "Pengaturan", to: "/admin/pengaturan", icon: Settings },
];

function AdminLayout() {
  const { isAuthenticated, isLoaded, logout, userEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      navigate({ to: "/login", replace: true });
    }
  }, [isLoaded, isAuthenticated, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0f284b] border-t-transparent mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Memuat Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-20 shrink-0 items-center border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#09353e] text-emerald-400 shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-[#0f294a] block leading-snug">Admin Panel</span>
              <span className="text-xs text-slate-500 font-medium">Konsultan Pendidikan</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 space-y-2.5 p-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isExactMatch = item.to === "/admin" 
              ? location.pathname === "/admin" || location.pathname === "/admin/"
              : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.name}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                activeOptions={{ exact: item.to === "/admin" }}
                className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${
                  isExactMatch
                    ? "bg-[#0f284b] text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-5 w-5 ${isExactMatch ? "text-white" : "text-slate-500"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:justify-end">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700">{userEmail || "Admin EduKonsul"}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1.5 text-sm text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
