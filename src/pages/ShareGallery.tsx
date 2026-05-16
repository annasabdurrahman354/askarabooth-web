import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Download, Share2, Printer } from "lucide-react";
import { useShareStore } from "../store/useShareStore";

export default function ShareGallery() {
  const { token } = useParams();
  const { session, template, captures, isLoading, notFound, fetchShareData } = useShareStore();

  useEffect(() => {
    if (token) {
      fetchShareData(token);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-slate-400 font-black uppercase tracking-widest text-sm animate-pulse">Loading your memories...</div>
      </div>
    );
  }

  if (notFound || !session || !template) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="bg-white border-4 border-slate-950 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12 text-center max-w-sm">
          <div className="text-4xl font-black uppercase tracking-tight text-slate-950 mb-2">Not Found</div>
          <p className="text-slate-500 font-bold text-sm">This share link has expired or doesn't exist.</p>
        </div>
      </div>
    );
  }

  const photoUrls = captures.map((c) => c.photo_url);

  return (
    <div className="h-screen w-screen bg-slate-900 flex font-sans text-slate-900 overflow-hidden">
      {/* Rendered image preview */}
      <div className="flex-1 flex items-center justify-center p-8">
        {session.final_image_url ? (
          <img
            src={session.final_image_url}
            alt="Your photos"
            className="max-h-[85vh] max-w-full border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] object-contain"
          />
        ) : (
          <div className="text-slate-400 font-black uppercase tracking-widest text-sm animate-pulse">Rendering...</div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="w-80 border-l-4 border-slate-950 bg-slate-800 flex flex-col shrink-0">
        {/* Header */}
        <div className="px-5 py-5 border-b-2 border-slate-950 bg-yellow-400">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">Your Photos</h1>
          <p className="text-[10px] text-slate-800 font-bold mt-0.5 uppercase tracking-widest">Thanks for celebrating!</p>
        </div>

        {/* Captures grid */}
        {photoUrls.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Captures</p>
            {photoUrls.map((url: string, i: number) => (
              <div key={i} className="bg-slate-700 rounded-xl border-2 border-slate-900 overflow-hidden">
                <div className="aspect-video bg-black overflow-hidden relative group">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <a
                    href={url}
                    download={`photo_${i + 1}.jpg`}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="bg-yellow-400 text-slate-950 font-black uppercase tracking-widest text-[10px] px-3 py-1.5 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                      <Download size={12} />
                      Save
                    </div>
                  </a>
                </div>
                <div className="flex items-center px-3 py-2">
                  <span className="text-white font-black uppercase tracking-widest text-[10px]">Photo {i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t-2 border-slate-950 space-y-2">
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 bg-emerald-400 text-slate-950 font-black uppercase tracking-widest px-4 py-3 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all print:hidden"
          >
            <Printer size={18} />
            <span>Print</span>
          </button>

          {session.final_image_url && (
            <a
              href={session.final_image_url}
              download="photobooth.jpg"
              className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-slate-950 font-black uppercase tracking-widest px-4 py-3 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
            >
              <Download size={18} />
              <span>Save</span>
            </a>
          )}

          <button
            onClick={() =>
              navigator.clipboard.writeText(window.location.href).then(() => alert("Link copied!"))
            }
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black uppercase tracking-widest px-4 py-3 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
          >
            <Share2 size={18} />
            <span>Share Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}