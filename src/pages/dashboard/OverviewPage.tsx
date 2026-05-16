import { Users, Activity, Camera, FileDigit, Building2, LayoutTemplate } from "lucide-react";
import { useDashboardStore } from "../../store/useDashboardStore";

export default function OverviewPage() {
  const { analytics, profiles } = useDashboardStore();
  const isSuper = profiles[0]?.role === "superadmin";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {isSuper && (
        <div className="bg-white border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col">
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 flex items-center justify-between">
            Total Tenants <Building2 size={14} />
          </div>
          <div className="text-4xl font-black">{analytics.totalTenants}</div>
        </div>
      )}
      
      <div className="bg-white border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col">
        <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 flex items-center justify-between">
          Total Users <Users size={14} />
        </div>
        <div className="text-4xl font-black">{analytics.totalUsers}</div>
      </div>

      <div className="bg-yellow-400 border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col">
        <div className="text-[10px] font-black uppercase text-yellow-900 tracking-widest mb-2 flex items-center justify-between">
          Active Booths <Camera size={14} />
        </div>
        <div className="text-4xl font-black">
          {analytics.activeBooths} <span className="text-sm font-bold text-yellow-800">/ {analytics.totalBooths}</span>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col">
        <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 flex items-center justify-between">
          Templates <LayoutTemplate size={14} />
        </div>
        <div className="text-4xl font-black">{analytics.totalTemplates}</div>
      </div>

      <div className="bg-blue-600 border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col text-white">
        <div className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-2 flex items-center justify-between">
          Total Sessions <Activity size={14} />
        </div>
        <div className="text-4xl font-black">{analytics.totalSessions}</div>
      </div>

      <div className="bg-emerald-400 border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col">
        <div className="text-[10px] font-black uppercase text-emerald-900 tracking-widest mb-2 flex items-center justify-between">
          Photos Captured <FileDigit size={14} />
        </div>
        <div className="text-4xl font-black">{analytics.totalCaptures}</div>
      </div>
    </div>
  );
}
