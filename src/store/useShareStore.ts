import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Element } from './useEditorStore';

interface Session {
  id: string;
  template_id: string;
  share_token: string;
  final_image_url: string;
}

interface Template {
  id: string;
  htmlContent: string;
  canvasW: number;
  canvasH: number;
  canvasBg: string;
  canvasBgImage: string | null;
  elements: Element[];
}

interface Capture {
  photo_url: string;
}

interface ShareStoreState {
  session: Session | null;
  template: Template | null;
  captures: Capture[];
  isLoading: boolean;
  notFound: boolean;
  _fetching: boolean;
  fetchShareData: (token: string) => Promise<void>;
}

export const useShareStore = create<ShareStoreState>((set, get) => ({
  session: null,
  template: null,
  captures: [],
  isLoading: false,
  notFound: false,
  _fetching: false,

  fetchShareData: async (token: string) => {
    if (get()._fetching) return;
    set({ isLoading: true, notFound: false, _fetching: true });
    try {
      // Fetch session by share token
      const { data: sessionData, error: sErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("share_token", token)
        .single();

      if (sErr) {
        console.error("Session fetch error:", sErr);
      }
      if (!sessionData) {
        set({ notFound: true, isLoading: false });
        return;
      }

      // Fetch captures and template in parallel
      const [{ data: capturesData, error: cErr }, { data: templateData, error: tErr }] = await Promise.all([
        supabase
          .from("captures")
          .select("*")
          .eq("session_id", sessionData.id)
          .order("capture_index", { ascending: true }),
        supabase.from("templates").select("*").eq("id", sessionData.template_id).single(),
      ]);

      if (cErr) console.error("Captures fetch error:", cErr);
      if (tErr) console.error("Template fetch error:", tErr);

      let parsedLayout: any = null;
      if (templateData?.layout_json) {
        try {
          parsedLayout = JSON.parse(templateData.layout_json);
        } catch (e) {
          console.error("Failed to parse layout_json", e);
        }
      }

      set({
        session: sessionData,
        captures: capturesData ?? [],
        template: templateData ? {
          id: templateData.id,
          htmlContent: templateData.html_content,
          canvasW: parsedLayout?.width || 400,
          canvasH: parsedLayout?.height || 600,
          canvasBg: parsedLayout?.canvasBg || "#ffffff",
          canvasBgImage: parsedLayout?.canvasBgImage || null,
          elements: parsedLayout?.elements || [],
        } : null,
      });

    } catch (err) {
      console.error(err);
      set({ notFound: true });
    } finally {
      set({ isLoading: false, _fetching: false });
    }
  }
}));
