import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Type,
  Image as ImageIcon,
  Layout,
  Smile,
  X,
  Undo2,
  Redo2,
  MoveUp,
  MoveDown,
  Check,
  Maximize,
  Download,
  Upload,
  Layers,
  Trash2,
  Copy,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Square,
  Columns3,
  ChevronDown,
  ChevronRight,
  Sliders,
  BoxSelect,
  FileImage,
  Loader2,
  Minus,
  Plus,
  GripVertical,
  AlignCenterHorizontal,
  AlignCenterVertical,
  Lock,
  Unlock,
} from "lucide-react";
import { Rnd } from "react-rnd";
import { useEditorStore, Element, CM_TO_PX, PX_TO_CM, PRESET_SIZES, DEFAULT_DPI } from "../store/useEditorStore";
import imageCompression from "browser-image-compression";
import JSZip from "jszip";
import * as XLSX from "xlsx";

const FONTS = [
  { name: "Inter", value: "Inter" },
  { name: "DM Sans", value: "DM Sans" },
  { name: "Playfair Display", value: "Playfair Display" },
  { name: "Merriweather", value: "Merriweather" },
  { name: "Roboto Slab", value: "Roboto Slab" },
  { name: "Oswald", value: "Oswald" },
  { name: "Nunito", value: "Nunito" },
  { name: "Arial", value: "Arial" },
  { name: "Georgia", value: "Georgia" },
  { name: "Courier New", value: "Courier New" },
  { name: "Times New Roman", value: "Times New Roman" },
];

const ALIGN_OPTIONS = [
  { icon: AlignLeft, value: "left", label: "Left" },
  { icon: AlignCenter, value: "center", label: "Center" },
  { icon: AlignRight, value: "right", label: "Right" },
];

const CASE_OPTIONS = [
  { value: "none", label: "Aa" },
  { value: "uppercase", label: "AA" },
  { value: "lowercase", label: "aa" },
];

const ASPECT_RATIOS = [
  { value: "free", label: "Free", ratio: null },
  { value: "1:1", label: "1:1", ratio: 1 },
  { value: "4:3", label: "4:3", ratio: 4 / 3 },
  { value: "3:4", label: "3:4", ratio: 3 / 4 },
  { value: "3:2", label: "3:2", ratio: 3 / 2 },
  { value: "2:3", label: "2:3", ratio: 2 / 3 },
  { value: "16:9", label: "16:9", ratio: 16 / 9 },
  { value: "9:16", label: "9:16", ratio: 9 / 16 },
];

function getMatchingRatioKey(aspectRatio: number | undefined): string {
  if (!aspectRatio) return "free";
  const match = ASPECT_RATIOS.find((r) => r.ratio !== null && Math.abs(r.ratio - aspectRatio) < 0.01);
  return match ? match.value : "custom";
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-black tracking-widest uppercase text-slate-500 mb-1">
      {children}
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-black tracking-widest uppercase text-slate-400 mt-4 mb-2 flex items-center gap-1">
      {children}
    </div>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function InlineInput({ value, onChange, type = "number", ...props }: { value: number | string; onChange: (v: any) => void; type?: string; [k: string]: any }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        if (type === "number") {
          onChange(raw === "" ? 0 : parseInt(raw));
        } else {
          const normalized = raw.replace(",", ".");
          const num = parseFloat(normalized);
          onChange(isNaN(num) ? 0 : num);
        }
      }}
      className="w-full border-2 border-slate-950 p-1.5 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-y-[1px] focus:translate-x-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all rounded"
      {...props}
    />
  );
}

const ToggleBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; title?: string }> = ({ active, onClick, children, title }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 border-2 rounded transition-all ${
        active
          ? "bg-slate-950 text-white border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          : "bg-white text-slate-950 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
      }`}
    >
      {children}
    </button>
  );

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isImageCompressOpen, setIsImageCompressOpen] = useState(false);
  const [isExportPng, setIsExportPng] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"properties" | "layers" | "canvas">("properties");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ file: File; dataUrl: string } | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [compressSettings, setCompressSettings] = useState({ maxSizeMB: 1, maxWidthOrHeight: 1920, quality: 0.8 });
  const [isCompressing, setIsCompressing] = useState(false);
  const [bgImageFile, setBgImageFile] = useState<{ file: File; dataUrl: string } | null>(null);
  const [batchStep, setBatchStep] = useState<1 | 2 | 3>(1);
  const [batchData, setBatchData] = useState<any[]>([]);
  const [batchHeaders, setBatchHeaders] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [groupOptions, setGroupOptions] = useState({ name: "Group", flexDir: "row", gap: 8, padding: 8, bgColor: "#ffffff", bgOpacity: 0, align: "stretch", justify: "start", flexWrap: "nowrap" });
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const htmlFileInputRef = useRef<HTMLInputElement>(null);
  const inlineEditRef = useRef<HTMLDivElement>(null);

  const {
    elements,
    setElements,
    updateElement,
    undo,
    redo,
    bringForward,
    sendBackward,
    duplicateElement,
    deleteElement,
    centerElementH,
    centerElementV,
    history,
    historyIndex,
    template,
    stickers,
    isLoading,
    isSaving,
    saveSuccess,
    loadTemplateAndStickers,
    updateTemplateName,
    saveTemplate,
    canvasW,
    canvasH,
    canvasBg,
    canvasBgImage,
    setCanvasBg,
    setCanvasBgImage,
    setCanvasSize,
    dpi,
    groupElements,
    ungroupElement,
    addChildToGroup,
    removeChildFromGroup,
  } = useEditorStore();

  useEffect(() => {
    if (id) {
      loadTemplateAndStickers(id);
    }
  }, [id, loadTemplateAndStickers]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          deleteElement(selectedId);
          setSelectedId(null);
        }
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setMultiSelected([]);
      }
      if (e.ctrlKey && e.key === "d" && selectedId) {
        e.preventDefault();
        duplicateElement(selectedId);
      }
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, editingTextId, deleteElement, duplicateElement, undo, redo]);

  const handleSave = () => {
    if (id) saveTemplate(id);
  };

  const addText = () => {
    const zIndex = elements.length + 1;
    setElements([
      ...elements,
      {
        id: `el-${Date.now()}`,
        type: "text",
        x: 50,
        y: 50,
        content: "New Text",
        fontSize: 24,
        color: "#000000",
        fontFamily: "Inter",
        fontWeight: "bold",
        fontStyle: "normal",
        textAlign: "left",
        textTransform: "none",
        wrapText: false,
        rotation: 0,
        opacity: 100,
        zIndex,
      },
    ]);
  };

  const addPhotoSlot = () => {
    const zIndex = elements.length + 1;
    setElements([
      ...elements,
      { id: `el-${Date.now()}`, type: "photo", x: 50, y: 50, width: 300, height: 200, rotation: 0, opacity: 100, zIndex, ratioLock: true, aspectRatio: 300 / 200 },
    ]);
  };

  const addSticker = (url: string) => {
    const zIndex = elements.length + 1;
    setElements([
      ...elements,
      { id: `el-${Date.now()}`, type: "sticker", x: 100, y: 100, width: 100, height: 100, url, rotation: 0, opacity: 100, zIndex },
    ]);
    setIsStickerPickerOpen(false);
  };

  const addImage = (dataUrl: string) => {
    const zIndex = elements.length + 1;
    setElements([
      ...elements,
      { id: `el-${Date.now()}`, type: "image", x: 50, y: 50, width: 200, height: 200, url: dataUrl, rotation: 0, opacity: 100, borderWidth: 0, borderColor: "#000000", borderRadius: 0, zIndex, ratioLock: true, aspectRatio: 1 },
    ]);
    setIsImageCompressOpen(false);
    setPendingImage(null);
    setCompressedImage(null);
  };

  const addGroup = () => {
    const zIndex = elements.length + 1;
    setElements([
      ...elements,
      {
        id: `el-${Date.now()}`,
        type: "group",
        x: 50,
        y: 50,
        width: 300,
        height: 200,
        name: groupOptions.name,
        flexDir: groupOptions.flexDir,
        gap: groupOptions.gap,
        padding: groupOptions.padding,
        bgColor: groupOptions.bgColor,
        bgOpacity: groupOptions.bgOpacity,
        align: groupOptions.align,
        justify: groupOptions.justify,
        flexWrap: groupOptions.flexWrap,
        rotation: 0,
        opacity: 100,
        children: [],
        childIds: [],
        zIndex,
      },
    ]);
    setIsGroupModalOpen(false);
    setGroupOptions({ name: "Group", flexDir: "row", gap: 8, padding: 8, bgColor: "#ffffff", bgOpacity: 0, align: "stretch", justify: "start", flexWrap: "nowrap" });
  };

  const handleGroupSelected = () => {
    if (multiSelected.length < 2) return;
    groupElements(multiSelected, {
      name: groupOptions.name,
      flexDir: groupOptions.flexDir,
      gap: groupOptions.gap,
      padding: groupOptions.padding,
      bgColor: groupOptions.bgColor,
      bgOpacity: groupOptions.bgOpacity,
      align: groupOptions.align,
      justify: groupOptions.justify,
      flexWrap: groupOptions.flexWrap,
    });
    setMultiSelected([]);
    setSelectedId(null);
    setIsGroupModalOpen(false);
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setIsExportPng(true);
    try {
      await document.fonts.ready;
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        backgroundColor: canvasBg,
        useCORS: true,
        logging: false,
        onclone: (_doc, cloned) => {
          const originalEls = canvasRef.current!.querySelectorAll("[id^='el-'], .photo-slot");
          const clonedEls = cloned.querySelectorAll("[id^='el-'], .photo-slot");
          originalEls.forEach((orig, i) => {
            const origEl = orig as HTMLElement;
            const cloneEl = clonedEls[i] as HTMLElement;
            if (!cloneEl) return;
            const computed = window.getComputedStyle(origEl);
            if (!origEl.style.width || origEl.style.width === "auto") {
              cloneEl.style.width = computed.width;
            }
            if (!origEl.style.height || origEl.style.height === "auto") {
              cloneEl.style.height = computed.height;
            }
          });
          return _doc;
        },
      });
      const link = document.createElement("a");
      link.download = "template.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export PNG failed:", err);
    } finally {
      setIsExportPng(false);
    }
  };

  const handleSaveHtml = () => {
    const layout = { width: canvasW, height: canvasH, canvasBg, canvasBgImage, elements };
    const html = `<!DOCTYPE html><html><head><meta name="canvas-designer-data" content='${JSON.stringify(layout).replace(/'/g, "&#39;")}'></head><body></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const link = document.createElement("a");
    link.download = "template.html";
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const handleLoadHtml = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const meta = doc.querySelector('meta[name="canvas-designer-data"]');
      if (meta) {
        try {
          const layout = JSON.parse(meta.getAttribute("content") || "{}");
          if (layout.elements) {
            const loaded = layout.elements.map((el: any, i: number) => ({ ...el, zIndex: el.zIndex ?? i + 1 }));
            setElements(loaded);
            if (layout.canvasBg) setCanvasBg(layout.canvasBg);
            if (layout.canvasBgImage) setCanvasBgImage(layout.canvasBgImage);
          }
        } catch (err) {
          console.error("Failed to parse HTML data:", err);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setPendingImage({ file, dataUrl });
    setCompressedImage(dataUrl);
    setIsImageCompressOpen(true);
    e.target.value = "";
  };

  const handleBgImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setCanvasBgImage(dataUrl);
    e.target.value = "";
  };

  const compressImage = async () => {
    if (!pendingImage) return;
    setIsCompressing(true);
    try {
      const compressed = await imageCompression(pendingImage.file, {
        maxSizeMB: compressSettings.maxSizeMB,
        maxWidthOrHeight: compressSettings.maxWidthOrHeight,
        initialQuality: compressSettings.quality,
        useWebWorker: true,
      });
      const dataUrl = await readFileAsDataUrl(compressed);
      setCompressedImage(dataUrl);
    } catch (err) {
      console.error("Compression failed:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleBatchFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result;
      if (file.name.endsWith(".csv")) {
        const text = data as string;
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          setBatchHeaders(parsed[0]);
          setBatchData(parsed.slice(1).filter((row) => row.some((cell) => cell.trim() !== "")));
          setBatchStep(2);
        }
      } else {
        const wb = XLSX.read(data, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
        if (json.length > 0) {
          setBatchHeaders(json[0].map(String));
          setBatchData(json.slice(1).filter((row) => row.some((cell) => String(cell).trim() !== "")) as string[][]);
          setBatchStep(2);
        }
      }
    };
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
    e.target.value = "";
  };

  const handleBatchGenerate = async () => {
    if (!canvasRef.current || batchData.length === 0) return;
    setBatchGenerating(true);
    setBatchStep(3);

    try {
      await document.fonts.ready;
      const html2canvas = (await import("html2canvas")).default;
      const zip = new JSZip();

      for (let i = 0; i < batchData.length; i++) {
        setBatchProgress(((i + 1) / batchData.length) * 100);

        await new Promise((r) => setTimeout(r, 100));

        try {
          const canvas = await html2canvas(canvasRef.current, {
            scale: 2,
            backgroundColor: canvasBg,
            useCORS: true,
            logging: false,
          });
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (blob) {
            const fileName = `output_${i + 1}`;
            zip.file(`${fileName}.png`, blob);
          }
        } catch (err) {
          console.error(`Failed to render row ${i + 1}:`, err);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.download = "batch_output.zip";
      link.href = URL.createObjectURL(content);
      link.click();
    } catch (err) {
      console.error("Batch generation failed:", err);
    } finally {
      setBatchGenerating(false);
      setBatchStep(1);
      setBatchProgress(0);
      setIsBatchModalOpen(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedId(null);
      setMultiSelected([]);
    }
  };

  const handleElementClick = (e: React.MouseEvent, elId: string) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setMultiSelected((prev) => {
        if (prev.includes(elId)) return prev.filter((id) => id !== elId);
        return [...prev, elId];
      });
    } else {
      setMultiSelected([]);
    }
    setSelectedId(elId);
  };

  const handleDoubleClickText = (elId: string) => {
    setEditingTextId(elId);
    setTimeout(() => {
      if (inlineEditRef.current) {
        inlineEditRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(inlineEditRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 50);
  };

  const handleInlineEditBlur = () => {
    if (editingTextId) {
      const text = inlineEditRef.current?.innerText || "";
      updateElement(editingTextId, { content: text });
      setEditingTextId(null);
    }
  };

  const selectedEl = selectedId ? findElementById(elements, selectedId) : null;

  // ==================== RENDER ELEMENT ====================
  const renderElement = (el: Element) => {
    const isSelected = selectedId === el.id;
    const isMultiSelected = multiSelected.includes(el.id);
    const isEditing = editingTextId === el.id;
    const opacity = (el.opacity ?? 100) / 100;
    const rotation = el.rotation || 0;

    const commonStyle: React.CSSProperties = {
      zIndex: el.zIndex || 1,
      opacity,
      transform: rotation ? `rotate(${rotation}deg)` : undefined,
    };

    const selectionClass = isSelected
      ? "ring-4 ring-blue-500 shadow-[4px_4px_0px_0px_rgba(59,130,246,1)]"
      : isMultiSelected
      ? "ring-2 ring-blue-300 ring-offset-2"
      : "";

    if (el.type === "photo") {
      const photoSlotIndex = elements.filter((e) => e.type === "photo").findIndex((e) => e.id === el.id) + 1;
      return (
        <Rnd
          key={el.id}
          size={{ width: el.width!, height: el.height! }}
          position={{ x: el.x, y: el.y }}
          onDragStop={(_e, d) => updateElement(el.id, { x: d.x, y: d.y })}
          onResizeStop={(_e, _dir, ref, _delta, pos) => {
            const newW = parseInt(ref.style.width, 10);
            const newH = parseInt(ref.style.height, 10);
            const updates: Partial<Element> = { width: newW, height: newH, ...pos };
            if (el.ratioLock && newW > 0 && newH > 0) {
              updates.aspectRatio = newW / newH;
            }
            updateElement(el.id, updates);
          }}
          lockAspectRatio={el.ratioLock ? el.aspectRatio : undefined}
          bounds="parent"
          onClick={(e) => handleElementClick(e, el.id)}
          className={`${selectionClass} ${dragOverGroup === el.id ? "ring-2 ring-green-500" : ""}`}
          enableResizing={true}
          style={commonStyle}
          data-element-id={el.id}
        >
          <div
            className="w-full h-full flex items-center justify-center text-slate-400 overflow-hidden relative group"
            style={{
              backgroundColor: "#e2e8f0",
              borderRadius: el.borderRadius || 0,
              borderWidth: el.borderWidth || 0,
              borderColor: el.borderColor || "#000000",
              borderStyle: el.borderWidth ? "solid" : undefined,
              ...(el.borderWidth === 0 || !el.borderWidth
                ? { outline: "2px dashed #cbd5e1", outlineOffset: "-2px" }
                : {}),
              ...(el.shadowEnabled ? { boxShadow: `${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur || 0}px rgba(0,0,0,${((el.shadowOpacity ?? 100) / 100)})` } : {}),
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-black text-slate-500" style={{ fontFamily: "Inter, sans-serif" }}>{photoSlotIndex}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Photo {photoSlotIndex}</span>
            </div>
            <div className="absolute inset-0 bg-slate-950 opacity-0 group-hover:opacity-10 transition-opacity" />
          </div>
        </Rnd>
      );
    }

    if (el.type === "text") {
      const textStyle: React.CSSProperties = {
        fontSize: el.fontSize,
        color: el.color,
        fontFamily: el.fontFamily ? `'${el.fontFamily}', sans-serif` : undefined,
        fontWeight: el.fontWeight || "bold",
        fontStyle: el.fontStyle || "normal",
        textAlign: el.textAlign as any,
        textTransform: el.textTransform !== "none" ? el.textTransform : undefined,
        whiteSpace: el.wrapText ? "pre-wrap" : "nowrap",
        ...(el.width ? { width: el.width } : {}),
      };

      return (
        <Rnd
          key={el.id}
          size={el.width ? { width: el.width, height: el.height || "auto" } : undefined}
          position={{ x: el.x, y: el.y }}
          onDragStop={(_e, d) => updateElement(el.id, { x: d.x, y: d.y })}
          onResizeStop={(_e, _dir, ref, _delta, pos) => {
            updateElement(el.id, { width: parseInt(ref.style.width, 10), ...pos });
          }}
          bounds="parent"
          onClick={(e) => handleElementClick(e, el.id)}
          onDoubleClick={() => handleDoubleClickText(el.id)}
          className={`${selectionClass} ${el.wrapText ? "" : ""}`}
          enableResizing={!!el.width}
          style={commonStyle}
          data-element-id={el.id}
        >
          {isEditing ? (
            <div
              ref={inlineEditRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={handleInlineEditBlur}
              style={textStyle}
              className="font-black tracking-tight cursor-text outline-none min-w-[50px] min-h-[1em]"
            >
              {el.content}
            </div>
          ) : (
            <div style={textStyle} className="font-black tracking-tight cursor-text min-w-[50px] min-h-[1em]">
              {el.content}
            </div>
          )}
        </Rnd>
      );
    }

    if (el.type === "sticker") {
      return (
        <Rnd
          key={el.id}
          size={{ width: el.width!, height: el.height! }}
          position={{ x: el.x, y: el.y }}
          onDragStop={(_e, d) => updateElement(el.id, { x: d.x, y: d.y })}
          onResizeStop={(_e, _dir, ref, _delta, pos) => {
            updateElement(el.id, { width: parseInt(ref.style.width, 10), height: parseInt(ref.style.height, 10), ...pos });
          }}
          bounds="parent"
          onClick={(e) => handleElementClick(e, el.id)}
          className={selectionClass}
          enableResizing={true}
          style={commonStyle}
          data-element-id={el.id}
        >
          <div
            className="w-full h-full"
            style={{
              borderRadius: el.borderRadius || 0,
              ...(el.borderWidth ? { borderWidth: el.borderWidth, borderColor: el.borderColor || "#000000", borderStyle: "solid" } : {}),
              ...(el.shadowEnabled ? { boxShadow: `${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur || 0}px rgba(0,0,0,${((el.shadowOpacity ?? 100) / 100)})` } : {}),
            }}
          >
            <img src={el.url} alt="Sticker" className="w-full h-full object-contain pointer-events-none" draggable={false} />
          </div>
        </Rnd>
      );
    }

    if (el.type === "image") {
      return (
        <Rnd
          key={el.id}
          size={{ width: el.width!, height: el.height! }}
          position={{ x: el.x, y: el.y }}
          onDragStop={(_e, d) => updateElement(el.id, { x: d.x, y: d.y })}
          onResizeStop={(_e, _dir, ref, _delta, pos) => {
            const newW = parseInt(ref.style.width, 10);
            const newH = parseInt(ref.style.height, 10);
            const updates: Partial<Element> = { width: newW, height: newH, ...pos };
            if (el.ratioLock && newW > 0 && newH > 0) {
              updates.aspectRatio = newW / newH;
            }
            updateElement(el.id, updates);
          }}
          lockAspectRatio={el.ratioLock ? el.aspectRatio : undefined}
          bounds="parent"
          onClick={(e) => handleElementClick(e, el.id)}
          className={selectionClass}
          enableResizing={true}
          style={commonStyle}
          data-element-id={el.id}
        >
          <img
            src={el.url}
            alt="Image"
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
            style={{
              borderRadius: el.borderRadius || 0,
              borderWidth: el.borderWidth || 0,
              borderColor: el.borderColor || "#000000",
              borderStyle: el.borderWidth ? "solid" : undefined,
              ...(el.shadowEnabled ? { boxShadow: `${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur || 0}px rgba(0,0,0,${((el.shadowOpacity ?? 100) / 100)})` } : {}),
            }}
          />
        </Rnd>
      );
    }

    if (el.type === "group") {
      return (
        <Rnd
          key={el.id}
          size={{ width: el.width || 200, height: el.height || 200 }}
          position={{ x: el.x, y: el.y }}
          onDragStop={(_e, d) => updateElement(el.id, { x: d.x, y: d.y })}
          onResizeStop={(_e, _dir, ref, _delta, pos) => {
            updateElement(el.id, { width: parseInt(ref.style.width, 10), height: parseInt(ref.style.height, 10), ...pos });
          }}
          bounds="parent"
          onClick={(e) => handleElementClick(e, el.id)}
          className={selectionClass}
          enableResizing={true}
          style={commonStyle}
          data-element-id={el.id}
        >
          <div
            className="w-full h-full"
            style={{
              display: "flex",
              flexDirection: el.flexDir || "row",
              gap: el.gap ?? 8,
              padding: el.padding ?? 8,
              alignItems: el.align || "stretch",
              justifyContent: el.justify || "start",
              flexWrap: el.flexWrap === "wrap" ? "wrap" : "nowrap",
              backgroundColor: el.bgColor || "transparent",
              borderRadius: el.borderRadius || 0,
              ...(el.bgOpacity !== undefined && el.bgOpacity < 100 ? { opacity: el.bgOpacity / 100 } : {}),
              outline: "2px dashed #94a3b8",
              outlineOffset: "-2px",
            }}
          >
            {(el.children || []).map((child) => (
              <div
                key={child.id}
                className={`border border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-500 p-1 cursor-pointer hover:border-slate-500 transition-colors ${
                  selectedId === child.id ? "border-blue-500 bg-blue-50" : ""
                }`}
                style={{
                  width: child.width || "auto",
                  height: child.height || "auto",
                  minWidth: child.type === "text" ? "40px" : undefined,
                  fontSize: child.fontSize,
                  color: child.color,
                  fontFamily: child.fontFamily ? `'${child.fontFamily}', sans-serif` : undefined,
                  fontWeight: child.fontWeight,
                  fontStyle: child.fontStyle,
                  textAlign: child.textAlign as any,
                  textTransform: child.textTransform !== "none" ? child.textTransform : undefined,
                  overflow: "hidden",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(child.id);
                }}
              >
                {child.type === "text" ? child.content : child.type === "image" ? "🖼" : child.type === "photo" ? "📷" : child.type === "sticker" ? "😀" : child.name || "Group"}
              </div>
            ))}
            {(!el.children || el.children.length === 0) && (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold">Drop elements here</div>
            )}
          </div>
        </Rnd>
      );
    }

    return null;
  };

  // ==================== LOADING ====================
  if (isLoading || !template)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-xl font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading editor...</div>
      </div>
    );

  // ==================== MAIN RENDER ====================
  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden w-full">
      {/* ====== TOP TOOLBAR ====== */}
      <div className="bg-white border-b-2 border-slate-950 px-4 py-3 flex justify-between items-center flex-shrink-0 gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/templates")}
            className="w-9 h-9 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <ArrowLeft size={18} className="text-slate-950" />
          </button>
          <input
            type="text"
            value={template.name}
            onChange={(e) => updateTemplateName(e.target.value)}
            className="font-black text-lg tracking-tight uppercase outline-none focus:bg-slate-100 px-2 py-1 rounded border-2 border-transparent focus:border-slate-950 transition-all w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 mr-2 bg-slate-100 rounded border-2 border-slate-950 px-2 py-1">
            <button onClick={() => setZoom(Math.max(0.25, zoom - 0.1))} className="p-1 hover:bg-slate-200 rounded transition-colors">
              <Minus size={14} />
            </button>
            <span className="text-xs font-black w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-1 hover:bg-slate-200 rounded transition-colors">
              <Plus size={14} />
            </button>
            <button onClick={() => setZoom(1)} className="p-1 hover:bg-slate-200 rounded transition-colors text-[10px] font-black" title="Reset zoom">
              <Maximize size={14} />
            </button>
          </div>

          <button onClick={handleExportPng} disabled={isExportPng} className="font-black uppercase tracking-widest text-xs px-3 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-slate-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1 disabled:opacity-50">
            <Download size={14} /> {isExportPng ? "..." : "PNG"}
          </button>
          <button onClick={() => setIsBatchModalOpen(true)} className="font-black uppercase tracking-widest text-xs px-3 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-slate-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1">
            <Columns3 size={14} /> Batch
          </button>
          <button onClick={handleSaveHtml} className="font-black uppercase tracking-widest text-xs px-3 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-slate-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1">
            <Upload size={14} /> HTML
          </button>
          <label className="font-black uppercase tracking-widest text-xs px-3 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-slate-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1 cursor-pointer">
            <Download size={14} /> Load
            <input ref={htmlFileInputRef} type="file" accept=".html" className="hidden" onChange={handleLoadHtml} />
          </label>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`font-black uppercase tracking-widest text-xs px-4 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center gap-1 ${
              saveSuccess ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-blue-600 text-white hover:bg-blue-500"
            } disabled:opacity-60`}
          >
            {saveSuccess ? <Check size={14} /> : <Save size={14} />}
            <span>{saveSuccess ? "Saved!" : isSaving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ====== LEFT SIDEBAR ====== */}
        <div className="w-16 bg-white border-r-2 border-slate-950 flex flex-col items-center py-4 space-y-3 flex-shrink-0">
          <button onClick={addText} className="w-10 h-10 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center text-slate-950" title="Add Text">
            <Type size={18} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center text-slate-950" title="Add Image">
            <ImageIcon size={18} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          <button onClick={addPhotoSlot} className="w-10 h-10 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center text-slate-950" title="Photo Slot">
            <Square size={18} />
          </button>
          <button onClick={() => setIsStickerPickerOpen(true)} className="w-10 h-10 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center text-slate-950" title="Add Sticker">
            <Smile size={18} />
          </button>
          <button onClick={() => setIsGroupModalOpen(true)} className="w-10 h-10 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center text-slate-950" title="Add Group">
            <BoxSelect size={18} />
          </button>

          <div className="w-10 h-0.5 bg-slate-200" />

          <button onClick={undo} disabled={historyIndex === 0} className={`w-10 h-10 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${historyIndex === 0 ? "opacity-30 shadow-none translate-x-[2px] translate-y-[2px]" : "hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-slate-950"}`} title="Undo">
            <Undo2 size={18} />
          </button>
          <button onClick={redo} disabled={historyIndex === history.length - 1} className={`w-10 h-10 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${historyIndex === history.length - 1 ? "opacity-30 shadow-none translate-x-[2px] translate-y-[2px]" : "hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-slate-950"}`} title="Redo">
            <Redo2 size={18} />
          </button>

          {selectedId && (
            <>
              <div className="w-10 h-0.5 bg-slate-200" />
              <button onClick={() => selectedId && duplicateElement(selectedId)} className="w-10 h-10 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center text-slate-950" title="Duplicate">
                <Copy size={18} />
              </button>
              <button onClick={() => { deleteElement(selectedId); setSelectedId(null); }} className="w-10 h-10 bg-red-500 text-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-400 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center" title="Delete">
                <Trash2 size={18} />
              </button>
            </>
          )}

          {multiSelected.length >= 2 && (
            <button onClick={() => setIsGroupModalOpen(true)} className="w-10 h-10 bg-yellow-400 text-slate-950 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center" title="Group Selected">
              <BoxSelect size={18} />
            </button>
          )}
        </div>

        {/* ====== CANVAS AREA ====== */}
        <div ref={canvasAreaRef} className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8" onClick={() => { setSelectedId(null); setMultiSelected([]); }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.2s" }}>
            <div
              ref={canvasRef}
              className="relative overflow-hidden border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              style={{
                width: canvasW,
                height: canvasH,
                backgroundColor: canvasBg,
                ...(canvasBgImage ? { backgroundImage: `url('${canvasBgImage}')`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
              }}
              onClick={handleCanvasClick}
            >
              {elements.map(renderElement)}
            </div>
          </div>

          {/* Multi-select bar */}
          {multiSelected.length >= 2 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-4 py-3 flex items-center gap-3 z-30">
              <span className="text-xs font-black uppercase tracking-widest">{multiSelected.length} selected</span>
              <button onClick={() => setIsGroupModalOpen(true)} className="font-black uppercase tracking-widest text-xs px-3 py-1.5 bg-yellow-400 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                Group
              </button>
              <button onClick={() => { multiSelected.forEach((id) => deleteElement(id)); setMultiSelected([]); setSelectedId(null); }} className="font-black uppercase tracking-widest text-xs px-3 py-1.5 bg-red-500 text-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-400 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                Delete
              </button>
              <button onClick={() => setMultiSelected([])} className="p-1 hover:bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ====== RIGHT SIDEBAR ====== */}
        <div className="w-72 bg-white border-l-2 border-slate-950 flex flex-col z-20 flex-shrink-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b-2 border-slate-950 flex-shrink-0">
            {[
              { key: "properties" as const, icon: Sliders, label: "Props" },
              { key: "layers" as const, icon: Layers, label: "Layers" },
              { key: "canvas" as const, icon: Square, label: "Canvas" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.key ? "bg-white text-slate-950 border-b-2 border-slate-950 -mb-[2px]" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* ====== PROPERTIES TAB ====== */}
            {activeTab === "properties" && (
              <>
                {selectedEl ? (
                  <div className="flex-1 overflow-y-auto">
                    {/* Type badge */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-100">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {selectedEl.type.charAt(0).toUpperCase() + selectedEl.type.slice(1)}
                      </span>
                      {selectedEl.type === "group" && (
                        <button onClick={() => { ungroupElement(selectedId!); setSelectedId(null); }} className="text-[10px] font-black uppercase tracking-widest text-yellow-700 bg-yellow-100 border border-yellow-400 px-2 py-0.5 rounded hover:bg-yellow-200 transition-colors">
                          Ungroup
                        </button>
                      )}
                    </div>

                    {/* Layer controls */}
                    <div className="mb-4 pb-3 border-b-2 border-slate-100 flex gap-2">
                      <button onClick={() => bringForward(selectedId!)} className="flex-1 bg-white border-2 border-slate-950 py-1.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-1 text-[10px] font-black uppercase">
                        <MoveUp size={12} /> Forward
                      </button>
                      <button onClick={() => sendBackward(selectedId!)} className="flex-1 bg-white border-2 border-slate-950 py-1.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-1 text-[10px] font-black uppercase">
                        <MoveDown size={12} /> Back
                      </button>
                    </div>

                    {/* Center H/V */}
                    <div className="mb-4 pb-3 border-b-2 border-slate-100 flex gap-2">
                      <button onClick={() => centerElementH(selectedId!)} className="flex-1 bg-white border-2 border-slate-950 py-1.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-1 text-[10px] font-black uppercase">
                        <AlignCenterHorizontal size={12} /> Center H
                      </button>
                      <button onClick={() => centerElementV(selectedId!)} className="flex-1 bg-white border-2 border-slate-950 py-1.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-1 text-[10px] font-black uppercase">
                        <AlignCenterVertical size={12} /> Center V
                      </button>
                    </div>

                    {/* --- Position --- */}
                    <SectionLabel>Position & Size</SectionLabel>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <PropRow label="X">
                        <InlineInput value={Math.round(selectedEl.x)} onChange={(v: number) => updateElement(selectedId!, { x: v })} />
                      </PropRow>
                      <PropRow label="Y">
                        <InlineInput value={Math.round(selectedEl.y)} onChange={(v: number) => updateElement(selectedId!, { y: v })} />
                      </PropRow>
                    </div>
                    {(selectedEl.type !== "text" || selectedEl.width) && (
                      <div className="mb-3">
                        {["image", "photo"].includes(selectedEl.type) ? (
                          <div className="flex items-end gap-1">
                            <div className="flex-1">
                              <Label>W</Label>
                              <InlineInput value={Math.round(selectedEl.width || 0)} onChange={(v: number) => {
                                if (selectedEl.ratioLock && selectedEl.aspectRatio) {
                                  const newH = Math.round(v / selectedEl.aspectRatio);
                                  updateElement(selectedId!, { width: v, height: newH });
                                } else {
                                  updateElement(selectedId!, { width: v });
                                }
                              }} />
                            </div>
                            <button
                              title={selectedEl.ratioLock ? "Unlock aspect ratio" : "Lock aspect ratio"}
                              onClick={() => {
                                const newLock = !selectedEl.ratioLock;
                                const updates: Partial<Element> = { ratioLock: newLock };
                                if (newLock && selectedEl.width && selectedEl.height) {
                                  updates.aspectRatio = selectedEl.width / selectedEl.height;
                                }
                                updateElement(selectedId!, updates);
                              }}
                              className={`mb-0.5 p-2 border-2 rounded transition-all shrink-0 ${
                                selectedEl.ratioLock
                                  ? "bg-slate-950 text-white border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                  : "bg-white text-slate-950 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                              }`}
                            >
                              {selectedEl.ratioLock ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                            <div className="flex-1">
                              <Label>H</Label>
                              <InlineInput value={Math.round(selectedEl.height || 0)} onChange={(v: number) => {
                                if (selectedEl.ratioLock && selectedEl.aspectRatio) {
                                  const newW = Math.round(v * selectedEl.aspectRatio);
                                  updateElement(selectedId!, { width: newW, height: v });
                                } else {
                                  updateElement(selectedId!, { height: v });
                                }
                              }} />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <PropRow label="W">
                              <InlineInput value={Math.round(selectedEl.width || 0)} onChange={(v: number) => updateElement(selectedId!, { width: v })} />
                            </PropRow>
                            <PropRow label="H">
                              <InlineInput value={Math.round(selectedEl.height || 0)} onChange={(v: number) => updateElement(selectedId!, { height: v })} />
                            </PropRow>
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- Rotation & Opacity --- */}
                    <SectionLabel>Transform</SectionLabel>
                    <PropRow label={`Rotation: ${selectedEl.rotation || 0}deg`}>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={selectedEl.rotation || 0}
                        onChange={(e) => updateElement(selectedId!, { rotation: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </PropRow>
                    <PropRow label={`Opacity: ${selectedEl.opacity ?? 100}%`}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={selectedEl.opacity ?? 100}
                        onChange={(e) => updateElement(selectedId!, { opacity: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </PropRow>

                    {/* ===== TEXT PROPERTIES ===== */}
                    {selectedEl.type === "text" && (
                      <>
                        <SectionLabel>Text</SectionLabel>
                        <PropRow label="Content">
                          <textarea
                            value={selectedEl.content || ""}
                            onChange={(e) => updateElement(selectedId!, { content: e.target.value })}
                            className="w-full border-2 border-slate-950 p-2 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-y-[1px] focus:translate-x-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all rounded resize-none h-16"
                          />
                        </PropRow>
                        <PropRow label="Font Family">
                          <select
                            value={selectedEl.fontFamily || "Inter"}
                            onChange={(e) => updateElement(selectedId!, { fontFamily: e.target.value })}
                            className="w-full border-2 border-slate-950 p-2 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded"
                          >
                            {FONTS.map((f) => (
                              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>
                            ))}
                          </select>
                        </PropRow>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <PropRow label="Font Size">
                            <InlineInput value={selectedEl.fontSize || 24} onChange={(v: number) => updateElement(selectedId!, { fontSize: v })} />
                          </PropRow>
                          <PropRow label="Width (auto ok)">
                            <InlineInput value={selectedEl.width || ""} onChange={(v: number) => updateElement(selectedId!, { width: v || undefined })} />
                          </PropRow>
                        </div>

                        {/* Bold & Italic & Color */}
                        <div className="flex items-center gap-2 mb-3">
                          <Label>Style</Label>
                        </div>
                        <div className="flex gap-1 mb-3">
                          <ToggleBtn active={selectedEl.fontWeight === "bold"} onClick={() => updateElement(selectedId!, { fontWeight: selectedEl.fontWeight === "bold" ? "normal" : "bold" })} title="Bold">
                            <Bold size={14} />
                          </ToggleBtn>
                          <ToggleBtn active={selectedEl.fontStyle === "italic"} onClick={() => updateElement(selectedId!, { fontStyle: selectedEl.fontStyle === "italic" ? "normal" : "italic" })} title="Italic">
                            <Italic size={14} />
                          </ToggleBtn>
                          <div className="flex-1" />
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={selectedEl.color || "#000000"}
                              onChange={(e) => updateElement(selectedId!, { color: e.target.value })}
                              className="w-8 h-8 p-0 border-2 border-slate-950 rounded cursor-pointer"
                            />
                            <span className="font-mono font-bold text-[10px] text-slate-500">{selectedEl.color}</span>
                          </div>
                        </div>

                        {/* Alignment */}
                        <Label>Align</Label>
                        <div className="flex gap-1 mb-3 mt-1">
                          {ALIGN_OPTIONS.map((opt) => (
                            <ToggleBtn key={opt.value} active={selectedEl.textAlign === opt.value} onClick={() => updateElement(selectedId!, { textAlign: opt.value })} title={opt.label}>
                              <opt.icon size={14} />
                            </ToggleBtn>
                          ))}
                        </div>

                        {/* Text Case */}
                        <Label>Case</Label>
                        <div className="flex gap-1 mb-3 mt-1">
                          {CASE_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateElement(selectedId!, { textTransform: opt.value })}
                              className={`px-2 py-1.5 text-[10px] font-black uppercase border-2 rounded transition-all ${
                                selectedEl.textTransform === opt.value
                                  ? "bg-slate-950 text-white border-slate-950"
                                  : "bg-white text-slate-950 border-slate-950 hover:bg-slate-50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {/* Wrap */}
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="checkbox"
                            id="wrapText"
                            checked={selectedEl.wrapText || false}
                            onChange={(e) => updateElement(selectedId!, { wrapText: e.target.checked })}
                            className="accent-blue-600"
                          />
                          <label htmlFor="wrapText" className="text-xs font-bold">Wrap Text</label>
                        </div>
                      </>
                    )}

                    {/* ===== PHOTO SLOT PROPERTIES ===== */}
                    {selectedEl.type === "photo" && (
                      <>
                        <SectionLabel>Photo Slot</SectionLabel>
                        <PropRow label="Aspect Ratio">
                          <select
                            value={getMatchingRatioKey(selectedEl.aspectRatio)}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "free") {
                                updateElement(selectedId!, { ratioLock: false, aspectRatio: undefined });
                              } else {
                                const preset = ASPECT_RATIOS.find((r) => r.value === val);
                                if (preset && preset.ratio !== null) {
                                  const currentW = selectedEl.width || 300;
                                  const newH = Math.round(currentW / preset.ratio);
                                  updateElement(selectedId!, { ratioLock: true, aspectRatio: preset.ratio, height: newH });
                                }
                              }
                            }}
                            className="w-full border-2 border-slate-950 p-2 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded"
                          >
                            {ASPECT_RATIOS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                            {getMatchingRatioKey(selectedEl.aspectRatio) === "custom" && (
                              <option value="custom" disabled>Custom ({(selectedEl.aspectRatio || 1).toFixed(2)})</option>
                            )}
                          </select>
                        </PropRow>
                        <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded-xl">
                          <p className="text-xs font-bold text-yellow-800">Drag corners or edges on the canvas to resize. This slot will be filled with the captured photo.</p>
                        </div>
                      </>
                    )}

                    {/* ===== STICKER PROPERTIES ===== */}
                    {selectedEl.type === "sticker" && (
                      <>
                        <SectionLabel>Sticker</SectionLabel>
                        <div className="bg-blue-50 border-2 border-blue-400 p-3 rounded-xl">
                          <p className="text-xs font-bold text-blue-800">Resize the sticker using the corner handles on the canvas.</p>
                        </div>
                      </>
                    )}

                    {/* ===== IMAGE PROPERTIES ===== */}
                    {selectedEl.type === "image" && (
                      <>
                        <SectionLabel>Image</SectionLabel>
                        <PropRow label="Aspect Ratio">
                          <select
                            value={getMatchingRatioKey(selectedEl.aspectRatio)}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "free") {
                                updateElement(selectedId!, { ratioLock: false, aspectRatio: undefined });
                              } else {
                                const preset = ASPECT_RATIOS.find((r) => r.value === val);
                                if (preset && preset.ratio !== null) {
                                  const currentW = selectedEl.width || 200;
                                  const newH = Math.round(currentW / preset.ratio);
                                  updateElement(selectedId!, { ratioLock: true, aspectRatio: preset.ratio, height: newH });
                                }
                              }
                            }}
                            className="w-full border-2 border-slate-950 p-2 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded"
                          >
                            {ASPECT_RATIOS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                            {getMatchingRatioKey(selectedEl.aspectRatio) === "custom" && (
                              <option value="custom" disabled>Custom ({(selectedEl.aspectRatio || 1).toFixed(2)})</option>
                            )}
                          </select>
                        </PropRow>
                      </>
                    )}

                    {/* ===== BORDER & SHADOW (for photo, image, sticker) ===== */}
                    {["photo", "image", "sticker"].includes(selectedEl.type) && (
                      <>
                        <SectionLabel>Border</SectionLabel>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <PropRow label="Width">
                            <InlineInput value={selectedEl.borderWidth || 0} onChange={(v: number) => updateElement(selectedId!, { borderWidth: v })} />
                          </PropRow>
                          <PropRow label="Color">
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                value={selectedEl.borderColor || "#000000"}
                                onChange={(e) => updateElement(selectedId!, { borderColor: e.target.value })}
                                className="w-8 h-8 p-0 border-2 border-slate-950 rounded cursor-pointer"
                              />
                            </div>
                          </PropRow>
                        </div>
                        <PropRow label={`Border Radius: ${selectedEl.borderRadius || 0}px`}>
                          <input type="range" min={0} max={200} value={selectedEl.borderRadius || 0} onChange={(e) => updateElement(selectedId!, { borderRadius: parseInt(e.target.value) })} className="w-full" />
                        </PropRow>

                        <SectionLabel>Shadow</SectionLabel>
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="checkbox"
                            id="shadowEnabled"
                            checked={selectedEl.shadowEnabled || false}
                            onChange={(e) => updateElement(selectedId!, { shadowEnabled: e.target.checked })}
                            className="accent-blue-600"
                          />
                          <label htmlFor="shadowEnabled" className="text-xs font-bold">Enable Shadow</label>
                        </div>
                        {selectedEl.shadowEnabled && (
                          <div className="space-y-2 mb-3">
                            <div className="grid grid-cols-2 gap-2">
                              <PropRow label="Blur">
                                <InlineInput value={selectedEl.shadowBlur || 0} onChange={(v: number) => updateElement(selectedId!, { shadowBlur: v })} />
                              </PropRow>
                              <PropRow label="Color">
                                <input type="color" value={selectedEl.shadowColor || "#000000"} onChange={(e) => updateElement(selectedId!, { shadowColor: e.target.value })} className="w-8 h-8 p-0 border-2 border-slate-950 rounded cursor-pointer" />
                              </PropRow>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <PropRow label="Offset X">
                                <InlineInput value={selectedEl.shadowOffsetX || 0} onChange={(v: number) => updateElement(selectedId!, { shadowOffsetX: v })} />
                              </PropRow>
                              <PropRow label="Offset Y">
                                <InlineInput value={selectedEl.shadowOffsetY || 0} onChange={(v: number) => updateElement(selectedId!, { shadowOffsetY: v })} />
                              </PropRow>
                              <PropRow label="Opacity%">
                                <InlineInput value={selectedEl.shadowOpacity ?? 100} onChange={(v: number) => updateElement(selectedId!, { shadowOpacity: v })} />
                              </PropRow>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* ===== GROUP PROPERTIES ===== */}
                    {selectedEl.type === "group" && (
                      <>
                        <SectionLabel>Group</SectionLabel>
                        <PropRow label="Name">
                          <InlineInput value={selectedEl.name || ""} onChange={(v: string) => updateElement(selectedId!, { name: v })} type="text" />
                        </PropRow>
                        <PropRow label="Background Color">
                          <div className="flex items-center gap-2">
                            <input type="color" value={selectedEl.bgColor || "#ffffff"} onChange={(e) => updateElement(selectedId!, { bgColor: e.target.value })} className="w-8 h-8 p-0 border-2 border-slate-950 rounded cursor-pointer" />
                            <span className="font-mono font-bold text-[10px] text-slate-500">{selectedEl.bgColor}</span>
                          </div>
                        </PropRow>
                        <PropRow label={`BG Opacity: ${selectedEl.bgOpacity ?? 0}%`}>
                          <input type="range" min={0} max={100} value={selectedEl.bgOpacity ?? 0} onChange={(e) => updateElement(selectedId!, { bgOpacity: parseInt(e.target.value) })} className="w-full" />
                        </PropRow>
                        <PropRow label={`Border Radius: ${selectedEl.borderRadius || 0}px`}>
                          <input type="range" min={0} max={200} value={selectedEl.borderRadius || 0} onChange={(e) => updateElement(selectedId!, { borderRadius: parseInt(e.target.value) })} className="w-full" />
                        </PropRow>
                        <PropRow label="Padding">
                          <InlineInput value={selectedEl.padding ?? 8} onChange={(v: number) => updateElement(selectedId!, { padding: v })} />
                        </PropRow>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <PropRow label="Flex Dir">
                            <select value={selectedEl.flexDir || "row"} onChange={(e) => updateElement(selectedId!, { flexDir: e.target.value })} className="w-full border-2 border-slate-950 p-1.5 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded">
                              <option value="row">Row →</option>
                              <option value="column">Column ↓</option>
                            </select>
                          </PropRow>
                          <PropRow label="Gap">
                            <InlineInput value={selectedEl.gap ?? 8} onChange={(v: number) => updateElement(selectedId!, { gap: v })} />
                          </PropRow>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <PropRow label="Align">
                            <select value={selectedEl.align || "stretch"} onChange={(e) => updateElement(selectedId!, { align: e.target.value })} className="w-full border-2 border-slate-950 p-1.5 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded">
                              <option value="stretch">Stretch</option>
                              <option value="flex-start">Start</option>
                              <option value="center">Center</option>
                              <option value="flex-end">End</option>
                            </select>
                          </PropRow>
                          <PropRow label="Justify">
                            <select value={selectedEl.justify || "start"} onChange={(e) => updateElement(selectedId!, { justify: e.target.value })} className="w-full border-2 border-slate-950 p-1.5 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded">
                              <option value="flex-start">Start</option>
                              <option value="center">Center</option>
                              <option value="flex-end">End</option>
                              <option value="space-between">Between</option>
                              <option value="space-around">Around</option>
                            </select>
                          </PropRow>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <input type="checkbox" id="flexWrap" checked={selectedEl.flexWrap === "wrap"} onChange={(e) => updateElement(selectedId!, { flexWrap: e.target.checked ? "wrap" : "nowrap" })} className="accent-blue-600" />
                          <label htmlFor="flexWrap" className="text-xs font-bold">Wrap</label>
                        </div>

                        {/* Children list */}
                        <SectionLabel>Children ({(selectedEl.children || []).length})</SectionLabel>
                        {(selectedEl.children || []).length === 0 && (
                          <p className="text-xs text-slate-400 italic mb-3">No children yet. Add elements from the canvas.</p>
                        )}
                        <div className="space-y-1 mb-3">
                          {(selectedEl.children || []).map((child) => (
                            <div
                              key={child.id}
                              className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs"
                            >
                              <span className="font-bold truncate flex-1">
                                {child.type === "text" ? child.content : child.type}
                              </span>
                              <button
                                onClick={() => removeChildFromGroup(selectedId!, child.id)}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add from canvas */}
                        <Label>Add from Canvas</Label>
                        <select
                          className="w-full border-2 border-slate-950 p-1.5 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded mb-1"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              addChildToGroup(selectedId!, e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Select element...</option>
                          {elements
                            .filter((el) => el.id !== selectedId && el.type !== "group")
                            .map((el) => (
                              <option key={el.id} value={el.id}>
                                {el.type === "text" ? `Text: "${(el.content || "").slice(0, 20)}"` : el.type}
                              </option>
                            ))}
                        </select>
                      </>
                    )}

                    {/* Delete */}
                    <div className="mt-4 pt-4 border-t-2 border-slate-100">
                      <button
                        onClick={() => { deleteElement(selectedId!); setSelectedId(null); }}
                        className="w-full text-white bg-red-600 font-black uppercase tracking-widest text-xs px-4 py-2.5 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                    <Layout size={48} className="mb-4 text-slate-300" />
                    <p className="text-slate-500 font-bold text-sm">
                      Select an element on the canvas
                      <br />
                      to edit properties.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ====== LAYERS TAB ====== */}
            {activeTab === "layers" && (
              <div className="space-y-1">
                {elements
                  .slice()
                  .reverse()
                  .map((el, revIdx) => (
                    <div key={el.id}>
                      <div
                        onClick={() => { setSelectedId(el.id); setMultiSelected([]); }}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                          selectedId === el.id ? "bg-blue-100 border-2 border-blue-400" : "bg-slate-50 border-2 border-transparent hover:bg-slate-100"
                        }`}
                      >
                        <button
                          className="cursor-grab text-slate-400 hover:text-slate-600"
                          title="Drag to reorder"
                        >
                          <GripVertical size={14} />
                        </button>
                        <span className="text-xs">
                          {el.type === "text"
                            ? "T"
                            : el.type === "photo"
                            ? "📷"
                            : el.type === "image"
                            ? "🖼"
                            : el.type === "sticker"
                            ? "😀"
                            : "📦"}
                        </span>
                        <span className="flex-1 font-bold text-xs truncate">
                          {el.type === "text"
                            ? (el.content || "").slice(0, 15) || "Text"
                            : el.type === "group"
                            ? el.name || "Group"
                            : el.type.charAt(0).toUpperCase() + el.type.slice(1)}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteElement(el.id); if (selectedId === el.id) setSelectedId(null); }}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Group children */}
                      {el.type === "group" && (el.children || []).length > 0 && (
                        <div className="ml-4 pl-2 border-l-2 border-slate-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); setCollapsedGroups((prev) => ({ ...prev, [el.id]: !prev[el.id] })); }}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 py-1"
                          >
                            {collapsedGroups[el.id] ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                            {(el.children || []).length} children
                          </button>
                          {!collapsedGroups[el.id] &&
                            (el.children || []).map((child) => (
                              <div
                                key={child.id}
                                onClick={() => setSelectedId(child.id)}
                                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors ${
                                  selectedId === child.id ? "bg-blue-100 border border-blue-300" : "hover:bg-slate-50"
                                }`}
                              >
                                <span className="text-[10px]">
                                  {child.type === "text" ? "T" : child.type === "photo" ? "📷" : child.type === "image" ? "🖼" : "😀"}
                                </span>
                                <span className="font-bold truncate flex-1">
                                  {child.type === "text" ? (child.content || "").slice(0, 12) : child.type}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeChildFromGroup(el.id, child.id); }}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                {elements.length === 0 && (
                  <div className="text-center py-8 text-slate-400 font-bold text-sm">No elements yet</div>
                )}
              </div>
            )}

            {/* ====== CANVAS TAB ====== */}
            {activeTab === "canvas" && (
              <div className="space-y-4">
                <PropRow label="Background Color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={canvasBg}
                      onChange={(e) => setCanvasBg(e.target.value)}
                      className="w-12 h-12 p-0 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    />
                    <span className="font-mono font-bold text-sm bg-slate-100 px-2 py-1 rounded border border-slate-300">{canvasBg}</span>
                  </div>
                </PropRow>

                <PropRow label="Background Image">
                  <label className="block w-full text-center font-black uppercase tracking-widest text-xs px-4 py-2.5 bg-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer">
                    Upload Image
                    <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImageFile} />
                  </label>
                  {canvasBgImage && (
                    <div className="mt-2 relative inline-block">
                      <img src={canvasBgImage} alt="BG" className="w-full h-20 object-cover border-2 border-slate-950 rounded" />
                      <button
                        onClick={() => setCanvasBgImage(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full border-2 border-white flex items-center justify-center shadow hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </PropRow>

                <div className="grid grid-cols-2 gap-2">
                  <PropRow label="Width (cm)">
                    <InlineInput value={PX_TO_CM(canvasW, dpi).toFixed(1)} onChange={(v: number) => setCanvasSize(CM_TO_PX(v, dpi), canvasH)} type="text" inputMode="decimal" />
                  </PropRow>
                  <PropRow label="Height (cm)">
                    <InlineInput value={PX_TO_CM(canvasH, dpi).toFixed(1)} onChange={(v: number) => setCanvasSize(canvasW, CM_TO_PX(v, dpi))} type="text" inputMode="decimal" />
                  </PropRow>
                </div>
                <PropRow label="Preset Size">
                  <select
                    value=""
                    onChange={(e) => {
                      const preset = PRESET_SIZES.find((p) => p.label === e.target.value);
                      if (preset) {
                        setCanvasSize(CM_TO_PX(preset.cmW, dpi), CM_TO_PX(preset.cmH, dpi));
                      }
                    }}
                    className="w-full border-2 border-slate-950 p-2 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded"
                  >
                    <option value="" disabled>Choose preset...</option>
                    {PRESET_SIZES.map((p) => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                  </select>
                </PropRow>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== MULTI-SELECT ACTION BAR ====== */}

      {/* ====== STICKER PICKER MODAL ====== */}
      {isStickerPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-slate-950 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b-2 border-slate-950 bg-yellow-400">
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">Add Sticker</h2>
              <button onClick={() => setIsStickerPickerOpen(false)} className="p-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-slate-100 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                <X size={20} className="text-slate-950" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-3 gap-4">
              {stickers.map((stk) => (
                <div
                  key={stk.id}
                  onClick={() => addSticker(stk.url)}
                  className="bg-slate-50 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-100 hover:-translate-y-1 transition-all"
                >
                  <img src={stk.url} alt={stk.name} className="w-16 h-16 object-contain mb-2 pointer-events-none" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">{stk.name}</span>
                </div>
              ))}
              {stickers.length === 0 && (
                <div className="col-span-3 text-center py-8 text-slate-500 font-bold">No stickers available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== GROUP MODAL ====== */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-slate-950 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Create Group</h2>
              <button onClick={() => setIsGroupModalOpen(false)} className="p-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-slate-100 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                <X size={18} />
              </button>
            </div>
            <PropRow label="Group Name">
              <InlineInput value={groupOptions.name} onChange={(v: string) => setGroupOptions((prev) => ({ ...prev, name: v }))} type="text" />
            </PropRow>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <PropRow label="Direction">
                <select value={groupOptions.flexDir} onChange={(e) => setGroupOptions((prev) => ({ ...prev, flexDir: e.target.value }))} className="w-full border-2 border-slate-950 p-2 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded">
                  <option value="row">Row →</option>
                  <option value="column">Column ↓</option>
                </select>
              </PropRow>
              <PropRow label="Gap">
                <InlineInput value={groupOptions.gap} onChange={(v: number) => setGroupOptions((prev) => ({ ...prev, gap: v }))} />
              </PropRow>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <PropRow label="Padding">
                <InlineInput value={groupOptions.padding} onChange={(v: number) => setGroupOptions((prev) => ({ ...prev, padding: v }))} />
              </PropRow>
              <PropRow label="Align">
                <select value={groupOptions.align} onChange={(e) => setGroupOptions((prev) => ({ ...prev, align: e.target.value }))} className="w-full border-2 border-slate-950 p-2 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded">
                  <option value="stretch">Stretch</option>
                  <option value="flex-start">Start</option>
                  <option value="center">Center</option>
                  <option value="flex-end">End</option>
                </select>
              </PropRow>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <PropRow label="Justify">
                <select value={groupOptions.justify} onChange={(e) => setGroupOptions((prev) => ({ ...prev, justify: e.target.value }))} className="w-full border-2 border-slate-950 p-2 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded">
                  <option value="flex-start">Start</option>
                  <option value="center">Center</option>
                  <option value="flex-end">End</option>
                  <option value="space-between">Between</option>
                </select>
              </PropRow>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="groupWrap"
                  checked={groupOptions.flexWrap === "wrap"}
                  onChange={(e) => setGroupOptions((prev) => ({ ...prev, flexWrap: e.target.checked ? "wrap" : "nowrap" }))}
                  className="accent-blue-600"
                />
                <label htmlFor="groupWrap" className="text-xs font-bold">Wrap</label>
              </div>
            </div>
            <PropRow label="Background Color">
              <input
                type="color"
                value={groupOptions.bgColor}
                onChange={(e) => setGroupOptions((prev) => ({ ...prev, bgColor: e.target.value }))}
                className="w-12 h-12 p-0 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              />
            </PropRow>
            {multiSelected.length >= 2 ? (
              <button onClick={handleGroupSelected} className="w-full bg-yellow-400 text-slate-950 font-black uppercase tracking-widest px-4 py-3 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                Group {multiSelected.length} Elements
              </button>
            ) : (
              <button onClick={addGroup} className="w-full bg-blue-600 text-white font-black uppercase tracking-widest px-4 py-3 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                Create Empty Group
              </button>
            )}
          </div>
        </div>
      )}

      {/* ====== IMAGE COMPRESSOR MODAL ====== */}
      {isImageCompressOpen && pendingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-slate-950 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Image Compressor</h2>
              <button onClick={() => { setIsImageCompressOpen(false); setPendingImage(null); setCompressedImage(null); }} className="p-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-slate-100 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <Label>Original</Label>
                <img src={pendingImage.dataUrl} alt="Original" className="max-h-40 object-contain mx-auto border-2 border-slate-200 rounded" />
                <p className="text-[10px] text-slate-500 mt-1">{(pendingImage.file.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="text-center">
                <Label>Compressed</Label>
                {compressedImage && <img src={compressedImage} alt="Compressed" className="max-h-40 object-contain mx-auto border-2 border-slate-200 rounded" />}
                <p className="text-[10px] text-slate-500 mt-1">
                  {compressedImage ? `${(new Blob([compressedImage]).size / 1024).toFixed(1)} KB` : "—"}
                </p>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <PropRow label={`Max Size: ${compressSettings.maxSizeMB}MB`}>
                <input type="range" min={0.1} max={5} step={0.1} value={compressSettings.maxSizeMB} onChange={(e) => setCompressSettings((prev) => ({ ...prev, maxSizeMB: parseFloat(e.target.value) }))} className="w-full" />
              </PropRow>
              <PropRow label={`Max Dimension: ${compressSettings.maxWidthOrHeight}px`}>
                <input type="range" min={100} max={4000} step={100} value={compressSettings.maxWidthOrHeight} onChange={(e) => setCompressSettings((prev) => ({ ...prev, maxWidthOrHeight: parseInt(e.target.value) }))} className="w-full" />
              </PropRow>
              <PropRow label={`Quality: ${Math.round(compressSettings.quality * 100)}%`}>
                <input type="range" min={0.1} max={1} step={0.1} value={compressSettings.quality} onChange={(e) => setCompressSettings((prev) => ({ ...prev, quality: parseFloat(e.target.value) }))} className="w-full" />
              </PropRow>
            </div>
            <div className="flex gap-3">
              <button onClick={compressImage} disabled={isCompressing} className="flex-1 bg-white text-slate-950 font-black uppercase tracking-widest text-xs px-4 py-2.5 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all disabled:opacity-50">
                {isCompressing ? <span className="animate-spin inline-block">⟳</span> : "Compress"}
              </button>
              <button onClick={() => addImage(compressedImage || pendingImage.dataUrl)} className="flex-1 bg-blue-600 text-white font-black uppercase tracking-widest text-xs px-4 py-2.5 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== BATCH GENERATION MODAL ====== */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-slate-950 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b-2 border-slate-950 bg-emerald-400">
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">Batch Generation</h2>
              <button onClick={() => { setIsBatchModalOpen(false); setBatchStep(1); setBatchData([]); setBatchHeaders([]); }} className="p-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-slate-100 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                <X size={20} className="text-slate-950" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Step 1: Upload */}
              {batchStep === 1 && (
                <div className="text-center py-8">
                  <FileImage size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="font-bold text-slate-600 mb-4">Upload an Excel or CSV file with data for batch generation.</p>
                  <p className="text-sm text-slate-400 mb-4">Each row generates one image from the template.</p>
                  <label className="inline-block font-black uppercase tracking-widest text-sm px-6 py-3 bg-blue-600 text-white border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all cursor-pointer">
                    Upload File
                    <input ref={batchFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBatchFile} />
                  </label>
                </div>
              )}

              {/* Step 2: Column Mapping */}
              {batchStep === 2 && (
                <div>
                  <h3 className="font-black uppercase tracking-widest text-sm mb-4">Preview</h3>
                  <div className="bg-slate-50 border-2 border-slate-200 rounded p-3 text-xs font-mono overflow-x-auto max-h-32">
                    {batchData[0] && batchHeaders.map((h, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="font-bold text-slate-500">{h}:</span>
                        <span className="text-slate-700">{String(batchData[0]?.[i] || "").slice(0, 50)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{batchData.length} rows found</p>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setBatchStep(1)} className="flex-1 bg-white text-slate-950 font-black uppercase tracking-widest text-xs px-4 py-2.5 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                      Back
                    </button>
                    <button onClick={handleBatchGenerate} disabled={batchData.length === 0} className="flex-1 bg-emerald-400 text-slate-950 font-black uppercase tracking-widest text-xs px-4 py-2.5 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all disabled:opacity-50">
                      Start Generation
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Progress */}
              {batchStep === 3 && (
                <div className="text-center py-8">
                  {batchGenerating ? (
                    <>
                      <Loader2 size={48} className="mx-auto mb-4 animate-spin text-blue-600" />
                      <p className="font-black uppercase tracking-widest text-slate-700 mb-4">Generating...</p>
                      <div className="w-full bg-slate-200 rounded-full h-4 border-2 border-slate-950">
                        <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${batchProgress}%` }} />
                      </div>
                      <p className="text-sm text-slate-500 mt-2">{Math.round(batchProgress)}%</p>
                    </>
                  ) : (
                    <p className="text-slate-500 font-bold">Preparing...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions

function findElementById(elements: Element[], id: string): Element | null {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.type === "group" && el.children) {
      const found = findElementById(el.children, id);
      if (found) return found;
    }
  }
  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  const rows = text.split("\n");
  for (const row of rows) {
    if (row.trim() === "") continue;
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    lines.push(cells);
  }
  return lines;
}