import React, { useState } from "react";
import { 
  Languages, 
  Accessibility, 
  User, 
  LifeBuoy, 
  HeartHandshake, 
  Info, 
  Check, 
  ShieldAlert, 
  Trash2, 
  FileText, 
  Sparkles, 
  Lock,
  ExternalLink
} from "lucide-react";
import { UserProfile, NetworkMode } from "../types";

interface SettingsViewProps {
  profile: UserProfile;
  onUpdateProfileName: (newName: string) => void;
  networkStats: { mode: NetworkMode };
  onAddContact: (id: string, name: string) => boolean;
}

export default function SettingsView({
  profile,
  onUpdateProfileName,
  networkStats,
  onAddContact
}: SettingsViewProps) {
  // Locale State for interactive options
  const [selectedLang, setSelectedLang] = useState<string>("es-GT");
  const [textSize, setTextSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [reduceDataUsage, setReduceDataUsage] = useState<boolean>(true);
  
  // Support state
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [testBotSuccess, setTestBotSuccess] = useState(false);

  // Wipe profile state
  const [wipeConfirm, setWipeConfirm] = useState(false);

  // Profile name editing inline
  const [tempName, setTempName] = useState(profile.name);
  const [savedNameSuccess, setSavedNameSuccess] = useState(false);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onUpdateProfileName(tempName.trim());
      setSavedNameSuccess(true);
      setTimeout(() => setSavedNameSuccess(false), 2000);
    }
  };

  const handleWipeData = () => {
    if (!wipeConfirm) {
      setWipeConfirm(true);
      return;
    }
    // Delete all localStorage keys for PingGT and refresh page
    localStorage.removeItem("pinggt_profile");
    localStorage.removeItem("pinggt_contacts");
    localStorage.removeItem("pinggt_messages");
    window.location.reload();
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) {
      setSupportError("Por favor, escribe un mensaje de soporte.");
      return;
    }
    setSupportSubmitted(true);
    setSupportError("");
    setTimeout(() => {
      setSupportMessage("");
      setSupportSubmitted(false);
    }, 4000);
  };

  const handleQuickAction = (type: "soporte" | "x21") => {
    if (type === "soporte") {
      setSupportMessage(
        `[SOPORTE TÉCNICO] Reporte de Latencia / Latency Issue:\n• Red detectada: ${networkStats.mode.toUpperCase()}\n• Por favor, describe el error observado aquí: `
      );
    } else {
      setSupportMessage(
        `[FEEDBACK TRADUCCIÓN] Ajuste de idioma o traducción incorrecta:\n• Idioma: Español / k\'iche\' / Kaqchikel / q\'eqchi\'\n• Corrige la palabra o frase errónea aquí: `
      );
    }
  };

  const handleActivateTestBot = () => {
    onAddContact("BOT-X21", "Bot de Pruebas X21");
    setTestBotSuccess(true);
    setTimeout(() => {
      setTestBotSuccess(false);
    }, 5000);
  };

  return (
    <div className="space-y-4 sm:space-y-6" id="settings-view-wrapper">
      
      {/* 1. SECCIÓN DE CUENTA / IDENTIDAD */}
      <section className="bg-white border-2 border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-4" id="settings-account-sec">
        <h3 className="font-sans font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4.5 h-4.5 text-teal-600" /> Cuenta e Identidad
        </h3>

        <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="block text-[10px] font-mono text-slate-400 uppercase">
              ID de Dispositivo (Único Local)
            </span>
            <div className="font-mono font-black text-sm sm:text-base text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded inline-block">
              {profile.id}
            </div>
          </div>
          <div className="text-[10px] sm:text-xs font-sans text-slate-500 max-w-sm">
            Tus datos de conversación y chats están guardados directamente en la memoria local segura de tu navegador, garantizando privacidad total y velocidad inmediata.
          </div>
        </div>

        {/* Edit name form */}
        <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row sm:items-end gap-2.5">
          <div className="flex-1">
            <label className="block text-[10px] sm:text-xs font-sans font-bold text-slate-500 uppercase mb-1">
              Nombre de Usuario Visible
            </label>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              maxLength={22}
              className="w-full bg-slate-50 border-2 border-slate-200 focus:border-teal-500 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-sans font-bold text-slate-800 focus:outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-sans text-xs font-bold rounded-lg transition-all active:scale-95 shrink-0 min-h-[38px] flex items-center justify-center gap-1"
          >
            {savedNameSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> ¡Guardado!
              </>
            ) : (
              "Actualizar Nombre"
            )}
          </button>
        </form>
      </section>

      {/* 2. IDIOMA Y ACCESIBILIDAD */}
      <section className="bg-white border-2 border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-4" id="settings-lang-acc-sec">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Idioma */}
          <div className="space-y-3">
            <h3 className="font-sans font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Languages className="w-4.5 h-4.5 text-teal-600" /> Idiomas Disponibles
            </h3>
            <p className="text-[10px] sm:text-xs font-sans text-slate-500">
              Selecciona tu variante lingüística preferida (el Español es el predeterminado):
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { code: "es-GT", label: "Español (Predeterminado)" },
                { code: "en-US", label: "English (US)" },
                { code: "kiche", label: "K’iche’" },
                { code: "qeqchi", label: "Q’eqchi’" },
                { code: "kaqchikel", label: "Kaqchikel" }
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLang(lang.code)}
                  className={`px-3 py-2 text-left rounded-lg border font-sans text-xs font-bold flex items-center justify-between transition-all ${
                    selectedLang === lang.code
                      ? "bg-teal-50 border-teal-500 text-teal-900 shadow-sm"
                      : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{lang.label}</span>
                  {selectedLang === lang.code && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 ml-1" />}
                </button>
              ))}
            </div>

            {/* Mensaje de disculpa si la traduccion no es correcta */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 text-[10px] sm:text-xs text-amber-800 leading-normal font-sans">
              <strong>Nota de traducción:</strong> Si encuentras alguna traducción o término que no sea correcto, te pedimos disculpas. Por favor, contáctate con el equipo de <strong>X21 Team Group / X21 Grupo Asociado</strong> para solucionarlo y arreglarlo de inmediato.
            </div>
          </div>

          {/* Accesibilidad */}
          <div className="space-y-3">
            <h3 className="font-sans font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Accessibility className="w-4.5 h-4.5 text-teal-600" /> Accesibilidad visual
            </h3>
            <p className="text-[10px] sm:text-xs font-sans text-slate-500">
              Personaliza el renderizado gráfico para mejorar la legibilidad o ahorrar RAM:
            </p>

            <div className="space-y-2">
              {/* Text size selector */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs font-sans font-bold text-slate-700">Tamaño de Texto</span>
                <div className="flex gap-1 bg-white p-0.5 border border-slate-200 rounded-md">
                  {(["normal", "large", "xlarge"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setTextSize(sz)}
                      className={`px-2 py-0.5 text-[10px] font-sans font-bold capitalize rounded transition-all ${
                        textSize === sz
                          ? "bg-slate-800 text-white"
                          : "text-slate-550 hover:text-slate-800"
                      }`}
                    >
                      {sz === "normal" ? "A" : sz === "large" ? "A+" : "A++"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contrast and Animations Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer select-none">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-sans font-bold text-slate-700">Alto Contraste</span>
                    <span className="text-[8px] font-mono text-slate-400">Bordeado sólido</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 border-slate-300"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer select-none">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-sans font-bold text-slate-700">Ahorro Extremo</span>
                    <span className="text-[8px] font-mono text-slate-400">Reduce loops</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={reduceDataUsage}
                    onChange={(e) => setReduceDataUsage(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 border-slate-300"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FILOSOFÍA DE PINGGT */}
      <section className="bg-white border-2 border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-4" id="settings-philosophy-sec">
        <h3 className="font-sans font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <HeartHandshake className="w-4.5 h-4.5 text-teal-600" /> Filosofía de PingGT
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-slate-650 leading-relaxed bg-teal-50/30 p-3 sm:p-4 rounded-xl border border-teal-100">
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <span className="text-teal-700 font-mono">1.</span> Sin cuentas complicadas
            </h4>
            <p>
              Generamos un ID aleatorio local inmediato. No recopilamos contraseñas ni correos que consumen transmisión de fondo. Tu dispositivo es tu cuenta.
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <span className="text-teal-700 font-mono">2.</span> Envío en colas inteligente
            </h4>
            <p>
              ¿Manejando en carretera o subiendo al bus en Mixco y te quedas sin señal? Escribe tranquilo; el software encripta y guarda en la memoria interna el mensaje (🕒), y en cuanto detecta un micro-ping, lo procesa sin que tengas que reintentar.
            </p>
          </div>
        </div>
      </section>

      {/* 4. CONTACTO Y SOPORTE (Garantía de servicio) */}
      <section className="bg-white border-2 border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-4" id="settings-support-sec">
        <h3 className="font-sans font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <LifeBuoy className="w-4.5 h-4.5 text-teal-600" /> Canal de Soporte Guate
        </h3>
        <p className="text-[10px] sm:text-xs font-sans text-slate-500 leading-normal">
          ¿Encontraste un problema con el envío de mensajes o tienes sugerencias para mejorar el ahorro de datos en Claro o Tigo? Envía un reporte express y un ingeniero de PingGT lo evaluará de inmediato.
        </p>

        {/* Botones de acción para reporte express y prueba interactiva */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-1" id="support-actions-container">
          <button
            type="button"
            onClick={() => handleQuickAction("soporte")}
            className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl text-left transition-all text-xs font-sans text-slate-700 active:scale-[0.98]"
          >
            <span className="text-sm">🔧</span>
            <div className="min-w-0">
              <span className="block font-bold truncate">Soporte Técnico</span>
              <span className="block text-[8px] text-slate-400 font-mono truncate">Reportes rápidos</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAction("x21")}
            className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-400 rounded-xl text-left transition-all text-xs font-sans text-slate-700 active:scale-[0.98]"
          >
            <span className="text-sm">🗣️</span>
            <div className="min-w-0">
              <span className="block font-bold truncate">Contactar a X21</span>
              <span className="block text-[8px] text-slate-400 font-mono truncate">Errores de traducción</span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleActivateTestBot}
            className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-xl text-left transition-all text-xs font-sans text-slate-700 active:scale-[0.98]"
          >
            <span className="text-sm">🤖</span>
            <div className="min-w-0">
              <span className="block font-bold truncate">Bot de Pruebas</span>
              <span className="block text-[8px] text-slate-400 font-mono truncate">Chat de simulación</span>
            </div>
          </button>
        </div>

        {testBotSuccess && (
          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-lg text-blue-800 text-[10px] sm:text-xs font-sans font-medium flex items-center gap-1.5 animate-pulse">
            <span className="text-sm">🤖</span>
            <span><strong>¡Bot de Pruebas X21 activado!</strong> Se agregó el contacto <strong>BOT-X21</strong> a tu bandeja. Abre los Chats para interactuar con él, incluso sin conexión para ver la cola inteligente en tiempo real.</span>
          </div>
        )}

        {supportSubmitted ? (
          <div className="bg-emerald-55 bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex flex-col items-center text-center gap-1.5">
            <Sparkles className="w-6 h-6 text-emerald-600 animate-pulse" />
            <span className="text-xs font-sans font-bold text-slate-800">¡Mensaje de soporte enviado!</span>
            <p className="text-[10px] text-slate-600 max-w-sm">
              Súper nítido. Tus diagnósticos de latencia y estado de red se enviaron de forma encriptada y optimizada en 120 bytes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSupportSubmit} className="space-y-3">
            {supportError && (
              <div className="text-[10px] text-red-650 font-sans font-semibold bg-red-50 px-2 py-1.5 rounded">
                {supportError}
              </div>
            )}
            <div>
              <textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Escribe tus requerimientos de soporte o sugerencias de optimización para Guatemala..."
                rows={3}
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-teal-500 text-slate-800 text-xs font-sans rounded-xl p-3 focus:outline-none placeholder-slate-400 transition-all leading-normal"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
              <span className="text-[8px] sm:text-[9.5px] font-mono text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-600 shrink-0" /> Payload encriptado TLS Lite: ~120 Bytes recomendados
              </span>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white font-sans text-xs font-bold rounded-lg transition-all active:scale-95 shrink-0 min-h-[38px]"
              >
                Enviar Ticket Express
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 5. ELIMINACIÓN DE REGISTROS (Seguridad Extrema) */}
      <section className="bg-white border-2 border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3" id="settings-wipe-sec">
        <h3 className="font-sans font-bold text-xs sm:text-sm text-red-800 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4.5 h-4.5 text-red-600" /> Peligro y Privacidad
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
          <div className="flex-1">
            <span className="block font-sans font-bold text-slate-800 text-xs">Borrar Datos Locales</span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Esto restablece tu ID de PingGT y elimina todos tus contactos y el historial de chats para siempre de este navegador. Esta acción es irreversible.
            </p>
          </div>
          <button
            type="button"
            onClick={handleWipeData}
            className={`w-full sm:w-auto px-4 py-2 text-xs font-sans font-bold rounded-lg transition-all shrink-0 min-h-[38px] flex items-center justify-center gap-1.5 ${
              wipeConfirm 
                ? "bg-red-600 hover:bg-red-550 text-white animate-pulse" 
                : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {wipeConfirm ? "¿Seguro? Clic otra vez" : "Eliminar Todo"}
          </button>
        </div>
      </section>

      {/* 6. CRÉDITOS Y SOFTWARE LIBRE DE OPTIMIZACIÓN */}
      <section className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 text-center space-y-2" id="settings-credits-sec">
        <p className="text-[11px] font-sans text-slate-600 leading-relaxed max-w-xl mx-auto">
          Este es un <strong>proyecto libre</strong> enfocado en la optimización extrema del flujo de datos en redes móviles inestables o congestionadas de Guatemala, traído y distribuido voluntariamente por <strong>X21 Team Group / X21 Grupo Asociado</strong>.
        </p>
        <p className="text-[10px] font-sans text-slate-400">
          Agradecimientos y créditos especiales a <strong>Google</strong>, debido a que su Inteligencia Artificial fue utilizada durante el proceso de desarrollo de esta aplicación.
        </p>
      </section>

    </div>
  );
}
