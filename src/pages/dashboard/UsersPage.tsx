import { useDashboardStore } from "../../store/useDashboardStore";
import useAuthStore from "../../store/useAuthStore";

export default function UsersPage() {
  const { profiles, updateUserRole } = useDashboardStore();
  const { user } = useAuthStore();
  const isSuper = user?.role === "superadmin";

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserRole(userId, newRole);
  };

  return (
    <div className="bg-white border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-x-auto flex flex-col">
      <table className="hidden md:table min-w-full divide-y-2 divide-slate-950">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
            {isSuper && (
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Tenant</th>
            )}
            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Joined</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y-2 divide-slate-100">
          {profiles.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-900">{p.email}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                {p.role === "superadmin" ? (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 border-2 border-purple-300 rounded text-[10px] font-black tracking-widest uppercase">
                    Superadmin
                  </span>
                ) : (
                  <select
                    value={p.role}
                    onChange={(e) => handleRoleChange(p.id, e.target.value)}
                    className="border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] font-black uppercase tracking-widest p-1 focus:outline-none"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
              </td>
              {isSuper && (
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">
                  {p.tenants?.name || "N/A"}
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">
                {new Date(p.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={isSuper ? 4 : 3} className="px-6 py-12 text-center text-sm font-bold text-slate-400">
                No users found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Mobile card list */}
      <div className="md:hidden p-4 space-y-4">
        {profiles.map((p) => (
          <div key={p.id} className="bg-white border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 space-y-3">
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Email</span>
              <span className="text-sm font-black text-slate-900">{p.email}</span>
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Role</span>
              {p.role === "superadmin" ? (
                <span className="mt-1 inline-block px-2 py-0.5 bg-purple-100 text-purple-700 border-2 border-purple-300 rounded text-[10px] font-black tracking-widest uppercase">
                  Superadmin
                </span>
              ) : (
                <select
                  value={p.role}
                  onChange={(e) => handleRoleChange(p.id, e.target.value)}
                  className="mt-1 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] font-black uppercase tracking-widest p-1 focus:outline-none"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                </select>
              )}
            </div>
            {isSuper && (
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Tenant</span>
                <span className="text-sm font-bold text-slate-500">{p.tenants?.name || "N/A"}</span>
              </div>
            )}
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Joined</span>
              <span className="text-sm font-bold text-slate-500">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {profiles.length === 0 && (
          <div className="text-center text-sm font-bold text-slate-400 py-12">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}
