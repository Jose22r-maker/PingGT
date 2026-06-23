/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { UserProfile, Contact, Message, NetworkStats, NetworkMode } from "./types";
import { generateShortId, estimateBytes, calculateSavings } from "./lib/pingEngine";

// Sub-components import
import HomeView from "./components/HomeView";
import ProfileView from "./components/ProfileView";
import QRScannerView from "./components/QRScannerView";
import ChatListView from "./components/ChatListView";
import ChatConversationView from "./components/ChatConversationView";

import { Home, MessageSquare, QrCode, User, Radio, Leaf, Database, Sparkles } from "lucide-react";

export default function App() {
  // ---- 1. Identity & Contact initialization ----
  const [profile, setProfile] = useState<UserProfile>(() => {
    const cached = localStorage.getItem("pinggt_profile");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Fall back
      }
    }
    const newProfile: UserProfile = {
      id: generateShortId(),
      name: `Usuario ${Math.floor(100+Math.random()*900)}`,
      isCreated: true
    };
    localStorage.setItem("pinggt_profile", JSON.stringify(newProfile));
    return newProfile;
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const cached = localStorage.getItem("pinggt_contacts");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Fall back
      }
    }
    // Default initial Guatemalan support contact so users can experiment immediately
    const defaults: Contact[] = [
      {
        id: "GUAT-7777",
        name: "PingGT Soporte",
        addedAt: Date.now(),
        unreadCount: 1,
        lastMessage: "¡Bienvenido a PingGT! Mensajería optimizada y ultra ligera.",
        lastMessageTime: Date.now()
      }
    ];
    localStorage.setItem("pinggt_contacts", JSON.stringify(defaults));
    return defaults;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const cached = localStorage.getItem("pinggt_messages");
    if (cached) {
      try {
         return JSON.parse(cached);
      } catch {
         // Fall back
      }
    }
    // Inject introductory greeting
    const welcomeMsg: Message = {
      id: "welcome-system-msg-01",
      from: "GUAT-7777",
      to: profile.id,
      text: "¡Bienvenido a PingGT! Mensajería optimizada y ultra ligera. Prueba escribiendo un mensaje, cambia el estado de conexión para simular red inestable, o comparte tu ID.",
      timestamp: Date.now(),
      status: "delivered",
      bytesSize: 180
    };
    const defaults = [welcomeMsg];
    localStorage.setItem("pinggt_messages", JSON.stringify(defaults));
    return defaults;
  });

  // ---- 2. Application UI Views ----
  const [activeTab, setActiveTab] = useState<"inicio" | "chats" | "scanner" | "profile">("inicio");
  const [activeContactId, setActiveContactId] = useState<string | null>("GUAT-7777");

  // ---- 3. Diagnostics & Telemetry Data state ----
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    latencyMs: 12,
    mode: "real",
    totalBytesTx: 0,
    totalBytesRx: 0
  });

  const [pingCount, setPingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [timeSinceLastSync, setTimeSinceLastSync] = useState(0);

  // Sync state reference to prevent lock issues in timers
  const stateRef = useRef({ profile, messages, networkStats, contacts });
  
  useEffect(() => {
    stateRef.current = { profile, messages, networkStats, contacts };
  }, [profile, messages, networkStats, contacts]);

  // Sync state outputs to localStorage
  useEffect(() => {
    localStorage.setItem("pinggt_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("pinggt_contacts", JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem("pinggt_messages", JSON.stringify(messages));
  }, [messages]);

  // Secondary effect to live update seconds counter since last successful sync poll
  useEffect(() => {
    const t = setInterval(() => {
      setTimeSinceLastSync(Math.round((Date.now() - lastSyncTime) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [lastSyncTime]);


  // ---- 4. Networking Core Logic (Latency Sweeps & Queued Message Dispatch) ----
  
  // Triggers lightweight ping to measure standard network RTT latency
  const executePingDiagnostic = useCallback(async () => {
    if (stateRef.current.networkStats.mode === "offline") return;

    const startTime = Date.now();
    try {
      // Simulate slow speed artificial latency block
      if (stateRef.current.networkStats.mode === "slow") {
        await new Promise((r) => setTimeout(r, 1500));
      }

      const response = await fetch("/api/ping");
      const endTime = Date.now();
      
      if (response.ok) {
        const data = await response.json();
        const observedLatency = endTime - startTime;
        
        setNetworkStats((prev) => ({
          ...prev,
          latencyMs: observedLatency,
          totalBytesRx: prev.totalBytesRx + (data.bytesTransferred || 40)
        }));

        setPingCount((prev) => prev + 1);
        setLastSyncTime(Date.now());
      }
    } catch {
      // If error occurs, assume temporary network loss
      setNetworkStats((prev) => ({
        ...prev,
        latencyMs: 999
      }));
    }
  }, []);

  // Main system polling sync
  const executeMessageSync = useCallback(async () => {
    const { profile, messages, networkStats } = stateRef.current;
    if (networkStats.mode === "offline") return;

    setIsSyncing(true);
    const apiCallBytesTx = estimateBytes({ userId: profile.id, since: lastSyncTime });
    
    setNetworkStats((p) => ({ ...p, totalBytesTx: p.totalBytesTx + apiCallBytesTx }));

    try {
      // Get since filter: query for messages since 24 hours ago, or since the latest message we have
      let latestMsgTs = 0;
      messages.forEach((m) => {
        if (m.status !== "queue" && m.timestamp > latestMsgTs) {
          latestMsgTs = m.timestamp;
        }
      });

      // Simple relative limit fallback
      const sinceParam = latestMsgTs > 0 ? latestMsgTs : Date.now() - 24 * 60 * 60 * 1000;

      // Simulate slow network processing if simulated standard "slow"
      if (networkStats.mode === "slow") {
        await new Promise((r) => setTimeout(r, 1200));
      }

      const response = await fetch(`/api/sync?userId=${profile.id}&since=${sinceParam}`);
      if (response.ok) {
        const payload = await response.json();
        const rxBytes = estimateBytes(payload);
        
        setNetworkStats((p) => ({ ...p, totalBytesRx: p.totalBytesRx + rxBytes }));

        if (payload.success && Array.isArray(payload.messages)) {
          const freshMessages: Message[] = payload.messages;

          if (freshMessages.length > 0) {
            // Merge with local state, avoiding duplicates
            setMessages((prev) => {
              const merged = [...prev];
              freshMessages.forEach((fresh) => {
                const index = merged.findIndex((m) => m.id === fresh.id);
                if (index === -1) {
                  // Mark as delivered
                  merged.push({
                    ...fresh,
                    status: "delivered",
                    bytesSize: estimateBytes(fresh)
                  });
                } else {
                  // Update status to delivered if currently sent
                  merged[index].status = "delivered";
                }
              });
              return merged;
            });

            // Update unread badges and last messages for contacts in background
            setContacts((prevContacts) => {
              return prevContacts.map((contact) => {
                const relevant = freshMessages.filter((m) => m.from === contact.id);
                if (relevant.length > 0) {
                  const sorted = [...relevant].sort((a,b) => b.timestamp - a.timestamp);
                  const isCurChat = activeContactId === contact.id;
                  return {
                    ...contact,
                    lastMessage: sorted[0].text,
                    lastMessageTime: sorted[0].timestamp,
                    unreadCount: isCurChat ? 0 : (contact.unreadCount || 0) + relevant.length
                  };
                }
                return contact;
              });
            });
          }
        }
        setLastSyncTime(Date.now());
      }
    } catch (err) {
      console.warn("Sync failed (possibly offline or slow server loop)", err);
    } finally {
      setIsSyncing(false);
    }
  }, [activeContactId, lastSyncTime]);

  // Background dispatch of localized offline queue
  const processOfflineQueue = useCallback(async () => {
    const { messages, networkStats } = stateRef.current;
    if (networkStats.mode === "offline") return;

    const queued = messages.filter((m) => m.status === "queue");
    if (queued.length === 0) return;

    // Send queued sequentially to keep bandwidth strictly throttled
    for (const msg of queued) {
      try {
        if (networkStats.mode === "slow") {
          await new Promise((r) => setTimeout(r, 600)); // slow mode delay
        }

        const payloadSize = estimateBytes(msg);
        setNetworkStats((p) => ({ ...p, totalBytesTx: p.totalBytesTx + payloadSize }));

        const response = await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msg)
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
            // Update message locally from queue to sent status
            setMessages((prev) =>
              prev.map((m) => (m.id === msg.id ? { ...m, status: "sent" } : m))
            );
          }
        }
      } catch (err) {
        console.warn("Failed sending enqueued message:", err);
        break; // Stop loop if server cannot be resolved
      }
    }
  }, []);

  // Periodic looping effects
  useEffect(() => {
    // 1. Initial immediate registers on backend
    const registerSelfOnBackend = async () => {
      try {
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: profile.id, name: profile.name })
        });
      } catch {
        // Safe to ignore, user remains offline cache
      }
    };
    registerSelfOnBackend();

    // 2. Poll/Latency ticks (every 10s checks diagnostics)
    const latencyInterval = setInterval(executePingDiagnostic, 10000);
    // Initial ping diagnostic call
    executePingDiagnostic();

    // 3. Sync dispatch loops (Every 4.5 seconds checks sync state)
    const syncInterval = setInterval(() => {
      executeMessageSync();
      processOfflineQueue();
    }, 4500);

    return () => {
      clearInterval(latencyInterval);
      clearInterval(syncInterval);
    };
  }, [profile, executePingDiagnostic, executeMessageSync, processOfflineQueue]);


  // ---- 5. User Interaction Actions ----

  const handleUpdateProfile = (newName: string) => {
    setProfile((prev) => ({ ...prev, name: newName }));
    // Automatically propogate update to backend
    if (networkStats.mode !== "offline") {
      fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profile.id, name: newName })
      }).catch(() => {});
    }
  };

  const handleAddContact = (id: string, name: string): boolean => {
    const exists = contacts.some((c) => c.id === id);
    if (exists) return false;

    const newContact: Contact = {
      id,
      name,
      addedAt: Date.now(),
      unreadCount: 0
    };

    setContacts((prev) => {
      const updated = [...prev, newContact];
      localStorage.setItem("pinggt_contacts", JSON.stringify(updated));
      return updated;
    });

    // Save profile record to backend if we are online representing relationship
    if (networkStats.mode !== "offline") {
      // Query profile info to verify
      fetch(`/api/users/${id}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.user) {
            // Update name to actual current server profile name if different
            setContacts((prev) =>
              prev.map((c) => (c.id === id ? { ...c, name: res.user.name } : c))
            );
          }
        })
        .catch(() => {});
    }

    setActiveContactId(id);
    setActiveTab("chats");
    return true;
  };

  const handleSendMessage = (text: string) => {
    const msgBytes = estimateBytes({ id: "temp", from: profile.id, to: activeContactId, text, timestamp: Date.now() });
    
    const newMsg: Message = {
      id: `m-${Math.random().toString(36).substr(2, 9)}`,
      from: profile.id,
      to: activeContactId || "SYSTEM",
      text,
      timestamp: Date.now(),
      status: networkStats.mode === "offline" ? "queue" : "sent",
      bytesSize: msgBytes
    };

    // Update messages locally
    setMessages((prev) => [...prev, newMsg]);

    // Fast-update current contact list with last message excerpt
    if (activeContactId) {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === activeContactId
            ? { ...c, lastMessage: text, lastMessageTime: Date.now() }
            : c
        )
      );
    }

    // If online, dispatch immediately to sever
    if (networkStats.mode !== "offline") {
      setNetworkStats((p) => ({ ...p, totalBytesTx: p.totalBytesTx + msgBytes }));
      
      const simulateLag = networkStats.mode === "slow" ? 1500 : 0;
      setTimeout(() => {
        fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMsg)
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.success) {
              setMessages((prev) =>
                prev.map((m) => (m.id === newMsg.id ? { ...m, status: "sent" } : m))
              );
            }
          })
          .catch((err) => {
            console.warn("Error sending message immediate, keeping in queue fallback", err);
            setMessages((prev) =>
              prev.map((m) => (m.id === newMsg.id ? { ...m, status: "queue" } : m))
            );
          });
      }, simulateLag);
    }
  };

  const handleRetryMessage = (msgId: string) => {
    const target = messages.find((m) => m.id === msgId);
    if (!target) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, timestamp: Date.now() } : m))
    );

    // Dispatch queue process immediately
    processOfflineQueue();
  };

  // Simulate contact reply inside the browser (for 1-click end-user demo)
  const handleSimulatePeerReply = () => {
    if (!activeContactId) return;
    
    const greetings = [
      "¡Hola de nuevo! Acabo de recibir tu mensaje súper rápido.",
      "Aquí en Guatemala la señal está algo baja pero PingGT me carga nítido.",
      "Excelente lo liviano que es la app, apenas consume megas de mi plan.",
      "¡Puchica! Esto sí manda rápido, sin vueltas ni fotos pesadas.",
      "Te copio perfectamente. ¿Nos vemos más tarde?",
      "Todo fino por aquí. El ID y QR están geniales para agregarnos rápido."
    ];
    const item = greetings[Math.floor(Math.random() * greetings.length)];
    const sender = activeContactId;

    const rcvMsg: Message = {
      id: `peer-${Math.random().toString(36).substr(2, 9)}`,
      from: sender,
      to: profile.id,
      text: item,
      timestamp: Date.now(),
      status: "delivered",
      bytesSize: estimateBytes({ text: item })
    };

    // If online, save simulated response to backend so other synced tabs see it!
    if (networkStats.mode !== "offline") {
      fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rcvMsg)
      })
        .then(() => executeMessageSync())
        .catch(() => {
          // Fallback to local push if server offline
          setMessages((prev) => [...prev, rcvMsg]);
        });
    } else {
      // Local injection directly if deep offline
      setMessages((prev) => [...prev, rcvMsg]);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === sender
            ? { ...c, lastMessage: item, lastMessageTime: Date.now(), unreadCount: (c.unreadCount || 0) + 1 }
            : c
        )
      );
    }
  };

  // ---- 6. Bandwidth Savings computation ----
  const calculatedSavings = calculateSavings(pingCount, messages.length);

  // Clear unread counts whenever contact chat opens
  useEffect(() => {
    if (activeContactId) {
      setContacts((prev) =>
        prev.map((c) => (c.id === activeContactId ? { ...c, unreadCount: 0 } : c))
      );
    }
  }, [activeContactId]);

  const activeContactObj = contacts.find((c) => c.id === activeContactId) || null;
  const filteredMessages = messages.filter(
    (m) =>
      (m.from === profile.id && m.to === activeContactId) ||
      (m.from === activeContactId && m.to === profile.id)
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased text-slate-800" id="pinggt-app-root">
      {/* Top Header Navigation */}
      <header className="bg-teal-850 bg-teal-900 text-white shadow-md border-b-4 border-emerald-600 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-2 py-2 sm:px-4 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-600 flex items-center justify-center border-2 border-emerald-400 font-mono font-bold text-sm sm:text-lg select-none">
              P!
            </div>
            <div>
              <h1 className="font-sans font-extrabold text-xs sm:text-base tracking-wide flex items-center gap-1 sm:gap-1.5 leading-none">
                PingGT <span className="text-[8px] sm:text-[10px] bg-emerald-500 text-white font-mono px-1 py-0.2 rounded-full">LITE</span>
              </h1>
              <p className="hidden min-[370px]:block text-[8px] sm:text-[10px] font-mono text-emerald-300 leading-normal mt-0.5">Optimizado para GT</p>
            </div>
          </div>

          {/* Tab Navigation Links */}
          <nav className="flex items-center gap-0.5 sm:gap-1">
            <button
              id="nav-inicio-tab"
              onClick={() => setActiveTab("inicio")}
              className={`px-1.5 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-sans font-bold rounded-md sm:rounded-lg flex items-center gap-1 sm:gap-1.5 transition-all ${
                activeTab === "inicio"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-200 hover:text-white hover:bg-teal-800"
              }`}
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden min-[480px]:inline">Inicio</span>
            </button>
            <button
              id="nav-chats-tab"
              onClick={() => setActiveTab("chats")}
              className={`px-1.5 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-sans font-bold rounded-md sm:rounded-lg flex items-center gap-1 sm:gap-1.5 transition-all ${
                activeTab === "chats"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-200 hover:text-white hover:bg-teal-800"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden min-[480px]:inline">Chats</span>
            </button>
            <button
              id="nav-scanner-tab"
              onClick={() => setActiveTab("scanner")}
              className={`px-1.5 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-sans font-bold rounded-md sm:rounded-lg flex items-center gap-1 sm:gap-1.5 transition-all ${
                activeTab === "scanner"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-200 hover:text-white hover:bg-teal-800"
              }`}
            >
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden min-[480px]:inline">Agregar QR</span>
            </button>
            <button
              id="nav-profile-tab"
              onClick={() => setActiveTab("profile")}
              className={`px-1.5 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-sans font-bold rounded-md sm:rounded-lg flex items-center gap-1 sm:gap-1.5 transition-all ${
                activeTab === "profile"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-200 hover:text-white hover:bg-teal-800"
              }`}
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden min-[480px]:inline">Perfil QR</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-2 sm:p-4 space-y-2 sm:space-y-4">
        
        {/* Dynamic Context Workspace Tabs */}
        {activeTab === "inicio" && (
          <HomeView
            userName={profile.name}
            userId={profile.id}
            contactCount={contacts.length}
            savings={calculatedSavings}
            networkStats={networkStats}
            onModeChange={(mode: NetworkMode) => {
              setNetworkStats((prev) => ({ ...prev, mode }));
              if (mode !== "offline") {
                setTimeout(() => {
                  executeMessageSync();
                  processOfflineQueue();
                }, 100);
              }
            }}
            onNavigate={(tab) => {
              setActiveTab(tab);
            }}
            onManualSync={() => {
              executePingDiagnostic();
              executeMessageSync();
              processOfflineQueue();
            }}
            isSyncing={isSyncing}
            contacts={contacts}
            onSelectContact={(id) => {
              setActiveContactId(id);
              setActiveTab("chats");
            }}
          />
        )}

        {activeTab === "chats" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Sidebar list portion */}
            <div className="md:col-span-5 h-full">
              <ChatListView
                contacts={contacts}
                activeContactId={activeContactId}
                onSelectContact={(id) => {
                  setActiveContactId(id);
                }}
                onNavigateToScanner={() => {
                  setActiveTab("scanner");
                }}
              />
            </div>

            {/* Conversation portion */}
            <div className="md:col-span-7">
              {activeContactObj ? (
                <ChatConversationView
                  contact={activeContactObj}
                  currentUserProfileId={profile.id}
                  messages={filteredMessages}
                  networkStats={networkStats}
                  onSendMessage={handleSendMessage}
                  onRetryMessage={handleRetryMessage}
                  onSimulatePeerReply={handleSimulatePeerReply}
                />
              ) : (
                <div className="bg-white border-2 border-slate-200 rounded-xl p-8 text-center h-[460px] flex flex-col items-center justify-center">
                  <Leaf className="w-12 h-12 text-teal-600 mb-2 animate-bounce" />
                  <h3 className="font-sans font-bold text-base text-slate-800">Mensajería PingGT</h3>
                  <p className="text-xs font-sans text-slate-500 max-w-[260px] mt-1.5 leading-relaxed">
                    Selecciona un chat del listado de la izquierda, o agrega uno nuevo mediante su código único para comenzar.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "scanner" && (
          <div className="max-w-lg mx-auto">
            <div className="mb-3 text-center">
              <h2 className="font-sans font-bold text-base text-slate-800 flex items-center justify-center gap-1.5">
                <Leaf className="w-5 h-5 text-teal-600" /> Agregar Contacto Ligero
              </h2>
              <p className="text-xs font-sans text-slate-500 max-w-[340px] mx-auto mt-1">
                Añade a tus amigos escaneando su QR directamente con tu cámara, cargando una captura de pantalla, o pegando su código ID único.
              </p>
            </div>
            
            <QRScannerView onAddContact={handleAddContact} />
          </div>
        )}

        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-3 text-center">
              <h2 className="font-sans font-bold text-base text-slate-800 flex items-center justify-center gap-1.5">
                <Database className="w-5 h-5 text-teal-600" /> Tu Identidad PingGT
              </h2>
              <p className="text-xs font-sans text-slate-500 max-w-[340px] mx-auto mt-1">
                Edita tu nombre visible o comparte tu ID de seguridad para que otros te agreguen de forma instantánea.
              </p>
            </div>
            
            <ProfileView
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              bytesSavedKb={calculatedSavings.savedPercent * 1.5}
            />
          </div>
        )}

      </main>

    </div>
  );
}
