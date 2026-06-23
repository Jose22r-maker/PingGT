import React, { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { parseQRCodeJson, QRPayload } from "../lib/pingEngine";
import { Camera, Image as ImageIcon, CheckCircle, AlertCircle, RefreshCw, XCircle } from "lucide-react";

interface QRScannerViewProps {
  onAddContact: (id: string, name: string) => boolean; // return true if successfully added, false if already exists
}

export default function QRScannerView({ onAddContact }: QRScannerViewProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "manual">("camera");
  const [cameraState, setCameraState] = useState<"off" | "starting" | "on" | "permission_denied">("off");
  
  // Camera scanning states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // General result state
  const [scanResult, setScanResult] = useState<QRPayload | null>(null);
  const [addFeedback, setAddFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Manual Input State
  const [manualId, setManualId] = useState("");
  const [manualName, setManualName] = useState("");

  // Clean raw stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle mode adjustments
  useEffect(() => {
    if (activeTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  }, [activeTab]);

  const startCamera = async () => {
    stopCamera();
    setCameraState("starting");
    setCameraError(null);
    setScanResult(null);
    setAddFeedback(null);

    try {
      const constraints = {
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // critical for iOS iframe compatibility
        videoRef.current.play();
      }
      
      setCameraState("on");
      // Throttled scan: run jsQR once every 350ms instead of 60fps (highly battery efficient for low-end hardware)
      scanIntervalRef.current = window.setInterval(scanFrame, 350);
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraState("permission_denied");
      setCameraError(
        "No se pudo acceder a la cámara. Comprueba los permisos o usa la pestaña 'Subir Captura'."
      );
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState("off");
  };

  // Grab the video frame and decode using jsQR
  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 300;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: "dontInvert"
    });

    if (code) {
      const payload = parseQRCodeJson(code.data);
      if (payload) {
        // Stop scanning, sound a quick visually feedback, and cache selection
        setScanResult(payload);
        stopCamera();
        // Trigger vibration if supported
        if (navigator.vibrate) navigator.vibrate(100);
      }
    }
  };

  // Parse QR from uploaded image/screenshot file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScanResult(null);
    setAddFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Constraint image dimension for efficient client decoding
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        
        if (code) {
          const payload = parseQRCodeJson(code.data);
          if (payload) {
            setScanResult(payload);
            setAddFeedback(null);
          } else {
            setAddFeedback({
              type: "error",
              text: "La imagen tiene un código QR pero no contiene un payload válido de PingGT."
            });
          }
        } else {
          setAddFeedback({
            type: "error",
            text: "No se encontró ningún código QR legible en esta imagen. Intenta con otra captura."
          });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmAdd = () => {
    if (!scanResult) return;
    const added = onAddContact(scanResult.id, scanResult.name);
    if (added) {
      setAddFeedback({
        type: "success",
        text: `¡Contacto "${scanResult.name}" (${scanResult.id}) agregado con éxito!`
      });
      setScanResult(null);
    } else {
      setAddFeedback({
        type: "error",
        text: `Este contacto ya se encuentra en tu lista.`
      });
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFeedback(null);

    const cleanId = manualId.toUpperCase().trim();
    const cleanName = manualName.trim();

    if (!cleanId || !cleanName) {
      setAddFeedback({ type: "error", text: "Ambos campos son obligatorios." });
      return;
    }

    // Match alphanumeric short ID format
    const idRegex = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;
    if (!idRegex.test(cleanId)) {
      setAddFeedback({
        type: "error",
        text: "Formato de ID inválido. Debe ser de 8 caracteres tipo: ABCD-1234"
      });
      return;
    }

    const added = onAddContact(cleanId, cleanName);
    if (added) {
      setAddFeedback({
        type: "success",
        text: `¡Contacto "${cleanName}" agregado con éxito!`
      });
      setManualId("");
      setManualName("");
    } else {
      setAddFeedback({
        type: "error",
        text: "Este ID de contacto ya existe en tu lista."
      });
    }
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm" id="qr-scanner-widget">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          id="tab-scanner-camera"
          onClick={() => setActiveTab("camera")}
          className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-xs font-sans font-bold flex items-center justify-center gap-1 sm:gap-1.5 border-b-2 transition-all ${
            activeTab === "camera"
              ? "border-emerald-600 text-slate-800 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> Escanear
        </button>
        <button
          id="tab-scanner-upload"
          onClick={() => setActiveTab("upload")}
          className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-xs font-sans font-bold flex items-center justify-center gap-1 sm:gap-1.5 border-b-2 transition-all ${
            activeTab === "upload"
              ? "border-emerald-600 text-slate-800 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" /> Subir Imagen
        </button>
        <button
          id="tab-scanner-manual"
          onClick={() => setActiveTab("manual")}
          className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-xs font-sans font-bold flex items-center justify-center gap-1 sm:gap-1.5 border-b-2 transition-all ${
            activeTab === "manual"
              ? "border-emerald-600 text-slate-800 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          }`}
        >
          + ID Manual
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-3 sm:p-4">
        {activeTab === "camera" && (
          <div className="flex flex-col items-center">
            {cameraState === "starting" && (
              <div className="h-44 sm:h-60 w-full max-w-sm rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 animate-spin" />
                <span className="text-xs font-sans text-slate-500">Iniciando cámara...</span>
              </div>
            )}

            {cameraState === "permission_denied" && (
              <div className="h-44 sm:h-60 w-full max-w-sm rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-1 sm:gap-2">
                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
                <span className="text-[11px] sm:text-xs font-sans font-semibold text-slate-700">Permiso denegado</span>
                <p className="text-[9px] sm:text-[10px] text-slate-500 leading-normal">
                  No podemos usar tu cámara para el QR. Dale permisos o utiliza &apos;Subir Captura&apos;.
                </p>
                <button
                  onClick={startCamera}
                  className="mt-1 text-[9px] sm:text-[10px] font-sans font-semibold bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-700"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}

            {cameraState === "on" && !scanResult && (
              <div className="relative w-full max-w-sm bg-black rounded-lg overflow-hidden border border-slate-300">
                <video ref={videoRef} className="w-full h-44 sm:h-60 object-cover" />
                {/* Hidden canvas for extracting imageData */}
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Green scanner overlay lines */}
                <div className="absolute inset-0 border-2 border-emerald-500/30 flex items-center justify-center pointer-events-none">
                  <div className="w-32 h-32 sm:w-44 sm:h-44 border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center relative">
                    <span className="absolute top-1 left-1 text-[7px] sm:text-[8px] font-mono text-emerald-400 bg-black/50 px-1 rounded">
                      Enfoca el QR
                    </span>
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400"></div>
                  </div>
                </div>

                <button
                  id="scanner-camera-stop-btn"
                  onClick={stopCamera}
                  className="absolute bottom-2 right-2 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white text-[9px] flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="pr-1">Pausar Cámara</span>
                </button>
              </div>
            )}

            {cameraState === "off" && !scanResult && (
              <div className="h-44 sm:h-60 w-full max-w-sm rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center p-3 sm:p-4">
                <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 mb-1" />
                <span className="text-xs font-sans font-bold text-slate-700">Cámara suspendida</span>
                <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 max-w-[240px]">
                  La cámara está apagada para ahorrar batería.
                </p>
                <button
                  id="scanner-camera-activate-btn"
                  onClick={startCamera}
                  className="mt-2.5 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-[11px] sm:text-xs text-white font-sans font-bold rounded-lg transition-all"
                >
                  Activar Escáner Cámara
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "upload" && (
          <div className="flex flex-col items-center">
            <label className="w-full max-w-sm h-36 sm:h-48 border-2 border-dashed border-slate-300 hover:border-teal-500 hover:bg-slate-50 transition-all rounded-lg flex flex-col items-center justify-center p-3 sm:p-4 text-center cursor-pointer">
              <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 mb-1" />
              <span className="text-[11px] sm:text-xs font-sans font-bold text-slate-700">Selecciona una imagen</span>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                Sube una captura con el código QR.
              </p>
              <input
                id="qr-file-upload-input"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {activeTab === "manual" && (
          <form onSubmit={handleManualAdd} className="space-y-2 sm:space-y-3 max-w-sm mx-auto">
            <div>
              <label className="block text-[10px] sm:text-xs font-sans font-semibold text-slate-600 mb-0.5 sm:mb-1">
                ID Único del Contacto
              </label>
              <input
                id="manual-id-input"
                type="text"
                placeholder="Ej: ABC3-98F1"
                maxLength={9}
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="w-full font-mono font-bold text-slate-800 border-2 border-slate-200 rounded-lg px-2.5 py-1.5 sm:py-2 text-xs sm:text-sm uppercase bg-slate-50 focus:outline-none focus:border-teal-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] sm:text-xs font-sans font-semibold text-slate-600 mb-0.5 sm:mb-1">
                Nombre de Alerta / Alias
              </label>
              <input
                id="manual-name-input"
                type="text"
                placeholder="Ej: Mamá, Juan Pérez"
                maxLength={20}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full font-sans text-slate-800 border-2 border-slate-200 rounded-lg px-2.5 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-50 focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            <button
              id="manual-add-submit-btn"
              type="submit"
              className="w-full py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-white font-sans font-bold text-[11px] sm:text-xs rounded-lg transition-all"
            >
              + Agregar por Código ID
            </button>
          </form>
        )}

        {/* Results Card if QR decoded successfully */}
        {scanResult && (
          <div className="mt-4 bg-emerald-50 border-2 border-emerald-200 p-3.5 rounded-xl max-w-sm mx-auto">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="block text-[10px] font-mono text-emerald-700 font-semibold uppercase">QR DETECTADO</span>
                <span className="text-sm font-sans font-bold text-slate-800 block">
                  {scanResult.name}
                </span>
                <span className="text-xs font-mono text-slate-600 block">
                  ID: {scanResult.id}
                </span>

                {scanResult.t && (
                  <span className="text-[9px] block text-amber-600 font-mono italic mt-1">
                    Conexión QR temporal activa
                  </span>
                )}
                
                <div className="flex gap-2 mt-3">
                  <button
                    id="add-scanned-contact-btn"
                    onClick={handleConfirmAdd}
                    className="flex-1 py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs rounded transition-all focus:ring-2 focus:ring-emerald-400"
                  >
                    Agregar Contacto
                  </button>
                  <button
                    onClick={() => {
                      setScanResult(null);
                      if (activeTab === "camera") startCamera();
                    }}
                    className="py-1 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-sans font-semibold text-xs rounded transition-all"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Feedbacks */}
        {addFeedback && (
          <div
            className={`mt-4 p-3 rounded-xl max-w-sm mx-auto flex items-start gap-2 text-xs leading-normal font-sans shadow-sm ${
              addFeedback.type === "success"
                ? "bg-emerald-100/85 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
            id="scanner-feedback-banner"
          >
            {addFeedback.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            )}
            <div>{addFeedback.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}
