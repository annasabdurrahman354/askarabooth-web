import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Element } from './useEditorStore';

export type SessionStateStatus = "idle" | "shooting" | "flash" | "review" | "rendering" | "done";

interface SessionData {
  id: string;
  booth_id: string;
  template_id: string;
  status: string;
  shareToken: string;
  final_image_url?: string;
}

interface TemplateData {
  id: string;
  htmlContent: string;
  layoutJson: string;
  canvasW: number;
  canvasH: number;
  canvasBg: string;
  canvasBgImage: string | null;
  elements: Element[];
}

interface SessionStoreState {
  template: TemplateData | null;
  state: SessionStateStatus;
  currentSlotIndex: number;
  captures: string[];
  sessionData: SessionData | null;
  totalSlots: number;
  retakeIndex: number | null;
  
  initializeSession: (boothId: string, templateId: string) => Promise<void>;
  startSession: () => void;
  setState: (state: SessionStateStatus) => void;
  addCapture: (dataUrl: string) => Promise<void>;
  retakeCapture: (index: number, dataUrl: string) => Promise<void>;
  setRetakeIndex: (index: number | null) => void;
  renderFinal: (finalImage: string, boothId: string) => Promise<void>;
  resetSession: () => void;

  _initializing: boolean;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  template: null,
  state: "idle",
  currentSlotIndex: 0,
  captures: [],
  sessionData: null,
  totalSlots: 0,
  retakeIndex: null,
  _initializing: false,

  initializeSession: async (boothId: string, templateId: string) => {
    if (get()._initializing || get().sessionData) return;
    set({ _initializing: true });
    try {
      const { data: tpl, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single();
        
      if (error || !tpl) { console.error(error); return; }
      
      const parsedLayout = tpl.layout_json ? JSON.parse(tpl.layout_json) : null;
      const slots = parsedLayout?.elements?.filter((e: any) => e.type === "photo").length || 0;
      const canvasW = parsedLayout?.width || 400;
      const canvasH = parsedLayout?.height || 600;
      const canvasBg = parsedLayout?.canvasBg || "#ffffff";
      const canvasBgImage = parsedLayout?.canvasBgImage || null;
      const elements: Element[] = parsedLayout?.elements || [];

      set({
        template: {
          id: tpl.id,
          htmlContent: tpl.html_content,
          layoutJson: tpl.layout_json,
          canvasW,
          canvasH,
          canvasBg,
          canvasBgImage,
          elements,
        },
        totalSlots: slots
      });

      const shareToken = Math.random().toString(36).substring(2, 10);
      const { data: session, error: sErr } = await supabase
        .from("sessions")
        .insert({
          booth_id: boothId,
          template_id: templateId,
          status: "idle",
          share_token: shareToken,
        })
        .select()
        .single();

      if (sErr) { console.error(sErr); return; }
      set({ sessionData: { ...session, shareToken: session.share_token } });

      await supabase
        .from("booths")
        .update({ status: "in_session", current_session_id: session.id })
        .eq("id", boothId);

    } catch (err) {
      console.error("Failed to initialize session", err);
    }
  },

  startSession: () => {
    set({
      captures: [],
      currentSlotIndex: 0,
      retakeIndex: null,
      state: "shooting"
    });
  },

  setState: (state: SessionStateStatus) => set({ state }),
  setRetakeIndex: (index: number | null) => set({ retakeIndex: index }),

  addCapture: async (dataUrl: string) => {
    const { captures, sessionData } = get();
    const nextCaptures = [...captures, dataUrl];
    const captureIndex = nextCaptures.length - 1;
    
    if (sessionData?.id) {
      try {
        const blob = await fetch(dataUrl).then(r => r.blob());
        const fileName = `${sessionData.id}_${captureIndex}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("captures")
          .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
        
        let photoUrl = dataUrl;
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("captures").getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
        
        // Delete existing row if any, then insert
        await supabase.from("captures")
          .delete()
          .eq("session_id", sessionData.id)
          .eq("capture_index", captureIndex);
        
        await supabase.from("captures").insert({
          session_id: sessionData.id,
          photo_url: photoUrl,
          capture_index: captureIndex,
        });
      } catch (err) {
        console.error("Failed to upload capture", err);
      }
    }

    set({ captures: nextCaptures });
  },

  retakeCapture: async (index: number, dataUrl: string) => {
    const { captures, sessionData } = get();
    const nextCaptures = [...captures];
    nextCaptures[index] = dataUrl;

    if (sessionData?.id) {
      try {
        // Delete old capture row first
        await supabase.from("captures")
          .delete()
          .eq("session_id", sessionData.id)
          .eq("capture_index", index);

        const blob = await fetch(dataUrl).then(r => r.blob());
        const fileName = `${sessionData.id}_${index}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("captures")
          .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

        let photoUrl = dataUrl;
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("captures").getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }

        await supabase.from("captures").insert({
          session_id: sessionData.id,
          photo_url: photoUrl,
          capture_index: index,
        });
      } catch (err) {
        console.error("Failed to retake capture", err);
      }
    }

    set({ captures: nextCaptures, retakeIndex: null });
  },

  renderFinal: async (finalImage: string, boothId: string) => {
    const { sessionData } = get();
    if (!sessionData?.id) return;

    set({ state: "rendering" });

    try {
      const blob = await fetch(finalImage).then(r => r.blob());
      const fileName = `${sessionData.id}_final.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("renders")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

      let imageUrl = finalImage;
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("renders").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      const { error: updateErr } = await supabase
        .from("sessions")
        .update({ final_image_url: imageUrl, status: "completed" })
        .eq("id", sessionData.id);

      if (updateErr) console.error("Failed to update session:", updateErr);

      const { error: boothErr } = await supabase
        .from("booths")
        .update({ status: "online", current_session_id: null })
        .eq("id", boothId);

      if (boothErr) console.error("Failed to reset booth:", boothErr);
    } catch (err) {
      console.error("Failed to render final image", err);
    }

    set({ state: "done" });
  },

  resetSession: () => {
    set({
      state: "idle",
      captures: [],
      sessionData: null,
      _initializing: false,
    });
  }
}));