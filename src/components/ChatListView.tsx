import React, { useState } from "react";
import { Contact } from "../types";
import { User, MessageSquare, Search, PlusCircle, UserCheck } from "lucide-react";

interface ChatListViewProps {
  contacts: Contact[];
  activeContactId: string | null;
  onSelectContact: (contactId: string) => void;
  onNavigateToScanner: () => void;
}

export default function ChatListView({
  contacts,
  activeContactId,
  onSelectContact,
  onNavigateToScanner
}: ChatListViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden h-full flex flex-col" id="chat-list-widget">
      {/* Search Header */}
      <div className="p-2 sm:p-3 border-b border-slate-200 bg-slate-50 space-y-1.5 sm:space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 sm:top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            id="chat-search-input"
            type="text"
            placeholder="Buscar por nombre o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white text-slate-800 text-[11px] sm:text-xs font-sans pl-8 pr-3 py-1.5 sm:py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
          />
        </div>
        
        {/* Quick actions bar */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] sm:text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wide">
            Contactos ({contacts.length})
          </span>
          <button
            id="quick-add-scanner-btn"
            onClick={onNavigateToScanner}
            className="text-[10px] sm:text-[11px] font-sans font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 active:scale-95 transition-all"
          >
            <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Agregar Código / QR
          </button>
        </div>
      </div>

      {/* Contacts List container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[360px]" id="chats-scroller">
        {filteredContacts.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-slate-500">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 mx-auto mb-1" />
            <p className="text-[11px] sm:text-xs font-sans font-medium">Ningún contacto encontrado</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 max-w-[200px] mx-auto">
              Utiliza un ID o escanea un QR para comenzar.
            </p>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isActive = activeContactId === contact.id;
            return (
              <button
                key={contact.id}
                id={`chat-item-${contact.id}`}
                onClick={() => onSelectContact(contact.id)}
                className={`w-full text-left p-2 sm:p-3.5 flex items-center gap-2 sm:gap-3 transition-all relative ${
                  isActive
                    ? "bg-teal-5/40 bg-teal-50/50 border-l-4 border-teal-600"
                    : "hover:bg-slate-50 border-l-4 border-transparent"
                }`}
                style={{ contentVisibility: "auto" }} // Rendering optimization for low end RAM
              >
                {/* Visual Avatar */}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-sans font-bold text-xs sm:text-sm shrink-0 border uppercase ${
                  isActive 
                    ? "bg-teal-600 text-white border-teal-600" 
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}>
                  {contact.name.substring(0, 2)}
                </div>

                {/* Meta details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-sans font-bold text-xs sm:text-sm text-slate-800 truncate block">
                      {contact.name}
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-mono text-slate-400 shrink-0">
                      {contact.id}
                    </span>
                  </div>

                  {contact.lastMessage ? (
                    <p className="text-[10px] sm:text-xs font-sans text-slate-500 truncate mt-0.5 max-w-[180px]">
                      {contact.lastMessage}
                    </p>
                  ) : (
                    <p className="text-[9px] sm:text-[10px] font-sans font-medium italic text-slate-400 mt-0.5">
                      Sin mensajes aún (Toca para chatear)
                    </p>
                  )}
                </div>

                {/* Badge alert */}
                {contact.unreadCount && contact.unreadCount > 0 ? (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-600 text-white font-mono font-bold text-[8px] flex items-center justify-center animate-bounce shadow">
                    {contact.unreadCount}
                  </div>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {/* Prompt footer regarding battery and efficiency */}
      <div className="bg-slate-50 p-1.5 border-t border-slate-100 text-[9px] sm:text-[10px] text-center text-slate-400 font-mono flex items-center justify-center gap-1">
        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
        Filtrado e indizado instantáneo en el dispositivo
      </div>
    </div>
  );
}
