import React, { useState, useRef, useEffect } from "react";
import { Message, Contact, NetworkStats } from "../types";
import { Send, Clock, Check, CheckCheck, Landmark, AlertCircle, RefreshCw, Smartphone } from "lucide-react";
import { estimateBytes } from "../lib/pingEngine";

interface ChatConversationViewProps {
  contact: Contact;
  currentUserProfileId: string;
  messages: Message[];
  networkStats: NetworkStats;
  onSendMessage: (text: string) => void;
  onRetryMessage: (messageId: string) => void;
  onSimulatePeerReply: () => void;
}

export default function ChatConversationView({
  contact,
  currentUserProfileId,
  messages,
  networkStats,
  onSendMessage,
  onRetryMessage,
  onSimulatePeerReply
}: ChatConversationViewProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever new messages land
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      setInputText("");
    }
  };

  const getStatusIcon = (status: "queue" | "sent" | "delivered") => {
    switch (status) {
      case "queue":
        return <Clock className="w-3.5 h-3.5 text-amber-500" title="En cola (sin conexión)" />;
      case "sent":
        return <Check className="w-3.5 h-3.5 text-slate-400" title="Enviado al servidor" />;
      case "delivered":
        return <CheckCheck className="w-3.5 h-3.5 text-teal-600" title="Entregado al contacto" />;
    }
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden h-[400px] sm:h-[465px] flex flex-col" id="conversation-pane">
      {/* Active Conversation Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 sm:p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-teal-600 text-white font-sans font-bold text-[10px] sm:text-xs flex items-center justify-center border border-teal-700 capitalize shrink-0">
            {contact.name.substring(0, 2)}
          </div>
          <div className="min-w-0">
            <h4 className="font-sans font-bold text-xs sm:text-sm text-slate-800 truncate" id="chat-header-name">
              Chateando con: {contact.name}
            </h4>
            <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 truncate">
              ID: {contact.id} • Latencia: {networkStats.latencyMs} ms
            </p>
          </div>
        </div>

        {/* Local peer answer simulator */}
        <button
          id="simulate-answer-btn"
          onClick={onSimulatePeerReply}
          className="text-[9px] sm:text-[10px] font-sans font-bold bg-teal-100/80 hover:bg-teal-200 text-teal-800 px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg flex items-center gap-0.5 sm:gap-1 active:scale-95 transition-all shrink-0"
          title="Simula un mensaje de esta persona en un entorno sin conexión o baja conexión"
        >
          <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden min-[360px]:inline">Simular Resp.</span>
        </button>
      </div>

      {/* Network Alert Status Strip inside chat box */}
      {networkStats.mode === "offline" && (
        <div className="bg-red-50 text-red-700 font-mono text-[9px] sm:text-[10px] text-center py-1 border-b border-red-100 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3 text-red-500" />
          Estás sin conexión. Mensajes en cola local (🕒).
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3 bg-slate-50/50" id="conversation-scroller">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6">
            <Landmark className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 mb-1" />
            <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest block">
              COMIENZO DE CONVERSACIÓN
            </span>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 max-w-[200px]">
              Envía tu primer mensaje ligero. No consumirá recursos innecesarios.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.from === currentUserProfileId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {/* Bubble Container */}
                <div className="max-w-[85%] sm:max-w-[75%] flex items-end gap-1 sm:gap-1.5">
                  {!isMe && (
                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-sans font-bold text-[8px] flex items-center justify-center shrink-0 border border-slate-300 uppercase">
                      {contact.name.substring(0, 1)}
                    </div>
                  )}

                  <div
                    className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border relative shadow-sm ${
                      isMe
                        ? "bg-white text-slate-800 border-slate-200 rounded-br-none"
                        : "bg-teal-700 text-white border-teal-800 rounded-bl-none"
                    }`}
                  >
                    <p className="text-[11px] sm:text-xs font-sans break-words whitespace-pre-wrap leading-normal">
                      {msg.text}
                    </p>

                    {/* Metadata strip inside bubble */}
                    <div className="flex items-center justify-end gap-1 sm:gap-1.5 mt-1 sm:mt-1.5 border-t border-slate-100/10 pt-0.5 sm:pt-1">
                      <span className="text-[7.5px] sm:text-[8px] font-mono opacity-60">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      
                      <span className="text-[7.5px] sm:text-[8px] font-mono bg-slate-800/10 dark:bg-black/20 px-0.5 rounded opacity-70">
                        {msg.bytesSize} B
                      </span>

                      {isMe && getStatusIcon(msg.status)}
                    </div>
                  </div>
                </div>

                {/* Individual message retry button if stranded in queue */}
                {isMe && msg.status === "queue" && networkStats.mode !== "offline" && (
                  <button
                    onClick={() => onRetryMessage(msg.id)}
                    className="text-[8.5px] font-mono text-amber-600 hover:text-amber-700 mt-1 flex items-center gap-1 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/50"
                  >
                    <RefreshCw className="w-2 h-2 animate-spin" /> Renegociar entrega
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Typobar */}
      <div className="p-2 sm:p-3 bg-slate-50 border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2">
          <div className="flex-1 relative">
            <input
              id="message-typing-input"
              type="text"
              maxLength={500}
              placeholder={
                networkStats.mode === "offline"
                  ? "Escribe mensaje (se encolará)..."
                  : "Chatea ligero..."
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-white text-slate-800 text-xs sm:text-sm border-2 border-slate-200 rounded-lg sm:rounded-xl pl-2.5 pr-12 py-1.5 sm:py-2.5 focus:outline-none focus:border-teal-500 font-sans shadow-inner placeholder-slate-400"
            />
            
            {/* Visual Byte indicator for data optimization mindfulness */}
            <span className="absolute right-2 top-2 sm:top-3.5 text-[8.5px] sm:text-[9px] font-mono text-slate-400">
              {estimateBytes({ text: inputText })} B
            </span>
          </div>

          <button
            id="message-send-btn"
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 sm:p-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg sm:rounded-xl active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-1 px-1">
          <span className="text-[8px] sm:text-[9px] font-mono text-slate-400">
            Máx 500 caracts. • Sin archivos.
          </span>
          <span className="text-[8px] sm:text-[9px] font-mono text-slate-400">
            {inputText.length} / 500
          </span>
        </div>
      </div>
    </div>
  );
}
