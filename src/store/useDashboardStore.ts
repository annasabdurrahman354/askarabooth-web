import { create } from "zustand";
import { supabase } from "../lib/supabase";

export interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: string;
  tenant_id: string | null;
  created_at: string;
  tenants?: { name: string };
}

export interface Booth {
  id: string;
  name: string;
  status: string;
  tenant_id: string;
  current_session_id: string | null;
  tenants?: { name: string };
}

export interface Template {
  id: string;
  name: string;
  thumbnail_url: string;
  tenant_id: string;
  html_content: string;
  css_content: string;
  layout_json: string;
  tenants?: { name: string };
}

export interface Session {
  id: string;
  booth_id: string;
  template_id: string;
  status: string;
  share_token: string;
  final_image_url: string | null;
  created_at: string;
  booths?: { name: string; tenant_id: string; tenants?: { name: string } };
  templates?: { name: string };
}

export interface Capture {
  id: string;
  session_id: string;
  photo_url: string;
  capture_index: number;
  created_at: string;
  sessions?: { booths?: { name: string; tenant_id: string } };
}

export interface Sticker {
  id: string;
  tenant_id: string | null;
  name: string;
  url: string;
  tenants?: { name: string };
}

export interface Analytics {
  totalTenants: number;
  totalUsers: number;
  totalBooths: number;
  activeBooths: number;
  totalSessions: number;
  totalCaptures: number;
  totalTemplates: number;
}

interface DashboardState {
  tenants: Tenant[];
  profiles: Profile[];
  booths: Booth[];
  sessions: Session[];
  captures: Capture[];
  templates: Template[];
  stickers: Sticker[];
  analytics: Analytics;
  isLoading: boolean;
  channel: any | null;

  fetchData: (role: string, tenantId?: string | null) => Promise<void>;
  
