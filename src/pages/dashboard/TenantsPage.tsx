import { useDashboardStore } from "../../store/useDashboardStore";

export default function TenantsPage() {
  const { tenants, toggleTenantPlan, toggleTenantStatus } = useDashboardStore();

  return (
    <div className="bg-white border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-x-auto flex flex-col">
      <table className="hidden md:table min-w-full divide-y-2 divide-slate-950">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Name</th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Plan</th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Created</th>
            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y-2 divide-slate-100">
          {tenants.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-900">{t.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold uppercase tracking-widest">
                <button
                  onClick={() => toggleTenantPlan(t)}
                  className={`px-2 py-0.5 rounded border-2 border-slate-950 text-[10px] font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:opacity-80 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${
                    t.plan === "pro" ? "bg-blue-600 text-white" : "bg-white text-slate-700"
                  }`}
                >
                  {t.plan}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {t.status === "suspended" ? (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 border-2 border-red-300 rounded text-[10px] font-black tracking-widest uppercase">
                    Suspended
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border-2 border-emerald-300 rounded text-[10px] font-black tracking-widest uppercase">
                    Active
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">
                {new Date(t.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <button
                  onClick={() => toggleTenantStatus(t)}
                  className={`font-black uppercase tracking-widest text-[10px] px-3 py-1 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${
                    t.status === "suspended"
                      ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                      : "bg-red-500 text-white hover:bg-red-400"
                  }`}
                >
                  {t.status === "suspended" ? "Activate" : "Suspend"}
                </button>
              </td>
            </tr>
          ))}
          {tenants.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-sm font-bold text-slate-400">
                No tenants found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Mobile card list */}
      <div className="md:hidden p-4 space-y-4">
        {tenants.map((t) => (
          <div key={t.id} className="bg-white border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 space-y-3">
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Name</span>
              <span className="text-sm font-black text-slate-900">{t.name}</span>
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Plan</span>
              <button
                onClick={() => toggleTenantPlan(t)}
                className={`mt-1 px-2 py-0.5 rounded border-2 border-slate-950 text-[10px] font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:opacity-80 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${
                  t.plan === "pro" ? "bg-blue-600 text-white" : "bg-white text-slate-700"
                }`}
              >
                {t.plan}
              </button>
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Status</span>
              {t.status === "suspended" ? (
                <span className="mt-1 inline-block px-2 py-0.5 bg-red-100 text-red-700 border-2 border-red-300 rounded text-[10px] font-black tracking-widest uppercase">
                  Suspended
                </span>
              ) : (
                <span className="mt-1 inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 border-2 border-emerald-300 rounded text-[10px] font-black tracking-widest uppercase">
                  Active
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Created</span>
              <span className="text-sm font-bold text-slate-500">{new Date(t.created_at).toLocaleDateString()}</span>
            </div>
            <div className="pt-1">
              <button
                onClick={() => toggleTenantStatus(t)}
                className={`font-black uppercase tracking-widest text-[10px] px-3 py-1 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${
                  t.status === "suspended"
                    ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                    : "bg-red-500 text-white hover:bg-red-400"
                }`}
              >
                {t.status === "suspended" ? "Activate" : "Suspend"}
              </button>
            </div>
          </div>
        ))}
        {tenants.length === 0 && (
          <div className="text-center text-sm font-bold text-slate-400 py-12">
            No tenants found
          </div>
        )}
      </div>
    </div>
  );
}
