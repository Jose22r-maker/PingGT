import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// In-memory lightweight storage
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
  const PORT = 3000;

  // JSON middleware
  app.use(express.json({ limit: "50kb" })); // Restrict payload size for low-bandwidth philosophy

  // Enable CORS helper for testing across local interfaces
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    next();
  });

  // --- API Endpoints ---

  // 1. Diagnostics Ping: Extremely lightweight ping to calculate round-trip latency
  app.get("/api/ping", (req, res) => {
    res.json({
      status: "online",
      serverTime: Date.now(),
      bytesTransferred: 42 // Tiny response
    });
  });

  // 2. Fetch User Profile
  app.get("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const user = usersStore[id];
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
  });

  // 3. Register / Update Profile
  app.post("/api/users", (req, res) => {
    const { id, name } = req.body;
    if (!id || !name) {
      return res.status(400).json({ success: false, error: "Faltan datos obligatorios (id, name)" });
    }

    const cleanId = String(id).toUpperCase().trim();
    const cleanName = String(name).slice(0, 32).trim(); // Limit size to save bytes

    usersStore[cleanId] = {
      id: cleanId,
      name: cleanName,
      lastSeen: Date.now()
    };

    res.json({ success: true, user: usersStore[cleanId] });
  });

  // 4. Send Message (Save in store)
  app.post("/api/send", (req, res) => {
    const { id, from, to, text, timestamp } = req.body;
    if (!id || !from || !to || !text) {
      return res.status(400).json({ success: false, error: "Campos de mensaje incompletos" });
    }

    const newMessage: Message = {
      id: String(id),
      from: String(from).toUpperCase().trim(),
      to: String(to).toUpperCase().trim(),
      text: String(text).slice(0, 500), // Enforce text limit to optimize bandwidth
      timestamp: Number(timestamp) || Date.now()
    };

    messagesStore.push(newMessage);
    
    // Keep message store bounded to avoid CPU/RAM issues (max 5000 messages)
    if (messagesStore.length > 5000) {
      messagesStore.shift();
    }

    res.json({ success: true, messageId: newMessage.id });
  });

  // 5. Synchronize messages for a specific user ID
  app.get("/api/sync", (req, res) => {
    const { userId, since } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: "userId es obligatorio" });
    }

    const uId = String(userId).toUpperCase().trim();
    const sinceTime = Number(since) || 0;

    // Filter relevant messages: either sent BY this user or sent TO this user
    const filtered = messagesStore.filter((m) => {
      return (m.from === uId || m.to === uId) && m.timestamp > sinceTime;
    });

    // Update last seen for caller
    if (usersStore[uId]) {
      usersStore[uId].lastSeen = Date.now();
    }

    res.json({
      success: true,
      messages: filtered,
      serverTime: Date.now()
    });
  });

  // --- Vite Dev Server & Static Assets ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PingGT] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start PingGT server:", err);
});
