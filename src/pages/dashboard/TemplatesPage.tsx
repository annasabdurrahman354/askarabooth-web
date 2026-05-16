import { useState } from "react";
import { useDashboardStore } from "../../store/useDashboardStore";
import useAuthStore from "../../store/useAuthStore";
import { Image as ImageIcon, Plus, Trash2, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TemplatesPage() {
  const { templates, sessions, createTemplate, deleteTemplate } = useDashboardStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const isSuper = user?.role === "superadmin";

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateTemplate = async () => {
    if (!user?.tenantId && !isSuper) return;

    if (isSuper) {
      alert("Superadmins must pick a tenant to create a template (feature coming soon).");
      return;
    }

    const template = await createTemplate(user!.tenantId!);
    if (template) {
      navigate(`/admin/templates/${template.id}/editor`);
    }
  };

  const openDeleteModal = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    setSelectedTemplate(templateId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTemplate || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await deleteTemplate(selectedTemplate);
      if (success) {
        closeModal();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const templateToDelete = templates.find((t) => t.id === selectedTemplate);
  const relatedSessions = sessions.filter((s) => s.template_id === selectedTemplate);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black uppercase tracking-tight">Templates</h2>
        {!isSuper && (
          <button
            onClick={handleCreateTemplate}
            className="bg-yellow-400 text-slate-950 font-black uppercase tracking-widest text-xs px-4 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center gap-1"
          >
            <Plus size={14} /> Create Template
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {templates.map((t) => (
          <div
            key={t.id}
            onClick={() => {
              if (!isSuper) navigate(`/admin/templates/${t.id}/editor`);
            }}
            className={`relative bg-white p-4 border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center transition-all ${
              !isSuper ? "cursor-pointer hover:bg-slate-50 active:translate-y-[4px] active:translate-x-[4px] active:shadow-none" : ""
            }`}
          >
            {!isSuper && (
              <button
                onClick={(e) => openDeleteModal(e, t.id)}
                className="absolute top-2 right-2 z-10 p-1.5 bg-red-100 text-red-600 border-2 border-red-600 rounded hover:bg-red-200 transition-colors"
                title="Delete template"
              >
                <Trash2 size={14} />
              </button>
            )}
            <div className="w-full h-48 bg-slate-100 border-2 border-slate-950 rounded border-dashed mb-4 flex items-center justify-center overflow-hidden relative group">
              {t.thumbnail_url ? (
                <img src={t.thumbnail_url} alt="thumbnail" className="h-full object-cover" />
              ) : (
                <ImageIcon size={32} className="text-slate-300 filter grayscale" />
              )}
              {!isSuper && (
                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">Edit</span>
                </div>
              )}
            </div>
            <h3 className="font-black text-lg tracking-tight uppercase">{t.name}</h3>
            {isSuper && t.tenants && (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Tenant: {t.tenants.name}</p>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-slate-500 col-span-4 font-bold text-center py-8">No templates found.</p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {modalOpen && templateToDelete && (
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
              <h3 className="text-xl font-black uppercase tracking-tight">Delete Template</h3>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-4">
              Are you sure you want to delete <span className="text-slate-950 font-black">"{templateToDelete.name}"</span>?
            </p>

            {relatedSessions.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                <p className="text-xs font-black uppercase tracking-widest text-red-700 mb-2">
                  This will also delete the following relationships:
                </p>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {relatedSessions.map((s) => (
                    <li key={s.id} className="text-xs font-bold text-red-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                      Session {s.id.substring(0, 8)}... — {s.booths?.name || "Unknown Booth"}
                    </li>
                  ))}
                </ul>
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
