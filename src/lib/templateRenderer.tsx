import React from "react";
import html2canvas from "html2canvas";
import { Element } from "../store/useEditorStore";

export interface TemplateConfig {
  canvasW: number;
  canvasH: number;
  canvasBg: string;
  canvasBgImage?: string | null;
  dpi?: number;
}

export interface RenderOptions {
  captures?: string[];
  photoSlotIndices?: Record<string, number>;
  isOverlay?: boolean;
}

function getElementStyle(el: Element): React.CSSProperties {
  const style: React.CSSProperties = {
    position: "absolute",
    left: Math.round(el.x),
    top: Math.round(el.y),
    zIndex: el.zIndex || 1,
  };
  if (el.rotation) style.transform = `rotate(${el.rotation}deg)`;
  if (el.opacity !== undefined && el.opacity !== 100) style.opacity = el.opacity / 100;
  if (el.borderWidth) {
    style.border = `${el.borderWidth}px solid ${el.borderColor || "#000000"}`;
  }
  if (el.borderRadius) style.borderRadius = el.borderRadius;
  if (el.shadowEnabled && el.shadowBlur) {
    const so = (el.shadowOpacity ?? 100) / 100;
    style.boxShadow = `${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur}px rgba(0,0,0,${so.toFixed(2)})`;
  }
  return style;
}

function buildStyleString(el: Element): string {
  const parts: string[] = [];
  parts.push(`position: absolute`);
  parts.push(`left: ${Math.round(el.x)}px`);
  parts.push(`top: ${Math.round(el.y)}px`);
  if (el.rotation) parts.push(`transform: rotate(${el.rotation}deg)`);
  if (el.opacity !== undefined && el.opacity !== 100) parts.push(`opacity: ${el.opacity / 100}`);
  if (el.borderWidth) parts.push(`border: ${el.borderWidth}px solid ${el.borderColor || "#000000"}`);
  if (el.borderRadius) parts.push(`border-radius: ${el.borderRadius}px`);
  if (el.shadowEnabled && el.shadowBlur) {
    const so = ((el.shadowOpacity ?? 100) / 100);
    parts.push(`box-shadow: ${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur}px rgba(0,0,0,${so.toFixed(2)})`);
  }
  parts.push(`z-index: ${el.zIndex || 1}`);
  return parts.join("; ");
}

function computePhotoSlotIndices(elements: Element[]): Record<string, number> {
  const indices: Record<string, number> = {};
  let counter = 0;
  for (const el of elements) {
    if (el.type === "photo") {
      counter++;
      indices[el.id] = counter;
    }
  }
  return indices;
}

