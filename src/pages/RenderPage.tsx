import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { TemplateRenderer, captureTemplateAsBlob } from "../lib/templateRenderer";
import { Element } from "../store/useEditorStore";

interface AndroidBridge {
  onRenderComplete(finalImageUrl: string, shareToken: string): void;
  onRenderError(error: string): void;
}

declare global {
  interface Window {
    Android?: AndroidBridge;
  }
}

function notifyComplete(url: string, token: string) {
  try { window.Android?.onRenderComplete(url, token); } catch {}
}

function notifyError(msg: string) {
  try { window.Android?.onRenderError(msg); } catch {}
}

export default function RenderPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const renderRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || started.current) return;
    started.current = true;
    run();
  }, [sessionId]);

  async function run() {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
        await supabase.auth.setSession({ access_token: token, refresh_token: "" });
      }

      const { data: s, error: sErr } = await supabase
        .from("sessions").select("*").eq("id", sessionId).single();

      if (sErr || !s) { fail("Session not found"); return; }

      if (s.final_image_url) {
        setFinalImageUrl(s.final_image_url);
        notifyComplete(s.final_image_url, s.share_token || "");
        return;
      }

      const [{ data: tpl }, { data: caps }] = await Promise.all([
        supabase.from("templates").select("*").eq("id", s.template_id).single(),
        supabase.from("captures").select("*").eq("session_id", sessionId).order("capture_index"),
      ]);

      if (!tpl) { fail("Template not found"); return; }
      const urls = (caps ?? []).map((c: any) => c.photo_url);
      if (urls.length === 0) { fail("No captures found"); return; }

      const parsed = tpl.layout_json ? JSON.parse(tpl.layout_json) : {};

      setElements(parsed.elements || []);
      setConfig({
        canvasW: parsed.width || 400,
        canvasH: parsed.height || 600,
        canvasBg: parsed.canvasBg || "#ffffff",
        canvasBgImage: parsed.canvasBgImage || null,
      });
      setCaptures(urls);
      setReady(true);

      await new Promise(r => setTimeout(r, 500));
      await document.fonts.ready;

      const el = renderRef.current;
      if (!el) { fail("Render element not found"); return; }

      const blob = await captureTemplateAsBlob(el);
      const fileName = `${s.id}_final.jpg`;
      const { error: upErr } = await supabase.storage
        .from("renders").upload(fileName, blob, { upsert: true });

      if (upErr) { fail("Upload failed"); return; }

      const { data: urlData } = supabase.storage.from("renders").getPublicUrl(fileName);
      const url = urlData.publicUrl;

      await supabase.from("sessions")
        .update({ final_image_url: url, status: "completed" }).eq("id", s.id);

      setFinalImageUrl(url);
      notifyComplete(url, s.share_token || "");
    } catch (err) {
      fail("Render failed");
    }
  }

  function fail(msg: string) {
    console.error(msg);
    setError(msg);
    notifyError(msg);
  }

  const [elements, setElements] = useState<Element[]>([]);
  const [config, setConfig] = useState<{canvasW:number;canvasH:number;canvasBg:string;canvasBgImage:string|null}|null>(null);
  const [captures, setCaptures] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  if (finalImageUrl) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <img src={finalImageUrl} alt="Final" className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-xl font-black uppercase tracking-widest">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center relative">
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-yellow-400 text-3xl font-black uppercase tracking-widest animate-pulse">
          Processing...
        </div>
      </div>

      {ready && config && (
        <div style={{ position: "absolute", left: -9999, top: -9999 }}>
          <TemplateRenderer
            ref={renderRef}
            elements={elements}
            config={config}
            captures={captures}
          />
        </div>
      )}
    </div>
  );
}
