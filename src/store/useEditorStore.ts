import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { renderTemplateHTML, TemplateConfig } from '../lib/templateRenderer';

export const CM_TO_PX = (cm: number, dpi: number) => Math.round((cm * dpi) / 2.54);
export const PX_TO_CM = (px: number, dpi: number) => Math.round((px * 2.54) / dpi * 100) / 100;
export const DEFAULT_DPI = 300;
export const PRESET_SIZES = [
  { label: '4×6" Photo (10×15cm)', cmW: 10, cmH: 15 },
  { label: '5×7" Photo (13×18cm)', cmW: 13, cmH: 18 },
  { label: 'A6 (10.5×14.8cm)', cmW: 10.5, cmH: 14.8 },
  { label: 'A5 (14.8×21cm)', cmW: 14.8, cmH: 21 },
  { label: 'A4 (21×29.7cm)', cmW: 21, cmH: 29.7 },
  { label: 'Square 10×10cm', cmW: 10, cmH: 10 },
  { label: 'Square 15×15cm', cmW: 15, cmH: 15 },
];

export interface Element {
  id: string;
  type: "photo" | "text" | "sticker" | "image" | "group";
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  fontSize?: number;
  color?: string;
  url?: string;
  zIndex?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  textTransform?: string;
  wrapText?: boolean;
  rotation?: number;
  opacity?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  name?: string;
  flexDir?: string;
  gap?: number;
  padding?: number;
  bgColor?: string;
  bgOpacity?: number;
  align?: string;
  justify?: string;
  flexWrap?: string;
  children?: Element[];
  childIds?: string[];
  ratioLock?: boolean;
  aspectRatio?: number;
}

export interface TemplateData {
  id: string;
  name: string;
  thumbnail_url: string;
  tenant_id: string;
  html_content: string;
  css_content: string;
  layout_json: string;
}

export interface StickerData {
  id: string;
  url: string;
  name: string;
}

function findElementById(elements: Element[], id: string): Element | null {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.type === 'group' && el.children) {
      const found = findElementById(el.children, id);
      if (found) return found;
    }
  }
  return null;
}

function updateElementInList(elements: Element[], id: string, updates: Partial<Element>): Element[] {
  return elements.map((el) => {
    if (el.id === id) return { ...el, ...updates } as Element;
    if (el.type === 'group' && el.children) {
      return { ...el, children: updateElementInList(el.children, id, updates) };
    }
    return el;
  });
}

function removeElementById(elements: Element[], id: string): Element[] {
  return elements
    .filter((el) => el.id !== id)
    .map((el) => {
      if (el.type === 'group' && el.children) {
        return {
          ...el,
          children: removeElementById(el.children, id),
          childIds: el.childIds?.filter((cid) => cid !== id),
        };
      }
      return el;
    });
}

interface EditorState {
  elements: Element[];
  history: Element[][];
  historyIndex: number;

  template: TemplateData | null;
  stickers: StickerData[];
  isSaving: boolean;
  saveSuccess: boolean;
  isLoading: boolean;

  canvasW: number;
  canvasH: number;
  canvasBg: string;
  canvasBgImage: string | null;
  dpi: number;

  setElements: (elements: Element[]) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  undo: () => void;
  redo: () => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  duplicateElement: (id: string) => void;
  deleteElement: (id: string) => void;
  centerElementH: (id: string) => void;
  centerElementV: (id: string) => void;
  setCanvasBg: (color: string) => void;
  setCanvasBgImage: (url: string | null) => void;
  setCanvasSize: (w: number, h: number) => void;
  groupElements: (ids: string[], options: Partial<Element>) => void;
  ungroupElement: (id: string) => void;
  addChildToGroup: (groupId: string, childId: string) => void;
  removeChildFromGroup: (groupId: string, childId: string) => void;

  loadTemplateAndStickers: (templateId: string) => Promise<void>;
  updateTemplateName: (name: string) => void;
  saveTemplate: (templateId: string) => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  elements: [],
  history: [[]],
  historyIndex: 0,

  template: null,
  stickers: [],
  isSaving: false,
  saveSuccess: false,
  isLoading: true,

  canvasW: 400,
  canvasH: 600,
  canvasBg: '#ffffff',
  canvasBgImage: null,
  dpi: DEFAULT_DPI,

