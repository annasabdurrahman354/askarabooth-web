import { useState, useRef } from "react";
import { Trash2, Upload } from "lucide-react";
import imageCompression from "browser-image-compression";
import { useDashboardStore } from "../../store/useDashboardStore";
import useAuthStore from "../../store/useAuthStore";

export default function StickersPage() {
  const { stickers, createSticker, deleteSticker, uploadStickerImage } = useDashboardStore();
  const { user } = useAuthStore();
  const isSuper = user?.role === "superadmin";

  const [newName, setNewName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!newName.trim() || !file) return;
    setIsUploading(true);

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      const url = await uploadStickerImage(compressedFile);
      if (url) {
        await createSticker(isSuper ? null : (user?.tenantId || null), newName.trim(), url);
        setNewName("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Compression error:", err);
      alert("Failed to compress image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 bg-white p-4 border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-black uppercase tracking-tight">Add Sticker</h2>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Sticker Name"
            className="px-3 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[1px] focus:translate-x-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-bold text-sm"
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs font-bold w-full md:w-48 file:mr-2 file:py-2 file:px-3 file:border-2 file:border-slate-950 file:rounded file:text-xs file:font-black file:bg-slate-100 file:text-slate-950 hover:file:bg-slate-200 file:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] file:cursor-pointer"
          />
          <button
            onClick={handleCreate}
            disabled={isUploading || !file || !newName.trim()}
            className="bg-emerald-400 text-slate-950 font-black uppercase tracking-widest text-xs px-4 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? <span className="animate-spin text-lg leading-none">⟳</span> : <Upload size={14} />} {isSuper ? "Upload Global" : "Upload"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {stickers.map((s) => (
          <div key={s.id} className="bg-white p-4 border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center group relative">
            <div className="w-16 h-16 mb-2">
              <img src={s.url} alt={s.name} className="w-full h-full object-contain" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">{s.name}</span>
            {s.tenant_id === null ? (
              <span className="mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 border-2 border-blue-300 rounded text-[8px] font-black tracking-widest uppercase">
                Global
              </span>
            ) : (
              <span className="mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 border-2 border-yellow-300 rounded text-[8px] font-black tracking-widest uppercase">
                {s.tenants?.name || "Tenant"}
              </span>
            )}
            
            {(isSuper || s.tenant_id === user?.tenantId) && (
              <button
                onClick={() => deleteSticker(s.id)}
                className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 border-2 border-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {stickers.length === 0 && (
          <p className="text-slate-500 col-span-full font-bold text-center py-8">No stickers found.</p>
        )}
      </div>
    </div>
  );
}
