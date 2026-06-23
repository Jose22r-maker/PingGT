import React, { useState } from "react";
import { MessageSquare, QrCode, User, Shield, Search, Star, Sparkles, ChevronRight } from "lucide-react";
import { NetworkStats, NetworkMode, Contact } from "../types";

interface HomeViewProps {
  userName: string;
  userId: string;
  contactCount: number;
  savings: { standardKb: number; pingGtkb: number; savedPercent: number };
  networkStats: NetworkStats;
  onModeChange: (mode: NetworkMode) => void;
  onNavigate: (tab: "chats" | "scanner" | "profile") => void;
  onManualSync: () => void;
  isSyncing: boolean;
  contacts: Contact[];
  onSelectContact: (id: string) => void;
}

export default function HomeView({
  userName,
  userId,
  contactCount,
  savings,
  networkStats,
  onModeChange,
  onNavigate,
  onManualSync,
  isSyncing,
  contacts,
  onSelectContact
}: HomeViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Sort contacts by lastMessageTime (or addedAt) to find the most active/important ones
  const activeContacts = [...contacts].sort((a, b) => {
    const timeA = a.lastMessageTime || a.addedAt || 0;
    const timeB = b.lastMessageTime || b.addedAt || 0;
    return timeB - timeA;
  });

  // Filter contacts by the search term
  const filteredContacts = activeContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="space-y-3 sm:space-y-6" id="home-view-container">
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 text-white shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-teal-500 rounded-full blur-2xl sm:blur-3xl -mr-8 -mt-8 opacity-20"></div>
        <div className="absolute bottom-0 left-12 w-20 h-20 sm:w-24 sm:h-24 bg-emerald-400 rounded-full blur-2xl opacity-10"></div>
        
        <div className="relative">
          <span className="bg-emerald-500 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            Conectividad Inclusiva
          </span>
          <h2 className="text-lg sm:text-2xl font-sans font-extrabold mt-1 sm:mt-2 leading-tight">
            ¡Hola, {userName}!
          </h2>
          <p className="text-teal-100 text-[11px] sm:text-xs mt-1 font-sans max-w-[480px] leading-relaxed">
            Tu ID es <span className="font-mono font-bold bg-teal-900/40 px-1 py-0.5 rounded text-white">{userId}</span>. 
            Bienvenido a la mensajería ligera, ideal para poca señal, zonas rurales y recargas prepago en Guatemala.
          </p>
        </div>
      </div>

      {/* Sección de Búsqueda y Chats más Importantes (Carrusel) */}
      <div className="bg-white border-2 border-slate-200/90 rounded-xl sm:rounded-2xl p-4 space-y-4 shadow-sm" id="home-featured-chats-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-50 rounded-lg text-teal-600">
              <Star className="w-4 h-4 fill-teal-500/20 text-teal-600" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800 leading-tight">
                Chats más Importantes
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Acceso ultra-rápido en un clic
              </p>
            </div>
          </div>

          {/* El Buscador */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-450">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-sans text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Carrusel */}
        {filteredContacts.length > 0 ? (
          <div className="flex overflow-x-auto gap-3 pb-2 pt-0.5 scrollbar-thin scrollbar-thumb-teal-600/20 scrollbar-track-transparent snap-x snap-mandatory">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact.id)}
                className="bg-slate-50 border border-slate-205 hover:border-teal-500 rounded-xl p-3 text-left transition-all hover:shadow-md hover:shadow-slate-100 flex flex-col justify-between w-[160px] sm:w-[190px] shrink-0 cursor-pointer snap-start group relative"
              >
                {/* Header card info */}
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-sans font-bold text-xs flex items-center justify-center capitalize shrink-0 border border-teal-200">
                      {contact.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="block font-sans font-bold text-slate-700 text-xs truncate group-hover:text-teal-700">
                        {contact.name}
                      </span>
                      <span className="block font-mono text-[9px] text-slate-400 leading-none mt-0.5">
                        {contact.id}
                      </span>
                    </div>
                  </div>
                  
                  {/* Unread badge if any */}
                  {contact.unreadCount && contact.unreadCount > 0 ? (
                    <span className="block px-1.5 py-0.5 bg-emerald-600 border border-emerald-400 text-white font-mono font-bold text-[8px] rounded-full animate-bounce shrink-0">
                      {contact.unreadCount}
                    </span>
                  ) : null}
                </div>

                {/* Body card message preview */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 w-full">
                  <p className="text-[10px] font-sans text-slate-500 line-clamp-1 h-3 leading-normal">
                    {contact.lastMessage || "Sin mensajes aún"}
                  </p>
                  
                  {/* Timestamp or Status */}
                  <div className="flex items-center justify-between mt-1 text-[8px] text-slate-400 font-mono">
                    <span>
                      {contact.lastMessageTime 
                        ? new Date(contact.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : "Disponible"
                      }
                    </span>
                    <span className="text-[7.5px] sm:text-[8px] bg-teal-50 text-teal-800 font-bold px-1 rounded flex items-center gap-0.5 group-hover:bg-teal-650 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                      Chatear <ChevronRight className="w-2 h-2" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center w-full">
            <p className="text-xs font-sans text-slate-500">
              {searchTerm 
                ? `No encontramos contactos que coincidan con "${searchTerm}"`
                : "No tienes contactos agregados. Ve a 'Agregar QR' para iniciar."}
            </p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="mt-2 text-[10px] font-sans font-bold text-teal-600 hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>

      {/* Botones Grandes de Acción de Inicio */}
      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-4" id="home-actions-grid">
        {/* Ir a Chats */}
        <button
          id="home-btn-chats"
          onClick={() => onNavigate("chats")}
          className="bg-white border-2 border-slate-200 hover:border-teal-600 rounded-xl sm:rounded-2xl p-3 sm:p-5 text-left transition-all active:scale-[0.98] group relative flex flex-row sm:flex-col items-center sm:items-stretch sm:justify-between h-14 sm:h-36 shadow-sm gap-3"
        >
          <div className="flex sm:justify-between items-center sm:items-start w-auto sm:w-full shrink-0">
            <div className="p-2 sm:p-3 bg-teal-55 bg-teal-50 text-teal-700 rounded-lg sm:rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <MessageSquare className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="block font-sans font-extrabold text-slate-800 text-sm sm:text-base leading-none">
              Mis Chats
            </span>
            <span className="text-[10px] sm:text-[11px] font-sans text-slate-400 sm:text-slate-500 mt-0.5 sm:mt-1 block truncate">
              Inicia o continúa tu mensajería ligera.
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
            {contactCount} {contactCount === 1 ? "chat" : "chats"}
          </span>
        </button>

        {/* Agregar QR */}
        <button
          id="home-btn-scanner"
          onClick={() => onNavigate("scanner")}
          className="bg-white border-2 border-slate-200 hover:border-emerald-600 rounded-xl sm:rounded-2xl p-3 sm:p-5 text-left transition-all active:scale-[0.98] group relative flex flex-row sm:flex-col items-center sm:items-stretch sm:justify-between h-14 sm:h-36 shadow-sm gap-3"
        >
          <div className="flex sm:justify-between items-center sm:items-start w-auto sm:w-full shrink-0">
            <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-700 rounded-lg sm:rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <QrCode className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="block font-sans font-extrabold text-slate-800 text-sm sm:text-base leading-none">
              Escanear QR o ID
            </span>
            <span className="text-[10px] sm:text-[11px] font-sans text-slate-400 sm:text-slate-500 mt-0.5 sm:mt-1 block truncate">
              Agrega contactos al instante apuntando al código o subiendo imagen.
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full shrink-0">
            Cámara
          </span>
        </button>

        {/* Mi Perfil */}
        <button
          id="home-btn-profile"
          onClick={() => onNavigate("profile")}
          className="bg-white border-2 border-slate-200 hover:border-teal-600 rounded-xl sm:rounded-2xl p-3 sm:p-5 text-left transition-all active:scale-[0.98] group relative flex flex-row sm:flex-col items-center sm:items-stretch sm:justify-between h-14 sm:h-36 shadow-sm gap-3"
        >
          <div className="flex sm:justify-between items-center sm:items-start w-auto sm:w-full shrink-0">
            <div className="p-2 sm:p-3 bg-teal-50 text-teal-700 rounded-lg sm:rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <User className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="block font-sans font-extrabold text-slate-800 text-sm sm:text-base leading-none">
              Mi Identidad
            </span>
            <span className="text-[10px] sm:text-[11px] font-sans text-slate-400 sm:text-slate-500 mt-0.5 sm:mt-1 block truncate">
              Tu propio código QR y configuración de nombre.
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">
            Tu QR
          </span>
        </button>
      </div>

    </div>
  );
}
