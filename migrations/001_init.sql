-- FormatX schema v1 (web sql.js + Tauri SQLite)

CREATE TABLE IF NOT EXISTS history_items (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  blob_base64 TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'pending',
  remote_id TEXT,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS text_snippets (
  id TEXT PRIMARY KEY NOT NULL,
  input_preview TEXT NOT NULL,
  output_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'pending',
  remote_id TEXT,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