  // Mutations
  toggleTenantPlan: (tenant: Tenant) => Promise<void>;
  toggleTenantStatus: (tenant: Tenant) => Promise<void>;
  updateUserRole: (userId: string, newRole: string) => Promise<void>;
  createBooth: (tenantId: string, name: string) => Promise<void>;
  createTemplate: (tenantId: string, name?: string) => Promise<Template | null>;
  uploadStickerImage: (file: File) => Promise<string | null>;
  createSticker: (tenantId: string | null, name: string, url: string) => Promise<void>;
  deleteSticker: (id: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<boolean>;
  deleteCapture: (id: string) => Promise<boolean>;
  deleteSession: (id: string, options?: { deleteCaptures?: boolean }) => Promise<boolean>;
  deleteBooth: (id: string, options?: { deleteSessions?: boolean; deleteCaptures?: boolean }) => Promise<boolean>;

  subscribeToChanges: (role: string, tenantId?: string | null) => void;
  unsubscribeFromChanges: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  tenants: [],
  profiles: [],
  booths: [],
  sessions: [],
  captures: [],
  templates: [],
  stickers: [],
  analytics: {
    totalTenants: 0,
    totalUsers: 0,
    totalBooths: 0,
    activeBooths: 0,
    totalSessions: 0,
    totalCaptures: 0,
    totalTemplates: 0,
  },
  isLoading: true,
  channel: null,

  fetchData: async (role: string, tenantId?: string | null) => {
    set({ isLoading: true });
    try {
      const isSuper = role === "superadmin";

      let tenantsQ = supabase.from("tenants").select("*").order("created_at", { ascending: false });
      let profilesQ = supabase.from("profiles").select("*, tenants(name)").order("created_at", { ascending: false });
      let boothsQ = supabase.from("booths").select("*, tenants(name)").order("created_at", { ascending: false });
      let sessionsQ = supabase.from("sessions").select("*, booths(name, tenant_id, tenants(name)), templates(name)").order("created_at", { ascending: false });
      let capturesQ = supabase.from("captures").select("*, sessions(booths(name, tenant_id))").order("created_at", { ascending: false });
      let templatesQ = supabase.from("templates").select("*, tenants(name)").order("created_at", { ascending: false });
      let stickersQ = supabase.from("stickers").select("*, tenants(name)").order("created_at", { ascending: false });

      if (!isSuper && tenantId) {
        // Filter by tenant
        profilesQ = profilesQ.eq("tenant_id", tenantId);
        boothsQ = boothsQ.eq("tenant_id", tenantId);
        // We can't directly eq on nested relations in standard supabase-js easily for filtering the parent rows
        // But our RLS policies ALREADY restrict what the user can see.
        // So we actually don't need to add .eq("tenant_id") filters if RLS is strict!
        // However, to be explicit and safe on the client side:
      }

      const [
        { data: tenantsData },
        { data: profilesData },
        { data: boothsData },
        { data: sessionsData },
        { data: capturesData },
        { data: templatesData },
        { data: stickersData },
      ] = await Promise.all([
        tenantsQ,
        profilesQ,
        boothsQ,
        sessionsQ,
        capturesQ,
        templatesQ,
        stickersQ,
      ]);

      const bData = boothsData ?? [];
      const sData = sessionsData ?? [];

      set({
        tenants: tenantsData ?? [],
        profiles: profilesData ?? [],
        booths: bData,
        sessions: sData,
        captures: capturesData ?? [],
        templates: templatesData ?? [],
        stickers: stickersData ?? [],
        analytics: {
          totalTenants: (tenantsData ?? []).length,
          totalUsers: (profilesData ?? []).length,
          totalBooths: bData.length,
          activeBooths: bData.filter(b => b.status === "in_session").length,
          totalSessions: sData.length,
          totalCaptures: (capturesData ?? []).length,
          totalTemplates: (templatesData ?? []).length,
        },
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  toggleTenantPlan: async (tenant: Tenant) => {
    const newPlan = tenant.plan === "free" ? "pro" : "free";
    const { error } = await supabase.from("tenants").update({ plan: newPlan }).eq("id", tenant.id);
    if (!error) {
      set((state) => ({
        tenants: state.tenants.map((t) => (t.id === tenant.id ? { ...t, plan: newPlan } : t)),
      }));
    }
  },

  toggleTenantStatus: async (tenant: Tenant) => {
    const newStatus = tenant.status === "suspended" ? "active" : "suspended";
    const { error } = await supabase.from("tenants").update({ status: newStatus }).eq("id", tenant.id);
    if (!error) {
      set((state) => ({
        tenants: state.tenants.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t)),
      }));
    }
  },

  updateUserRole: async (userId: string, newRole: string) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (!error) {
      set((state) => ({
        profiles: state.profiles.map((p) => (p.id === userId ? { ...p, role: newRole } : p)),
      }));
    }
  },

  createBooth: async (tenantId: string, name: string) => {
    const { error } = await supabase
      .from("booths")
      .insert({ tenant_id: tenantId, name, status: "offline" });
    if (error) alert(error.message);
    else get().fetchData(get().profiles[0]?.role, tenantId); // naive refresh
  },

  createTemplate: async (tenantId: string, name = "New Template") => {
    const defaultHtml = `<div id="template-root" class="relative w-[400px] h-[600px] bg-[#f8f9fa] mx-auto overflow-hidden"></div>`;
    const { data: t, error } = await supabase
      .from("templates")
      .insert({
        tenant_id: tenantId,
        name,
        html_content: defaultHtml,
        css_content: "",
        layout_json: JSON.stringify({ width: 400, height: 600, elements: [] }),
        thumbnail_url: "",
      })
      .select()
      .single();
    
    if (error) {
      alert(error.message);
      return null;
    }
    // refresh
    get().fetchData(get().profiles[0]?.role, tenantId);
    return t;
  },

  uploadStickerImage: async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("stickers")
      .upload(filePath, file);

    if (uploadError) {
      alert("Error uploading sticker: " + uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from("stickers").getPublicUrl(filePath);
    return data.publicUrl;
  },

  createSticker: async (tenantId: string | null, name: string, url: string) => {
    const { error } = await supabase.from("stickers").insert({ tenant_id: tenantId, name, url });
    if (error) alert(error.message);
    else get().fetchData(get().profiles[0]?.role, tenantId);
  },

  deleteSticker: async (id: string) => {
    const sticker = get().stickers.find(s => s.id === id);
    if (!sticker) return;

    // Delete from storage if it's a supabase URL
    if (sticker.url.includes('supabase.co/storage/v1/object/public/stickers/')) {
      const fileName = sticker.url.split('/').pop();
      if (fileName) {
        await supabase.storage.from("stickers").remove([fileName]);
      }
    }

    const { error } = await supabase.from("stickers").delete().eq("id", id);
    if (error) alert(error.message);
    else get().fetchData(get().profiles[0]?.role, sticker.tenant_id);
  },

  deleteTemplate: async (id: string) => {
    const template = get().templates.find(t => t.id === id);
    if (!template) {
      alert("Template not found.");
      return false;
    }

    try {
      // Delete related sessions first (FK with on delete restrict)
      const { error: sessionsError } = await supabase.from("sessions").delete().eq("template_id", id);
      if (sessionsError) {
        alert("Failed to delete related sessions: " + sessionsError.message);
        return false;
      }

      // Delete thumbnail from storage if it's a supabase URL
      if (template.thumbnail_url && template.thumbnail_url.includes('supabase.co/storage/v1/object/public/templates/')) {
        const fileName = template.thumbnail_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from("templates").remove([fileName]);
        }
      }

      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) {
        alert(error.message);
        return false;
      }

      await get().fetchData(get().profiles[0]?.role || "owner", template.tenant_id);
      return true;
    } catch (err: any) {
      alert("Unexpected error deleting template: " + (err?.message || String(err)));
      return false;
    }
  },

  deleteCapture: async (id: string) => {
    const capture = get().captures.find(c => c.id === id);
    if (!capture) return false;

    if (capture.photo_url.includes('supabase.co/storage/v1/object/public/')) {
      const urlParts = capture.photo_url.split('/storage/v1/object/public/');
      if (urlParts.length > 1) {
        const pathParts = urlParts[1].split('/');
        const bucketId = pathParts[0];
        const fileName = pathParts.slice(1).join('/');
        if (fileName) {
          await supabase.storage.from(bucketId).remove([fileName]);
        }
      }
    }

    const { error } = await supabase.from("captures").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return false;
    }
    get().fetchData(get().profiles[0]?.role, capture.sessions?.booths?.tenant_id || null);
    return true;
  },

