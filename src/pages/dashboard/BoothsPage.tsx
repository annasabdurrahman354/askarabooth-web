import React, { useState } from "react";
import { Camera, Plus, Trash2, X, AlertTriangle } from "lucide-react";
import { useDashboardStore } from "../../store/useDashboardStore";
import useAuthStore from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";

export default function BoothsPage() {
  const { booths, sessions, captures, templates, createBooth, deleteBooth } = useDashboardStore();
  const { user } = useAuthStore();
  const [newBoothName, setNewBoothName] = useState("");
  const navigate = useNavigate();

  const isSuper = user?.role === "superadmin";

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
  const [deleteSessions, setDeleteSessions] = useState(true);
  const [deleteCaptures, setDeleteCaptures] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [launchBoothId, setLaunchBoothId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const filteredTemplates = templates.filter(t => user?.tenantId && t.tenant_id === user.tenantId);

  const handleCreateBooth = async () => {
    if (!newBoothName.trim() || !user?.tenantId) return;
    await createBooth(user.tenantId, newBoothName.trim());
    setNewBoothName("");
  };

  const openDeleteModal = (e: React.MouseEvent, boothId: string) => {
    e.stopPropagation();
    setSelectedBoothId(boothId);
    setDeleteSessions(true);
    setDeleteCaptures(true);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedBoothId(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBoothId || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await deleteBooth(selectedBoothId, {
        deleteSessions,
        deleteCaptures: deleteSessions && deleteCaptures,
      });
      if (success) closeModal();
    } finally {
      setIsDeleting(false);
    }
  };

  const openTemplateModal = (boothId: string) => {
    setLaunchBoothId(boothId);
    setSelectedTemplateId(filteredTemplates.length > 0 ? filteredTemplates[0].id : null);
    setTemplateModalOpen(true);
  };

  const closeTemplateModal = () => {
    setTemplateModalOpen(false);
    setLaunchBoothId(null);
    setSelectedTemplateId(null);
  };

  const handleLaunch = () => {
    if (launchBoothId && selectedTemplateId) {
      navigate(`/booth/${launchBoothId}/template/${selectedTemplateId}`);
    }
  };

  const boothToDelete = booths.find(b => b.id === selectedBoothId);
  const relatedSessions = sessions.filter(s => s.booth_id === selectedBoothId);
  const relatedSessionIds = relatedSessions.map(s => s.id);
  const relatedCaptures = captures.filter(c => relatedSessionIds.includes(c.session_id));

  return (
    <div>
      {!isSuper && (
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 bg-white p-4 border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-black uppercase tracking-tight">Create New Booth</h2>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newBoothName}
              onChange={(e) => setNewBoothName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateBooth()}
              placeholder="Booth Name"
              className="px-3 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[1px] focus:translate-x-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-bold text-sm"
            />
            <button
              onClick={handleCreateBooth}
              className="bg-blue-600 text-white font-black uppercase tracking-widest text-xs px-4 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {booths.map((b) => (
          <div key={b.id} className="bg-white p-6 border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center relative group">
            {!isSuper && (
              <button
                onClick={(e) => openDeleteModal(e, b.id)}
                className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 border-2 border-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            )}
            <div className="w-16 h-16 bg-blue-100 border-2 border-slate-950 rounded-full flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Camera size={32} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-black tracking-tight uppercase">{b.name}</h3>
            {isSuper && b.tenants && (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Tenant: {b.tenants.name}</p>
            )}
            <div className="mb-6 mt-2">
              {b.status === "in_session" ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border-2 border-emerald-300 rounded text-[10px] font-black tracking-widest uppercase animate-pulse">
                  LIVE: IN SESSION
                </span>
              ) : (
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Status: {b.status}
                </span>
              )}
            </div>
            {!isSuper && (
              <>
                {filteredTemplates.length > 0 ? (
                  <button
                    onClick={() => openTemplateModal(b.id)}
                    className="w-full bg-emerald-400 text-slate-950 font-black uppercase tracking-widest text-xs px-4 py-3 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                  >
                    Launch Booth
                  </button>
                ) : (
                  <p className="text-xs font-bold text-red-500 bg-red-100 px-3 py-1 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    Create template first
                  </p>
                )}
              </>
            )}
          </div>
        ))}
        {booths.length === 0 && (
          <p className="text-slate-500 col-span-full font-bold text-center py-8">No booths found.</p>
        )}
      </div>

      {/* Template Selection Modal */}
      {templateModalOpen && launchBoothId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white border-4 border-slate-950 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg p-6 relative">
            <button
              onClick={closeTemplateModal}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black uppercase tracking-tight mb-4">Select Template</h3>

            {filteredTemplates.length === 0 ? (
              <p className="text-sm font-bold text-slate-500 py-8 text-center">No templates available. Create a template first.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto mb-4">
                {filteredTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`relative bg-white p-3 border-2 rounded-xl transition-all text-left ${
                      selectedTemplateId === t.id
                        ? "border-emerald-500 shadow-[2px_2px_0px_0px_rgba(16,185,129,1)]"
                        : "border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:border-slate-400"
                    }`}
                  >
                    <div className="w-full h-24 bg-slate-100 border-2 border-slate-950 rounded mb-2 flex items-center justify-center overflow-hidden">
                      {t.thumbnail_url ? (
                        <img src={t.thumbnail_url} alt="thumbnail" className="h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Preview</span>
                      )}
                    </div>
                    <p className="text-xs font-black uppercase tracking-tight truncate">{t.name}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeTemplateModal}
                className="bg-white text-slate-950 font-black uppercase tracking-widest text-xs px-4 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunch}
                disabled={!selectedTemplateId}
                className="bg-emerald-400 text-slate-950 font-black uppercase tracking-widest text-xs px-4 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Launch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalOpen && boothToDelete && (
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
              <h3 className="text-xl font-black uppercase tracking-tight">Delete Booth</h3>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-4">
              Are you sure you want to delete <span className="text-slate-950 font-black">"{boothToDelete.name}"</span>?
            </p>

            {(relatedSessions.length > 0 || relatedCaptures.length > 0) && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-red-700">
                  This booth has related data:
                </p>

                {relatedSessions.length > 0 && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteSessions}
                      onChange={(e) => {
                        setDeleteSessions(e.target.checked);
                        if (!e.target.checked) setDeleteCaptures(false);
                      }}
                      className="mt-1 accent-red-600"
                    />
                    <span className="text-xs font-bold text-red-600">
                      Also delete {relatedSessions.length} session{relatedSessions.length !== 1 ? "s" : ""}
                    </span>
                  </label>
                )}

                {relatedSessions.length > 0 && deleteSessions && relatedCaptures.length > 0 && (
                  <label className="flex items-start gap-2 cursor-pointer ml-5">
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
                )}

                {relatedSessions.length > 0 && !deleteSessions && (
                  <p className="text-[10px] font-bold text-slate-500 ml-1">
                    Sessions will become orphaned (no booth assigned).
                  </p>
                )}
                {relatedSessions.length > 0 && deleteSessions && !deleteCaptures && relatedCaptures.length > 0 && (
                  <p className="text-[10px] font-bold text-slate-500 ml-5">
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