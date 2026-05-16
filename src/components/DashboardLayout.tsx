import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
  LogOut, 
  Users, 
  Activity, 
  Camera, 
  LayoutTemplate, 
  Smile, 
  Image as ImageIcon,
  Building2,
  RefreshCw,
  Menu,
  X
} from "lucide-react";
import useAuthStore from "../store/useAuthStore";
import { useDashboardStore } from "../store/useDashboardStore";

export default function DashboardLayout() {
  const { logout, user } = useAuthStore();
  const { fetchData, subscribeToChanges, unsubscribeFromChanges, isLoading } = useDashboardStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user?.role) {
      fetchData(user.role, user.tenantId);
      subscribeToChanges(user.role, user.tenantId);
    }
    return () => unsubscribeFromChanges();
  }, [user, fetchData, subscribeToChanges, unsubscribeFromChanges]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  const isSuper = user.role === "superadmin";

  const navLinks = [
    { to: "/dashboard", icon: Activity, label: "Overview", exact: true },
    ...(isSuper ? [{ to: "/dashboard/tenants", icon: Building2, label: "Tenants" }] : []),
    { to: "/dashboard/users", icon: Users, label: "Users" },
    { to: "/dashboard/booths", icon: Camera, label: "Booths" },
    { to: "/dashboard/sessions", icon: ImageIcon, label: "Sessions" },
    { to: "/dashboard/captures", icon: ImageIcon, label: "Captured" },
    { to: "/dashboard/templates", icon: LayoutTemplate, label: "Templates" },
    { to: "/dashboard/stickers", icon: Smile, label: "Stickers" },
  ];

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="w-full h-screen bg-slate-50 text-slate-900 flex overflow-hidden font-sans md:border-8 border-slate-950">
      
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/50 z-40 md:hidden" 
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r-2 border-slate-950 bg-white flex flex-col p-6 justify-between flex-shrink-0 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="space-y-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                <Camera size={16} className="text-white" />
              </div>
              <span className="font-black text-xl tracking-tight uppercase">
                {isSuper ? "Superadmin" : "Dashboard"}
              </span>
            </div>
            <button className="md:hidden" onClick={closeMenu}>
              <X size={24} />
            </button>
          </div>
          
          <nav className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-4">Menu</div>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.exact 
                ? location.pathname === link.to 
                : location.pathname.startsWith(link.to);
              
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 font-bold p-2 rounded border-2 transition-all ${
                    isActive 
                      ? "bg-slate-100 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-slate-950" 
                      : "border-transparent text-slate-500 hover:text-slate-950 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-blue-500" : ""} /> {link.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t-2 border-slate-950 mt-8">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signed in as</div>
          <div className="text-sm font-bold text-slate-950 truncate">{user.email}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 font-bold text-slate-500 hover:text-slate-950 transition-colors p-2 w-full text-left"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto relative w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              className="md:hidden p-2 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border-2 border-emerald-300 rounded text-[10px] font-black tracking-widest uppercase">
                  {isSuper ? "Live System" : "Tenant Workspace"}
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-950 uppercase capitalize">
                {location.pathname.split("/").pop() || "Overview"}
              </h1>
            </div>
          </div>
          <button
            onClick={() => fetchData(user.role, user.tenantId)}
            className="p-2 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ml-auto md:ml-0"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