  deleteSession: async (id: string, options?: { deleteCaptures?: boolean }) => {
    const session = get().sessions.find(s => s.id === id);
    if (!session) return false;

    if (options?.deleteCaptures) {
      const relatedCaptures = get().captures.filter(c => c.session_id === id);
      for (const c of relatedCaptures) {
        if (c.photo_url.includes('supabase.co/storage/v1/object/public/')) {
          const urlParts = c.photo_url.split('/storage/v1/object/public/');
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split('/');
            const bucketId = pathParts[0];
            const fileName = pathParts.slice(1).join('/');
            if (fileName) {
              await supabase.storage.from(bucketId).remove([fileName]);
            }
          }
        }
      }
      const { error: capErr } = await supabase.from("captures").delete().eq("session_id", id);
      if (capErr) {
        alert("Failed to delete related captures: " + capErr.message);
        return false;
      }
    }

    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return false;
    }
    get().fetchData(get().profiles[0]?.role, session.booths?.tenant_id || null);
    return true;
  },

  deleteBooth: async (id: string, options?: { deleteSessions?: boolean; deleteCaptures?: boolean }) => {
    const booth = get().booths.find(b => b.id === id);
    if (!booth) return false;

    if (options?.deleteSessions) {
      const relatedSessionIds = get().sessions.filter(s => s.booth_id === id).map(s => s.id);

      if (options?.deleteCaptures && relatedSessionIds.length > 0) {
        const relatedCaptures = get().captures.filter(c => relatedSessionIds.includes(c.session_id));
        for (const c of relatedCaptures) {
          if (c.photo_url.includes('supabase.co/storage/v1/object/public/')) {
            const urlParts = c.photo_url.split('/storage/v1/object/public/');
            if (urlParts.length > 1) {
              const pathParts = urlParts[1].split('/');
              const bucketId = pathParts[0];
              const fileName = pathParts.slice(1).join('/');
              if (fileName) {
                await supabase.storage.from(bucketId).remove([fileName]);
              }
            }
          }
        }
        const { error: capErr } = await supabase.from("captures").delete().in("session_id", relatedSessionIds);
        if (capErr) {
          alert("Failed to delete related captures: " + capErr.message);
          return false;
        }
      }

      const { error: sessErr } = await supabase.from("sessions").delete().eq("booth_id", id);
      if (sessErr) {
        alert("Failed to delete related sessions: " + sessErr.message);
        return false;
      }
    }

    const { error } = await supabase.from("booths").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return false;
    }
    get().fetchData(get().profiles[0]?.role, booth.tenant_id);
    return true;
  },

  subscribeToChanges: (role: string, tenantId?: string | null) => {
    const existingChannel = get().channel;
    if (existingChannel) return;

    // Simple broad subscription. In production, we'd refine this.
    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        get().fetchData(role, tenantId);
      })
      .subscribe();

    set({ channel });
  },

  unsubscribeFromChanges: () => {
    const channel = get().channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));
