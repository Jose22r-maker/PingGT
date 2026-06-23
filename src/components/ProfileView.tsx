import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { UserProfile } from "../types";
import { Edit2, Check, QrCode, ShieldCheck, BatteryCharging, Share2, Info } from "lucide-react";

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (name: string) => void;
  bytesSavedKb: number;
}

export default function ProfileView({ profile, onUpdateProfile, bytesSavedKb }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(profile.name);
  const [isTemporaryQr, setIsTemporaryQr] = useState(false);
  const [tempQrExpiry, setTempQrExpiry] = useState<number | null>(null);
  const [qrToken, setQrToken] = useState(1); // Incrementable for manual regeneration
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Expiration checking effect for temporary QR
  useEffect(() => {
    if (!isTemporaryQr) {
      setTempQrExpiry(null);
      return;
    }

    // Set expiry 5 minutes from now
    const expiry = Date.now() + 5 * 60 * 1000;
    setTempQrExpiry(expiry);

    const interval = setInterval(() => {
      if (Date.now() > expiry) {
        // Force regenerate token
        setQrToken((prev) => prev + 1);
        setTempQrExpiry(Date.now() + 5 * 60 * 1000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTemporaryQr, qrToken]);

  // QR Code canvas rendering effect
  useEffect(() => {
    if (!canvasRef.current || !profile.id) return;

    // Create JSON QR payload requested by spec
    const qrPayload = {
      id: profile.id,
      name: profile.name,
      ...(isTemporaryQr && {
        t: tempQrExpiry || (Date.now() + 5 * 60 * 1000),
        r: qrToken // Randomizer salt
      })
    };

    const payloadText = JSON.stringify(qrPayload);
    const qrWidth = window.innerWidth < 480 ? 150 : 190;

    QRCode.toCanvas(
      canvasRef.current,
      payloadText,
      {
        width: qrWidth,
        margin: 1,
        color: {
          dark: "#0F172A", // Slate dark
          light: "#F1F5F9" // Slate light grey for lightweight high contrast
        }
      },
      (error) => {
        if (error) {
          console.error("Error generating QR:", error);
          setQrError("No se pudo generar el código QR");
        } else {
          setQrError(null);
        }
      }
    );
  }, [profile, isTemporaryQr, tempQrExpiry, qrToken]);

  const handleSaveName = () => {
    const trimmed = editedName.trim();
    if (trimmed) {
      onUpdateProfile(trimmed);
      setIsEditing(false);
    }
  };

  const handleRegenerateQr = () => {
    setQrToken((prev) => prev + 1);
    if (isTemporaryQr) {
      setTempQrExpiry(Date.now() + 5 * 60 * 1000);
    }
    // Simple visual highlight
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.classList.add("scale-[0.98]");
      setTimeout(() => canvas.classList.remove("scale-[0.98]"), 150);
    }
  };

  const getSecondsRemaining = () => {
    if (!tempQrExpiry) return 0;
    return Math.max(0, Math.round((tempQrExpiry - Date.now()) / 1000));
  };

  const [counter, setCounter] = useState(0);
  useEffect(() => {
    if (!tempQrExpiry) return;
    const t = setInterval(() => setCounter((c) => c + 1), 1000);
    return () => clearInterval(t);
  }, [tempQrExpiry]);

  const remainingSeconds = getSecondsRemaining();

  return (
    <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 sm:p-4 md:p-6" id="profile-container">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6 items-start">
        {/* Name / ID Profile Card */}
        <div className="md:col-span-7 space-y-3 sm:space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-40"></div>
            
            <label className="block text-[10px] sm:text-xs font-sans font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Nombre de Usuario
            </label>
            
            {isEditing ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <input
                  id="profile-name-input"
                  type="text"
                  maxLength={25}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="font-sans font-bold text-sm sm:text-lg text-slate-800 border-2 border-teal-500 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none w-full"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  autoFocus
                />
                <button
                  id="profile-name-save-btn"
                  onClick={handleSaveName}
                  className="p-1.5 sm:p-2 bg-emerald-600 rounded-lg text-white hover:bg-emerald-500 shrink-0"
                  aria-label="Confirmar nombre"
                >
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-bold text-base sm:text-xl text-slate-800 truncate" id="display-username">
                  {profile.name}
                </h2>
                <button
                  id="profile-name-edit-btn"
                  onClick={() => {
                    setEditedName(profile.name);
                    setIsEditing(true);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                  aria-label="Editar nombre"
                >
                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}

            {/* Permanent Short Unique Identifier */}
            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div>
                <label className="block text-[9px] sm:text-[10px] font-sans font-semibold text-slate-400 uppercase">
                  ID Único (Fijo)
                </label>
                <div className="font-mono font-bold text-sm sm:text-base text-slate-700 select-all" id="profile-short-id">
                  {profile.id}
                </div>
              </div>
              
              {/* Copy button */}
              <button
                id="copy-id-btn"
                onClick={() => {
                  navigator.clipboard.writeText(profile.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`text-[10px] sm:text-xs font-sans font-bold px-2.5 py-1.5 rounded-md flex items-center gap-1 active:scale-95 transition-all ${
                  copied
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                }`}
              >
                <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {copied ? "¡ID Copiado!" : "Compartir ID"}
              </button>
            </div>
          </div>

          {/* Efficiency indicators tailored for Guatemala networks */}
          <div className="space-y-1.5 sm:space-y-2">
            <h4 className="text-[10px] sm:text-xs font-sans font-semibold text-slate-500 uppercase tracking-wider">
              Diagnóstico de Eficiencia
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              <div className="bg-white border border-slate-100 p-2 sm:p-3 rounded-lg flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 bg-emerald-50 rounded-full shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <span className="block text-[8px] sm:text-[10px] text-slate-400 font-mono leading-none">AHORRO NETO</span>
                  <span className="text-[11px] sm:text-xs font-sans font-bold text-slate-700">+{bytesSavedKb.toFixed(1)} KB reales</span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 p-2 sm:p-3 rounded-lg flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 bg-amber-50 rounded-full shrink-0">
                  <BatteryCharging className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="block text-[8px] sm:text-[10px] text-slate-400 font-mono leading-none">BATERÍA LITE</span>
                  <span className="text-[11px] sm:text-xs font-sans font-bold text-emerald-600">Optimizada (Activa)</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 p-2 sm:p-3 rounded-lg text-[10px] sm:text-xs leading-relaxed text-slate-600 font-sans">
              <div className="flex gap-1.5 items-start">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <p>
                  <strong>¿Cómo funciona?</strong> No necesitas contraseña. Tu identidad reside en la firma local de tu <strong>ID {profile.id}</strong>. Tus contactos te pueden escanear para agregarte de forma segura.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="bg-slate-100 p-3 sm:p-4 rounded-xl border border-slate-200 flex flex-col items-center shadow-inner w-full max-w-[180px] sm:max-w-[240px]">
            <div className="w-[140px] h-[140px] sm:w-[190px] sm:h-[190px] bg-slate-200 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 relative">
              {qrError ? (
                <div className="text-[10px] text-red-500 text-center p-2 font-mono">{qrError}</div>
              ) : (
                <canvas ref={canvasRef} className="rounded" id="profile-qr-canvas" />
              )}
            </div>
            
            <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 mt-1.5 sm:mt-2 text-center uppercase tracking-wider flex items-center gap-1 justify-center">
              <QrCode className="w-3 h-3" /> Tu Código QR
            </span>
          </div>

          <div className="w-full max-w-[180px] sm:max-w-[240px] mt-2.5 sm:mt-3 space-y-1.5">
            {/* Toggle temporary QR */}
            <label className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200/50 cursor-pointer select-none">
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-sans font-bold text-teal-800 leading-none">QR Temporal</span>
                <span className="text-[8px] sm:text-[9px] font-mono text-teal-600 mt-0.5">Expira en 5 min</span>
              </div>
              <input
                id="toggle-temp-qr-checkbox"
                type="checkbox"
                checked={isTemporaryQr}
                onChange={(e) => setIsTemporaryQr(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 border-teal-300"
              />
            </label>

            {isTemporaryQr && remainingSeconds > 0 && (
              <div className="text-center bg-red-55 bg-red-50 border border-red-200 rounded p-1 text-[9px] sm:text-[10px] font-mono text-red-600 animate-pulse">
                Expira en: {Math.floor(remainingSeconds / 60)}m {remainingSeconds % 60}s
              </div>
            )}

            {/* Manual QR Regeneration */}
            <button
              id="regenerate-qr-btn"
              onClick={handleRegenerateQr}
              className="w-full py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white text-[11px] sm:text-xs font-sans font-bold rounded-lg transition-all"
            >
              Regenerar QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