export function renderTemplateHTML(
  elements: Element[],
  config: TemplateConfig,
  options?: RenderOptions
): string {
  const photoSlotIndices = options?.photoSlotIndices || computePhotoSlotIndices(elements);
  const captures = options?.captures;

  const renderElement = (el: Element): string => {
    const baseStyle = buildStyleString(el);

    switch (el.type) {
      case "photo": {
        const idx = photoSlotIndices[el.id] ?? 1;
        const captureUrl = captures?.[idx - 1];
        if (captureUrl) {
          return `<div id="${el.id}" class="photo-slot absolute" data-slot-index="${idx}" style="${baseStyle}; width: ${el.width}px; height: ${el.height}px; background-image: url('${captureUrl}'); background-size: cover; background-position: center;"></div>`;
        }
        return `<div id="${el.id}" class="photo-slot absolute" data-slot-index="${idx}" style="${baseStyle}; width: ${el.width}px; height: ${el.height}px; background-color: #e2e8f0; display: flex; align-items: center; justify-content: center;"><span style="font-family: Inter, sans-serif; font-size: 32px; font-weight: 900; color: #64748b;">${idx}</span></div>`;
      }
      case "text": {
        const ts: string[] = [];
        if (el.fontSize) ts.push(`font-size: ${el.fontSize}px`);
        if (el.color) ts.push(`color: ${el.color}`);
        if (el.fontFamily) ts.push(`font-family: '${el.fontFamily}', sans-serif`);
        if (el.fontWeight) ts.push(`font-weight: ${el.fontWeight}`);
        if (el.fontStyle) ts.push(`font-style: ${el.fontStyle}`);
        if (el.textAlign) ts.push(`text-align: ${el.textAlign}`);
        if (el.textTransform && el.textTransform !== "none") ts.push(`text-transform: ${el.textTransform}`);
        if (el.wrapText) ts.push(`white-space: pre-wrap`);
        else ts.push(`white-space: nowrap`);
        if (el.width) ts.push(`width: ${el.width}px`);
        return `<div id="${el.id}" class="absolute" style="${baseStyle}; ${ts.join("; ")}">${el.content || ""}</div>`;
      }
      case "sticker":
        return `<img src="${el.url}" id="${el.id}" class="absolute object-contain" style="${baseStyle}; width: ${el.width}px; height: ${el.height}px;" />`;
      case "image":
        return `<img src="${el.url}" id="${el.id}" class="absolute object-cover" style="${baseStyle}; width: ${el.width}px; height: ${el.height}px;" />`;
      case "group": {
        const gs: string[] = [baseStyle];
        gs.push(`width: ${el.width || 200}px`);
        gs.push(`height: ${el.height || 200}px`);
        gs.push(`display: flex`);
        gs.push(`flex-direction: ${el.flexDir || "row"}`);
        if (el.gap) gs.push(`gap: ${el.gap}px`);
        if (el.padding) gs.push(`padding: ${el.padding}px`);
        if (el.align) gs.push(`align-items: ${el.align}`);
        if (el.justify) gs.push(`justify-content: ${el.justify}`);
        if (el.flexWrap) gs.push(`flex-wrap: ${el.flexWrap}`);
        if (el.bgColor && el.bgColor !== "transparent") {
          gs.push(`background-color: ${el.bgColor}`);
        }
        if (el.borderRadius) gs.push(`border-radius: ${el.borderRadius}px`);
        if (el.bgOpacity !== undefined && el.bgOpacity < 100 && el.bgColor) {
          gs.push(`opacity: ${el.bgOpacity / 100}`);
        }
        const childrenHtml = (el.children || []).map(renderElement).join("");
        return `<div id="${el.id}" class="absolute" style="${gs.join("; ")}">${childrenHtml}</div>`;
      }
      default:
        return "";
    }
  };

  const htmlElements = elements.map(renderElement).join("");
  const canvasBgStyle = config.canvasBgImage
    ? `background-color: ${config.canvasBg}; background-image: url('${config.canvasBgImage}'); background-size: cover; background-position: center;`
    : `background-color: ${config.canvasBg};`;

  return `<div id="template-root" class="relative overflow-hidden" style="width: ${config.canvasW}px; height: ${config.canvasH}px; ${canvasBgStyle}">${htmlElements}</div>`;
}

interface TemplateRendererProps {
  elements: Element[];
  config: TemplateConfig;
  captures?: string[];
  className?: string;
  style?: React.CSSProperties;
}

