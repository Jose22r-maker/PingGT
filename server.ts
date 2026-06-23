import express from "express";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// In-memory lightweight storage (fallback if Supabase not available)
interface UserProfile {
  id: string;
  name: string;
  lastSeen: number;
}

interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
}

const usersStore: Record<string, UserProfile> = {};
const messagesStore: Message[] = [];

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // JSON middleware
  app.use(express.json({ limit: "50kb" }));

  // Enable CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    next();
  });

  // ===== API ENDPOINTS =====

  // 1. Diagnostics Ping
  app.get("/api/ping", (req, res) => {
    res.json({
      status: "online",
      serverTime: Date.now(),
      bytesTransferred: 42,
      database: supabase ? "supabase" : "memory"
    });
  });

  // 2. Fetch User Profile
  app.get("/api/users/:id", async (req, res) => {
    const { id } = req.params;

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", id.toUpperCase())
          .single();

        if (error) {
          return res.status(404).json({ success: false, error: "Usuario no encontrado" });
        }

        return res.json({ success: true, user: data });
      } else {
        const user = usersStore[id];
        if (user) {
          return res.json({ success: true, user });
        } else {
          return res.status(404).json({ success: false, error: "Usuario no encontrado" });
        }
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ success: false, error: "Error al recuperar usuario" });
    }
  });

  // 3. Register / Update Profile
  app.post("/api/users", async (req, res) => {
    const { id, name } = req.body;
    if (!id || !name) {
      return res.status(400).json({ success: false, error: "Faltan datos obligatorios (id, name)" });
    }

    const cleanId = String(id).toUpperCase().trim();
    const cleanName = String(name).slice(0, 32).trim();

    try {
      if (supabase) {
        const { data, error: upsertError } = await supabase
          .from("users")
          .upsert(
            {
              id: cleanId,
              name: cleanName,
              last_seen: new Date().toISOString()
            },
            { onConflict: "id" }
          )
          .select()
          .single();

        if (upsertError) {
          return res.status(500).json({ success: false, error: "Error al guardar usuario" });
        }

        return res.json({ success: true, user: data });
      } else {
        usersStore[cleanId] = {
          id: cleanId,
          name: cleanName,
          lastSeen: Date.now()
        };
        return res.json({ success: true, user: usersStore[cleanId] });
      }
    } catch (err) {
      console.error("Error creating user:", err);
      res.status(500).json({ success: false, error: "Error al crear usuario" });
    }
  });

  // 4. Send Message
  app.post("/api/send", async (req, res) => {
    const { id, from, to, text, timestamp } = req.body;
    if (!id || !from || !to || !text) {
      return res.status(400).json({ success: false, error: "Campos de mensaje incompletos" });
    }

    const newMessage: Message = {
      id: String(id),
      from: String(from).toUpperCase().trim(),
      to: String(to).toUpperCase().trim(),
      text: String(text).slice(0, 500),
      timestamp: Number(timestamp) || Date.now()
    };

    try {
      if (supabase) {
        const { error } = await supabase.from("messages").insert([
          {
            id: newMessage.id,
            from_user: newMessage.from,
            to_user: newMessage.to,
            text: newMessage.text,
            created_at: new Date(newMessage.timestamp).toISOString()
          }
        ]);

        if (error) {
          console.error("Error inserting message:", error);
          return res.status(500).json({ success: false, error: "Error al enviar mensaje" });
        }
      } else {
        messagesStore.push(newMessage);
        if (messagesStore.length > 5000) {
          messagesStore.shift();
        }
      }

      res.json({ success: true, messageId: newMessage.id });
    } catch (err) {
      console.error("Error sending message:", err);
      res.status(500).json({ success: false, error: "Error al enviar mensaje" });
    }
  });

  // 5. Synchronize messages
  app.get("/api/sync", async (req, res) => {
    const { userId, since } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: "userId es obligatorio" });
    }

    const uId = String(userId).toUpperCase().trim();
    const sinceTime = Number(since) || 0;

    try {
      if (supabase) {
        const sinceDate = new Date(sinceTime).toISOString();

        // Fetch messages sent TO or FROM this user
        const { data: messages, error } = await supabase
          .from("messages")
          .select("*")
          .or(`from_user.eq.${uId},to_user.eq.${uId}`)
          .gt("created_at", sinceDate);

        if (error) {
          console.error("Error syncing messages:", error);
          return res.status(500).json({ success: false, error: "Error al sincronizar" });
        }

        // Update last_seen for user
        await supabase
          .from("users")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", uId);

        return res.json({
          success: true,
          messages: messages || [],
          serverTime: Date.now()
        });
      } else {
        // Fallback to memory store
        const filtered = messagesStore.filter(
          (m) => (m.from === uId || m.to === uId) && m.timestamp > sinceTime
        );

        if (usersStore[uId]) {
          usersStore[uId].lastSeen = Date.now();
        }

        return res.json({
          success: true,
          messages: filtered,
          serverTime: Date.now()
        });
      }
    } catch (err) {
      console.error("Error in sync:", err);
      res.status(500).json({ success: false, error: "Error al sincronizar" });
    }
  });

  // ===== Vite Dev Server & Static Assets =====
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    const dbStatus = supabase ? "✅ Supabase conectado" : "⚠️  Modo memoria (Supabase no configurado)";
    console.log(`[PingGT] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
    console.log(`[PingGT] ${dbStatus}`);
  });
}

startServer().catch((err) => {
  console.error("[PingGT] Error al iniciar servidor:", err);
});