  setElements: (elements) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(elements)));
    set({ elements, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  updateElement: (id, updates) => {
    const { elements } = get();
    const newElements = updateElementInList(elements, id, updates);
    get().setElements(newElements);
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prev = JSON.parse(JSON.stringify(history[historyIndex - 1]));
      set({ elements: prev, historyIndex: historyIndex - 1 });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const next = JSON.parse(JSON.stringify(history[historyIndex + 1]));
      set({ elements: next, historyIndex: historyIndex + 1 });
    }
  },

  bringForward: (id) => {
    const { elements } = get();
    const index = elements.findIndex((e) => e.id === id);
    if (index < elements.length - 1) {
      const newElements = [...elements];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      const finalElements = newElements.map((el, i) => ({ ...el, zIndex: i + 1 }));
      get().setElements(finalElements);
    }
  },

  sendBackward: (id) => {
    const { elements } = get();
    const index = elements.findIndex((e) => e.id === id);
    if (index > 0) {
      const newElements = [...elements];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      const finalElements = newElements.map((el, i) => ({ ...el, zIndex: i + 1 }));
      get().setElements(finalElements);
    }
  },

  duplicateElement: (id) => {
    const { elements } = get();
    const el = findElementById(elements, id);
    if (!el) return;
    const newEl: Element = {
      ...JSON.parse(JSON.stringify(el)),
      id: `el-${Date.now()}`,
      x: (el.x || 0) + 20,
      y: (el.y || 0) + 20,
    };
    if (newEl.children) {
      newEl.children = newEl.children.map((c: Element) => ({
        ...c,
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }));
      newEl.childIds = newEl.children.map((c: Element) => c.id);
    }
    const finalElements = [...elements, newEl].map((e, i) => ({ ...e, zIndex: i + 1 }));
    get().setElements(finalElements);
  },

  deleteElement: (id) => {
    const { elements } = get();
    const newElements = removeElementById(elements, id);
    get().setElements(newElements);
  },

  centerElementH: (id) => {
    const { elements, canvasW } = get();
    const el = findElementById(elements, id);
    if (!el) return;
    const w = el.width || (el.type === 'text' ? 100 : 100);
    get().updateElement(id, { x: Math.round((canvasW - w) / 2) });
  },

  centerElementV: (id) => {
    const { elements, canvasH } = get();
    const el = findElementById(elements, id);
    if (!el) return;
    const h = el.height || (el.type === 'text' ? 30 : 100);
    get().updateElement(id, { y: Math.round((canvasH - h) / 2) });
  },

  setCanvasBg: (color) => set({ canvasBg: color }),
  setCanvasBgImage: (url) => set({ canvasBgImage: url }),
  setCanvasSize: (w, h) => set({ canvasW: w, canvasH: h }),

  groupElements: (ids, options) => {
    const { elements } = get();
    const selectedEls = elements.filter((e) => ids.includes(e.id));
    if (selectedEls.length === 0) return;

    const minX = Math.min(...selectedEls.map((e) => e.x));
    const minY = Math.min(...selectedEls.map((e) => e.y));
    const maxX = Math.max(...selectedEls.map((e) => (e.x + (e.width || 100))));
    const maxY = Math.max(...selectedEls.map((e) => (e.y + (e.height || 30))));
    const padding = options.padding ?? 8;

    const group: Element = {
      id: `el-${Date.now()}`,
      type: 'group',
      name: options.name || 'Group',
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      zIndex: Math.max(...selectedEls.map((e) => e.zIndex || 1)) + 1,
      flexDir: options.flexDir || 'row',
      gap: options.gap ?? 8,
      padding,
      bgColor: options.bgColor || '#ffffff',
      bgOpacity: options.bgOpacity ?? 0,
      align: options.align || 'stretch',
      justify: options.justify || 'start',
      flexWrap: options.flexWrap || 'nowrap',
      borderRadius: options.borderRadius ?? 0,
      children: selectedEls.map((e) => ({
        ...e,
        x: e.x - minX + padding,
        y: e.y - minY + padding,
      })),
      childIds: selectedEls.map((e) => `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      rotation: options.rotation || 0,
      opacity: options.opacity ?? 100,
    };

    group.children = group.children!.map((c, i) => ({ ...c, id: group.childIds![i] }));

    const remainingEls = elements.filter((e) => !ids.includes(e.id));
    get().setElements([...remainingEls, group]);
  },

  ungroupElement: (id) => {
    const { elements } = get();
    const group = elements.find((e) => e.id === id);
    if (!group || group.type !== 'group') return;

    const childEls = (group.children || []).map((child) => ({
      ...child,
      x: (child.x || 0) + (group.x || 0),
      y: (child.y || 0) + (group.y || 0),
    }));

    const newElements = elements.filter((e) => e.id !== id);
    get().setElements([...newElements, ...childEls]);
  },

  addChildToGroup: (groupId, childId) => {
    const { elements } = get();
    const child = findElementById(elements, childId);
    if (!child) return;

    const newElements = removeElementById(elements, childId);
    const group = newElements.find((e) => e.id === groupId);
    if (!group || group.type !== 'group') return;

    const newChildId = `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const updatedGroup: Element = {
      ...group,
      children: [...(group.children || []), { ...child, id: newChildId, x: 10, y: 10 }],
      childIds: [...(group.childIds || []), newChildId],
    };

    const finalElements = newElements.map((e) => (e.id === groupId ? updatedGroup : e));
    get().setElements(finalElements);
  },

  removeChildFromGroup: (groupId, childId) => {
    const { elements } = get();
    const group = findElementById(elements, groupId);
    if (!group || group.type !== 'group') return;

    const child = (group.children || []).find((c) => c.id === childId);
    if (!child) return;

    const promotedChild: Element = {
      ...child,
      x: (group.x || 0) + (child.x || 0),
      y: (group.y || 0) + (child.y || 0),
    };

    const updatedGroup: Element = {
      ...group,
      children: (group.children || []).filter((c) => c.id !== childId),
      childIds: (group.childIds || []).filter((cid) => cid !== childId),
    };

    const newElements = elements.map((e) => (e.id === groupId ? updatedGroup : e));
    get().setElements([...newElements, promotedChild]);
  },

  loadTemplateAndStickers: async (templateId) => {
    set({ isLoading: true });
    try {
      const [{ data: tplData, error: tplErr }, { data: stData }] = await Promise.all([
        supabase.from("templates").select("*").eq("id", templateId).single(),
        supabase.from("stickers").select("*"),
      ]);

      if (tplErr) { console.error(tplErr); return; }

      const stickers = stData ?? [];
      let loadedElements: Element[] = [];
      let canvasW = 400;
      let canvasH = 600;
      let canvasBg = '#ffffff';
      let canvasBgImage: string | null = null;
      let loadedDpi = DEFAULT_DPI;

      if (tplData.layout_json) {
        const layout = JSON.parse(tplData.layout_json);
        loadedElements = (layout.elements || []).map((el: any, index: number) => ({
          ...el,
          zIndex: el.zIndex ?? index + 1,
        }));
        if (layout.width) canvasW = layout.width;
        if (layout.height) canvasH = layout.height;
        if (layout.canvasBg) canvasBg = layout.canvasBg;
        if (layout.canvasBgImage) canvasBgImage = layout.canvasBgImage;
        if (layout.dpi) loadedDpi = layout.dpi;
      }

      set({
        template: tplData,
        stickers,
        elements: loadedElements,
        history: [JSON.parse(JSON.stringify(loadedElements))],
        historyIndex: 0,
        canvasW,
        canvasH,
        canvasBg,
        canvasBgImage,
        dpi: loadedDpi,
      });
    } catch (err) {
      console.error("Failed to load editor data:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateTemplateName: (name) => {
    const { template } = get();
    if (template) {
      set({ template: { ...template, name } });
    }
  },

  saveTemplate: async (templateId) => {
    const { template, elements, canvasW, canvasH, canvasBg, canvasBgImage, dpi } = get();
    if (!template) return;
    set({ isSaving: true });

    const config: TemplateConfig = { canvasW, canvasH, canvasBg, canvasBgImage, dpi };
    const htmlContent = renderTemplateHTML(elements, config);
    const layout = { width: canvasW, height: canvasH, canvasBg, canvasBgImage, dpi, elements };

    let thumbnailUrl = template.thumbnail_url || '';

    try {
      await document.fonts.ready;

      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      const root = container.querySelector('#template-root') as HTMLElement;
      if (root) {
        root.style.width = `${canvasW}px`;
        root.style.height = `${canvasH}px`;
        root.style.position = 'relative';
      }
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(root || container, {
        scale: 2,
        width: canvasW,
        height: canvasH,
        backgroundColor: canvasBg,
        logging: false,
        useCORS: true,
      });
      document.body.removeChild(container);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.7)
      );

      if (blob) {
        const fileName = `${templateId}_thumb.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("templates")
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("templates").getPublicUrl(fileName);
          thumbnailUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        }
      }
    } catch (err) {
      console.error("Thumbnail generation failed:", err);
    }

    const { error } = await supabase
      .from("templates")
      .update({
        name: template.name,
        html_content: htmlContent,
        layout_json: JSON.stringify(layout),
        thumbnail_url: thumbnailUrl,
      })
      .eq("id", templateId);

    set({ isSaving: false });

    if (error) {
      alert(error.message);
    } else {
      set({ saveSuccess: true });
      setTimeout(() => set({ saveSuccess: false }), 2000);
    }
  },
}));