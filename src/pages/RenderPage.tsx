import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import { supabase } from "../lib/supabase";
import { TemplateRenderer, captureTemplateAsBlob } from "../lib/templateRenderer";
import { Element } from "../store/useEditorStore";

export default function RenderPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const renderRef = useRef<HTMLDivElement>(null);
  const renderTriggered = useRef(false);
  const [phase, setPhase] = useState<"loading" | "rendering" | "done" | "error">("loading");
  const [session, setSession] = useState<any>(null);
  const [template, setTemplate] = useState<{
    elements: Element[];
    canvasW: number;
    canvasH: number;
    canvasBg: string;
    canvasBgImage: string | null;
  } | null>(null);
  const [captures, setCaptures] = useState<string[]>([]);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    load();
  }, [sessionId]);

  async function load() {
    try {
      setPhase("loading");

      const { data: s, error: sErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sErr || !s) {
        setError("Session not found");
        setPhase("error");
        return;
      }

      setSession(s);
      setShareToken(s.share_token);

      if (s.final_image_url) {
        setFinalImageUrl(s.final_image_url);
        setPhase("done");
        return;
      }

      const [{ data: tpl }, { data: caps }] = await Promise.all([
        supabase.from("templates").select("*").eq("id", s.template_id).single(),
        supabase.from("captures").select("*").eq("session_id", sessionId).order("capture_index"),
      ]);

      if (!tpl) {
        setError("Template not found");
        setPhase("error");
        return;
      }

      const parsed = tpl.layout_json ? JSON.parse(tpl.layout_json) : {};
      const urls = (caps ?? []).map((c: any) => c.photo_url);

      if (urls.length === 0) {
        setError("No captures found");
        setPhase("error");
        return;
      }

      setTemplate({
        elements: parsed.elements || [],
        canvasW: parsed.width || 400,
        canvasH: parsed.height || 600,
        canvasBg: parsed.canvasBg || "#ffffff",
        canvasBgImage: parsed.canvasBgImage || null,
      });
      setCaptures(urls);
      setPhase("rendering");
    } catch (err) {
      console.error("Load failed:", err);
      setError("Failed to load data");
      setPhase("error");
    }
  }

  useEffect(() => {
    if (phase !== "rendering" || renderTriggered.current) return;
    renderTriggered.current = true;
    const timer = setTimeout(() => doRender(), 500);
    return () => clearTimeout(timer);
  }, [phase]);

  async function doRender() {
    const el = renderRef.current;
    if (!el || !session?.id) return;

    try {
      const blob = await captureTemplateAsBlob(el);

      const fileName = `${session.id}_final.jpg`;
      const { error: upErr } = await supabase.storage
        .from("renders")
        .upload(fileName, blob, { upsert: true });

      if (upErr) {
        console.error("Upload error:", upErr);
        setError("Failed to upload rendered image");
        setPhase("error");
        renderTriggered.current = false;
        return;
      }

      const { data: urlData } = supabase.storage.from("renders").getPublicUrl(fileName);
      const url = urlData.publicUrl;

      await supabase
        .from("sessions")
        .update({ final_image_url: url, status: "completed" })
        .eq("id", session.id);

      setFinalImageUrl(url);
      setPhase("done");
    } catch (err) {
      console.error("Render failed:", err);
      setError("Render failed. Tap to retry.");
      setPhase("error");
      renderTriggered.current = false;
    }
  }

  if (phase === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 font-sans">
        <div className="text-yellow-400 text-2xl font-black uppercase tracking-widest animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 font-sans">
        <div
          className="bg-white p-8 border-4 border-slate-950 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
          onClick={() => {
            setError(null);
            renderTriggered.current = false;
            load();
          }}
        >
          <h2 className="text-xl font-black uppercase text-red-500 mb-2">Error</h2>
          <p className="text-slate-600 font-bold">{error}</p>
          <p className="text-slate-400 text-sm mt-3 font-bold uppercase tracking-widest">Tap to retry</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="h-screen flex bg-slate-900 font-sans overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4 min-w-0">
          {finalImageUrl && (
            <img
              src={finalImageUrl}
              alt="Final"
              className="max-h-[90vh] max-w-full border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            />
          )}
        </div>

        <div className="w-80 shrink-0 border-l-4 border-slate-950 bg-slate-800 flex flex-col">
          <div className="px-4 py-3 border-b-2 border-slate-950 bg-yellow-400">
            <h2 className="font-black uppercase tracking-tight text-slate-950 text-base">
              Your Photos
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {captures.map((url, i) => (
              <div
                key={i}
                className="bg-slate-700 rounded-lg border-2 border-slate-900 overflow-hidden"
              >
                <div className="aspect-video bg-black overflow-hidden">
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t-2 border-slate-950 space-y-3">
            {shareToken && (
              <>
                <div className="flex justify-center">
                  <div className="p-3 bg-white border-4 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <QRCode
                      value={`${window.location.origin}/share/${shareToken}`}
                      size={150}
                    />
                  </div>
                </div>
                <a
                  href={`${window.location.origin}/share/${shareToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-blue-400 font-bold text-xs underline underline-offset-2 break-all"
                >
                  {window.location.origin}/share/{shareToken}
                </a>
              </>
            )}
            <button
              onClick={() => window.print()}
              className="w-full bg-yellow-400 text-slate-950 font-black uppercase tracking-widest px-4 py-3 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
            >
              Print
            </button>
            {finalImageUrl && (
              <a
                href={finalImageUrl}
                download
                className="block w-full text-center bg-emerald-400 text-slate-950 font-black uppercase tracking-widest px-4 py-3 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
              >
                Save
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-900 overflow-hidden font-sans relative">
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90">
        <div className="text-center">
          <div className="text-yellow-400 text-4xl font-black uppercase tracking-widest animate-pulse mb-4">
            Processing...
          </div>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
            Creating your final image
          </p>
        </div>
      </div>

      {template && (
        <div className="flex items-center justify-center h-full">
          <TemplateRenderer
            ref={renderRef}
            elements={template.elements}
            config={{
              canvasW: template.canvasW,
              canvasH: template.canvasH,
              canvasBg: template.canvasBg,
              canvasBgImage: template.canvasBgImage,
            }}
            captures={captures}
          />
        </div>
      )}
    </div>
  );
}