function renderElementJSX(el: Element, photoSlotIndices: Record<string, number>, captures?: string[]): React.ReactNode {
  const style = getElementStyle(el);

  switch (el.type) {
    case "photo": {
      const idx = photoSlotIndices[el.id] ?? 1;
      const captureUrl = captures?.[idx - 1];
      const photoStyle: React.CSSProperties = {
        ...style,
        width: el.width,
        height: el.height,
        ...(captureUrl
          ? {
              backgroundImage: `url('${captureUrl}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {
              backgroundColor: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }),
      };
      if (captureUrl) {
        if (el.borderRadius) photoStyle.borderRadius = el.borderRadius;
        if (el.borderWidth) photoStyle.border = `${el.borderWidth}px solid ${el.borderColor || "#000000"}`;
        if (el.shadowEnabled && el.shadowBlur) {
          const so = (el.shadowOpacity ?? 100) / 100;
          photoStyle.boxShadow = `${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur}px rgba(0,0,0,${so.toFixed(2)})`;
        }
        return (
          <div key={el.id} id={el.id} className="photo-slot" data-slot-index={idx} style={photoStyle} />
        );
      }
      if (el.borderWidth) {
        photoStyle.border = `${el.borderWidth}px solid ${el.borderColor || "#000000"}`;
      }
      if (!el.borderWidth) {
        photoStyle.outline = "2px dashed #cbd5e1";
        photoStyle.outlineOffset = "-2px";
      }
      if (el.shadowEnabled && el.shadowBlur) {
        const so = (el.shadowOpacity ?? 100) / 100;
        photoStyle.boxShadow = `${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur}px rgba(0,0,0,${so})`;
      }
      return (
        <div key={el.id} id={el.id} className="photo-slot" data-slot-index={idx} style={photoStyle}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 32, fontWeight: 900, color: "#64748b" }}>{idx}</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#94a3b8" }}>Photo {idx}</span>
          </div>
        </div>
      );
    }
    case "text": {
      const textStyle: React.CSSProperties = {
        ...style,
        fontSize: el.fontSize,
        color: el.color,
        fontFamily: el.fontFamily ? `'${el.fontFamily}', sans-serif` : undefined,
        textAlign: el.textAlign as React.CSSProperties["textAlign"],
        textTransform: el.textTransform !== "none" ? el.textTransform : undefined,
        whiteSpace: el.wrapText ? "pre-wrap" : "nowrap",
        ...(el.width ? { width: el.width } : {}),
        fontWeight: el.fontWeight || "bold",
        fontStyle: el.fontStyle || "normal",
      };
      return (
        <div key={el.id} id={el.id} style={textStyle}>
          {el.content || ""}
        </div>
      );
    }
    case "sticker": {
      const stickerStyle: React.CSSProperties = {
        ...style,
        width: el.width,
        height: el.height,
      };
      const innerStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        borderRadius: el.borderRadius || 0,
        ...(el.borderWidth ? { borderWidth: el.borderWidth, borderColor: el.borderColor || "#000000", borderStyle: "solid" as const } : {}),
        ...(el.shadowEnabled ? { boxShadow: `${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur || 0}px rgba(0,0,0,${((el.shadowOpacity ?? 100) / 100)})` } : {}),
      };
      return (
        <img key={el.id} id={el.id} src={el.url} alt="Sticker" style={stickerStyle} className="object-contain" draggable={false} />
      );
    }
    case "image": {
      const imgStyle: React.CSSProperties = {
        ...style,
        width: el.width,
        height: el.height,
      };
      const innerStyle: React.CSSProperties = {
        borderRadius: el.borderRadius || 0,
        ...(el.borderWidth ? { borderWidth: el.borderWidth, borderColor: el.borderColor || "#000000", borderStyle: "solid" as const } : {}),
        ...(el.shadowEnabled ? { boxShadow: `${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur || 0}px rgba(0,0,0,${((el.shadowOpacity ?? 100) / 100)})` } : {}),
      };
      return (
        <img key={el.id} id={el.id} src={el.url} alt="Image" style={imgStyle} className="object-cover" draggable={false} />
      );
    }
    case "group": {
      const groupStyle: React.CSSProperties = {
        ...style,
        width: el.width || 200,
        height: el.height || 200,
        display: "flex",
        flexDirection: (el.flexDir || "row") as React.CSSProperties["flexDirection"],
        gap: el.gap ?? 8,
        padding: el.padding ?? 8,
        alignItems: el.align as React.CSSProperties["alignItems"],
        justifyContent: el.justify as React.CSSProperties["justifyContent"],
        flexWrap: el.flexWrap === "wrap" ? "wrap" : "nowrap",
        ...(el.bgColor && el.bgColor !== "transparent" ? { backgroundColor: el.bgColor } : {}),
        borderRadius: el.borderRadius || 0,
        ...(el.bgOpacity !== undefined && el.bgOpacity < 100 && el.bgColor ? { opacity: el.bgOpacity / 100 } : {}),
      };
      return (
        <div key={el.id} id={el.id} style={groupStyle}>
          {(el.children || []).map((child) => renderElementJSX(child, photoSlotIndices, captures))}
        </div>
      );
    }
    default:
      return null;
  }
}

export const TemplateRenderer = React.forwardRef<HTMLDivElement, TemplateRendererProps>(
  ({ elements, config, captures, className, style }, ref) => {
    const photoSlotIndices = computePhotoSlotIndices(elements);
    const canvasBgStyle: React.CSSProperties = config.canvasBgImage
      ? { backgroundColor: config.canvasBg, backgroundImage: `url('${config.canvasBgImage}')`, backgroundSize: "cover", backgroundPosition: "center" }
      : { backgroundColor: config.canvasBg };

    return (
      <div
        ref={ref}
        id="template-root"
        className={className}
        style={{
          position: "relative",
          overflow: "hidden",
          width: config.canvasW,
          height: config.canvasH,
          ...canvasBgStyle,
          ...style,
        }}
      >
        {elements.map((el) => renderElementJSX(el, photoSlotIndices, captures))}
      </div>
    );
  }
);

TemplateRenderer.displayName = "TemplateRenderer";

export function injectCapturesIntoHTML(
  html: string,
  captures: string[],
  isOverlay?: boolean
): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  const root = div.querySelector("#template-root") as HTMLElement;
  if (root && isOverlay) {
    root.style.background = "transparent";
    root.style.borderColor = "transparent";
  }

  const slots = div.querySelectorAll(".photo-slot");
  slots.forEach((slot, i) => {
    const el = slot as HTMLElement;
    if (captures[i]) {
      el.innerHTML = "";
      el.style.backgroundImage = `url('${captures[i]}')`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundColor = "transparent";
    } else if (isOverlay) {
      el.style.background = "rgba(255, 255, 255, 0.1)";
      el.style.borderColor = "rgba(255, 255, 255, 0.5)";
      el.style.borderStyle = "dashed";
      const slotIndex = el.getAttribute("data-slot-index") || String(i + 1);
      el.innerHTML = `<span style="font-family: Inter, sans-serif; font-size: 32px; font-weight: 900; color: rgba(255,255,255,0.7);">${slotIndex}</span>`;
    } else {
      const slotIndex = el.getAttribute("data-slot-index") || String(i + 1);
      el.innerHTML = `<span style="font-family: Inter, sans-serif; font-size: 32px; font-weight: 900; color: #64748b;">${slotIndex}</span>`;
    }
  });

  if (isOverlay) {
    const texts = div.querySelectorAll('div[id^="el-"]');
    texts.forEach((text) => {
      const el = text as HTMLElement;
      if (el.style.color && el.style.fontSize) {
        el.style.opacity = "0.5";
      }
    });
  }

  return div.innerHTML;
}

export function createOklchResolver(): (value: string) => string {
  const cv = document.createElement("canvas");
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext("2d")!;
  const cache = new Map<string, string>();

  return (value: string): string => {
    if (!value.includes("oklch")) return value;
    return value.replace(/oklch\([^)]*\)/g, (match) => {
      if (cache.has(match)) return cache.get(match)!;
      try {
        ctx.fillStyle = match;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        const resolved = `rgba(${d[0]},${d[1]},${d[2]},${d[3] / 255})`;
        cache.set(match, resolved);
        return resolved;
      } catch {
        return match;
      }
    });
  };
}

export function applyOklchAndDimensionFix(
  doc: Document,
  sourceEl: HTMLElement,
  resolveOklch: (v: string) => string
): void {
  const processRules = (rules: CSSRuleList) => {
    for (let i = 0; i < rules.length; i++) {
      try {
        const r = rules[i] as any;
        if (r.style) {
          for (let j = 0; j < r.style.length; j++) {
            const p = r.style[j];
            const val = r.style.getPropertyValue(p);
            if (val?.includes("oklch")) r.style.setProperty(p, resolveOklch(val));
          }
        } else if (r.cssRules) processRules(r.cssRules);
      } catch {}
    }
  };

  for (let i = 0; i < doc.styleSheets.length; i++) {
    try {
      const s = doc.styleSheets[i];
      if (s.cssRules) processRules(s.cssRules);
    } catch {}
  }

  doc.querySelectorAll("*").forEach((e) => {
    const h = e as HTMLElement;
    for (let j = 0; j < h.style.length; j++) {
      const p = h.style[j];
      const val = h.style.getPropertyValue(p);
      if (val?.includes("oklch")) h.style.setProperty(p, resolveOklch(val));
    }
  });

  const origEls = sourceEl.querySelectorAll("[id^='el-'], .photo-slot");
  const clonedEls = doc.querySelectorAll("[id^='el-'], .photo-slot");
  origEls.forEach((o, i) => {
    const oEl = o as HTMLElement;
    const cEl = clonedEls[i] as HTMLElement;
    if (!cEl) return;
    const comp = window.getComputedStyle(oEl);
    if (!oEl.style.width || oEl.style.width === "auto") cEl.style.width = comp.width;
    if (!oEl.style.height || oEl.style.height === "auto") cEl.style.height = comp.height;
  });
}

export interface CaptureOptions {
  scale?: number;
  format?: string;
  quality?: number;
}

export async function captureTemplate(
  element: HTMLElement,
  options?: CaptureOptions
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;

  const resolveOklch = createOklchResolver();
  const scale = options?.scale ?? 2;

  return html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (doc, cloned) => {
      applyOklchAndDimensionFix(doc, element, resolveOklch);

      // Strip UI-only decorations (border, shadow, outline) from the root element
      cloned.style.border = "none";
      cloned.style.boxShadow = "none";
      cloned.style.outline = "none";
      cloned.style.transform = "none";
      cloned.style.borderRadius = "0";
    },
  });
}

export async function captureTemplateAsBlob(
  element: HTMLElement,
  options?: CaptureOptions
): Promise<Blob> {
  const canvas = await captureTemplate(element, options);
  const format = options?.format ?? "image/jpeg";
  const quality = options?.quality ?? 0.9;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      format,
      quality
    );
  });
}