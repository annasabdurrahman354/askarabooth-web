import React, { useState } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { useDashboardStore } from "../../store/useDashboardStore";
import useAuthStore from "../../store/useAuthStore";

export default function CapturesPage() {
  const { captures, deleteCapture } = useDashboardStore();
  const { user } = useAuthStore();
  const isSuper = user?.role === "superadmin";

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteModal = (e: React.MouseEvent, captureId: string) => {
    e.stopPropagation();
    setSelectedCaptureId(captureId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedCaptureId(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCaptureId || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await deleteCapture(selectedCaptureId);
      if (success) closeModal();
    } finally {
      setIsDeleting(false);
    }
  };

  const captureToDelete = captures.find(c => c.id === selectedCaptureId);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {captures.map((c) => (
          <div key={c.id} className="bg-white p-2 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col group relative">
            {!isSuper && (
              <button
                onClick={(e) => openDeleteModal(e, c.id)}
                className="absolute top-1.5 right-1.5 z-10 p-1 bg-red-100 text-red-600 border-2 border-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                title="Delete"
              >
                <Trash2 size={10} />
              </button>
            )}
            <div className="w-full aspect-square bg-slate-100 border-2 border-slate-950 rounded mb-2 overflow-hidden">
              <img src={c.photo_url} alt="capture" className="w-full h-full object-cover" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate text-center">
              {c.sessions?.booths?.name || "Unknown Booth"}
            </div>

            <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
              <a
                href={c.photo_url}
                download={`capture-${c.id}.jpg`}
                className="text-[10px] font-black uppercase tracking-widest text-slate-950 bg-emerald-400 px-3 py-1 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
              >
                Download
              </a>
            </div>
          </div>
        ))}
        {captures.length === 0 && (
          <p className="text-slate-500 col-span-full font-bold text-center py-8">No captures found.</p>
        )}
      </div>

      {modalOpen && captureToDelete && (
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
              <h3 className="text-xl font-black uppercase tracking-tight">Delete Capture</h3>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-4">
              Are you sure you want to delete this capture? This action cannot be undone.
            </p>

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