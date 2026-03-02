import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("astarte.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS polaris_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_name TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add missing columns if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(polaris_keys)").all();
const columns = tableInfo.map((col: any) => col.name);

if (!columns.includes('usage_count')) {
  db.exec("ALTER TABLE polaris_keys ADD COLUMN usage_count INTEGER DEFAULT 0");
}
if (!columns.includes('max_usage')) {
  db.exec("ALTER TABLE polaris_keys ADD COLUMN max_usage INTEGER DEFAULT 1000");
}
if (!columns.includes('is_active')) {
  db.exec("ALTER TABLE polaris_keys ADD COLUMN is_active BOOLEAN DEFAULT 1");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('robot_mode', 'balanced');
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('admin_password', 'Capitaine');
  // Force update the sheet ID to the one provided by the user
  INSERT OR REPLACE INTO app_settings (key, value) VALUES ('google_sheet_id', '1fg-tStXc8E04WLqkHxDfrEJR7yf6ix0uzL4y52HF0k0');
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Admin Login (Astarté - Keys only)
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === "Amen") {
      res.json({ success: true, role: 'astarte' });
    } else {
      res.status(401).json({ success: false, message: "Mot de passe incorrect" });
    }
  });

  // Super Admin Login (Dashboard)
  app.post("/api/admin/login-super", (req, res) => {
    const { password } = req.body;
    const adminPass = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_password'").get().value;
    if (password === adminPass) {
      res.json({ success: true, role: 'super' });
    } else {
      res.status(401).json({ success: false, message: "Accès refusé au poste de contrôle" });
    }
  });

  // Chat Logging
  app.post("/api/chat/log", (req, res) => {
    const { question, answer, category, user_email } = req.body;
    const stmt = db.prepare("INSERT INTO chat_history (question, answer, category, user_email) VALUES (?, ?, ?, ?)");
    stmt.run(question, answer, category, user_email);
    res.json({ success: true });
  });

  // Stats for Dashboard
  app.get("/api/admin/stats", (req, res) => {
    const totalQuestions = db.prepare("SELECT COUNT(*) as count FROM chat_history").get().count;
    const questionsToday = db.prepare("SELECT COUNT(*) as count FROM chat_history WHERE date(timestamp) = date('now')").get().count;
    const popularCategories = db.prepare("SELECT category, COUNT(*) as count FROM chat_history GROUP BY category ORDER BY count DESC LIMIT 5").all();
    const keyUsage = db.prepare("SELECT key_name, usage_count, max_usage FROM polaris_keys").all();
    
    res.json({
      totalQuestions,
      questionsToday,
      popularCategories,
      keyUsage
    });
  });

  // History for Dashboard
  app.get("/api/admin/history", (req, res) => {
    const history = db.prepare("SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT 50").all();
    res.json(history);
  });

  // Settings
  app.get("/api/admin/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM app_settings").all();
    res.json(settings);
  });

  app.post("/api/admin/settings", (req, res) => {
    const { key, value } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)");
    stmt.run(key, value);
    res.json({ success: true });
  });

  // Google Sheets Proxy
  app.get("/api/knowledge", async (req, res) => {
    try {
      const sheetId = db.prepare("SELECT value FROM app_settings WHERE key = 'google_sheet_id'").get()?.value;
      if (!sheetId) {
        return res.json([]);
      }
      
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv`);
      const csvData = await response.text();
      
      // Basic CSV parsing (assuming simple structure: Category, SubCategory, FileName, FileLink)
      const lines = csvData.split('\n');
      const result = lines.slice(1).map(line => {
        const [category, subCategory, fileName, fileLink] = line.split(',').map(s => s.trim());
        return { category, subCategory, fileName, fileLink };
      }).filter(item => item.category && item.fileName);

      res.json(result);
    } catch (error) {
      console.error("Failed to fetch sheet data:", error);
      res.status(500).json({ error: "Failed to fetch knowledge base" });
    }
  });

  // Get Active AI Key
  app.get("/api/chat/key", (req, res) => {
    const key = db.prepare("SELECT encrypted_key FROM polaris_keys WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1").get();
    if (key) {
      res.json({ encrypted_key: key.encrypted_key });
    } else {
      res.status(404).json({ error: "No active key found" });
    }
  });

  // Polaris Keys Management
  app.get("/api/admin/keys", (req, res) => {
    const keys = db.prepare("SELECT id, key_name, is_active, created_at FROM polaris_keys").all();
    res.json(keys);
  });

  app.post("/api/admin/keys", (req, res) => {
    const { key_name, encrypted_key } = req.body;
    // When adding a new key, we can make it the only active one or just add it
    const stmt = db.prepare("INSERT INTO polaris_keys (key_name, encrypted_key, is_active) VALUES (?, ?, 1)");
    stmt.run(key_name, encrypted_key);
    res.json({ success: true });
  });

  app.post("/api/admin/keys/toggle", (req, res) => {
    const { id, is_active } = req.body;
    db.prepare("UPDATE polaris_keys SET is_active = ? WHERE id = ?").run(is_active ? 1 : 0, id);
    res.json({ success: true });
  });

  app.delete("/api/admin/keys/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM polaris_keys WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
