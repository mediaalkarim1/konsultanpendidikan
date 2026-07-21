import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { 
  LayoutDashboard, 
  Users, 
  FileQuestion, 
  Settings, 
  LogOut, 
  Menu, 
  Sparkles, 
  Beaker, 
  History,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Activity,
  Zap,
  UserCheck,
  Clock,
  GitBranch,
  Bot,
  MessageCircle,
  Terminal,
  CheckCircle,
  FolderTree,
  LayoutTemplate,
  ShieldCheck,
  BarChart2,
  FileSearch,
  FileCode,
  FileSpreadsheet,
  Archive,
  Key,
  Lock,
  Sliders,
  Building,
  Plug,
  Database,
  RotateCcw,
  ScrollText,
  Shield
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {},
  component: AdminLayout,
});

type MenuItem = {
  name: string;
  to?: string;
  icon: any;
  isUpcoming?: boolean;
};

type MenuGroup = {
  category: string;
  icon: any;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    category: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { name: "Ringkasan Dashboard", to: "/admin", icon: LayoutDashboard },
      { name: "Statistik Sistem", to: "/admin", icon: TrendingUp },
      { name: "Aktivitas Terbaru", to: "/admin/log-aktivitas", icon: Activity },
      { name: "Quick Action", to: "/admin", icon: Zap },
    ]
  },
  {
    category: "Konsultasi",
    icon: Users,
    items: [
      { name: "Data Konsultasi", to: "/admin/konsultasi", icon: Users },
      { name: "Database Orang Tua", isUpcoming: true, icon: UserCheck },
      { name: "Hasil Analisis AI", to: "/admin/konsultasi", icon: Sparkles },
      { name: "Riwayat Konsultasi", to: "/admin/konsultasi", icon: Clock },
    ]
  },
  {
    category: "AI & Otomasi",
    icon: Bot,
    items: [
      { name: "Alur Sistem (Pipeline)", to: "/admin/pengaturan", icon: GitBranch },
      { name: "Google Gemini AI", to: "/admin/pengaturan", icon: Bot },
      { name: "Integrasi WhatsApp", to: "/admin/pengaturan", icon: MessageCircle },
      { name: "Prompt AI", to: "/admin/prompt", icon: Terminal },
      { name: "Simulasi & Uji Coba", to: "/admin/testing", icon: Beaker },
      { name: "Log Aktivitas AI", to: "/admin/log-aktivitas", icon: History },
      { name: "Status Integrasi", to: "/admin/testing", icon: CheckCircle },
    ]
  },
  {
    category: "Formulir",
    icon: FileQuestion,
    items: [
      { name: "Kelola Pertanyaan", to: "/admin/pertanyaan", icon: FileQuestion },
      { name: "Kategori Pertanyaan", isUpcoming: true, icon: FolderTree },
      { name: "Template Formulir", isUpcoming: true, icon: LayoutTemplate },
      { name: "Validasi Input", isUpcoming: true, icon: ShieldCheck },
    ]
  },
  {
    category: "Laporan",
    icon: FileSpreadsheet,
    items: [
      { name: "Statistik Konsultasi", to: "/admin/konsultasi", icon: BarChart2 },
      { name: "Laporan Analisis AI", to: "/admin/konsultasi", icon: FileSearch },
      { name: "Export PDF", to: "/admin/konsultasi", icon: FileCode },
      { name: "Export Excel", to: "/admin/konsultasi", icon: FileSpreadsheet },
      { name: "Riwayat Export", isUpcoming: true, icon: Archive },
    ]
  },
  {
    category: "Manajemen",
    icon: UserCheck,
    items: [
      { name: "Data Admin", to: "/admin/pengaturan", icon: UserCheck },
      { name: "Hak Akses", isUpcoming: true, icon: Key },
      { name: "Role & Permission", isUpcoming: true, icon: Lock },
    ]
  },
  {
    category: "Pengaturan",
    icon: Settings,
    items: [
      { name: "Pengaturan Umum", to: "/admin/pengaturan", icon: Sliders },
      { name: "Profil Sekolah", to: "/admin/pengaturan", icon: Building },
      { name: "API & Integrasi", to: "/admin/pengaturan", icon: Plug },
      { name: "Backup Database", isUpcoming: true, icon: Database },
      { name: "Restore Database", isUpcoming: true, icon: RotateCcw },
      { name: "Log Sistem", to: "/admin/log-aktivitas", icon: ScrollText },
      { name: "Keamanan", isUpcoming: true, icon: Shield },
    ]
  }
];

function AdminLayout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track expanded menu categories
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    Dashboard: true,
    Konsultasi: true,
    "AI & Otomasi": true,
    Formulir: true,
    Laporan: false,
    Manajemen: false,
    Pengaturan: true,
  });

  if (!isAuthenticated) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleUpcomingClick = (name: string) => {
    toast.info(`Fitur "${name}" (Segera Hadir) sedang dalam tahap pengembangan.`);
    setSidebarOpen(false);
  };

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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 shrink-0 items-center border-b border-border px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground shadow-sm">
              E
            </div>
            <div>
              <span className="text-base font-bold text-foreground block leading-none">EduKonsul</span>
              <span className="text-[10px] text-muted-foreground font-medium">Dashboard Admin</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-4 overflow-y-auto p-4 text-sm scrollbar-thin">
          {menuGroups.map((group) => {
            const isOpen = !!openCategories[group.category];
            const GroupIcon = group.icon;

            return (
              <div key={group.category} className="space-y-1">
                {/* Category Header (Expandable) */}
                <button
                  type="button"
                  onClick={() => toggleCategory(group.category)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="h-3.5 w-3.5 text-brand" />
                    <span>{group.category}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  )}
                </button>

                {/* Submenu Items */}
                {isOpen && (
                  <div className="ml-2 border-l border-border/60 pl-2 space-y-0.5">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;

                      if (item.isUpcoming) {
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => handleUpcomingClick(item.name)}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          >
                            <div className="flex items-center gap-2">
                              <ItemIcon className="h-3.5 w-3.5 opacity-70" />
                              <span>{item.name}</span>
                            </div>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                              Segera
                            </span>
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={item.name}
                          to={item.to!}
                          activeProps={{ className: "bg-brand/10 text-brand font-semibold" }}
                          inactiveProps={{ className: "text-muted-foreground hover:bg-muted hover:text-foreground font-medium" }}
                          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <ItemIcon className="h-3.5 w-3.5" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6 lg:justify-end">
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
