import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "motion/react";
import QRCode from "react-qr-code";
import { useSessionStore } from "../store/useSessionStore";
import { RotateCcw, Camera, Check, SwitchCamera } from "lucide-react";
import { TemplateRenderer, captureTemplate } from "../lib/templateRenderer";

export default function BoothSession() {
  const { boothId, templateId } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const renderRootRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [flash, setFlash] = useState(false);
  const [retakeSlot, setRetakeSlot] = useState<number | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const {
    template,
    state,
    captures,
    sessionData,
    totalSlots,
    initializeSession,
    startSession,
    setState,
    addCapture,
    retakeCapture,
    renderFinal,
    resetSession,
  } = useSessionStore();

  useEffect(() => {
    if (boothId && templateId) {
      initializeSession(boothId, templateId);
    }
  }, [boothId, templateId, initializeSession]);

  // Start camera and keep the stream
  const startCamera = async (deviceId?: string) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
          : { width: 1280, height: 720 },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      attachStream();

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(videoInputs);

      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        setSelectedDeviceId(activeTrack.getSettings().deviceId || "");
      }
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Re-attach stream when video element mounts/remounts
  const attachStream = () => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    attachStream();
  }, [state]);

  const doCapture = async (videoEl: HTMLVideoElement | null): Promise<string | null> => {
    if (!videoEl) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(videoEl, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const handleTakePhoto = async () => {
    const dataUrl = await doCapture(videoRef.current);
    if (!dataUrl) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    if (retakeSlot !== null) {
      await retakeCapture(retakeSlot, dataUrl);
      setRetakeSlot(null);
      setState("review");
    } else {
      await addCapture(dataUrl);
    }
  };

  const handleRetake = (index: number) => {
    setRetakeSlot(index);
    setState("shooting");
  };

  const handleRenderFinal = async () => {
    const containerEl = renderRootRef.current;
    if (!containerEl || !sessionData?.id || !boothId) return;

    try {
      const canvas = await captureTemplate(containerEl);
      const finalImage = canvas.toDataURL("image/jpeg", 0.9);
      setState("rendering");
      await renderFinal(finalImage, boothId);
    } catch (err) {
      console.error("Failed to render final image", err);
      setState("review");
      alert("Failed to process image. Please try again.");
    }
  };

  if (!template)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 font-sans">
        <div className="text-xl font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading...</div>
      </div>
    );

  const canvasW = template.canvasW || 400;
  const canvasH = template.canvasH || 600;

  return (
    <div className="h-screen w-screen bg-slate-900 overflow-hidden font-sans relative">
      {flash && <div className="absolute inset-0 z-50 bg-white pointer-events-none" />}

      {/* ====== IDLE ====== */}
      {state === "idle" && (
        <div className="h-full w-full flex overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-4 min-w-0">
            <TemplateRenderer
              elements={template.elements}
              config={{ canvasW, canvasH, canvasBg: template.canvasBg, canvasBgImage: template.canvasBgImage }}
              className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] shrink-0"
              style={{
                transform: `scale(${Math.min((window.innerHeight * 0.88) / canvasH, (window.innerWidth * 0.45) / canvasW, 1)})`,
                transformOrigin: "center center",
              }}
            />
          </div>
          <div className="w-[45%] shrink-0 flex flex-col items-center justify-center gap-6 pr-8">
            {videoDevices.length > 1 && (
              <div className="flex items-center gap-3">
                <SwitchCamera size={16} className="text-slate-400" />
                <select
                  value={selectedDeviceId}
                  onChange={(e) => startCamera(e.target.value)}
                  className="bg-white text-slate-950 font-black text-[10px] uppercase tracking-widest px-3 py-2 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[1px] focus:translate-x-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 4)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="rounded-2xl border-4 border-slate-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-slate-800" style={{ width: "min(100%, 480px)", aspectRatio: "4/3" }}>
              <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" autoPlay playsInline muted />
            </div>
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={startSession}
              className="bg-yellow-400 text-slate-950 font-black tracking-tight text-3xl px-16 py-5 rounded-2xl border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform pointer-events-auto uppercase"
            >
              Touch to Start
            </motion.button>
            {totalSlots > 0 && (
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                {totalSlots} photo{totalSlots > 1 ? "s" : ""} will be taken
              </p>
            )}
          </div>
        </div>
      )}

      {/* ====== SHOOTING — full-screen camera + bottom controls overlaid ====== */}
      {state === "shooting" && (
        <div className="h-full w-full relative bg-black">
          <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" autoPlay playsInline muted />

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-8 px-6">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white/90 text-slate-950 px-5 py-2 rounded-lg font-mono tracking-widest text-lg font-black border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {retakeSlot !== null ? `Retake Photo ${retakeSlot + 1}` : `${captures.length} / ${totalSlots}`}
              </div>

              {retakeSlot !== null ? (
                <>
                  <button
                    onClick={handleTakePhoto}
                    className="bg-yellow-400 text-slate-950 font-black tracking-tight text-2xl px-16 py-5 rounded-2xl border-4 border-slate-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:translate-y-[3px] active:translate-x-[3px] active:shadow-none transition-all pointer-events-auto uppercase flex items-center gap-3"
                  >
                    <Camera size={28} />
                    Retake Photo
                  </button>
                  <button
                    onClick={() => { setRetakeSlot(null); setState("review"); }}
                    className="bg-white/90 text-slate-950 font-black uppercase tracking-widest px-8 py-2.5 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : captures.length >= totalSlots ? (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setState("review")}
                    className="bg-emerald-400 text-slate-950 font-black uppercase tracking-widest px-10 py-3.5 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all text-lg flex items-center gap-2"
                  >
                    <Check size={20} /> Review Photos
                  </button>
                  <button
                    onClick={startSession}
                    className="bg-red-500 text-white font-black uppercase tracking-widest px-8 py-3.5 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-400 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center gap-2"
                  >
                    <RotateCcw size={18} /> Retake All
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleTakePhoto}
                  className="bg-yellow-400 text-slate-950 font-black tracking-tight text-2xl px-16 py-5 rounded-2xl border-4 border-slate-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:translate-y-[3px] active:translate-x-[3px] active:shadow-none transition-all pointer-events-auto uppercase flex items-center gap-3"
                >
                  <Camera size={28} />
                  Take Photo {captures.length + 1}
                </button>
              )}

              {captures.length > 0 && (
                <div className="flex gap-2 mt-1">
                  {captures.map((cap, i) => (
                    <div key={i} className={`w-12 h-12 rounded-lg border-2 overflow-hidden ${retakeSlot === i ? "border-yellow-400 ring-2 ring-yellow-400" : "border-white/50"}`}>
                      <img src={cap} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {retakeSlot === null && Array.from({ length: totalSlots - captures.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-12 h-12 rounded-lg border-2 border-dashed border-white/25 flex items-center justify-center">
                      <span className="text-white/30 text-[10px] font-bold">{captures.length + i + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

{/* ====== REVIEW — template preview left, captures sidebar right ====== */}
      {state === "review" && (
        <div className="h-full w-full flex bg-slate-900 overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-4 min-w-0">
            <TemplateRenderer
              ref={renderRootRef}
              elements={template.elements}
              config={{ canvasW, canvasH, canvasBg: template.canvasBg, canvasBgImage: template.canvasBgImage }}
              captures={captures}
              className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] shrink-0"
              style={{
                transform: `scale(${Math.min((window.innerHeight * 0.92) / canvasH, (window.innerWidth * 0.55) / canvasW, 1)})`,
                transformOrigin: "center center",
              }}
            />
          </div>

          <div className="w-72 shrink-0 border-l-4 border-slate-950 bg-slate-800 flex flex-col h-full">
            <div className="px-4 py-3 border-b-2 border-slate-950 bg-slate-900">
              <h2 className="font-black uppercase tracking-tight text-white text-base">Review</h2>
              <p className="text-slate-400 text-[10px] font-bold mt-0.5 uppercase tracking-widest">Retake any photo</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {captures.map((cap, i) => (
                <div key={i} className="bg-slate-700 rounded-lg border-2 border-slate-900 overflow-hidden">
                  <div className="aspect-video bg-black overflow-hidden">
                    <img src={cap} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-white font-black uppercase tracking-widest text-[10px]">Photo {i + 1}</span>
                    <button
                      onClick={() => handleRetake(i)}
                      className="bg-yellow-400 text-slate-950 font-black uppercase tracking-widest text-[9px] px-2 py-1 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-y-[1px] active:translate-x-[1px] active:shadow-none transition-all flex items-center gap-1"
                    >
                      <RotateCcw size={10} /> Retake
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t-2 border-slate-950 space-y-2">
              <button
                onClick={handleRenderFinal}
                className="w-full bg-emerald-400 text-slate-950 font-black uppercase tracking-widest px-4 py-3 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Check size={18} /> Looks Great!
              </button>
              <button
                onClick={startSession}
                className="w-full bg-red-500 text-white font-black uppercase tracking-widest px-4 py-2.5 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-400 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 text-sm"
              >
                <RotateCcw size={16} /> Retake All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== RENDERING ====== */}
      {state === "rendering" && (
        <div className="h-full w-full flex items-center justify-center bg-slate-900">
          <div className="text-yellow-400 text-4xl font-black uppercase tracking-widest animate-pulse" style={{ WebkitTextStroke: "2px black" }}>
            Processing...
          </div>
        </div>
      )}

      {/* ====== DONE ====== */}
      {state === "done" && sessionData && (
        <div className="h-full w-full flex items-center justify-center bg-slate-900">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white p-12 py-16 border-4 border-slate-950 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center pointer-events-auto"
          >
            <h2 className="text-4xl font-black tracking-tight uppercase mb-2 text-slate-950 text-center">
              Scan to Get<br />Your Photos!
            </h2>
            <p className="text-slate-500 font-bold mb-8 uppercase tracking-widest text-xs">Scan the QR code below</p>
            <div className="p-4 bg-white border-4 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
              <QRCode value={`${window.location.origin}/share/${sessionData.shareToken}`} size={200} />
            </div>
            <a
              href={`${window.location.origin}/share/${sessionData.shareToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-bold text-sm underline underline-offset-2 mb-8 block text-center break-all"
            >
              {window.location.origin}/share/{sessionData.shareToken}
            </a>
            <button
              onClick={resetSession}
              className="w-full bg-blue-600 text-white font-black uppercase tracking-widest px-12 py-4 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all"
            >
              Done
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}