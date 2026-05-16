import React, { useState } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { useDashboardStore } from "../../store/useDashboardStore";
import useAuthStore from "../../store/useAuthStore";
import { Link } from "react-router-dom";

export default function SessionsPage() {
  const { sessions, captures, deleteSession } = useDashboardStore();
  const { user } = useAuthStore();
  const isSuper = user?.role === "superadmin";

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [deleteCaptures, setDeleteCaptures] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteModal = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setSelectedSessionId(sessionId);
    setDeleteCaptures(true);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedSessionId(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSessionId || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await deleteSession(selectedSessionId, { deleteCaptures });
      if (success) closeModal();
    } finally {
      setIsDeleting(false);
    }
  };

  const sessionToDelete = sessions.find(s => s.id === selectedSessionId);
  const relatedCaptures = captures.filter(c => c.session_id === selectedSessionId);

  return (
    <div>
      <div className="bg-white border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-x-auto flex flex-col">
        <table className="hidden md:table min-w-full divide-y-2 divide-slate-950">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Booth</th>
              {isSuper && (
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Tenant</th>
              )}
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Gallery</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
              {!isSuper && (
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y-2 divide-slate-100">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-500">
                  {s.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-900">
                  {s.booths?.name || "Unknown Booth"}
                </td>
                {isSuper && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">
                    {s.booths?.tenants?.name || "Unknown"}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  {s.status === "completed" ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border-2 border-emerald-300 rounded text-[10px] font-black tracking-widest uppercase">
                      Completed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 border-2 border-yellow-300 rounded text-[10px] font-black tracking-widest uppercase">
                      {s.status}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/share/${s.share_token}`}
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 font-bold text-sm underline underline-offset-4"
                  >
                    View Gallery
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">
                  {new Date(s.created_at).toLocaleString()}
                </td>
                {!isSuper && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={(e) => openDeleteModal(e, s.id)}
                      className="p-1.5 bg-red-100 text-red-600 border-2 border-red-600 rounded hover:bg-red-200 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={isSuper ? 6 : 7} className="px-6 py-12 text-center text-sm font-bold text-slate-400">
                  No sessions found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile card list */}
        <div className="md:hidden p-4 space-y-4">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 space-y-3 relative">
              {!isSuper && (
                <button
                  onClick={(e) => openDeleteModal(e, s.id)}
                  className="absolute top-3 right-3 p-1.5 bg-red-100 text-red-600 border-2 border-red-600 rounded hover:bg-red-200 transition-colors"
                  title="Delete session"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">ID</span>
                <span className="text-xs font-mono font-bold text-slate-500">{s.id.substring(0, 8)}...</span>
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Booth</span>
                <span className="text-sm font-black text-slate-900">{s.booths?.name || "Unknown Booth"}</span>
              </div>
              {isSuper && (
                <div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Tenant</span>
                  <span className="text-sm font-bold text-slate-500">{s.booths?.tenants?.name || "Unknown"}</span>
                </div>
              )}
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Status</span>
                {s.status === "completed" ? (
                  <span className="mt-1 inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 border-2 border-emerald-300 rounded text-[10px] font-black tracking-widest uppercase">
                    Completed
                  </span>
                ) : (
                  <span className="mt-1 inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 border-2 border-yellow-300 rounded text-[10px] font-black tracking-widest uppercase">
                    {s.status}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Gallery</span>
                <Link
                  to={`/share/${s.share_token}`}
                  target="_blank"
                  className="text-blue-600 hover:text-blue-800 font-bold text-sm underline underline-offset-4"
                >
                  View Gallery
                </Link>
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">Date</span>
                <span className="text-sm font-bold text-slate-500">{new Date(s.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-center text-sm font-bold text-slate-400 py-12">
              No sessions found
            </div>
          )}
        </div>
      </div>

      {modalOpen && sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white border-4 border-slate-950 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md p-6 relative">
            <button
              onClick={closeModal}
              disabled={isDeleting}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 border-2 border-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Delete Session</h3>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-4">
              Are you sure you want to delete session <span className="text-slate-950 font-black">"{sessionToDelete.id.substring(0, 8)}..."</span>?
            </p>

            {relatedCaptures.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-red-700">
                  This session has related data:
                </p>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteCaptures}
                    onChange={(e) => setDeleteCaptures(e.target.checked)}
                    className="mt-1 accent-red-600"
                  />
                  <span className="text-xs font-bold text-red-600">
                    Also delete {relatedCaptures.length} capture{relatedCaptures.length !== 1 ? "s" : ""}
                  </span>
                </label>

                {!deleteCaptures && (
                  <p className="text-[10px] font-bold text-slate-500 ml-1">
                    Captures will become orphaned (no session assigned).
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeModal}
                disabled={isDeleting}
                className="bg-white text-slate-950 font-black uppercase tracking-widest text-xs px-4 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-500 text-white font-black uppercase tracking-widest text-xs px-4 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-400 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isDeleting ? (
                  <span className="animate-spin text-lg leading-none">⟳</span>
                ) : null}
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}